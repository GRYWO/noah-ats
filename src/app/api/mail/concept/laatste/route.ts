import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/mail/concept/laatste
// Geeft het laatst-bijgewerkte concept van de ingelogde user terug, zodat de
// compose-form bij mount kan herstellen wat de user laatst aan het typen was.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("mail_concepten")
    .select("id, naar, onderwerp, tekst, bijgewerkt_op")
    .eq("user_id", user.id)
    .order("bijgewerkt_op", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, concept: data ?? null });
}
