"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendKandidaatVerwijderVerzoek } from "@/utils/email";

type Result = { ok?: boolean; error?: string; alOpen?: boolean; mailNaar?: string };

/**
 * Setter vraagt verwijdering van een kandidaat aan.
 * Stuurt mail naar de recruiter (aangemaakt_door, valt terug op eigenaar_id)
 * met token-link voor akkoord/weigeren.
 */
export async function vraagVerwijderingAan(formData: FormData): Promise<Result> {
  const kandidaatId = formData.get("kandidaat_id") as string;
  const reden = (formData.get("reden") as string)?.trim() || null;

  if (!kandidaatId) return { error: "Kandidaat ontbreekt" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const admin = createAdminClient();

  // Setter-profiel
  const { data: setter } = await admin
    .from("profiles")
    .select("voornaam, achternaam, rol, tenant_id")
    .eq("id", user.id)
    .single();
  if (!setter) return { error: "Profiel niet gevonden" };
  if (setter.rol !== "setter") return { error: "Deze knop is alleen voor setters" };

  // Kandidaat + recruiter ophalen
  const { data: kandidaat } = await admin
    .from("kandidaten")
    .select("id, tenant_id, voornaam, achternaam, aangemaakt_door, eigenaar_id")
    .eq("id", kandidaatId)
    .single();
  if (!kandidaat) return { error: "Kandidaat niet gevonden" };
  if (kandidaat.tenant_id !== setter.tenant_id) return { error: "Andere tenant" };

  // Recruiter zoeken: het mag NOOIT de setter zelf zijn.
  // 1) aangemaakt_door (mits niet de setter, en mits de persoon een echte recruiter/admin is)
  // 2) eigenaar_id (zelfde check)
  // 3) eerste recruiter/admin in tenant
  async function geefRol(id: string | null | undefined): Promise<string | null> {
    if (!id) return null;
    const { data } = await admin.from("profiles").select("rol").eq("id", id).maybeSingle();
    return data?.rol ?? null;
  }

  let recruiterId: string | null = null;
  for (const kandidaatId2 of [kandidaat.aangemaakt_door, kandidaat.eigenaar_id]) {
    if (!kandidaatId2 || kandidaatId2 === user.id) continue;
    const rol = await geefRol(kandidaatId2);
    if (rol === "recruiter" || rol === "admin") {
      recruiterId = kandidaatId2;
      break;
    }
  }
  if (!recruiterId) {
    // Pak eerste recruiter/admin in deze tenant (niet de setter zelf)
    const { data: fallback } = await admin
      .from("profiles")
      .select("id")
      .eq("tenant_id", setter.tenant_id)
      .in("rol", ["recruiter", "admin"])
      .neq("id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    recruiterId = fallback?.id ?? null;
  }
  if (!recruiterId) {
    return { error: "Geen recruiter of admin in dit bureau gevonden — neem contact op met info@grywo.nl." };
  }

  // Recruiter-profiel + e-mailadres
  const { data: recruiter } = await admin
    .from("profiles")
    .select("voornaam, achternaam, mail_adres")
    .eq("id", recruiterId)
    .single();
  if (!recruiter) return { error: "Recruiter niet gevonden" };

  const { data: recruiterAuth } = await admin.auth.admin.getUserById(recruiterId);
  const recruiterEmail = recruiter.mail_adres || recruiterAuth?.user?.email;
  if (!recruiterEmail) {
    return { error: `Geen e-mailadres bekend voor ${recruiter.voornaam ?? "recruiter"}. Vul dit in via /users.` };
  }

  // Setter mag meerdere verzoeken sturen — geen blokkade meer op open verzoeken.

  // Maak verzoek + token
  const token = randomBytes(24).toString("hex");
  const { error: insErr } = await admin.from("kandidaat_verwijder_verzoeken").insert({
    tenant_id: setter.tenant_id,
    kandidaat_id: kandidaatId,
    aangevraagd_door: user.id,
    token,
    reden_aanvraag: reden,
  });
  if (insErr) return { error: insErr.message };

  // Stuur mail
  const kandidaatNaam = `${kandidaat.voornaam ?? ""} ${kandidaat.achternaam ?? ""}`.trim();
  const setterNaam = `${setter.voornaam ?? ""} ${setter.achternaam ?? ""}`.trim();
  try {
    await sendKandidaatVerwijderVerzoek({
      naar: recruiterEmail,
      recruiterVoornaam: recruiter.voornaam ?? "",
      kandidaatNaam,
      setterNaam,
      reden,
      token,
    });
  } catch (e) {
    // Rollback het verzoek zodat setter het opnieuw kan proberen
    await admin.from("kandidaat_verwijder_verzoeken").delete().eq("token", token);
    return { error: `Mail naar recruiter mislukt: ${(e as Error).message}` };
  }

  // Failsafe-kopie naar info@grywo.nl zodat GRYWO altijd op de hoogte is
  // (en kan ingrijpen als de recruiter niet reageert).
  try {
    await sendKandidaatVerwijderVerzoek({
      naar: "info@grywo.nl",
      recruiterVoornaam: "GRYWO-team",
      kandidaatNaam: `[KOPIE] ${kandidaatNaam}`,
      setterNaam: `${setterNaam} → recruiter: ${recruiter.voornaam ?? "?"} (${recruiterEmail})`,
      reden,
      token,
    });
  } catch (e) {
    console.error("[verwijder-verzoek] failsafe-kopie naar info@grywo.nl mislukt:", e);
  }

  revalidatePath(`/kandidaten/${kandidaatId}`);
  return { ok: true, mailNaar: recruiterEmail };
}
