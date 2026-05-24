import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { parseJobdiggerExcel } from "@/utils/jobdigger-parser";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) {
    return NextResponse.json({ error: "Geen tenant" }, { status: 400 });
  }

  const formData = await request.formData();
  const kandidaatId = formData.get("kandidaat_id") as string;
  const file = formData.get("file") as File;
  const naamInput = (formData.get("naam") as string)?.trim();

  if (!kandidaatId || !file) {
    return NextResponse.json({ error: "kandidaat_id en file vereist" }, { status: 400 });
  }

  let parsed;
  try {
    const buf = await file.arrayBuffer();
    parsed = parseJobdiggerExcel(buf);
  } catch (e) {
    return NextResponse.json({ error: "Excel parse error: " + (e as Error).message }, { status: 400 });
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json({ error: "Geen geldige rijen" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: bellijst, error: bErr } = await admin.from("bellijsten").insert({
    tenant_id: profile.tenant_id,
    kandidaat_id: kandidaatId,
    setter_id: user.id,
    naam: naamInput || parsed.naam || file.name.replace(/\.(xlsx?|csv)$/i, ""),
    aantal_items: parsed.rows.length,
    bron: "jobdigger",
  }).select("id").single();

  if (bErr || !bellijst) {
    return NextResponse.json({ error: bErr?.message ?? "Insert mislukt" }, { status: 500 });
  }

  const items = parsed.rows.map((r, idx) => ({
    bellijst_id: bellijst.id,
    tenant_id: profile.tenant_id,
    functie: r.functie ?? null,
    bedrijf: r.bedrijf ?? null,
    plaats: r.plaats ?? null,
    postcode: r.postcode ?? null,
    telefoon: r.telefoon ?? null,
    website: r.website ?? null,
    branche: r.branche ?? null,
    raw_data: r.raw_data ?? null,
    volgorde: idx,
  }));

  for (let i = 0; i < items.length; i += 100) {
    await admin.from("bellijst_items").insert(items.slice(i, i + 100));
  }

  return NextResponse.json({ ok: true, bellijst_id: bellijst.id, aantal: parsed.rows.length });
}
