import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { saneerMailHtml, bevatHtmlTags } from "@/utils/html-sanitize";

export const dynamic = "force-dynamic";

// GET /api/mail/concept?id=X
// Haal één concept op (RLS doet eigendomsfilter).
export async function GET(request: Request) {
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

  const { data, error } = await supabase
    .from("mail_concepten")
    .select("id, naar, onderwerp, tekst, bijgewerkt_op")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, concept: data });
}

// PUT /api/mail/concept
// Body: { id?, naar, onderwerp, tekst }
// Geen id -> insert nieuw, met id -> update bestaande (RLS controleert eigendom).
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: { id?: string | null; naar?: string; onderwerp?: string; tekst?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const naar = (body.naar ?? "").slice(0, 320);
  const onderwerp = (body.onderwerp ?? "").slice(0, 500);
  const ruweTekst = (body.tekst ?? "").slice(0, 100000);
  const tekst = bevatHtmlTags(ruweTekst) ? saneerMailHtml(ruweTekst) : ruweTekst;
  const nu = new Date().toISOString();

  if (body.id) {
    const { data, error } = await supabase
      .from("mail_concepten")
      .update({ naar, onderwerp, tekst, bijgewerkt_op: nu })
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("id, bijgewerkt_op")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      // Bestond niet meer of niet van deze user. Probeer insert.
      const ins = await supabase
        .from("mail_concepten")
        .insert({ user_id: user.id, naar, onderwerp, tekst, bijgewerkt_op: nu })
        .select("id, bijgewerkt_op")
        .single();
      if (ins.error) {
        return NextResponse.json({ error: ins.error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id: ins.data.id, bijgewerkt_op: ins.data.bijgewerkt_op });
    }
    return NextResponse.json({ ok: true, id: data.id, bijgewerkt_op: data.bijgewerkt_op });
  }

  const { data, error } = await supabase
    .from("mail_concepten")
    .insert({ user_id: user.id, naar, onderwerp, tekst, bijgewerkt_op: nu })
    .select("id, bijgewerkt_op")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id, bijgewerkt_op: data.bijgewerkt_op });
}

// DELETE /api/mail/concept?id=X
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
    .from("mail_concepten")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
