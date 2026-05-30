import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Aantal ongelezen mails over alle mailboxen van de huidige user.
 * Wordt elke 30 sec door de TopBar/SideBar gepolled voor de badge.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ totaal: 0 });

  // Som de ongelezen-tellers per mailbox over alle accounts van deze user
  const { data: accounts } = await supabase
    .from("mail_accounts")
    .select("id")
    .eq("user_id", user.id);

  if (!accounts || accounts.length === 0) return NextResponse.json({ totaal: 0 });

  const accountIds = accounts.map((a) => a.id);

  const { data: mappen } = await supabase
    .from("mail_mappen")
    .select("ongelezen")
    .in("account_id", accountIds);

  const totaal = (mappen ?? []).reduce((s, m) => s + (m.ongelezen ?? 0), 0);
  return NextResponse.json({ totaal });
}
