"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { getStripe, stripeBeschikbaar } from "@/utils/stripe";
import { sendSetterStripeMail } from "@/utils/email";

const PRIJS_CENT = 25000; // €250,00 per maand

/**
 * Start het Stripe abonnement-proces voor een nieuwe setter.
 * Maakt customer + subscription + verstuurt betaal-mail.
 *
 * Wordt aangeroepen vanuit user-aanmaak (rol=setter) en na NDA-ondertekening.
 * Setter kan pas inloggen nadat Stripe payment is bevestigd.
 */
export async function startSetterAbonnement(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!stripeBeschikbaar()) {
    return { ok: false, error: "Stripe niet geconfigureerd in deze omgeving" };
  }
  const admin = createAdminClient();

  // Haal profile op
  const { data: profile } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, mail_adres, rol, stripe_customer_id, abonnement_status, tenant_id, tenants(naam)")
    .eq("id", userId)
    .single();

  if (!profile) return { ok: false, error: "Profiel niet gevonden" };
  if (profile.rol !== "setter") return { ok: false, error: "Alleen voor setters" };
  if (profile.abonnement_status === "actief") return { ok: true }; // al actief

  // Haal email op via auth.users
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? profile.mail_adres;
  if (!email) return { ok: false, error: "Geen e-mailadres bekend" };

  const stripe = getStripe();
  try {
    // 1. Customer aanmaken (of hergebruiken)
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: `${profile.voornaam ?? ""} ${profile.achternaam ?? ""}`.trim(),
        metadata: { user_id: userId, type: "setter" },
      });
      customerId = customer.id;
    }

    // 2. Price aanmaken (eenmalig per setter-stoel — €250/mnd recurring)
    const price = await stripe.prices.create({
      currency: "eur",
      unit_amount: PRIJS_CENT,
      recurring: { interval: "month" },
      product_data: { name: "Noah ATS — Setter-stoel" },
    });

    // 3. Checkout sessie (de setter klikt op een link in z'n mail)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("vercel.app")
      ? process.env.NEXT_PUBLIC_APP_URL
      : "https://noah-ats.nl";

    // Alleen betaalmethoden die maandelijks AUTOMATISCH kunnen incasseren:
    // card (charge-on-file) + sepa_debit (machtiging). iDEAL is eenmalig.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      payment_method_types: ["card", "sepa_debit"],
      success_url: `${baseUrl}/login?setter_abonnement=actief`,
      cancel_url: `${baseUrl}/login?setter_abonnement=geannuleerd`,
      metadata: { user_id: userId, type: "setter_stoel" },
      subscription_data: { metadata: { user_id: userId, type: "setter_stoel" } },
      locale: "nl",
    });

    // 4. Update profile
    await admin
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        abonnement_status: "wachtend_betaling",
      })
      .eq("id", userId);

    // 5. Mail met betaallink
    if (session.url) {
      await sendSetterStripeMail({
        naar: email,
        voornaam: profile.voornaam ?? "",
        betaalUrl: session.url,
        prijsCent: PRIJS_CENT,
      });
    }

    return { ok: true };
  } catch (e) {
    console.error("[startSetterAbonnement]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Onbekend" };
  }
}
