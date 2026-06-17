import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// GET /api/kandidaten/[id]/website-cv
//
// Bouwt on-demand een verse signed URL voor het CV uit de website-intake
// en redirect daar naartoe. Reden: de notitie bevat een 30-dagen-link die
// na verloop dood is. We bewaren alleen het storage-pad in kolom
// website_cv_pad (zie migratie 091) en maken hier per klik een nieuwe.
//
// Bucket 'rec-cvs' wordt gedeeld met noah-recruitment (zelfde Supabase).
// 1 uur geldigheid is genoeg voor een directe download.
//
// Auth-regels:
//   - moet ingelogd zijn (createClient + getUser)
//   - moet binnen dezelfde tenant zitten als de kandidaat
//   - setters mogen NIET (lockdown: rol setter is read-only/no-CV-toegang
//     binnen kandidaten, en het CV mag alleen door recruiter/admin worden
//     opgevraagd uit website-intakes)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ fout: "Geen toegang." }, { status: 403 });
  }
  if (profile.rol === "setter") {
    return NextResponse.json(
      { fout: "Setters hebben geen toegang tot het CV." },
      { status: 403 },
    );
  }

  // Cross-tenant guard: kandidaat moet binnen dezelfde tenant vallen.
  const { data: kandidaat } = await supabase
    .from("kandidaten")
    .select("id, tenant_id, website_cv_pad")
    .eq("id", id)
    .single();
  if (!kandidaat) {
    return NextResponse.json({ fout: "Kandidaat niet gevonden." }, { status: 404 });
  }
  if (kandidaat.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ fout: "Geen toegang." }, { status: 403 });
  }

  const pad = (kandidaat.website_cv_pad ?? "").toString().trim();
  if (!pad) {
    return NextResponse.json(
      { fout: "Voor deze kandidaat is geen website-CV opgeslagen." },
      { status: 404 },
    );
  }

  // Storage-client met service-role: bucket-policies van rec-cvs zijn
  // gericht op de noah-recruitment-site en zouden de ATS-gebruiker
  // normaal weigeren. RLS-bypass is hier veilig: we hebben hierboven
  // al rol en tenant gecheckt.
  const admin = createAdminClient();
  const { data: signed, error } = await admin
    .storage
    .from("rec-cvs")
    .createSignedUrl(pad, 60 * 60);

  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { fout: "CV kon niet geopend worden: " + (error?.message ?? "onbekende fout") },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
