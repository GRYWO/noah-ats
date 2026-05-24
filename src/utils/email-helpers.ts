import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Bouw een 'From'-string voor een setter/recruiter zodat mails vanuit hun
 * persoonlijke mailadres lijken te komen. Format: "Voornaam Achternaam <mail>".
 *
 * Belangrijk: het domein van mail_adres moet in Resend geverifieerd zijn
 * (bv. @grywo.nl). Anders rejecteert Resend de mail.
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
  if (!data?.mail_adres) return undefined;
  const naam = `${data.voornaam ?? ""} ${data.achternaam ?? ""}`.trim();
  return naam ? `${naam} <${data.mail_adres}>` : data.mail_adres;
}
