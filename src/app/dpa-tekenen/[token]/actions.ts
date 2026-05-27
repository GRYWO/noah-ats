"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendDpaGetekendBevestiging, sendDpaGetekendIntern } from "@/utils/email";

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

  revalidatePath(`/dpa-tekenen/${token}`);
  redirect(`/dpa-tekenen/${token}/bedankt`);
}
