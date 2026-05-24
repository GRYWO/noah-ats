import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendReminderMail, sendKennismakingReminder } from "@/utils/email";
import { logVoorstelEvent, werkdagenSinds, isWerkdag } from "@/utils/voorstel-log";

export async function GET(request: Request) {
  // Beveilig: alleen Vercel cron of met secret header
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");

  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected && secretParam !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nu = new Date();
  const isWeekend = !isWerkdag(nu);
  const uur = nu.getHours();

  const verstuurd: string[] = [];
  const verlopen: string[] = [];
  const kennismakingReminders: string[] = [];

  // ===== 1. KENNISMAKING-REMINDERS (1 uur vooraf) — elke dag =====
  // Zoek voorstellen met kennismaking_op binnen [nu+30min, nu+90min]
  const grensVan = new Date(nu.getTime() + 30 * 60 * 1000).toISOString();
  const grensTot = new Date(nu.getTime() + 90 * 60 * 1000).toISOString();
  const { data: aanstaand } = await admin
    .from("voorstellen")
    .select("id, tenant_id, kandidaat_id, kennismaking_op, bedrijf, contactpersoon, contact_telefoon, locatie_url, kandidaat:kandidaten(voornaam, email)")
    .eq("status", "uitnodigen")
    .is("kennismaking_reminder_sent", null)
    .not("kennismaking_op", "is", null)
    .gte("kennismaking_op", grensVan)
    .lte("kennismaking_op", grensTot);

  for (const v of aanstaand ?? []) {
    const k = v.kandidaat as unknown as { voornaam: string; email: string | null } | null;
    if (!k?.email) continue;
    try {
      await sendKennismakingReminder({
        naar: k.email,
        kandidaatVoornaam: k.voornaam,
        bedrijf: v.bedrijf ?? "de werkgever",
        contactpersoon: v.contactpersoon,
        contact_telefoon: v.contact_telefoon,
        locatie_url: v.locatie_url,
        kennismaking_op: v.kennismaking_op,
      });
      await admin.from("voorstellen")
        .update({ kennismaking_reminder_sent: new Date().toISOString() })
        .eq("id", v.id);
      if (v.tenant_id && v.kandidaat_id) {
        await logVoorstelEvent({
          tenantId: v.tenant_id,
          voorstelId: v.id,
          kandidaatId: v.kandidaat_id,
          event: "kennismaking_reminder",
          beschrijving: "Herinnering 1 uur voor kennismaking verstuurd",
          zichtbaarVoorKandidaat: true,
        });
      }
      kennismakingReminders.push(v.id);
    } catch (e) {
      console.error("Kennismaking-reminder mislukt:", e);
    }
  }

  // ===== 2. OPDRACHTGEVER-REMINDERS — alleen op werkdagen =====
  if (!isWeekend) {
    const { data: voorstellen } = await admin
      .from("voorstellen")
      .select("*, kandidaat:kandidaten(voornaam, achternaam)")
      .eq("status", "verzonden")
      .is("geopend_op", null); // alleen voor nog niet-geopende

    for (const v of voorstellen ?? []) {
      const werkdagen = werkdagenSinds(v.verzonden_op, nu);
      const kandidaatNaam = `${v.kandidaat?.voornaam ?? ""} ${v.kandidaat?.achternaam ?? ""}`.trim();

      // Werkdag 4+: verlopen
      if (werkdagen >= 4) {
        await admin.from("voorstellen")
          .update({ status: "verlopen", verlopen_op: new Date().toISOString() })
          .eq("id", v.id);
        if (v.tenant_id && v.kandidaat_id) {
          await logVoorstelEvent({
            tenantId: v.tenant_id,
            voorstelId: v.id,
            kandidaatId: v.kandidaat_id,
            event: "verlopen",
            beschrijving: "Voorstel verlopen (geen reactie binnen werkdagen)",
            zichtbaarVoorKandidaat: false,
          });
        }
        verlopen.push(v.id);
        continue;
      }

      // Bepaal welke reminder verstuurd moet worden
      let veld: "reminder_dag_1_sent" | "reminder_dag_2_sent" | "reminder_dag_3a_sent" | "reminder_dag_3b_sent" | null = null;
      let nr: 1 | 2 | 3 | 4 = 1;
      let laatsteDag = false;

      if (werkdagen === 1 && !v.reminder_dag_1_sent) {
        veld = "reminder_dag_1_sent"; nr = 1;
      } else if (werkdagen === 2 && !v.reminder_dag_2_sent) {
        veld = "reminder_dag_2_sent"; nr = 2;
      } else if (werkdagen === 3) {
        // Dag 3: 2x — ochtend (uur<12) + middag (uur>=12)
        if (uur < 12 && !v.reminder_dag_3a_sent) {
          veld = "reminder_dag_3a_sent"; nr = 3; laatsteDag = true;
        } else if (uur >= 12 && !v.reminder_dag_3b_sent) {
          veld = "reminder_dag_3b_sent"; nr = 4; laatsteDag = true;
        }
      }

      if (!veld) continue;

      try {
        await sendReminderMail({
          naar: v.opdrachtgever_email,
          opdrachtgeverNaam: v.opdrachtgever_naam,
          kandidaatNaam,
          token: v.token,
          reminderNr: nr,
          laatsteDag,
        });
        await admin.from("voorstellen").update({ [veld]: new Date().toISOString() }).eq("id", v.id);
        if (v.tenant_id && v.kandidaat_id) {
          await logVoorstelEvent({
            tenantId: v.tenant_id,
            voorstelId: v.id,
            kandidaatId: v.kandidaat_id,
            event: "reminder_verstuurd",
            beschrijving: `Reminder ${nr} naar opdrachtgever (werkdag ${werkdagen})`,
            zichtbaarVoorKandidaat: false,
          });
        }
        verstuurd.push(`${v.id} (dag${werkdagen}/${nr})`);
      } catch (e) {
        console.error("Reminder mislukt:", e);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    werkdag: !isWeekend,
    reminders_verstuurd: verstuurd,
    verlopen,
    kennismaking_reminders: kennismakingReminders,
    timestamp: nu.toISOString(),
  });
}
