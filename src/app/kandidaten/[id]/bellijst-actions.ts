"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { parseJobdiggerExcel } from "@/utils/jobdigger-parser";
import { triggerKanbanMails } from "@/utils/kanban-mails";

const STAPPEN_VOOR_IN_PROCES = new Set([
  "interne_intake",
  "in_afwachting_cv",
  "in_wachtrij",
  "bij_setter",
]);

export async function uploadBellijst(formData: FormData) {
  const kandidaatId = formData.get("kandidaat_id") as string;
  const naamInput = (formData.get("naam") as string)?.trim();
  const file = formData.get("file") as File;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    redirect(`/kandidaten/${kandidaatId}?error=Geen+tenant`);
  }

  if (!file || file.size === 0) {
    redirect(`/kandidaten/${kandidaatId}?error=Geen+bestand`);
  }

  // Parse
  const buf = await file.arrayBuffer();
  let parsed: ReturnType<typeof parseJobdiggerExcel>;
  try {
    parsed = parseJobdiggerExcel(buf);
  } catch (e) {
    redirect(`/kandidaten/${kandidaatId}?error=${encodeURIComponent("Excel inlezen mislukt: " + (e as Error).message)}`);
  }

  if (parsed.rows.length === 0) {
    redirect(`/kandidaten/${kandidaatId}?error=Geen+geldige+rijen+in+bestand`);
  }

  const admin = createAdminClient();
  const { data: bellijst, error: bErr } = await admin.from("bellijsten").insert({
    tenant_id: profile.tenant_id,
    kandidaat_id: kandidaatId,
    setter_id: user.id,
    naam: naamInput || parsed.naam,
    aantal_items: parsed.rows.length,
    bron: "jobdigger",
  }).select("id").single();

  if (bErr || !bellijst) {
    redirect(`/kandidaten/${kandidaatId}?error=${encodeURIComponent(bErr?.message ?? "Bellijst opslaan mislukt")}`);
  }

  const items = parsed.rows.map((r, idx) => ({
    bellijst_id: bellijst.id,
    tenant_id: profile.tenant_id,
    functie: r.functie ?? null,
    bedrijf: r.bedrijf ?? null,
    plaats: r.plaats ?? null,
    postcode: r.postcode ?? null,
    telefoon: r.telefoon ?? null,
    website: r.website ?? null,
    branche: r.branche ?? null,
    raw_data: r.raw_data ?? null,
    volgorde: idx,
  }));

  // Batch insert in chunks van 100
  for (let i = 0; i < items.length; i += 100) {
    await admin.from("bellijst_items").insert(items.slice(i, i + 100));
  }

  // Auto-overgang naar "in_proces" als de kandidaat nog in een eerdere stap zit
  const { data: huidigeStap } = await admin
    .from("kandidaten")
    .select("kanban_stap")
    .eq("id", kandidaatId)
    .single();
  if (huidigeStap && STAPPEN_VOOR_IN_PROCES.has(huidigeStap.kanban_stap)) {
    await admin.from("kandidaten").update({
      kanban_stap: "in_proces",
      status: "in_proces",
    }).eq("id", kandidaatId);
    await triggerKanbanMails({
      kandidaatId,
      oudeStap: huidigeStap.kanban_stap,
      nieuweStap: "in_proces",
      vanUserId: user.id,
    });
  }

  revalidatePath(`/kandidaten/${kandidaatId}`);
  redirect(`/kandidaten/${kandidaatId}?ok=bellijst`);
}

export async function updateBellijstItem(formData: FormData) {
  const id = formData.get("id") as string;
  const kandidaatId = formData.get("kandidaat_id") as string;
  const label = (formData.get("label") as string) || null;
  const status = (formData.get("status") as string) || "open";
  const notitie = (formData.get("notitie") as string)?.trim() || null;

  const admin = createAdminClient();
  await admin.from("bellijst_items").update({
    label,
    status,
    notitie,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(`/kandidaten/${kandidaatId}`);
}

export async function verwijderBellijstItem(formData: FormData) {
  const id = formData.get("id") as string;
  const kandidaatId = formData.get("kandidaat_id") as string;

  const admin = createAdminClient();
  await admin.from("bellijst_items").delete().eq("id", id);

  revalidatePath(`/kandidaten/${kandidaatId}`);
}

export async function updateBellijstNaam(formData: FormData) {
  const id = formData.get("id") as string;
  const kandidaatId = formData.get("kandidaat_id") as string;
  const naam = (formData.get("naam") as string)?.trim();
  if (!naam) return;

  const admin = createAdminClient();
  await admin.from("bellijsten").update({ naam, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/kandidaten/${kandidaatId}`);
}

export async function verwijderBellijst(formData: FormData) {
  const id = formData.get("id") as string;
  const kandidaatId = formData.get("kandidaat_id") as string;

  const admin = createAdminClient();
  await admin.from("bellijsten").delete().eq("id", id);

  revalidatePath(`/kandidaten/${kandidaatId}`);
}

/**
 * Voeg een bellijst-item toe aan de CRM (opdrachtgevers tabel).
 */
export async function voegBellijstItemToeAanCrm(formData: FormData) {
  const id = formData.get("id") as string;
  const kandidaatId = formData.get("kandidaat_id") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return;

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("bellijst_items")
    .select("*")
    .eq("id", id)
    .single();

  if (!item || !item.bedrijf) return;

  // Bestaat de relatie al?
  const { data: bestaand } = await admin
    .from("opdrachtgevers")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .ilike("naam", item.bedrijf)
    .maybeSingle();

  let opdrachtgeverId: string;
  if (bestaand) {
    opdrachtgeverId = bestaand.id;
    await admin.from("opdrachtgevers").update({
      laatste_contact: new Date().toISOString(),
    }).eq("id", opdrachtgeverId);
  } else {
    const { data: nieuw, error: insErr } = await admin.from("opdrachtgevers").insert({
      tenant_id: profile.tenant_id,
      naam: item.bedrijf,
      plaats: item.plaats,
      telefoon: item.telefoon,
      website: item.website,
      branche: item.branche,
      status: "lead",
      eigenaar_id: user.id,
      laatste_contact: new Date().toISOString(),
    }).select("id").single();
    if (insErr) {
      console.error("[bellijst→CRM] opdrachtgever insert mislukt:", insErr);
    }
    opdrachtgeverId = nieuw?.id ?? "";
  }

  if (opdrachtgeverId) {
    const { error: upErr } = await admin.from("bellijst_items").update({
      opdrachtgever_id: opdrachtgeverId,
      label: item.label ?? "geinteresseerd",
    }).eq("id", id);
    if (upErr) {
      console.error("[bellijst→CRM] item update mislukt:", upErr);
    }
  }

  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/opdrachtgevers");
}

/**
 * Maak opdrachtgever aan met door gebruiker bewerkte velden en koppel aan bellijst_item.
 */
export async function maakRelatieVanBellijstItem(formData: FormData) {
  const itemId = formData.get("item_id") as string;
  const kandidaatId = formData.get("kandidaat_id") as string;

  const naam = (formData.get("naam") as string)?.trim();
  const plaats = (formData.get("plaats") as string)?.trim() || null;
  const telefoon = (formData.get("telefoon") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const branche = (formData.get("branche") as string)?.trim() || null;
  const status = (formData.get("status") as string)?.trim() || "lead";
  const notitie = (formData.get("notitie") as string)?.trim() || null;

  if (!naam) {
    return { error: "Naam is verplicht" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return { error: "Geen tenant" };

  const admin = createAdminClient();

  // Bestaat de relatie al?
  const { data: bestaand } = await admin
    .from("opdrachtgevers")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .ilike("naam", naam)
    .maybeSingle();

  let opdrachtgeverId: string;
  if (bestaand) {
    opdrachtgeverId = bestaand.id;
    await admin.from("opdrachtgevers").update({
      laatste_contact: new Date().toISOString(),
      ...(plaats && { plaats }),
      ...(telefoon && { telefoon }),
      ...(website && { website }),
      ...(branche && { branche }),
    }).eq("id", opdrachtgeverId);
  } else {
    const { data: nieuw, error: insErr } = await admin.from("opdrachtgevers").insert({
      tenant_id: profile.tenant_id,
      naam,
      plaats,
      telefoon,
      website,
      branche,
      status,
      notitie,
      eigenaar_id: user.id,
      laatste_contact: new Date().toISOString(),
    }).select("id").single();
    if (insErr || !nieuw) {
      return { error: insErr?.message ?? "Aanmaken mislukt" };
    }
    opdrachtgeverId = nieuw.id;
  }

  // Koppel item aan relatie
  await admin.from("bellijst_items").update({
    opdrachtgever_id: opdrachtgeverId,
    label: "geinteresseerd",
  }).eq("id", itemId);

  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/opdrachtgevers");
  return { ok: true, opdrachtgeverId };
}
