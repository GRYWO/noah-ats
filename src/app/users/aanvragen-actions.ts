"use server";

import { randomBytes } from "crypto";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

function appUrl() {
  const env = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (env && !env.includes("localhost")) return env.replace(/\/$/, "");
  return "https://www.noah-ats.nl";
}

async function haalContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("voornaam, achternaam, tenant_id")
    .eq("id", user.id)
    .single();

  let bureauNaam = "Onbekend bureau";
  if (profile?.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("naam")
      .eq("id", profile.tenant_id)
      .single();
    if (tenant?.naam) bureauNaam = tenant.naam;
  }

  const aanvragerNaam = `${profile?.voornaam ?? ""} ${profile?.achternaam ?? ""}`.trim() || user.email || "Onbekend";

  return { user, profile, bureauNaam, aanvragerNaam };
}

/**
 * Aanvraag voor email of voys-nummer.
 * Slaat op in DB met token + verstuurt mail met reply-knop naar info@noah-recruitment.nl.
 */
export async function vraagAan({
  type,
  voornaam,
  achternaam,
}: {
  type: "email" | "voys";
  voornaam: string;
  achternaam: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!["email", "voys"].includes(type)) return { ok: false, error: "Ongeldig type" };
  if (!voornaam.trim() || !achternaam.trim()) {
    return { ok: false, error: "Voornaam en achternaam zijn verplicht" };
  }

  const ctx = await haalContext();
  if (!ctx) return { ok: false, error: "Niet ingelogd" };
  const { user, profile, bureauNaam, aanvragerNaam } = ctx;

  // Aanvraag opslaan met token
  const admin = createAdminClient();
  const token = randomBytes(24).toString("hex");
  await admin.from("aanvragen").insert({
    token,
    type,
    aanvrager_user_id: user.id,
    aanvrager_email: user.email,
    aanvrager_naam: aanvragerNaam,
    tenant_id: profile?.tenant_id ?? null,
    bureau_naam: bureauNaam,
    voor_voornaam: voornaam.trim(),
    voor_achternaam: achternaam.trim(),
  });

  const typeLabel = type === "email" ? "E-mailadres (Hostnet)" : "Voys-nummer";
  const typeIcoon = type === "email" ? "📧" : "📞";
  const replyUrl = `${appUrl()}/reageer/${token}`;

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#333399;margin:0 0 16px 0;">${typeIcoon} Aanvraag: ${typeLabel}</h2>
  <p style="margin:0 0 16px 0;">Er is een nieuwe aanvraag binnengekomen via Noah ATS.</p>

  <table style="width:100%;border-collapse:collapse;background:#f9f9fb;border-radius:8px;padding:16px;">
    <tr><td style="padding:6px 0;color:#666;width:180px;">Type aanvraag</td><td style="padding:6px 0;font-weight:600;">${typeLabel}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Voor recruiter</td><td style="padding:6px 0;font-weight:600;">${voornaam} ${achternaam}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Bureau</td><td style="padding:6px 0;font-weight:600;">${bureauNaam}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Aangevraagd door</td><td style="padding:6px 0;font-weight:600;">${aanvragerNaam}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">E-mail aanvrager</td><td style="padding:6px 0;"><a href="mailto:${user.email}" style="color:#333399;">${user.email}</a></td></tr>
    <tr><td style="padding:6px 0;color:#666;">Datum</td><td style="padding:6px 0;">${new Date().toLocaleString("nl-NL")}</td></tr>
  </table>

  <div style="margin:24px 0;text-align:center;">
    <a href="${replyUrl}" style="display:inline-block;background-color:#333399;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:14px;">
      📨 Beantwoorden — stuurt automatisch naar ${aanvragerNaam}
    </a>
  </div>

  <p style="margin:8px 0;font-size:12px;color:#888;text-align:center;">
    Of klik direct: <a href="${replyUrl}" style="color:#333399;">${replyUrl}</a>
  </p>
</div>`;

  try {
    const result = await resend.emails.send({
      from: "Noah ATS <noreply@noah-recruitment.nl>",
      to: "info@noah-recruitment.nl",
      replyTo: user.email ?? undefined,
      subject: `${typeIcoon} Aanvraag ${typeLabel} — ${voornaam} ${achternaam} (${bureauNaam})`,
      html,
    });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Vrije bevestiging / bericht naar info@noah-recruitment.nl.
 */
export async function stuurBevestiging({
  bericht,
}: {
  bericht: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!bericht.trim()) return { ok: false, error: "Bericht is leeg" };

  const ctx = await haalContext();
  if (!ctx) return { ok: false, error: "Niet ingelogd" };
  const { user, profile, bureauNaam, aanvragerNaam } = ctx;

  const admin = createAdminClient();
  const token = randomBytes(24).toString("hex");
  await admin.from("aanvragen").insert({
    token,
    type: "bevestiging",
    aanvrager_user_id: user.id,
    aanvrager_email: user.email,
    aanvrager_naam: aanvragerNaam,
    tenant_id: profile?.tenant_id ?? null,
    bureau_naam: bureauNaam,
    bericht: bericht.trim(),
  });

  const replyUrl = `${appUrl()}/reageer/${token}`;

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#10b981;margin:0 0 16px 0;">✓ Bevestiging vanuit ${bureauNaam}</h2>

  <table style="width:100%;border-collapse:collapse;background:#f9f9fb;border-radius:8px;padding:16px;">
    <tr><td style="padding:6px 0;color:#666;width:180px;">Bureau</td><td style="padding:6px 0;font-weight:600;">${bureauNaam}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Verstuurd door</td><td style="padding:6px 0;font-weight:600;">${aanvragerNaam}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">E-mail</td><td style="padding:6px 0;"><a href="mailto:${user.email}" style="color:#333399;">${user.email}</a></td></tr>
    <tr><td style="padding:6px 0;color:#666;">Datum</td><td style="padding:6px 0;">${new Date().toLocaleString("nl-NL")}</td></tr>
  </table>

  <h3 style="color:#333399;margin:18px 0 8px 0;font-size:14px;">Bericht:</h3>
  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:14px;white-space:pre-wrap;font-size:13px;color:#333;">${bericht.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>

  <div style="margin:24px 0;text-align:center;">
    <a href="${replyUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:14px;">
      📨 Beantwoorden — stuurt automatisch naar ${aanvragerNaam}
    </a>
  </div>
</div>`;

  try {
    const result = await resend.emails.send({
      from: "Noah ATS <noreply@noah-recruitment.nl>",
      to: "info@noah-recruitment.nl",
      replyTo: user.email ?? undefined,
      subject: `✓ Bevestiging van ${bureauNaam} — ${aanvragerNaam}`,
      html,
    });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Noah recruitment-admin verstuurt antwoord via /reageer/[token] pagina.
 */
export async function verstuurReply({
  token,
  bericht,
}: {
  token: string;
  bericht: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!token || !bericht.trim()) return { ok: false, error: "Token of bericht ontbreekt" };

  const admin = createAdminClient();
  const { data: aanvraag } = await admin
    .from("aanvragen")
    .select("*")
    .eq("token", token)
    .single();

  if (!aanvraag) return { ok: false, error: "Aanvraag niet gevonden" };
  if (!aanvraag.aanvrager_email) return { ok: false, error: "Geen aanvrager-email" };

  const typeLabel =
    aanvraag.type === "email" ? "E-mailadres (Hostnet)" :
    aanvraag.type === "voys"  ? "Voys-nummer" :
                                "Bevestiging";

  const onderwerp =
    aanvraag.type === "bevestiging"
      ? `Reactie op je bericht`
      : `${typeLabel} klaar voor ${aanvraag.voor_voornaam} ${aanvraag.voor_achternaam}`;

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#333399;margin:0 0 16px 0;">📨 Reactie vanuit Noah recruitment</h2>

  <p style="margin:0 0 16px 0;">Hallo ${aanvraag.aanvrager_naam ?? ""},</p>

  <div style="background:#f9f9fb;border-left:4px solid #333399;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:14px;color:#333;margin:16px 0;">${bericht.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>

  <p style="margin:16px 0 8px 0;font-size:12px;color:#888;">
    Met vriendelijke groet,<br>
    Team Noah recruitment<br>
    <a href="mailto:info@noah-recruitment.nl" style="color:#333399;">info@noah-recruitment.nl</a> · 085-4016082
  </p>
</div>`;

  try {
    const result = await resend.emails.send({
      from: "Noah recruitment <info@noah-recruitment.nl>",
      to: aanvraag.aanvrager_email,
      replyTo: "info@noah-recruitment.nl",
      subject: onderwerp,
      html,
    });
    if (result.error) return { ok: false, error: result.error.message };

    await admin.from("aanvragen").update({
      reply_bericht: bericht.trim(),
      reply_verzonden_op: new Date().toISOString(),
    }).eq("token", token);

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
