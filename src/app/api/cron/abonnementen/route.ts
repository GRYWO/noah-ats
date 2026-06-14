import { NextResponse } from "next/server";
import { cronGeautoriseerd } from "@/utils/cron-auth";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";
import { runCron } from "@/utils/cron-log";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Noah ATS <noreply@noah-recruitment.nl>";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronGeautoriseerd(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await runCron("abonnementen", async () => {
    const admin = createAdminClient();
    const nu = Date.now();
    const resultaat = { reminders: 0, read_only: 0, geblokkeerd: 0, fouten: [] as string[] };

    // Achterstallige abonnementen vinden
    // Ook read_only-rijen meenemen: anders bereikt het dag-21-blok (dat een
    // read_only_sinds vereist) die rijen nooit en blijven wanbetalers eeuwig
    // read_only zonder ooit geblokkeerd te worden.
    const { data: achterstallig } = await admin
      .from("abonnementen")
      .select("id, tenant_id, status, huidige_periode_einde, laatste_reminder_op, read_only_sinds, geblokkeerd_sinds, tenant:tenants(naam)")
      .in("status", ["achterstallig", "read_only"]);

    for (const ab of achterstallig ?? []) {
      const tenant = Array.isArray(ab.tenant) ? ab.tenant[0] : ab.tenant;
      const dagenSindsEinde = ab.huidige_periode_einde
        ? Math.floor((nu - new Date(ab.huidige_periode_einde).getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      // Dag 14 → read-only
      if (dagenSindsEinde >= 14 && !ab.read_only_sinds) {
        await admin.from("abonnementen").update({
          status: "read_only",
          read_only_sinds: new Date().toISOString(),
        }).eq("id", ab.id);
        resultaat.read_only++;
        await stuurNotificatie(tenant?.naam ?? "Bureau", "read_only");
        continue;
      }

      // Dag 21 → geblokkeerd
      if (dagenSindsEinde >= 21 && ab.read_only_sinds && !ab.geblokkeerd_sinds) {
        await admin.from("abonnementen").update({
          status: "geblokkeerd",
          geblokkeerd_sinds: new Date().toISOString(),
        }).eq("id", ab.id);
        resultaat.geblokkeerd++;
        await stuurNotificatie(tenant?.naam ?? "Bureau", "geblokkeerd");
        continue;
      }

      // Dag 7 → reminder (eerste keer)
      if (dagenSindsEinde >= 7) {
        const laatsteReminder = ab.laatste_reminder_op ? new Date(ab.laatste_reminder_op).getTime() : 0;
        const dagenSindsReminder = (nu - laatsteReminder) / (24 * 60 * 60 * 1000);
        if (dagenSindsReminder >= 3) { // Reminder iedere 3 dagen
          await admin.from("abonnementen").update({
            laatste_reminder_op: new Date().toISOString(),
          }).eq("id", ab.id);
          resultaat.reminders++;
          // TODO: mail naar bureau-admin via tenant emails
        }
      }
    }

    return resultaat;
  });

  return NextResponse.json({ ok: run.ok, ...(run.resultaat ?? {}), fout: run.fout });
}

async function stuurNotificatie(bureau: string, type: "read_only" | "geblokkeerd") {
  // Stuur intern naar info@noah-recruitment.nl
  try {
    await resend.emails.send({
      from: FROM,
      to: "info@noah-recruitment.nl",
      subject: `⚠ Bureau ${bureau} status → ${type}`,
      html: `<p>Het abonnement van <b>${bureau}</b> is automatisch op status <b>${type}</b> gezet wegens 14/21 dagen wanbetaling.</p>
<p>Controleer in Stripe + bel het bureau om af te wikkelen.</p>`,
    });
  } catch (e) {
    console.error("notificatie mislukt:", e);
  }
}
