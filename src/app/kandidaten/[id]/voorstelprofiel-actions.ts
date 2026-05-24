"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

async function checkAdminOfRecruiter() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (profile?.rol === "setter") {
    throw new Error("Setters kunnen voorstelprofiel niet bewerken");
  }
  return { userId: user.id, rol: profile?.rol };
}

export async function goedkeurenCv(formData: FormData) {
  const id = formData.get("id") as string;
  const { userId } = await checkAdminOfRecruiter();
  const admin = createAdminClient();
  await admin.from("kandidaten").update({
    cv_controle_status: "goedgekeurd",
    cv_controle_op: new Date().toISOString(),
    cv_controle_door: userId,
  }).eq("id", id);
  revalidatePath(`/kandidaten/${id}`);
}

export async function afkeurenCv(formData: FormData) {
  const id = formData.get("id") as string;
  const { userId } = await checkAdminOfRecruiter();
  const admin = createAdminClient();
  await admin.from("kandidaten").update({
    cv_controle_status: "afgekeurd",
    status: "afgewezen",
    cv_controle_op: new Date().toISOString(),
    cv_controle_door: userId,
  }).eq("id", id);
  revalidatePath(`/kandidaten/${id}`);
}

export async function updateProfielschets(formData: FormData) {
  const id = formData.get("id") as string;
  const schets = (formData.get("profielschets") as string)?.trim() || null;
  await checkAdminOfRecruiter();
  const admin = createAdminClient();
  await admin.from("kandidaten").update({ profielschets: schets }).eq("id", id);
  revalidatePath(`/kandidaten/${id}`);
  revalidatePath(`/kandidaten/${id}/voorstelprofiel`);
}

export async function updateVoorstelprofielExtra(formData: FormData) {
  const id = formData.get("id") as string;
  const json = (formData.get("voorstelprofiel_extra") as string)?.trim();
  let parsed: unknown = null;
  if (json) {
    try { parsed = JSON.parse(json); } catch { parsed = null; }
  }
  await checkAdminOfRecruiter();
  const admin = createAdminClient();
  await admin.from("kandidaten").update({ voorstelprofiel_extra: parsed }).eq("id", id);
  revalidatePath(`/kandidaten/${id}`);
}
