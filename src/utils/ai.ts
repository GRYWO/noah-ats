import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-5";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY niet geconfigureerd");
  _client = new Anthropic({ apiKey });
  return _client;
}

export type GeparseerdCV = {
  voornaam?: string;
  achternaam?: string;
  tussenvoegsel?: string;
  email?: string;
  telefoon?: string;
  geboortedatum?: string;
  woonplaats?: string;
  postcode?: string;
  adres?: string;
  nationaliteit?: string;
  opleiding?: string;
  open_voor?: string;
  rijbewijs?: string;
  eigen_vervoer?: boolean;
  talen?: string;
  werkervaring?: string;
  vaardigheden?: string;
  ontbrekend?: string[];
  rode_vlaggen?: string[];
};

/**
 * Parse een CV (PDF) met Claude. Stuurt PDF rechtstreeks naar Claude
 * en vraagt om gestructureerde JSON terug.
 */
export async function parseCV(pdfBuffer: Buffer): Promise<GeparseerdCV> {
  const base64 = pdfBuffer.toString("base64");

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          {
            type: "text",
            text: `Je bent een Nederlandse recruiter-assistent. Lees dit CV en geef de gegevens terug als JSON.

Velden (allemaal optioneel als ze niet in het CV staan):
- voornaam, tussenvoegsel, achternaam
- email, telefoon, geboortedatum (YYYY-MM-DD), woonplaats, postcode, adres
- nationaliteit
- opleiding (hoogste afgeronde)
- open_voor (functies/branches waarvoor de kandidaat openstaat — breed inschatten)
- rijbewijs (bv "B" of "B, BE")
- eigen_vervoer (boolean op basis van rijbewijs + auto-tekst)
- talen (komma-gescheiden)
- werkervaring (korte samenvatting van laatste 2-3 jobs)
- vaardigheden (komma-gescheiden top vaardigheden)
- ontbrekend: array van belangrijke velden die je MIST in het CV (bv "geboortedatum", "rijbewijs")
- rode_vlaggen: array van zorgen (bv "Lange gaten in werkervaring", "Veel korte dienstverbanden")

Geef ALLEEN een geldig JSON-object terug, geen extra tekst, geen markdown-fences.`,
          },
        ],
      },
    ],
  });

  const tekst = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("\n")
    .trim();

  // Strip eventuele ```json ``` fences
  const schoon = tekst.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(schoon) as GeparseerdCV;
  } catch {
    throw new Error("AI gaf geen geldig JSON terug: " + tekst.slice(0, 200));
  }
}

/**
 * Genereer een profielschets in de 3e persoon op basis van CV-data + intake.
 */
export async function genereerProfielschets(data: {
  voornaam?: string | null;
  achternaam?: string | null;
  leeftijd?: number | null;
  woonplaats?: string | null;
  opleiding?: string | null;
  open_voor?: string | null;
  werkervaring?: string | null;
  vaardigheden?: string | null;
  notitie?: string | null;
  max_reisafstand_km?: number | null;
}): Promise<string> {
  // Privacy: gebruik ALLEEN voornaam in de schets. Geen achternaam.
  const voornaam = (data.voornaam ?? "").trim() || "Deze kandidaat";

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `Schrijf een professionele profielschets in het Nederlands voor de volgende kandidaat.

EISEN (strikt):
- Schrijf in de DERDE PERSOON (bv "${voornaam} is...", niet "Ik ben...")
- Gebruik ALLEEN de voornaam, NOOIT de achternaam
- Vermeld GEEN e-mailadres, telefoonnummer of andere contactgegevens
- 100 tot 180 woorden
- Drie alinea's: (1) persoonlijke introductie + woonplaats/opleiding, (2) werkervaring + vaardigheden, (3) ambitie + wat hij/zij zoekt
- Professioneel maar warm; geen overdreven marketingtaal
- Géén bullet points
- Géén kopjes
- Geef alleen de schets-tekst terug, geen extra uitleg

Kandidaat-gegevens (alleen voor jou ter context):
- Voornaam: ${voornaam}
${data.leeftijd ? `- Leeftijd: ${data.leeftijd}` : ""}
${data.woonplaats ? `- Woonplaats: ${data.woonplaats}` : ""}
${data.opleiding ? `- Opleiding: ${data.opleiding}` : ""}
${data.open_voor ? `- Open voor functies: ${data.open_voor}` : ""}
${data.werkervaring ? `- Werkervaring: ${data.werkervaring}` : ""}
${data.vaardigheden ? `- Vaardigheden: ${data.vaardigheden}` : ""}
${data.max_reisafstand_km ? `- Max reisafstand: ${data.max_reisafstand_km} km` : ""}
${data.notitie ? `- Interne notitie: ${data.notitie}` : ""}`,
      },
    ],
  });

  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("\n")
    .trim();
}
