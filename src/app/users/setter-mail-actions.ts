"use server";

import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { isSalesAdmin } from "@/utils/sales-admin";
import { startSetterAbonnement } from "./setter-stripe-actions";

/**
 * Verstuur (of opnieuw verstuur) de Stripe-betaallink naar een setter.
 * Maakt een nieuwe checkout-session (Stripe sessions zijn 24u geldig)
 * en mailt naar het login-e-mailadres.
 *
 * Idempotent: altijd opnieuw te triggeren, ook als al actief.
 */
export async function verstuurSetterAbonnementMail(userId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  // Admins van eigen tenant + super-admin + sales-admin mogen dit doen
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();

  const isSuper = isSuperAdminEmail(user.email);
  const isSales = await isSalesAdmin(user);
  const isAdmin = viewerProfile?.rol === "admin";

  if (!isSuper && !isSales && !isAdmin) {
    return { ok: false, error: "Geen toegang" };
  }

  // Check tenant-grenzen voor admin
  if (!isSuper && !isSales) {
    const { data: doelProfile } = await supabase
      .from("profiles")
      .select("tenant_id, rol")
      .eq("id", userId)
      .single();
    if (doelProfile?.tenant_id !== viewerProfile?.tenant_id) {
      return { ok: false, error: "User zit niet in jouw bureau" };
    }
    if (doelProfile?.rol !== "setter") {
      return { ok: false, error: "Alleen voor setters" };
    }
  }

  // Hergebruik de bestaande checkout-flow — die maakt een nieuwe session
  // (Stripe customer wordt hergebruikt) en stuurt de mail.
  return await startSetterAbonnement(userId);
}
