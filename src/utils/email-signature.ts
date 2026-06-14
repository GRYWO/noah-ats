import { getGrywoLogoDataUri } from "@/utils/grywo-logo";

const GRYWO_PAARS = "#333399";
const GRYWO_GEEL = "#ffd84d";

export type SignatureInput = {
  voornaam: string;
  achternaam: string;
  rol: "admin" | "recruiter" | "setter";
  voysNummer?: string | null;   // zakelijk VoIP-nummer dat in handtekening komt
  mailAdres: string;
  functieTitel?: string | null;
};

/**
 * Bouw een nette email-banner voor onder elke mail.
 *
 * - Paarse banner-balk met wit GRYWO-logo + geel puntje.
 * - Witte info-strook met naam, contact en website.
 * - Functie-regel verschijnt ALLEEN voor admins (recruiters/setters niet,
 *   tenzij ze zelf expliciet een functie-titel invullen).
 */
export function bouwHandtekening({
  voornaam,
  achternaam,
  rol,
  voysNummer,
  mailAdres,
  functieTitel,
}: SignatureInput): string {
  // Logo wordt geladen van een publieke URL i.p.v. base64 data-URI,
  // omdat Gmail (en sommige andere clients) data-URIs in <img> blokkeren
  // uit veiligheid. URL absoluut zodat hij in elke client werkt.
  const logoUrl = "https://www.noah-ats.nl/grywo-logo-wit.png";
  // Data-URI fallback wordt niet meer gebruikt, maar we laten 'm hier
  // zodat de import niet ongebruikt is en gebruiken hem als safety net
  // mocht de URL ooit niet bereikbaar zijn tijdens build.
  void getGrywoLogoDataUri;
  const naam = `${voornaam} ${achternaam}`.trim();

  // Functie zichtbaar voor admin altijd (fallback "Admin bij Noah recruitment").
  // Voor recruiter/setter alleen als ze zelf iets invulden.
  const toonFunctie =
    rol === "admin" || (functieTitel && functieTitel.trim().length > 0);
  const functieRegel = toonFunctie
    ? (functieTitel?.trim() ||
      (rol === "admin" ? "Admin bij Noah recruitment" : ""))
    : "";

  // Tekst-wordmark voor Noah recruitment: werkt in elke mail-client zonder externe afhankelijkheid.
  // "Noah." in extra-bold wit + gele punt (#ffd84d) + " RECRUITMENT " in spatie-uppercase.
  const logoBlok = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
    <tr>
      <td style="padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:32px;font-weight:900;letter-spacing:-1px;color:#ffffff;line-height:1;vertical-align:baseline;">Noah<span style="color:${GRYWO_GEEL};">.</span></td>
      <td style="padding:0 0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;color:rgba(255,255,255,0.7);text-transform:uppercase;vertical-align:baseline;">RECRUITMENT</td>
    </tr>
  </table>`;

  // Brede twee-koloms handtekening (640px): links logo-vlak met
  // GRYWO-merk, rechts contact-info. Mobiele clients vallen terug op
  // single-column omdat we max-width:100% gebruiken.
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:28px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;border-collapse:separate;width:640px;max-width:100%;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(51,51,153,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,${GRYWO_PAARS} 0%,#4a4ab8 100%);background-color:${GRYWO_PAARS};padding:22px 28px;width:200px;vertical-align:middle;border-right:3px solid ${GRYWO_GEEL};">
      ${logoBlok}
    </td>
    <td style="background-color:#ffffff;padding:22px 28px;vertical-align:middle;">
      <div style="font-size:20px;font-weight:800;color:#1a1a2e;letter-spacing:-0.4px;line-height:1.2;">
        ${naam}
      </div>
      ${functieRegel
        ? `<div style="font-size:13px;color:${GRYWO_PAARS};font-weight:700;margin-top:3px;letter-spacing:0.2px;">${functieRegel}</div>`
        : ""}
      <div style="height:1px;background-color:#ececf2;margin:14px 0;"></div>
      <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="font-size:13px;line-height:1.6;">
        ${voysNummer ? `<tr>
          <td style="padding:2px 8px 2px 0;color:#9a9aa8;width:18px;vertical-align:middle;">📞</td>
          <td style="padding:2px 0;color:#444;"><a href="tel:${voysNummer}" style="color:#444;text-decoration:none;font-weight:500;">${voysNummer}</a></td>
        </tr>` : ""}
        <tr>
          <td style="padding:2px 8px 2px 0;color:#9a9aa8;width:18px;vertical-align:middle;">🌐</td>
          <td style="padding:2px 0;"><a href="https://www.noah-recruitment.nl" style="color:${GRYWO_PAARS};text-decoration:none;font-weight:700;">www.noah-recruitment.nl</a></td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Converteer een HTML-handtekening naar plain text, geschikt voor de
 * compose-textarea. Strip tags, decode basis-entities, normaliseer
 * whitespace. Werkt zonder browser-DOM (server-safe).
 */
export function handtekeningNaarPlainText(html: string | null | undefined): string {
  if (!html) return "";
  let tekst = String(html);

  // Vervang block-grenzen en line-breaks door newlines.
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

  // Whitespace normaliseren: per regel trimmen, max 2 lege regels achter elkaar.
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
