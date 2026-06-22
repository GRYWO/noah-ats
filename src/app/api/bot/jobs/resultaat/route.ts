import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { botGeautoriseerd } from "@/utils/bot-auth";
import { maakRobinBellijst, type RobinKandidaat } from "@/utils/robin-bellijst";
import { rangschikKandidaten } from "@/utils/robin-ranking";

export const dynamic = "force-dynamic";

// De bot meldt het resultaat van een zoekopdracht terug. Voor 'robin' wordt een
// bellijst bij de vacature aangemaakt; bij een fout wordt de job op 'fout' gezet.
export async function POST(request: Request) {
  if (!botGeautoriseerd(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    jobId?: string;
    kandidaten?: RobinKandidaat[];
    vondsten?: { titel?: string; bedrijf?: string; plaats?: string; url?: string; telefoon?: string; datum?: string; jobdigger_url?: string; detail_tekst?: string }[];
    telefoon?: string;
    fout?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const jobId = (body.jobId ?? "").trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId vereist" }, { status: 400 });
  }

  const admin = createAdminClient();
  const nu = new Date().toISOString();

  const { data: job } = await admin
    .from("zoek_jobs")
    .select("id, type, zoekterm, vacature_id, tenant_id, aangemaakt_door, doel_item_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) {
    return NextResponse.json({ error: "Job niet gevonden" }, { status: 404 });
  }

  // Bot meldt een fout.
  if (body.fout) {
    await admin
      .from("zoek_jobs")
      .update({ status: "fout", fout: String(body.fout).slice(0, 500), klaar_at: nu, updated_at: nu })
      .eq("id", jobId);
    return NextResponse.json({ ok: true });
  }

  // Telefoon onthuld voor één kandidaat: het nummer bij de bellijst-kandidaat zetten.
  if (job.type === "robin_telefoon") {
    const telefoon = (body.telefoon ?? "").toString().trim().slice(0, 60);
    if (job.doel_item_id && telefoon) {
      await admin.from("bellijst_items").update({ telefoon }).eq("id", job.doel_item_id);
    }
    await admin
      .from("zoek_jobs")
      .update({ status: "klaar", resultaat: { telefoon: telefoon || null }, klaar_at: nu, updated_at: nu })
      .eq("id", jobId);
    return NextResponse.json({ ok: true, telefoon: telefoon || null });
  }

  const kandidaten = Array.isArray(body.kandidaten) ? body.kandidaten : [];

  if (job.type === "robin") {
    if (!job.vacature_id || !job.tenant_id) {
      await admin
        .from("zoek_jobs")
        .update({ status: "fout", fout: "Job mist vacature_id of tenant_id", klaar_at: nu, updated_at: nu })
        .eq("id", jobId);
      return NextResponse.json({ error: "Job mist vacature_id of tenant_id" }, { status: 400 });
    }

    try {
      const { data: vac } = await admin
        .from("rec_vacatures")
        .select("titel, taken, eisen, locatie")
        .eq("id", job.vacature_id)
        .maybeSingle();

      // AI zet de best passende kandidaten bovenaan.
      const gerangschikt = await rangschikKandidaten(
        {
          titel: vac?.titel ?? job.zoekterm,
          taken: vac?.taken ?? null,
          eisen: vac?.eisen ?? null,
          plaats: vac?.locatie ?? null,
        },
        kandidaten,
      );

      const res = await maakRobinBellijst(admin, {
        tenantId: job.tenant_id,
        vacatureId: job.vacature_id,
        functie: job.zoekterm,
        vacatureTitel: vac?.titel,
        setterId: job.aangemaakt_door ?? null,
        kandidaten: gerangschikt,
      });

      await admin
        .from("zoek_jobs")
        .update({
          status: "klaar",
          resultaat: { bellijst_id: res.bellijstId, aantal: res.aantal },
          klaar_at: nu,
          updated_at: nu,
        })
        .eq("id", jobId);

      return NextResponse.json({ ok: true, bellijst_id: res.bellijstId, aantal: res.aantal });
    } catch (e) {
      const msg = (e as Error).message;
      await admin
        .from("zoek_jobs")
        .update({ status: "fout", fout: msg.slice(0, 500), klaar_at: nu, updated_at: nu })
        .eq("id", jobId);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // 'jobdigger': de gevonden vacatures opslaan als vondsten.
  if (!job.tenant_id) {
    await admin
      .from("zoek_jobs")
      .update({ status: "fout", fout: "Job mist tenant_id", klaar_at: nu, updated_at: nu })
      .eq("id", jobId);
    return NextResponse.json({ error: "Job mist tenant_id" }, { status: 400 });
  }

  const vondsten = Array.isArray(body.vondsten) ? body.vondsten : [];
  if (vondsten.length > 0) {
    // Bestaande vondsten van deze lijst eerst weg, zodat een (her)zoek of een
    // "50 meer" de lijst netjes vervangt i.p.v. dubbele rijen te maken.
    await admin.from("jobdigger_vondsten").delete().eq("job_id", jobId);

    const rows = vondsten.slice(0, 200).map((v) => ({
      job_id: jobId,
      tenant_id: job.tenant_id,
      titel: (v.titel ?? "").toString().trim().slice(0, 300) || null,
      bedrijf: (v.bedrijf ?? "").toString().trim().slice(0, 300) || null,
      plaats: (v.plaats ?? "").toString().trim().slice(0, 200) || null,
      url: (v.url ?? "").toString().trim().slice(0, 500) || null,
      telefoon: (v.telefoon ?? "").toString().trim().slice(0, 60) || null,
      datum: (v.datum ?? "").toString().trim().slice(0, 60) || null,
      jobdigger_url: (v.jobdigger_url ?? "").toString().trim().slice(0, 500) || null,
      detail_tekst: (v.detail_tekst ?? "").toString().trim().slice(0, 6000) || null,
      raw_data: v,
    }));
    const { error: vErr } = await admin.from("jobdigger_vondsten").insert(rows);
    if (vErr) {
      await admin
        .from("zoek_jobs")
        .update({ status: "fout", fout: vErr.message.slice(0, 500), klaar_at: nu, updated_at: nu })
        .eq("id", jobId);
      return NextResponse.json({ error: vErr.message }, { status: 500 });
    }
  }

  await admin
    .from("zoek_jobs")
    .update({
      status: "klaar",
      resultaat: { aantal: vondsten.length },
      klaar_at: nu,
      updated_at: nu,
    })
    .eq("id", jobId);

  return NextResponse.json({ ok: true, aantal: vondsten.length });
}
