import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { runCron } from "@/utils/cron-log";
import { syncMailsVoorAccount } from "@/utils/mail-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Mail-sync — draait elke 2 minuten.
 *
 * Loopt door alle ACTIEVE mail_accounts en haalt nieuwe IMAP-mails op.
 * Hierdoor zien users nieuwe mail in TopBar-badge ZONDER /inbox geopend te hebben.
 *
 * Limiet per account: 25 nieuwe mails per run (anders haalbaar binnen 60s
 * timeout met ~10 accounts).
 *
 * Authenticatie via CRON_SECRET — Vercel Cron stuurt 'Authorization: Bearer ...'.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await runCron("mail-sync", async () => {
    const admin = createAdminClient();

    // Alle actieve mail-accounts ophalen
    const { data: accounts, error } = await admin
      .from("mail_accounts")
      .select("id, mail_adres")
      .eq("mail_status", "actief");

    if (error) {
      console.error("[cron mail-sync] kon accounts niet ophalen:", error);
      return { gesynct: 0, fouten: 1 };
    }

    let gesynct = 0;
    let fouten = 0;

    // Sync parallel — maar in batches van 5 om Hostnet IMAP niet te overbelasten
    const accs = accounts ?? [];
    for (let i = 0; i < accs.length; i += 5) {
      const batch = accs.slice(i, i + 5);
      const resultaten = await Promise.allSettled(
        batch.map((acc) => syncMailsVoorAccount(acc.id, 25))
      );
      for (const r of resultaten) {
        if (r.status === "fulfilled") gesynct++;
        else {
          fouten++;
          console.error("[cron mail-sync] account-sync mislukt:", r.reason);
        }
      }
    }

    return { totaal_accounts: accs.length, gesynct, fouten };
  });

  return NextResponse.json(run);
}
