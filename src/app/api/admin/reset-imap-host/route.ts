import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Zet imap_host en imap_port op NULL voor de mail_accounts van de
 * ingelogde user, zodat de sync-code terugvalt op getMailServers() en
 * automatisch de juiste host (Migadu / Hostnet) kiest op basis van het
 * mailadres. Handig na een fout waarbij imap_host met een token-achtige
 * waarde was overschreven.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mail_accounts")
    .update({ imap_host: null, imap_port: null, smtp_host: null, smtp_port: null })
    .eq("user_id", user.id)
    .select("id, mail_adres");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, gereset: data });
}
