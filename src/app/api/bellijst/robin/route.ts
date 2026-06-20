import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { maakRobinBellijst, type RobinKandidaat } from "@/utils/robin-bellijst";

export const dynamic = "force-dynamic";

// Door een ingelogde gebruiker (extensie/handmatig) aangeleverde Robin-kandidaten
// opslaan als bellijst bij de vacature. De bot gebruikt /api/bot/jobs/resultaat.
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

  try {
    const res = await maakRobinBellijst(admin, {
      tenantId: profile.tenant_id,
      vacatureId,
      functie,
      vacatureTitel: vac.titel,
      setterId: user.id,
      kandidaten,
    });
    return NextResponse.json({ ok: true, bellijst_id: res.bellijstId, aantal: res.aantal });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
