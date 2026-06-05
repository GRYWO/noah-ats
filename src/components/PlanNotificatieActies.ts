"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type User = {
  id: string;
  voornaam: string | null;
  achternaam: string | null;
};

/**
 * Lijst van users in dezelfde tenant (inclusief de viewer zelf).
 * Gebruikt voor de 'Voor wie?' dropdown in de plan-modal.
 */
export async function lijstTenantUsers(): Promise<User[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: viewer } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!viewer?.tenant_id) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, voornaam, achternaam")
    .eq("tenant_id", viewer.tenant_id)
    .order("voornaam", { ascending: true });
  return data ?? [];
}

/**
 * Plan een notificatie voor jezelf of een collega.
 * Cron pikt 'm op zodra het moment is bereikt en zet 'm om in een echte
 * notificatie zodat de popup verschijnt.
 */
export async function planNotificatie(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const voor_user_id = (formData.get("voor_user_id") as string)?.trim();
  const titel = (formData.get("titel") as string)?.trim();
  const bericht = (formData.get("bericht") as string)?.trim() || null;
  const datumTijd = (formData.get("geplande_tijd") as string)?.trim(); // 'YYYY-MM-DDTHH:mm'

  if (!voor_user_id) return { error: "Kies een ontvanger" };
  if (!titel) return { error: "Vul een titel in" };
  if (!datumTijd) return { error: "Kies datum + tijd" };

  const geplandeTijd = new Date(datumTijd);
  if (isNaN(geplandeTijd.getTime())) return { error: "Ongeldige datum/tijd" };
  if (geplandeTijd.getTime() < Date.now() - 60 * 1000) {
    return { error: "De gekozen tijd ligt in het verleden" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const admin = createAdminClient();

  // Tenant bepalen vanuit de viewer (RLS-vangnet voor extra zekerheid)
  const { data: viewer } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!viewer?.tenant_id) return { error: "Geen tenant" };

  // Doel-user moet in zelfde tenant zitten
  const { data: doel } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", voor_user_id)
    .maybeSingle();
  if (!doel) return { error: "Ontvanger niet gevonden" };
  if (doel.tenant_id !== viewer.tenant_id) return { error: "Ontvanger zit niet in dit bureau" };

  const { error } = await admin.from("geplande_notificaties").insert({
    tenant_id: viewer.tenant_id,
    voor_user_id,
    gepland_door: user.id,
    titel,
    bericht,
    geplande_tijd: geplandeTijd.toISOString(),
  });
  if (error) return { error: error.message };

  return { ok: true };
}
