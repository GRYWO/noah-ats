import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Break-glass tool: reset wachtwoorden naar één gemeenschappelijk wachtwoord.
 * Super-admin only. GEBRUIK MET BELEID — iedereen die het wachtwoord kent komt
 * daarna in elk gereset account.
 *
 * POST body (JSON):
 *   { wachtwoord: "<NIEUW_WACHTWOORD>", tenant_id?: "<uuid>" }
 *
 * - Zonder tenant_id: reset ALLE users (alle bureaus). Zeer ingrijpend.
 * - Met tenant_id: reset alleen de users van dat ene bureau (aanrader).
 *
 * Gebruik:
 *   fetch('/api/admin/reset-alle-wachtwoorden', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ wachtwoord: '<NIEUW_WACHTWOORD>', tenant_id: '<uuid>' })
 *   }).then(r => r.json()).then(console.log)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  let body: { wachtwoord?: string; tenant_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const wachtwoord = body.wachtwoord?.trim();
  if (!wachtwoord || wachtwoord.length < 8) {
    return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }
  const tenantId = body.tenant_id?.trim() || null;

  const admin = createAdminClient();

  // Optioneel: beperk tot één bureau. Zo geeft een reset niet ongewild toegang
  // tot ALLE bureaus (blast-radius beperken — #15).
  let tenantUserIds: Set<string> | null = null;
  if (tenantId) {
    const { data: profs, error: pErr } = await admin
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenantId);
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    tenantUserIds = new Set((profs ?? []).map((p) => p.id));
    if (tenantUserIds.size === 0) {
      return NextResponse.json({ error: "Geen users in dit bureau gevonden" }, { status: 404 });
    }
  } else {
    console.warn("[reset-alle-wachtwoorden] GLOBALE reset zonder tenant_id door super-admin:", user.email);
  }

  // Haal alle users op via auth admin API (pagineren want default per_page=50)
  let alleUsers: Array<{ id: string; email: string | undefined }> = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const batch = data?.users ?? [];
    alleUsers.push(...batch.map((u) => ({ id: u.id, email: u.email })));
    if (batch.length < 200) break;
    page++;
    if (page > 50) break; // safety
  }

  // Tenant-filter toepassen indien opgegeven.
  if (tenantUserIds) {
    alleUsers = alleUsers.filter((u) => tenantUserIds!.has(u.id));
  }

  let bijgewerkt = 0;
  const fouten: Array<{ id: string; email?: string; reden: string }> = [];

  for (const u of alleUsers) {
    const { error } = await admin.auth.admin.updateUserById(u.id, { password: wachtwoord });
    if (error) {
      fouten.push({ id: u.id, email: u.email, reden: error.message });
    } else {
      bijgewerkt++;
    }
  }

  return NextResponse.json({
    ok: true,
    totaal: alleUsers.length,
    bijgewerkt,
    fouten,
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  return NextResponse.json({
    dryRun: true,
    aantalUsersGevonden: data?.users?.length ?? 0,
    instructie: "POST { wachtwoord: '...' } om alle wachtwoorden te resetten.",
  });
}
