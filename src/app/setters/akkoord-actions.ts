"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { sendAkkoordTerOndertekening } from "@/utils/email";

/**
 * Stuurt een individuele user een uitnodiging om NDA / gebruiksvoorwaarden te tekenen.
 * - Setters → NDA (uitgebreid, cross-tenant geheimhouding)
 * - Recruiters / admins → gebruiksvoorwaarden (kort)
 */
export async function stuurAkkoordUit(formData: FormData) {
  const userId = formData.get("user_id") as string;
  if (!userId) redirect("/setters?error=User+ontbreekt");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isSuperAdmin = isSuperAdminEmail(user.email);
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();
  if (!isSuperAdmin && myProfile?.rol !== "admin") {
    redirect("/setters?error=Geen+rechten");
  }

  const admin = createAdminClient();

  // Doel-user ophalen
  const { data: doel } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, mail_adres, rol, tenant_id")
    .eq("id", userId)
    .single();
  if (!doel) redirect("/setters?error=User+niet+gevonden");

  // E-mail van auth.users ophalen voor verzending
  const { data: authData } = await admin.auth.admin.getUserById(userId);
  const mailNaar = doel.mail_adres || authData.user?.email;
  if (!mailNaar) redirect("/setters?error=Geen+mailadres+voor+deze+user");

  // Bureau-naam (snapshot)
  const { data: tenant } = await admin
    .from("tenants")
    .select("naam, handelsnaam")
    .eq("id", doel.tenant_id!)
    .single();

  const type = doel.rol === "setter" ? "nda_setter" : "gebruiksvoorwaarden";
  const token = randomBytes(16).toString("hex");

  const { error: insErr } = await admin.from("user_agreements").insert({
    user_id: userId,
    tenant_id: doel.tenant_id,
    token,
    type,
    status: "wachtend",
    verzonden_aan_email: mailNaar,
    verzonden_aan_naam: `${doel.voornaam ?? ""} ${doel.achternaam ?? ""}`.trim(),
    verzonden_door: user.id,
    user_voornaam: doel.voornaam,
    user_achternaam: doel.achternaam,
    user_rol: doel.rol,
    bureau_naam: tenant?.handelsnaam || tenant?.naam || null,
  });
  if (insErr) redirect(`/setters?error=${encodeURIComponent(insErr.message)}`);

  try {
    await sendAkkoordTerOndertekening({
      naar: mailNaar,
      naam: `${doel.voornaam ?? ""} ${doel.achternaam ?? ""}`.trim(),
      type,
      token,
    });
  } catch (e) {
    console.error("Akkoord-mail mislukt:", e);
    redirect(`/setters?error=${encodeURIComponent("Mail kon niet verstuurd worden")}`);
  }

  revalidatePath("/setters");
  redirect("/setters?ok=akkoord_verzonden");
}

/**
 * Trekt een nog niet getekende uitnodiging in.
 */
export async function trekAkkoordIn(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const isSuperAdmin = isSuperAdminEmail(user.email);
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (!isSuperAdmin && myProfile?.rol !== "admin") return;

  const admin = createAdminClient();
  const { data: row } = await admin.from("user_agreements").select("status").eq("id", id).single();
  if (!row || row.status === "getekend") return;
  await admin.from("user_agreements").update({ status: "ingetrokken" }).eq("id", id);
  revalidatePath("/setters");
}
