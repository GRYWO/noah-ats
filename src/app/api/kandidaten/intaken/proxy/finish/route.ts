import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Proxy voor de afsluit-stap van de noah-recruitment intake.
// Levert de kandidaat zowel aan rec_kandidaten (publieke site) als aan
// de noah-ats kandidaten-tabel (kanban-stap 'website') via de bestaande
// mirror in /api/intake/finish op noah-recruitment.
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
    const body = await req.json();
    const upstream = await fetch(
      "https://www.noah-recruitment.nl/api/intake/finish",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
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
