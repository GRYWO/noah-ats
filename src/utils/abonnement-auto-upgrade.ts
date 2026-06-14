/**
 * Automatische bureau-abonnement-aanpassing bij user-toevoegen/verwijderen.
 *
 * Regel:
 *   1 recruiter actief → Starter    (€5.000)
 *   2-3 recruiters     → Pro        (€10.000)
 *   4+ recruiters      → Enterprise (€15.000)
 *
 * Wordt aangeroepen ná insert/delete van een recruiter in profiles.
 * Stripe past het plan aan met prorata; bureau krijgt automatisch
 * de juiste factuur volgende cyclus.
 */

import { createAdminClient } from "@/utils/supabase/admin";
import { getStripe, stripeBeschikbaar } from "@/utils/stripe";
import { getPlan } from "@/utils/plans";
import type { PlanKey } from "@/utils/plans-shared";

function bepaalPlanVoorAantal(aantal: number): PlanKey {
  if (aantal <= 1) return "starter";
  if (aantal <= 3) return "pro";
  return "enterprise"; // 4+
}

/**
 * Check of het bureau-abonnement moet wijzigen op basis van huidige
 * aantal recruiters. Doet automatische plan-wissel via Stripe.
 *
 * Return: { gewijzigd, vorigPlan, nieuwPlan, aantalRecruiters }
 */
export async function checkEnPasAbonnementAan(tenantId: string): Promise<{
  gewijzigd: boolean;
  vorigPlan?: PlanKey;
  nieuwPlan?: PlanKey;
  aantalRecruiters: number;
  reden?: string;
}> {
  const admin = createAdminClient();

  // 1. Tel huidige recruiters in dit bureau
  const { count } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("rol", "recruiter");
  const aantalRecruiters = count ?? 0;

  // 2. Bepaal het juiste plan voor dit aantal
  const doelPlan = bepaalPlanVoorAantal(aantalRecruiters);

  // 3. Lees huidig abonnement
  const { data: ab } = await admin
    .from("abonnementen")
    .select("plan, status, stripe_subscription_id, plan_handmatig")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!ab) {
    return { gewijzigd: false, aantalRecruiters, reden: "Bureau heeft nog geen abonnement" };
  }

  // Handmatig vastgezet plan: nooit automatisch overschrijven (#29).
  if (ab.plan_handmatig) {
    return { gewijzigd: false, aantalRecruiters, vorigPlan: ab.plan as PlanKey, reden: "Plan is handmatig vastgezet" };
  }

  // Niet automatisch wijzigen als bureau nog op betaling wacht of inactief is
  if (ab.status !== "actief") {
    return { gewijzigd: false, aantalRecruiters, vorigPlan: ab.plan as PlanKey, nieuwPlan: doelPlan, reden: `Status is "${ab.status}"` };
  }

  // 4. Geen wijziging nodig?
  if (ab.plan === doelPlan) {
    return { gewijzigd: false, aantalRecruiters, vorigPlan: ab.plan as PlanKey };
  }

  // Nooit AUTOMATISCH verlagen: een lager plan kan zitplaatsen/functies wegnemen.
  // Downgraden gebeurt alleen bewust met de hand (savePlan), niet door de teller.
  const RANG: Record<PlanKey, number> = { starter: 1, pro: 2, enterprise: 3 };
  if ((RANG[doelPlan] ?? 0) < (RANG[ab.plan as PlanKey] ?? 0)) {
    return { gewijzigd: false, aantalRecruiters, vorigPlan: ab.plan as PlanKey, nieuwPlan: doelPlan, reden: "Lager plan wordt niet automatisch toegepast" };
  }

  if (!ab.stripe_subscription_id) {
    return { gewijzigd: false, aantalRecruiters, reden: "Geen Stripe-koppeling" };
  }

  if (!stripeBeschikbaar()) {
    return { gewijzigd: false, aantalRecruiters, reden: "Stripe niet geconfigureerd" };
  }

  // 5. Plan-definitie ophalen
  const planDef = await getPlan(doelPlan);
  if (!planDef) {
    return { gewijzigd: false, aantalRecruiters, reden: `Plan "${doelPlan}" niet gevonden` };
  }

  // 6. Update Stripe-subscription met prorata
  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(ab.stripe_subscription_id);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) {
      return { gewijzigd: false, aantalRecruiters, reden: "Subscription heeft geen items" };
    }

    const price = await stripe.prices.create({
      currency: "eur",
      unit_amount: planDef.prijs_per_maand_cent,
      recurring: { interval: "month" },
      product_data: { name: `Noah ATS — ${planDef.label}` },
    });

    await stripe.subscriptions.update(ab.stripe_subscription_id, {
      items: [{ id: itemId, price: price.id }],
      proration_behavior: "create_prorations",
      metadata: {
        tenant_id: tenantId,
        type: "bureau_abonnement",
        plan: doelPlan,
        auto_upgrade_naar_aantal: String(aantalRecruiters),
      },
    });

    // 7. Lokaal bijwerken — error checken: Stripe is al gewijzigd, dus als de
    //    lokale update faalt staan we uit sync. Dat loggen we expliciet zodat
    //    het opgemerkt en hersteld kan worden.
    const { error: lokaalErr } = await admin.from("abonnementen").update({
      plan: doelPlan,
      max_users: planDef.max_users,
      prijs_per_maand_cent: planDef.prijs_per_maand_cent,
      stripe_price_id: price.id,
      updated_at: new Date().toISOString(),
    }).eq("tenant_id", tenantId);
    if (lokaalErr) {
      console.error(`[auto-upgrade] DESYNC: Stripe op "${doelPlan}" gezet maar lokale update faalde voor tenant ${tenantId}:`, lokaalErr);
      return { gewijzigd: false, aantalRecruiters, vorigPlan: ab.plan as PlanKey, nieuwPlan: doelPlan, reden: `Lokale update mislukt (Stripe wel gewijzigd): ${lokaalErr.message}` };
    }

    return {
      gewijzigd: true,
      vorigPlan: ab.plan as PlanKey,
      nieuwPlan: doelPlan,
      aantalRecruiters,
    };
  } catch (e) {
    console.error("[auto-upgrade] Stripe-update mislukt:", e);
    return {
      gewijzigd: false,
      aantalRecruiters,
      reden: e instanceof Error ? e.message : "Onbekende fout",
    };
  }
}
