import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { parseCV } from "@/utils/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();

  if (profile?.rol === "setter") {
    return NextResponse.json({ error: "Alleen recruiters/admins" }, { status: 403 });
  }

  let body: { kandidaat_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }
  const kandidaatId = body.kandidaat_id;
  if (!kandidaatId) {
    return NextResponse.json({ error: "kandidaat_id ontbreekt" }, { status: 400 });
  }

  // Haal kandidaat + cv_url op
  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select("id, cv_url, tenant_id")
    .eq("id", kandidaatId)
    .single();

  if (!k?.cv_url) {
    return NextResponse.json({ error: "Kandidaat heeft geen CV geüpload" }, { status: 400 });
  }

  // Download CV uit Supabase Storage (public URL)
  const pdfRes = await fetch(k.cv_url);
  if (!pdfRes.ok) {
    return NextResponse.json({ error: "Kon CV niet downloaden" }, { status: 502 });
  }
  const buf = Buffer.from(await pdfRes.arrayBuffer());

  // Parse met Claude
  let parsed;
  try {
    parsed = await parseCV(buf);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  // Update kandidaat met geparsede velden (alleen vullen waar nu leeg)
  const update: Record<string, unknown> = {
    cv_geparseerd: parsed,
    cv_controle_status: "in_controle",
  };

  // AI-score automatisch overnemen als kandidaat-score (overschrijft altijd
  // zodat de score actueel is na elke CV-parse)
  if (typeof parsed.ai_score === "number") {
    update.score = Math.max(0, Math.min(100, Math.round(parsed.ai_score)));
  }

  // Optioneel: vul lege velden met AI-resultaten
  const { data: huidig } = await admin
    .from("kandidaten")
    .select("voornaam, achternaam, tussenvoegsel, email, telefoon, woonplaats, opleiding, open_voor, rijbewijs, eigen_vervoer")
    .eq("id", kandidaatId)
    .single();

  type Vd = string | boolean | null | undefined;
  const h = (huidig ?? {}) as Record<string, Vd>;
  const veld = (key: string, val: Vd) => {
    if (val == null || val === "") return;
    if (!h[key]) update[key] = val;
  };
  veld("voornaam", parsed.voornaam);
  veld("achternaam", parsed.achternaam);
  veld("tussenvoegsel", parsed.tussenvoegsel);
  veld("email", parsed.email);
  veld("telefoon", parsed.telefoon);
  veld("woonplaats", parsed.woonplaats);
  veld("opleiding", parsed.opleiding);
  veld("open_voor", parsed.open_voor);
  veld("rijbewijs", parsed.rijbewijs);
  veld("eigen_vervoer", parsed.eigen_vervoer);
  veld("soort_dienstverband", parsed.soort_dienstverband);
  veld("werving_of_uitzend", parsed.werving_of_uitzend);
  veld("salaris_indicatie", parsed.salaris_indicatie);
  if (typeof parsed.max_reisafstand_km === "number") {
    if (!h["max_reisafstand_km"]) update["max_reisafstand_km"] = parsed.max_reisafstand_km;
  }
  veld("blacklist_bedrijven", parsed.blacklist_bedrijven);
  veld("bijzonderheden", parsed.bijzonderheden);
  veld("tarief_ws", parsed.tarief_ws);
  veld("omrekenfactor_uitzendbasis", parsed.omrekenfactor_uitzendbasis);

  await admin.from("kandidaten").update(update).eq("id", kandidaatId);

  return NextResponse.json({ ok: true, parsed });
}
