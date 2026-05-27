"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { sendDpaTerOndertekening } from "@/utils/email";

/**
 * Genereert een uitnodiging tot ondertekening van de DPA voor dit bureau.
 * Maakt een uniek token, slaat op en mailt de bureau-contactpersoon.
 * Alleen super-admin mag dit.
 */
export async function stuurDpaUit(formData: FormData) {
  const tenantId = formData.get("tenant_id") as string;
  if (!tenantId) redirect("/bureaus?error=Bureau+ontbreekt");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    redirect("/bureaus?error=Geen+rechten");
  }

  const admin = createAdminClient();
  const { data: t, error: tErr } = await admin
    .from("tenants")
    .select("naam, handelsnaam, kvk, vestigingsadres, factuuradres, contact_naam, contact_email")
    .eq("id", tenantId)
    .single();
  if (tErr || !t) {
    redirect(`/bureaus/${tenantId}?error=Bureau+niet+gevonden`);
  }

  const contactEmail = t.contact_email?.trim();
  if (!contactEmail) {
    redirect(`/bureaus/${tenantId}?error=${encodeURIComponent("Vul eerst een contact-emailadres in bij dit bureau")}`);
  }

  // Maak een uniek token (32 hex tekens = 16 bytes random)
  const token = randomBytes(16).toString("hex");

  const { error: insErr } = await admin.from("dpa_signatures").insert({
    tenant_id: tenantId,
    token,
    status: "wachtend",
    verzonden_aan_email: contactEmail,
    verzonden_aan_naam: t.contact_naam ?? "",
    verzonden_door: user.id,
    bureau_naam: t.naam,
    bureau_handelsnaam: t.handelsnaam ?? null,
    bureau_kvk: t.kvk ?? null,
    bureau_adres: t.vestigingsadres ?? t.factuuradres ?? null,
  });
  if (insErr) {
    redirect(`/bureaus/${tenantId}?error=${encodeURIComponent(insErr.message)}`);
  }

  try {
    await sendDpaTerOndertekening({
      naar: contactEmail,
      contactNaam: t.contact_naam ?? "",
      bureauNaam: t.handelsnaam || t.naam || "je bureau",
      token,
    });
  } catch (e) {
    console.error("DPA-mail mislukt:", e);
    // We zetten 'm niet terug — admin kan opnieuw versturen
    redirect(`/bureaus/${tenantId}?error=${encodeURIComponent("DPA-mail kon niet verstuurd worden, probeer opnieuw")}`);
  }

  revalidatePath(`/bureaus/${tenantId}`);
  redirect(`/bureaus/${tenantId}?ok=dpa_verzonden`);
}

/**
 * Trekt een nog niet getekende DPA-uitnodiging in. Token wordt ongeldig.
 */
export async function trekDpaIn(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) return;

  const admin = createAdminClient();
  const { data: row } = await admin.from("dpa_signatures").select("tenant_id, status").eq("id", id).single();
  if (!row || row.status === "getekend") return;

  await admin.from("dpa_signatures").update({ status: "ingetrokken" }).eq("id", id);
  revalidatePath(`/bureaus/${row.tenant_id}`);
}
