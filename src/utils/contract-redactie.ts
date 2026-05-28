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

export type RedactieResultaat = {
  // Geëxtraheerde feitelijke info (voor facturatie)
  kandidaatnaam: string | null;
  werkgever: string | null;
  functie: string | null;
  brutoJaarsalaris: number | null;
  brutoMaandsalaris: number | null;
  startdatum: string | null; // ISO
  contractduur: string | null;
  // Geredacteerde inhoud + audit
  geredacteerdeTekst: string;
  redactieCounts: Record<string, number>;
  // Resulterende PDF bytes
  geredacteerdePdf: Uint8Array;
  samenvattingPdf: Uint8Array;
};

const REDACT_PROMPT = `Je bent een AVG/GDPR-redactie-expert die arbeidscontracten verwerkt.

Je krijgt een arbeidscontract als PDF. Doe TWEE dingen:

1. EXTRACT — Lees deze velden uit:
   - kandidaatnaam (volledige naam werknemer)
   - werkgever (bedrijfsnaam)
   - functie (jobtitle)
   - brutoJaarsalaris (in EUR, nummer zonder symbool)
   - brutoMaandsalaris (als jaarsalaris ontbreekt)
   - startdatum (ISO 8601: YYYY-MM-DD)
   - contractduur ("onbepaalde tijd" | "bepaalde tijd: X maanden" | "..." )

2. REDACTEER — Geef de volledige contracttekst terug met alle PII vervangen door "███".
   PII categorieën (zwart maken):
   - BSN / sofinummer (alle 9-cijfer reeksen die als BSN kunnen functioneren)
   - IBAN / bankrekeningnummers
   - Privé-adres (straat, huisnummer, postcode, plaats van WERKNEMER — NIET van werkgever)
   - Geboortedatum + geboorteplaats
   - Privé-telefoonnummer + privé-email werknemer
   - Burgerlijke staat, partner-/kindgegevens
   - Nationaliteit, paspoort/ID-nummers
   - Bijzondere persoonsgegevens (gezondheid, geloof, etc.)

   BEHOUD onaangetast:
   - Naam werknemer (alleen in salaris-context, eerste vermelding mag, daarna afkorten)
   - Functietitel, salaris, werkuren, startdatum, contractduur
   - Werkgever-gegevens (adres bedrijf is publiek)
   - Standaard arbeidsvoorwaarden (vakantiedagen, pensioen, etc.)
   - Handtekeningen-tekst ("getekend te X op Y")

   Voor elke categorie: tel hoe vaak je iets hebt geredacteerd.

GEEF TERUG als JSON, exact dit schema (geen markdown, geen uitleg):
{
  "kandidaatnaam": "string|null",
  "werkgever": "string|null",
  "functie": "string|null",
  "brutoJaarsalaris": "number|null",
  "brutoMaandsalaris": "number|null",
  "startdatum": "YYYY-MM-DD|null",
  "contractduur": "string|null",
  "geredacteerdeTekst": "volledige tekst met ███ ipv PII",
  "redactieCounts": {
    "bsn": 0,
    "iban": 0,
    "adres": 0,
    "geboortedatum": 0,
    "telefoon": 0,
    "email": 0,
    "burgerlijke_staat": 0,
    "overig": 0
  }
}`;

export async function redacteerContract(pdfBytes: Uint8Array): Promise<RedactieResultaat> {
  // 1) Claude analyseert + redacteert
  const base64 = Buffer.from(pdfBytes).toString("base64");
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 16000,
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
  let parsed: Omit<RedactieResultaat, "geredacteerdePdf" | "samenvattingPdf">;
  try {
    // Strip eventuele markdown code-fences
    const schoon = tekstBlok.text.replace(/^```json\s*|\s*```$/g, "").trim();
    parsed = JSON.parse(schoon);
  } catch (e) {
    throw new Error("AI-response is geen valide JSON: " + String(e));
  }

  // 2) Genereer geredacteerde PDF
  const geredacteerdePdf = await genereerGeredacteerdePdf(parsed.geredacteerdeTekst);

  // 3) Genereer samenvattings-PDF
  const samenvattingPdf = await genereerSamenvattingsPdf({
    kandidaatnaam: parsed.kandidaatnaam,
    werkgever: parsed.werkgever,
    functie: parsed.functie,
    brutoJaarsalaris: parsed.brutoJaarsalaris,
    brutoMaandsalaris: parsed.brutoMaandsalaris,
    startdatum: parsed.startdatum,
    contractduur: parsed.contractduur,
    redactieCounts: parsed.redactieCounts,
  });

  return {
    ...parsed,
    geredacteerdePdf,
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
  brutoJaarsalaris: number | null;
  brutoMaandsalaris: number | null;
  startdatum: string | null;
  contractduur: string | null;
  redactieCounts: Record<string, number>;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);

  // Header
  page.drawRectangle({
    x: 0,
    y: 762,
    width: 595,
    height: 80,
    color: rgb(0.2, 0.2, 0.6),
  });
  page.drawText("Contract-verificatie", {
    x: 50,
    y: 800,
    size: 22,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Salaris-bevestiging voor facturatie", {
    x: 50,
    y: 775,
    size: 11,
    font,
    color: rgb(0.9, 0.9, 1),
  });

  // Vakje per veld
  let y = 720;
  const tekenRegel = (label: string, waarde: string | null | number) => {
    page.drawText(label, {
      x: 50,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 14;
    page.drawText(waarde ? String(waarde) : "—", {
      x: 50,
      y,
      size: 12,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 22;
    page.drawLine({
      start: { x: 50, y: y + 4 },
      end: { x: 545, y: y + 4 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 8;
  };

  tekenRegel("KANDIDAAT", data.kandidaatnaam);
  tekenRegel("WERKGEVER", data.werkgever);
  tekenRegel("FUNCTIE", data.functie);
  tekenRegel(
    "BRUTO JAARSALARIS",
    data.brutoJaarsalaris
      ? `€ ${data.brutoJaarsalaris.toLocaleString("nl-NL")}`
      : data.brutoMaandsalaris
      ? `€ ${(data.brutoMaandsalaris * 12).toLocaleString("nl-NL")} (afgeleid van €${data.brutoMaandsalaris}/mnd)`
      : null,
  );
  tekenRegel("STARTDATUM", data.startdatum ? new Date(data.startdatum).toLocaleDateString("nl-NL") : null);
  tekenRegel("CONTRACTDUUR", data.contractduur);

  // AVG-block onderaan
  y = 240;
  page.drawRectangle({
    x: 50,
    y: y - 110,
    width: 495,
    height: 130,
    borderColor: rgb(0.2, 0.2, 0.6),
    borderWidth: 1,
    color: rgb(0.96, 0.96, 1),
  });
  page.drawText("AVG-conformiteit", {
    x: 65,
    y: y - 10,
    size: 11,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.6),
  });

  const counts = data.redactieCounts ?? {};
  const totaalGeredacteerd = Object.values(counts).reduce((a, b) => a + (b as number), 0);
  const avgRegels = [
    "Origineel contract is verwerkt door geautomatiseerde redactie.",
    `${totaalGeredacteerd} PII-elementen zijn zwart gemaakt (BSN, IBAN, privé-adres, geboortedatum, etc.).`,
    "Origineel wordt binnen 24 uur volledig verwijderd (AVG art. 5 dataminimalisatie).",
    "Geredacteerde versie wordt 7 jaar bewaard t.b.v. fiscale bewaarplicht.",
  ];
  let avgY = y - 32;
  for (const r of avgRegels) {
    page.drawText("• " + r, {
      x: 65,
      y: avgY,
      size: 8.5,
      font,
      color: rgb(0.25, 0.25, 0.4),
    });
    avgY -= 14;
  }

  // Footer
  page.drawText("Gegenereerd door Noah ATS · GRYWO (OneTwoStart NL B.V.) · KvK 96738782", {
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
