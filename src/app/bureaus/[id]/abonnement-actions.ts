"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { getStripe, stripeBeschikbaar } from "@/utils/stripe";
import { getPlan, getSetupFeeCent, type PlanKey } from "@/utils/plans";
import { isSalesAdmin } from "@/utils/sales-admin";
import { revalidatePath } from "next/cache";

async function vereisSuper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) return null;
  return user;
}

async function vereisSalesAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isSalesAdmin(user))) return null;
  return user;
}

/**
 * Start een nieuw abonnement: creëer Stripe customer + subscription + setup-fee invoice.
 */
export async function startAbonnement({
  tenantId,
  plan,
  contactEmail,
  contactNaam,
}: {
  tenantId: string;
  plan: PlanKey;
  contactEmail: string;
  contactNaam: string;
}): Promise<{ ok: boolean; error?: string; checkoutUrl?: string | null }> {
  // Sales-admin mag ook abonnementen activeren (niet alleen Yorith)
  const user = await vereisSalesAdmin();
  if (!user) return { ok: false, error: "Geen toegang" };
  if (!stripeBeschikbaar()) {
    return { ok: false, error: "Stripe is niet geconfigureerd (STRIPE_SECRET_KEY ontbreekt in env)" };
  }
  const planDef = await getPlan(plan);
  if (!planDef) return { ok: false, error: "Ongeldig plan" };
  const SETUP_FEE_CENT = await getSetupFeeCent();

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("naam, btw_nummer").eq("id", tenantId).single();
  if (!tenant) return { ok: false, error: "Bureau niet gevonden" };

  const stripe = getStripe();

  try {
    // 1) Stripe customer aanmaken (of hergebruiken als al bestaat)
    const { data: bestaand } = await admin
      .from("abonnementen")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    let customerId = bestaand?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: tenant.naam,
        email: contactEmail,
        metadata: { tenant_id: tenantId, contact_naam: contactNaam },
        tax_id_data: tenant.btw_nummer ? [{ type: "eu_vat", value: tenant.btw_nummer }] : undefined,
      });
      customerId = customer.id;
    }

    // 2) Prices: setup-fee (one-time) + maandelijks (recurring)
    const setupPrice = await stripe.prices.create({
      currency: "eur",
      unit_amount: SETUP_FEE_CENT,
      product_data: { name: `Setup-fee Noah ATS — ${planDef.label}` },
    });
    const recurringPrice = await stripe.prices.create({
      currency: "eur",
      unit_amount: planDef.prijs_per_maand_cent,
      recurring: { interval: "month" },
      product_data: { name: `Noah ATS — ${planDef.label}` },
    });

    // 3) Stripe Checkout Session — bureau klikt link, betaalt setup + maand 1
    //    in 1 transactie via iDEAL/SEPA/CC, daarna pas actief.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("vercel.app")
      ? process.env.NEXT_PUBLIC_APP_URL
      : "https://noah-ats.nl";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        { price: setupPrice.id, quantity: 1 },     // eenmalig — setup-fee
        { price: recurringPrice.id, quantity: 1 }, // maandelijks
      ],
      payment_method_types: ["card", "ideal", "sepa_debit"],
      success_url: `${baseUrl}/bureaus/${tenantId}?abonnement=actief`,
      cancel_url: `${baseUrl}/bureaus/${tenantId}?abonnement=geannuleerd`,
      metadata: { tenant_id: tenantId, type: "bureau_abonnement", plan },
      subscription_data: {
        metadata: { tenant_id: tenantId, type: "bureau_abonnement", plan },
      },
      locale: "nl",
    });

    // 4) Lokaal opslaan — status "wachtend_betaling" tot bureau heeft betaald
    await admin.from("abonnementen").upsert({
      tenant_id: tenantId,
      plan,
      status: "wachtend_betaling",
      max_users: planDef.max_users,
      prijs_per_maand_cent: planDef.prijs_per_maand_cent,
      stripe_customer_id: customerId,
      stripe_price_id: recurringPrice.id,
      setup_fee_cent: SETUP_FEE_CENT,
      gestart_op: new Date().toISOString(),
      huidige_periode_start: null,
      huidige_periode_einde: null,
    }, { onConflict: "tenant_id" });

    revalidatePath(`/bureaus/${tenantId}`);
    // Geef de Stripe Checkout URL terug — UI opent die voor het bureau
    return { ok: true, checkoutUrl: session.url ?? null };
  } catch (e) {
    console.error("[abonnement] start mislukt:", e);
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Wijzig plan (upgrade/downgrade).
 */
export async function wijzigPlan({
  tenantId,
  nieuwPlan,
}: {
  tenantId: string;
  nieuwPlan: PlanKey;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await vereisSuper();
  if (!user) return { ok: false, error: "Geen toegang" };
  const planDef = await getPlan(nieuwPlan);
  if (!planDef) return { ok: false, error: "Ongeldig plan" };
  if (!stripeBeschikbaar()) return { ok: false, error: "Stripe niet beschikbaar" };

  const admin = createAdminClient();
  const { data: ab } = await admin
    .from("abonnementen")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();
  if (!ab) return { ok: false, error: "Geen abonnement" };
  if (!ab.stripe_subscription_id) return { ok: false, error: "Geen Stripe-koppeling" };

  const stripe = getStripe();

  try {
    const sub = await stripe.subscriptions.retrieve(ab.stripe_subscription_id);
    const itemId = sub.items.data[0].id;

    // Nieuw price aanmaken voor nieuwe plan
    const price = await stripe.prices.create({
      currency: "eur",
      unit_amount: planDef.prijs_per_maand_cent,
      recurring: { interval: "month" },
      product_data: { name: `Noah ATS — ${planDef.label}` },
    });

    await stripe.subscriptions.update(ab.stripe_subscription_id, {
      items: [{ id: itemId, price: price.id }],
      proration_behavior: "create_prorations",
    });

    await admin.from("abonnementen").update({
      plan: nieuwPlan,
      max_users: planDef.max_users,
      prijs_per_maand_cent: planDef.prijs_per_maand_cent,
      stripe_price_id: price.id,
      updated_at: new Date().toISOString(),
    }).eq("tenant_id", tenantId);

    revalidatePath(`/bureaus/${tenantId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Abonnement opzeggen (loopt door tot einde huidige periode).
 */
export async function zegOp({ tenantId }: { tenantId: string }): Promise<{ ok: boolean; error?: string }> {
  const user = await vereisSuper();
  if (!user) return { ok: false, error: "Geen toegang" };
  if (!stripeBeschikbaar()) return { ok: false, error: "Stripe niet beschikbaar" };

  const admin = createAdminClient();
  const { data: ab } = await admin
    .from("abonnementen")
    .select("stripe_subscription_id")
    .eq("tenant_id", tenantId)
    .single();
  if (!ab?.stripe_subscription_id) return { ok: false, error: "Geen abonnement" };

  try {
    await getStripe().subscriptions.update(ab.stripe_subscription_id, { cancel_at_period_end: true });
    await admin.from("abonnementen").update({
      status: "opgezegd",
      opgezegd_op: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("tenant_id", tenantId);
    revalidatePath(`/bureaus/${tenantId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Handmatige status-override door super-admin (bv kulanz of debug).
 */
export async function overrideStatus({
  tenantId,
  nieuweStatus,
}: {
  tenantId: string;
  nieuweStatus: "actief" | "read_only" | "geblokkeerd";
}): Promise<{ ok: boolean }> {
  const user = await vereisSuper();
  if (!user) return { ok: false };
  const admin = createAdminClient();
  const veld =
    nieuweStatus === "read_only" ? { read_only_sinds: new Date().toISOString() } :
    nieuweStatus === "geblokkeerd" ? { geblokkeerd_sinds: new Date().toISOString() } :
    { read_only_sinds: null, geblokkeerd_sinds: null };
  await admin.from("abonnementen").update({
    status: nieuweStatus,
    ...veld,
    updated_at: new Date().toISOString(),
  }).eq("tenant_id", tenantId);
  revalidatePath(`/bureaus/${tenantId}`);
  return { ok: true };
}
