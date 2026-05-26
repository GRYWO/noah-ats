import { Resend } from "resend";
import { renderMailTemplate } from "@/utils/mail-templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
  const header = merk === "noah"
    ? `<span style="font-family:Helvetica,Arial,sans-serif;font-size:42px;font-weight:900;letter-spacing:-2px;color:#ffffff;">noah</span><span style="display:inline-block;width:10px;height:10px;background-color:#ffd84d;border-radius:50%;margin-left:4px;vertical-align:1px;"></span>`
    : `<img src="${APP_URL}/grywo-logo-wit.png" alt="GRYWO" width="160" style="display:inline-block;border:0;outline:none;text-decoration:none;height:auto;">`;
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
  from?: string;
}) {
  const fmtDatum = (d: string | null) =>
    d ? new Date(d).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" }) : "—";

  const intro = await renderMailTemplate("kandidaat_bevestiging", {
    voornaam: kandidaatVoornaam,
    bedrijf,
  });

  const body = `
${intro}

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9fb;border-radius:8px;padding:16px;margin:16px 0;border-collapse:separate;">
  <tr><td style="padding:6px 0;color:#666;width:35%;">Bedrijf</td><td style="padding:6px 0;font-weight:600;">${bedrijf}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Contactpersoon</td><td style="padding:6px 0;font-weight:600;">${contactpersoon}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Telefoon</td><td style="padding:6px 0;font-weight:600;">${contact_telefoon}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">E-mail</td><td style="padding:6px 0;font-weight:600;">${contact_email}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Locatie</td><td style="padding:6px 0;"><a href="${locatie_url}" style="color:${GRYWO_KLEUR};">Bekijk op Google Maps</a></td></tr>
</table>

<p style="margin:16px 0 8px 0;font-weight:600;">Voorgestelde datums (kies wat past):</p>
<ul style="padding-left:20px;margin:0 0 16px 0;">
  <li style="padding:4px 0;">${fmtDatum(datum_1)}</li>
  <li style="padding:4px 0;">${fmtDatum(datum_2)}</li>
  <li style="padding:4px 0;">${fmtDatum(datum_3)}</li>
</ul>

${opmerking ? `<p style="padding:12px;background:#fff8e1;border-left:3px solid #ffb84d;margin:16px 0;color:#444;"><b>Opmerking:</b> ${opmerking}</p>` : ""}

<p style="margin:16px 0 0 0;">Laat zo snel mogelijk weten welke datum je voorkeur heeft. Succes!</p>
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
  const body = `${intro}\n${loginBlok}`;
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
  <tr><td style="padding:8px 0;font-weight:bold;color:${GRYWO_KLEUR};">2.</td><td style="padding:8px 0;">Voeg je recruiters en setters toe via &quot;Recruiters &amp; setters beheren&quot;.</td></tr>
  <tr><td style="padding:8px 0;font-weight:bold;color:${GRYWO_KLEUR};">3.</td><td style="padding:8px 0;">Koppel je zakelijke mailbox via Instellingen, zodat voorstellen vanaf jouw domein vertrekken.</td></tr>
  <tr><td style="padding:8px 0;font-weight:bold;color:${GRYWO_KLEUR};">4.</td><td style="padding:8px 0;">Vragen of hulp nodig? Bel <a href="tel:0854016082" style="color:${GRYWO_KLEUR};font-weight:bold;">085-4016082</a> &mdash; wij regelen de rest achter de schermen.</td></tr>
</table>`;

  const body = `${intro}\n${loginBlok}\n${dashboardKnop}\n${eersteStappen}`;
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
