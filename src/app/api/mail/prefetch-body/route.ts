import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { laadMailBody } from "@/utils/mail-sync";

export const dynamic = "force-dynamic";

// Prefetch endpoint: wordt vanaf de client aangeroepen op hover van een mail
// in de inboxlijst. Doel = body alvast in DB-cache zetten zodat een klik
// daarna instant voelt. Identiek aan /api/mail/body qua semantiek, maar
// expliciet gescheiden zodat we het later anders kunnen rate-limiten of
// loggen.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get("account");
  const mapPad = url.searchParams.get("map");
  const uidStr = url.searchParams.get("uid");

  if (!accountId || !mapPad || !uidStr) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // EIGENDOMSCHECK: het mailaccount moet van DEZE gebruiker zijn (anders
  // IDOR — elke ingelogde user zou een willekeurig account kunnen prefetchen).
  const admin = createAdminClient();
  const { data: acc } = await admin
    .from("mail_accounts")
    .select("user_id")
    .eq("id", accountId)
    .single();
  if (!acc || acc.user_id !== user.id) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const uidNum = parseInt(uidStr, 10);
  if (!Number.isFinite(uidNum)) {
    return NextResponse.json({ error: "Ongeldige uid" }, { status: 400 });
  }

  try {
    await laadMailBody(accountId, mapPad, uidNum);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Prefetch is best-effort — bij fout gewoon 200 met flag terug zodat de
    // hover-handler niet luidruchtig faalt; de echte body-fetch op klik
    // toont desnoods alsnog de error.
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
