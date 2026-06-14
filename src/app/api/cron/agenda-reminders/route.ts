import { NextResponse } from "next/server";
import { cronGeautoriseerd } from "@/utils/cron-auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { maakNotificatie } from "@/utils/notificaties";
import { runCron } from "@/utils/cron-log";

export const dynamic = "force-dynamic";

/**
 * Agenda-reminders: 30 minuten voor elke afspraak een in-app notificatie
 * naar de betrokken users. Wordt elke ~5-15 min aangeroepen via cron.
 *
 * Bronnen:
 *  - voorstellen.kennismaking_op  -> 1e gesprek (setter + admin)
 *  - voorstellen.tweede_gesprek_op -> 2e gesprek (setter + admin)
 *  - plaatsingen.startdatum (08:00) -> eerste werkdag (aangemelder + admin)
 *  - agenda_events.start_op       -> team-events (alle tenant-leden)
 *
 * Deduplicatie via *_reminder_sent timestamps.
 */
export async function GET(request: Request) {
  if (!cronGeautoriseerd(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await runCron("agenda-reminders", async () => {
  const admin = createAdminClient();
  const nu = new Date();
  // Venster: nu .. nu+35min. Wat al voorbij is filteren we client-side.
  const grensVan = new Date(nu.getTime() + 25 * 60 * 1000).toISOString();
  const grensTot = new Date(nu.getTime() + 35 * 60 * 1000).toISOString();

  const verstuurd: string[] = [];

  // ---------- 1e gesprek ----------
  const { data: gespr1 } = await admin
    .from("voorstellen")
    .select("id, tenant_id, kandidaat_id, setter_id, bedrijf, kennismaking_op, kandidaat:kandidaten(voornaam, achternaam, eigenaar_id, cv_controle_door)")
    .not("kennismaking_op", "is", null)
    .is("reminder_1e_gesprek_sent", null)
    .gte("kennismaking_op", grensVan)
    .lte("kennismaking_op", grensTot);

  for (const v of gespr1 ?? []) {
    const k = Array.isArray(v.kandidaat) ? v.kandidaat[0] : v.kandidaat;
    const naam = `${k?.voornaam ?? ""} ${k?.achternaam ?? ""}`.trim();
    const ontvangers = new Set<string>();
    if (v.setter_id) ontvangers.add(v.setter_id);
    if (k?.eigenaar_id) ontvangers.add(k.eigenaar_id);
    if (k?.cv_controle_door) ontvangers.add(k.cv_controle_door);
    // Admins van de tenant
    const { data: admins } = await admin.from("profiles").select("id").eq("tenant_id", v.tenant_id).eq("rol", "admin");
    (admins ?? []).forEach(a => ontvangers.add(a.id));

    for (const userId of ontvangers) {
      await maakNotificatie({
        tenantId: v.tenant_id,
        userId,
        type: "kennismaking_gepland",
        titel: `Over 30 min: 1e gesprek ${naam}`,
        bericht: `Bij ${v.bedrijf ?? "klant"} om ${new Date(v.kennismaking_op).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}.`,
        linkUrl: `/kandidaten/${v.kandidaat_id}`,
        kandidaatId: v.kandidaat_id,
      });
    }
    await admin.from("voorstellen").update({ reminder_1e_gesprek_sent: nu.toISOString() }).eq("id", v.id);
    verstuurd.push(`1e:${v.id}`);
  }

  // ---------- 2e gesprek ----------
  const { data: gespr2 } = await admin
    .from("voorstellen")
    .select("id, tenant_id, kandidaat_id, setter_id, bedrijf, tweede_gesprek_op, kandidaat:kandidaten(voornaam, achternaam, eigenaar_id, cv_controle_door)")
    .not("tweede_gesprek_op", "is", null)
    .is("reminder_2e_gesprek_sent", null)
    .gte("tweede_gesprek_op", grensVan)
    .lte("tweede_gesprek_op", grensTot);

  for (const v of gespr2 ?? []) {
    const k = Array.isArray(v.kandidaat) ? v.kandidaat[0] : v.kandidaat;
    const naam = `${k?.voornaam ?? ""} ${k?.achternaam ?? ""}`.trim();
    const ontvangers = new Set<string>();
    if (v.setter_id) ontvangers.add(v.setter_id);
    if (k?.eigenaar_id) ontvangers.add(k.eigenaar_id);
    if (k?.cv_controle_door) ontvangers.add(k.cv_controle_door);
    const { data: admins } = await admin.from("profiles").select("id").eq("tenant_id", v.tenant_id).eq("rol", "admin");
    (admins ?? []).forEach(a => ontvangers.add(a.id));

    for (const userId of ontvangers) {
      await maakNotificatie({
        tenantId: v.tenant_id,
        userId,
        type: "kennismaking_gepland",
        titel: `Over 30 min: 2e gesprek ${naam}`,
        bericht: `Bij ${v.bedrijf ?? "klant"} om ${new Date(v.tweede_gesprek_op).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}.`,
        linkUrl: `/kandidaten/${v.kandidaat_id}`,
        kandidaatId: v.kandidaat_id,
      });
    }
    await admin.from("voorstellen").update({ reminder_2e_gesprek_sent: nu.toISOString() }).eq("id", v.id);
    verstuurd.push(`2e:${v.id}`);
  }

  // ---------- Team-events ----------
  const { data: events } = await admin
    .from("agenda_events")
    .select("id, tenant_id, titel, start_op, meet_url, locatie")
    .is("reminder_sent", null)
    .gte("start_op", grensVan)
    .lte("start_op", grensTot);

  for (const e of events ?? []) {
    const { data: leden } = await admin
      .from("profiles")
      .select("id")
      .eq("tenant_id", e.tenant_id)
      .in("rol", ["admin", "recruiter", "setter"])
      .eq("is_active", true);
    for (const lid of leden ?? []) {
      await maakNotificatie({
        tenantId: e.tenant_id,
        userId: lid.id,
        type: "info",
        titel: `Over 30 min: ${e.titel}`,
        bericht: e.meet_url ? `Google Meet: ${e.meet_url}` : (e.locatie ?? null),
        linkUrl: "/agenda",
      });
    }
    await admin.from("agenda_events").update({ reminder_sent: nu.toISOString() }).eq("id", e.id);
    verstuurd.push(`team:${e.id}`);
  }

  return { verstuurd };
  });
  return NextResponse.json({ ok: run.ok, ...(run.resultaat ?? {}), fout: run.fout });
}
