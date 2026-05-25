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

  // Haal rol + primair mail-adres op
  const admin = createAdminClient();
  const { data: huidigeProfile } = await admin
    .from("profiles")
    .select("rol")
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

  // Alleen admin mag een functie-titel zetten (recruiter/setter zien het veld niet)
  const functieTitel = rol === "admin" ? (functieTitelInput || null) : null;

  const handtekening = bouwHandtekening({
    voornaam,
    achternaam,
    rol,
    telefoon,
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
