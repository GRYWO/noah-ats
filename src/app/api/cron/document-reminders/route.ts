import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";
import { runCron } from "@/utils/cron-log";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Noah ATS <noreply@noah-recruitment.nl>";

export const dynamic = "force-dynamic";

function appUrl() {
  const env = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (env && !env.includes("localhost")) return env.replace(/\/$/, "");
  return "https://www.noah-ats.nl";
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await runCron("document-reminders", async () => {
    const admin = createAdminClient();
    const nu = new Date();
    const dagGeleden = new Date(nu.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const resultaat = { reminders_verstuurd: 0, vervallen_gemarkeerd: 0, fouten: [] as string[] };

    // 1) Documenten markeren als vervallen
    try {
      const { data } = await admin
        .from("document_envelopes")
        .update({ status: "vervallen" })
        .lt("vervalt_op", nu.toISOString())
        .in("status", ["verzonden", "deels_getekend"])
        .select("id");
      resultaat.vervallen_gemarkeerd = data?.length ?? 0;
    } catch (e) {
      resultaat.fouten.push("vervallen: " + (e as Error).message);
    }

    // 2) Reminders sturen (1× per dag per wachtende ondertekenaar)
    try {
      const { data: ondertekenaars } = await admin
        .from("document_ondertekenaars")
        .select(`
          id, token, voornaam, email, laatste_reminder_op, aantal_reminders,
          envelope:document_envelopes(id, titel, beschrijving, status)
        `)
        .eq("status", "wachtend");

      for (const o of ondertekenaars ?? []) {
        const env = Array.isArray(o.envelope) ? o.envelope[0] : o.envelope;
        if (!env || env.status === "voltooid" || env.status === "vervallen" || env.status === "ingetrokken") continue;

        // Skip als al binnen 23u een reminder is gestuurd
        if (o.laatste_reminder_op && new Date(o.laatste_reminder_op).getTime() > nu.getTime() - 23 * 60 * 60 * 1000) {
          continue;
        }

        const url = `${appUrl()}/teken/${o.token}`;
        try {
          await resend.emails.send({
            from: FROM,
            to: o.email,
            subject: `🔔 Herinnering: ${env.titel}`,
            html: `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#333399;margin:0 0 16px 0;">🔔 Vergeet je niet te tekenen?</h2>
  <p style="margin:0 0 12px 0;">Hallo ${o.voornaam},</p>
  <p style="margin:0 0 16px 0;">Je hebt nog niet ondertekend:</p>
  <div style="background:#f9f9fb;border-left:4px solid #333399;padding:14px;margin:16px 0;border-radius:6px;">
    <div style="font-weight:700;color:#333;">${env.titel}</div>
  </div>
  <div style="margin:24px 0;text-align:center;">
    <a href="${url}" style="display:inline-block;background-color:#333399;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:14px;">
      Document openen & ondertekenen
    </a>
  </div>
  <p style="font-size:11px;color:#888;text-align:center;margin:8px 0;">
    Reminder #${(o.aantal_reminders ?? 0) + 1}
  </p>
</div>`,
          });
          await admin.from("document_ondertekenaars").update({
            laatste_reminder_op: nu.toISOString(),
            aantal_reminders: (o.aantal_reminders ?? 0) + 1,
          }).eq("id", o.id);
          resultaat.reminders_verstuurd++;
        } catch (e) {
          resultaat.fouten.push("reminder " + o.email + ": " + (e as Error).message);
        }
      }
    } catch (e) {
      resultaat.fouten.push("ondertekenaars-loop: " + (e as Error).message);
    }

    void dagGeleden;
    return resultaat;
  });

  return NextResponse.json({ ok: run.ok, ...(run.resultaat ?? {}), fout: run.fout });
}
