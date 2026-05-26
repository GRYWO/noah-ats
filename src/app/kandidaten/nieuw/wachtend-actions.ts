"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendCvReminderAanWachtende } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";

const VERVAL_DAGEN = 7;

export async function voegToeWachtendOpCv(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id || profile.rol === "setter") {
    redirect("/kandidaten/nieuw?error=Geen+toegang");
  }

  const voornaam   = (formData.get("voornaam") as string)?.trim();
  const achternaam = (formData.get("achternaam") as string)?.trim();
  const telefoon   = (formData.get("telefoon") as string)?.trim() || null;
  const email      = (formData.get("email") as string)?.trim() || null;
  const notitie    = (formData.get("notitie") as string)?.trim() || null;

  if (!voornaam || !achternaam) {
    redirect("/kandidaten/nieuw?error=Voornaam+en+achternaam+verplicht");
  }

  const admin = createAdminClient();
  await admin.from("wachtend_op_cv").insert({
    tenant_id: profile.tenant_id,
    voornaam,
    achternaam,
    telefoon,
    email,
    notitie,
    aangemaakt_door: user.id,
  });

  revalidatePath("/kandidaten/nieuw");
  redirect("/kandidaten/nieuw?ok=wachtend");
}

export async function stuurCvReminder(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const id = formData.get("id") as string;
  if (!id) return { error: "Geen id" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const admin = createAdminClient();
  const { data: w } = await admin
    .from("wachtend_op_cv")
    .select("voornaam, email")
    .eq("id", id)
    .single();
  if (!w?.email) return { error: "Geen e-mailadres bij deze kandidaat" };

  try {
    const from = await getSetterFrom(user.id);
    await sendCvReminderAanWachtende({
      naar: w.email,
      voornaam: w.voornaam ?? "",
      from,
    });
    await admin
      .from("wachtend_op_cv")
      .update({ reminder_sent: new Date().toISOString() })
      .eq("id", id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/kandidaten");
  return { ok: true };
}

export async function verwijderWachtend(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const admin = createAdminClient();
  await admin.from("wachtend_op_cv").delete().eq("id", id);
  revalidatePath("/kandidaten/nieuw");
}

/**
 * Verwijder wachtenden ouder dan VERVAL_DAGEN. Wordt aangeroepen bij elke
 * load van /kandidaten/nieuw zodat lijst zichzelf schoonhoudt.
 */
export async function ruimOudeWachtenden() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return;

  const grens = new Date(Date.now() - VERVAL_DAGEN * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  await admin
    .from("wachtend_op_cv")
    .delete()
    .eq("tenant_id", profile.tenant_id)
    .lt("created_at", grens);
}
