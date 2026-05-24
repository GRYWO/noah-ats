"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { sendWelkomstmailBureau } from "@/utils/email";

function genereerWachtwoord(lengte = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < lengte; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

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
  const { data: nieuwTenant, error } = await admin.from("tenants").insert({
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
  }).select("id").single();

  if (error || !nieuwTenant) {
    redirect(`/bureaus?error=${encodeURIComponent(error?.message ?? "Aanmaken mislukt")}`);
  }

  // Maak automatisch een admin-user voor de contactpersoon + stuur welkomstmail
  if (contact_email && contact_naam) {
    const wachtwoord = genereerWachtwoord(12);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: contact_email,
      password: wachtwoord,
      email_confirm: true,
    });
    if (!createErr && created.user) {
      // Splits naam
      const naamDelen = contact_naam.split(" ");
      const cnVoornaam = naamDelen[0];
      const cnAchternaam = naamDelen.slice(1).join(" ") || "—";
      await admin.from("profiles").insert({
        id: created.user.id,
        tenant_id: nieuwTenant.id,
        voornaam: cnVoornaam,
        achternaam: cnAchternaam,
        rol: "admin",
        telefoon: contact_tel,
        mail_status: "niet_geconfigureerd",
      });
      try {
        await sendWelkomstmailBureau({
          naar: contact_email,
          voornaam: cnVoornaam,
          email: contact_email,
          wachtwoord,
          bedrijf: handelsnaam ?? naam,
        });
      } catch (e) {
        console.error("Welkomstmail bureau mislukt:", e);
      }
    } else if (createErr) {
      console.error("Bureau-admin user aanmaken mislukt:", createErr);
    }
  }

  revalidatePath("/bureaus");
  redirect("/bureaus?ok=1");
}
