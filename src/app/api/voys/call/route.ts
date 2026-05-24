import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { voysClickToDial } from "@/utils/voys";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("telefoon, voys_nummer")
    .eq("id", user.id)
    .single();

  // Eigen nummer: voys_nummer als gezet, anders profile.telefoon
  const eigenNummer = (profile as { voys_nummer?: string; telefoon?: string } | null)?.voys_nummer
    ?? profile?.telefoon;

  if (!eigenNummer) {
    return NextResponse.json({
      error: "Geen telefoonnummer op je profiel ingesteld. Vul je telefoonnummer in via Instellingen.",
    }, { status: 400 });
  }

  let body: { doelNummer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  if (!body.doelNummer) {
    return NextResponse.json({ error: "doelNummer ontbreekt" }, { status: 400 });
  }

  try {
    const result = await voysClickToDial(eigenNummer, body.doelNummer);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
