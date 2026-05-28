"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type Enroll = { ok?: boolean; error?: string; factorId?: string; qrCode?: string; secret?: string };
type Verify = { ok?: boolean; error?: string };

/**
 * Start MFA-enrollment: vraagt een TOTP-factor aan bij Supabase.
 * Returnt een QR-code (data-URI) + secret voor de authenticator-app.
 */
export async function startMfaEnroll(): Promise<Enroll> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Noah ATS",
  });
  if (error) return { error: error.message };
  return {
    ok: true,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/**
 * Verifieer de 6-cijferige code uit de authenticator-app om MFA te activeren.
 */
export async function verifyMfaEnroll(formData: FormData): Promise<Verify> {
  const factorId = (formData.get("factor_id") as string)?.trim();
  const code = (formData.get("code") as string)?.trim();
  if (!factorId || !code) return { error: "Factor of code ontbreekt" };

  const supabase = await createClient();
  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr) return { error: chErr.message };

  const { error: verErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verErr) return { error: "Code klopt niet — probeer opnieuw" };

  revalidatePath("/instellingen");
  return { ok: true };
}

/**
 * Verwijder een actieve MFA-factor (gebruiker zet 2FA uit).
 */
export async function disableMfa(formData: FormData): Promise<Verify> {
  const factorId = (formData.get("factor_id") as string)?.trim();
  if (!factorId) return { error: "Factor ontbreekt" };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: error.message };

  revalidatePath("/instellingen");
  return { ok: true };
}
