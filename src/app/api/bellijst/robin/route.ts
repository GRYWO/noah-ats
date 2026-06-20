import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

type RobinKandidaat = { naam?: string; url?: string; telefoon?: string };

// Ontvangt de door content-robin.js gescrapete kandidaten (via de extensie)
// en slaat ze op als bellijst die aan de vacature gekoppeld is.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) {
    return NextResponse.json({ error: "Geen tenant" }, { status: 400 });
  }

  let body: { vacatureId?: string; functie?: string; kandidaten?: RobinKandidaat[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const vacatureId = (body.vacatureId ?? "").trim();
  const functie = (body.functie ?? "").trim();
  const kandidaten = Array.isArray(body.kandidaten) ? body.kandidaten : [];
  if (!vacatureId || kandidaten.length === 0) {
    return NextResponse.json({ error: "vacatureId en kandidaten vereist" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Vacature moet bestaan; eigenaar = gebruiker, of gebruiker is admin.
  const rol = (profile.rol ?? "").toString().toLowerCase();
  const isAdmin = rol === "admin" || rol === "super-admin" || rol === "super_admin";
  const { data: vac } = await admin
    .from("rec_vacatures")
    .select("id, titel, eigenaar")
    .eq("id", vacatureId)
    .maybeSingle();
  if (!vac) {
    return NextResponse.json({ error: "Vacature niet gevonden" }, { status: 404 });
  }
  if (!isAdmin && vac.eigenaar !== user.id) {
    return NextResponse.json({ error: "Geen toegang tot deze vacature" }, { status: 403 });
  }

  const { data: bellijst, error: bErr } = await admin
    .from("bellijsten")
    .insert({
      tenant_id: profile.tenant_id,
      vacature_id: vacatureId,
      setter_id: user.id,
      naam: `Robin: ${functie || vac.titel}`,
      aantal_items: kandidaten.length,
      bron: "robin",
    })
    .select("id")
    .single();

  if (bErr || !bellijst) {
    return NextResponse.json({ error: bErr?.message ?? "Insert mislukt" }, { status: 500 });
  }

  const items = kandidaten.slice(0, 200).map((k, idx) => ({
    bellijst_id: bellijst.id,
    tenant_id: profile.tenant_id,
    naam: (k.naam ?? "").toString().trim().slice(0, 200) || null,
    telefoon: (k.telefoon ?? "").toString().trim().slice(0, 60) || null,
    website: (k.url ?? "").toString().trim().slice(0, 500) || null,
    raw_data: k,
    volgorde: idx,
  }));

  const { error: iErr } = await admin.from("bellijst_items").insert(items);
  if (iErr) {
    return NextResponse.json({ error: iErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bellijst_id: bellijst.id, aantal: items.length });
}
