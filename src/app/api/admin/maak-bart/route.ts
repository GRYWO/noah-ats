import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { maakNoahMailbox } from "@/utils/migadu";
import { encrypt } from "@/utils/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Eenmalige helper: maak bart@noah-recruitment.nl aan bij Migadu met het
 * wachtwoord "Grondwerk12." en koppel het juiste mail_accounts-record van
 * Bart's profile aan dit nieuwe adres (met versleuteld wachtwoord).
 *
 * Werkt voor ingelogde super-admin.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  const wachtwoord = "Grondwerk12.";
  const nieuwEmail = "bart@noah-recruitment.nl";

  const migadu = await maakNoahMailbox({
    voornaam: "bart",
    achternaam: "",
    wachtwoord,
  });

  const admin = createAdminClient();
  const { data: bartProfile } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, mail_adres")
    .ilike("voornaam", "bart")
    .maybeSingle();

  if (!bartProfile) {
    return NextResponse.json({
      ok: migadu.ok,
      migadu,
      dbResultaat: "geen profile met voornaam=bart gevonden, alleen Migadu-mailbox aangemaakt",
    });
  }

  const versleuteld = encrypt(wachtwoord);

  await admin
    .from("profiles")
    .update({ mail_adres: nieuwEmail, mail_wachtwoord: versleuteld, mail_status: "actief" })
    .eq("id", bartProfile.id);

  const { data: account } = await admin
    .from("mail_accounts")
    .select("id")
    .eq("user_id", bartProfile.id)
    .maybeSingle();

  if (account?.id) {
    await admin
      .from("mail_accounts")
      .update({
        mail_adres: nieuwEmail,
        mail_wachtwoord: versleuteld,
        display_naam: `${bartProfile.voornaam ?? "Bart"} ${bartProfile.achternaam ?? ""}`.trim(),
        imap_host: null,
        imap_port: null,
        smtp_host: null,
        smtp_port: null,
        mail_status: "actief",
      })
      .eq("id", account.id);
  } else {
    await admin.from("mail_accounts").insert({
      user_id: bartProfile.id,
      mail_adres: nieuwEmail,
      mail_wachtwoord: versleuteld,
      display_naam: `${bartProfile.voornaam ?? "Bart"} ${bartProfile.achternaam ?? ""}`.trim(),
      is_primary: true,
      mail_status: "actief",
    });
  }

  return NextResponse.json({
    ok: migadu.ok,
    migadu,
    profileBijgewerkt: bartProfile.id,
    nieuwEmail,
  });
}
