import { createAdminClient } from "@/utils/supabase/admin";

const MAIL_DOMEIN = "grywo.nl";

/**
 * Bouw een 'From'-string voor een setter/recruiter. Format:
 *   "Voornaam Achternaam <voornaam@grywo.nl>"
 *
 * Het mailadres wordt automatisch afgeleid uit de voornaam (lowercase,
 * zonder spaties/diacritics) tenzij er expliciet een ander mail_adres in
 * het profiel staat dat niet @grywo.nl is.
 *
 * Belangrijk: het domein moet in Resend geverifieerd zijn (@grywo.nl is dat).
 */
export async function getSetterFrom(
  setterId: string | null | undefined,
): Promise<string | undefined> {
  if (!setterId) return undefined;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("voornaam, achternaam, mail_adres")
    .eq("id", setterId)
    .single();
  if (!data?.voornaam) return undefined;

  const voornaamSchoon = data.voornaam
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
  const standaardEmail = `${voornaamSchoon}@${MAIL_DOMEIN}`;

  // Gebruik standaard voornaam@grywo.nl. Alleen wanneer expliciet iets
  // ANDERS (niet @grywo.nl) staat in mail_adres, gebruik dat.
  const email = data.mail_adres && !data.mail_adres.toLowerCase().endsWith(`@${MAIL_DOMEIN}`)
    ? data.mail_adres
    : standaardEmail;

  const naam = `${data.voornaam ?? ""} ${data.achternaam ?? ""}`.trim();
  return naam ? `${naam} <${email}>` : email;
}
