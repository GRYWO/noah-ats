import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendReminderMail } from "@/utils/email";

const HOUR = 60 * 60 * 1000;

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
  const now = Date.now();

  // Haal alle openstaande voorstellen
  const { data: voorstellen, error } = await admin
    .from("voorstellen")
    .select("*, kandidaat:kandidaten(voornaam, achternaam)")
    .eq("status", "verzonden");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const verstuurd: string[] = [];
  const verlopen: string[] = [];

  for (const v of voorstellen ?? []) {
    const verzondenTime = new Date(v.verzonden_op).getTime();
    const urenOud = (now - verzondenTime) / HOUR;
    const kandidaatNaam = `${v.kandidaat.voornaam} ${v.kandidaat.achternaam}`;

    // Verlopen na 96 uur (4 dagen)
    if (urenOud >= 96) {
      await admin
        .from("voorstellen")
        .update({ status: "verlopen", verlopen_op: new Date().toISOString() })
        .eq("id", v.id);
      verlopen.push(v.id);
      continue;
    }

    // Reminder 4: laatste dag middag (77h+)
    if (urenOud >= 77 && !v.reminder_4_sent) {
      await sendReminderMail({
        naar: v.opdrachtgever_email,
        opdrachtgeverNaam: v.opdrachtgever_naam,
        kandidaatNaam,
        token: v.token,
        reminderNr: 4,
        laatsteDag: true,
      });
      await admin.from("voorstellen").update({ reminder_4_sent: new Date().toISOString() }).eq("id", v.id);
      verstuurd.push(`${v.id} (r4)`);
      continue;
    }

    // Reminder 3: laatste dag ochtend (72h+)
    if (urenOud >= 72 && !v.reminder_3_sent) {
      await sendReminderMail({
        naar: v.opdrachtgever_email,
        opdrachtgeverNaam: v.opdrachtgever_naam,
        kandidaatNaam,
        token: v.token,
        reminderNr: 3,
        laatsteDag: true,
      });
      await admin.from("voorstellen").update({ reminder_3_sent: new Date().toISOString() }).eq("id", v.id);
      verstuurd.push(`${v.id} (r3)`);
      continue;
    }

    // Reminder 2: 48h
    if (urenOud >= 48 && !v.reminder_2_sent) {
      await sendReminderMail({
        naar: v.opdrachtgever_email,
        opdrachtgeverNaam: v.opdrachtgever_naam,
        kandidaatNaam,
        token: v.token,
        reminderNr: 2,
        laatsteDag: false,
      });
      await admin.from("voorstellen").update({ reminder_2_sent: new Date().toISOString() }).eq("id", v.id);
      verstuurd.push(`${v.id} (r2)`);
      continue;
    }

    // Reminder 1: 24h
    if (urenOud >= 24 && !v.reminder_1_sent) {
      await sendReminderMail({
        naar: v.opdrachtgever_email,
        opdrachtgeverNaam: v.opdrachtgever_naam,
        kandidaatNaam,
        token: v.token,
        reminderNr: 1,
        laatsteDag: false,
      });
      await admin.from("voorstellen").update({ reminder_1_sent: new Date().toISOString() }).eq("id", v.id);
      verstuurd.push(`${v.id} (r1)`);
      continue;
    }
  }

  return NextResponse.json({
    ok: true,
    voorstellen_gecheckt: voorstellen?.length ?? 0,
    reminders_verstuurd: verstuurd,
    verlopen,
    timestamp: new Date().toISOString(),
  });
}
