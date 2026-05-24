"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { autoWijsKandidaatToe } from "@/utils/setter-assign";

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
  // CV goedgekeurd → intake klaar → kandidaat naar setter (of wachtrij)
  await admin.from("kandidaten").update({
    cv_controle_status: "goedgekeurd",
    cv_controle_op: new Date().toISOString(),
    cv_controle_door: userId,
    kanban_stap: "interne_intake_voltooid",
    intake_voltooid: true,
  }).eq("id", id);

  // Auto-toewijzen aan vrije setter; geen vrij? → blijft eigenaar_id null = wachtrij
  await autoWijsKandidaatToe(id);

  revalidatePath(`/kandidaten/${id}`);
  revalidatePath("/kandidaten");
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

export async function updateRodeVlagToelichting(formData: FormData) {
  const id = formData.get("id") as string;
  const code = formData.get("code") as string;
  const toelichting = (formData.get("toelichting") as string)?.trim() || "";
  await checkAdminOfRecruiter();

  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select("cv_geparseerd")
    .eq("id", id)
    .single();

  const cv = (k?.cv_geparseerd ?? {}) as { rode_vlaggen?: Array<Record<string, unknown>> };
  const vlaggen = Array.isArray(cv.rode_vlaggen) ? cv.rode_vlaggen : [];
  const nieuw = vlaggen.map(v => {
    if (typeof v === "object" && v && v.code === code) {
      return { ...v, toelichting };
    }
    return v;
  });

  await admin.from("kandidaten")
    .update({ cv_geparseerd: { ...cv, rode_vlaggen: nieuw } })
    .eq("id", id);

  revalidatePath(`/kandidaten/${id}`);
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
