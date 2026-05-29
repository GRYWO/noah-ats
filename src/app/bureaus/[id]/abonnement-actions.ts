"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { getStripe, stripeBeschikbaar } from "@/utils/stripe";
import { PLANS, SETUP_FEE_CENT, type PlanKey } from "@/utils/plans";
import { revalidatePath } from "next/cache";

async function vereisSuper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) return null;
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
}): Promise<{ ok: boolean; error?: string }> {
  const user = await vereisSuper();
  if (!user) return { ok: false, error: "Geen toegang" };
  if (!stripeBeschikbaar()) {
    return { ok: false, error: "Stripe is niet geconfigureerd (STRIPE_SECRET_KEY ontbreekt in env)" };
  }
  if (!PLANS[plan]) return { ok: false, error: "Ongeldig plan" };

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("naam, btw_nummer").eq("id", tenantId).single();
  if (!tenant) return { ok: false, error: "Bureau niet gevonden" };

  const stripe = getStripe();
  const planDef = PLANS[plan];

  try {
    // 1) Stripe customer aanmaken
    const customer = await stripe.customers.create({
      name: tenant.naam,
      email: contactEmail,
      metadata: { tenant_id: tenantId, contact_naam: contactNaam },
      tax_id_data: tenant.btw_nummer ? [{ type: "eu_vat", value: tenant.btw_nummer }] : undefined,
    });

    // 2) Setup-fee invoice eenmalig
    await stripe.invoiceItems.create({
      customer: customer.id,
      amount: SETUP_FEE_CENT,
      currency: "eur",
      description: `Setup-fee Noah ATS — ${planDef.label}`,
    });
    const setupInvoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: 14,
      description: "Eenmalige setup-fee Noah ATS",
    });
    await stripe.invoices.finalizeInvoice(setupInvoice.id);

    // 3) Subscription (recurring monthly)
    // Eerst price aanmaken on-the-fly per plan
    const price = await stripe.prices.create({
      currency: "eur",
      unit_amount: planDef.prijs_per_maand_cent,
      recurring: { interval: "month" },
      product_data: {
        name: `Noah ATS — ${planDef.label}`,
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      collection_method: "send_invoice",
      days_until_due: 14,
      proration_behavior: "create_prorations",
      metadata: { tenant_id: tenantId },
    }) as unknown as { id: string; current_period_start: number; current_period_end: number };

    // 4) Lokaal opslaan
    await admin.from("abonnementen").upsert({
      tenant_id: tenantId,
      plan,
      status: "actief",
      max_users: planDef.max_users,
      prijs_per_maand_cent: planDef.prijs_per_maand_cent,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: price.id,
      setup_fee_cent: SETUP_FEE_CENT,
      setup_fee_invoice_id: setupInvoice.id,
      gestart_op: new Date().toISOString(),
      huidige_periode_start: new Date(subscription.current_period_start * 1000).toISOString(),
      huidige_periode_einde: new Date(subscription.current_period_end * 1000).toISOString(),
    }, { onConflict: "tenant_id" });

    revalidatePath(`/bureaus/${tenantId}`);
    return { ok: true };
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
  if (!PLANS[nieuwPlan]) return { ok: false, error: "Ongeldig plan" };
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
  const planDef = PLANS[nieuwPlan];

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
