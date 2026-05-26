"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function updateBureauContactgegevens(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) redirect("/dashboard?error=Geen+tenant");
  if (profile.rol !== "admin") redirect("/dashboard?error=Alleen+admin+mag+bedrijfsgegevens+wijzigen");

  const update = {
    contact_naam:     ((formData.get("contact_naam") as string) ?? "").trim() || null,
    contact_functie:  ((formData.get("contact_functie") as string) ?? "").trim() || null,
    contact_tel:      ((formData.get("contact_tel") as string) ?? "").trim() || null,
    contact_email:    ((formData.get("contact_email") as string) ?? "").trim() || null,
    telefoon:         ((formData.get("telefoon") as string) ?? "").trim() || null,
    algemeen_email:   ((formData.get("algemeen_email") as string) ?? "").trim() || null,
    vestigingsadres:  ((formData.get("vestigingsadres") as string) ?? "").trim() || null,
    factuuradres:     ((formData.get("factuuradres") as string) ?? "").trim() || null,
  };

  const admin = createAdminClient();
  const { error } = await admin.from("tenants").update(update).eq("id", profile.tenant_id);

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard");
  redirect("/dashboard?ok=bedrijfsgegevens");
}
