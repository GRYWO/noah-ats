import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { intakeStap, type IntakeBericht } from "@/utils/intake-bot";

// Eén beurt van de intake-bot. Alleen recruiter/admin.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ klaar: false, bericht: "Niet ingelogd." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
  if (profile?.rol === "setter") return NextResponse.json({ klaar: false, bericht: "Geen toegang." }, { status: 403 });

  try {
    const { messages, cvContext } = (await req.json()) as { messages: IntakeBericht[]; cvContext?: string };
    const stap = await intakeStap(messages ?? [], cvContext);
    return NextResponse.json(stap);
  } catch {
    return NextResponse.json({ klaar: false, bericht: "Er ging even iets mis. Probeer het zo opnieuw." });
  }
}
