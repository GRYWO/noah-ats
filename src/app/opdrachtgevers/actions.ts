"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { huidigProfiel } from "@/utils/tenant";

export async function nieuweOpdrachtgever(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) redirect("/opdrachtgevers?error=Geen+tenant");

  const insert = {
    tenant_id: profile.tenant_id,
    eigenaar_id: user.id,
    naam:        (formData.get("naam") as string)?.trim(),
    kvk:         (formData.get("kvk") as string)?.trim() || null,
    btw_nummer:  (formData.get("btw_nummer") as string)?.trim() || null,
    adres:       (formData.get("adres") as string)?.trim() || null,
    plaats:      (formData.get("plaats") as string)?.trim() || null,
    website:     (formData.get("website") as string)?.trim() || null,
    branche:     (formData.get("branche") as string)?.trim() || null,
    status:      (formData.get("status") as string)?.trim() || "lead",
    notitie:     (formData.get("notitie") as string)?.trim() || null,
  };

  if (!insert.naam) redirect("/opdrachtgevers?error=Naam+verplicht");

  const { data: nieuw, error } = await supabase
    .from("opdrachtgevers")
    .insert(insert)
    .select("id")
    .single();

  if (error || !nieuw) {
    redirect(`/opdrachtgevers?error=${encodeURIComponent(error?.message ?? "Mislukt")}`);
  }

  revalidatePath("/opdrachtgevers");
  redirect(`/opdrachtgevers/${nieuw.id}`);
}

export async function updateOpdrachtgever(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  const update = {
    naam:        (formData.get("naam") as string)?.trim(),
    kvk:         (formData.get("kvk") as string)?.trim() || null,
    btw_nummer:  (formData.get("btw_nummer") as string)?.trim() || null,
    adres:       (formData.get("adres") as string)?.trim() || null,
    plaats:      (formData.get("plaats") as string)?.trim() || null,
    website:     (formData.get("website") as string)?.trim() || null,
    branche:     (formData.get("branche") as string)?.trim() || null,
    status:      (formData.get("status") as string)?.trim() || "lead",
    notitie:     (formData.get("notitie") as string)?.trim() || null,
  };

  const { error } = await supabase.from("opdrachtgevers").update(update).eq("id", id);
  if (error) redirect(`/opdrachtgevers/${id}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/opdrachtgevers/${id}`);
  revalidatePath("/opdrachtgevers");
  redirect(`/opdrachtgevers/${id}?ok=1`);
}

export async function verwijderOpdrachtgever(formData: FormData) {
  const id = formData.get("id") as string;
  const prof = await huidigProfiel();
  if (!prof?.tenant_id) redirect("/login");
  // Expliciete tenant-scope (niet alleen op RLS vertrouwen).
  await createAdminClient().from("opdrachtgevers").delete().eq("id", id).eq("tenant_id", prof.tenant_id);
  revalidatePath("/opdrachtgevers");
  redirect("/opdrachtgevers?ok=verwijderd");
}

export async function nieuweContactpersoon(formData: FormData) {
  const opdrachtgeverId = formData.get("opdrachtgever_id") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) redirect(`/opdrachtgevers/${opdrachtgeverId}?error=Geen+tenant`);

  const insert = {
    opdrachtgever_id: opdrachtgeverId,
    tenant_id:        profile.tenant_id,
    voornaam:         (formData.get("voornaam") as string)?.trim(),
    tussenvoegsel:    (formData.get("tussenvoegsel") as string)?.trim() || null,
    achternaam:       (formData.get("achternaam") as string)?.trim(),
    functie:          (formData.get("functie") as string)?.trim() || null,
    telefoon:         (formData.get("telefoon") as string)?.trim() || null,
    email:            (formData.get("email") as string)?.trim().toLowerCase() || null,
    primair:          formData.get("primair") === "on",
    notitie:          (formData.get("notitie") as string)?.trim() || null,
  };

  if (!insert.voornaam || !insert.achternaam) {
    redirect(`/opdrachtgevers/${opdrachtgeverId}?error=Naam+verplicht`);
  }

  const { error } = await supabase.from("contactpersonen").insert(insert);
  if (error) redirect(`/opdrachtgevers/${opdrachtgeverId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/opdrachtgevers/${opdrachtgeverId}`);
  redirect(`/opdrachtgevers/${opdrachtgeverId}?ok=contact`);
}

export async function verwijderContactpersoon(formData: FormData) {
  const id = formData.get("id") as string;
  const opdrachtgeverId = formData.get("opdrachtgever_id") as string;
  const prof = await huidigProfiel();
  if (!prof?.tenant_id) redirect("/login");
  const admin = createAdminClient();
  // Alleen verwijderen als de bijbehorende opdrachtgever van de eigen tenant is.
  const { data: og } = await admin.from("opdrachtgevers").select("tenant_id").eq("id", opdrachtgeverId).single();
  if (og?.tenant_id !== prof.tenant_id) redirect(`/opdrachtgevers/${opdrachtgeverId}?error=Geen+toegang`);
  await admin.from("contactpersonen").delete().eq("id", id).eq("opdrachtgever_id", opdrachtgeverId);
  revalidatePath(`/opdrachtgevers/${opdrachtgeverId}`);
  redirect(`/opdrachtgevers/${opdrachtgeverId}`);
}
