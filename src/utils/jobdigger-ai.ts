import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Uit de ruwe, rommelige tekst die de bot van de Jobdigger-detailpagina plukt
// (vol met knoptekst en menu's) haalt de AI de échte vacature-informatie en
// verdeelt die netjes over de formuliervelden. Bedrijfsnaam wordt bewust NIET
// overgenomen (de vacature blijft anoniem).
export type GestructureerdeVacature = {
  taken: string;
  eisen: string;
  uren: string;
  ervaring: string;
  salaris: string;
};

const AI_MODEL = "claude-sonnet-4-5";

function leesJson<T>(tekst: string): T {
  const schoon = tekst.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(schoon) as T;
}

export async function structureerVacatureTekst(
  ruw: string,
  titel: string,
  plaats: string,
): Promise<GestructureerdeVacature> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ontbreekt");

  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1200,
    system:
      "Je krijgt ruwe, rommelige tekst die van een vacaturepagina is geschraapt. " +
      "Er staat veel ruis in: knopteksten, menu's, 'Download als PNG', 'Bekijk origineel', " +
      "'image/svg+xml', adressen, 'Bekijk op Google Maps', enzovoort. " +
      "Haal hier de ECHTE vacature-informatie uit en vul de velden in. Schrijf in vlot, " +
      "zakelijk Nederlands. Verzin niets: laat een veld leeg ('') als de info er niet in staat. " +
      "Noem NOOIT een bedrijfsnaam, adres of website (de vacature blijft anoniem). " +
      "Antwoord UITSLUITEND met JSON.",
    messages: [
      {
        role: "user",
        content:
          `Functietitel: ${titel}\nPlaats: ${plaats}\n\nRuwe tekst:\n${ruw.slice(0, 4000)}\n\n` +
          'Lever JSON: { "taken": string (wat ga je doen, in hele zinnen of korte opsomming), ' +
          '"eisen": string (wat wordt gevraagd: opleiding, ervaring, vaardigheden, rijbewijs), ' +
          '"uren": string (bv. "32-40 uur" of "Fulltime"), ' +
          '"ervaring": string (bv. "2 tot 5 jaar" of ""), ' +
          '"salaris": string (bv. "2800 tot 3400 euro" of "") }',
      },
    ],
  });

  const tekst = res.content.find((b) => b.type === "text")?.text ?? "{}";
  const data = leesJson<Partial<GestructureerdeVacature>>(tekst);
  return {
    taken: (data.taken ?? "").toString().trim(),
    eisen: (data.eisen ?? "").toString().trim(),
    uren: (data.uren ?? "").toString().trim(),
    ervaring: (data.ervaring ?? "").toString().trim(),
    salaris: (data.salaris ?? "").toString().trim(),
  };
}
