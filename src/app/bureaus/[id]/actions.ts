"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export async function updateBureau(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email)) redirect("/bureaus?error=Geen+toegang");

  const update = {
    naam:              (formData.get("naam") as string)?.trim(),
    handelsnaam:       (formData.get("handelsnaam") as string)?.trim() || null,
    kvk:               (formData.get("kvk") as string)?.trim(),
    rechtsvorm:        (formData.get("rechtsvorm") as string)?.trim() || null,
    btw_nummer:        (formData.get("btw_nummer") as string)?.trim() || null,
    btw_id:            (formData.get("btw_id") as string)?.trim() || null,
    vestigingsadres:   (formData.get("vestigingsadres") as string)?.trim() || null,
    factuuradres:      (formData.get("factuuradres") as string)?.trim() || null,
    land:              (formData.get("land") as string)?.trim() || null,
    telefoon:          (formData.get("telefoon") as string)?.trim() || null,
    algemeen_email:    (formData.get("algemeen_email") as string)?.trim() || null,
    iban:              (formData.get("iban") as string)?.trim() || null,
    bic:               (formData.get("bic") as string)?.trim() || null,
    tenaamstelling:    (formData.get("tenaamstelling") as string)?.trim() || null,
    marge_split:       parseFloat(formData.get("marge_split") as string ?? "0.5"),
    finance_email:     (formData.get("finance_email") as string)?.trim() || null,
    contact_naam:      (formData.get("contact_naam") as string)?.trim() || null,
    contact_functie:   (formData.get("contact_functie") as string)?.trim() || null,
    contact_tel:       (formData.get("contact_tel") as string)?.trim() || null,
    contact_email:     (formData.get("contact_email") as string)?.trim() || null,
    ubo_naam:          (formData.get("ubo_naam") as string)?.trim() || null,
    ubo_geboortedatum: (formData.get("ubo_geboortedatum") as string) || null,
    status:            (formData.get("status") as string)?.trim() || "setup",
  };

  const admin = createAdminClient();
  const { error } = await admin.from("tenants").update(update).eq("id", id);

  if (error) {
    redirect(`/bureaus/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/bureaus/${id}`);
  revalidatePath("/bureaus");
  redirect(`/bureaus/${id}?ok=1`);
}

export async function verwijderBureau(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email)) redirect("/bureaus?error=Geen+toegang");

  const admin = createAdminClient();
  await admin.from("tenants").delete().eq("id", id);

  revalidatePath("/bureaus");
  redirect("/bureaus?ok=verwijderd");
}
