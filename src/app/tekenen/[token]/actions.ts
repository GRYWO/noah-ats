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
      type: row.type as "nda_setter" | "gebruiksvoorwaarden",
      token,
    });
  } catch (e) {
    console.error("Bevestiging-mail mislukt:", e);
  }

  // Reset het wachtwoord (oude is bij aanmaak gegenereerd maar niet gemaild)
  // en stuur nu pas de welkomstmail met inloggegevens.
  try {
    const nieuwWachtwoord = randomBytes(6).toString("base64").replace(/[+/=]/g, "").slice(0, 10) + "1!";
    await admin.auth.admin.updateUserById(row.user_id, { password: nieuwWachtwoord });

    const { data: tenant } = row.tenant_id
      ? await admin.from("tenants").select("naam, handelsnaam").eq("id", row.tenant_id).single()
      : { data: null };
    const bedrijf = tenant?.handelsnaam || tenant?.naam || "Noah ATS";
    const rolLabel = row.user_rol === "admin" ? "Admin"
      : row.user_rol === "recruiter" ? "Recruiter"
      : "Setter";

    await sendWelkomstmailUser({
      naar: row.verzonden_aan_email,
      voornaam: row.user_voornaam ?? naam,
      email: row.verzonden_aan_email,
      wachtwoord: nieuwWachtwoord,
      rolLabel,
      bedrijf,
    });
  } catch (e) {
    console.error("Welkomstmail na ondertekening mislukt:", e);
  }

  revalidatePath(`/tekenen/${token}`);
  redirect(`/tekenen/${token}/bedankt`);
}
