"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export type LeadType = "vondst" | "vacature";
export type LeadLabel = { id: string; naam: string; kleur: string; is_systeem: boolean };
export type LeadEvent = { id: string; soort: string; tekst: string | null; created_at: string; door: string };

type AdminClient = ReturnType<typeof createAdminClient>;

async function sessie() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("tenant_id, voornaam, achternaam")
    .eq("id", user.id)
    .maybeSingle();
  const tenantId = (p as { tenant_id?: string } | null)?.tenant_id;
  if (!tenantId) return null;
  const naam = [(p as { voornaam?: string })?.voornaam, (p as { achternaam?: string })?.achternaam].filter(Boolean).join(" ").trim() || "Iemand";
  return { userId: user.id, tenantId, naam };
}

async function logEvent(admin: AdminClient, tenantId: string, leadId: string, leadType: LeadType, soort: string, tekst: string | null, door: string) {
  await admin.from("lead_events").insert({ tenant_id: tenantId, lead_id: leadId, lead_type: leadType, soort, tekst, aangemaakt_door: door });
}

function herlaad() {
  revalidatePath("/vacature-aanmaken");
}

// Label aan/uit zetten op een lead.
export async function wisselLabel(leadId: string, leadType: LeadType, labelId: string) {
  const s = await sessie();
  if (!s || !leadId || !labelId) return;
  const admin = createAdminClient();
  const { data: label } = await admin.from("lead_labels").select("naam").eq("id", labelId).eq("tenant_id", s.tenantId).maybeSingle();
  if (!label) return;
  const { data: bestaat } = await admin
    .from("lead_label_links")
    .select("id")
    .eq("lead_id", leadId).eq("lead_type", leadType).eq("label_id", labelId)
    .maybeSingle();
  if (bestaat) {
    await admin.from("lead_label_links").delete().eq("id", (bestaat as { id: string }).id);
    await logEvent(admin, s.tenantId, leadId, leadType, "label", `Label verwijderd: ${(label as { naam: string }).naam}`, s.userId);
  } else {
    await admin.from("lead_label_links").insert({ tenant_id: s.tenantId, lead_id: leadId, lead_type: leadType, label_id: labelId, aangemaakt_door: s.userId });
    await logEvent(admin, s.tenantId, leadId, leadType, "label", `Label: ${(label as { naam: string }).naam}`, s.userId);
  }
  herlaad();
}

// Nieuw (gedeeld) label maken + meteen op de lead zetten.
export async function maakEnZetLabel(leadId: string, leadType: LeadType, naam: string, kleur: string): Promise<LeadLabel | null> {
  const s = await sessie();
  if (!s) return null;
  const n = (naam ?? "").trim().slice(0, 40);
  if (!n) return null;
  const k = /^#[0-9a-fA-F]{6}$/.test(kleur) ? kleur : "#64748b";
  const admin = createAdminClient();
  const { data } = await admin
    .from("lead_labels")
    .insert({ tenant_id: s.tenantId, naam: n, kleur: k, is_systeem: false, aangemaakt_door: s.userId })
    .select("id, naam, kleur, is_systeem")
    .single();
  if (data && leadId) {
    await admin.from("lead_label_links").insert({ tenant_id: s.tenantId, lead_id: leadId, lead_type: leadType, label_id: (data as { id: string }).id, aangemaakt_door: s.userId });
    await logEvent(admin, s.tenantId, leadId, leadType, "label", `Label: ${n}`, s.userId);
  }
  herlaad();
  return (data as LeadLabel) ?? null;
}

// Notitie toevoegen (komt in de tijdlijn).
export async function voegLeadNotitieToe(leadId: string, leadType: LeadType, tekst: string) {
  const s = await sessie();
  if (!s || !leadId) return;
  const t = (tekst ?? "").trim().slice(0, 2000);
  if (!t) return;
  const admin = createAdminClient();
  await logEvent(admin, s.tenantId, leadId, leadType, "notitie", t, s.userId);
  herlaad();
}

// Herinnering instellen: plant een melding voor jezelf op het gekozen tijdstip.
export async function zetLeadHerinnering(leadId: string, leadType: LeadType, tekst: string, wanneer: string) {
  const s = await sessie();
  if (!s || !leadId) return;
  const t = (tekst ?? "").trim().slice(0, 300) || "Terugbellen";
  const tijd = new Date(wanneer);
  if (isNaN(tijd.getTime())) return;
  const admin = createAdminClient();
  await admin.from("geplande_notificaties").insert({
    tenant_id: s.tenantId,
    voor_user_id: s.userId,
    gepland_door: s.userId,
    titel: "Lead-herinnering",
    bericht: t,
    geplande_tijd: tijd.toISOString(),
    status: "open",
    lead_id: leadId,
    lead_type: leadType,
  });
  await logEvent(admin, s.tenantId, leadId, leadType, "herinnering", `${t} — ${tijd.toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}`, s.userId);
  herlaad();
}

// Lead-gegevens ophalen (voor CRM) — gezaghebbend uit de database.
async function haalLeadData(admin: AdminClient, leadId: string, leadType: LeadType): Promise<{ naam: string; plaats: string | null; telefoon: string | null; website: string | null; titel: string | null } | null> {
  if (leadType === "vondst") {
    const { data } = await admin.from("jobdigger_vondsten").select("titel, bedrijf, plaats, url, telefoon").eq("id", leadId).maybeSingle();
    if (!data) return null;
    const d = data as { titel: string | null; bedrijf: string | null; plaats: string | null; url: string | null; telefoon: string | null };
    return { naam: d.bedrijf || d.titel || "Onbekend bedrijf", plaats: d.plaats, telefoon: d.telefoon, website: d.url, titel: d.titel };
  }
  const { data } = await admin.from("rec_vacatures").select("titel, bedrijfsnaam, intern_bedrijf, locatie, intern_telefoon").eq("id", leadId).maybeSingle();
  if (!data) return null;
  const d = data as { titel: string | null; bedrijfsnaam: string | null; intern_bedrijf: string | null; locatie: string | null; intern_telefoon: string | null };
  return { naam: d.intern_bedrijf || d.bedrijfsnaam || d.titel || "Onbekend bedrijf", plaats: d.locatie, telefoon: d.intern_telefoon, website: null, titel: d.titel };
}

async function maakOpdrachtgever(admin: AdminClient, tenantId: string, userId: string, data: { naam: string; plaats: string | null; telefoon: string | null; website: string | null; titel: string | null }): Promise<"nieuw" | "bestond"> {
  // Dubbele opdrachtgever (zelfde naam in tenant) vermijden.
  const { data: bestaat } = await admin.from("opdrachtgevers").select("id").eq("tenant_id", tenantId).ilike("naam", data.naam).maybeSingle();
  if (bestaat) return "bestond";
  await admin.from("opdrachtgevers").insert({
    tenant_id: tenantId,
    naam: data.naam,
    plaats: data.plaats,
    telefoon: data.telefoon,
    website: data.website,
    status: "lead",
    eigenaar_id: userId,
    notitie: data.titel ? `Toegevoegd vanuit lead: ${data.titel}` : "Toegevoegd vanuit leads",
    laatste_contact: new Date().toISOString(),
  });
  return "nieuw";
}

// Eén lead toevoegen aan het CRM (opdrachtgevers).
export async function voegLeadToeAanCrm(leadId: string, leadType: LeadType): Promise<{ ok: boolean; melding: string }> {
  const s = await sessie();
  if (!s || !leadId) return { ok: false, melding: "Geen toegang." };
  const admin = createAdminClient();
  const data = await haalLeadData(admin, leadId, leadType);
  if (!data) return { ok: false, melding: "Lead niet gevonden." };
  const res = await maakOpdrachtgever(admin, s.tenantId, s.userId, data);
  await logEvent(admin, s.tenantId, leadId, leadType, "crm", res === "nieuw" ? `Toegevoegd aan CRM: ${data.naam}` : `Stond al in CRM: ${data.naam}`, s.userId);
  herlaad();
  return { ok: true, melding: res === "nieuw" ? `${data.naam} toegevoegd aan CRM.` : `${data.naam} stond al in het CRM.` };
}

// Bulk: alle leads met een bepaald label in één keer toevoegen aan het CRM.
export async function voegLabelgroepToeAanCrm(labelId: string): Promise<{ ok: boolean; melding: string }> {
  const s = await sessie();
  if (!s || !labelId) return { ok: false, melding: "Geen toegang." };
  const admin = createAdminClient();
  const { data: links } = await admin
    .from("lead_label_links")
    .select("lead_id, lead_type")
    .eq("tenant_id", s.tenantId)
    .eq("label_id", labelId);
  const lijst = (links ?? []) as Array<{ lead_id: string; lead_type: LeadType }>;
  let nieuw = 0;
  let bestond = 0;
  for (const l of lijst) {
    const data = await haalLeadData(admin, l.lead_id, l.lead_type);
    if (!data) continue;
    const res = await maakOpdrachtgever(admin, s.tenantId, s.userId, data);
    if (res === "nieuw") { nieuw++; await logEvent(admin, s.tenantId, l.lead_id, l.lead_type, "crm", `Toegevoegd aan CRM: ${data.naam}`, s.userId); }
    else bestond++;
  }
  herlaad();
  return { ok: true, melding: `${nieuw} toegevoegd aan CRM${bestond ? `, ${bestond} stonden er al` : ""}.` };
}

// Tijdlijn van een lead ophalen (voor het paneel).
export async function getLeadTijdlijn(leadId: string, leadType: LeadType): Promise<LeadEvent[]> {
  const s = await sessie();
  if (!s || !leadId) return [];
  const admin = createAdminClient();
  const { data: events } = await admin
    .from("lead_events")
    .select("id, soort, tekst, created_at, aangemaakt_door")
    .eq("tenant_id", s.tenantId).eq("lead_id", leadId).eq("lead_type", leadType)
    .order("created_at", { ascending: false })
    .limit(100);
  const rijen = (events ?? []) as Array<{ id: string; soort: string; tekst: string | null; created_at: string; aangemaakt_door: string | null }>;
  const ids = Array.from(new Set(rijen.map((r) => r.aangemaakt_door).filter(Boolean) as string[]));
  const namen = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await admin.from("profiles").select("id, voornaam, achternaam").in("id", ids);
    for (const p of (profs ?? []) as Array<{ id: string; voornaam: string | null; achternaam: string | null }>) {
      namen.set(p.id, [p.voornaam, p.achternaam].filter(Boolean).join(" ").trim() || "Iemand");
    }
  }
  return rijen.map((r) => ({ id: r.id, soort: r.soort, tekst: r.tekst, created_at: r.created_at, door: r.aangemaakt_door ? (namen.get(r.aangemaakt_door) ?? "Iemand") : "Systeem" }));
}
