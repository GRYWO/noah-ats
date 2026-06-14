import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/inbox/snippets
// Lijst van eigen snippets, op naam gesorteerd.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("mail_snippets")
    .select("id, naam, tekst, sneltoets, gemaakt_op")
    .order("naam", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, snippets: data ?? [] });
}

// POST /api/inbox/snippets
// Body: { naam, tekst, sneltoets? }
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: { naam?: string; tekst?: string; sneltoets?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const naam = (body.naam ?? "").trim();
  const tekst = (body.tekst ?? "").trim();
  const sneltoets = body.sneltoets ? body.sneltoets.trim().slice(0, 32) : null;

  if (!naam || naam.length > 120) {
    return NextResponse.json({ error: "Naam verplicht (max 120 tekens)" }, { status: 400 });
  }
  if (!tekst || tekst.length > 10000) {
    return NextResponse.json({ error: "Tekst verplicht (max 10000 tekens)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("mail_snippets")
    .insert({ user_id: user.id, naam, tekst, sneltoets })
    .select("id, naam, tekst, sneltoets, gemaakt_op")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, snippet: data });
}

// PUT /api/inbox/snippets
// Body: { id, naam, tekst, sneltoets? }
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: { id?: string; naam?: string; tekst?: string; sneltoets?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id verplicht" }, { status: 400 });
  }

  const naam = (body.naam ?? "").trim();
  const tekst = (body.tekst ?? "").trim();
  const sneltoets = body.sneltoets ? body.sneltoets.trim().slice(0, 32) : null;

  if (!naam || naam.length > 120) {
    return NextResponse.json({ error: "Naam verplicht (max 120 tekens)" }, { status: 400 });
  }
  if (!tekst || tekst.length > 10000) {
    return NextResponse.json({ error: "Tekst verplicht (max 10000 tekens)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("mail_snippets")
    .update({ naam, tekst, sneltoets })
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select("id, naam, tekst, sneltoets, gemaakt_op")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, snippet: data });
}

// DELETE /api/inbox/snippets?id=X
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id verplicht" }, { status: 400 });
  }

  const { error } = await supabase
    .from("mail_snippets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
