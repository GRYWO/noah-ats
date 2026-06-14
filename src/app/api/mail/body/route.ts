import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { laadMailBody } from "@/utils/mail-sync";

export const dynamic = "force-dynamic";

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

  // EIGENDOMSCHECK: het mailaccount moet van DEZE gebruiker zijn (voorheen kon
  // elke ingelogde user de mailbox van een ander account/tenant openen = IDOR).
  const admin = createAdminClient();
  const { data: acc } = await admin
    .from("mail_accounts")
    .select("user_id")
    .eq("id", accountId)
    .single();
  if (!acc || acc.user_id !== user.id) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  try {
    const result = await laadMailBody(accountId, mapPad, parseInt(uidStr));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
