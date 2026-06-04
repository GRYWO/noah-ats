"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendNieuweKandidaatVerzoek } from "@/utils/email";

type Result = { ok?: boolean; error?: string; mailNaar?: string };

/**
 * Setter vraagt handmatig een nieuwe kandidaat aan.
 * Stuurt mail naar eerste beschikbare recruiter/admin in de tenant
 * (niet de setter zelf). Recruiter wijst handmatig toe via /kanban
 * of /kandidaten → 'Eigenaar wijzigen'.
 *
 * Werkt op elk moment — ook bij 0 of 1 uitnodigingen. Naast de
 * automatische toewijzing bij 2 uitnodigingen.
 */
export async function vraagNieuweKandidaatAan(formData: FormData): Promise<Result> {
  const reden = (formData.get("reden") as string)?.trim() || null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const admin = createAdminClient();

  // Setter-profiel + huidige kandidaat
  const { data: setter } = await admin
    .from("profiles")
    .select("voornaam, achternaam, rol, tenant_id")
    .eq("id", user.id)
    .single();
  if (!setter) return { error: "Profiel niet gevonden" };
  if (setter.rol !== "setter") return { error: "Alleen setters kunnen dit aanvragen" };

  // Huidige actieve kandidaat van setter (voor context in mail)
  const { data: huidig } = await admin
    .from("kandidaten")
    .select("id")
    .eq("eigenaar_id", user.id)
    .not("status", "in", '("geplaatst","afgewezen")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let aantalUitnodigingen = 0;
  if (huidig?.id) {
    const { count } = await admin
      .from("voorstellen")
      .select("id", { count: "exact", head: true })
      .eq("kandidaat_id", huidig.id)
      .eq("status", "uitnodigen");
    aantalUitnodigingen = count ?? 0;
  }

  // Vind eerste recruiter/admin in dezelfde tenant (niet de setter zelf)
  const { data: recruiter } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, mail_adres")
    .eq("tenant_id", setter.tenant_id)
    .in("rol", ["recruiter", "admin"])
    .neq("id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!recruiter) {
    return { error: "Geen recruiter of admin gevonden in dit bureau." };
  }

  const { data: recruiterAuth } = await admin.auth.admin.getUserById(recruiter.id);
  const recruiterEmail = recruiter.mail_adres || recruiterAuth?.user?.email;
  if (!recruiterEmail) {
    return { error: `Geen e-mailadres bekend voor ${recruiter.voornaam ?? "recruiter"}.` };
  }

  const setterNaam =
    `${setter.voornaam ?? ""} ${setter.achternaam ?? ""}`.trim() || "Een setter";

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("vercel.app")
      ? process.env.NEXT_PUBLIC_APP_URL
      : "https://noah-ats.nl";

  try {
    await sendNieuweKandidaatVerzoek({
      naar: recruiterEmail,
      recruiterVoornaam: recruiter.voornaam ?? "",
      setterNaam,
      reden,
      aantalUitnodigingen,
      link: `${baseUrl}/kanban`,
    });
  } catch (e) {
    return { error: `Mail naar recruiter mislukt: ${(e as Error).message}` };
  }

  // Failsafe-kopie naar info@grywo.nl
  try {
    await sendNieuweKandidaatVerzoek({
      naar: "info@grywo.nl",
      recruiterVoornaam: "GRYWO-team",
      setterNaam: `${setterNaam} → ${recruiter.voornaam ?? "?"} (${recruiterEmail})`,
      reden,
      aantalUitnodigingen,
      link: `${baseUrl}/kanban`,
    });
  } catch (e) {
    console.error("[nieuwe-kandidaat] failsafe-kopie mislukt:", e);
  }

  return { ok: true, mailNaar: recruiterEmail };
}
