import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { intakeStap, type IntakeBericht } from "@/utils/intake-bot";

// Eén beurt van de intake-bot.
// Lockdown: setter is read-only op /kandidaten, alleen recruiter / admin /
// super-admin mogen de intake-bot aanroepen.
// Cross-tenant: kandidaat moet altijd binnen dezelfde tenant vallen.

// In-memory rate-limit per user.id. Vensters van 60 seconden, max 30 calls.
// Bedoeld om AI-misbruik te beperken; geldt per server-instance.
const INTAKE_LIMIET = 30;
const INTAKE_VENSTER_MS = 60_000;
const intakeTeller: Map<string, number[]> = new Map();

function rateLimitOverschreden(userId: string): boolean {
  const nu = Date.now();
  const eerder = intakeTeller.get(userId) ?? [];
  const recent = eerder.filter((t) => nu - t < INTAKE_VENSTER_MS);
  if (recent.length >= INTAKE_LIMIET) {
    intakeTeller.set(userId, recent);
    return true;
  }
  recent.push(nu);
  intakeTeller.set(userId, recent);
  return false;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ klaar: false, bericht: "Niet ingelogd." }, { status: 401 });

  if (rateLimitOverschreden(user.id)) {
    return NextResponse.json(
      { klaar: false, bericht: "Te veel verzoeken. Wacht even en probeer opnieuw." },
      { status: 429 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ klaar: false, bericht: "Geen toegang." }, { status: 403 });

  // Setters mogen de intake-bot gebruiken; bij afronden gaat de kandidaat
  // automatisch naar de wachtrij voor de recruiter (zie finish-route).

  // Cross-tenant guard: kandidaat moet bestaan binnen tenant.
  const kandidaatQuery = supabase
    .from("kandidaten")
    .select("id, tenant_id, eigenaar_id")
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id);

  const { data: kandidaat } = await kandidaatQuery.single();
  if (!kandidaat) {
    return NextResponse.json({ klaar: false, bericht: "Kandidaat niet gevonden." }, { status: 404 });
  }

  try {
    const { messages, cvContext } = (await req.json()) as { messages: IntakeBericht[]; cvContext?: string };
    const stap = await intakeStap(messages ?? [], cvContext);
    return NextResponse.json(stap);
  } catch {
    return NextResponse.json({ klaar: false, bericht: "Er ging even iets mis. Probeer het zo opnieuw." });
  }
}
