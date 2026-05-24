import { createAdminClient } from "@/utils/supabase/admin";

export type TemplateSleutel =
  | "kandidaat_voorgesteld"
  | "kandidaat_afwijzing"
  | "kandidaat_plaatsing"
  | "kandidaat_status_afwijzing"
  | "kandidaat_bevestiging"
  | "kennismaking_reminder"
  | "voorstel_opdrachtgever"
  | "reminder_opdrachtgever";

export const TEMPLATE_META: Record<TemplateSleutel, { naam: string; beschrijving: string; vars: string[] }> = {
  kandidaat_voorgesteld: {
    naam: "Kandidaat — voorgesteld",
    beschrijving: "Naar kandidaat zodra voorstel verstuurd is. Géén opdrachtgever-naam erin.",
    vars: ["voornaam"],
  },
  kandidaat_afwijzing: {
    naam: "Kandidaat — voorstel afgewezen",
    beschrijving: "Naar kandidaat als opdrachtgever rood klikt.",
    vars: ["voornaam"],
  },
  kandidaat_plaatsing: {
    naam: "Kandidaat — geplaatst",
    beschrijving: "Naar kandidaat als status op 'geplaatst' wordt gezet.",
    vars: ["voornaam"],
  },
  kandidaat_status_afwijzing: {
    naam: "Kandidaat — talentpool / einde traject",
    beschrijving: "Naar kandidaat als status op 'afgewezen' wordt gezet.",
    vars: ["voornaam"],
  },
  kandidaat_bevestiging: {
    naam: "Kandidaat — kennismaking gepland",
    beschrijving: "Naar kandidaat na groen-klik. Tabel met details wordt automatisch toegevoegd.",
    vars: ["voornaam", "bedrijf"],
  },
  kennismaking_reminder: {
    naam: "Kandidaat — 1u voor kennismaking",
    beschrijving: "Reminder 1 uur voor afspraak. Detail-tabel wordt automatisch toegevoegd.",
    vars: ["voornaam", "bedrijf"],
  },
  voorstel_opdrachtgever: {
    naam: "Opdrachtgever — nieuw voorstel",
    beschrijving: "Eerste mail naar opdrachtgever met kandidaat-profiel + groen/rood knoppen. De kandidaat-tabel en knoppen worden automatisch toegevoegd.",
    vars: ["opdrachtgever_naam", "kandidaat_naam", "bericht"],
  },
  reminder_opdrachtgever: {
    naam: "Opdrachtgever — reminder",
    beschrijving: "Herinnering naar opdrachtgever (werkdag 1, 2, 3a, 3b). Knop wordt automatisch toegevoegd.",
    vars: ["opdrachtgever_naam", "kandidaat_naam"],
  },
};

/**
 * Default body's — fallback als nog niet in DB. Mag {var} placeholders gebruiken.
 */
export const DEFAULT_BODIES: Record<TemplateSleutel, string> = {
  kandidaat_voorgesteld: `<p>Hi {voornaam},</p>
<p>We hebben je zojuist voorgesteld bij een potentiële werkgever.</p>
<p>We wachten nu op een reactie. Zodra we groen licht krijgen, brengen we je direct op de hoogte met alle details voor een kennismaking.</p>
<p style="color:#666;">Hartelijke groet,<br>Team GRYWO</p>`,

  kandidaat_afwijzing: `<p>Hi {voornaam},</p>
<p>Helaas heeft de werkgever waar we je hadden voorgesteld besloten om niet verder te gaan met je profiel.</p>
<p>Geen zorgen — we gaan voor je aan de slag met andere passende kansen. We houden je op de hoogte.</p>
<p style="color:#666;">Hartelijke groet,<br>Team GRYWO</p>`,

  kandidaat_plaatsing: `<p>Hi {voornaam},</p>
<p><b>Gefeliciteerd!</b> Je bent geplaatst. Wij wensen je heel veel succes en plezier op je nieuwe werkplek.</p>
<p>Mocht je vragen hebben of we iets voor je kunnen betekenen, dan horen we het graag.</p>
<p style="color:#666;">Hartelijke groet,<br>Team GRYWO</p>`,

  kandidaat_status_afwijzing: `<p>Hi {voornaam},</p>
<p>Bedankt voor de moeite die je in dit traject hebt gestoken. Op dit moment hebben we helaas geen passende match voor je.</p>
<p>We bewaren je profiel in onze talentpool en nemen contact op zodra er een geschikte kans voorbij komt.</p>
<p style="color:#666;">Hartelijke groet,<br>Team GRYWO</p>`,

  kandidaat_bevestiging: `<p>Hi {voornaam},</p>
<p>Goed nieuws — <b>{bedrijf}</b> wil graag kennismaken!</p>`,

  kennismaking_reminder: `<p>Hi {voornaam},</p>
<p>Over een uur heb je je kennismaking met <b>{bedrijf}</b>. Succes!</p>`,

  voorstel_opdrachtgever: `<p>Beste {opdrachtgever_naam},</p>
<p>We hebben een geweldige kandidaat voor je: <b>{kandidaat_naam}</b>.</p>
<p>{bericht}</p>`,

  reminder_opdrachtgever: `<p>Beste {opdrachtgever_naam},</p>
<p>Een vriendelijke herinnering: we hebben je kandidaat <b>{kandidaat_naam}</b> voorgesteld en wachten nog op je reactie.</p>`,
};

/**
 * Haal body op uit DB; fallback naar default.
 */
export async function getTemplateBody(sleutel: TemplateSleutel): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("mail_templates")
    .select("body_html")
    .eq("sleutel", sleutel)
    .maybeSingle();
  return data?.body_html ?? DEFAULT_BODIES[sleutel];
}

/**
 * Vervang {var} placeholders met values. Onbekende vars blijven staan zodat
 * je in de admin UI ziet welke je vergat in te vullen.
 */
export function renderTemplate(body: string, vars: Record<string, string | null | undefined>): string {
  return body.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

/**
 * Combinatie helper voor in email-functies.
 */
export async function renderMailTemplate(
  sleutel: TemplateSleutel,
  vars: Record<string, string | null | undefined>,
): Promise<string> {
  const body = await getTemplateBody(sleutel);
  return renderTemplate(body, vars);
}
