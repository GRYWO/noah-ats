"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { revalidatePath } from "next/cache";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function updateHuisstijl(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return { ok: false, error: "Alleen super-admin" };
  }

  const tenantId = (formData.get("tenant_id") as string)?.trim();
  const primair = (formData.get("primair") as string)?.trim() || "#333399";
  const accent = (formData.get("accent") as string)?.trim() || "#ffd84d";
  const actief = formData.get("actief") === "on";

  if (!HEX_RE.test(primair) || !HEX_RE.test(accent)) {
    return { ok: false, error: "Ongeldige kleurcode (gebruik #RRGGBB)" };
  }
  if (!tenantId) return { ok: false, error: "Tenant ontbreekt" };

  // Logo upload (optioneel)
  const logo = formData.get("logo") as File | null;
  let logoUrl: string | null | undefined = undefined;

  const admin = createAdminClient();
  if (logo && logo.size > 0) {
    if (logo.size > 2 * 1024 * 1024) return { ok: false, error: "Logo max 2MB" };
    const ext = logo.name.split(".").pop()?.toLowerCase() ?? "png";
    const pad = `${tenantId}/logo-${Date.now()}.${ext}`;
    const up = await admin.storage.from("bureau-logos").upload(pad, logo, {
      contentType: logo.type,
      upsert: false,
    });
    if (up.error) return { ok: false, error: "Logo upload mislukt: " + up.error.message };
    const { data: pub } = admin.storage.from("bureau-logos").getPublicUrl(pad);
    logoUrl = pub.publicUrl;
  }

  // Logo verwijderen?
  if (formData.get("logo_verwijderen") === "on") {
    logoUrl = null;
  }

  const update: Record<string, unknown> = {
    huisstijl_primair: primair,
    huisstijl_accent: accent,
    huisstijl_actief: actief,
  };
  if (logoUrl !== undefined) update.huisstijl_logo_url = logoUrl;

  const { error } = await admin
    .from("tenants")
    .update(update)
    .eq("id", tenantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/bureaus/${tenantId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
