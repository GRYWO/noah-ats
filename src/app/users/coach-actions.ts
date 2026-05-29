"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function setCoachStatus(formData: FormData) {
  const userId = (formData.get("user_id") as string) ?? "";
  const isCoach = (formData.get("is_coach") as string) === "true";
  if (!userId) return { error: "Geen user_id" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  if (profile?.rol !== "admin") return { error: "Alleen admin mag coach-status wijzigen" };
  if (!profile.tenant_id) return { error: "Geen tenant" };

  const admin = createAdminClient();

  // Verifieer dat target-user in dezelfde tenant zit
  const { data: target } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .single();
  if (!target || target.tenant_id !== profile.tenant_id) {
    return { error: "User niet in dezelfde tenant" };
  }

  // Bij aanzetten: andere coaches in tenant uitzetten (1 coach per tenant)
  if (isCoach) {
    await admin.from("profiles")
      .update({ is_coach: false })
      .eq("tenant_id", profile.tenant_id)
      .neq("id", userId);
  }

  const { error } = await admin.from("profiles")
    .update({ is_coach: isCoach })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/users");
  revalidatePath("/coaching");
  return { ok: true };
}
