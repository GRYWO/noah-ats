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

  // Resend kan alleen vanaf @grywo.nl versturen (enige geverifieerde domein).
  // Voorkeur: mail_adres als dat een @grywo.nl-adres is — zo werkt elke
  // Hostnet-mailbox zoals 'p.zwartenberg@grywo.nl', 'pepijn.zw@grywo.nl', etc.
  // Anders fallback op auto-generated voornaam@grywo.nl.
  const ingevuldGrywo = data.mail_adres?.trim().toLowerCase().endsWith(`@${MAIL_DOMEIN}`)
    ? data.mail_adres.trim()
    : null;
  const email = ingevuldGrywo || standaardEmail;

  const naam = `${data.voornaam ?? ""} ${data.achternaam ?? ""}`.trim();
  return naam ? `${naam} <${email}>` : email;
}
