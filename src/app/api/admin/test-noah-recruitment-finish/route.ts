import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-side test van noah-recruitment.nl/api/intake/finish met een
 * minimal-maar-realistische payload, om te zien waar het stuk gaat.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  const payload = {
    profiel: {
      naam: "Diagnose Test",
      email: "diagnose-test@noah-recruitment.nl",
      telefoon: "0612345678",
      woonplaats: "Tilburg",
      leeftijd: "30",
      gewenste_functies: "Test",
      uren_per_week: "32",
      werkvergunning: "ja",
      taal_ok: "ja",
      cv_verklaring_ok: "ja",
      max_km: "30",
      eigen_vervoer: "ja",
      rijbewijs: "B",
      beschikbaarheid: "per direct",
      opmerking: "Diagnose-test door super-admin, mag verwijderd",
    },
    cvPad: null,
    screening: null,
  };

  const startMs = performance.now();
  try {
    const r = await fetch("https://www.noah-recruitment.nl/api/intake/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const tekst = await r.text();
    let body: unknown = tekst;
    try { body = JSON.parse(tekst); } catch { /* tekst */ }
    return NextResponse.json({
      ok: r.ok,
      status: r.status,
      duratieMs: Math.round(performance.now() - startMs),
      response: body,
      payload,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      fout: (e as Error).message,
      duratieMs: Math.round(performance.now() - startMs),
      payload,
    });
  }
}
