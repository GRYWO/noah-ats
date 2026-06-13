/**
 * Contract redactie + extractie
 *
 * Klant upload een arbeidscontract → wij doen:
 *  1. Anthropic Claude (PDF input) → extract salaris-info + redacteer PII
 *  2. Genereer een schone, geredacteerde samenvattings-PDF met pdf-lib
 *  3. Bewaar origineel max 24u (cleanup-cron), geredacteerd 7 jaar (fiscaal)
 */

import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getGrywoLogoWitDataUri } from "@/utils/grywo-logo";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type SalarisComponenten = {
  brutoMaandsalaris: number | null;
  urenPerWeek: number | null; // bv 40, 36, 32
  vakantiegeldPct: number | null; // default 8
  dertiendeMaand: boolean;
  dertiendeMaandBedrag: number | null;
  eindejaarsuitkering: boolean;
  eindejaarsuitkeringBedrag: number | null;
  vasteBonus: number | null; // jaarlijks
  cao: string | null;
  // Berekend door AI
  brutoJaarsalarisBerekend: number | null;
  brutoJaarsalarisLetterlijk: number | null; // als letterlijk genoemd in contract
};

export type RedactieResultaat = {
  // Geëxtraheerde feitelijke info (voor facturatie)
  kandidaatnaam: string | null;
  werkgever: string | null;
  functie: string | null;
  startdatum: string | null; // ISO
  contractduur: string | null;
  // Volledige salaris-breakdown
  salaris: SalarisComponenten;
  // Geredacteerde inhoud + audit
  geredacteerdeTekst: string;
  redactieCounts: Record<string, number>;
  // Resulterende PDF bytes
  geredacteerdePdf: Uint8Array;
  samenvattingPdf: Uint8Array;
};

const REDACT_PROMPT = `Je bent een AVG/GDPR-expert die arbeidscontracten analyseert voor een Nederlands recruitment bureau (GRYWO).

Je krijgt een arbeidscontract als PDF. Extract de volgende velden — GEEN volledige tekst-redactie nodig.

EXTRACT — Lees deze velden uit:
   - kandidaatnaam (volledige naam werknemer)
   - werkgever (bedrijfsnaam)
   - functie (jobtitle)
   - startdatum (ISO 8601: YYYY-MM-DD)
   - contractduur ("onbepaalde tijd" | "bepaalde tijd: X maanden" | "..." )
   - cao (welke CAO van toepassing is, bv "CAO Metaal & Techniek" of null als geen CAO genoemd)
   - urenPerWeek (40 / 36 / 32 / parttime aantal — alleen het getal)
   - brutoMaandsalaris (bruto per maand, EUR, alleen het getal — kerncomponent)
   - vakantiegeldPct (standaard 8% in NL — geef het exacte percentage uit het contract, of 8 als niet genoemd)
   - dertiendeMaand (true/false — krijgt werknemer een 13e maand?)
   - dertiendeMaandBedrag (bedrag indien anders dan 1× maandsalaris, anders null)
   - eindejaarsuitkering (true/false — krijgt werknemer een eindejaarsuitkering los van 13e maand?)
   - eindejaarsuitkeringBedrag (bedrag in EUR of null)
   - vasteBonus (vaste jaarlijkse bonus indien genoemd, EUR — geen variabele bonussen)
   - brutoJaarsalarisLetterlijk (alleen invullen als het contract LETTERLIJK een jaarsalaris noemt, anders null)
   - brutoJaarsalarisBerekend = (brutoMaandsalaris × 12) + (brutoMaandsalaris × 12 × vakantiegeldPct / 100) + (13e maand bedrag of maandsalaris als dertiendeMaand=true) + (eindejaarsuitkeringBedrag) + (vasteBonus)
     → bereken dit zelf en rond af op hele euro's

Tel ook hoeveel PII-elementen je in het contract zag (zonder ze terug te geven):
- bsn, iban, adres, geboortedatum, telefoon, email, burgerlijke_staat

GEEF TERUG als JSON, exact dit schema (geen markdown, geen uitleg, geen extra tekst):
{
  "kandidaatnaam": "string|null",
  "werkgever": "string|null",
  "functie": "string|null",
  "startdatum": "YYYY-MM-DD|null",
  "contractduur": "string|null",
  "cao": "string|null",
  "urenPerWeek": "number|null",
  "brutoMaandsalaris": "number|null",
  "vakantiegeldPct": "number|null",
  "dertiendeMaand": "boolean",
  "dertiendeMaandBedrag": "number|null",
  "eindejaarsuitkering": "boolean",
  "eindejaarsuitkeringBedrag": "number|null",
  "vasteBonus": "number|null",
  "brutoJaarsalarisLetterlijk": "number|null",
  "brutoJaarsalarisBerekend": "number|null",
  "redactieCounts": {
    "bsn": 0,
    "iban": 0,
    "adres": 0,
    "geboortedatum": 0,
    "telefoon": 0,
    "email": 0,
    "burgerlijke_staat": 0
  }
}`;

export async function redacteerContract(pdfBytes: Uint8Array): Promise<RedactieResultaat> {
  // 1) Claude analyseert (alleen extract, geen volledige tekst-redactie — veel sneller)
  const base64 = Buffer.from(pdfBytes).toString("base64");
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          { type: "text", text: REDACT_PROMPT },
        ],
      },
    ],
  });

  const tekstBlok = response.content.find((b) => b.type === "text");
  if (!tekstBlok || tekstBlok.type !== "text") {
    throw new Error("Geen response van AI");
  }
  type RawAiResponse = {
    kandidaatnaam: string | null;
    werkgever: string | null;
    functie: string | null;
    startdatum: string | null;
    contractduur: string | null;
    cao: string | null;
    urenPerWeek: number | null;
    brutoMaandsalaris: number | null;
    vakantiegeldPct: number | null;
    dertiendeMaand: boolean;
    dertiendeMaandBedrag: number | null;
    eindejaarsuitkering: boolean;
    eindejaarsuitkeringBedrag: number | null;
    vasteBonus: number | null;
    brutoJaarsalarisLetterlijk: number | null;
    brutoJaarsalarisBerekend: number | null;
    redactieCounts: Record<string, number>;
  };
  let raw: RawAiResponse;
  try {
    // Strip eventuele markdown code-fences en zoek het eerste { ... laatste }
    let schoon = tekstBlok.text.replace(/^```json\s*|\s*```$/g, "").trim();
    const eersteBracket = schoon.indexOf("{");
    const laatsteBracket = schoon.lastIndexOf("}");
    if (eersteBracket !== -1 && laatsteBracket !== -1) {
      schoon = schoon.slice(eersteBracket, laatsteBracket + 1);
    }
    raw = JSON.parse(schoon) as RawAiResponse;
  } catch (e) {
    console.error("[redactie] AI response was:", tekstBlok.text.slice(0, 500));
    throw new Error("AI kon geen gestructureerde data uit deze PDF halen. Is dit een echt arbeidscontract? " + String(e));
  }

  // Defensief: zorg dat alle vereiste velden bestaan (AI kan ze missen)
  raw.redactieCounts = raw.redactieCounts ?? {};

  const salaris: SalarisComponenten = {
    brutoMaandsalaris: raw.brutoMaandsalaris,
    urenPerWeek: raw.urenPerWeek,
    vakantiegeldPct: raw.vakantiegeldPct ?? 8,
    dertiendeMaand: raw.dertiendeMaand,
    dertiendeMaandBedrag: raw.dertiendeMaandBedrag,
    eindejaarsuitkering: raw.eindejaarsuitkering,
    eindejaarsuitkeringBedrag: raw.eindejaarsuitkeringBedrag,
    vasteBonus: raw.vasteBonus,
    cao: raw.cao,
    brutoJaarsalarisBerekend: raw.brutoJaarsalarisBerekend,
    brutoJaarsalarisLetterlijk: raw.brutoJaarsalarisLetterlijk,
  };

  // 2) Genereer alleen de samenvattings-PDF met salaris-breakdown
  //    (volledige tekst-redactie van origineel skippen — duurt te lang en is
  //     overbodig: backoffice heeft enkel de geverifieerde feiten nodig)
  const samenvattingPdf = await genereerSamenvattingsPdf({
    kandidaatnaam: raw.kandidaatnaam,
    werkgever: raw.werkgever,
    functie: raw.functie,
    startdatum: raw.startdatum,
    contractduur: raw.contractduur,
    salaris,
    redactieCounts: raw.redactieCounts,
  });

  return {
    kandidaatnaam: raw.kandidaatnaam,
    werkgever: raw.werkgever,
    functie: raw.functie,
    startdatum: raw.startdatum,
    contractduur: raw.contractduur,
    salaris,
    geredacteerdeTekst: "",
    redactieCounts: raw.redactieCounts,
    geredacteerdePdf: new Uint8Array(),
    samenvattingPdf,
  };
}

async function genereerGeredacteerdePdf(tekst: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const fontSize = 10;
  const lineHeight = 14;
  const marginX = 50;
  const marginTop = 80;
  const marginBottom = 60;
  const pageWidth = 595; // A4
  const pageHeight = 842;
  const usableWidth = pageWidth - marginX * 2;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

  // Header
  page.drawText("Geredacteerd arbeidscontract", {
    x: marginX,
    y: pageHeight - 50,
    size: 14,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.6),
  });
  page.drawText("PII verwijderd conform AVG art. 5 (dataminimalisatie)", {
    x: marginX,
    y: pageHeight - 68,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Body — word-wrap
  const regels = wrapTekst(tekst, font, fontSize, usableWidth);

  for (const regel of regels) {
    if (y < marginBottom) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginTop;
    }
    // Render: vervang ███ door zwarte balkjes
    renderRegelMetRedactieBalken(page, regel, marginX, y, font, fontSize);
    y -= lineHeight;
  }

  // Footer op laatste pagina
  page.drawText(`Gegenereerd door Noah ATS — ${new Date().toLocaleString("nl-NL")}`, {
    x: marginX,
    y: 30,
    size: 7,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdf.save();
}

async function genereerSamenvattingsPdf(data: {
  kandidaatnaam: string | null;
  werkgever: string | null;
  functie: string | null;
  startdatum: string | null;
  contractduur: string | null;
  salaris: SalarisComponenten;
  redactieCounts: Record<string, number>;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);

  // Header
  page.drawRectangle({ x: 0, y: 762, width: 595, height: 80, color: rgb(0.2, 0.2, 0.6) });
  page.drawText("Contract-verificatie", { x: 50, y: 800, size: 22, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Salaris-breakdown + facturatie-berekening", { x: 50, y: 775, size: 11, font, color: rgb(0.9, 0.9, 1) });

  // SECTIE 1 — Basisgegevens
  let y = 740;
  page.drawText("BASISGEGEVENS", { x: 50, y, size: 8, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
  y -= 14;

  const basis = [
    ["Kandidaat", data.kandidaatnaam],
    ["Werkgever", data.werkgever],
    ["Functie", data.functie],
    ["Startdatum", data.startdatum ? new Date(data.startdatum).toLocaleDateString("nl-NL") : null],
    ["Contractduur", data.contractduur],
    ["CAO", data.salaris.cao],
    ["Uren per week", data.salaris.urenPerWeek ? `${data.salaris.urenPerWeek} uur` : null],
  ];
  for (const [label, waarde] of basis) {
    page.drawText(label ?? "", { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(waarde ? String(waarde) : "—", { x: 180, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 16;
  }

  // SECTIE 2 — Salaris-breakdown
  y -= 10;
  page.drawText("SALARIS-OPBOUW", { x: 50, y, size: 8, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
  y -= 6;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 12;

  const s = data.salaris;
  const maandSalaris = s.brutoMaandsalaris ?? 0;
  const jaarBasis = maandSalaris * 12;
  const vakGeldPct = s.vakantiegeldPct ?? 8;
  const vakantiegeld = (jaarBasis * vakGeldPct) / 100;
  const dertiende = s.dertiendeMaand ? (s.dertiendeMaandBedrag ?? maandSalaris) : 0;
  const eindejaar = s.eindejaarsuitkering ? (s.eindejaarsuitkeringBedrag ?? 0) : 0;
  const bonus = s.vasteBonus ?? 0;
  const totaalBerekend = jaarBasis + vakantiegeld + dertiende + eindejaar + bonus;

  const eur = (n: number) => `€ ${n.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const breakdown: Array<[string, string, boolean]> = [
    [`Bruto maandsalaris × 12`, maandSalaris ? `${eur(maandSalaris)} × 12 = ${eur(jaarBasis)}` : "—", false],
    [`Vakantiegeld (${vakGeldPct}%)`, vakantiegeld ? `+ ${eur(vakantiegeld)}` : "—", false],
    [
      `13e maand${s.dertiendeMaandBedrag ? "" : (s.dertiendeMaand ? " (1× maand)" : "")}`,
      dertiende ? `+ ${eur(dertiende)}` : s.dertiendeMaand === false ? "niet van toepassing" : "—",
      false,
    ],
    [
      "Eindejaarsuitkering",
      eindejaar ? `+ ${eur(eindejaar)}` : s.eindejaarsuitkering === false ? "niet van toepassing" : "—",
      false,
    ],
    ["Vaste jaarbonus", bonus ? `+ ${eur(bonus)}` : "niet van toepassing", false],
  ];
  for (const [label, waarde] of breakdown) {
    page.drawText(label, { x: 50, y, size: 9.5, font, color: rgb(0.25, 0.25, 0.25) });
    page.drawText(waarde, { x: 360, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 14;
  }

  // Totaal in een box
  y -= 6;
  page.drawRectangle({
    x: 45,
    y: y - 24,
    width: 505,
    height: 30,
    color: rgb(0.95, 0.95, 1),
    borderColor: rgb(0.2, 0.2, 0.6),
    borderWidth: 1,
  });
  page.drawText("BRUTO JAARSALARIS", { x: 55, y: y - 8, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.6) });
  page.drawText(`(berekend uit contract-componenten)`, { x: 55, y: y - 20, size: 7, font, color: rgb(0.5, 0.5, 0.6) });
  page.drawText(eur(totaalBerekend), {
    x: 440,
    y: y - 12,
    size: 16,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.6),
  });
  y -= 36;

  // Vergelijking met letterlijk genoemd jaarsalaris (als anders)
  if (s.brutoJaarsalarisLetterlijk && Math.abs(s.brutoJaarsalarisLetterlijk - totaalBerekend) > 100) {
    page.drawText(
      `⚠ Let op: contract noemt letterlijk ${eur(s.brutoJaarsalarisLetterlijk)} als jaarsalaris (verschil: ${eur(Math.abs(s.brutoJaarsalarisLetterlijk - totaalBerekend))}).`,
      { x: 50, y, size: 8, font, color: rgb(0.7, 0.4, 0.1) },
    );
    y -= 14;
  }

  // SECTIE 3 — Fee-berekening
  y -= 10;
  page.drawText("FACTURATIE", { x: 50, y, size: 8, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
  y -= 6;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 14;

  const feeRegels: Array<[string, number]> = [
    ["15% W&S-fee", totaalBerekend * 0.15],
    ["16% W&S-fee", totaalBerekend * 0.16],
    ["17% W&S-fee", totaalBerekend * 0.17],
  ];
  for (const [label, bedrag] of feeRegels) {
    page.drawText(label, { x: 50, y, size: 9.5, font, color: rgb(0.25, 0.25, 0.25) });
    page.drawText(eur(bedrag), { x: 440, y, size: 10, font: fontBold, color: rgb(0.1, 0.6, 0.3) });
    y -= 14;
  }

  // AVG-block onderaan
  y = 175;
  page.drawRectangle({
    x: 50,
    y: y - 95,
    width: 495,
    height: 115,
    borderColor: rgb(0.2, 0.2, 0.6),
    borderWidth: 1,
    color: rgb(0.96, 0.96, 1),
  });
  page.drawText("AVG-conformiteit", { x: 65, y: y + 4, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.6) });
  const counts = data.redactieCounts ?? {};
  const totaalGeredacteerd = Object.values(counts).reduce((a, b) => a + (b as number), 0);
  const avgRegels = [
    `${totaalGeredacteerd} PII-elementen zwart gemaakt (BSN, IBAN, adres, etc.)`,
    "Origineel binnen 24u verwijderd (AVG art. 5)",
    "Geredacteerd + samenvatting bewaard 7 jaar (fiscaal)",
  ];
  let avgY = y - 14;
  for (const r of avgRegels) {
    page.drawText("• " + r, { x: 65, y: avgY, size: 8, font, color: rgb(0.25, 0.25, 0.4) });
    avgY -= 12;
  }

  // Footer
  page.drawText("Gegenereerd door Noah ATS · Noah recruitment (OneTwoStart NL B.V.) · KvK 96738782", {
    x: 50,
    y: 40,
    size: 7,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText(`Datum: ${new Date().toLocaleString("nl-NL")}`, {
    x: 50,
    y: 28,
    size: 7,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdf.save();
}

function wrapTekst(tekst: string, font: import("pdf-lib").PDFFont, size: number, maxWidth: number): string[] {
  const regels: string[] = [];
  const paragrafen = tekst.split(/\n/);
  for (const p of paragrafen) {
    if (!p.trim()) {
      regels.push("");
      continue;
    }
    const woorden = p.split(/\s+/);
    let huidige = "";
    for (const w of woorden) {
      const test = huidige ? huidige + " " + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && huidige) {
        regels.push(huidige);
        huidige = w;
      } else {
        huidige = test;
      }
    }
    if (huidige) regels.push(huidige);
  }
  return regels;
}

function renderRegelMetRedactieBalken(
  page: import("pdf-lib").PDFPage,
  regel: string,
  x: number,
  y: number,
  font: import("pdf-lib").PDFFont,
  size: number,
) {
  // Split op ███-blokken
  const delen = regel.split(/(█+)/);
  let cursorX = x;
  for (const deel of delen) {
    if (/^█+$/.test(deel)) {
      // Teken zwarte balk ipv tekst
      const w = font.widthOfTextAtSize(deel, size);
      page.drawRectangle({
        x: cursorX,
        y: y - 2,
        width: w,
        height: size + 2,
        color: rgb(0, 0, 0),
      });
      cursorX += w;
    } else {
      page.drawText(deel, { x: cursorX, y, size, font, color: rgb(0.1, 0.1, 0.1) });
      cursorX += font.widthOfTextAtSize(deel, size);
    }
  }
}

// gebruiken om unused-import warning te voorkomen
export { getGrywoLogoWitDataUri };
