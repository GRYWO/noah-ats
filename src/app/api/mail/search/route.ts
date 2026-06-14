import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

type Treffer = {
  id: string;
  onderwerp: string;
  van: string;
  datum: string;
  snippet: string;
  account_id: string;
  map_pad: string;
  uid: number;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Niet ingelogd" }, { status: 401 });
  }

  let q = "";
  try {
    const body = await request.json();
    q = typeof body?.q === "string" ? body.q.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige body" }, { status: 400 });
  }

  if (!q) {
    return NextResponse.json({ ok: true, resultaten: [] });
  }

  // Postgres fulltext via to_tsquery vraagt om een RPC of een rauwe SQL-call.
  // De supabase-js client ondersteunt geen @@-operator native, dus we gaan
  // via de admin client met een rpc-achtige rauwe call. Hier kiezen we voor
  // een textSearch op de gegenereerde kolom; PostgREST mapt dat naar
  // plainto_tsquery zoals gewenst.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mail_berichten")
    .select("id, onderwerp, van, datum, tekst, account_id, map_pad, uid")
    .eq("user_id", user.id)
    .textSearch("search_doc", q, { config: "dutch", type: "plain" })
    .order("datum", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const resultaten: Treffer[] = (data ?? []).map((r) => ({
    id: String(r.id),
    onderwerp: r.onderwerp ?? "(geen onderwerp)",
    van: r.van ?? "",
    datum: r.datum,
    snippet: typeof r.tekst === "string" ? r.tekst.replace(/\s+/g, " ").trim().slice(0, 200) : "",
    account_id: r.account_id,
    map_pad: r.map_pad,
    uid: r.uid,
  }));

  return NextResponse.json({ ok: true, resultaten });
}
