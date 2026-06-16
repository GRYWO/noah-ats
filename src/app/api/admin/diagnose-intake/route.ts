import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";

/**
 * Diagnoseer de intake-spiegel-flow tussen noah-recruitment (rec_kandidaten)
 * en noah-ats (kandidaten). Geeft per laatste 30 dagen:
 *  - hoeveel rec_kandidaten zijn aangemaakt (stage=intake of beschikbaar)
 *  - hoeveel kandidaten in noah-ats hebben kanban_stap='website' (mirror)
 *  - welke emails wel in rec_kandidaten maar niet in kandidaten staan
 *  - de hardcoded ATS_TENANT_ID die noah-recruitment gebruikt versus het
 *    aantal kandidaten dat onder die tenant_id staat
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  const admin = createAdminClient();
  const sindsIso = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString();

  const ATS_TENANT_ID = "ab2b55d9-5208-43e7-8d9c-e42d49bedecb";

  const { data: recKandidaten, error: recErr } = await admin
    .from("rec_kandidaten")
    .select("id, naam, email, stage, aangemaakt")
    .gte("aangemaakt", sindsIso)
    .order("aangemaakt", { ascending: false });

  const { data: atsKandidaten } = await admin
    .from("kandidaten")
    .select("id, voornaam, achternaam, email, kanban_stap, tenant_id, created_at")
    .gte("created_at", sindsIso)
    .order("created_at", { ascending: false });

  const recEmails = new Set(
    (recKandidaten ?? [])
      .map((r) => (r as { email: string | null }).email?.toLowerCase().trim())
      .filter(Boolean) as string[],
  );
  const atsEmails = new Set(
    (atsKandidaten ?? [])
      .map((r) => (r as { email: string | null }).email?.toLowerCase().trim())
      .filter(Boolean) as string[],
  );

  const ontbreektInAts: Array<{ email: string; naam: string | null; aangemaakt: string | null }> = [];
  for (const r of recKandidaten ?? []) {
    const row = r as { email: string | null; naam: string | null; aangemaakt: string | null };
    const email = row.email?.toLowerCase().trim();
    if (email && !atsEmails.has(email)) {
      ontbreektInAts.push({ email, naam: row.naam, aangemaakt: row.aangemaakt });
    }
  }

  // Hoeveel kandidaten staan onder de hardcoded tenant_id?
  const { count: kandidatenInTenant } = await admin
    .from("kandidaten")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ATS_TENANT_ID);

  // Welke tenant_id's bestaan er eigenlijk in noah-ats?
  const { data: tenants } = await admin
    .from("tenants")
    .select("id, naam");

  // Voor wie deze 7 zijn: namen + email + kanban_stap zodat we kunnen zien
  // of het oude intake-doorzetters zijn of handmatige toevoegingen.
  const atsList = (atsKandidaten ?? []).slice(0, 25).map((k) => {
    const row = k as { voornaam: string | null; achternaam: string | null; email: string | null; kanban_stap: string | null; created_at: string };
    return {
      naam: `${row.voornaam ?? ""} ${row.achternaam ?? ""}`.trim() || "(zonder naam)",
      email: row.email,
      kanban_stap: row.kanban_stap,
      created_at: row.created_at,
    };
  });

  // Tellen zonder enige datum-filter zodat we ook archief zien.
  const { count: recKandidatenTotaal } = await admin
    .from("rec_kandidaten")
    .select("id", { count: "exact", head: true });
  const { count: kandidatenTotaal } = await admin
    .from("kandidaten")
    .select("id", { count: "exact", head: true });

  // Sollicitaties + storage-files - misschien staan intakes daar
  const { count: recSollicitaties } = await admin
    .from("rec_sollicitaties")
    .select("id", { count: "exact", head: true });
  const { count: recVacatures } = await admin
    .from("rec_vacatures")
    .select("id", { count: "exact", head: true });
  let recProfielen: number | string = "tabel niet gevonden";
  try {
    const { count } = await admin
      .from("rec_profielen")
      .select("id", { count: "exact", head: true });
    if (typeof count === "number") recProfielen = count;
  } catch {
    // tabel kan ontbreken in deze Supabase
  }

  const { data: storageFiles } = await admin.storage
    .from("rec-cvs")
    .list("intake", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  // rec_profielen content (mogelijk een aparte intake-route)
  let recProfielenInhoud: unknown[] = [];
  try {
    const { data } = await admin.from("rec_profielen").select("*").limit(10);
    recProfielenInhoud = data ?? [];
  } catch {
    // tabel ontbreekt
  }

  return NextResponse.json({
    atsTenantIdGebruiktDoorMirror: ATS_TENANT_ID,
    recSollicitaties: recSollicitaties ?? 0,
    recVacatures: recVacatures ?? 0,
    recProfielen,
    recProfielenInhoud,
    storageCvFiles: storageFiles?.length ?? 0,
    laatsteCvFiles: storageFiles?.slice(0, 20).map((f) => ({ naam: f.name, gemaakt: f.created_at })),
    recKandidatenTotaal: recKandidatenTotaal ?? 0,
    kandidatenTotaal: kandidatenTotaal ?? 0,
    atsList,
    kandidatenInDeze_tenant: kandidatenInTenant ?? 0,
    tenants,
    recKandidaten30d: recKandidaten?.length ?? 0,
    atsKandidaten30d: atsKandidaten?.length ?? 0,
    recErr: recErr?.message ?? null,
    aantalInBeide: [...recEmails].filter((e) => atsEmails.has(e)).length,
    ontbreektInAts: ontbreektInAts.slice(0, 30),
    voorbeeldKanbanStappen: [...new Set((atsKandidaten ?? []).map((k) => (k as { kanban_stap: string | null }).kanban_stap))],
  });
}
