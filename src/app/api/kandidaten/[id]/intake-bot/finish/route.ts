import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { genereerProfiel, type IntakeProfiel } from "@/utils/intake-bot";

function getal(v: string): number | null {
  const n = parseInt(String(v || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}
function jaNee(v: string): boolean | null {
  const s = (v || "").toLowerCase();
  if (s.startsWith("ja")) return true;
  if (s.startsWith("nee")) return false;
  return null;
}

// Rondt de intake-bot af: genereert het profiel en slaat het op de kandidaat op.
// Lockdown: setter is read-only op /kandidaten, alleen recruiter / admin /
// super-admin mogen afronden. Cross-tenant: kandidaat moet binnen dezelfde
// tenant vallen.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("rol, tenant_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ fout: "Geen toegang." }, { status: 403 });

  // Setter mag de intake afronden; de kandidaat gaat daarna naar de wachtrij
  // voor de recruiter (zie kanban_stap-logica verderop).

  // Cross-tenant guard: kandidaat moet binnen tenant vallen.
  const kandidaatQuery = supabase
    .from("kandidaten")
    .select("id, tenant_id, email, eigenaar_id, cv_geparseerd")
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id);

  const { data: k } = await kandidaatQuery.single();
  if (!k) return NextResponse.json({ fout: "Kandidaat niet gevonden." }, { status: 404 });

  const { profiel } = (await req.json()) as { profiel: IntakeProfiel };

  const cvg = (k.cv_geparseerd ?? {}) as Record<string, unknown>;
  const cvContext = [
    cvg.werkervaring && `Werkervaring: ${cvg.werkervaring}`,
    cvg.opleiding && `Opleiding: ${cvg.opleiding}`,
    cvg.diplomas && `Diploma's: ${cvg.diplomas}`,
    cvg.talen && `Talen: ${cvg.talen}`,
    cvg.vaardigheden && `Vaardigheden: ${cvg.vaardigheden}`,
  ].filter(Boolean).join("\n");

  let vp;
  try {
    vp = await genereerProfiel({ cvContext, profiel });
  } catch {
    vp = { profielschets: "", werkervaring: "", opleidingen: "", rijbewijzen: profiel.rijbewijs || "", vervoer: profiel.eigen_vervoer || "", talen: "", vaardigheden: "" };
  }

  const admin = createAdminClient();
  const update: Record<string, unknown> = {
    telefoon: profiel.telefoon || null,
    woonplaats: profiel.woonplaats || null,
    leeftijd: getal(profiel.leeftijd),
    open_voor: profiel.gewenste_functies || null,
    rijbewijs: vp.rijbewijzen || profiel.rijbewijs || null,
    eigen_vervoer: jaNee(profiel.eigen_vervoer) ?? false,
    max_reisafstand_km: getal(profiel.max_km),
    uren_per_week: getal(profiel.uren_per_week),
    werkvergunning: jaNee(profiel.werkvergunning),
    nederlands_voldoende: jaNee(profiel.taal_ok),
    talen: vp.talen || null,
    beschikbaarheid: profiel.beschikbaarheid || null,
    profielschets: vp.profielschets || null,
    cv_geparseerd: {
      ...cvg,
      werkervaring: vp.werkervaring || cvg.werkervaring || null,
      diplomas: vp.opleidingen || cvg.diplomas || null,
      vaardigheden: vp.vaardigheden || cvg.vaardigheden || null,
      talen: vp.talen || cvg.talen || null,
    },
    intake_voltooid: true,
  };
  // Naam, e-mail en telefoon uit de intake overnemen (intake bevestigt dat ze kloppen).
  if (profiel.voornaam && profiel.voornaam.trim()) update.voornaam = profiel.voornaam.trim();
  if (profiel.achternaam && profiel.achternaam.trim()) update.achternaam = profiel.achternaam.trim();
  if (profiel.email && profiel.email.trim()) update.email = profiel.email.trim();

  // Setter mag intake voltooien, maar levert daarna door aan recruiter via wachtrij.
  if (profile.rol === "setter") {
    update.kanban_stap = "in_wachtrij";
  }

  const { error } = await admin.from("kandidaten").update(update).eq("id", id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  const volledigeNaam = [profiel.voornaam, profiel.achternaam].filter(Boolean).join(" ").trim();
  return NextResponse.json({ ok: true, voorstel: { naam: volledigeNaam, woonplaats: profiel.woonplaats, ...vp }, rol: profile.rol });
}
