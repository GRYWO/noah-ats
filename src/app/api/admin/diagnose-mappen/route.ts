import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { decrypt } from "@/utils/crypto";
import { getMailServers } from "@/utils/mail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Open een live IMAP-verbinding voor de ingelogde user en retourneer:
 *  - wat de server als mappenlijst teruggeeft (path, flags, specialUse)
 *  - wat er momenteel in mail_mappen-tabel staat
 *
 * Handig om vast te stellen of het probleem aan de IMAP-server zit
 * (Migadu maakt sommige mappen pas aan bij gebruik) of aan onze sync.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("mail_accounts")
    .select("id, mail_adres, mail_wachtwoord, imap_host, imap_port")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (!account?.mail_adres || !account.mail_wachtwoord) {
    return NextResponse.json({ error: "Geen primair mail-account" }, { status: 400 });
  }

  const servers = getMailServers(account.mail_adres);
  const client = new ImapFlow({
    host: account.imap_host ?? servers.imapHost,
    port: account.imap_port ?? servers.imapPort,
    secure: true,
    auth: { user: account.mail_adres, pass: decrypt(account.mail_wachtwoord) },
    logger: false,
  });

  const imapMappen: Array<Record<string, unknown>> = [];
  const aangemaakt: string[] = [];
  const aanmaakFouten: Array<{ naam: string; fout: string }> = [];
  let imapError: string | null = null;

  try {
    await client.connect();
    for (const naam of ["Sent", "Drafts", "Junk", "Trash", "Archive"]) {
      try {
        await client.mailboxCreate(naam);
        aangemaakt.push(naam);
      } catch (e) {
        aanmaakFouten.push({ naam, fout: (e as Error).message });
      }
    }
    const list = await client.list();
    for (const m of list) {
      imapMappen.push({
        path: m.path,
        name: m.name,
        specialUse: m.specialUse,
        flags: m.flags ? Array.from(m.flags) : [],
      });
    }
  } catch (e) {
    imapError = (e as Error).message;
  } finally {
    await client.logout().catch(() => {});
  }

  const { data: dbMappen } = await admin
    .from("mail_mappen")
    .select("pad, label, type, aantal, ongelezen")
    .eq("account_id", account.id);

  return NextResponse.json({
    account: { id: account.id, mail_adres: account.mail_adres, imap_host: account.imap_host ?? servers.imapHost },
    imapMappen,
    aangemaakt,
    aanmaakFouten,
    imapError,
    dbMappen,
  });
}
