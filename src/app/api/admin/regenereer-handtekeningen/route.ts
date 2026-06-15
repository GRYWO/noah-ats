import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { bouwHandtekening } from "@/utils/email-signature";

export const dynamic = "force-dynamic";

/**
 * Regenereert handtekening_html voor ALLE users in profiles op basis van
 * de huidige bouwHandtekening() code. Nodig na de rebrand omdat oude HTML
 * nog naar het oude logo verwees.
 *
 * Super-admin only. POST: voert update uit. GET: dry-run (toont aantal).
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, rol, voys_nummer, mail_adres, functie_titel");

  if (error || !profiles) {
    return NextResponse.json({ error: error?.message ?? "Geen profiles" }, { status: 500 });
  }

  let bijgewerkt = 0;
  const fouten: Array<{ id: string; reden: string }> = [];

  for (const p of profiles) {
    if (!p.voornaam || !p.achternaam || !p.mail_adres) {
      fouten.push({ id: p.id, reden: "ontbrekende voornaam/achternaam/mail_adres" });
      continue;
    }
    if (!["admin", "recruiter", "setter"].includes(p.rol)) {
      fouten.push({ id: p.id, reden: `onbekende rol: ${p.rol}` });
      continue;
    }
    try {
      const handtekening = bouwHandtekening({
        voornaam: p.voornaam,
        achternaam: p.achternaam,
        rol: p.rol as "admin" | "recruiter" | "setter",
        voysNummer: p.voys_nummer ?? null,
        mailAdres: p.mail_adres,
        functieTitel: p.functie_titel ?? null,
      });
      const { error: updErr } = await admin
        .from("profiles")
        .update({ handtekening_html: handtekening })
        .eq("id", p.id);
      if (updErr) {
        fouten.push({ id: p.id, reden: updErr.message });
      } else {
        bijgewerkt++;
      }
    } catch (e) {
      fouten.push({ id: p.id, reden: (e as Error).message });
    }
  }

  return NextResponse.json({
    ok: true,
    totaal: profiles.length,
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
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    dryRun: true,
    aantalProfilesGevonden: count ?? 0,
    instructie: "Doe een POST naar dezelfde URL om handtekeningen te regenereren.",
  });
}
