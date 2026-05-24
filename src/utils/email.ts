import { Resend } from "resend";
import { renderMailTemplate } from "@/utils/mail-templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const GRYWO_KLEUR = "#333399";

function brandedLayout({ titel, body }: { titel: string; body: string }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f7;padding:20px 0;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <tr><td style="background-color:${GRYWO_KLEUR};padding:32px 24px;text-align:center;">
          <span style="font-family:Helvetica,Arial,sans-serif;font-size:42px;font-weight:900;letter-spacing:-2px;color:#ffffff;">noah</span><span style="display:inline-block;width:10px;height:10px;background-color:#ffd84d;border-radius:50%;margin-left:4px;vertical-align:1px;"></span>
        </td></tr>
        <tr><td style="padding:32px;color:#1a1a2e;">
          <h2 style="color:${GRYWO_KLEUR};margin:0 0 16px 0;font-size:22px;">${titel}</h2>
          ${body}
        </td></tr>
        <tr><td style="background-color:#f4f4f7;padding:16px;text-align:center;font-size:12px;color:#888;">
          Noah ATS — powered by GRYWO
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
}: {
  naar: string;
  opdrachtgeverNaam: string | null;
  kandidaat: Kandidaat;
  bericht: string | null;
  token: string;
}) {
  const naam = `${kandidaat.voornaam} ${kandidaat.tussenvoegsel ?? ""} ${kandidaat.achternaam}`.replace(/\s+/g, " ").trim();
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
    from: FROM,
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
}: {
  naar: string;
  opdrachtgeverNaam: string | null;
  kandidaatNaam: string;
  token: string;
  reminderNr: 1 | 2 | 3 | 4;
  laatsteDag: boolean;
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
    from: FROM,
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
    from: FROM,
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
}: {
  naar: string;
  kandidaatVoornaam: string;
}) {
  const body = await renderMailTemplate("kandidaat_voorgesteld", { voornaam: kandidaatVoornaam });
  return resend.emails.send({
    from: FROM,
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
}: {
  naar: string;
  kandidaatVoornaam: string;
}) {
  const body = await renderMailTemplate("kandidaat_afwijzing", { voornaam: kandidaatVoornaam });
  return resend.emails.send({
    from: FROM,
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
}: {
  naar: string;
  kandidaatVoornaam: string;
  bedrijf: string;
  contactpersoon: string | null;
  contact_telefoon: string | null;
  locatie_url: string | null;
  kennismaking_op: string;
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
    from: FROM,
    to: naar,
    subject: `Over 1 uur: kennismaking bij ${bedrijf}`,
    html: brandedLayout({ titel: "Kennismaking over 1 uur", body }),
  });
}

/**
 * Plaatsing — gefeliciteerd.
 */
export async function sendKandidaatPlaatsing({
  naar,
  kandidaatVoornaam,
}: {
  naar: string;
  kandidaatVoornaam: string;
}) {
  const body = await renderMailTemplate("kandidaat_plaatsing", { voornaam: kandidaatVoornaam });
  return resend.emails.send({
    from: FROM,
    to: naar,
    subject: "Gefeliciteerd met je nieuwe baan!",
    html: brandedLayout({ titel: "Je bent geplaatst!", body }),
  });
}

/**
 * Algemene afwijzing (status=afgewezen op kandidaat).
 */
export async function sendKandidaatStatusAfwijzing({
  naar,
  kandidaatVoornaam,
}: {
  naar: string;
  kandidaatVoornaam: string;
}) {
  const body = await renderMailTemplate("kandidaat_status_afwijzing", { voornaam: kandidaatVoornaam });
  return resend.emails.send({
    from: FROM,
    to: naar,
    subject: "Update vanuit GRYWO",
    html: brandedLayout({ titel: "Bedankt voor je tijd", body }),
  });
}
