import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { voysListUsers } from "@/utils/voys";

export const dynamic = "force-dynamic";

/**
 * Haal alle Voys-users op, match op email met Noah-profiles binnen dezelfde
 * tenant, en update profiles.voys_nummer met het mobiele/interne nummer.
 *
 * Vereist super-admin of admin rechten.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();

  const mayUse = isSuperAdminEmail(user.email) || profile?.rol === "admin";
  if (!mayUse) {
    return NextResponse.json({ error: "Alleen admins kunnen Voys-nummers syncen" }, { status: 403 });
  }

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: "Geen tenant" }, { status: 400 });
  }

  const voys = await voysListUsers();
  if (!voys.ok) {
    return NextResponse.json({
      error: "Voys API gaf geen geldige user-lijst terug. Mogelijk heeft je API-token onvoldoende rechten.",
      pogingen: voys.pogingen,
      raw: voys.raw,
    }, { status: 502 });
  }

  const admin = createAdminClient();

  // Haal alle profiles binnen dezelfde tenant op
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, mail_adres, telefoon, voys_nummer")
    .eq("tenant_id", profile.tenant_id);

  const updates: Array<{ noah_email: string; voys_nummer: string }> = [];
  const niet_gematched: string[] = [];

  for (const p of profiles ?? []) {
    if (!p.mail_adres) continue;
    const match = voys.users.find(u => u.email?.toLowerCase() === p.mail_adres.toLowerCase());
    if (!match) {
      niet_gematched.push(p.mail_adres);
      continue;
    }
    const nieuwNummer = match.mobile_nr ?? match.internal_number;
    if (!nieuwNummer) continue;
    if (p.voys_nummer === nieuwNummer) continue;

    await admin.from("profiles")
      .update({ voys_nummer: nieuwNummer })
      .eq("id", p.id);
    updates.push({ noah_email: p.mail_adres, voys_nummer: nieuwNummer });
  }

  return NextResponse.json({
    ok: true,
    voys_users_gevonden: voys.users.length,
    updates,
    niet_gematched,
  });
}
