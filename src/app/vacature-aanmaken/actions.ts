"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { maakVoorstelprofiel } from "@/utils/voorstelprofiel-ai";
import {
  sendVoorstelprofielNaarContact,
  sendPoolVoorstelNaarContact,
  sendPlaatsingNaarBackoffice,
  sendContractControleUitnodiging,
} from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";

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

// Zet een Robin-zoekopdracht (40 km rond de vacaturelocatie) in de wachtrij.
// De altijd-aan bot pakt 'm op, scrapet kandidaten en de AI rangschikt ze.
async function maakRobinJobVoorVacature(
  admin: AdminClient,
  opts: {
    tenantId: string | null;
    vacatureId: string;
    functie: string;
    plaats: string | null;
    lat: number | null;
    lon: number | null;
    setterId: string;
  },
) {
  if (!opts.tenantId || !opts.functie) return;
  await admin.from("zoek_jobs").insert({
    tenant_id: opts.tenantId,
    type: "robin",
    zoekterm: opts.functie,
    vacature_id: opts.vacatureId,
    straal_km: 40,
    plaats: opts.plaats,
    lat: opts.lat,
    lon: opts.lon,
    aangemaakt_door: opts.setterId,
  });
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

  const { data: nieuwVac, error } = await admin
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
    })
    .select("id")
    .single();

  if (error) {
    redirect("/vacature-aanmaken/nieuw?fout=" + encodeURIComponent("Opslaan mislukt: " + error.message));
  }

  // Automatisch kandidaten zoeken (Robin, 40 km) zodra de vacature online staat.
  if (nieuwVac?.id) {
    await maakRobinJobVoorVacature(admin, {
      tenantId,
      vacatureId: nieuwVac.id as string,
      functie: input.titel,
      plaats: input.locatie || null,
      lat: coord?.lat ?? null,
      lon: coord?.lon ?? null,
      setterId: eigenaar,
    });
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

// "Zet in pool": plaats een (intake-afgeronde) kandidaat in de pool van zijn
// vacature, zodat je 'm samen met anderen in één keer kunt voorstellen.
export async function zetKandidaatInPool(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const kandidaatId = String(formData.get("kandidaatId") || "").trim();
  if (!kandidaatId) return;

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select("id, tenant_id, intake_voltooid")
    .eq("id", kandidaatId)
    .maybeSingle();
  if (!k || k.tenant_id !== profile.tenant_id) return;
  if (!k.intake_voltooid) return; // alleen ná de intake

  await admin.from("kandidaten").update({ kanban_stap: "kandidatenpool" }).eq("id", kandidaatId);
  revalidatePath("/vacature-aanmaken");
  revalidatePath(`/kandidaten/${kandidaatId}`);
}

// "Plaats": rond de plaatsing af vanuit de pijplijn met één klik. Alle gegevens
// komen automatisch uit de vacature (bedrijf, contactpersoon, afspraken). Er
// wordt vertakt op de afspraak van de vacature:
//   • W&S (ws_10 / ws_15 / ws_anders): mail naar backoffice + automatisch een
//     contract-controle-uitnodiging (AVG) naar de opdrachtgever, zodat die het
//     arbeidscontract veilig kan aanleveren. Na aanlevering gaat er — via de
//     bestaande contract-parser — automatisch een mail naar de backoffice.
//   • Uitzendbasis: alleen een mail naar backoffice met de afspraken + klant- en
//     kandidaatgegevens (bij uitzend factureren we per uur, geen contract nodig).
export async function plaatsKandidaatVanuitVacature(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const kandidaatId = String(formData.get("kandidaatId") || "").trim();
  const vacatureIdIn = String(formData.get("vacature") || "").trim();
  if (!kandidaatId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, voornaam, achternaam")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select("id, tenant_id, voornaam, tussenvoegsel, achternaam, email, telefoon, woonplaats, vacature_id")
    .eq("id", kandidaatId)
    .maybeSingle();
  if (!k || k.tenant_id !== profile.tenant_id) return;

  const vacId = vacatureIdIn || ((k.vacature_id as string | null) ?? "");
  if (!vacId) return;

  const { data: vac } = await admin
    .from("rec_vacatures")
    .select(
      "titel, eigenaar, intern_bedrijf, intern_contactpersoon, intern_mailadres, intern_telefoon, afspraak_tarief_type, afspraak_ws_percentage, afspraak_ws_toelichting, afspraak_uitzend_factor, afspraak_uitzend_uren_per_week, afspraak_overname_na_uren",
    )
    .eq("id", vacId)
    .maybeSingle();
  if (!vac) return;

  const tariefType = (vac.afspraak_tarief_type as string | null) ?? "";
  const isUitzend = tariefType === "uitzend";
  const basis: "uitzend" | "werving_selectie" = isUitzend ? "uitzend" : "werving_selectie";

  const wsPct: number | null = isUitzend
    ? null
    : tariefType === "ws_10"
      ? 10
      : tariefType === "ws_15"
        ? 15
        : (vac.afspraak_ws_percentage as number | null) ?? null;
  const uitzendFactor: number | null = isUitzend ? ((vac.afspraak_uitzend_factor as number | null) ?? null) : null;

  const voornaam = (k.voornaam as string | null) ?? "";
  const tussenvoegsel = (k.tussenvoegsel as string | null) ?? null;
  const achternaam = (k.achternaam as string | null) ?? "";
  const kandidaatNaam = [voornaam, tussenvoegsel, achternaam].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() || "de kandidaat";

  const bedrijf = (vac.intern_bedrijf as string | null) || "Onbekend bedrijf";
  const contactpersoon = (vac.intern_contactpersoon as string | null) || null;
  const contactEmail = (vac.intern_mailadres as string | null) || null;
  const contactTelefoon = (vac.intern_telefoon as string | null) || null;
  const startdatum = new Date().toISOString().slice(0, 10);

  // Rijke opmerking zodat de backoffice álle afspraken in de mail ziet staan.
  const opmerking = [
    `Functie: ${(vac.titel as string | null) ?? "—"}`,
    isUitzend ? `Uitzendfactor: ${uitzendFactor ?? "—"}` : `W&S-fee: ${wsPct != null ? wsPct + "%" : "—"}`,
    isUitzend && vac.afspraak_uitzend_uren_per_week ? `Uren/week: ${vac.afspraak_uitzend_uren_per_week}` : "",
    isUitzend && vac.afspraak_overname_na_uren != null ? `Overname na ${vac.afspraak_overname_na_uren} uur` : "",
    !isUitzend && vac.afspraak_ws_toelichting ? `Toelichting afspraak: ${vac.afspraak_ws_toelichting}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // 1) Plaatsing opslaan
  const { data: plaatsing, error: plErr } = await admin
    .from("plaatsingen")
    .insert({
      tenant_id: profile.tenant_id,
      kandidaat_id: kandidaatId,
      basis,
      tarief_factor: uitzendFactor,
      tarief_pct: wsPct,
      betaling: "1x_7d",
      bedrijf,
      contactpersoon,
      contact_email: contactEmail,
      contact_telefoon: contactTelefoon,
      opmerking,
      startdatum,
      aangemeld_door: user.id,
    })
    .select("id")
    .single();
  if (plErr || !plaatsing) return;

  // 2) Kandidaat naar 'geplaatst' in de pijplijn
  await admin
    .from("kandidaten")
    .update({ kanban_stap: "geplaatst", voorstel_status: "geplaatst" })
    .eq("id", kandidaatId);

  // Mail vanaf het adres van de eigenaar/setter zodat het from-domein klopt.
  const setterFrom = await getSetterFrom((vac.eigenaar as string | null) || user.id);

  // 3) Mail naar backoffice@noah-recruitment.nl (altijd, met zoveel mogelijk data)
  try {
    await sendPlaatsingNaarBackoffice({
      kandidaat: {
        voornaam,
        tussenvoegsel,
        achternaam,
        email: (k.email as string | null) ?? null,
        telefoon: (k.telefoon as string | null) ?? null,
        woonplaats: (k.woonplaats as string | null) ?? null,
      },
      klant: { bedrijf, contactpersoon, contact_email: contactEmail, contact_telefoon: contactTelefoon },
      deal: { basis, tarief_factor: uitzendFactor, tarief_pct: wsPct, tarief_bedrag: null, betaling: "1x_7d", startdatum, opmerking },
      aangemeldDoor: {
        voornaam: (profile.voornaam as string | null) ?? "",
        achternaam: (profile.achternaam as string | null) ?? "",
        email: user.email ?? "",
      },
      from: setterFrom,
    });
    await admin.from("plaatsingen").update({ backoffice_mail_sent: new Date().toISOString() }).eq("id", plaatsing.id);
  } catch (e) {
    console.error("[plaats-vacature] backoffice-mail mislukt:", e);
  }

  // 4) Alleen bij W&S: contract-controle-uitnodiging (AVG) naar de opdrachtgever.
  if (!isUitzend && contactEmail) {
    try {
      const token = randomBytes(24).toString("hex");
      await admin.from("contract_verzoeken").insert({
        plaatsing_id: plaatsing.id,
        tenant_id: profile.tenant_id,
        token,
        status: "verzonden",
        opdrachtgever_naam: contactpersoon || bedrijf,
        opdrachtgever_email: contactEmail,
        kandidaat_naam: kandidaatNaam,
      });
      await sendContractControleUitnodiging({
        naar: contactEmail,
        contactNaam: contactpersoon || "",
        kandidaatNaam,
        token,
        feePercentage: wsPct,
      });
    } catch (e) {
      console.error("[plaats-vacature] contract-controle mail mislukt:", e);
    }
  }

  revalidatePath("/vacature-aanmaken");
  revalidatePath(`/kandidaten/${kandidaatId}`);
}

// "Stel pool voor": stel meerdere gepoolde kandidaten in één keer voor aan de
// contactpersoon van de vacature. Per kandidaat wordt een (anoniem) profiel-link
// klaargezet; daarna gaat er één mail met alle links uit.
export async function stelPoolVoor(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const vacatureId = String(formData.get("vacature") || "").trim();
  const ids = formData.getAll("ids").map((v) => String(v)).filter(Boolean);
  if (!vacatureId || ids.length === 0) return;

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  const { data: vac } = await admin
    .from("rec_vacatures")
    .select("titel, intern_mailadres, intern_contactpersoon, eigenaar")
    .eq("id", vacatureId)
    .maybeSingle();
  if (!vac?.intern_mailadres) return;

  const urls: string[] = [];
  for (const kandidaatId of ids) {
    const { data: k } = await admin
      .from("kandidaten")
      .select("id, tenant_id, profielschets, cv_geparseerd, rijbewijs, eigen_vervoer, bron_bellijst_item_id")
      .eq("id", kandidaatId)
      .maybeSingle();
    if (!k || k.tenant_id !== profile.tenant_id || !k.bron_bellijst_item_id) continue;

    const cvg = (k.cv_geparseerd ?? {}) as Record<string, unknown>;
    const vp = {
      profielschets: (k.profielschets as string | null) ?? "",
      werkervaring: (cvg.werkervaring as string | null) ?? "",
      opleidingen: (cvg.diplomas as string | null) ?? "",
      talen: (cvg.talen as string | null) ?? "",
      vaardigheden: (cvg.vaardigheden as string | null) ?? "",
      rijbewijzen: (k.rijbewijs as string | null) ?? "",
      vervoer: k.eigen_vervoer ? "Ja" : "Nee",
    };

    const { data: bi } = await admin
      .from("bellijst_items")
      .select("voorstelprofiel_token")
      .eq("id", k.bron_bellijst_item_id as string)
      .maybeSingle();
    const token = (bi?.voorstelprofiel_token as string | null) || crypto.randomUUID().replace(/-/g, "");
    await admin
      .from("bellijst_items")
      .update({ voorstelprofiel: vp, voorstelprofiel_token: token })
      .eq("id", k.bron_bellijst_item_id as string);
    urls.push(`https://noah-recruitment.nl/voorstelprofiel/${token}`);

    // Uit de pool, de pijplijn in (status: voorgesteld).
    await admin.from("kandidaten").update({ kanban_stap: "in_proces", voorstel_status: "voorgesteld" }).eq("id", kandidaatId);
  }

  if (urls.length === 0) return;

  const setterNaam = vac.eigenaar
    ? await contactNaamVoor(admin, vac.eigenaar as string, "Noah Recruitment")
    : "Noah Recruitment";
  try {
    await sendPoolVoorstelNaarContact({
      naar: vac.intern_mailadres as string,
      contactpersoon: (vac.intern_contactpersoon as string | null) ?? null,
      functie: (vac.titel as string | null) ?? "de functie",
      profielUrls: urls,
      setterNaam,
    });
  } catch {
    // mail mislukt; kandidaten staan al in proces
  }

  revalidatePath("/vacature-aanmaken");
}

// "Maak voorstelprofiel": zet de geschraapte profieltekst van een kandidaat om
// in een net Noah-voorstelprofiel (anoniem) met een deelbare link.
export async function maakVoorstelprofielVanKandidaat(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const itemId = String(formData.get("itemId") || "").trim();
  if (!itemId) return;

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("bellijst_items")
    .select("id, naam, plaats, profiel_tekst, voorstelprofiel_token, tenant_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item || item.tenant_id !== profile.tenant_id) return;

  let data;
  try {
    data = await maakVoorstelprofiel(
      (item.profiel_tekst as string | null) ?? "",
      (item.naam as string | null) ?? "",
      (item.plaats as string | null) ?? "",
    );
  } catch {
    return; // AI niet beschikbaar; stil falen, setter kan opnieuw proberen
  }

  const token = (item.voorstelprofiel_token as string | null) || crypto.randomUUID().replace(/-/g, "");
  await admin
    .from("bellijst_items")
    .update({ voorstelprofiel: data, voorstelprofiel_token: token })
    .eq("id", itemId);

  revalidatePath("/vacature-aanmaken");
}

// "Stel voor": mail het (anonieme) voorstelprofiel met één klik naar de
// contactpersoon van het bedrijf (het interne mailadres bij de vacature).
export async function stelKandidaatVoor(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const itemId = String(formData.get("itemId") || "").trim();
  if (!itemId) return;

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("bellijst_items")
    .select("id, naam, plaats, profiel_tekst, voorstelprofiel, voorstelprofiel_token, bellijst_id, tenant_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item || item.tenant_id !== profile.tenant_id) return;

  const { data: bel } = await admin
    .from("bellijsten")
    .select("vacature_id")
    .eq("id", item.bellijst_id as string)
    .maybeSingle();
  if (!bel?.vacature_id) return;

  const { data: vac } = await admin
    .from("rec_vacatures")
    .select("titel, intern_mailadres, intern_contactpersoon, eigenaar")
    .eq("id", bel.vacature_id as string)
    .maybeSingle();
  if (!vac?.intern_mailadres) return; // geen contactpersoon-mail: niets te versturen

  // Zorg dat er een voorstelprofiel + token is (maak 'm aan als die ontbreekt).
  let token = (item.voorstelprofiel_token as string | null) ?? null;
  if (!token) {
    try {
      const data = await maakVoorstelprofiel(
        (item.profiel_tekst as string | null) ?? "",
        (item.naam as string | null) ?? "",
        (item.plaats as string | null) ?? "",
      );
      token = crypto.randomUUID().replace(/-/g, "");
      await admin.from("bellijst_items").update({ voorstelprofiel: data, voorstelprofiel_token: token }).eq("id", itemId);
    } catch {
      return; // AI niet beschikbaar
    }
  }

  const setterNaam = vac.eigenaar
    ? await contactNaamVoor(admin, vac.eigenaar as string, "Noah Recruitment")
    : "Noah Recruitment";

  try {
    await sendVoorstelprofielNaarContact({
      naar: vac.intern_mailadres as string,
      contactpersoon: (vac.intern_contactpersoon as string | null) ?? null,
      functie: (vac.titel as string | null) ?? "de functie",
      profielUrl: `https://noah-recruitment.nl/voorstelprofiel/${token}`,
      setterNaam,
    });
  } catch {
    return; // mail mislukt; setter kan opnieuw proberen
  }

  await admin.from("bellijst_items").update({ voorgesteld_at: new Date().toISOString() }).eq("id", itemId);
  revalidatePath("/vacature-aanmaken");
}

// "Intake": maak van een Robin-kandidaat een volledige kandidaat (met de
// gevonden gegevens al ingevuld) en ga naar de kandidaatpagina, waar de
// bestaande intake-bot de rest uitvraagt. Bestond er al een kandidaat voor dit
// item, dan openen we die.
export async function startIntakeVanKandidaat(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const itemId = String(formData.get("itemId") || "").trim();
  if (!itemId) return;

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("bellijst_items")
    .select("id, naam, telefoon, plaats, email, profiel_tekst, bellijst_id, tenant_id, kandidaat_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item || item.tenant_id !== profile.tenant_id) return;

  // Bestaat er al een kandidaat? Dan die openen.
  if (item.kandidaat_id) redirect(`/kandidaten/${item.kandidaat_id}`);

  const { data: bel } = await admin
    .from("bellijsten")
    .select("vacature_id")
    .eq("id", item.bellijst_id as string)
    .maybeSingle();
  let eigenaarId: string = user.id;
  if (bel?.vacature_id) {
    const { data: vac } = await admin.from("rec_vacatures").select("eigenaar").eq("id", bel.vacature_id as string).maybeSingle();
    if (vac?.eigenaar) eigenaarId = vac.eigenaar as string;
  }

  const naam = ((item.naam as string | null) ?? "").trim();
  const delen = naam.split(/\s+/).filter(Boolean);
  const voornaam = delen[0] || "Kandidaat";
  const achternaam = delen.slice(1).join(" ") || "—";

  const { data: nieuw, error } = await admin
    .from("kandidaten")
    .insert({
      tenant_id: profile.tenant_id,
      eigenaar_id: eigenaarId,
      voornaam,
      achternaam,
      telefoon: (item.telefoon as string | null) || null,
      email: (item.email as string | null) || null,
      woonplaats: (item.plaats as string | null) || null,
      notitie: (item.profiel_tekst as string | null) || null,
      kanban_stap: "interne_intake",
      vacature_id: bel?.vacature_id ?? null,
      bron_bellijst_item_id: itemId,
    })
    .select("id")
    .single();
  if (error || !nieuw) return;

  await admin.from("bellijst_items").update({ kandidaat_id: nieuw.id }).eq("id", itemId);

  revalidatePath("/vacature-aanmaken");
  redirect(`/kandidaten/${nieuw.id}/intake-bot`);
}

// "Onthul telefoon": zet een opdracht in de wachtrij om het telefoonnummer van
// één kandidaat uit Robin te onthullen (de bot opent het profiel + klikt onthul).
export async function onthulTelefoon(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const itemId = String(formData.get("itemId") || "").trim();
  if (!itemId) return;

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("bellijst_items")
    .select("id, naam, bellijst_id, tenant_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item || item.tenant_id !== profile.tenant_id) return;

  // Functie + plaats van de bijbehorende vacature ophalen om opnieuw te zoeken.
  const { data: bel } = await admin
    .from("bellijsten")
    .select("vacature_id")
    .eq("id", item.bellijst_id as string)
    .maybeSingle();
  let functie = "";
  let plaats = "";
  if (bel?.vacature_id) {
    const { data: vac } = await admin
      .from("rec_vacatures")
      .select("titel, locatie")
      .eq("id", bel.vacature_id as string)
      .maybeSingle();
    functie = (vac?.titel as string | null) ?? "";
    plaats = (vac?.locatie as string | null) ?? "";
  }

  await admin.from("zoek_jobs").insert({
    tenant_id: profile.tenant_id,
    type: "robin_telefoon",
    zoekterm: functie,
    plaats: plaats || null,
    vacature_id: bel?.vacature_id ?? null,
    doel_item_id: itemId,
    doel_naam: (item.naam as string | null) ?? null,
    aangemaakt_door: user.id,
  });

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
  // Locatie van de vacature ophalen voor het 40km-zoeken.
  const { data: vac } = await admin
    .from("rec_vacatures")
    .select("locatie, lat, lon")
    .eq("id", vacatureId)
    .maybeSingle();

  await maakRobinJobVoorVacature(admin, {
    tenantId: profile.tenant_id,
    vacatureId,
    functie,
    plaats: (vac?.locatie as string | null) ?? null,
    lat: (vac?.lat as number | null) ?? null,
    lon: (vac?.lon as number | null) ?? null,
    setterId: user.id,
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
