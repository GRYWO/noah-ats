import Anthropic from "@anthropic-ai/sdk";

// Conversationele intake-bot voor de ATS. Stelt dezelfde vragen als de
// website-intake en bouwt daarna een net voorstel-profiel op.
const MODEL = "claude-sonnet-4-5";

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY niet geconfigureerd");
  return new Anthropic({ apiKey });
}

const STIJL =
  "Schrijf in vlot, warm Nederlands. Geen emoji, geen gedachtestreepjes, geen clichés. Spreek met 'je'.";

function leesJson<T>(tekst: string): T {
  const schoon = tekst.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(schoon) as T;
}

export type IntakeBericht = { role: "user" | "assistant"; content: string };
export type IntakeProfiel = {
  voornaam: string;
  achternaam: string;
  email: string;
  telefoon: string;
  woonplaats: string;
  leeftijd: string;
  max_km: string;
  gewenste_functies: string;
  uren_per_week: string;
  werkvergunning: string; // 'ja' | 'nee'
  taal_ok: string; // 'ja' | 'nee'
  rijbewijs: string;
  eigen_vervoer: string; // 'ja' | 'nee'
  beschikbaarheid: string;
  opmerking: string;
};
export type IntakeStap =
  | { klaar: false; bericht: string }
  | { klaar: true; bericht: string; profiel: IntakeProfiel };

const INTAKE_SYSTEM =
  `Je bent Noah, een vriendelijke maar efficiënte intake-recruiter. ${STIJL} ` +
  "Je voert samen met een recruiter de intake van een kandidaat. Stel telkens ÉÉN vraag tegelijk en bevestig kort wat je hoort. " +
  "Vraag ALTIJD naar: voornaam, achternaam, telefoonnummer en e-mailadres — ook als die al uit de context bekend lijken, want ze moeten kloppen. Lees een bekend e-mailadres of telefoonnummer hardop terug en vraag om bevestiging of correctie. " +
  "Verzamel verder: woonplaats, leeftijd, gewenste functie of sector, maximale reisafstand in kilometers, uren per week beschikbaar, of de kandidaat in Nederland mag werken (werkvergunning), rijbewijs en eigen vervoer. " +
  "Beoordeel of de kandidaat voldoende Nederlands beheerst (taal_ok). Engels is niet vereist. " +
  "Zodra je alles hebt, rond je warm af (zeg dat je het profiel nu opmaakt) en zet je klaar op true. " +
  "Antwoord ELKE beurt UITSLUITEND met JSON: { \"klaar\": boolean, \"bericht\": string, \"profiel\"?: {voornaam,achternaam,email,telefoon,woonplaats,leeftijd,max_km,gewenste_functies,uren_per_week,werkvergunning,taal_ok,rijbewijs,eigen_vervoer,beschikbaarheid,opmerking} }. " +
  "leeftijd, max_km en uren_per_week zijn alleen het getal als string. werkvergunning, taal_ok en eigen_vervoer zijn 'ja' of 'nee'. Vul 'profiel' alleen als klaar=true.";

export async function intakeStap(messages: IntakeBericht[], cvContext?: string): Promise<IntakeStap> {
  const system = cvContext ? `${INTAKE_SYSTEM}\n\nWat al bekend is over de kandidaat:\n${cvContext}` : INTAKE_SYSTEM;
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 700,
    system,
    messages: messages.length ? messages : [{ role: "user", content: "(de recruiter opent de intake)" }],
  });
  const tekst = res.content.find((b) => b.type === "text")?.text ?? "{}";
  try {
    return leesJson<IntakeStap>(tekst);
  } catch {
    return { klaar: false, bericht: tekst.slice(0, 500) };
  }
}

export type Voorstelprofiel = {
  profielschets: string;
  werkervaring: string;
  opleidingen: string;
  rijbewijzen: string;
  vervoer: string;
  talen: string;
  vaardigheden: string;
};

export async function genereerProfiel(input: { cvContext?: string; profiel: IntakeProfiel }): Promise<Voorstelprofiel> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1100,
    system:
      `Je bent Noah, recruiter. ${STIJL} ` +
      "Je maakt een net, professioneel kandidaatprofiel met een vaste opzet. " +
      "De profielschets schrijf je in de DERDE persoon, neutraal, zonder naam, zonder contactgegevens, 3 tot 5 zinnen. " +
      "Antwoord UITSLUITEND met JSON.",
    messages: [
      {
        role: "user",
        content:
          "Bekende info over de kandidaat (uit CV/context):\n" + (input.cvContext || "(geen)") +
          "\n\nIntake-antwoorden:\n" + JSON.stringify(input.profiel, null, 2) +
          "\n\nLever JSON: { \"profielschets\": string (3e persoon), \"werkervaring\": string (elke functie op een nieuwe regel), \"opleidingen\": string (elk diploma op een nieuwe regel), \"rijbewijzen\": string, \"vervoer\": string ('Ja' of 'Nee'), \"talen\": string (kommagescheiden), \"vaardigheden\": string (kommagescheiden) }. Gebruik echte nieuwe regels tussen items. Geen contactgegevens.",
      },
    ],
  });
  const tekst = res.content.find((b) => b.type === "text")?.text ?? "{}";
  return leesJson<Voorstelprofiel>(tekst);
}
