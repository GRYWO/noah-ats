"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { encrypt } from "@/utils/crypto";

export async function nieuwMailAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mailAdres      = (formData.get("mail_adres") as string)?.trim().toLowerCase();
  const mailWachtwoord = (formData.get("mail_wachtwoord") as string)?.trim();
  const displayNaam    = (formData.get("display_naam") as string)?.trim() || mailAdres;
  const isPrimary      = formData.get("is_primary") === "on";

  if (!mailAdres || !mailWachtwoord) {
    redirect("/instellingen?error=Mailadres+en+wachtwoord+verplicht");
  }

  const admin = createAdminClient();

  // Als primary aangevinkt → andere op false zetten
  if (isPrimary) {
    await admin.from("mail_accounts").update({ is_primary: false }).eq("user_id", user.id);
  }

  const { error } = await admin.from("mail_accounts").insert({
    user_id: user.id,
    mail_adres: mailAdres,
    mail_wachtwoord: encrypt(mailWachtwoord),
    display_naam: displayNaam,
    is_primary: isPrimary,
    mail_status: "actief",
  });

  if (error) {
    redirect(`/instellingen?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/instellingen");
  redirect("/instellingen?ok=account");
}

export async function verwijderMailAccount(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  await admin.from("mail_accounts").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/instellingen");
  redirect("/instellingen?ok=verwijderd");
}

export async function maakPrimair(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  await admin.from("mail_accounts").update({ is_primary: false }).eq("user_id", user.id);
  await admin.from("mail_accounts").update({ is_primary: true }).eq("id", id).eq("user_id", user.id);

  revalidatePath("/instellingen");
  redirect("/instellingen?ok=primair");
}
