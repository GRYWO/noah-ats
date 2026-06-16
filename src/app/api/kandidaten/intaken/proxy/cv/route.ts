import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Proxy voor de CV-upload bij de noah-recruitment intake-flow.
// De recruiter logt in op noah-ats, maar de intake-logica (CV-screen,
// match-engine, mirror naar rec_kandidaten + ats-kandidaten) draait op
// noah-recruitment. Deze proxy zorgt dat de interne medewerker geen
// CORS-issues krijgt en dat we de rol-check binnen noah-ats houden.
//
// Toegang: recruiter, admin, super_admin. Setter en bureau_admin niet.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    (profile.rol !== "recruiter" &&
      profile.rol !== "admin" &&
      profile.rol !== "super_admin")
  ) {
    return NextResponse.json({ fout: "Geen toegang." }, { status: 403 });
  }

  try {
    // FormData rechtstreeks doorzetten naar noah-recruitment.
    // fetch hergebruikt het multipart-formaat zonder her-serialisatie.
    const formData = await req.formData();
    const upstream = await fetch(
      "https://www.noah-recruitment.nl/api/intake/cv",
      { method: "POST", body: formData },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { fout: "Verbinding met intake-service mislukte." },
      { status: 502 },
    );
  }
}
