import { createAdminClient } from "./supabase/admin";

/**
 * Zorgt dat een user een mail_accounts-rij heeft als zijn profiel een
 * mail_adres + mail_wachtwoord bevat. Idempotent: doet niets als er al
 * een account is, of als profiel geen mail-config heeft.
 *
 * Wordt aangeroepen op /inbox en /instellingen pageloads zodat oude
 * setters die via teken-actions zijn aangemaakt vóór mail_accounts werd
 * gevuld alsnog automatisch hun mailbox krijgen.
 */
export async function ensureMailAccountForUser(userId: string): Promise<void> {
  if (!userId) return;
  const admin = createAdminClient();

  // 1. Bestaat er al een mail_accounts rij?
  const { data: bestaand } = await admin
    .from("mail_accounts")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (bestaand) return;

  // 2. Heeft het profiel mail-config?
  const { data: profile } = await admin
    .from("profiles")
    .select("mail_adres, mail_wachtwoord, mail_status")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.mail_adres || !profile?.mail_wachtwoord) return;

  // 3. Kopieer naar mail_accounts (wachtwoord is al versleuteld in profiles).
  await admin
    .from("mail_accounts")
    .upsert(
      {
        user_id: userId,
        mail_adres: profile.mail_adres,
        mail_wachtwoord: profile.mail_wachtwoord,
        display_naam: "Werk",
        is_primary: true,
        mail_status: profile.mail_status || "actief",
      },
      { onConflict: "user_id,mail_adres" },
    );
}
