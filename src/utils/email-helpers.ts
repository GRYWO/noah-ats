import { createAdminClient } from "@/utils/supabase/admin";

const MAIL_DOMEIN = "noah-recruitment.nl";

/**
 * Bouw een 'From'-string voor een setter/recruiter. Format:
 *   "Voornaam Achternaam <voornaam@noah-recruitment.nl>"
 *
 * Het mailadres wordt automatisch afgeleid uit de voornaam (lowercase,
 * zonder spaties/diacritics) tenzij er expliciet een ander mail_adres in
 * het profiel staat dat niet @noah-recruitment.nl is.
 *
 * Belangrijk: het domein moet in Resend geverifieerd zijn (@noah-recruitment.nl is dat).
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

  // Resend kan alleen vanaf @noah-recruitment.nl versturen (enige geverifieerde domein).
  // Voorkeur: mail_adres als dat een @noah-recruitment.nl-adres is — zo werkt elke
  // Hostnet-mailbox zoals 'p.zwartenberg@noah-recruitment.nl', 'pepijn.zw@noah-recruitment.nl', etc.
  // Anders fallback op auto-generated voornaam@noah-recruitment.nl.
  const ingevuldNoah = data.mail_adres?.trim().toLowerCase().endsWith(`@${MAIL_DOMEIN}`)
    ? data.mail_adres.trim()
    : null;
  const email = ingevuldNoah || standaardEmail;

  const naam = `${data.voornaam ?? ""} ${data.achternaam ?? ""}`.trim();
  return naam ? `${naam} <${email}>` : email;
}
