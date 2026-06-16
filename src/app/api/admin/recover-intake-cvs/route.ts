import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ATS_TENANT_ID = "ab2b55d9-5208-43e7-8d9c-e42d49bedecb";

/**
 * Recover CV-uploads waar de noah-recruitment intake-flow tussen CV-upload
 * en /api/intake/finish vast is gelopen. Voor elke CV in storage rec-cvs/intake
 * die nog GEEN matching rec_kandidaten of kandidaten (op cv_pad) heeft:
 *  - parse naam uit bestandsnaam
 *  - maak een minimal kandidaten-rij in noah-ats met kanban_stap 'website'
 *  - bewaar de signed URL naar de CV in de notitie
 * Geen records in rec_kandidaten - we doen alleen de noah-ats kant (daar wil
 * Wouter ze ook zien). De originele bot-antwoorden zijn verloren.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  const admin = createAdminClient();

  // 1) Alle CV's in de intake-folder
  const { data: storage, error: storageErr } = await admin.storage
    .from("rec-cvs")
    .list("intake", { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  if (storageErr || !storage) {
    return NextResponse.json({ error: storageErr?.message ?? "Storage list mislukt" }, { status: 500 });
  }

  // 2) Bestaande kandidaten ophalen voor dedup op naam (we hebben geen cv_pad)
  const { data: bestaandeKand } = await admin
    .from("kandidaten")
    .select("voornaam, achternaam, notitie")
    .eq("tenant_id", ATS_TENANT_ID);
  const bestaandeNamen = new Set(
    (bestaandeKand ?? []).map((k) => {
      const row = k as { voornaam: string | null; achternaam: string | null };
      return `${row.voornaam ?? ""} ${row.achternaam ?? ""}`.trim().toLowerCase();
    }),
  );

  const aangemaakt: Array<{ naam: string; cvUrl: string; kandidaatId: string }> = [];
  const overgeslagen: Array<{ naam: string; reden: string }> = [];

  for (const f of storage) {
    // Bestandsnaam parsen: "{uuid}-{originele_naam}.pdf"
    const ruw = f.name.replace(/\.pdf$/i, "");
    const naDash = ruw.replace(/^[0-9a-f-]{36}-/, "");
    const cleanedNaam = naDash
      .replace(/[_]+/g, " ")
      .replace(/Resume of /i, "")
      .replace(/attachment[- ]?\d*/i, "Onbekend")
      .replace(/\d+$/g, "")
      .trim();

    const delen = cleanedNaam.split(/\s+/).filter(Boolean);
    const voornaam = delen[0] || "Onbekend";
    const achternaam = delen.slice(1).join(" ") || "(website-intake)";
    const naamKey = `${voornaam} ${achternaam}`.toLowerCase();

    if (bestaandeNamen.has(naamKey)) {
      overgeslagen.push({ naam: `${voornaam} ${achternaam}`, reden: "bestaat al in ATS" });
      continue;
    }

    // Signed URL voor de CV (30 dagen geldig)
    const { data: sign } = await admin.storage
      .from("rec-cvs")
      .createSignedUrl(`intake/${f.name}`, 60 * 60 * 24 * 30);
    const cvUrl = sign?.signedUrl ?? "";

    const notitie = [
      "Bron: hersteld uit website-intake (CV stond in storage, finish was nooit gelukt).",
      cvUrl ? `CV: ${cvUrl}` : null,
      `Storage-pad: intake/${f.name}`,
      `Upload-tijd: ${f.created_at ?? "onbekend"}`,
    ].filter(Boolean).join("\n");

    const { data: nieuw, error: insErr } = await admin
      .from("kandidaten")
      .insert({
        tenant_id: ATS_TENANT_ID,
        voornaam,
        achternaam,
        kanban_stap: "website",
        status: "nieuw",
        notitie,
        intake_voltooid: false,
        bijzonderheden: "Website-intake niet voltooid: alleen CV beschikbaar, geen bot-antwoorden.",
      })
      .select("id")
      .single();

    if (insErr || !nieuw) {
      overgeslagen.push({ naam: `${voornaam} ${achternaam}`, reden: insErr?.message ?? "insert mislukt" });
      continue;
    }

    bestaandeNamen.add(naamKey);
    aangemaakt.push({ naam: `${voornaam} ${achternaam}`, cvUrl, kandidaatId: nieuw.id });
  }

  return NextResponse.json({
    ok: true,
    totaalCvs: storage.length,
    aangemaaktAantal: aangemaakt.length,
    aangemaakt,
    overgeslagen,
  });
}
