"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Annuleer een geplande herinnering. Alleen de planner zelf mag annuleren.
 */
export async function annuleerHerinnering(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const id = formData.get("id") as string;
  if (!id) return { error: "Id ontbreekt" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("geplande_notificaties")
    .update({ status: "geannuleerd" })
    .eq("id", id)
    .eq("gepland_door", user.id);
  if (error) return { error: error.message };

  revalidatePath("/herinneringen");
  return { ok: true };
}
