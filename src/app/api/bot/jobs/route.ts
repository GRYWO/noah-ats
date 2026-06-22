import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { botGeautoriseerd } from "@/utils/bot-auth";

export const dynamic = "force-dynamic";

// De bot pollt dit endpoint en claimt de oudste openstaande zoekopdracht.
export async function GET(request: Request) {
  if (!botGeautoriseerd(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: job } = await admin
    .from("zoek_jobs")
    .select("id, type, zoekterm, vacature_id, tenant_id, limiet, straal_km, plaats, lat, lon, doel_item_id, doel_naam")
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ job: null });
  }

  // Claim: zet op 'bezig'. De status-check voorkomt dubbel oppakken.
  const nu = new Date().toISOString();
  const { data: geclaimd } = await admin
    .from("zoek_jobs")
    .update({ status: "bezig", gestart_at: nu, updated_at: nu })
    .eq("id", job.id)
    .eq("status", "open")
    .select("id")
    .maybeSingle();

  if (!geclaimd) {
    // Net door iemand anders geclaimd; bot probeert het bij de volgende poll.
    return NextResponse.json({ job: null });
  }

  return NextResponse.json({ job });
}
