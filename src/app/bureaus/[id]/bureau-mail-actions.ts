"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { isSalesAdmin } from "@/utils/sales-admin";
import { getStripe, stripeBeschikbaar } from "@/utils/stripe";
import { getPlan, getSetupFeeCent } from "@/utils/plans";
import type { PlanKey } from "@/utils/plans-shared";

/**
 * Verstuur (of opnieuw verstuur) de Stripe-betaallink naar het bureau.
 * Maakt nieuwe checkout-session zodat de link altijd geldig is.
 * Hergebruikt bestaande Stripe-customer.
 *
 * Idempotent: ook als de mail al verstuurd is, opnieuw te triggeren.
 */
export async function verstuurBureauAbonnementMail(tenantId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  const isSuper = isSuperAdminEmail(user.email);
  const isSales = await isSalesAdmin(user);
  if (!isSuper && !isSales) return { ok: false, error: "Geen toegang" };

  if (!stripeBeschikbaar()) return { ok: false, error: "Stripe niet geconfigureerd" };

  const admin = createAdminClient();

  const [{ data: tenant }, { data: ab }] = await Promise.all([
    admin.from("tenants").select("naam, contact_email, contact_naam").eq("id", tenantId).single(),
    admin
      .from("abonnementen")
      .select("plan, stripe_customer_id, prijs_per_maand_cent, setup_fee_cent")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);

  if (!tenant) return { ok: false, error: "Bureau niet gevonden" };
  if (!ab) return { ok: false, error: "Geen abonnement gestart — kies eerst een plan" };
  if (!ab.stripe_customer_id) return { ok: false, error: "Geen Stripe-customer gekoppeld" };
  if (!tenant.contact_email) return { ok: false, error: "Geen contact-mailadres bij bureau" };

  const planDef = await getPlan(ab.plan as PlanKey);
  if (!planDef) return { ok: false, error: "Plan niet gevonden" };

  const SETUP_FEE_CENT = ab.setup_fee_cent ?? await getSetupFeeCent();

  const stripe = getStripe();
  try {
    // Nieuwe prices — Stripe prices zijn goedkoop en versimpelen idempotentie
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("vercel.app")
      ? process.env.NEXT_PUBLIC_APP_URL
      : "https://noah-ats.nl";

    const session = await stripe.checkout.sessions.create({
      customer: ab.stripe_customer_id,
      mode: "subscription",
      line_items: [
        { price: setupPrice.id, quantity: 1 },
        { price: recurringPrice.id, quantity: 1 },
      ],
      payment_method_types: ["card", "sepa_debit"],
      success_url: `${baseUrl}/bureaus/${tenantId}?abonnement=actief`,
      cancel_url: `${baseUrl}/bureaus/${tenantId}?abonnement=geannuleerd`,
      metadata: { tenant_id: tenantId, type: "bureau_abonnement", plan: ab.plan },
      subscription_data: {
        metadata: { tenant_id: tenantId, type: "bureau_abonnement", plan: ab.plan },
      },
      locale: "nl",
    });

    if (!session.url) return { ok: false, error: "Geen checkout-url van Stripe" };

    // Mail versturen
    const { sendBureauStripeMail } = await import("@/utils/email");
    await sendBureauStripeMail({
      naar: tenant.contact_email,
      contactNaam: tenant.contact_naam ?? tenant.naam,
      bureauNaam: tenant.naam,
      planLabel: planDef.label,
      setupFeeCent: SETUP_FEE_CENT,
      maandPrijsCent: planDef.prijs_per_maand_cent,
      betaalUrl: session.url,
    });

    return { ok: true };
  } catch (e) {
    console.error("[bureau-mail] verstuur mislukt:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout" };
  }
}
