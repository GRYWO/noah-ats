"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { maakNotificatie, notifyTeam } from "@/utils/notificaties";

export async function contactOpnemenMetRecruiter(formData: FormData) {
  const kandidaatId = formData.get("kandidaat_id") as string;
  const bericht = (formData.get("bericht") as string)?.trim();

  if (!bericht) return { error: "Bericht is leeg" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, voornaam, achternaam")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) return { error: "Geen tenant" };

  const admin = createAdminClient();
  const { data: kandidaat } = await admin
    .from("kandidaten")
    .select("voornaam, achternaam, cv_controle_door")
    .eq("id", kandidaatId)
    .single();

  if (!kandidaat) return { error: "Kandidaat niet gevonden" };

  const setterNaam = `${profile.voornaam ?? ""} ${profile.achternaam ?? ""}`.trim() || "Setter";
  const kandidaatNaam = `${kandidaat.voornaam ?? ""} ${kandidaat.achternaam ?? ""}`.trim();

  // Schaalbaar: stuur alleen naar de recruiter die aan de kandidaat is gekoppeld
  // (cv_controle_door). Zo blijven 20 recruiters niet allemaal de melding krijgen.
  // Fallback: team-breed als er nog geen recruiter is.
  if (kandidaat.cv_controle_door && kandidaat.cv_controle_door !== user.id) {
    await maakNotificatie({
      tenantId: profile.tenant_id,
      userId: kandidaat.cv_controle_door,
      vanUserId: user.id,
      type: "contact_recruiter",
      titel: `${setterNaam} heeft een vraag over ${kandidaatNaam}`,
      bericht,
      linkUrl: `/kandidaten/${kandidaatId}`,
      kandidaatId,
    });
  } else {
    await notifyTeam({
      tenantId: profile.tenant_id,
      vanUserId: user.id,
      type: "contact_recruiter",
      titel: `${setterNaam} heeft een vraag over ${kandidaatNaam}`,
      bericht,
      linkUrl: `/kandidaten/${kandidaatId}`,
      kandidaatId,
    });
  }

  revalidatePath(`/kandidaten/${kandidaatId}`);
  return { ok: true };
}

export async function reageerOpNotificatie(formData: FormData) {
  const notificatieId = formData.get("notificatie_id") as string;
  const bericht = (formData.get("bericht") as string)?.trim();

  if (!notificatieId || !bericht) return { error: "Ongeldige invoer" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, voornaam, achternaam, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return { error: "Geen tenant" };

  const admin = createAdminClient();
  const { data: bron } = await admin
    .from("notificaties")
    .select("id, tenant_id, van_user_id, user_id, kandidaat_id, link_url, type")
    .eq("id", notificatieId)
    .single();

  if (!bron) return { error: "Notificatie niet gevonden" };
  if (bron.user_id !== user.id) return { error: "Niet jouw notificatie" };
  if (bron.tenant_id !== profile.tenant_id) return { error: "Verkeerde tenant" };
  if (!bron.van_user_id) return { error: "Notificatie heeft geen afzender" };

  const afzenderNaam = `${profile.voornaam ?? ""} ${profile.achternaam ?? ""}`.trim() || (profile.rol === "setter" ? "Setter" : "Recruiter");
  const antwoordType = profile.rol === "setter" ? "contact_recruiter" : "contact_setter";

  await maakNotificatie({
    tenantId: profile.tenant_id,
    userId: bron.van_user_id,
    vanUserId: user.id,
    type: antwoordType,
    titel: `${afzenderNaam} reageerde`,
    bericht,
    linkUrl: bron.link_url,
    kandidaatId: bron.kandidaat_id,
    parentNotificatieId: bron.id,
  });

  // Markeer originele notificatie als gelezen
  await admin.from("notificaties").update({ gelezen: true }).eq("id", notificatieId);

  return { ok: true };
}
