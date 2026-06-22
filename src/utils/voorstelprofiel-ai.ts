import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const AI_MODEL = "claude-sonnet-4-5";

// Velden zoals de Voorstelprofiel-component ze verwacht (anoniem: geen contact).
export type VoorstelprofielData = {
  profielschets: string;
  werkervaring: string;
  opleidingen: string;
  talen: string;
  vaardigheden: string;
  rijbewijzen: string;
  vervoer: string;
};

function leesJson<T>(tekst: string): T {
  const schoon = tekst.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(schoon) as T;
}

// Zet de (ruwe) profieltekst van een kandidaat om in een net, overtuigend
// Noah-voorstelprofiel. Geen contactgegevens, geen bedrijfsnamen van de kandidaat
// die herleidbaar zijn tot privégegevens — alleen functie-inhoudelijke info.
export async function maakVoorstelprofiel(
  profielTekst: string,
  naam: string,
  plaats: string,
): Promise<VoorstelprofielData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ontbreekt");

  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1500,
    system:
      "Je bent recruiter bij Noah Recruitment en maakt een net, overtuigend kandidaatprofiel " +
      "voor een opdrachtgever, op basis van geschraapte profieltekst. Schrijf in vlot, zakelijk " +
      "Nederlands. Verzin niets: laat een veld leeg ('') als de info ontbreekt. Neem GEEN " +
      "telefoonnummers, e-mailadressen of de achternaam over. De profielschets is in de derde " +
      "persoon, wervend maar feitelijk. Antwoord UITSLUITEND met JSON.",
    messages: [
      {
        role: "user",
        content:
          `Naam: ${naam}\nWoonplaats: ${plaats}\n\nProfieltekst:\n${profielTekst.slice(0, 4000)}\n\n` +
          'Lever JSON: { ' +
          '"profielschets": string (3-5 zinnen, derde persoon, wervend en feitelijk), ' +
          '"werkervaring": string (per regel één functie + werkgever + periode, nieuwe regels gescheiden door \\n), ' +
          '"opleidingen": string (per regel één opleiding, \\n-gescheiden), ' +
          '"talen": string (komma-gescheiden), ' +
          '"vaardigheden": string (komma-gescheiden), ' +
          '"rijbewijzen": string (bv. "B" of ""), ' +
          '"vervoer": string (bv. "Eigen vervoer" of "") }',
      },
    ],
  });

  const tekst = res.content.find((b) => b.type === "text")?.text ?? "{}";
  const d = leesJson<Partial<VoorstelprofielData>>(tekst);
  return {
    profielschets: (d.profielschets ?? "").toString().trim(),
    werkervaring: (d.werkervaring ?? "").toString().trim(),
    opleidingen: (d.opleidingen ?? "").toString().trim(),
    talen: (d.talen ?? "").toString().trim(),
    vaardigheden: (d.vaardigheden ?? "").toString().trim(),
    rijbewijzen: (d.rijbewijzen ?? "").toString().trim(),
    vervoer: (d.vervoer ?? "").toString().trim(),
  };
}
