import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { voysClickToDial } from "@/utils/voys";
import { rateLimit } from "@/utils/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Rate-limit per gebruiker tegen misbruik van click-to-dial (toll fraud).
  if (!rateLimit(`voys:${user.id}`, 40, 600)) {
    return NextResponse.json({ error: "Te veel oproepen, probeer het zo opnieuw." }, { status: 429 });
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

  // Nummervalidatie: alleen cijfers, spaties en + (geen rare/injectie-invoer),
  // redelijke lengte. Voorkomt bellen naar geknutselde service-/premium-codes.
  const doel = String(body.doelNummer ?? "").trim();
  if (!/^[+0-9][0-9 ()-]{6,19}$/.test(doel)) {
    return NextResponse.json({ error: "Ongeldig telefoonnummer" }, { status: 400 });
  }

  try {
    const result = await voysClickToDial(eigenNummer, doel);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
