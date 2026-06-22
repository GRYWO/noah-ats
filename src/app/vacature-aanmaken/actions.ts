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
          "\n\nLever JSON: { \"publiek_tekst\": string (functieomschrijving, wat je gaat doen, wat we vragen, wat we bieden, in korte alinea's met kopjes als gewone tekst), \"samenvatting\": string (max 18 woorden), \"tags\": string[] (5-10 trefwoorden: functie, vaardigheden, sector, regio) }",
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
// Server actions
// ---------------------------------------------------------------
export async function maakVacatureNoahAts(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profiel ophalen voor contactpersoon
  const { data: profiel } = await supabase
    .from("profiles")
    .select("voornaam, achternaam")
    .eq("id", user.id)
    .single();

  const input: VacatureInput = {
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

  // Interne contactgegevens — ALLEEN voor ons, komen nooit op de website
  // en gaan NIET naar de AI (die maakt een anonieme tekst).
  const intern_contactpersoon = String(formData.get("contactpersoon") || "").trim() || null;
  const intern_telefoon = String(formData.get("contact_telefoon") || "").trim() || null;
  const intern_mailadres = String(formData.get("contact_mailadres") || "").trim() || null;
  const intern_bedrijf = String(formData.get("intern_bedrijf") || "").trim() || null;

  // Commerciele afspraken (intern, NIET meegegeven aan AI).
  const tariefRaw = String(formData.get("afspraak_tarief_type") || "").trim();
  const TARIEF_TOEGESTAAN = new Set(["ws_10", "ws_15", "ws_anders", "uitzend"]);
  const afspraak_tarief_type = TARIEF_TOEGESTAAN.has(tariefRaw) ? tariefRaw : null;

  // Percentage server-side forceren op basis van tarief_type. Voorkomt
  // dat een setter via client-side knutselen 'ws_10' kiest maar percentage
  // 99 meestuurt. Voor ws_anders pakken we de door de gebruiker getypte waarde.
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

  if (!input.titel) {
    redirect("/vacature-aanmaken/nieuw?fout=" + encodeURIComponent("Functietitel is verplicht."));
  }

  // AI is bonus: bij fout slaan we de vacature zonder publieke tekst op.
  let publiek_tekst: string | null = null;
  let samenvatting: string | null = null;
  let tags: string[] | null = null;
  try {
    const ai = await genereerVacature(input);
    publiek_tekst = ai.publiek_tekst;
    samenvatting = ai.samenvatting;
    tags = ai.tags;
  } catch {
    // Fallback uit ruwe velden
    publiek_tekst =
      `Voor een opdrachtgever in de regio ${input.locatie || "Nederland"} zoeken wij een ${input.titel}.\n\n` +
      (input.taken ? `Wat ga je doen?\n${input.taken}\n\n` : "") +
      (input.eisen ? `Wat vragen we?\n${input.eisen}\n\n` : "") +
      (input.salaris ? `Salarisindicatie: ${input.salaris}\n` : "");
    samenvatting = `${input.titel}${input.locatie ? ", " + input.locatie : ""}`;
    tags = [input.titel, input.sector, input.locatie].filter(Boolean) as string[];
  }

  const coord = input.locatie ? await geocode(input.locatie) : null;

  const voornaam = (profiel?.voornaam ?? "").trim();
  const achternaam = (profiel?.achternaam ?? "").trim();
  const contactNaam = [voornaam, achternaam].filter(Boolean).join(" ") || "Noah recruitment";

  const admin = createAdminClient();
  const { error } = await admin
    .from("rec_vacatures")
    .insert({
      eigenaar: user.id,
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
