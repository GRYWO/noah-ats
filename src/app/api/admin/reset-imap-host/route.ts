import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";

/**
 * Zet imap_host, imap_port, smtp_host en smtp_port op NULL voor mail_accounts,
 * zodat de sync-code terugvalt op getMailServers() en automatisch de juiste
 * host (Migadu / Hostnet) kiest op basis van het mailadres.
 *
 * Standaard: alleen accounts van de ingelogde user.
 * Met ?alle=1 of body { alle: true } EN super-admin: alle rows in mail_accounts.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const url = new URL(request.url);
  let alle = url.searchParams.get("alle") === "1";
  if (!alle) {
    try {
      const body = (await request.json().catch(() => null)) as { alle?: boolean } | null;
      if (body && body.alle === true) alle = true;
    } catch {
      // body mag leeg zijn
    }
  }

  const isSuper = isSuperAdminEmail(user.email);
  if (alle && !isSuper) {
    return NextResponse.json({ error: "Geen super-admin" }, { status: 403 });
  }

  const admin = createAdminClient();
  const query = admin
    .from("mail_accounts")
    .update({ imap_host: null, imap_port: null, smtp_host: null, smtp_port: null });

  const { data, error } = alle
    ? await query.not("id", "is", null).select("id, mail_adres")
    : await query.eq("user_id", user.id).select("id, mail_adres");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, gereset: data ?? [] });
}
