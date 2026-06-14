import { NextResponse } from "next/server";
import { cronGeautoriseerd } from "@/utils/cron-auth";
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
  if (!cronGeautoriseerd(req)) {
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
      // fouten als ARRAY zodat runCron de run als 'gedeeltelijk' markeert.
      return { gesynct: 0, fouten: [`accounts ophalen mislukt: ${error.message}`] };
    }

    let gesynct = 0;
    const fouten: string[] = [];

    // Sync parallel — maar in batches van 5 om Hostnet IMAP niet te overbelasten
    const accs = accounts ?? [];
    for (let i = 0; i < accs.length; i += 5) {
      const batch = accs.slice(i, i + 5);
      const resultaten = await Promise.allSettled(
        batch.map((acc) => syncMailsVoorAccount(acc.id, 25))
      );
      resultaten.forEach((r, idx) => {
        if (r.status === "fulfilled") {
          gesynct++;
        } else {
          const adres = batch[idx]?.mail_adres ?? "onbekend";
          fouten.push(`${adres}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
          console.error(`[cron mail-sync] account-sync mislukt (${adres}):`, r.reason);
        }
      });
    }

    return { totaal_accounts: accs.length, gesynct, fouten };
  });

  return NextResponse.json(run);
}
