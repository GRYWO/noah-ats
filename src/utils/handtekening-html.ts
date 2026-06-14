/**
 * Helpers voor het samenstellen, splitsen en opnieuw plakken van een
 * mail-body waarin de handtekening als apart blok (data-handtekening="ja")
 * is gemarkeerd. Dat blok-anker is puur intern: de AI-knop gebruikt het
 * om alleen de hoofdtekst naar Claude te sturen, terwijl de gestylede
 * Noah-handtekening (tabel, kleuren, logo-wordmark) intact blijft.
 */

const HANDTEKENING_WRAPPER_REGEX =
  /<div\s+data-handtekening=("|')ja("|')[^>]*>[\s\S]*?<\/div>/i;

/**
 * Bouw de initiele HTML voor een lege mail.
 * Drie lege regels bovenaan zodat de cursor lekker met ruimte begint, en
 * daaronder de handtekening verpakt in <div data-handtekening="ja">.
 */
export function bouwInitieleHtml(_handtekeningHtml?: string): string {
  return "";
}

/**
 * Verwijder een eerder ingebakken Noah-handtekening uit een legacy
 * concept-tekst. Eerdere versies van de compose-form plakten de
 * handtekening direct in de body (plain-text of HTML), waardoor nu
 * (handtekening leeft als aparte iframe-preview) een dubbele weergave
 * ontstaat bij het herstellen van een oud concept.
 *
 * Strategie:
 *  1. Knip elk <div data-handtekening="ja">...</div> blok eraf.
 *  2. Knip elke <table>...</table> die overduidelijk een Noah-handtekening is.
 *  3. Knip plain-text handtekening na een reeks van 2+ <br>'s die start met
 *     "Noah.", "RECRUITMENT" of de bekende website-URL.
 */
export function stripLegacyHandtekening(html: string): string {
  if (!html) return "";
  let resultaat = html;

  resultaat = resultaat.replace(
    /<div\s+data-handtekening=("|')ja("|')[^>]*>[\s\S]*?<\/div>\s*$/i,
    "",
  );

  resultaat = resultaat.replace(
    /<table[\s\S]*?(Noah\.|RECRUITMENT|noah-recruitment\.nl)[\s\S]*?<\/table>\s*$/i,
    "",
  );

  resultaat = resultaat.replace(
    /(?:<br\s*\/?>\s*){2,}[\s\S]*?(?:Noah\.|RECRUITMENT|noah-recruitment\.nl)[\s\S]*$/i,
    "",
  );

  resultaat = resultaat.replace(/(?:<br\s*\/?>\s*)+$/i, "");
  return resultaat.trim();
}

/**
 * Splits een mail-HTML in hoofdtekst en handtekening. Zoekt het EERSTE
 * <div data-handtekening="ja">...</div> blok. Alles ervoor wordt
 * hoofdtekst, het blok zelf (zonder wrapper) wordt handtekening.
 * Als er geen marker staat, is alles hoofdtekst en handtekening "".
 */
export function stripHandtekeningUitHtml(html: string): {
  hoofdtekst: string;
  handtekening: string;
} {
  if (!html) return { hoofdtekst: "", handtekening: "" };
  const match = html.match(HANDTEKENING_WRAPPER_REGEX);
  if (!match) {
    return { hoofdtekst: html, handtekening: "" };
  }
  const wrapper = match[0];
  const start = match.index ?? 0;
  const hoofdtekst = html.slice(0, start).trimEnd();
  // Inhoud uit de wrapper halen (alles tussen openings- en sluit-tag).
  const binnen = wrapper
    .replace(/^<div\s+data-handtekening=("|')ja("|')[^>]*>/i, "")
    .replace(/<\/div>\s*$/i, "");
  return { hoofdtekst, handtekening: binnen };
}

/**
 * Plakt hoofdtekst en handtekening weer aan elkaar met de juiste wrapper.
 * Als er geen handtekening is, returnen we alleen de hoofdtekst.
 */
export function combineerHoofdEnHandtekening(
  hoofd: string,
  handtekening: string,
): string {
  const veiligHoofd = hoofd ?? "";
  if (!handtekening || !handtekening.trim()) {
    return veiligHoofd;
  }
  return `${veiligHoofd}<div data-handtekening="ja">${handtekening}</div>`;
}

/**
 * Server-safe HTML naar plain text. Behoudt regelovergangen: <br>, </p>,
 * </div>, </tr>, </li>, </h1..6> worden newlines, </td> en </th> worden
 * spaties. Decodeert basis HTML-entities. Geen DOM nodig.
 *
 * Wordt onder andere gebruikt om:
 *  - de AI alleen plain-text input te geven (verbeterMailtekst);
 *  - een text-fallback te genereren voor mailclients die geen HTML tonen.
 */
export function stripHtmlNaarTekst(html: string | null | undefined): string {
  if (!html) return "";
  let tekst = String(html);

  // Inhoud van script/style helemaal verwijderen.
  tekst = tekst.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  tekst = tekst.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "");

  // Block-grenzen en line-breaks naar newlines.
  tekst = tekst.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  tekst = tekst.replace(/<\/(p|div|tr|li|h[1-6])\s*>/gi, "\n");
  tekst = tekst.replace(/<\/(td|th)\s*>/gi, " ");

  // Strip alle overige tags.
  tekst = tekst.replace(/<[^>]+>/g, "");

  // Decode basis HTML-entities.
  tekst = tekst
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&mdash;/gi, "-")
    .replace(/&ndash;/gi, "-");

  // Numerieke entities (decimal en hex).
  tekst = tekst.replace(/&#(\d+);/g, (_, d) => {
    const code = parseInt(d, 10);
    return Number.isFinite(code) ? String.fromCharCode(code) : "";
  });
  tekst = tekst.replace(/&#x([0-9a-f]+);/gi, (_, h) => {
    const code = parseInt(h, 16);
    return Number.isFinite(code) ? String.fromCharCode(code) : "";
  });

  // Whitespace normaliseren: per regel trimmen, max 1 lege regel achter elkaar.
  const regels = tekst.split("\n").map((r) => r.replace(/[ \t]+/g, " ").trim());
  const opgeschoond: string[] = [];
  let legeRij = 0;
  for (const r of regels) {
    if (r.length === 0) {
      legeRij += 1;
      if (legeRij <= 1) opgeschoond.push("");
    } else {
      legeRij = 0;
      opgeschoond.push(r);
    }
  }
  return opgeschoond.join("\n").trim();
}

/**
 * Alias-API: splitst hoofd + handtekening met de namen die het verbeter-
 * tekst-endpoint verwacht. Wrapt stripHandtekeningUitHtml zodat beide
 * naam-stijlen werken (UI gebruikt strip..., backend gebruikt splits...).
 */
export function splitsHoofdEnHandtekening(html: string | null | undefined): {
  hoofd: string;
  handtekening: string;
} {
  const { hoofdtekst, handtekening } = stripHandtekeningUitHtml(html ?? "");
  return { hoofd: hoofdtekst, handtekening };
}
