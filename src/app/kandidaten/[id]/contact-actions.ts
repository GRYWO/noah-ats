"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { notifyTeam } from "@/utils/notificaties";

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

  await notifyTeam({
    tenantId: profile.tenant_id,
    vanUserId: user.id,
    type: "contact_recruiter",
    titel: `${setterNaam} heeft een vraag over ${kandidaatNaam}`,
    bericht,
    linkUrl: `/kandidaten/${kandidaatId}`,
    kandidaatId,
  });

  revalidatePath(`/kandidaten/${kandidaatId}`);
  return { ok: true };
}
