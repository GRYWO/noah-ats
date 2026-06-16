import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Proxy voor de chat-beurten van de noah-recruitment intake-bot.
// Body: { messages: IntakeBericht[], cvContext?: string }
// Antwoord: { klaar: boolean, bericht: string, profiel?: IntakeProfiel }
//
// Toegang: recruiter, admin, super_admin. Setter en bureau_admin niet.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { klaar: false, bericht: "Niet ingelogd." },
      { status: 401 },
    );
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
    return NextResponse.json(
      { klaar: false, bericht: "Geen toegang." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const upstream = await fetch(
      "https://www.noah-recruitment.nl/api/intake",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = await upstream.json().catch(() => ({
      klaar: false,
      bericht: "Geen antwoord van intake-service.",
    }));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { klaar: false, bericht: "Verbinding met intake-service mislukte." },
      { status: 502 },
    );
  }
}
