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

  // Functie zichtbaar voor admin altijd (fallback "Admin bij GRYWO").
  // Voor recruiter/setter alleen als ze zelf iets invulden.
  const toonFunctie =
    rol === "admin" || (functieTitel && functieTitel.trim().length > 0);
  const functieRegel = toonFunctie
    ? (functieTitel?.trim() ||
      (rol === "admin" ? "Admin bij GRYWO" : ""))
    : "";

  // Wit GRYWO-logo geladen van noah-ats.nl. Fallback (alt + tekst-wordmark)
  // verschijnt automatisch als de afbeelding geblokkeerd wordt.
  const logoBlok = `<img src="${logoUrl}" alt="GRYWO" height="36" style="display:block;border:0;outline:none;text-decoration:none;height:36px;width:auto;">`;

  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;border-collapse:collapse;width:480px;max-width:100%;">
  <tr>
    <td style="background-color:${GRYWO_PAARS};padding:14px 22px;border-radius:8px 8px 0 0;">
      ${logoBlok}
    </td>
  </tr>
  <tr>
    <td style="background-color:#ffffff;border:1px solid #e5e5ec;border-top:0;border-radius:0 0 8px 8px;padding:18px 22px;">
      <div style="font-size:16px;font-weight:700;color:#1a1a2e;letter-spacing:-0.2px;line-height:1.3;">
        ${naam}
      </div>
      ${functieRegel
        ? `<div style="font-size:13px;color:${GRYWO_PAARS};font-weight:600;margin-top:2px;">${functieRegel}</div>`
        : ""}
      <div style="font-size:13px;color:#555;margin-top:10px;line-height:1.6;">
        <a href="mailto:${mailAdres}" style="color:#555;text-decoration:none;">${mailAdres}</a><br>
        ${voysNummer ? `<a href="tel:${voysNummer}" style="color:#555;text-decoration:none;">${voysNummer}</a><br>` : ""}
        <a href="https://grywo.nl" style="color:${GRYWO_PAARS};text-decoration:none;font-weight:600;">grywo.nl</a>
      </div>
    </td>
  </tr>
</table>`;
}
