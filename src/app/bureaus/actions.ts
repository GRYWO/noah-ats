"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export async function nieuwBureau(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email)) redirect("/bureaus?error=Geen+toegang");

  const naam              = (formData.get("naam") as string)?.trim();
  const handelsnaam       = (formData.get("handelsnaam") as string)?.trim() || null;
  const kvk               = (formData.get("kvk") as string)?.trim();
  const rechtsvorm        = (formData.get("rechtsvorm") as string)?.trim() || null;
  const btw_nummer        = (formData.get("btw_nummer") as string)?.trim() || null;
  const btw_id            = (formData.get("btw_id") as string)?.trim() || null;
  const vestigingsadres   = (formData.get("vestigingsadres") as string)?.trim() || null;
  const factuuradres      = (formData.get("factuuradres") as string)?.trim() || null;
  const land              = (formData.get("land") as string)?.trim() || null;
  const telefoon          = (formData.get("telefoon") as string)?.trim() || null;
  const algemeen_email    = (formData.get("algemeen_email") as string)?.trim() || null;
  const iban              = (formData.get("iban") as string)?.trim() || null;
  const bic               = (formData.get("bic") as string)?.trim() || null;
  const tenaamstelling    = (formData.get("tenaamstelling") as string)?.trim() || null;
  const marge_split       = parseFloat(formData.get("marge_split") as string ?? "0.5");
  const finance_email     = (formData.get("finance_email") as string)?.trim() || null;
  const contact_naam      = (formData.get("contact_naam") as string)?.trim() || null;
  const contact_functie   = (formData.get("contact_functie") as string)?.trim() || null;
  const contact_tel       = (formData.get("contact_tel") as string)?.trim() || null;
  const contact_email     = (formData.get("contact_email") as string)?.trim() || null;
  const ubo_naam          = (formData.get("ubo_naam") as string)?.trim() || null;
  const ubo_geboortedatum = (formData.get("ubo_geboortedatum") as string) || null;

  if (!naam || !kvk) {
    redirect("/bureaus?error=Bedrijfsnaam+en+KvK+verplicht");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("tenants").insert({
    naam,
    handelsnaam,
    kvk,
    rechtsvorm,
    btw_nummer,
    btw_id,
    vestigingsadres,
    factuuradres,
    land,
    telefoon,
    algemeen_email,
    iban,
    bic,
    tenaamstelling,
    marge_split,
    finance_email,
    contact_naam,
    contact_functie,
    contact_tel,
    contact_email,
    ubo_naam,
    ubo_geboortedatum: ubo_geboortedatum || null,
    status: "setup",
  });

  if (error) {
    redirect(`/bureaus?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/bureaus");
  redirect("/bureaus?ok=1");
}
