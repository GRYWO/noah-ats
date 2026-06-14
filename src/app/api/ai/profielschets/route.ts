import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { genereerProfielschets } from "@/utils/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("rol, tenant_id").eq("id", user.id).single();
  if (profile?.rol === "setter") {
    return NextResponse.json({ error: "Alleen recruiters/admins" }, { status: 403 });
  }

  let body: { kandidaat_id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ongeldige body" }, { status: 400 }); }
  const id = body.kandidaat_id;
  if (!id) return NextResponse.json({ error: "kandidaat_id ontbreekt" }, { status: 400 });

  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select("voornaam, achternaam, leeftijd, woonplaats, opleiding, open_voor, notitie, max_reisafstand_km, cv_geparseerd, tenant_id")
    .eq("id", id)
    .single();

  // TENANT-CHECK: alleen een kandidaat van de eigen tenant (geen cross-tenant PII naar AI).
  if (!k || k.tenant_id !== profile?.tenant_id) {
    return NextResponse.json({ error: "Geen toegang tot deze kandidaat" }, { status: 403 });
  }

  const cv = (k.cv_geparseerd ?? {}) as { werkervaring?: string; vaardigheden?: string };
  let schets: string;
  try {
    schets = await genereerProfielschets({
      voornaam: k.voornaam,
      achternaam: k.achternaam,
      leeftijd: k.leeftijd,
      woonplaats: k.woonplaats,
      opleiding: k.opleiding,
      open_voor: k.open_voor,
      werkervaring: cv.werkervaring,
      vaardigheden: cv.vaardigheden,
      notitie: k.notitie,
      max_reisafstand_km: k.max_reisafstand_km,
    });
  } catch (e) {
    console.error("[profielschets] generatie mislukt:", e);
    return NextResponse.json({ error: "Profielschets kon niet gegenereerd worden. Probeer het later opnieuw." }, { status: 500 });
  }

  await admin.from("kandidaten").update({ profielschets: schets }).eq("id", id);

  return NextResponse.json({ ok: true, profielschets: schets });
}
