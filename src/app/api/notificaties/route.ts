import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("notificaties")
    .select("id, type, titel, bericht, link_url, gelezen, created_at, van_user:profiles!notificaties_van_user_id_fkey(voornaam, achternaam)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const ongelezen = (data ?? []).filter(n => !n.gelezen).length;
  return NextResponse.json({ ok: true, notificaties: data ?? [], ongelezen });
}

export async function POST(request: Request) {
  // Markeer 1 of alle als gelezen
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  let q = supabase.from("notificaties").update({ gelezen: true }).eq("user_id", user.id);
  if (body.id) q = q.eq("id", body.id);
  await q;
  return NextResponse.json({ ok: true });
}
