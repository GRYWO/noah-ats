"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { DEFAULT_BODIES, type TemplateSleutel } from "@/utils/mail-templates";

export async function updateMailTemplate(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!isSuperAdminEmail(user.email)) {
    redirect("/instellingen?error=Geen+toegang");
  }

  const sleutel = formData.get("sleutel") as TemplateSleutel;
  const body = (formData.get("body_html") as string) ?? "";

  if (!sleutel || !(sleutel in DEFAULT_BODIES)) {
    redirect("/instellingen?error=Onbekende+template");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("mail_templates").upsert({
    sleutel,
    body_html: body,
    laatst_gewijzigd: new Date().toISOString(),
    laatst_gewijzigd_door: user.id,
  }, { onConflict: "sleutel" });

  if (error) {
    redirect(`/instellingen?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/instellingen");
  redirect("/instellingen?ok=template");
}

export async function resetMailTemplate(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!isSuperAdminEmail(user.email)) {
    redirect("/instellingen?error=Geen+toegang");
  }

  const sleutel = formData.get("sleutel") as TemplateSleutel;
  if (!sleutel || !(sleutel in DEFAULT_BODIES)) {
    redirect("/instellingen?error=Onbekende+template");
  }

  const admin = createAdminClient();
  await admin.from("mail_templates").delete().eq("sleutel", sleutel);

  revalidatePath("/instellingen");
  redirect("/instellingen?ok=template_reset");
}
