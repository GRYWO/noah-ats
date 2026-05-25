import { createAdminClient } from "@/utils/supabase/admin";

export type VoorstelEvent =
  | "voorstel_verstuurd"
  | "voorstel_geopend"
  | "reminder_verstuurd"
  | "voorstel_groen"
  | "voorstel_rood"
  | "kennismaking_gepland"
  | "kennismaking_reminder"
  | "plaatsing"
  | "plaatsing_ongedaan"
  | "afwijzing"
  | "verlopen";

export async function logVoorstelEvent(opts: {
  tenantId: string;
  voorstelId?: string | null;
  kandidaatId: string;
  event: VoorstelEvent;
  beschrijving: string;
  zichtbaarVoorKandidaat?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("voorstel_logs").insert({
    tenant_id: opts.tenantId,
    voorstel_id: opts.voorstelId ?? null,
    kandidaat_id: opts.kandidaatId,
    event_type: opts.event,
    beschrijving: opts.beschrijving,
    zichtbaar_voor_kandidaat: opts.zichtbaarVoorKandidaat ?? false,
    metadata: opts.metadata ?? null,
  });
}

/**
 * Werkdag-helper: telt aantal werkdagen (ma-vr) tussen 2 data, NL tijdzone.
 * 0 = zelfde werkdag, 1 = volgende werkdag, etc.
 */
export function werkdagenSinds(verzondenIso: string, nu: Date = new Date()): number {
  const start = new Date(verzondenIso);
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const eind = new Date(nu);
  eind.setHours(0, 0, 0, 0);

  while (cur < eind) {
    cur.setDate(cur.getDate() + 1);
    const dag = cur.getDay(); // 0=zo, 6=za
    if (dag !== 0 && dag !== 6) count++;
  }
  return count;
}

export function isWerkdag(d: Date = new Date()): boolean {
  const dag = d.getDay();
  return dag !== 0 && dag !== 6;
}
