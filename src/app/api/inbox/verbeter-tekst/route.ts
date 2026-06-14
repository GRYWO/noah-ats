import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { verbeterMailtekst } from "@/utils/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: { tekst?: string; onderwerp?: string; naar?: string; toon?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tekst = body.tekst?.trim();
  if (!tekst || tekst.length < 5) {
    return NextResponse.json(
      { error: "Schrijf eerst minstens 5 tekens zodat de AI iets kan verbeteren" },
      { status: 400 },
    );
  }

  const toon =
    body.toon === "vriendelijk" || body.toon === "kort"
      ? body.toon
      : "professioneel";

  try {
    const verbeterd = await verbeterMailtekst({
      tekst,
      onderwerp: body.onderwerp ?? null,
      naar: body.naar ?? null,
      toon,
    });
    return NextResponse.json({ ok: true, tekst: verbeterd });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
