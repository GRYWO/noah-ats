"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// ---------------------------------------------------------------
// AI: anonieme vacaturetekst genereren (kopie van noah-recruitment)
// ---------------------------------------------------------------
type VacatureInput = {
  titel: string;
  sector?: string;
  locatie?: string;
  dienstverband?: string;
  uren?: string;
  ervaring?: string;
  salaris?: string;
  taken?: string;
  eisen?: string;
  bedrijfsnaam?: string;
};
type VacatureUitvoer = {
  publiek_tekst: string;
  samenvatting: string;
  tags: string[];
  secties: {
    intro: string;
    taken: string;
    eisen: string;
    bieden: string;
  };
};

const AI_MODEL = "claude-sonnet-4-5";
const AI_STIJL =
  "Schrijf in vlot, warm Nederlands. Geen emoji, geen iconen, geen gedachtestreepjes, geen uitroeptekens-spam, geen clichés. Spreek de kandidaat aan met 'je'.";

function leesJson<T>(tekst: string): T {
  const schoon = tekst.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(schoon) as T;
}

async function genereerVacature(v: VacatureInput): Promise<VacatureUitvoer> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ontbreekt");
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1500,
    system:
      `Je bent Noah, recruiter bij Noah Recruitment. ${AI_STIJL} ` +
      "Je schrijft een AANTREKKELIJKE, volledig ANONIEME vacaturetekst voor op de website. " +
      "Cruciaal: noem NOOIT een bedrijfsnaam of herleidbare details (geen exacte adressen, geen eigennamen, geen websites). " +
      "Beschrijf het bedrijf alleen generiek (bijvoorbeeld 'een gevestigde speler in de bouw in de regio'). " +
      "Antwoord UITSLUITEND met JSON.",
    messages: [
      {
        role: "user",
        content:
          "Maak een anonieme vacaturetekst van deze gegevens:\n" +
          JSON.stringify(v, null, 2) +
          "\n\nLever JSON: { " +
          "\"publiek_tekst\": string (volledige functieomschrijving in korte alinea's, als terugval), " +
          "\"samenvatting\": string (max 18 woorden), " +
          "\"tags\": string[] (5-10 trefwoorden: functie, vaardigheden, sector, regio), " +
          "\"secties\": { " +
          "\"intro\": string (1-2 wervende zinnen over de functie en de regio, anoniem), " +
          "\"taken\": string (een vlotte alinea van 2-4 zinnen: wat ga je doen), " +
          "\"eisen\": string (een vlotte alinea van 2-3 zinnen: wat vragen we — opleiding, ervaring, vaardigheden), " +
          "\"bieden\": string (een vlotte alinea van 2-3 zinnen: wat bieden we — salaris, uren, contracttype, ontwikkeling; verzin niets onrealistisch) } }",
      },
    ],
  });
  const tekst = res.content.find((b) => b.type === "text")?.text ?? "{}";
  return leesJson<VacatureUitvoer>(tekst);
}

// ---------------------------------------------------------------
// Geocode via Nominatim (kopie van noah-recruitment)
// ---------------------------------------------------------------
const NOMINATIM_UA = "noah-ats/1.0 (info@noah-recruitment.nl)";

function schoonPlaats(plaats: string): string {
  return plaats
    .replace(/\b(regio|omgeving|omstreken|rondom|nabij)\b/gi, "")
    .replace(/\(.*?\)/g, "")
    .trim();
}

async function geocode(plaats: string): Promise<{ lat: number; lon: number } | null> {
  const q = schoonPlaats(plaats || "");
  if (!q) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ", Nederland")}&format=json&limit=1&countrycodes=nl`;
    const r = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA, "Accept-Language": "nl" } });
    if (!r.ok) return null;
    const j = (await r.json()) as Array<{ lat: string; lon: string }>;
    if (Array.isArray(j) && j[0]) return { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon) };
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// Formulier → velden + publieke content (gedeeld door aanmaken/bewerken)
// ---------------------------------------------------------------
function leesVacatureInput(formData: FormData): VacatureInput {
  return {
    titel: String(formData.get("titel") || "").trim(),
    sector: String(formData.get("sector") || "").trim(),
    locatie: String(formData.get("locatie") || "").trim(),
    dienstverband: String(formData.get("dienstverband") || "").trim(),
    uren: String(formData.get("uren") || "").trim(),
    ervaring: String(formData.get("ervaring") || "").trim(),
    salaris: String(formData.get("salaris") || "").trim(),
    taken: String(formData.get("taken") || "").trim(),
    eisen: String(formData.get("eisen") || "").trim(),
    bedrijfsnaam: "Noah recruitment",
  };
}

function leesInternEnAfspraken(formData: FormData) {
  const intern_contactpersoon = String(formData.get("contactpersoon") || "").trim() || null;
  const intern_telefoon = String(formData.get("contact_telefoon") || "").trim() || null;
  const intern_mailadres = String(formData.get("contact_mailadres") || "").trim() || null;
  const intern_bedrijf = String(formData.get("intern_bedrijf") || "").trim() || null;

  const tariefRaw = String(formData.get("afspraak_tarief_type") || "").trim();
  const TARIEF_TOEGESTAAN = new Set(["ws_10", "ws_15", "ws_anders", "uitzend"]);
  const afspraak_tarief_type = TARIEF_TOEGESTAAN.has(tariefRaw) ? tariefRaw : null;

  const wsPercRaw = String(formData.get("afspraak_ws_percentage") || "").trim();
  const wsPercTyped = wsPercRaw === "" ? null : Number(wsPercRaw);
  const afspraak_ws_percentage =
    afspraak_tarief_type === "ws_10"
      ? 10
      : afspraak_tarief_type === "ws_15"
        ? 15
        : afspraak_tarief_type === "ws_anders" && wsPercTyped !== null && Number.isFinite(wsPercTyped)
          ? wsPercTyped
          : null;

  const wsToelichtingRaw = String(formData.get("afspraak_ws_toelichting") || "").trim();
  const afspraak_ws_toelichting =
    afspraak_tarief_type === "ws_anders" && wsToelichtingRaw ? wsToelichtingRaw : null;

  const uitzendFactorRaw = String(formData.get("afspraak_uitzend_factor") || "").trim();
  const uitzendFactorNum = uitzendFactorRaw === "" ? null : Number(uitzendFactorRaw);
  const afspraak_uitzend_factor =
    afspraak_tarief_type === "uitzend" && uitzendFactorNum !== null && Number.isFinite(uitzendFactorNum)
      ? uitzendFactorNum
      : null;

  const uitzendUrenRaw = String(formData.get("afspraak_uitzend_uren_per_week") || "").trim();
  const afspraak_uitzend_uren_per_week =
    afspraak_tarief_type === "uitzend" && uitzendUrenRaw ? uitzendUrenRaw : null;

  const overnameRaw = String(formData.get("afspraak_overname_na_uren") || "").trim();
  const overnameNum = overnameRaw === "" ? null : Number(overnameRaw);
  const afspraak_overname_na_uren =
    afspraak_tarief_type === "uitzend" && overnameNum !== null && Number.isFinite(overnameNum)
      ? Math.round(overnameNum)
      : null;

  return {
    intern_contactpersoon,
    intern_telefoon,
    intern_mailadres,
    intern_bedrijf,
    afspraak_tarief_type,
    afspraak_ws_percentage,
    afspraak_ws_toelichting,
    afspraak_uitzend_factor,
    afspraak_uitzend_uren_per_week,
    afspraak_overname_na_uren,
  };
}

async function maakPubliekeContent(input: VacatureInput): Promise<{
  publiek_tekst: string;
  samenvatting: string;
  tags: string[];
  publiek_secties: VacatureUitvoer["secties"];
}> {
  const biedenUitVelden = (() => {
    const d = [
      input.salaris ? `Je verdient ${input.salaris}` : "",
      input.uren ? `op basis van ${input.uren}` : "",
      input.dienstverband ? `(${input.dienstverband})` : "",
    ].filter(Boolean).join(" ");
    return d ? `${d}.` : "";
  })();
  const introTerugval = `Voor een opdrachtgever in de regio ${input.locatie || "Nederland"} zoeken wij een ${input.titel}.`;

  try {
    const ai = await genereerVacature(input);
    // Secties altijd vullen: AI-versie waar aanwezig, anders uit de ingevulde
    // velden. Zo valt de website nooit terug op één tekstblok.
    const s = ai.secties ?? ({} as VacatureUitvoer["secties"]);
    return {
      publiek_tekst: ai.publiek_tekst,
      samenvatting: ai.samenvatting,
      tags: ai.tags,
      publiek_secties: {
        intro: (s.intro || ai.samenvatting || introTerugval).trim(),
        taken: (s.taken || input.taken || "").trim(),
        eisen: (s.eisen || input.eisen || "").trim(),
        bieden: (s.bieden || biedenUitVelden).trim(),
      },
    };
  } catch {
    return {
      publiek_tekst:
        `${introTerugval}\n\n` +
        (input.taken ? `Wat ga je doen?\n${input.taken}\n\n` : "") +
        (input.eisen ? `Wat vragen we?\n${input.eisen}\n\n` : "") +
        (input.salaris ? `Salarisindicatie: ${input.salaris}\n` : ""),
      samenvatting: `${input.titel}${input.locatie ? ", " + input.locatie : ""}`,
      tags: [input.titel, input.sector, input.locatie].filter(Boolean) as string[],
      publiek_secties: {
        intro: introTerugval,
        taken: input.taken || "",
        eisen: input.eisen || "",
        bieden: biedenUitVelden,
      },
    };
  }
}

// ---------------------------------------------------------------
// Bedrijf → setter (plakkerig eigenaarschap)
// ---------------------------------------------------------------
// De eerste setter die een vacature van een bedrijf plaatst wordt eigenaar van
// dat bedrijf. Elke volgende vacature van datzelfde bedrijf komt automatisch op
// zijn/haar naam — ook als iemand anders hem aanmaakt.
type AdminClient = ReturnType<typeof createAdminClient>;

async function bepaalEigenaar(
  admin: AdminClient,
  tenantId: string | null,
  internBedrijf: string | null,
  makerId: string,
): Promise<string> {
  if (!tenantId || !internBedrijf) return makerId;
  const norm = internBedrijf.toLowerCase().replace(/\s+/g, " ").trim();
  if (!norm) return makerId;

  const { data: bestaand } = await admin
    .from("bedrijf_setter")
    .select("setter_id")
    .eq("tenant_id", tenantId)
    .eq("bedrijf_norm", norm)
    .maybeSingle();

  if (bestaand?.setter_id) return bestaand.setter_id as string;

  await admin
    .from("bedrijf_setter")
    .insert({ tenant_id: tenantId, bedrijf_norm: norm, setter_id: makerId });
  return makerId;
}

async function contactNaamVoor(admin: AdminClient, setterId: string, terugval: string): Promise<string> {
  const { data } = await admin
    .from("profiles")
    .select("voornaam, achternaam")
    .eq("id", setterId)
    .maybeSingle();
  const naam = [data?.voornaam, data?.achternaam].filter(Boolean).join(" ").trim();
  return naam || terugval;
}

// ---------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------
export async function maakVacatureNoahAts(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profiel ophalen voor contactpersoon + tenant (voor bedrijf→setter).
  const { data: profiel } = await supabase
    .from("profiles")
    .select("voornaam, achternaam, tenant_id")
    .eq("id", user.id)
    .single();
  const tenantId = (profiel as { tenant_id?: string } | null)?.tenant_id ?? null;

  const input = leesVacatureInput(formData);
  const {
    intern_contactpersoon,
    intern_telefoon,
    intern_mailadres,
    intern_bedrijf,
    afspraak_tarief_type,
    afspraak_ws_percentage,
    afspraak_ws_toelichting,
    afspraak_uitzend_factor,
    afspraak_uitzend_uren_per_week,
    afspraak_overname_na_uren,
  } = leesInternEnAfspraken(formData);

  if (!input.titel) {
    redirect("/vacature-aanmaken/nieuw?fout=" + encodeURIComponent("Functietitel is verplicht."));
  }

  const { publiek_tekst, samenvatting, tags, publiek_secties } = await maakPubliekeContent(input);
  const coord = input.locatie ? await geocode(input.locatie) : null;

  const admin = createAdminClient();

  // Bedrijf → setter: bepaal de eigenaar (eerste setter van dit bedrijf blijft
  // eigenaar). De vacature staat altijd op naam van die setter.
  const eigenaar = await bepaalEigenaar(admin, tenantId, intern_bedrijf, user.id);
  const eigenMaker = [profiel?.voornaam, profiel?.achternaam].filter(Boolean).join(" ").trim();
  const contactNaam =
    eigenaar === user.id
      ? eigenMaker || "Noah recruitment"
      : await contactNaamVoor(admin, eigenaar, "Noah recruitment");

  const { error } = await admin
    .from("rec_vacatures")
    .insert({
      eigenaar,
      titel: input.titel,
      sector: input.sector || null,
      locatie: input.locatie || null,
      lat: coord?.lat ?? null,
      lon: coord?.lon ?? null,
      dienstverband: input.dienstverband || null,
      uren: input.uren || null,
      ervaring: input.ervaring || null,
      salaris: input.salaris || null,
      taken: input.taken || null,
      eisen: input.eisen || null,
      publiek_tekst,
      publiek_secties,
      samenvatting,
      tags,
      bedrijfsnaam: "Noah recruitment",
      contact_naam: contactNaam,
      contact_email: "info@noah-recruitment.nl",
      intern_contactpersoon,
      intern_telefoon,
      intern_mailadres,
      intern_bedrijf,
      status: "open",
      afspraak_tarief_type,
      afspraak_ws_percentage,
      afspraak_ws_toelichting,
      afspraak_uitzend_factor,
      afspraak_uitzend_uren_per_week,
      afspraak_overname_na_uren,
    });

  if (error) {
    redirect("/vacature-aanmaken/nieuw?fout=" + encodeURIComponent("Opslaan mislukt: " + error.message));
  }

  revalidatePath("/vacature-aanmaken");
  redirect("/vacature-aanmaken");
}

export async function zetVacatureStatus(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") || "").trim();
  const status = String(formData.get("status") || "").trim();
  if (!id || !status) return;

  const admin = createAdminClient();
  await admin
    .from("rec_vacatures")
    .update({ status })
    .eq("id", id)
    .eq("eigenaar", user.id);

  revalidatePath("/vacature-aanmaken");
}

// Bestaande vacature bewerken. De setter kan dit altijd; de publieke tekst
// wordt opnieuw door de AI gegenereerd. Eigenaar blijft ongewijzigd.
export async function updateVacatureNoahAts(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") || "").trim();
  if (!id) redirect("/vacature-aanmaken");

  const admin = createAdminClient();
  const { data: bestaand } = await admin
    .from("rec_vacatures")
    .select("eigenaar")
    .eq("id", id)
    .maybeSingle();
  if (!bestaand) redirect("/vacature-aanmaken");

  const { data: profiel } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
  const rol = (profiel?.rol ?? "").toString().toLowerCase();
  const isAdmin = rol === "admin" || rol === "super-admin" || rol === "super_admin";
  if (bestaand.eigenaar !== user.id && !isAdmin) redirect("/vacature-aanmaken");

  const input = leesVacatureInput(formData);
  const intern = leesInternEnAfspraken(formData);
  if (!input.titel) {
    redirect(`/vacature-aanmaken/${id}/bewerken?fout=` + encodeURIComponent("Functietitel is verplicht."));
  }

  const { publiek_tekst, samenvatting, tags, publiek_secties } = await maakPubliekeContent(input);
  const coord = input.locatie ? await geocode(input.locatie) : null;

  const { error } = await admin
    .from("rec_vacatures")
    .update({
      titel: input.titel,
      sector: input.sector || null,
      locatie: input.locatie || null,
      lat: coord?.lat ?? null,
      lon: coord?.lon ?? null,
      dienstverband: input.dienstverband || null,
      uren: input.uren || null,
      ervaring: input.ervaring || null,
      salaris: input.salaris || null,
      taken: input.taken || null,
      eisen: input.eisen || null,
      publiek_tekst,
      publiek_secties,
      samenvatting,
      tags,
      intern_contactpersoon: intern.intern_contactpersoon,
      intern_telefoon: intern.intern_telefoon,
      intern_mailadres: intern.intern_mailadres,
      intern_bedrijf: intern.intern_bedrijf,
      afspraak_tarief_type: intern.afspraak_tarief_type,
      afspraak_ws_percentage: intern.afspraak_ws_percentage,
      afspraak_ws_toelichting: intern.afspraak_ws_toelichting,
      afspraak_uitzend_factor: intern.afspraak_uitzend_factor,
      afspraak_uitzend_uren_per_week: intern.afspraak_uitzend_uren_per_week,
      afspraak_overname_na_uren: intern.afspraak_overname_na_uren,
    })
    .eq("id", id);

  if (error) {
    redirect(`/vacature-aanmaken/${id}/bewerken?fout=` + encodeURIComponent("Opslaan mislukt: " + error.message));
  }

  revalidatePath("/vacature-aanmaken");
  redirect("/vacature-aanmaken");
}

// Vacature definitief verwijderen — meteen weg van de website. Bijbehorende
// sollicitaties worden ook verwijderd (FK).
export async function verwijderVacature(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  const admin = createAdminClient();
  const { data: bestaand } = await admin
    .from("rec_vacatures")
    .select("eigenaar")
    .eq("id", id)
    .maybeSingle();
  if (!bestaand) return;

  const { data: profiel } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
  const rol = (profiel?.rol ?? "").toString().toLowerCase();
  const isAdmin = rol === "admin" || rol === "super-admin" || rol === "super_admin";
  if (bestaand.eigenaar !== user.id && !isAdmin) return;

  await admin.from("rec_sollicitaties").delete().eq("vacature_id", id);
  await admin.from("rec_vacatures").delete().eq("id", id);

  revalidatePath("/vacature-aanmaken");
}

// "Zoek kandidaten": zet een Robin-zoekopdracht in de wachtrij. De altijd-aan
// machine (bot) pakt 'm op, draait de zoekopdracht en meldt de bellijst terug.
export async function maakRobinZoekJob(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const vacatureId = String(formData.get("vacature") || "").trim();
  const functie = String(formData.get("functie") || "").trim();
  if (!vacatureId || !functie) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  await admin.from("zoek_jobs").insert({
    tenant_id: profile.tenant_id,
    type: "robin",
    zoekterm: functie,
    vacature_id: vacatureId,
    aangemaakt_door: user.id,
  });

  revalidatePath("/vacature-aanmaken");
}

// Zoekbalk "Vacatures zoeken": zet een Jobdigger-zoekopdracht (beroep) in de
// wachtrij. De bot scrapet Jobdigger en levert de gevonden vacatures terug.
export async function maakJobdiggerZoekJob(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const beroep = String(formData.get("beroep") || "").trim();
  if (!beroep) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  await admin.from("zoek_jobs").insert({
    tenant_id: profile.tenant_id,
    type: "jobdigger",
    zoekterm: beroep,
    limiet: 50,
    aangemaakt_door: user.id,
  });

  revalidatePath("/vacature-aanmaken");
}

// "Zoek 50 meer": vergroot een bestaande Jobdigger-lijst met 50 extra. Het
// limiet wordt opgehoogd en de zoekopdracht opnieuw in de wachtrij gezet; de
// bot scrapet opnieuw (nu meer) en vervangt de lijst netjes.
export async function vergrootJobdiggerLijst(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = String(formData.get("jobId") || "").trim();
  if (!jobId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("zoek_jobs")
    .select("limiet")
    .eq("id", jobId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();
  if (!job) return;

  const nieuwLimiet = (Number((job as { limiet?: number }).limiet) || 50) + 50;
  const nu = new Date().toISOString();
  await admin
    .from("zoek_jobs")
    .update({ limiet: nieuwLimiet, status: "open", gestart_at: null, klaar_at: null, fout: null, updated_at: nu })
    .eq("id", jobId)
    .eq("tenant_id", profile.tenant_id);

  revalidatePath("/vacature-aanmaken");
}

// Jobdigger-lijst hernoemen (de naam van de zoekopdracht).
export async function hernoemJobdiggerLijst(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = String(formData.get("jobId") || "").trim();
  const naam = String(formData.get("naam") || "").trim();
  if (!jobId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  await admin
    .from("zoek_jobs")
    .update({ lijst_naam: naam || null })
    .eq("id", jobId)
    .eq("tenant_id", profile.tenant_id);

  revalidatePath("/vacature-aanmaken");
}

// Jobdigger-lijst verwijderen (de zoekopdracht; vondsten verdwijnen mee via cascade).
export async function verwijderJobdiggerLijst(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = String(formData.get("jobId") || "").trim();
  if (!jobId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  await admin
    .from("zoek_jobs")
    .delete()
    .eq("id", jobId)
    .eq("tenant_id", profile.tenant_id);

  revalidatePath("/vacature-aanmaken");
}
