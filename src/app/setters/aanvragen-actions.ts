"use server";

import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Stuurt een aanvraag-mail naar info@grywo.nl voor het aanmaken van
 * een Hostnet-mailbox of een Voys-nummer voor een nieuwe recruiter.
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("voornaam, achternaam, tenant_id")
    .eq("id", user.id)
    .single();

  // Bureau-naam ophalen
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
  const typeLabel = type === "email" ? "E-mailadres (Hostnet)" : "Voys-nummer";
  const typeIcoon = type === "email" ? "📧" : "📞";

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

  <p style="margin:18px 0 8px 0;font-size:13px;color:#666;">
    Maak het ${typeLabel.toLowerCase()} aan en stuur een bevestiging naar de aanvrager zodra het klaar staat.
  </p>
</div>`;

  try {
    const result = await resend.emails.send({
      from: "Noah ATS <noreply@grywo.nl>",
      to: "info@grywo.nl",
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
 * Vrije bevestiging / bericht naar info@grywo.nl (bv "alles ontvangen, werkt").
 */
export async function stuurBevestiging({
  bericht,
}: {
  bericht: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!bericht.trim()) return { ok: false, error: "Bericht is leeg" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

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
</div>`;

  try {
    const result = await resend.emails.send({
      from: "Noah ATS <noreply@grywo.nl>",
      to: "info@grywo.nl",
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
