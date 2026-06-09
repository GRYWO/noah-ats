"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendAkkoordBevestiging, sendWelkomstmailUser } from "@/utils/email";

type Result = { ok?: boolean; error?: string };

/**
 * User tekent eigen NDA / gebruiksvoorwaarden. Geen login nodig — alleen geldig token.
 */
export async function tekenAkkoord(formData: FormData): Promise<Result> {
  const token = (formData.get("token") as string)?.trim();
  const naam = (formData.get("naam") as string)?.trim();
  const handtekeningType = (formData.get("handtekening_type") as string) ?? "typed";
  const handtekeningData = (formData.get("handtekening_data") as string) ?? "";
  const akkoord = formData.get("akkoord") === "on" || formData.get("akkoord") === "true";

  if (!token) return { error: "Token ontbreekt" };
  if (!naam || naam.length < 2) return { error: "Vul je volledige naam in" };
  if (!handtekeningData) return { error: "Vul je handtekening in" };
  if (!akkoord) return { error: "Bevestig akkoord" };

  const admin = createAdminClient();
  const { data: row } = await admin.from("user_agreements").select("*").eq("token", token).single();
  if (!row) return { error: "Onbekend of verlopen token" };
  if (row.status === "getekend") return { error: "Deze overeenkomst is al getekend" };
  if (row.status === "ingetrokken") return { error: "Deze uitnodiging is ingetrokken" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent") || null;

  const { error: updErr } = await admin
    .from("user_agreements")
    .update({
      status: "getekend",
      getekend_door_naam: naam,
      getekend_op: new Date().toISOString(),
      handtekening_type: handtekeningType === "drawn" ? "drawn" : "typed",
      handtekening_data: handtekeningData,
      akkoord: true,
      ip_adres: ip,
      user_agent: userAgent,
    })
    .eq("id", row.id);
  if (updErr) return { error: updErr.message };

  try {
    await sendAkkoordBevestiging({
      naar: row.verzonden_aan_email,
      naam,
      type: row.type as "nda_setter" | "gebruiksvoorwaarden" | "setter_contract",
      token,
    });
  } catch (e) {
    console.error("Bevestiging-mail mislukt:", e);
  }

  // Setter-samenwerkingsovereenkomst getekend → kopie naar Bart + Pepijn
  // zodat zij direct zijn geïnformeerd. Yorith ziet 'm sowieso in /documenten.
  if (row.type === "setter_contract") {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Noah ATS <noreply@grywo.nl>",
        to: ["bart@grywo.nl", "pepijn@grywo.nl"],
        cc: ["info@grywo.nl"],
        subject: `Samenwerkingsovereenkomst getekend: ${naam}`,
        html: `<p>De samenwerkingsovereenkomst is zojuist getekend door <b>${naam}</b>.</p>
<p>Token: <code>${token}</code><br>
Bekijk het getekende document via Noah <a href="https://noah-ats.nl/tekenen/${token}">hier</a>.</p>
<p>Audit-trail: IP ${ip ?? "?"} · ${userAgent ?? "?"}</p>`,
      });
    } catch (e) {
      console.error("[setter_contract] kopie-mail naar bart/pepijn mislukt:", e);
    }
  }

  // Alle rollen (admin/recruiter/setter) krijgen na NDA-tekenen direct
  // welkomstmail met inloggegevens. Setters hebben dan 14 werkdagen
  // proefperiode (zie users/actions.ts). Pas na afloop stuurt de cron
  // (api/cron/setter-proefperiode) de Stripe-betalingsmail.
  // BELANGRIJK: welkomstmail alleen versturen na NDA / gebruiksvoorwaarden,
  // NIET na setter_contract (dat zou een 2e wachtwoord-reset triggeren).
  if (row.type !== "setter_contract") {
    // Voor setters via /contract: ze hebben al een mail_accounts rij +
    // bevestigingsmail met inloggegevens. NIET opnieuw resetten/mailen.
    const { data: bestaandAccount } = await admin
      .from("mail_accounts")
      .select("id")
      .eq("user_id", row.user_id)
      .limit(1)
      .maybeSingle();

    if (!bestaandAccount) {
      try {
        const nieuwWachtwoord = randomBytes(6).toString("base64").replace(/[+/=]/g, "").slice(0, 10) + "1!";
        await admin.auth.admin.updateUserById(row.user_id, { password: nieuwWachtwoord });

        const { data: tenant } = row.tenant_id
          ? await admin.from("tenants").select("naam, handelsnaam").eq("id", row.tenant_id).single()
          : { data: null };
        const bedrijf = tenant?.handelsnaam || tenant?.naam || "Noah ATS";
        const rolLabel = row.user_rol === "admin"
          ? "Admin"
          : row.user_rol === "setter"
          ? "Setter"
          : "Recruiter";

        // Login-adres = profile.mail_adres (@grywo.nl), niet de persoonlijke
        // email waar de NDA naartoe ging.
        const { data: profile } = await admin
          .from("profiles")
          .select("mail_adres")
          .eq("id", row.user_id)
          .maybeSingle();
        const loginEmail = profile?.mail_adres || row.verzonden_aan_email;

        await sendWelkomstmailUser({
          naar: row.verzonden_aan_email,
          voornaam: row.user_voornaam ?? naam,
          email: loginEmail,
          wachtwoord: nieuwWachtwoord,
          rolLabel,
          bedrijf,
        });
      } catch (e) {
        console.error("Welkomstmail na ondertekening mislukt:", e);
      }
    }
  }

  revalidatePath(`/tekenen/${token}`);
  redirect(`/tekenen/${token}/bedankt`);
}
