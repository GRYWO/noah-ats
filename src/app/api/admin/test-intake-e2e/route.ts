import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * End-to-end test van de noah-recruitment.nl intake-flow.
 *
 * Simuleert een realistische chat-conversatie met de intake-bot, geeft alle
 * antwoorden door, wacht tot de bot klaar=true zegt, roept dan finish aan,
 * en verifieert tot slot dat het kandidaat-profiel zowel in de
 * noah-recruitment database (rec_kandidaten) als in de noah-ats mirror
 * (kandidaten) is geland.
 *
 * Alleen voor super-admins, want het schrijft echte testdata in productie.
 */

const INTAKE_URL = "https://www.noah-recruitment.nl/api/intake";
const FINISH_URL = "https://www.noah-recruitment.nl/api/intake/finish";
const TEST_EMAIL = "test-e2e@diagnose.nl";
const NOAH_TENANT_ID = "ab2b55d9-5208-43e7-8d9c-e42d49bedecb";

const ANTWOORDEN: string[] = [
  "Mijn naam is Test Kandidaat",
  "Mijn email is test-e2e@diagnose.nl",
  "Mijn telefoonnummer is 0612345678",
  "Ik woon in Tilburg",
  "Ik zoek werk als timmerman of bouwvakker",
  "Ik ben 30 jaar",
  "Maximaal 30 km reizen",
  "32 tot 40 uur per week",
  "Ja, ik heb een werkvergunning",
  "Ik spreek goed Nederlands",
  "Ik heb rijbewijs B en eigen vervoer",
];

type ChatBericht = { rol: "bot" | "user"; tekst: string };

type IntakeRespons = {
  bericht?: string;
  klaar?: boolean;
  profiel?: Record<string, unknown> | null;
  ontbrekendeEssenties?: string[];
  [k: string]: unknown;
};

async function postIntake(messages: ChatBericht[]): Promise<IntakeRespons> {
  const r = await fetch(INTAKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, cvContext: null }),
  });
  const tekst = await r.text();
  try {
    return JSON.parse(tekst) as IntakeRespons;
  } catch {
    return { bericht: tekst };
  }
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  const startMs = performance.now();
  const messages: ChatBericht[] = [];
  const logRegels: string[] = [];
  let beurtenGedaan = 0;
  let klaarBereikt = false;
  let laatsteRespons: IntakeRespons | null = null;
  let finishRespons: unknown = null;
  let antwoordIdx = 0;

  try {
    // Stap 1: open-vraag aan de bot (lege messages).
    laatsteRespons = await postIntake(messages);
    beurtenGedaan++;
    if (laatsteRespons.bericht) {
      messages.push({ rol: "bot", tekst: laatsteRespons.bericht });
      logRegels.push(`bot[1]: ${String(laatsteRespons.bericht).slice(0, 120)}`);
    }
    if (laatsteRespons.klaar) klaarBereikt = true;

    // Stappen 2-N: tot 12 bot-beurten of klaar=true.
    while (!klaarBereikt && beurtenGedaan < 12 && antwoordIdx < ANTWOORDEN.length) {
      const antwoord = ANTWOORDEN[antwoordIdx++];
      messages.push({ rol: "user", tekst: antwoord });
      logRegels.push(`user: ${antwoord}`);

      laatsteRespons = await postIntake(messages);
      beurtenGedaan++;
      if (laatsteRespons.bericht) {
        messages.push({ rol: "bot", tekst: laatsteRespons.bericht });
        logRegels.push(
          `bot[${beurtenGedaan}]: ${String(laatsteRespons.bericht).slice(0, 120)}`,
        );
      }
      if (laatsteRespons.klaar) {
        klaarBereikt = true;
        break;
      }
    }

    // Stap finish: alleen als bot klaar=true gaf met een profiel.
    if (klaarBereikt && laatsteRespons?.profiel) {
      const finishPayload = {
        profiel: laatsteRespons.profiel,
        cvPad: null,
        screening: null,
      };
      const r = await fetch(FINISH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finishPayload),
      });
      const finishTekst = await r.text();
      try {
        finishRespons = JSON.parse(finishTekst);
      } catch {
        finishRespons = finishTekst;
      }
      logRegels.push(`finish status=${r.status}`);
    } else if (!klaarBereikt) {
      logRegels.push("bot kwam niet tot klaar=true na 12 beurten");
    }

    // 2 seconden wachten op DB-propagatie.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verificatie 1: rec_kandidaten in noah-recruitment database.
    const admin = createAdminClient();
    const { data: recRij, error: recFout } = await admin
      .from("rec_kandidaten")
      .select("*")
      .eq("email", TEST_EMAIL)
      .order("aangemaakt", { ascending: false })
      .limit(1)
      .maybeSingle();

    const recVeldenGevuld: Record<string, unknown> = {};
    if (recRij) {
      const teControleren = [
        "naam",
        "email",
        "telefoon",
        "woonplaats",
        "gewenste_functies",
        "leeftijd",
        "max_km",
        "uren_per_week",
        "werkvergunning",
        "taal_ok",
        "eigen_vervoer",
        "rijbewijs",
        "beschikbaarheid",
      ];
      for (const veld of teControleren) {
        const waarde = (recRij as Record<string, unknown>)[veld];
        recVeldenGevuld[veld] = waarde === null || waarde === undefined || waarde === ""
          ? null
          : waarde;
      }
    }

    // Verificatie 2: ATS-mirror in kandidaten met juiste tenant_id.
    const { data: atsRij, error: atsFout } = await admin
      .from("kandidaten")
      .select("*")
      .eq("email", TEST_EMAIL)
      .eq("tenant_id", NOAH_TENANT_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      ok: klaarBereikt && !!recRij && !!atsRij,
      beurtenGedaan,
      klaarBereikt,
      duratieMs: Math.round(performance.now() - startMs),
      ontbrekendeEssenties: laatsteRespons?.ontbrekendeEssenties ?? null,
      finishRespons,
      rec_kandidaat: {
        gevonden: !!recRij,
        id: recRij?.id ?? null,
        velden: recVeldenGevuld,
        fout: recFout?.message ?? null,
      },
      ats_kandidaat: {
        gevonden: !!atsRij,
        id: atsRij?.id ?? null,
        kanban_stap: (atsRij as Record<string, unknown> | null)?.kanban_stap ?? null,
        naam: (atsRij as Record<string, unknown> | null)?.naam ?? null,
        telefoon: (atsRij as Record<string, unknown> | null)?.telefoon ?? null,
        woonplaats: (atsRij as Record<string, unknown> | null)?.woonplaats ?? null,
        tenant_id: (atsRij as Record<string, unknown> | null)?.tenant_id ?? null,
        fout: atsFout?.message ?? null,
      },
      log: logRegels,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      fout: (e as Error).message,
      beurtenGedaan,
      klaarBereikt,
      duratieMs: Math.round(performance.now() - startMs),
      log: logRegels,
    });
  }
}
