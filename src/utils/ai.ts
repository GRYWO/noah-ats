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
  // Intake-velden (zelden in CV, vaak via gesprek)
  soort_dienstverband?: string;
  werving_of_uitzend?: string;
  salaris_indicatie?: string;
  max_reisafstand_km?: number;
  blacklist_bedrijven?: string;
  bijzonderheden?: string;
  tarief_ws?: string;
  omrekenfactor_uitzendbasis?: string;
  ontbrekend?: string[];
  rode_vlaggen?: RodeVlag[];
  ai_score?: number;
  ai_advies?: "goedkeuren" | "twijfel" | "afkeuren";
};

export type RodeVlag = {
  code: string;
  beschrijving: string;
  punten: number;            // negatieve waarde, bv -20
  vraag_aan_recruiter?: string;  // bv "Lange periode zonder werk — wat is de reden?"
  toelichting?: string;       // door recruiter ingevuld
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

Basis (vaak in CV):
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

Intake (zelden in CV — laat leeg als niet duidelijk):
- soort_dienstverband (Fulltime / Parttime / Flex / Stage)
- werving_of_uitzend (Werving en selectie / Uitzendbasis / Beide)
- salaris_indicatie (bruto maandsalaris bv "3500" of "3500-4000")
- max_reisafstand_km (getal, geen string)
- blacklist_bedrijven (bedrijven waar kandidaat niet wil werken, komma-gescheiden)
- bijzonderheden (medisch, beperkingen, persoonlijk, etc.)
- tarief_ws (W&S tarief bv "15% bruto jaarsalaris")
- omrekenfactor_uitzendbasis

Meta:
- ontbrekend: array van velden die ESSENTIEEL ZIJN voor de intake maar nog NIET ingevuld kunnen worden uit het CV. Kies uit deze lijst:
  ["soort_dienstverband", "werving_of_uitzend", "salaris_indicatie", "max_reisafstand_km", "eigen_vervoer", "rijbewijs", "blacklist_bedrijven", "bijzonderheden", "tarief_ws"]
  Vermeld alleen wat ECHT mist en relevant is.

- rode_vlaggen: array van OBJECTEN met zorgen. Per object: { code, beschrijving, punten, vraag_aan_recruiter }
  Wees STRENG. Geef per zorg negatieve punten (-5 tot -30 afhankelijk van impact).
  Mogelijke codes (gebruik deze waar passend):
  * "geen_rijbewijs" (-20): geen rijbewijs of niet vermeld
  * "geen_auto" (-15): geen eigen vervoer / auto
  * "jobhopper" (-25): 3+ banen in laatste 5 jaar bij verschillende werkgevers
  * "korte_periodes" (-20): meerdere banen korter dan 1 jaar
  * "lang_geen_werk" (-15): gat van meer dan 6 maanden zonder uitleg
  * "weinig_ervaring" (-10): minder dan 2 jaar relevante werkervaring
  * "geen_opleiding" (-10): geen relevante opleiding afgerond
  * "frequente_woonplaatswissel" (-10): woonplaats meerdere keren gewijzigd
  * "overig" (-5 tot -15): andere zorgen

  Vraag_aan_recruiter mag een vraag bevatten om de zorg te verifiëren of context te krijgen
  (bv "Wat is de reden van de lange werkloze periode?" of "Heeft de kandidaat plannen om een auto aan te schaffen?")

- ai_score: getal 0-100. Start bij 100 en trek per rode vlag de punten af. Minimum 0.
- ai_advies: "goedkeuren" (score ≥ 70), "twijfel" (40-69), "afkeuren" (< 40)

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
