"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function maakAgendaEvent(formData: FormData) {
  const titel       = (formData.get("titel") as string)?.trim();
  const beschrijving= (formData.get("beschrijving") as string)?.trim() || null;
  const startLocal  = (formData.get("start_op") as string)?.trim();
  const eindLocal   = (formData.get("eind_op") as string)?.trim();
  const locatie     = (formData.get("locatie") as string)?.trim() || null;
  const meetUrl     = (formData.get("meet_url") as string)?.trim() || null;

  if (!titel || !startLocal) redirect("/agenda?error=Titel+en+start+verplicht");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) redirect("/agenda?error=Geen+tenant");
  if (profile.rol !== "admin") redirect("/agenda?error=Alleen+admin+mag+events+aanmaken");

  const admin = createAdminClient();
  const { error } = await admin.from("agenda_events").insert({
    tenant_id: profile.tenant_id,
    titel,
    beschrijving,
    start_op: new Date(startLocal).toISOString(),
    eind_op: eindLocal ? new Date(eindLocal).toISOString() : null,
    locatie,
    meet_url: meetUrl,
    aangemaakt_door: user.id,
  });

  if (error) redirect(`/agenda?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/agenda");
  redirect("/agenda?ok=event");
}

export async function verwijderAgendaEvent(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) redirect("/agenda");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  if (profile?.rol !== "admin") redirect("/agenda?error=Geen+rechten");

  const admin = createAdminClient();
  await admin.from("agenda_events").delete().eq("id", id).eq("tenant_id", profile.tenant_id!);

  revalidatePath("/agenda");
  redirect("/agenda?ok=verwijderd");
}
