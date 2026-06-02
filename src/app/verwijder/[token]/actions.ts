"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { sendVerwijderResultaatNaarSetter } from "@/utils/email";

type Result = { ok?: boolean; error?: string; actie?: "akkoord" | "weiger" };

/**
 * Recruiter handelt een verwijder-verzoek af via token-link uit de mail.
 * - akkoord → kandidaat wordt verwijderd, setter krijgt bevestiging
 * - weiger → status op "geweigerd", setter krijgt afwijzingsmail
 *
 * Geen login vereist — token-based, eenmalig bruikbaar (status moet 'open' zijn).
 */
export async function behandelVerwijderVerzoek(
  token: string,
  actie: "akkoord" | "weiger",
): Promise<Result> {
  if (!token) return { error: "Token ontbreekt" };
  if (actie !== "akkoord" && actie !== "weiger") return { error: "Ongeldige actie" };

  const admin = createAdminClient();

  // Lees verzoek
  const { data: verzoek } = await admin
    .from("kandidaat_verwijder_verzoeken")
    .select("id, kandidaat_id, aangevraagd_door, status, verloopt_op")
    .eq("token", token)
    .maybeSingle();

  if (!verzoek) return { error: "Verzoek niet gevonden of token verlopen" };
  if (verzoek.status !== "open") {
    return { error: `Dit verzoek is al ${verzoek.status}.` };
  }
  if (verzoek.verloopt_op && new Date(verzoek.verloopt_op) < new Date()) {
    await admin
      .from("kandidaat_verwijder_verzoeken")
      .update({ status: "verlopen" })
      .eq("id", verzoek.id);
    return { error: "Dit verzoek is verlopen (ouder dan 14 dagen)." };
  }

  // Lees kandidaat + setter info voor de mail
  const { data: kandidaat } = await admin
    .from("kandidaten")
    .select("voornaam, achternaam, aangemaakt_door, eigenaar_id")
    .eq("id", verzoek.kandidaat_id)
    .maybeSingle();
  const kandidaatNaam = kandidaat
    ? `${kandidaat.voornaam ?? ""} ${kandidaat.achternaam ?? ""}`.trim()
    : "kandidaat";

  const { data: setter } = await admin
    .from("profiles")
    .select("voornaam, mail_adres")
    .eq("id", verzoek.aangevraagd_door)
    .maybeSingle();
  const { data: setterAuth } = await admin.auth.admin.getUserById(verzoek.aangevraagd_door);
  const setterEmail = setter?.mail_adres || setterAuth?.user?.email;

  const recruiterId = kandidaat?.aangemaakt_door || kandidaat?.eigenaar_id;
  let recruiterNaam = "de recruiter";
  if (recruiterId) {
    const { data: rec } = await admin
      .from("profiles")
      .select("voornaam, achternaam")
      .eq("id", recruiterId)
      .maybeSingle();
    if (rec) recruiterNaam = `${rec.voornaam ?? ""} ${rec.achternaam ?? ""}`.trim() || "de recruiter";
  }

  if (actie === "akkoord") {
    // Verwijder kandidaat (cascade ruimt voorstellen/plaatsingen op)
    await admin.from("kandidaten").delete().eq("id", verzoek.kandidaat_id);

    await admin
      .from("kandidaat_verwijder_verzoeken")
      .update({
        status: "goedgekeurd",
        behandeld_op: new Date().toISOString(),
      })
      .eq("id", verzoek.id);
  } else {
    await admin
      .from("kandidaat_verwijder_verzoeken")
      .update({
        status: "geweigerd",
        behandeld_op: new Date().toISOString(),
      })
      .eq("id", verzoek.id);
  }

  // Mail naar setter
  if (setterEmail) {
    try {
      await sendVerwijderResultaatNaarSetter({
        naar: setterEmail,
        setterVoornaam: setter?.voornaam ?? "",
        kandidaatNaam,
        akkoord: actie === "akkoord",
        recruiterNaam,
      });
    } catch (e) {
      console.error("[verwijder-verzoek] setter-mail mislukt:", e);
    }
  }

  return { ok: true, actie };
}
