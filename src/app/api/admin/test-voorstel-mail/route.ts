import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { sendVoorstelMail } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * Stuurt een TEST-voorstelmail naar het opgegeven adres met een nep-kandidaat.
 * Handig om te verifiëren hoe een echte voorstelmail er bij een opdrachtgever
 * uitziet, zonder dat er echte data wordt gelekt.
 *
 * POST { naar: "yorithh93@gmail.com" }
 * Super-admin only.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  let body: { naar?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const naar = body.naar?.trim();
  if (!naar || !naar.includes("@")) {
    return NextResponse.json({ error: "Vul een geldig adres in" }, { status: 400 });
  }

  // From: huidige ingelogde setter (= Yorith)
  const from = await getSetterFrom(user.id);

  // Nep tokens (geen DB-row, links werken dus niet — alleen voor preview)
  const token = randomBytes(16).toString("hex");
  const voorstelprofielToken = randomBytes(16).toString("hex");

  try {
    await sendVoorstelMail({
      naar,
      opdrachtgeverNaam: "TestBedrijf B.V.",
      kandidaat: {
        voornaam: "Janneke",
        tussenvoegsel: "van der",
        achternaam: "Berg",
        leeftijd: 28,
        woonplaats: "Utrecht",
        opleiding: "HBO Bedrijfskunde",
        open_voor: "HR / Recruitment / People & Culture",
        tarief_ws: "€ 3.200 - € 3.800 bruto / maand",
        score: 87,
      },
      bericht:
        "Hoi! Ik dacht meteen aan jullie toen ik Janneke sprak — ze zoekt een rol waar ze mensen kan begeleiden in hun groei en heeft sterke recruitment-ervaring vanuit een uitzendbureau. Hieronder een korte profielschets, klik door voor het volledige verhaal.",
      token,
      voorstelprofielToken,
      from,
    });
    return NextResponse.json({ ok: true, verzonden_naar: naar, van: from });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
