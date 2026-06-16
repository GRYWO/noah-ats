import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/maak-nep-kandidaat
 *
 * Maakt een volledig ingevulde nep-kandidaat aan (Stefan de Vries, timmerman)
 * en geeft de publieke voorstelprofiel-URL terug. Bedoeld voor super-admin om
 * visueel te checken hoe een opdrachtgever het voorstelprofiel ziet.
 *
 * Alleen toegankelijk voor super-admins (isSuperAdminEmail).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Tenant van de aanroepende super-admin ophalen uit profiles.
  const { data: profiel, error: profielError } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profielError || !profiel?.tenant_id) {
    return NextResponse.json(
      { error: "Geen tenant gevonden voor super-admin" },
      { status: 400 },
    );
  }

  // Token van 24 hex chars genereren (24 bytes hex zou 48 chars zijn,
  // dus 12 random bytes geeft exact 24 hex chars).
  // 32 hex chars = 128 bits entropie, consistent met overige voorstel-tokens.
  const token = randomBytes(16).toString("hex");

  const profielschets =
    "Allround timmerman met 8 jaar ervaring in zowel onderhoud als nieuwbouw. " +
    "Werkt secuur, denkt mee op de bouwplaats en weet van aanpakken. " +
    "Beschikbaar voor uitzending in de regio Tilburg en omstreken.";

  const cvGeparseerd = {
    talen: "Nederlands, Engels basis",
    werkervaring:
      "Onderhoudstimmerman (5 jaar) \n Bouwtimmerman nieuwbouw (3 jaar) \n Voorman kleine ploeg (1 jaar)",
    vaardigheden:
      "Tekening lezen, kozijnstelling, dakkapellen, gips, kleine elektra",
    diplomas: "MBO Timmeren niveau 3 \n VCA-basis \n Rijbewijs B",
  };

  const { data: nieuweKandidaat, error: insertError } = await admin
    .from("kandidaten")
    .insert({
      tenant_id: profiel.tenant_id,
      eigenaar_id: user.id,
      voornaam: "Stefan",
      // Achternaam draagt de DEMO-marker zodat de naam in interne lijsten
      // (kanban, kandidaten-overzicht) duidelijk demo-content is, terwijl
      // het publieke voorstelprofiel alleen de voornaam toont.
      achternaam: "de Vries [DEMO]",
      leeftijd: 34,
      woonplaats: "Tilburg",
      max_reisafstand_km: 35,
      open_voor: "Timmerman, uitvoerder onderhoud",
      profielschets,
      soort_dienstverband: "Uitzenden",
      salaris_indicatie: "2.900 tot 3.300 euro",
      werving_of_uitzend: "Uitzenden, 32 tot 40 uur",
      rijbewijs: "B",
      eigen_vervoer: true,
      cv_geparseerd: cvGeparseerd,
      bijzonderheden: "Sterk in oplossingen op de bouwplaats. Werkt netjes.",
      voorstelprofiel_token: token,
      voorstelprofiel_extra: {},
      status: "nieuw",
    })
    .select("id")
    .single();

  if (insertError || !nieuweKandidaat) {
    console.error("[maak-nep-kandidaat] insert mislukt:", insertError);
    return NextResponse.json(
      { error: "Kon nep-kandidaat niet aanmaken" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    kandidaatId: nieuweKandidaat.id,
    token,
    url: `https://www.noah-ats.nl/voorstelprofiel/${token}`,
  });
}
