"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Direct verlopen herinneringen verzilveren — onafhankelijk van de Vercel-cron.
 * Handig voor testen + als noodknop wanneer cron niet draait.
 * Iedereen mag dit voor zijn eigen tenant aanroepen.
 */
export async function triggerNuVerlopen(): Promise<{ verwerkt: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { verwerkt: 0, error: "Niet ingelogd" };

  const admin = createAdminClient();
  const { data: viewer } = await admin
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .maybeSingle();
  if (!viewer?.tenant_id) return { verwerkt: 0, error: "Geen tenant" };

  const nu = new Date().toISOString();
  // Een gewone gebruiker mag alleen ZIJN EIGEN geplande herinneringen handmatig
  // verzilveren (gepland door of gericht aan hemzelf). Alleen een admin mag de
  // hele tenant-wachtrij triggeren.
  let q = admin
    .from("geplande_notificaties")
    .select("id, tenant_id, voor_user_id, gepland_door, titel, bericht")
    .eq("tenant_id", viewer.tenant_id)
    .eq("status", "open")
    .lt("geplande_tijd", nu);
  if (viewer.rol !== "admin") {
    q = q.or(`gepland_door.eq.${user.id},voor_user_id.eq.${user.id}`);
  }
  const { data: gepland } = await q.limit(100);

  let verwerkt = 0;
  for (const g of gepland ?? []) {
    const { error } = await admin.from("notificaties").insert({
      tenant_id: g.tenant_id,
      user_id: g.voor_user_id,
      van_user_id: g.gepland_door,
      type: "herinnering",
      titel: g.titel,
      bericht: g.bericht,
    });
    if (error) continue;
    await admin
      .from("geplande_notificaties")
      .update({ status: "verstuurd", verstuurd_op: nu })
      .eq("id", g.id);
    verwerkt++;
  }

  revalidatePath("/herinneringen");
  return { verwerkt };
}

/**
 * Annuleer een geplande herinnering. Alleen de planner zelf mag annuleren.
 */
export async function annuleerHerinnering(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const id = formData.get("id") as string;
  if (!id) return { error: "Id ontbreekt" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("geplande_notificaties")
    .update({ status: "geannuleerd" })
    .eq("id", id)
    .eq("gepland_door", user.id);
  if (error) return { error: error.message };

  revalidatePath("/herinneringen");
  return { ok: true };
}
