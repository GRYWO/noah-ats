"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendDpaGetekendBevestiging, sendDpaGetekendIntern, sendWelkomstmailBureau } from "@/utils/email";

type Result = { ok?: boolean; error?: string };

/**
 * Bureau-contactpersoon tekent de DPA. Geen login nodig — alleen geldig token.
 */
export async function tekenDpa(formData: FormData): Promise<Result> {
  const token = (formData.get("token") as string)?.trim();
  const naam = (formData.get("naam") as string)?.trim();
  const functie = (formData.get("functie") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const handtekeningType = (formData.get("handtekening_type") as string) ?? "typed";
  const handtekeningData = (formData.get("handtekening_data") as string) ?? "";
  const akkoord = formData.get("akkoord") === "on" || formData.get("akkoord") === "true";

  if (!token) return { error: "Token ontbreekt" };
  if (!naam || naam.length < 2) return { error: "Vul je volledige naam in" };
  if (!functie) return { error: "Vul je functie in" };
  if (!email || !email.includes("@")) return { error: "Vul een geldig e-mailadres in" };
  if (!handtekeningData) return { error: "Vul je handtekening in" };
  if (!akkoord) return { error: "Bevestig akkoord met de overeenkomst" };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("dpa_signatures")
    .select("*")
    .eq("token", token)
    .single();
  if (!row) return { error: "Onbekend of verlopen token" };
  if (row.status === "getekend") return { error: "Deze overeenkomst is al getekend" };
  if (row.status === "ingetrokken") return { error: "Deze uitnodiging is ingetrokken" };

  // Audit-trail
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent") || null;

  const { error: updErr } = await admin
    .from("dpa_signatures")
    .update({
      status: "getekend",
      getekend_door_naam: naam,
      getekend_door_functie: functie,
      getekend_door_email: email,
      getekend_op: new Date().toISOString(),
      handtekening_type: handtekeningType === "drawn" ? "drawn" : "typed",
      handtekening_data: handtekeningData,
      akkoord_avg: true,
      ip_adres: ip,
      user_agent: userAgent,
    })
    .eq("id", row.id);
  if (updErr) return { error: updErr.message };

  // Mails — fouten loggen maar niet hard falen (de getekende DPA is opgeslagen)
  const bureauNaam = row.bureau_handelsnaam || row.bureau_naam || "je bureau";
  try {
    await sendDpaGetekendBevestiging({
      naar: email,
      contactNaam: naam,
      bureauNaam,
      token,
    });
  } catch (e) {
    console.error("Bevestiging-mail mislukt:", e);
  }
  try {
    await sendDpaGetekendIntern({
      bureauNaam,
      ondertekenaarNaam: naam,
      ondertekenaarEmail: email,
      ondertekenaarFunctie: functie,
      token,
    });
  } catch (e) {
    console.error("Interne notificatie mislukt:", e);
  }

  // NIET direct welkomstmail. Eerst Stripe checkout starten — bureau betaalt
  // het abonnement, daarna pas inloggegevens (welkomstmail wordt verstuurd
  // vanuit Stripe webhook checkout.session.completed).
  try {
    if (row.tenant_id) {
      const { startAbonnement } = await import("@/app/bureaus/[id]/abonnement-actions");
      const { data: tenant } = await admin
        .from("tenants")
        .select("gekozen_plan, contact_email, contact_naam")
        .eq("id", row.tenant_id)
        .single();

      if (tenant?.contact_email) {
        // Trigger Stripe Checkout — sendBureauStripeMail wordt automatisch
        // verstuurd vanuit startAbonnement.
        const r = await startAbonnement({
          tenantId: row.tenant_id,
          plan: (tenant.gekozen_plan ?? "starter") as "starter" | "pro" | "enterprise",
          contactEmail: tenant.contact_email,
          contactNaam: tenant.contact_naam ?? bureauNaam,
        });
        if (!r.ok) {
          console.error("Bureau Stripe-checkout na DPA mislukt:", r.error);
        }
      }
    }
  } catch (e) {
    console.error("Bureau Stripe-flow na DPA-tekenen mislukt:", e);
  }

  revalidatePath(`/dpa-tekenen/${token}`);
  redirect(`/dpa-tekenen/${token}/bedankt`);
}
