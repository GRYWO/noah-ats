"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { sendInloggegevensOpnieuw } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";

function genereerWachtwoord(lengte = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < lengte; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export async function resetUserWachtwoord(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const userId = (formData.get("user_id") as string) ?? "";
  if (!userId) return { error: "Geen user_id" };

  const supabase = await createClient();
  const { data: { user: huidigeUser } } = await supabase.auth.getUser();
  if (!huidigeUser) return { error: "Niet ingelogd" };

  const { data: huidigeProfile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", huidigeUser.id)
    .single();

  const superAdmin = isSuperAdminEmail(huidigeUser.email);
  if (huidigeProfile?.rol !== "admin" && !superAdmin) {
    return { error: "Alleen admin of super-admin mag wachtwoord resetten" };
  }

  const admin = createAdminClient();
  const { data: doelProfile } = await admin
    .from("profiles")
    .select("tenant_id, rol, voornaam, achternaam")
    .eq("id", userId)
    .single();
  if (!doelProfile) return { error: "User niet gevonden" };

  // Bureau-admin mag alleen users in eigen tenant resetten
  if (!superAdmin && doelProfile.tenant_id !== huidigeProfile?.tenant_id) {
    return { error: "User niet in jouw bureau" };
  }

  // Tenant-naam voor mail
  const { data: tenant } = await admin
    .from("tenants")
    .select("naam, handelsnaam")
    .eq("id", doelProfile.tenant_id ?? "")
    .single();
  const bedrijf = tenant?.handelsnaam ?? tenant?.naam ?? "Noah ATS";

  // Auth-user ophalen voor email
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  if (!authUser?.user?.email) return { error: "Kan e-mailadres niet vinden" };

  const nieuwWachtwoord = genereerWachtwoord(12);
  const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password: nieuwWachtwoord });
  if (updErr) return { error: updErr.message };

  const rolLabel = doelProfile.rol === "admin" ? "Admin"
    : doelProfile.rol === "recruiter" ? "Recruiter"
    : "Setter";

  try {
    const from = await getSetterFrom(huidigeUser.id);
    console.log("[reset-wachtwoord] versturen vanaf:", from ?? "(default FROM)", "naar:", authUser.user.email);
    await sendInloggegevensOpnieuw({
      naar: authUser.user.email,
      voornaam: doelProfile.voornaam ?? "",
      email: authUser.user.email,
      wachtwoord: nieuwWachtwoord,
      rolLabel,
      bedrijf,
      from,
    });
    console.log("[reset-wachtwoord] mail verzonden ok");
  } catch (e) {
    const msg = (e as Error).message ?? "onbekende fout";
    console.error("[reset-wachtwoord] mail mislukt:", msg);
    return { error: "Wachtwoord gereset, maar mail mislukt: " + msg };
  }

  revalidatePath("/users");
  revalidatePath("/bureaus");
  return { ok: true };
}
