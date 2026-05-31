"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { getStripe, stripeBeschikbaar } from "@/utils/stripe";
import { revalidatePath } from "next/cache";

async function eisSuper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) return null;
  return user;
}

/**
 * Notitie opslaan (upsert) per bureau (tenant_id) of setter (user_id).
 */
export async function saveNotitie({
  type, id, notitie,
}: {
  type: "bureau" | "setter";
  id: string;
  notitie: string;
}) {
  const u = await eisSuper();
  if (!u) return { ok: false, error: "Geen toegang" };
  const admin = createAdminClient();

  const tekst = notitie.trim();
  const filterKey = type === "bureau" ? "tenant_id" : "user_id";

  // Eerst bestaande zoeken
  const { data: bestaand } = await admin
    .from("abonnement_notities")
    .select("id")
    .eq(filterKey, id)
    .maybeSingle();

  if (tekst === "") {
    // Lege notitie = verwijderen
    if (bestaand) {
      await admin.from("abonnement_notities").delete().eq("id", bestaand.id);
    }
  } else if (bestaand) {
    await admin
      .from("abonnement_notities")
      .update({ notitie: tekst, bijgewerkt_op: new Date().toISOString() })
      .eq("id", bestaand.id);
  } else {
    await admin.from("abonnement_notities").insert({
      [filterKey]: id,
      notitie: tekst,
      gemaakt_door: u.id,
    });
  }

  revalidatePath("/abonnementen-beheer");
  return { ok: true };
}

/**
 * Bureau-abonnement opzeggen via Stripe (per einde periode).
 */
export async function opzeggenBureau(tenantId: string) {
  if (!(await eisSuper())) return { ok: false, error: "Geen toegang" };
  if (!stripeBeschikbaar()) return { ok: false, error: "Stripe niet beschikbaar" };

  const admin = createAdminClient();
  const { data: ab } = await admin
    .from("abonnementen")
    .select("stripe_subscription_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!ab?.stripe_subscription_id) {
    return { ok: false, error: "Geen Stripe-koppeling" };
  }

  const stripe = getStripe();
  await stripe.subscriptions.update(ab.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  await admin
    .from("abonnementen")
    .update({ status: "opgezegd", beeindigd_op: new Date().toISOString() })
    .eq("tenant_id", tenantId);

  revalidatePath("/abonnementen-beheer");
  revalidatePath(`/bureaus/${tenantId}`);
  return { ok: true };
}

/**
 * Setter-abonnement opzeggen via Stripe (per einde periode).
 */
export async function opzeggenSetter(userId: string) {
  if (!(await eisSuper())) return { ok: false, error: "Geen toegang" };
  if (!stripeBeschikbaar()) return { ok: false, error: "Stripe niet beschikbaar" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", userId)
    .single();

  if (!profile?.stripe_subscription_id) {
    return { ok: false, error: "Geen Stripe-subscription" };
  }

  const stripe = getStripe();
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  await admin
    .from("profiles")
    .update({ abonnement_status: "opgezegd", abonnement_opgezegd_op: new Date().toISOString() })
    .eq("id", userId);

  revalidatePath("/abonnementen-beheer");
  return { ok: true };
}

/**
 * Setter-abonnement reactiveren (cancel_at_period_end ongedaan maken).
 */
export async function reactiveerSetter(userId: string) {
  if (!(await eisSuper())) return { ok: false, error: "Geen toegang" };
  if (!stripeBeschikbaar()) return { ok: false, error: "Stripe niet beschikbaar" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", userId)
    .single();

  if (!profile?.stripe_subscription_id) {
    return { ok: false, error: "Geen Stripe-subscription" };
  }

  const stripe = getStripe();
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  await admin
    .from("profiles")
    .update({ abonnement_status: "actief", abonnement_opgezegd_op: null })
    .eq("id", userId);

  revalidatePath("/abonnementen-beheer");
  return { ok: true };
}
