import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ImapFlow } from "imapflow";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { decrypt } from "@/utils/crypto";
import { getMailServers } from "@/utils/mail-provider";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AccountRow = {
  id: string;
  user_id: string;
  mail_adres: string | null;
  mail_wachtwoord: string | null;
  imap_host: string | null;
  imap_port: number | null;
};

type MapResultaat = {
  naam: string;
  status: "aangemaakt" | "bestond_al" | "fout";
  fout?: string;
};

type AccountResultaat = {
  id: string;
  mail_adres: string | null;
  imapError: string | null;
  mappen: MapResultaat[];
};

const STANDAARD_MAPPEN = ["Sent", "Drafts", "Junk", "Trash", "Archive"] as const;

/**
 * Maakt de standaard IMAP-mappen (Sent, Drafts, Junk, Trash, Archive) forceer
 * aan voor mail-accounts. Per map wordt aangegeven of die nieuw is gemaakt of
 * al bestond.
 *
 * Standaard: alle accounts van de ingelogde user.
 * Met ?alle=1 of body { alle: true } EN super-admin: alle accounts in db.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const url = new URL(request.url);
  let alle = url.searchParams.get("alle") === "1";
  if (!alle) {
    try {
      const body = (await request.json().catch(() => null)) as { alle?: boolean } | null;
      if (body && body.alle === true) alle = true;
    } catch {
      // body mag leeg zijn
    }
  }

  const isSuper = isSuperAdminEmail(user.email);
  if (alle && !isSuper) {
    return NextResponse.json({ error: "Geen super-admin" }, { status: 403 });
  }

  const admin = createAdminClient();
  const baseQuery = admin
    .from("mail_accounts")
    .select("id, user_id, mail_adres, mail_wachtwoord, imap_host, imap_port");

  const { data: accounts, error } = alle
    ? await baseQuery.not("id", "is", null)
    : await baseQuery.eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rijen = (accounts ?? []) as AccountRow[];
  const resultaten: AccountResultaat[] = [];

  for (const acc of rijen) {
    const resultaat: AccountResultaat = {
      id: acc.id,
      mail_adres: acc.mail_adres,
      imapError: null,
      mappen: [],
    };

    if (!acc.mail_adres || !acc.mail_wachtwoord) {
      resultaat.imapError = "Geen mailadres of wachtwoord";
      resultaten.push(resultaat);
      continue;
    }

    const servers = getMailServers(acc.mail_adres);
    let wachtwoord: string;
    try {
      wachtwoord = decrypt(acc.mail_wachtwoord);
    } catch (e) {
      resultaat.imapError = `Decrypt-fout: ${(e as Error).message}`;
      resultaten.push(resultaat);
      continue;
    }

    const client = new ImapFlow({
      host: acc.imap_host ?? servers.imapHost,
      port: acc.imap_port ?? servers.imapPort,
      secure: true,
      auth: { user: acc.mail_adres, pass: wachtwoord },
      logger: false,
    });

    try {
      await client.connect();
      const bestaande = new Set<string>();
      const lijst = await client.list();
      for (const m of lijst) {
        bestaande.add(m.path);
        bestaande.add(m.name);
      }

      for (const naam of STANDAARD_MAPPEN) {
        if (bestaande.has(naam)) {
          resultaat.mappen.push({ naam, status: "bestond_al" });
          continue;
        }
        try {
          await client.mailboxCreate(naam);
          resultaat.mappen.push({ naam, status: "aangemaakt" });
        } catch (e) {
          const fout = (e as Error).message;
          const lower = fout.toLowerCase();
          if (lower.includes("already exists") || lower.includes("alreadyexists")) {
            resultaat.mappen.push({ naam, status: "bestond_al" });
          } else {
            resultaat.mappen.push({ naam, status: "fout", fout });
          }
        }
      }
    } catch (e) {
      resultaat.imapError = (e as Error).message;
    } finally {
      await client.logout().catch(() => {});
    }

    resultaten.push(resultaat);
  }

  return NextResponse.json({ ok: true, accounts: resultaten });
}
