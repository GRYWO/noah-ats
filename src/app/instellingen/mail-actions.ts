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

  // Als er al een mail_accounts-rij is voor (user_id, mail_adres), dan
  // werken we die bij in plaats van te falen op de unique-constraint. Zo
  // kan de user veilig een wachtwoord of display-naam updaten via dit form.
  const { data: bestaande } = await admin
    .from("mail_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("mail_adres", mailAdres)
    .maybeSingle();

  const payload = {
    user_id: user.id,
    mail_adres: mailAdres,
    mail_wachtwoord: encrypt(mailWachtwoord),
    display_naam: displayNaam,
    is_primary: isPrimary,
    mail_status: "actief",
  };

  const { error } = bestaande?.id
    ? await admin.from("mail_accounts").update(payload).eq("id", bestaande.id)
    : await admin.from("mail_accounts").insert(payload);

  if (error) {
    const vriendelijk = /duplicate key|unique constraint/i.test(error.message)
      ? "Dit mailadres staat al gekoppeld aan jouw account."
      : error.message;
    redirect(`/instellingen?error=${encodeURIComponent(vriendelijk)}`);
  }

  revalidatePath("/instellingen");
  redirect(`/instellingen?ok=${bestaande?.id ? "bijgewerkt" : "account"}`);
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
