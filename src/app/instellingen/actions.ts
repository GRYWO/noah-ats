"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { bouwHandtekening } from "@/utils/email-signature";

export async function updateMailConfig(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const voornaam       = (formData.get("voornaam") as string)?.trim();
  const achternaam     = (formData.get("achternaam") as string)?.trim();
  const telefoon       = (formData.get("telefoon") as string)?.trim();
  const functieTitelInput = (formData.get("functie_titel") as string)?.trim();

  // Haal rol + voys-nummer + primair mail-adres op
  const admin = createAdminClient();
  const { data: huidigeProfile } = await admin
    .from("profiles")
    .select("rol, voys_nummer")
    .eq("id", user.id)
    .single();
  const { data: primair } = await admin
    .from("mail_accounts")
    .select("mail_adres")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();
  const mailAdres = primair?.mail_adres ?? user.email ?? "";
  const rol = (huidigeProfile?.rol ?? "setter") as "admin" | "recruiter" | "setter";
  const voysNummer = (huidigeProfile?.voys_nummer ?? null) as string | null;

  // Alleen admin mag een functie-titel zetten (recruiter/setter zien het veld niet)
  const functieTitel = rol === "admin" ? (functieTitelInput || null) : null;

  // Telefoon (privé/mobiel) blijft administratief en gaat NIET in de handtekening.
  // Alleen het Voys-nummer komt zichtbaar onder de mail.
  const handtekening = bouwHandtekening({
    voornaam,
    achternaam,
    rol,
    voysNummer,
    mailAdres,
    functieTitel,
  });

  const update: Record<string, unknown> = {
    voornaam,
    achternaam,
    telefoon,
    functie_titel: functieTitel,
    handtekening_html: handtekening,
  };

  const { error } = await admin.from("profiles").update(update).eq("id", user.id);

  if (error) {
    redirect(`/instellingen?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/instellingen");
  redirect("/instellingen?ok=profiel");
}

/**
 * Wachtwoord wijzigen door de ingelogde user zelf.
 * Vereist huidig wachtwoord (om sessie-overname te voorkomen) + nieuw wachtwoord min 8 tekens.
 */
export async function wijzigEigenWachtwoord(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const huidig = (formData.get("huidig_wachtwoord") as string) ?? "";
  const nieuw  = (formData.get("nieuw_wachtwoord")  as string) ?? "";
  const nieuw2 = (formData.get("nieuw_wachtwoord2") as string) ?? "";

  if (!huidig || !nieuw) {
    redirect("/instellingen?error=" + encodeURIComponent("Vul huidig + nieuw wachtwoord in"));
  }
  if (nieuw.length < 8) {
    redirect("/instellingen?error=" + encodeURIComponent("Nieuw wachtwoord min. 8 tekens"));
  }
  if (nieuw !== nieuw2) {
    redirect("/instellingen?error=" + encodeURIComponent("Nieuwe wachtwoorden komen niet overeen"));
  }

  // Check huidig wachtwoord met re-login (geeft fout als verkeerd)
  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: huidig,
  });
  if (loginErr) {
    redirect("/instellingen?error=" + encodeURIComponent("Huidig wachtwoord klopt niet"));
  }

  // Update naar nieuw wachtwoord
  const { error: updErr } = await supabase.auth.updateUser({ password: nieuw });
  if (updErr) {
    redirect("/instellingen?error=" + encodeURIComponent(updErr.message));
  }

  revalidatePath("/instellingen");
  redirect("/instellingen?ok=wachtwoord");
}
