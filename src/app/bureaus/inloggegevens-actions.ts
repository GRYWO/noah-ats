"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { sendWelkomstmailBureau } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";

function genereerWachtwoord(lengte = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < lengte; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

/**
 * Stuur inloggegevens naar bureau-contactpersoon. Maakt admin-user aan als
 * die nog niet bestaat; reset anders het wachtwoord en stuurt welkomstmail.
 */
export async function stuurInloggegevensBureau(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const tenantId = (formData.get("tenant_id") as string) ?? "";
  if (!tenantId) return { error: "Geen tenant_id" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!isSuperAdminEmail(user.email)) return { error: "Alleen super-admin" };

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("naam, handelsnaam, contact_naam, contact_email, contact_tel")
    .eq("id", tenantId)
    .single();
  if (!tenant?.contact_email) return { error: "Bureau heeft geen contact-email" };

  const bedrijf = tenant.handelsnaam ?? tenant.naam ?? "Noah ATS";
  const contactNaam = tenant.contact_naam ?? tenant.contact_email;
  const naamDelen = contactNaam.split(" ");
  const voornaam = naamDelen[0];
  const achternaam = naamDelen.slice(1).join(" ") || "—";

  // Check of er al een user bestaat met dit emailadres
  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  const bestaand = usersData.users.find(u => u.email?.toLowerCase() === tenant.contact_email!.toLowerCase());

  const wachtwoord = genereerWachtwoord(12);

  if (bestaand) {
    // Reset wachtwoord
    const { error: updErr } = await admin.auth.admin.updateUserById(bestaand.id, { password: wachtwoord });
    if (updErr) return { error: updErr.message };

    // Profile aanmaken als die nog niet bestaat
    const { data: prof } = await admin.from("profiles").select("id").eq("id", bestaand.id).maybeSingle();
    if (!prof) {
      await admin.from("profiles").insert({
        id: bestaand.id,
        tenant_id: tenantId,
        voornaam,
        achternaam,
        rol: "admin",
        telefoon: tenant.contact_tel ?? null,
        mail_status: "niet_geconfigureerd",
      });
    }
  } else {
    // Nieuwe user aanmaken
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: tenant.contact_email,
      password: wachtwoord,
      email_confirm: true,
    });
    if (createErr || !created.user) return { error: createErr?.message ?? "Aanmaken mislukt" };

    await admin.from("profiles").insert({
      id: created.user.id,
      tenant_id: tenantId,
      voornaam,
      achternaam,
      rol: "admin",
      telefoon: tenant.contact_tel ?? null,
      mail_status: "niet_geconfigureerd",
    });
  }

  // Welkomstmail (= inloggegevens + dashboard-knop + 4 stappen)
  try {
    const from = await getSetterFrom(user.id);
    await sendWelkomstmailBureau({
      naar: tenant.contact_email,
      voornaam,
      email: tenant.contact_email,
      wachtwoord,
      bedrijf,
      from,
    });
  } catch (e) {
    return { error: "Wachtwoord ingesteld, maar mail mislukt: " + (e as Error).message };
  }

  revalidatePath("/bureaus");
  return { ok: true };
}
