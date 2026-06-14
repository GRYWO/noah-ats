import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { encrypt } from "@/utils/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIGADU_BASE = "https://api.migadu.com/v1";
const MIGADU_DOMEIN = "noah-recruitment.nl";

function migaduAuth(): string {
  const user = process.env.MIGADU_API_USER ?? "";
  const key = process.env.MIGADU_API_KEY ?? "";
  return "Basic " + Buffer.from(`${user}:${key}`).toString("base64");
}

async function setMigaduPassword(localPart: string, password: string) {
  const res = await fetch(
    `${MIGADU_BASE}/domains/${MIGADU_DOMEIN}/mailboxes/${localPart}`,
    {
      method: "PUT",
      headers: {
        Authorization: migaduAuth(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ password }),
    },
  );
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/**
 * Synchroniseer alle mail-wachtwoorden naar ÉÉN gemeenschappelijk wachtwoord:
 * - Migadu mailbox wachtwoorden (via Admin API PUT)
 * - profiles.mail_wachtwoord (versleuteld)
 * - mail_accounts.mail_wachtwoord (versleuteld)
 *
 * Zo werkt /inbox compose mail én Noah-ATS login met hetzelfde wachtwoord.
 *
 * POST { wachtwoord: "Grondwerk12." }
 * Super-admin only.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  let body: { wachtwoord?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const wachtwoord = body.wachtwoord?.trim();
  if (!wachtwoord || wachtwoord.length < 8) {
    return NextResponse.json(
      { error: "Wachtwoord moet minimaal 8 tekens zijn" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, mail_adres, voornaam")
    .ilike("mail_adres", "%@noah-recruitment.nl");

  if (error || !profiles) {
    return NextResponse.json({ error: error?.message ?? "Geen profiles" }, { status: 500 });
  }

  const encrypted = encrypt(wachtwoord);
  let migaduGelukt = 0;
  let dbGelukt = 0;
  const fouten: Array<{ user: string; stap: string; reden: string }> = [];

  for (const p of profiles) {
    if (!p.mail_adres) continue;
    const localPart = p.mail_adres.split("@")[0];

    // 1. Migadu mailbox wachtwoord wijzigen
    const r = await setMigaduPassword(localPart, wachtwoord);
    if (!r.ok) {
      fouten.push({
        user: p.mail_adres,
        stap: "migadu",
        reden: `HTTP ${r.status}: ${JSON.stringify(r.data).slice(0, 150)}`,
      });
      continue;
    }
    migaduGelukt++;

    // 2. mail_accounts versleuteld bijwerken
    const { error: maErr } = await admin
      .from("mail_accounts")
      .update({ mail_wachtwoord: encrypted, mail_status: "actief" })
      .eq("user_id", p.id)
      .ilike("mail_adres", "%@noah-recruitment.nl");
    if (maErr) {
      fouten.push({ user: p.mail_adres, stap: "mail_accounts", reden: maErr.message });
    }

    // 3. profiles versleuteld bijwerken
    const { error: prErr } = await admin
      .from("profiles")
      .update({ mail_wachtwoord: encrypted, mail_status: "actief" })
      .eq("id", p.id);
    if (prErr) {
      fouten.push({ user: p.mail_adres, stap: "profiles", reden: prErr.message });
    } else {
      dbGelukt++;
    }
  }

  return NextResponse.json({
    ok: true,
    totaal: profiles.length,
    migaduGelukt,
    dbGelukt,
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
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .ilike("mail_adres", "%@noah-recruitment.nl");
  return NextResponse.json({
    dryRun: true,
    aantalProfilesNoahRecruitment: count ?? 0,
    instructie: "POST { wachtwoord: 'Grondwerk12.' } om alle mail-wachtwoorden te synchroniseren.",
  });
}
