import { Resend } from "resend";
import { renderMailTemplate } from "@/utils/mail-templates";
import { getGrywoLogoWitDataUri } from "@/utils/grywo-logo";

const resend = new Resend(process.env.RESEND_API_KEY);
// Default afzender. Vereist dat grywo.nl in Resend geverifieerd is
// (Resend → Domains → grywo.nl → status 'Verified').
// Harde guard: alleen een grywo.nl-adres is toegestaan, anders forceer
// fallback. Voorkomt dat een verkeerde RESEND_FROM_EMAIL env-var (bv.
// onboarding@resend.dev of een lege string) Resend in test-mode laat
// blijven hangen.
function bepaalFrom(): string {
  const env = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  if (env && /@grywo\.nl[>]?\s*$/i.test(env)) return env;
  return "Noah ATS <noreply@grywo.nl>";
}
const FROM = bepaalFrom();
// Productie-URL bepalen voor links in mails.
// Volgorde:
// 1. NEXT_PUBLIC_APP_URL — MAAR alleen als hij naar de productie-domein wijst
//    (geen localhost, geen vercel.app preview-URL)
// 2. https://noah-ats.nl (hard productie-fallback)
//
// LET OP: VERCEL_URL wordt NIET meer gebruikt als fallback — anders kunnen
// externe ontvangers (opdrachtgevers, kandidaten, sales) een preview-link
// in hun mail krijgen die ze niet kunnen openen (Deployment Protection).
function bepaalAppUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (
    env &&
    !env.includes("localhost") &&
    !env.includes("127.0.0.1") &&
    !env.includes("vercel.app")
  ) {
    return env;
  }
  return "https://noah-ats.nl";
}
const APP_URL = bepaalAppUrl();

const GRYWO_KLEUR = "#333399";

/**
 * Pak naam + email uit een "Voornaam Achternaam <email@domein>" of "email" string.
 */
function parseFrom(from: string | undefined): { naam?: string; email?: string } {
  if (!from) return {};
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { naam: match[1].trim(), email: match[2].trim() };
  return { email: from.trim() };
}

function brandedLayout({
  titel,
  body,
  merk = "grywo",
  afzenderNaam,
  afzenderEmail,
}: {
  titel: string;
  body: string;
  merk?: "grywo" | "noah";
  afzenderNaam?: string;
  afzenderEmail?: string;
}) {
  // Logo INLINE als base64 data-URI embedden, zodat het ook werkt
  // wanneer Gmail/Outlook externe images blokkeert en ongeacht of
  // NEXT_PUBLIC_APP_URL correct is gezet.
  const grywoWit = getGrywoLogoWitDataUri();
  const header = merk === "noah"
    ? `<span style="font-family:Helvetica,Arial,sans-serif;font-size:42px;font-weight:900;letter-spacing:-2px;color:#ffffff;">noah</span><span style="display:inline-block;width:10px;height:10px;background-color:#ffd84d;border-radius:50%;margin-left:4px;vertical-align:1px;"></span>`
    : grywoWit
      ? `<img src="${grywoWit}" alt="GRYWO" width="180" style="display:inline-block;border:0;outline:none;text-decoration:none;height:auto;max-width:180px;">`
      // Tekst-fallback als het logo-bestand niet leesbaar is
      : `<span style="font-family:Helvetica,Arial,sans-serif;font-size:42px;font-weight:900;letter-spacing:-2px;color:#ffffff;">grywo</span><span style="display:inline-block;width:10px;height:10px;background-color:#ffd84d;border-radius:50%;margin-left:4px;vertical-align:1px;"></span>`;
  const footer = merk === "noah"
    ? `Noah ATS · het ATS-platform voor recruitment bureaus`
    : afzenderEmail
      ? `${afzenderNaam ? `${afzenderNaam} · ` : ""}<a href="mailto:${afzenderEmail}" style="color:#888;text-decoration:underline;">${afzenderEmail}</a>`
      : `GRYWO`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f7;padding:20px 0;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <tr><td style="background-color:${GRYWO_KLEUR};padding:32px 24px;text-align:center;">
          ${header}
        </td></tr>
        <tr><td style="padding:32px;color:#1a1a2e;">
          <h2 style="color:${GRYWO_KLEUR};margin:0 0 16px 0;font-size:22px;">${titel}</h2>
          ${body}
        </td></tr>
        <tr><td style="background-color:#f4f4f7;padding:16px;text-align:center;font-size:12px;color:#888;">
          ${footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

type Kandidaat = {
  voornaam: string;
  tussenvoegsel?: string | null;
  achternaam: string;
  leeftijd?: number | null;
  woonplaats?: string | null;
  opleiding?: string | null;
  open_voor?: string | null;
  tarief_ws?: string | null;
  score?: number | null;
};

export async function sendVoorstelMail({
  naar,
  opdrachtgeverNaam,
  kandidaat,
  bericht,
  token,
  voorstelprofielToken,
  from,
}: {
  naar: string;
  opdrachtgeverNaam: string | null;
  kandidaat: Kandidaat;
  bericht: string | null;
  token: string;
  voorstelprofielToken?: string | null;
  from?: string;
}) {
  // Privacy: opdrachtgever ziet alleen voornaam — geen achternaam/email/telefoon.
  const naam = (kandidaat.voornaam ?? "").trim() || "Kandidaat";
  const voorstelUrl = `${APP_URL}/voorstel/${token}`;
  const uitnodigenUrl = `${APP_URL}/voorstel/${token}/uitnodigen`;

  const profielRows = [
    kandidaat.leeftijd && `<tr><td style="padding:6px 0;color:#666;width:35%;">Leeftijd</td><td style="padding:6px 0;font-weight:600;">${kandidaat.leeftijd}</td></tr>`,
    kandidaat.woonplaats && `<tr><td style="padding:6px 0;color:#666;">Woonplaats</td><td style="padding:6px 0;font-weight:600;">${kandidaat.woonplaats}</td></tr>`,
    kandidaat.opleiding && `<tr><td style="padding:6px 0;color:#666;">Opleiding</td><td style="padding:6px 0;font-weight:600;">${kandidaat.opleiding}</td></tr>`,
    kandidaat.open_voor && `<tr><td style="padding:6px 0;color:#666;">Open voor</td><td style="padding:6px 0;font-weight:600;">${kandidaat.open_voor}</td></tr>`,
    kandidaat.tarief_ws && `<tr><td style="padding:6px 0;color:#666;">Tarief</td><td style="padding:6px 0;font-weight:600;">${kandidaat.tarief_ws}</td></tr>`,
    kandidaat.score != null && `<tr><td style="padding:6px 0;color:#666;">Score</td><td style="padding:6px 0;font-weight:bold;color:${kandidaat.score >= 75 ? "#0a8062" : kandidaat.score >= 50 ? "#a05d00" : "#c44"};">${kandidaat.score}/100</td></tr>`,
  ].filter(Boolean).join("");

  const intro = await renderMailTemplate("voorstel_opdrachtgever", {
    opdrachtgever_naam: opdrachtgeverNaam ?? "",
    kandidaat_naam: naam,
    bericht: bericht ?? "",
  });

  const body = `
${intro}

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9fb;border-radius:8px;padding:16px;margin:16px 0;border-collapse:separate;">
  <tr><td colspan="2" style="padding:0 0 12px 0;border-bottom:1px solid #e5e5ec;"><b style="font-size:18px;">${naam}</b></td></tr>
  ${profielRows}
</table>

${voorstelprofielToken ? `
<p style="margin:24px 0 8px 0;text-align:center;">
  <a href="${APP_URL}/voorstelprofiel/${voorstelprofielToken}" style="display:inline-block;background-color:#fff;color:${GRYWO_KLEUR};border:2px solid ${GRYWO_KLEUR};text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:14px;">Bekijk volledig voorstelprofiel</a>
</p>
` : ""}

<p style="margin:24px 0 16px 0;font-weight:600;text-align:center;">Wil je deze kandidaat uitnodigen voor een kennismaking?</p>

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;border-collapse:separate;border-spacing:8px 0;">
  <tr>
    <td width="50%" style="width:50%;">
      <a href="${uitnodigenUrl}" style="display:block;background-color:#16a34a;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-weight:bold;font-size:16px;">Uitnodigen</a>
    </td>
    <td width="50%" style="width:50%;">
      <a href="${voorstelUrl}" style="display:block;background-color:#dc2626;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-weight:bold;font-size:16px;">Niet uitnodigen</a>
    </td>
  </tr>
</table>

<p style="font-size:12px;color:#999;text-align:center;margin:16px 0 0 0;">Bij uitnodigen vul je in 1 minuut je bedrijfsgegevens + 3 voorkeursdata in.</p>
`;

  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: `Kandidaat voorstel — ${naam}`,
    html: brandedLayout({ titel: "Kandidaat voorstel", body }),
  });
}

export async function sendReminderMail({
  naar,
  opdrachtgeverNaam,
  kandidaatNaam,
  token,
  reminderNr,
  laatsteDag,
  from,
}: {
  naar: string;
  opdrachtgeverNaam: string | null;
  kandidaatNaam: string;
  token: string;
  reminderNr: 1 | 2 | 3 | 4;
  laatsteDag: boolean;
  from?: string;
}) {
  const voorstelUrl = `${APP_URL}/voorstel/${token}`;
  const uitnodigenUrl = `${APP_URL}/voorstel/${token}/uitnodigen`;

  const onderwerp = laatsteDag
    ? `LAATSTE KANS — ${kandidaatNaam}`
    : `Herinnering — ${kandidaatNaam}`;

  const headline = laatsteDag
    ? "Laatste kans om te reageren"
    : "We wachten nog op je reactie";

  const intro = await renderMailTemplate("reminder_opdrachtgever", {
    opdrachtgever_naam: opdrachtgeverNaam ?? "",
    kandidaat_naam: kandidaatNaam,
  });

  const body = `
${intro}

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;border-collapse:separate;border-spacing:8px 0;">
  <tr>
    <td width="50%" style="width:50%;">
      <a href="${uitnodigenUrl}" style="display:block;background-color:#16a34a;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-weight:bold;font-size:16px;">Uitnodigen</a>
    </td>
    <td width="50%" style="width:50%;">
      <a href="${voorstelUrl}" style="display:block;background-color:#dc2626;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-weight:bold;font-size:16px;">Niet uitnodigen</a>
    </td>
  </tr>
</table>

<p style="font-size:12px;color:#999;text-align:center;margin:16px 0 0 0;">Herinnering ${reminderNr} van 4</p>
`;

  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: onderwerp,
    html: brandedLayout({ titel: headline, body }),
  });
}

export async function sendKandidaatBevestiging({
  naar,
  kandidaatVoornaam,
  bedrijf,
  contactpersoon,
  contact_telefoon,
  contact_email,
  locatie_url,
  datum_1,
  datum_2,
  datum_3,
  opmerking,
  voorstelToken,
  from,
}: {
  naar: string;
  kandidaatVoornaam: string;
  bedrijf: string;
  contactpersoon: string;
  contact_telefoon: string;
  contact_email: string;
  locatie_url: string;
  datum_1: string | null;
  datum_2: string | null;
  datum_3: string | null;
  opmerking: string | null;
  voorstelToken?: string;
  from?: string;
}) {
  const fmtDatum = (d: string | null) =>
    d ? new Date(d).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" }) : "—";

  const intro = await renderMailTemplate("kandidaat_bevestiging", {
    voornaam: kandidaatVoornaam,
    bedrijf,
  });

  // Compacte datum-lijst + 3 kleine klikknopjes ("Datum 1/2/3") — werkt ook prima op mobiel
  const datumRegel = (nr: number, datum: string | null) => {
    if (!datum) return "";
    return `<tr><td style="padding:4px 0;color:#666;width:80px;font-weight:600;">Datum ${nr}</td><td style="padding:4px 0;font-weight:600;">${fmtDatum(datum)}</td></tr>`;
  };
  const kleinKnopje = (nr: 1 | 2 | 3, datum: string | null) => {
    if (!datum || !voorstelToken) return "";
    const url = `${APP_URL}/kies-datum/${voorstelToken}/${nr}`;
    return `<a href="${url}" style="display:inline-block;background:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;font-size:14px;margin:0 4px 4px 0;">Datum ${nr}</a>`;
  };

  const body = `
${intro}

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9fb;border-radius:8px;padding:16px;margin:16px 0;border-collapse:separate;">
  <tr><td style="padding:6px 0;color:#666;width:35%;">Bedrijf</td><td style="padding:6px 0;font-weight:600;">${bedrijf}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Contactpersoon</td><td style="padding:6px 0;font-weight:600;">${contactpersoon}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Telefoon</td><td style="padding:6px 0;font-weight:600;">${contact_telefoon}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">E-mail</td><td style="padding:6px 0;font-weight:600;">${contact_email}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Locatie</td><td style="padding:6px 0;"><a href="${locatie_url}" style="color:${GRYWO_KLEUR};">Bekijk op Google Maps</a></td></tr>
</table>

<p style="margin:16px 0 8px 0;font-weight:600;font-size:15px;">Voorgestelde datums:</p>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;margin:0 0 12px 0;">
  ${datumRegel(1, datum_1)}
  ${datumRegel(2, datum_2)}
  ${datumRegel(3, datum_3)}
</table>

<p style="margin:0 0 8px 0;font-size:13px;color:#666;">Klik hieronder op je voorkeur — je krijgt direct een bevestiging:</p>
<p style="margin:0 0 16px 0;">
  ${kleinKnopje(1, datum_1)}${kleinKnopje(2, datum_2)}${kleinKnopje(3, datum_3)}
</p>

${opmerking ? `<p style="padding:12px;background:#fff8e1;border-left:3px solid #ffb84d;margin:16px 0;color:#444;"><b>Opmerking:</b> ${opmerking}</p>` : ""}

<p style="margin:16px 0 0 0;font-size:13px;color:#666;">Geen van de datums past? Reply op deze mail om een ander moment voor te stellen.</p>
`;

  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: `${bedrijf} wil kennismaken — ${kandidaatVoornaam}`,
    html: brandedLayout({ titel: `${bedrijf} wil kennismaken!`, body }),
  });
}

/**
 * Bericht aan kandidaat dat hij/zij is voorgesteld.
 * Bewust géén opdrachtgever-naam erin.
 */
export async function sendKandidaatVoorgesteld({
  naar,
  kandidaatVoornaam,
  from,
}: {
  naar: string;
  kandidaatVoornaam: string;
  from?: string;
}) {
  const body = await renderMailTemplate("kandidaat_voorgesteld", { voornaam: kandidaatVoornaam });
  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: "Je bent voorgesteld — wachten op reactie",
    html: brandedLayout({ titel: "Je bent voorgesteld", body }),
  });
}

/**
 * Bericht aan kandidaat dat het voorstel is afgewezen.
 * Bewust géén opdrachtgever-naam erin.
 */
export async function sendKandidaatAfwijzing({
  naar,
  kandidaatVoornaam,
  from,
}: {
  naar: string;
  kandidaatVoornaam: string;
  from?: string;
}) {
  const body = await renderMailTemplate("kandidaat_afwijzing", { voornaam: kandidaatVoornaam });
  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: "Voorstel afgerond — we gaan voor je verder",
    html: brandedLayout({ titel: "Update over je voorstel", body }),
  });
}

/**
 * 1 uur voor kennismaking — herinnering naar kandidaat.
 */
export async function sendKennismakingReminder({
  naar,
  kandidaatVoornaam,
  bedrijf,
  contactpersoon,
  contact_telefoon,
  locatie_url,
  kennismaking_op,
  from,
}: {
  naar: string;
  kandidaatVoornaam: string;
  bedrijf: string;
  contactpersoon: string | null;
  contact_telefoon: string | null;
  locatie_url: string | null;
  kennismaking_op: string;
  from?: string;
}) {
  const tijd = new Date(kennismaking_op).toLocaleString("nl-NL", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const intro = await renderMailTemplate("kennismaking_reminder", {
    voornaam: kandidaatVoornaam,
    bedrijf,
  });
  const body = `
${intro}
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9fb;border-radius:8px;padding:16px;margin:16px 0;border-collapse:separate;">
  <tr><td style="padding:6px 0;color:#666;width:35%;">Tijdstip</td><td style="padding:6px 0;font-weight:600;">${tijd}</td></tr>
  ${contactpersoon ? `<tr><td style="padding:6px 0;color:#666;">Contactpersoon</td><td style="padding:6px 0;font-weight:600;">${contactpersoon}</td></tr>` : ""}
  ${contact_telefoon ? `<tr><td style="padding:6px 0;color:#666;">Telefoon</td><td style="padding:6px 0;font-weight:600;">${contact_telefoon}</td></tr>` : ""}
  ${locatie_url ? `<tr><td style="padding:6px 0;color:#666;">Locatie</td><td style="padding:6px 0;"><a href="${locatie_url}" style="color:${GRYWO_KLEUR};">Bekijk op Google Maps</a></td></tr>` : ""}
</table>
<p style="margin:16px 0 0 0;color:#666;">Veel succes — je kunt het!</p>`;
  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: `Over 1 uur: kennismaking bij ${bedrijf}`,
    html: brandedLayout({ titel: "Kennismaking over 1 uur", body }),
  });
}

/**
 * Plaatsing aanmelden bij backoffice (financiële afhandeling).
 * Bevat alle deal-details + kandidaat- en klantgegevens.
 */
export async function sendPlaatsingNaarBackoffice({
  kandidaat,
  klant,
  deal,
  aangemeldDoor,
  from,
}: {
  kandidaat: {
    voornaam: string;
    tussenvoegsel?: string | null;
    achternaam: string;
    email?: string | null;
    telefoon?: string | null;
    woonplaats?: string | null;
    geboortedatum?: string | null;
  };
  klant: {
    bedrijf: string;
    contactpersoon?: string | null;
    contact_email?: string | null;
    contact_telefoon?: string | null;
  };
  deal: {
    basis: "uitzend" | "werving_selectie";
    tarief_factor?: number | null;
    tarief_pct?: number | null;
    tarief_bedrag?: number | null;
    betaling: "1x_7d" | "50_50_7d_30d";
    startdatum?: string | null;
    opmerking?: string | null;
  };
  aangemeldDoor: { voornaam: string; achternaam: string; email: string };
  from?: string;
}) {
  const fullnaam = `${kandidaat.voornaam} ${kandidaat.tussenvoegsel ? kandidaat.tussenvoegsel + " " : ""}${kandidaat.achternaam}`.trim();
  const basisLabel = deal.basis === "uitzend" ? "Uitzendbasis" : "Werving & Selectie";
  const tariefLabel = deal.basis === "uitzend"
    ? (deal.tarief_factor != null ? `factor ${deal.tarief_factor}` : "—")
    : (deal.tarief_pct != null ? `${deal.tarief_pct}%` : "—");
  const betalingLabel = deal.betaling === "1x_7d"
    ? "100% binnen 7 dagen"
    : "50% binnen 7 dagen, 50% na 30 dagen";
  const startdatumLabel = deal.startdatum
    ? new Date(deal.startdatum).toLocaleDateString("nl-NL", { dateStyle: "full" })
    : null;

  const rij = (label: string, waarde: string | null | undefined) =>
    waarde
      ? `<tr><td style="padding:6px 0;color:#666;width:35%;">${label}</td><td style="padding:6px 0;font-weight:600;">${waarde}</td></tr>`
      : "";

  const body = `
<p>Nieuwe plaatsing aangemeld door <b>${aangemeldDoor.voornaam} ${aangemeldDoor.achternaam}</b> (${aangemeldDoor.email}).</p>

<h3 style="color:${GRYWO_KLEUR};margin:24px 0 8px 0;font-size:15px;border-bottom:2px solid ${GRYWO_KLEUR};padding-bottom:4px;">Kandidaat</h3>
<table cellpadding="0" cellspacing="0" border="0" width="100%">
  ${rij("Naam", fullnaam)}
  ${rij("E-mail", kandidaat.email)}
  ${rij("Telefoon", kandidaat.telefoon)}
  ${rij("Woonplaats", kandidaat.woonplaats)}
</table>

<h3 style="color:${GRYWO_KLEUR};margin:24px 0 8px 0;font-size:15px;border-bottom:2px solid ${GRYWO_KLEUR};padding-bottom:4px;">Klant</h3>
<table cellpadding="0" cellspacing="0" border="0" width="100%">
  ${rij("Bedrijf", klant.bedrijf)}
  ${rij("Contactpersoon", klant.contactpersoon)}
  ${rij("E-mail", klant.contact_email)}
  ${rij("Telefoon", klant.contact_telefoon)}
</table>

<h3 style="color:${GRYWO_KLEUR};margin:24px 0 8px 0;font-size:15px;border-bottom:2px solid ${GRYWO_KLEUR};padding-bottom:4px;">Afspraken</h3>
<table cellpadding="0" cellspacing="0" border="0" width="100%">
  ${rij("Basis", basisLabel)}
  ${rij("Tarief", tariefLabel)}
  ${rij("Fee-bedrag", deal.tarief_bedrag != null ? `€ ${deal.tarief_bedrag.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null)}
  ${rij("Startdatum", startdatumLabel)}
  ${rij("Betaling", betalingLabel)}
  ${rij("Opmerking", deal.opmerking)}
</table>

<p style="margin-top:24px;color:#666;font-size:12px;">Deze mail is automatisch gegenereerd vanuit Noah ATS.</p>
`;

  const result = await resend.emails.send({
    from: from ?? FROM,
    to: "backoffice@grywo.nl",
    cc: aangemeldDoor.email ? [aangemeldDoor.email] : undefined,
    subject: `Nieuwe plaatsing: ${fullnaam} bij ${klant.bedrijf}`,
    html: brandedLayout({ titel: `Plaatsing: ${fullnaam}`, body, merk: "noah" }),
  });
  if (result.error) {
    throw new Error(`Resend afgewezen: ${result.error.message}`);
  }
  return result;
}

/**
 * Stuur nieuwe inloggegevens (na wachtwoord-reset) aan een user.
 */
export async function sendInloggegevensOpnieuw({
  naar,
  voornaam,
  email,
  wachtwoord,
  rolLabel,
  bedrijf,
  from,
}: {
  naar: string;
  voornaam: string;
  email: string;
  wachtwoord: string;
  rolLabel: string;
  bedrijf: string;
  from?: string;
}) {
  const intro = `<p>Hi ${voornaam},</p>
<p>Je inloggegevens voor Noah ATS zijn opnieuw verstuurd. Je rol bij <b>${bedrijf}</b>: <b>${rolLabel}</b>.</p>
<p>Hieronder je nieuwe tijdelijke wachtwoord. Wijzig het direct na de eerste keer inloggen via Instellingen.</p>`;
  const loginBlok = inlogBlok(email, wachtwoord);
  const result = await resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: "Je nieuwe inloggegevens voor Noah ATS",
    html: brandedLayout({ titel: "Nieuwe inloggegevens", body: `${intro}\n${loginBlok}`, merk: "noah" }),
  });
  if (result.error) {
    throw new Error(`Resend afgewezen: ${result.error.message}`);
  }
  return result;
}

/**
 * Reminder naar kandidaat op de wachtlijst om CV toe te sturen.
 */
export async function sendCvReminderAanWachtende({
  naar,
  voornaam,
  from,
}: {
  naar: string;
  voornaam: string;
  from?: string;
}) {
  const { naam: afzenderNaam, email: afzenderEmail } = parseFrom(from);
  const body = `
<p>Hoi ${voornaam},</p>
<p>Welkom alvast! We zouden graag aan de slag gaan met jouw zoektocht, maar we missen nog je CV.</p>
<p>Kun je 'm zo snel mogelijk doorsturen? Antwoord gewoon op deze mail met je CV als bijlage — dan kunnen we direct verder.</p>
<p>Heb je 'm op dit moment niet beschikbaar? Stuur even kort terug wanneer wel, dan houden we er rekening mee.</p>
<p>Bedankt!</p>`;
  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: "Wij missen nog je CV — kun je 'm doorsturen?",
    html: brandedLayout({ titel: "We missen nog je CV", body, afzenderNaam, afzenderEmail }),
  });
}

/**
 * Plaatsing afgekeurd door admin — meld dit ook aan backoffice.
 */
export async function sendPlaatsingAfgekeurdNaarBackoffice({
  kandidaatNaam,
  bedrijf,
  reden,
  afgekeurdDoor,
  oorspronkelijkeAanmelder,
  from,
}: {
  kandidaatNaam: string;
  bedrijf: string;
  reden: string;
  afgekeurdDoor: { voornaam: string; achternaam: string; email: string };
  oorspronkelijkeAanmelder?: { voornaam: string; achternaam: string } | null;
  from?: string;
}) {
  const body = `
<p><b style="color:#b91c1c;">Een eerder aangemelde plaatsing is afgekeurd door een admin.</b></p>

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;">
  <tr><td style="padding:6px 0;color:#666;width:35%;">Kandidaat</td><td style="padding:6px 0;font-weight:600;">${kandidaatNaam}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Klant</td><td style="padding:6px 0;font-weight:600;">${bedrijf}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Afgekeurd door</td><td style="padding:6px 0;font-weight:600;">${afgekeurdDoor.voornaam} ${afgekeurdDoor.achternaam} (${afgekeurdDoor.email})</td></tr>
  ${oorspronkelijkeAanmelder ? `<tr><td style="padding:6px 0;color:#666;">Oorspronkelijk aangemeld door</td><td style="padding:6px 0;">${oorspronkelijkeAanmelder.voornaam} ${oorspronkelijkeAanmelder.achternaam}</td></tr>` : ""}
</table>

<h3 style="color:#b91c1c;margin:24px 0 8px 0;font-size:15px;border-bottom:2px solid #b91c1c;padding-bottom:4px;">Reden</h3>
<p style="white-space:pre-wrap;background-color:#fef2f2;border-left:3px solid #b91c1c;padding:12px;margin:0;">${reden}</p>

<p style="margin-top:24px;color:#666;font-size:12px;">De financiële afhandeling van deze plaatsing kan worden gestopt.</p>
`;

  const result = await resend.emails.send({
    from: from ?? FROM,
    to: "backoffice@grywo.nl",
    cc: afgekeurdDoor.email ? [afgekeurdDoor.email] : undefined,
    subject: `Plaatsing afgekeurd: ${kandidaatNaam} bij ${bedrijf}`,
    html: brandedLayout({ titel: `Plaatsing afgekeurd`, body, merk: "noah" }),
  });
  if (result.error) {
    throw new Error(`Resend afgewezen: ${result.error.message}`);
  }
  return result;
}

/**
 * Help-vraag of probleem-melding naar super-admin (Yorith).
 */
export async function sendHelpVraagNaarYorith({
  type,
  bericht,
  afzender,
  tenantNaam,
  naar,
}: {
  type: "vraag" | "probleem";
  bericht: string;
  afzender: { naam: string; email: string; rol: string };
  tenantNaam: string;
  naar: string;
}) {
  const typeLabel = type === "vraag" ? "Vraag" : "Probleem";
  const accentKleur = type === "probleem" ? "#b91c1c" : GRYWO_KLEUR;

  const body = `
<p><b>Er is een ${typeLabel.toLowerCase()} binnengekomen via Noah ATS.</b></p>

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;">
  <tr><td style="padding:6px 0;color:#666;width:35%;">Van</td><td style="padding:6px 0;font-weight:600;">${afzender.naam} (${afzender.rol})</td></tr>
  <tr><td style="padding:6px 0;color:#666;">E-mail</td><td style="padding:6px 0;"><a href="mailto:${afzender.email}" style="color:${GRYWO_KLEUR};">${afzender.email}</a></td></tr>
  <tr><td style="padding:6px 0;color:#666;">Bureau</td><td style="padding:6px 0;font-weight:600;">${tenantNaam}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Type</td><td style="padding:6px 0;font-weight:600;color:${accentKleur};">${typeLabel}</td></tr>
</table>

<h3 style="color:${accentKleur};margin:24px 0 8px 0;font-size:15px;border-bottom:2px solid ${accentKleur};padding-bottom:4px;">Bericht</h3>
<p style="white-space:pre-wrap;background-color:#f9f9fb;border-left:3px solid ${accentKleur};padding:12px;margin:0;">${bericht}</p>

<p style="margin-top:24px;color:#666;font-size:12px;">Reply naar deze mail of reageer via de notificatie in Noah.</p>
`;

  const result = await resend.emails.send({
    from: FROM,
    to: naar,
    replyTo: afzender.email || undefined,
    subject: `[${typeLabel}] ${afzender.naam} — ${tenantNaam}`,
    html: brandedLayout({ titel: `${typeLabel} via Noah ATS`, body, merk: "noah" }),
  });
  if (result.error) {
    throw new Error(`Resend afgewezen: ${result.error.message}`);
  }
  return result;
}

/**
 * Interne intake afgerond — kandidaat krijgt bevestiging.
 */
export async function sendIntakeAfgerond({
  naar,
  kandidaatVoornaam,
  from,
}: {
  naar: string;
  kandidaatVoornaam: string;
  from?: string;
}) {
  const body = `
<p>Hoi ${kandidaatVoornaam},</p>
<p>We hebben je interne intake afgerond. Vanaf nu gaan we voor je aan de slag om de juiste match te vinden — we houden je op de hoogte van elke stap.</p>
<p>Heb je vragen of wil je iets aanpassen aan je voorkeuren? Reply gerust op deze mail.</p>
<p>Veel succes!</p>`;
  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: "Je intake is afgerond",
    html: brandedLayout({ titel: "Intake afgerond", body }),
  });
}

/**
 * In proces — setter is begonnen met zoeken (bellijst opgeslagen).
 */
export async function sendInProcesGestart({
  naar,
  kandidaatVoornaam,
  from,
}: {
  naar: string;
  kandidaatVoornaam: string;
  from?: string;
}) {
  const body = `
<p>Hoi ${kandidaatVoornaam},</p>
<p>We zijn gestart met het zoeken naar een nieuwe uitdaging voor je. Vanaf nu benaderen we de relevante opdrachtgevers — we houden je op de hoogte zodra er een match is.</p>
<p>Tot snel!</p>`;
  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: "We zijn gestart met je zoektocht",
    html: brandedLayout({ titel: "Op zoek naar jouw volgende stap", body }),
  });
}

/**
 * Bevestiging 1e gesprek — kandidaat krijgt afspraak-details.
 */
export async function sendGesprek1Bevestiging({
  naar,
  kandidaatVoornaam,
  bedrijf,
  kennismaking_op,
  contactpersoon,
  contact_telefoon,
  locatie_url,
  from,
}: {
  naar: string;
  kandidaatVoornaam: string;
  bedrijf: string | null;
  kennismaking_op?: string | null;
  contactpersoon?: string | null;
  contact_telefoon?: string | null;
  locatie_url?: string | null;
  from?: string;
}) {
  const tijd = kennismaking_op
    ? new Date(kennismaking_op).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })
    : null;
  const body = `
<p>Hoi ${kandidaatVoornaam},</p>
<p>Hierbij de bevestiging van je 1e gesprek${bedrijf ? ` bij <b>${bedrijf}</b>` : ""}.</p>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9fb;border-radius:8px;padding:16px;margin:16px 0;border-collapse:separate;">
  ${tijd ? `<tr><td style="padding:6px 0;color:#666;width:35%;">Datum &amp; tijd</td><td style="padding:6px 0;font-weight:600;">${tijd}</td></tr>` : ""}
  ${bedrijf ? `<tr><td style="padding:6px 0;color:#666;">Bedrijf</td><td style="padding:6px 0;font-weight:600;">${bedrijf}</td></tr>` : ""}
  ${contactpersoon ? `<tr><td style="padding:6px 0;color:#666;">Contactpersoon</td><td style="padding:6px 0;font-weight:600;">${contactpersoon}</td></tr>` : ""}
  ${contact_telefoon ? `<tr><td style="padding:6px 0;color:#666;">Telefoon</td><td style="padding:6px 0;font-weight:600;">${contact_telefoon}</td></tr>` : ""}
  ${locatie_url ? `<tr><td style="padding:6px 0;color:#666;">Locatie</td><td style="padding:6px 0;"><a href="${locatie_url}" style="color:${GRYWO_KLEUR};">Bekijk op Google Maps</a></td></tr>` : ""}
</table>
<p>Veel succes! Laat het weten als er iets onverwachts gebeurt.</p>`;
  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: `Bevestiging 1e gesprek${bedrijf ? ` bij ${bedrijf}` : ""}`,
    html: brandedLayout({ titel: "Je 1e gesprek staat gepland", body }),
  });
}

/**
 * Succes met 2e gesprek.
 */
export async function sendGesprek2Succes({
  naar,
  kandidaatVoornaam,
  bedrijf,
  from,
}: {
  naar: string;
  kandidaatVoornaam: string;
  bedrijf?: string | null;
  from?: string;
}) {
  const body = `
<p>Hoi ${kandidaatVoornaam},</p>
<p>Je gaat door naar de 2e gespreksronde${bedrijf ? ` bij <b>${bedrijf}</b>` : ""}. Heel goed gedaan!</p>
<p>We duimen voor je — laat het weten hoe het gaat.</p>`;
  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: `Succes met je 2e gesprek${bedrijf ? ` bij ${bedrijf}` : ""}`,
    html: brandedLayout({ titel: "Door naar de 2e ronde", body }),
  });
}

/**
 * Plaatsing — gefeliciteerd.
 */
export async function sendKandidaatPlaatsing({
  naar,
  kandidaatVoornaam,
  from,
}: {
  naar: string;
  kandidaatVoornaam: string;
  from?: string;
}) {
  const body = await renderMailTemplate("kandidaat_plaatsing", { voornaam: kandidaatVoornaam });
  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: "Gefeliciteerd met je nieuwe baan!",
    html: brandedLayout({ titel: "Je bent geplaatst!", body }),
  });
}

/**
 * Algemene afwijzing (status=afgewezen op kandidaat).
 */
/**
 * Chrome-extensie download-blok voor in welkomstmails.
 * Eén klik = installeren via Chrome Web Store.
 */
const CHROME_EXTENSIE_URL =
  "https://chrome.google.com/webstore/detail/fcbfdbgcpigefifjlegkeihcgokgeomk";

function extensieBlok(): string {
  return `
<div style="background-color:#eef0ff;border:1px solid #d4d7f5;border-radius:8px;padding:18px 20px;margin:20px 0;">
  <div style="font-size:14px;font-weight:700;color:${GRYWO_KLEUR};margin-bottom:6px;">📥 Installeer de Chrome-extensie</div>
  <p style="margin:0 0 12px 0;font-size:13px;color:#444;line-height:1.5;">
    Maakt <b>Robin</b> en <b>Jobdigger</b> direct bruikbaar binnen Noah ATS.
    Vacature-exports uit Jobdigger worden automatisch toegevoegd aan je bellijst in Noah.
  </p>
  <a href="${CHROME_EXTENSIE_URL}" style="display:inline-block;background-color:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;font-size:13px;">
    Installeer in Chrome
  </a>
  <p style="margin:10px 0 0 0;font-size:11px;color:#888;">
    Werkt alleen in Google Chrome. Eenmalig installeren — werkt daarna automatisch.
  </p>
</div>`;
}

/**
 * Welkomstmail voor nieuwe interne user (setter / recruiter / admin).
 */
export async function sendWelkomstmailUser({
  naar,
  voornaam,
  email,
  wachtwoord,
  rolLabel,
  bedrijf,
}: {
  naar: string;
  voornaam: string;
  email: string;
  wachtwoord: string;
  rolLabel: string;
  bedrijf: string;
}) {
  const intro = await renderMailTemplate("welkom_user", { voornaam, rol_label: rolLabel, bedrijf });
  const loginBlok = inlogBlok(email, wachtwoord);
  const body = `${intro}\n${loginBlok}\n${extensieBlok()}`;
  return resend.emails.send({
    from: FROM,
    to: naar,
    subject: `Welkom bij Noah ATS — ${bedrijf}`,
    html: brandedLayout({ titel: "Welkom bij Noah ATS", body, merk: "noah" }),
  });
}

/**
 * Welkomstmail voor contactpersoon van nieuw aangemeld bureau (hoofd-admin).
 */
export async function sendWelkomstmailBureau({
  naar,
  voornaam,
  email,
  wachtwoord,
  bedrijf,
  from,
}: {
  naar: string;
  voornaam: string;
  email: string;
  wachtwoord: string;
  bedrijf: string;
  from?: string;
}) {
  const intro = await renderMailTemplate("welkom_bureau", { voornaam, bedrijf });
  const loginBlok = inlogBlok(email, wachtwoord);

  const dashboardKnop = `
<div style="text-align:center;margin:24px 0;">
  <a href="${APP_URL}/dashboard"
     style="display:inline-block;background-color:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:14px;">
    Open je dashboard
  </a>
</div>`;

  const eersteStappen = `
<h3 style="color:${GRYWO_KLEUR};margin:24px 0 8px 0;font-size:15px;border-bottom:2px solid ${GRYWO_KLEUR};padding-bottom:4px;">In 4 stappen klaar</h3>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0;">
  <tr><td style="padding:8px 0;width:30px;font-weight:bold;color:${GRYWO_KLEUR};">1.</td><td style="padding:8px 0;">Vul je bedrijfsgegevens aan op het dashboard (contactpersoon, telefoon, adres).</td></tr>
  <tr><td style="padding:8px 0;font-weight:bold;color:${GRYWO_KLEUR};">2.</td><td style="padding:8px 0;">Voeg je recruiters toe via &quot;Users&quot;.</td></tr>
  <tr><td style="padding:8px 0;font-weight:bold;color:${GRYWO_KLEUR};">3.</td><td style="padding:8px 0;">Koppel je zakelijke mailbox via Instellingen, zodat voorstellen vanaf jouw domein vertrekken.</td></tr>
  <tr><td style="padding:8px 0;font-weight:bold;color:${GRYWO_KLEUR};">4.</td><td style="padding:8px 0;">Vragen of hulp nodig? Bel <a href="tel:0854016082" style="color:${GRYWO_KLEUR};font-weight:bold;">085-4016082</a> &mdash; wij regelen de rest achter de schermen.</td></tr>
</table>`;

  const body = `${intro}\n${loginBlok}\n${dashboardKnop}\n${eersteStappen}\n${extensieBlok()}`;
  const result = await resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: `Welkom bij Noah ATS — ${bedrijf}`,
    html: brandedLayout({ titel: "Welkom bij Noah ATS", body, merk: "noah" }),
  });
  if (result.error) {
    throw new Error(`Resend afgewezen: ${result.error.message}`);
  }
  return result;
}

/**
 * Verstuurt de uitnodiging om de verwerkersovereenkomst (DPA) digitaal te ondertekenen.
 * De link bevat een unieke token; ontvanger hoeft niet in te loggen.
 */
export async function sendDpaTerOndertekening({
  naar,
  contactNaam,
  bureauNaam,
  token,
}: {
  naar: string;
  contactNaam: string;
  bureauNaam: string;
  token: string;
}) {
  const url = `${APP_URL}/dpa-tekenen/${token}`;
  const body = `
<p>Hallo ${contactNaam || ""},</p>
<p>Voor je live gaat met Noah ATS sluiten we volgens de AVG een <b>verwerkersovereenkomst (DPA)</b>.
Dit is wettelijk verplicht en regelt hoe wij namens <b>${bureauNaam}</b> jullie kandidaat-data verwerken.</p>

<p>Klik op de knop hieronder om de overeenkomst door te lezen en digitaal te ondertekenen — duurt minder dan 2 minuten.</p>

<div style="margin:20px 0;text-align:center;">
  <a href="${url}" style="display:inline-block;background-color:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:14px;">
    Onderteken de verwerkersovereenkomst
  </a>
</div>

<p style="font-size:13px;color:#666;">
Of kopieer deze link in je browser:<br>
<a href="${url}" style="color:${GRYWO_KLEUR};">${url}</a>
</p>

<p style="font-size:12px;color:#888;margin-top:18px;">Vragen? Mail info@grywo.nl of bel 085-4016082.</p>`;

  const result = await resend.emails.send({
    from: FROM,
    to: naar,
    subject: `Onderteken verwerkersovereenkomst — Noah ATS · ${bureauNaam}`,
    html: brandedLayout({ titel: "Verwerkersovereenkomst klaar voor ondertekening", body }),
  });
  if (result.error) throw new Error(`Resend afgewezen: ${result.error.message}`);
  return result;
}

/**
 * Bevestiging naar bureau-admin nadat hij/zij de DPA heeft getekend.
 */
export async function sendDpaGetekendBevestiging({
  naar,
  contactNaam,
  bureauNaam,
  token,
}: {
  naar: string;
  contactNaam: string;
  bureauNaam: string;
  token: string;
}) {
  const url = `${APP_URL}/dpa-tekenen/${token}`;
  const body = `
<p>Hallo ${contactNaam || ""},</p>
<p>Bedankt voor het ondertekenen van de verwerkersovereenkomst voor <b>${bureauNaam}</b>.</p>
<p>Een kopie van de getekende DPA blijft toegankelijk via onderstaande link. Beide partijen hebben nu een rechtsgeldige overeenkomst.</p>

<div style="margin:20px 0;text-align:center;">
  <a href="${url}" style="display:inline-block;background-color:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:14px;">
    Bekijk getekende DPA
  </a>
</div>

<p style="font-size:12px;color:#888;margin-top:18px;">Bij vragen: info@grywo.nl · 085-4016082.</p>`;

  return resend.emails.send({
    from: FROM,
    to: naar,
    subject: `✓ Verwerkersovereenkomst getekend — ${bureauNaam}`,
    html: brandedLayout({ titel: "DPA succesvol getekend", body }),
  });
}

/**
 * Interne notificatie naar GRYWO dat een bureau heeft getekend.
 */
export async function sendDpaGetekendIntern({
  bureauNaam,
  ondertekenaarNaam,
  ondertekenaarEmail,
  ondertekenaarFunctie,
  token,
}: {
  bureauNaam: string;
  ondertekenaarNaam: string;
  ondertekenaarEmail: string;
  ondertekenaarFunctie: string;
  token: string;
}) {
  const url = `${APP_URL}/dpa-tekenen/${token}`;
  const body = `
<p>Een bureau heeft zojuist de verwerkersovereenkomst getekend:</p>

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9fb;border-radius:8px;padding:16px;margin:16px 0;border-collapse:separate;">
  <tr><td style="padding:6px 0;color:#666;width:30%;">Bureau</td><td style="padding:6px 0;font-weight:600;">${bureauNaam}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Ondertekend door</td><td style="padding:6px 0;font-weight:600;">${ondertekenaarNaam} (${ondertekenaarFunctie})</td></tr>
  <tr><td style="padding:6px 0;color:#666;">E-mail</td><td style="padding:6px 0;">${ondertekenaarEmail}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Tijdstip</td><td style="padding:6px 0;">${new Date().toLocaleString("nl-NL")}</td></tr>
</table>

<div style="margin:20px 0;text-align:center;">
  <a href="${url}" style="display:inline-block;background-color:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:14px;">
    Bekijk getekende DPA
  </a>
</div>`;

  return resend.emails.send({
    from: FROM,
    to: "yorith@grywo.nl",
    subject: `[GRYWO] DPA getekend — ${bureauNaam}`,
    html: brandedLayout({ titel: "DPA getekend", body }),
  });
}

/**
 * Verstuurt de uitnodiging om individuele NDA / gebruiksvoorwaarden te tekenen.
 */
export async function sendAkkoordTerOndertekening({
  naar,
  naam,
  type,
  token,
}: {
  naar: string;
  naam: string;
  type: "nda_setter" | "gebruiksvoorwaarden";
  token: string;
}) {
  const url = `${APP_URL}/tekenen/${token}`;
  const titel = type === "nda_setter" ? "Geheimhoudingsverklaring (NDA)" : "Gebruiksvoorwaarden Noah ATS";
  const uitleg = type === "nda_setter"
    ? "Als GRYWO-setter krijg je toegang tot kandidaten van meerdere bureaus. Onze geheimhoudingsverklaring legt vast hoe je met deze data omgaat — verplicht onder AVG art. 32 lid 4."
    : "Voordat je live gaat met Noah ATS vragen we eenmalig akkoord op onze gebruiksvoorwaarden. Beschermt jou én de kandidaten die je beheert.";

  const body = `
<p>Hallo ${naam || ""},</p>
<p>${uitleg}</p>

<div style="margin:20px 0;text-align:center;">
  <a href="${url}" style="display:inline-block;background-color:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:14px;">
    Lees en onderteken
  </a>
</div>

<p style="font-size:13px;color:#666;">
Of kopieer deze link in je browser:<br>
<a href="${url}" style="color:${GRYWO_KLEUR};">${url}</a>
</p>

<p style="font-size:12px;color:#888;margin-top:18px;">Vragen? Mail info@grywo.nl of bel 085-4016082.</p>`;

  const result = await resend.emails.send({
    from: FROM,
    to: naar,
    subject: `${titel} — ondertekening vereist`,
    html: brandedLayout({ titel, body, merk: "noah" }),
  });
  if (result.error) throw new Error(`Resend afgewezen: ${result.error.message}`);
  return result;
}

/**
 * Bureau-abonnement: Stripe Checkout link mailen aan bureau-contact.
 * Bureau klikt link → betaalt setup-fee + maand 1 → abonnement actief.
 */
export async function sendBureauStripeMail({
  naar,
  contactNaam,
  bureauNaam,
  planLabel,
  setupFeeCent,
  maandPrijsCent,
  betaalUrl,
}: {
  naar: string;
  contactNaam: string;
  bureauNaam: string;
  planLabel: string;
  setupFeeCent: number;
  maandPrijsCent: number;
  betaalUrl: string;
}) {
  const setup = `€ ${(setupFeeCent / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`;
  const maand = `€ ${(maandPrijsCent / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`;
  const totaal = `€ ${((setupFeeCent + maandPrijsCent) / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`;

  const body = `
<p>Hallo ${contactNaam || ""},</p>
<p>Top dat ${bureauNaam} aan de slag gaat met Noah ATS! Om je account te activeren rond je nu eenmalig de betaling af via Stripe.</p>

<div style="background:#f8f9ff;border:1px solid #d4d7f5;border-radius:8px;padding:18px 20px;margin:18px 0;">
  <div style="font-size:14px;color:#333;margin-bottom:8px;font-weight:600;">Noah ATS — ${planLabel}</div>
  <table cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;color:#333;">
    <tr><td style="padding:4px 0;">Setup-fee (eenmalig)</td><td style="padding:4px 0;text-align:right;">${setup}</td></tr>
    <tr><td style="padding:4px 0;">Maand 1 — ${planLabel}</td><td style="padding:4px 0;text-align:right;">${maand}</td></tr>
    <tr><td colspan="2" style="border-top:1px solid #ccc;padding-top:8px;"></td></tr>
    <tr><td style="padding:4px 0;font-weight:700;">Te betalen nu</td><td style="padding:4px 0;text-align:right;font-weight:700;color:${GRYWO_KLEUR};">${totaal}</td></tr>
  </table>
  <div style="font-size:11px;color:#888;margin-top:10px;">Daarna ${maand} per maand — automatisch geïncasseerd. Maandelijks opzegbaar.</div>
</div>

<div style="text-align:center;margin:24px 0;">
  <a href="${betaalUrl}" style="display:inline-block;background-color:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:bold;font-size:15px;">
    Veilig betalen via Stripe
  </a>
</div>

<p style="font-size:13px;color:#555;">
Je kunt betalen via:
</p>
<ul style="font-size:13px;color:#555;padding-left:20px;margin:6px 0;">
  <li><b>SEPA Direct Debit</b> (automatische maandelijkse incasso van je zakelijke rekening)</li>
  <li><b>Creditcard</b> (maandelijks automatisch afgeschreven)</li>
</ul>
<p style="font-size:13px;color:#555;">
Na de eenmalige betaling wordt het maandbedrag <b>automatisch elke maand</b> van je rekening of card afgeschreven. <b>Maandelijks opzegbaar</b> — je kan via Stripe altijd op- en afzeggen of je betaalmethode wijzigen. Zodra betaald, ontvang je de inloggegevens.
</p>

<p style="font-size:12px;color:#888;margin-top:18px;">
Vragen? Mail <a href="mailto:info@grywo.nl">info@grywo.nl</a> of bel 085-4016082.
</p>`;

  const result = await resend.emails.send({
    from: FROM,
    to: naar,
    subject: `Noah ATS — activeer je ${planLabel} abonnement (${totaal})`,
    html: brandedLayout({ titel: "Activeer je abonnement", body, merk: "noah" }),
  });
  if (result.error) throw new Error(`Resend afgewezen: ${result.error.message}`);
  return result;
}

/**
 * Setter-stoel: Stripe betaal-link mailen aan nieuwe setter.
 * Setter kan pas inloggen nadat hij betaald heeft.
 */
export async function sendSetterStripeMail({
  naar,
  voornaam,
  betaalUrl,
  prijsCent,
}: {
  naar: string;
  voornaam: string;
  betaalUrl: string;
  prijsCent: number;
}) {
  const prijs = `€ ${(prijsCent / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`;
  const body = `
<p>Hallo ${voornaam || ""},</p>
<p>Welkom bij Noah ATS. Voordat je toegang krijgt, sluiten we eenmalig je <b>setter-stoel</b> abonnement af.</p>

<div style="background:#f8f9ff;border:1px solid #d4d7f5;border-radius:8px;padding:18px 20px;margin:18px 0;">
  <div style="font-size:14px;color:#333;margin-bottom:4px;">Setter-stoel — maandelijks</div>
  <div style="font-size:28px;font-weight:800;color:${GRYWO_KLEUR};">${prijs}<span style="font-size:14px;font-weight:400;color:#666;"> / mnd</span></div>
  <div style="font-size:12px;color:#888;margin-top:6px;">Maandelijks opzegbaar · Stripe verwerkt de betaling</div>
</div>

<div style="text-align:center;margin:22px 0;">
  <a href="${betaalUrl}" style="display:inline-block;background-color:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:bold;font-size:15px;">
    Abonnement afsluiten
  </a>
</div>

<p style="font-size:13px;color:#555;">
Wat krijg je voor je abonnement?
</p>
<ul style="font-size:13px;color:#555;padding-left:20px;">
  <li>Volledige toegang tot Noah ATS</li>
  <li>Eigen kandidaten + voorstellen</li>
  <li>Robin AI + Jobdigger</li>
  <li>Inbox-koppeling (Hostnet)</li>
  <li>Coaching dashboard</li>
</ul>

<p style="font-size:12px;color:#888;margin-top:18px;">
Zodra de betaling is verwerkt, krijg je een mail met je inloggegevens.<br>
Vragen? Mail <a href="mailto:info@grywo.nl">info@grywo.nl</a> of bel 085-4016082.
</p>`;

  const result = await resend.emails.send({
    from: FROM,
    to: naar,
    subject: "Noah ATS — sluit je setter-abonnement af",
    html: brandedLayout({ titel: "Setter-abonnement", body, merk: "noah" }),
  });
  if (result.error) throw new Error(`Resend afgewezen: ${result.error.message}`);
  return result;
}

/**
 * Bevestiging na ondertekening individuele NDA / gebruiksvoorwaarden.
 */
export async function sendAkkoordBevestiging({
  naar,
  naam,
  type,
  token,
}: {
  naar: string;
  naam: string;
  type: "nda_setter" | "gebruiksvoorwaarden";
  token: string;
}) {
  const url = `${APP_URL}/tekenen/${token}`;
  const titel = type === "nda_setter" ? "Geheimhoudingsverklaring" : "Gebruiksvoorwaarden";
  const body = `
<p>Hallo ${naam},</p>
<p>Bedankt voor het ondertekenen van de ${titel.toLowerCase()}. Je kunt nu volledig gebruikmaken van Noah ATS.</p>

<div style="margin:20px 0;text-align:center;">
  <a href="${url}" style="display:inline-block;background-color:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:14px;">
    Bekijk getekende versie
  </a>
</div>

<p style="font-size:12px;color:#888;margin-top:18px;">Bewaar deze mail. Bij vragen: info@grywo.nl.</p>`;

  return resend.emails.send({
    from: FROM,
    to: naar,
    subject: `✓ ${titel} getekend`,
    html: brandedLayout({ titel: `${titel} getekend`, body, merk: "noah" }),
  });
}

/**
 * Magic-link mail voor /mijn-data — kandidaat krijgt persoonlijke link
 * waarmee hij/zij eigen gegevens kan bekijken of laten verwijderen.
 */
export async function sendMijnDataLink({
  naar,
  token,
}: {
  naar: string;
  token: string;
}) {
  const url = `${APP_URL}/mijn-data/${token}`;
  const body = `
<p>Hallo,</p>
<p>Je hebt een verzoek ingediend om je persoonsgegevens in te zien of te laten verwijderen uit Noah ATS.</p>

<p>Klik op de knop hieronder. De link is <b>1 uur geldig</b> en kan eenmalig gebruikt worden.</p>

<div style="margin:20px 0;text-align:center;">
  <a href="${url}" style="display:inline-block;background-color:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:14px;">
    Bekijk mijn gegevens
  </a>
</div>

<p style="font-size:13px;color:#666;">
Of kopieer deze link in je browser:<br>
<a href="${url}" style="color:${GRYWO_KLEUR};">${url}</a>
</p>

<p style="font-size:12px;color:#888;margin-top:18px;">
Geen verzoek ingediend? Negeer deze mail. Bij vragen: info@grywo.nl
</p>`;

  return resend.emails.send({
    from: FROM,
    to: naar,
    subject: "Je inzage-link — Noah ATS",
    html: brandedLayout({ titel: "Je persoonlijke inzage-link", body, merk: "noah" }),
  });
}

function inlogBlok(email: string, wachtwoord: string) {
  return `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9fb;border-radius:8px;padding:16px;margin:16px 0;border-collapse:separate;">
  <tr><td style="padding:6px 0;color:#666;width:30%;">E-mail</td><td style="padding:6px 0;font-weight:600;">${email}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Wachtwoord</td><td style="padding:6px 0;font-family:monospace;font-weight:600;">${wachtwoord}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Inloggen</td><td style="padding:6px 0;"><a href="${APP_URL}/login" style="color:${GRYWO_KLEUR};font-weight:600;">${APP_URL}/login</a></td></tr>
</table>
<p style="font-size:12px;color:#888;margin:8px 0 0 0;">Tip: wijzig je wachtwoord na de eerste keer inloggen via Instellingen.</p>`;
}

export async function sendKandidaatStatusAfwijzing({
  naar,
  kandidaatVoornaam,
  from,
}: {
  naar: string;
  kandidaatVoornaam: string;
  from?: string;
}) {
  const body = await renderMailTemplate("kandidaat_status_afwijzing", { voornaam: kandidaatVoornaam });
  return resend.emails.send({
    from: from ?? FROM,
    to: naar,
    subject: "Update vanuit GRYWO",
    html: brandedLayout({ titel: "Bedankt voor je tijd", body }),
  });
}

/**
 * Vraag aan opdrachtgever om arbeidscontract aan te leveren voor verificatie.
 * Magic-link naar /contract-controle/[token].
 */
export async function sendContractControleUitnodiging({
  naar,
  contactNaam,
  kandidaatNaam,
  token,
}: {
  naar: string;
  contactNaam: string;
  kandidaatNaam: string;
  token: string;
}) {
  const url = `${APP_URL}/contract-controle/${token}`;
  const body = `
<p>Hallo ${contactNaam || ""},</p>
<p>Bedankt voor de plaatsing van <b>${kandidaatNaam}</b>! Voor het opmaken van de factuur (15% van het bruto jaarsalaris) hebben we een kopie van het arbeidscontract nodig ter verificatie van het overeengekomen salaris.</p>

<div style="background:#f4f4f7;border-left:4px solid ${GRYWO_KLEUR};padding:14px 16px;margin:18px 0;font-size:13px;color:#333;">
  <b style="color:${GRYWO_KLEUR};">⚖ Strenge AVG-regels</b><br>
  Wij hanteren strikte privacy-waarborgen conform de AVG:
  <ul style="margin:8px 0 0 18px;padding:0;color:#444;font-size:12.5px;">
    <li>Het contract wordt geautomatiseerd geanalyseerd; <b>alle PII wordt zwart gemaakt</b> (BSN, IBAN, privé-adres, geboortedatum, telefoon, etc.).</li>
    <li>Het <b>origineel wordt binnen 24 uur verwijderd</b> (AVG art. 5 — dataminimalisatie).</li>
    <li>Wij bewaren <b>alleen de geredacteerde versie + samenvatting</b>, 7 jaar lang (fiscale bewaarplicht).</li>
    <li>Toegang is gelogd en beperkt tot geautoriseerde GRYWO-medewerkers.</li>
  </ul>
</div>

<p>Klik op de knop hieronder om het contract veilig te uploaden — duurt minder dan 2 minuten.</p>

<div style="margin:20px 0;text-align:center;">
  <a href="${url}" style="display:inline-block;background-color:${GRYWO_KLEUR};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:14px;">
    Upload contract veilig
  </a>
</div>

<p style="font-size:13px;color:#666;">
Of kopieer deze link in je browser:<br>
<a href="${url}" style="color:${GRYWO_KLEUR};">${url}</a>
</p>

<p style="font-size:12px;color:#888;margin-top:18px;">Vragen? Mail backoffice@grywo.nl of bel 085-4016082.</p>`;

  const result = await resend.emails.send({
    from: FROM,
    to: naar,
    subject: `Contract-verificatie voor ${kandidaatNaam} — GRYWO`,
    html: brandedLayout({ titel: "Verzoek tot contract-aanlevering", body }),
  });
  if (result.error) throw new Error(`Resend afgewezen: ${result.error.message}`);
  return result;
}

/**
 * Mail naar GRYWO backoffice met de geredacteerde PDF + samenvatting als attachments.
 * Bevat een uitgebreid salaris-overzicht met alle componenten + fee-berekening per percentage.
 */
type SalarisInfo = {
  brutoMaandsalaris: number | null;
  urenPerWeek: number | null;
  vakantiegeldPct: number | null;
  dertiendeMaand: boolean;
  dertiendeMaandBedrag: number | null;
  eindejaarsuitkering: boolean;
  eindejaarsuitkeringBedrag: number | null;
  vasteBonus: number | null;
  cao: string | null;
  brutoJaarsalarisBerekend: number | null;
  brutoJaarsalarisLetterlijk: number | null;
};

export async function sendContractNaarBackoffice({
  kandidaatNaam,
  werkgever,
  brutoJaarsalaris,
  startdatum,
  functie,
  salaris,
  geredacteerdePdf,
  samenvattingPdf,
}: {
  kandidaatNaam: string;
  werkgever: string | null;
  brutoJaarsalaris: number | null;
  startdatum: string | null;
  functie: string | null;
  salaris: SalarisInfo;
  geredacteerdePdf: Uint8Array;
  samenvattingPdf: Uint8Array;
}) {
  const eur = (n: number | null) => n != null ? `€ ${n.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}` : "—";
  const totaal = brutoJaarsalaris ?? 0;

  // Berekende breakdown
  const maand = salaris.brutoMaandsalaris ?? 0;
  const jaarBasis = maand * 12;
  const vakPct = salaris.vakantiegeldPct ?? 8;
  const vakgeld = (jaarBasis * vakPct) / 100;
  const dertiende = salaris.dertiendeMaand ? (salaris.dertiendeMaandBedrag ?? maand) : 0;
  const eindejaar = salaris.eindejaarsuitkering ? (salaris.eindejaarsuitkeringBedrag ?? 0) : 0;
  const bonus = salaris.vasteBonus ?? 0;

  const verschilWaarschuwing =
    salaris.brutoJaarsalarisLetterlijk &&
    salaris.brutoJaarsalarisBerekend &&
    Math.abs(salaris.brutoJaarsalarisLetterlijk - salaris.brutoJaarsalarisBerekend) > 100
      ? `<p style="margin-top:12px;padding:10px;background:#fff7ed;border-left:4px solid #f59e0b;color:#92400e;font-size:12px;">
          ⚠ <b>Let op:</b> contract noemt letterlijk ${eur(salaris.brutoJaarsalarisLetterlijk)} maar berekening op basis van componenten komt uit op ${eur(salaris.brutoJaarsalarisBerekend)} (verschil ${eur(Math.abs(salaris.brutoJaarsalarisLetterlijk - salaris.brutoJaarsalarisBerekend))}). Even verifiëren.
        </p>`
      : "";

  const body = `
<p>Een opdrachtgever heeft een arbeidscontract aangeleverd. Hieronder de geverifieerde salaris-opbouw en fee-berekening.</p>

<h3 style="color:${GRYWO_KLEUR};margin:20px 0 8px 0;font-size:15px;border-bottom:2px solid ${GRYWO_KLEUR};padding-bottom:4px;">Basisgegevens</h3>
<table style="width:100%;font-size:13px;color:#333;">
  <tr><td style="padding:3px 0;color:#666;width:170px;">Kandidaat</td><td style="padding:3px 0;"><b>${kandidaatNaam}</b></td></tr>
  <tr><td style="padding:3px 0;color:#666;">Werkgever</td><td style="padding:3px 0;">${werkgever ?? "—"}</td></tr>
  <tr><td style="padding:3px 0;color:#666;">Functie</td><td style="padding:3px 0;">${functie ?? "—"}</td></tr>
  <tr><td style="padding:3px 0;color:#666;">Startdatum</td><td style="padding:3px 0;">${startdatum ? new Date(startdatum).toLocaleDateString("nl-NL") : "—"}</td></tr>
  <tr><td style="padding:3px 0;color:#666;">CAO</td><td style="padding:3px 0;">${salaris.cao ?? "Niet vermeld"}</td></tr>
  <tr><td style="padding:3px 0;color:#666;">Uren/week</td><td style="padding:3px 0;">${salaris.urenPerWeek ? `${salaris.urenPerWeek} uur` : "—"}</td></tr>
</table>

<h3 style="color:${GRYWO_KLEUR};margin:20px 0 8px 0;font-size:15px;border-bottom:2px solid ${GRYWO_KLEUR};padding-bottom:4px;">Salaris-opbouw</h3>
<table style="width:100%;font-size:13px;color:#333;">
  <tr><td style="padding:3px 0;color:#666;">Bruto maandsalaris × 12</td><td style="padding:3px 0;text-align:right;">${eur(maand)} × 12 = <b>${eur(jaarBasis)}</b></td></tr>
  <tr><td style="padding:3px 0;color:#666;">Vakantiegeld (${vakPct}%)</td><td style="padding:3px 0;text-align:right;">+ ${eur(vakgeld)}</td></tr>
  <tr><td style="padding:3px 0;color:#666;">13e maand${salaris.dertiendeMaand ? "" : " (n.v.t.)"}</td><td style="padding:3px 0;text-align:right;">${dertiende ? "+ " + eur(dertiende) : "—"}</td></tr>
  <tr><td style="padding:3px 0;color:#666;">Eindejaarsuitkering${salaris.eindejaarsuitkering ? "" : " (n.v.t.)"}</td><td style="padding:3px 0;text-align:right;">${eindejaar ? "+ " + eur(eindejaar) : "—"}</td></tr>
  <tr><td style="padding:3px 0;color:#666;">Vaste jaarbonus</td><td style="padding:3px 0;text-align:right;">${bonus ? "+ " + eur(bonus) : "—"}</td></tr>
  <tr><td colspan="2" style="padding:8px 0 0 0;"><div style="border-top:2px solid ${GRYWO_KLEUR};"></div></td></tr>
  <tr><td style="padding:8px 0;color:${GRYWO_KLEUR};font-weight:bold;font-size:14px;">BRUTO JAARSALARIS</td><td style="padding:8px 0;text-align:right;color:${GRYWO_KLEUR};font-weight:bold;font-size:16px;">${eur(totaal)}</td></tr>
</table>
${verschilWaarschuwing}

<h3 style="color:${GRYWO_KLEUR};margin:20px 0 8px 0;font-size:15px;border-bottom:2px solid ${GRYWO_KLEUR};padding-bottom:4px;">Fee-berekening</h3>
<table style="width:100%;font-size:13px;color:#333;">
  <tr><td style="padding:4px 0;color:#666;">15% W&S-fee</td><td style="padding:4px 0;text-align:right;color:#10b981;font-weight:bold;">${eur(totaal * 0.15)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">16% W&S-fee</td><td style="padding:4px 0;text-align:right;color:#10b981;font-weight:bold;">${eur(totaal * 0.16)}</td></tr>
  <tr><td style="padding:4px 0;color:#666;">17% W&S-fee</td><td style="padding:4px 0;text-align:right;color:#10b981;font-weight:bold;">${eur(totaal * 0.17)}</td></tr>
</table>

<p style="margin-top:18px;font-size:12px;color:#888;">
<b>Bijlagen:</b><br>
• <b>samenvatting.pdf</b> — overzicht met breakdown + fee-tabellen<br>
• <b>geredacteerd-contract.pdf</b> — origineel met alle PII zwart gemaakt
</p>
<p style="font-size:12px;color:#888;">Origineel contract is binnen 24u automatisch verwijderd conform AVG art. 5.</p>`;

  const attachments: Array<{ filename: string; content: Buffer }> = [
    { filename: "samenvatting.pdf", content: Buffer.from(samenvattingPdf) },
  ];
  // Optioneel geredacteerd contract bijvoegen indien aanwezig (skip bij snelle flow)
  if (geredacteerdePdf && geredacteerdePdf.length > 100) {
    attachments.push({
      filename: "geredacteerd-contract.pdf",
      content: Buffer.from(geredacteerdePdf),
    });
  }

  const result = await resend.emails.send({
    from: FROM,
    to: "backoffice@grywo.nl",
    subject: `📄 Contract geverifieerd: ${kandidaatNaam} — bruto ${eur(totaal)}`,
    html: brandedLayout({ titel: "Contract klaar voor facturatie", body }),
    attachments,
  });
  if (result.error) throw new Error(`Resend afgewezen: ${result.error.message}`);
  return result;
}
