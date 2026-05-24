"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const TOEGESTANE_VELDEN = new Set([
  "soort_dienstverband",
  "werving_of_uitzend",
  "salaris_indicatie",
  "max_reisafstand_km",
  "eigen_vervoer",
  "rijbewijs",
  "blacklist_bedrijven",
  "bijzonderheden",
  "tarief_ws",
  "omrekenfactor_uitzendbasis",
]);

export async function updateIntakeAntwoorden(formData: FormData) {
  const id = formData.get("id") as string;
  const antwoordenJson = formData.get("antwoorden") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (profile?.rol === "setter") return;

  let antwoorden: Record<string, string> = {};
  try { antwoorden = JSON.parse(antwoordenJson); } catch { return; }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(antwoorden)) {
    if (!TOEGESTANE_VELDEN.has(k) || !v) continue;
    if (k === "max_reisafstand_km") {
      const n = parseInt(v);
      if (!isNaN(n)) update[k] = n;
    } else if (k === "eigen_vervoer") {
      update[k] = v.toLowerCase() === "ja";
    } else {
      update[k] = v;
    }
  }

  if (Object.keys(update).length === 0) return;

  const admin = createAdminClient();
  await admin.from("kandidaten").update(update).eq("id", id);

  revalidatePath(`/kandidaten/${id}`);
}

export async function markIntakeVoltooid(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
  if (profile?.rol === "setter") return;

  const admin = createAdminClient();
  await admin.from("kandidaten").update({ intake_voltooid: true }).eq("id", id);
  revalidatePath(`/kandidaten/${id}`);
}
