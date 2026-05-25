"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { encrypt } from "@/utils/crypto";
import { herverdeelKandidaten, verwerkWachtrij } from "@/utils/setter-assign";
import { sendWelkomstmailUser } from "@/utils/email";
import { bouwHandtekening } from "@/utils/email-signature";

export async function nieuweSetter(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check of huidige user admin is + haal tenant_id op
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();

  if (!myProfile || myProfile.rol !== "admin") {
    redirect("/setters?error=Alleen+admins+kunnen+users+toevoegen");
  }

  const email           = (formData.get("email") as string)?.trim().toLowerCase();
  const wachtwoord      = (formData.get("wachtwoord") as string)?.trim();
  const voornaam        = (formData.get("voornaam") as string)?.trim();
  const achternaam      = (formData.get("achternaam") as string)?.trim();
  const telefoon        = (formData.get("telefoon") as string)?.trim() || null;
  const voysNummer      = (formData.get("voys_nummer") as string)?.trim() || null;
  const rol             = (formData.get("rol") as string)?.trim() || "setter";
  const mailAdres       = (formData.get("mail_adres") as string)?.trim().toLowerCase() || email;
  const mailWachtwoord  = (formData.get("mail_wachtwoord") as string)?.trim() || null;

  if (!email || !wachtwoord || wachtwoord.length < 8) {
    redirect(`/setters?error=${encodeURIComponent("E-mail + wachtwoord (min 8 tekens) verplicht")}`);
  }

  const admin = createAdminClient();

  // 1. Maak auth user aan
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: wachtwoord,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    redirect(`/setters?error=${encodeURIComponent(createErr?.message ?? "Aanmaken mislukt")}`);
  }

  // Auto handtekening bouwen via centrale helper
  const handtekening = bouwHandtekening({
    voornaam,
    achternaam,
    rol: rol as "admin" | "recruiter" | "setter",
    telefoon,
    mailAdres,
    functieTitel: null,
  });

  // 2. Maak profile aan (gekoppeld aan zelfde tenant)
  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    tenant_id: myProfile.tenant_id,
    voornaam,
    achternaam,
    rol,
    telefoon,
    voys_nummer: voysNummer,
    mail_adres: mailAdres,
    mail_wachtwoord: mailWachtwoord ? encrypt(mailWachtwoord) : null,
    handtekening_html: handtekening,
    mail_status: mailWachtwoord ? "actief" : "niet_geconfigureerd",
  });

  if (profileErr) {
    // Cleanup user als profile mislukt
    await admin.auth.admin.deleteUser(created.user.id);
    redirect(`/setters?error=${encodeURIComponent(profileErr.message)}`);
  }

  // Nieuwe setter? → verwerk wachtrij (kandidaten zonder eigenaar)
  if (rol === "setter") {
    await verwerkWachtrij(myProfile.tenant_id);
  }

  // Welkomstmail met inloggegevens
  try {
    const { data: tenant } = await admin.from("tenants")
      .select("naam, handelsnaam")
      .eq("id", myProfile.tenant_id)
      .single();
    const bedrijf = tenant?.handelsnaam ?? tenant?.naam ?? "Noah ATS";
    const rolLabel = rol === "admin" ? "Admin" : rol === "recruiter" ? "Recruiter" : "Setter";
    await sendWelkomstmailUser({
      naar: email,
      voornaam,
      email,
      wachtwoord,
      rolLabel,
      bedrijf,
    });
  } catch (e) {
    console.error("Welkomstmail mislukt:", e);
  }

  revalidatePath("/setters");
  revalidatePath("/kandidaten");
  redirect("/setters?ok=1");
}

export async function updateSetterVoysNummer(formData: FormData) {
  const id = formData.get("id") as string;
  const voys_nummer = (formData.get("voys_nummer") as string)?.trim() || null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();

  if (!myProfile || myProfile.rol !== "admin") return;

  const admin = createAdminClient();
  await admin.from("profiles")
    .update({ voys_nummer })
    .eq("id", id)
    .eq("tenant_id", myProfile.tenant_id);

  revalidatePath("/setters");
}

export async function verwijderSetter(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === id) {
    redirect("/setters?error=Je+kunt+jezelf+niet+verwijderen");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (myProfile?.rol !== "admin") {
    redirect("/setters?error=Alleen+admins");
  }

  const admin = createAdminClient();

  // Haal tenant van verwijderde user op vóór delete
  const { data: teVerwijderen } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", id)
    .single();

  // Herverdeel actieve kandidaten naar andere setters of wachtrij
  if (teVerwijderen?.tenant_id) {
    await herverdeelKandidaten(id, teVerwijderen.tenant_id);
  }

  await admin.from("profiles").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id);

  revalidatePath("/setters");
  revalidatePath("/kandidaten");
  redirect("/setters?ok=verwijderd");
}
