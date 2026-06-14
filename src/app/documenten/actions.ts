"use server";

import { randomBytes } from "crypto";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Noah ATS <noreply@noah-recruitment.nl>";

function appUrl() {
  const env = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (env && !env.includes("localhost")) return env.replace(/\/$/, "");
  return "https://www.noah-ats.nl";
}

type OndertekenaarInput = { voornaam: string; achternaam: string; email: string };

async function verifySuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) return null;
  return user;
}

/**
 * Maakt een envelope aan + uploadt PDF + voegt ondertekenaars toe +
 * stuurt mail naar elke ondertekenaar.
 */
export async function verstuurDocument(formData: FormData) {
  const user = await verifySuperAdmin();
  if (!user) redirect("/dashboard?error=Geen+toegang");

  const titel = (formData.get("titel") as string)?.trim();
  const beschrijving = (formData.get("beschrijving") as string)?.trim() || null;
  const bestand = formData.get("pdf") as File | null;
  const ondertekenaarsJson = formData.get("ondertekenaars") as string;

  if (!titel) redirect("/documenten/nieuw?error=Titel+verplicht");
  if (!bestand || bestand.size === 0) redirect("/documenten/nieuw?error=PDF+verplicht");
  if (bestand.type !== "application/pdf") redirect("/documenten/nieuw?error=Alleen+PDF+toegestaan");
  if (bestand.size > 20 * 1024 * 1024) redirect("/documenten/nieuw?error=Max+20+MB");

  let ondertekenaars: OndertekenaarInput[] = [];
  try {
    ondertekenaars = JSON.parse(ondertekenaarsJson);
  } catch { /* leeg */ }
  if (!Array.isArray(ondertekenaars) || ondertekenaars.length === 0) {
    redirect("/documenten/nieuw?error=Minimaal+1+ondertekenaar");
  }
  for (const o of ondertekenaars) {
    if (!o.voornaam?.trim() || !o.achternaam?.trim() || !o.email?.trim()) {
      redirect("/documenten/nieuw?error=Alle+ondertekenaar-velden+verplicht");
    }
  }

  const admin = createAdminClient();

  // 1) Envelope opslaan
  const { data: env, error: envErr } = await admin
    .from("document_envelopes")
    .insert({
      titel,
      beschrijving,
      pdf_pad: "(pending)",
      aangemaakt_door: user.id,
      status: "verzonden",
    })
    .select("id")
    .single();
  if (envErr || !env) redirect("/documenten/nieuw?error=" + encodeURIComponent(envErr?.message ?? "Fout"));

  // 2) PDF opslaan
  const pdfBytes = new Uint8Array(await bestand.arrayBuffer());
  const pdfPad = `${env.id}/origineel.pdf`;
  const up = await admin.storage.from("documenten").upload(pdfPad, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (up.error) {
    await admin.from("document_envelopes").delete().eq("id", env.id);
    redirect("/documenten/nieuw?error=" + encodeURIComponent("Upload mislukt: " + up.error.message));
  }
  await admin.from("document_envelopes").update({ pdf_pad: pdfPad }).eq("id", env.id);

  // 3) Ondertekenaars toevoegen met tokens
  const rows = ondertekenaars.map((o, idx) => ({
    envelope_id: env.id,
    voornaam: o.voornaam.trim(),
    achternaam: o.achternaam.trim(),
    email: o.email.trim().toLowerCase(),
    token: randomBytes(24).toString("hex"),
    volgorde: idx,
    status: "wachtend",
  }));
  const { data: insertedRows } = await admin
    .from("document_ondertekenaars")
    .insert(rows)
    .select("token, voornaam, achternaam, email");

  // 4) Mail naar elke ondertekenaar
  for (const r of insertedRows ?? []) {
    try {
      await stuurUitnodigingsmail({
        token: r.token,
        voornaam: r.voornaam,
        email: r.email,
        titel,
        beschrijving,
      });
    } catch (e) {
      console.error("[document] mail mislukt voor", r.email, e);
    }
  }

  revalidatePath("/documenten");
  redirect(`/documenten/${env.id}?ok=Verstuurd`);
}

async function stuurUitnodigingsmail({
  token,
  voornaam,
  email,
  titel,
  beschrijving,
}: {
  token: string;
  voornaam: string;
  email: string;
  titel: string;
  beschrijving: string | null;
}) {
  const url = `${appUrl()}/teken/${token}`;
  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#333399;margin:0 0 16px 0;">📝 Verzoek tot ondertekening</h2>
  <p style="margin:0 0 12px 0;">Hallo ${voornaam},</p>
  <p style="margin:0 0 16px 0;">Er staat een document voor je klaar ter ondertekening:</p>

  <div style="background:#f9f9fb;border-left:4px solid #333399;border-radius:6px;padding:14px;margin:16px 0;">
    <div style="font-weight:700;font-size:15px;color:#333;">${titel}</div>
    ${beschrijving ? `<div style="font-size:13px;color:#666;margin-top:6px;">${beschrijving}</div>` : ""}
  </div>

  <div style="margin:24px 0;text-align:center;">
    <a href="${url}" style="display:inline-block;background-color:#333399;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:14px;">
      Document openen & ondertekenen
    </a>
  </div>

  <p style="margin:8px 0;font-size:12px;color:#888;text-align:center;">
    Of kopieer deze link: <a href="${url}" style="color:#333399;">${url}</a>
  </p>

  <p style="margin:18px 0 8px 0;font-size:11px;color:#888;">
    Deze ondertekening is rechtsgeldig (eIDAS Simple Electronic Signature).
    Je krijgt een audit-trail met IP-adres en tijdstip in het uiteindelijke document.
  </p>
</div>`;
  const result = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `📝 ${titel} — verzoek tot ondertekening`,
    html,
  });
  if (result.error) throw new Error(result.error.message);
  return result;
}

/**
 * Publieke action: ondertekenaar tekent het document.
 */
export async function tekenDocument({
  token,
  type,
  naam,
  data,
}: {
  token: string;
  type: "getypt" | "getekend";
  naam?: string;
  data?: string;
}): Promise<{ ok: boolean; error?: string; envelopeId?: string }> {
  if (!["getypt", "getekend"].includes(type)) return { ok: false, error: "Ongeldige methode" };
  if (type === "getypt" && !naam?.trim()) return { ok: false, error: "Naam verplicht" };
  if (type === "getekend" && !data) return { ok: false, error: "Tekening ontbreekt" };

  const admin = createAdminClient();
  const { data: o } = await admin
    .from("document_ondertekenaars")
    .select("id, envelope_id, status")
    .eq("token", token)
    .single();
  if (!o) return { ok: false, error: "Token ongeldig" };
  if (o.status !== "wachtend") return { ok: false, error: "Al ondertekend" };

  // De envelope zelf moet nog open staan: een ingetrokken, vervallen of al
  // voltooide envelope mag niet alsnog getekend worden, en niet na vervaldatum.
  const { data: env } = await admin
    .from("document_envelopes")
    .select("status, vervalt_op")
    .eq("id", o.envelope_id)
    .single();
  if (!env || ["ingetrokken", "vervallen", "voltooid"].includes(env.status)) {
    return { ok: false, error: "Dit document is niet meer beschikbaar om te ondertekenen." };
  }
  if (env.vervalt_op && new Date(env.vervalt_op) < new Date()) {
    return { ok: false, error: "De ondertekentermijn voor dit document is verlopen." };
  }

  // Headers ophalen (audit)
  const { headers } = await import("next/headers");
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "onbekend";
  const ua = h.get("user-agent") ?? "onbekend";

  await admin.from("document_ondertekenaars").update({
    status: "getekend",
    handtekening_type: type,
    handtekening_naam: type === "getypt" ? naam : null,
    handtekening_data: type === "getekend" ? data : null,
    getekend_op: new Date().toISOString(),
    ip_adres: ip,
    user_agent: ua,
  }).eq("id", o.id);

  // Check of envelope voltooid is
  const { data: nogOpen } = await admin
    .from("document_ondertekenaars")
    .select("id")
    .eq("envelope_id", o.envelope_id)
    .eq("status", "wachtend")
    .limit(1);

  if (!nogOpen || nogOpen.length === 0) {
    // Envelope voltooien: PDF samenstellen met handtekeningen-pagina
    await voltooidEnvelope(o.envelope_id);
  } else {
    await admin.from("document_envelopes")
      .update({ status: "deels_getekend" })
      .eq("id", o.envelope_id);
  }

  return { ok: true, envelopeId: o.envelope_id };
}

async function voltooidEnvelope(envelopeId: string) {
  const admin = createAdminClient();
  const { data: env } = await admin
    .from("document_envelopes")
    .select("id, titel, pdf_pad")
    .eq("id", envelopeId)
    .single();
  if (!env) return;

  const { data: onds } = await admin
    .from("document_ondertekenaars")
    .select("voornaam, achternaam, email, handtekening_type, handtekening_naam, handtekening_data, getekend_op, ip_adres, user_agent")
    .eq("envelope_id", envelopeId)
    .order("volgorde", { ascending: true });

  // Download origineel
  const { data: origBlob } = await admin.storage.from("documenten").download(env.pdf_pad);
  if (!origBlob) return;
  const origBytes = new Uint8Array(await origBlob.arrayBuffer());

  // Voeg audit-pagina toe
  const pdf = await PDFDocument.load(origBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([595, 842]);
  page.drawRectangle({ x: 0, y: 762, width: 595, height: 80, color: rgb(0.2, 0.2, 0.6) });
  page.drawText("Audit-trail ondertekening", { x: 50, y: 800, size: 20, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("eIDAS Simple Electronic Signature (SES)", { x: 50, y: 776, size: 11, font, color: rgb(0.9, 0.9, 1) });

  let y = 720;
  page.drawText(`Document: ${env.titel}`, { x: 50, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 24;

  for (const o of onds ?? []) {
    page.drawLine({ start: { x: 50, y: y + 6 }, end: { x: 545, y: y + 6 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 12;
    page.drawText(`${o.voornaam} ${o.achternaam}`, { x: 50, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 16;
    page.drawText(`E-mail: ${o.email}`, { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
    page.drawText(`Methode: ${o.handtekening_type === "getypt" ? `Getypt als "${o.handtekening_naam}"` : "Met de hand getekend"}`, { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
    page.drawText(`Tijdstip: ${o.getekend_op ? new Date(o.getekend_op).toLocaleString("nl-NL") : "—"}`, { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
    page.drawText(`IP: ${o.ip_adres ?? "—"}`, { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
    const uaKort = (o.user_agent ?? "").slice(0, 80);
    page.drawText(`Apparaat: ${uaKort}`, { x: 50, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
    y -= 22;

    // Handtekening visueel
    if (o.handtekening_type === "getekend" && o.handtekening_data) {
      try {
        const base64 = o.handtekening_data.replace(/^data:image\/png;base64,/, "");
        const pngBytes = Buffer.from(base64, "base64");
        const png = await pdf.embedPng(pngBytes);
        const scale = 100 / png.height;
        page.drawImage(png, { x: 50, y: y - 50, width: png.width * scale, height: png.height * scale });
        y -= 60;
      } catch { /* skip on fail */ }
    } else if (o.handtekening_type === "getypt" && o.handtekening_naam) {
      page.drawText(o.handtekening_naam, { x: 50, y: y - 6, size: 20, font, color: rgb(0.2, 0.2, 0.6) });
      y -= 30;
    }

    y -= 16;
    if (y < 100) {
      const np = pdf.addPage([595, 842]);
      y = 800;
      page.drawText("(vervolg audit op volgende pagina)", { x: 50, y: 60, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
      void np;
    }
  }

  // Footer
  page.drawText(`Gegenereerd door Noah ATS · ${new Date().toLocaleString("nl-NL")}`, {
    x: 50, y: 30, size: 7, font, color: rgb(0.5, 0.5, 0.5),
  });

  const voltooidBytes = await pdf.save();
  const voltooidPad = `${envelopeId}/getekend-${Date.now()}.pdf`;
  await admin.storage.from("documenten").upload(voltooidPad, voltooidBytes, {
    contentType: "application/pdf",
    upsert: false,
  });

  await admin.from("document_envelopes").update({
    status: "voltooid",
    voltooid_op: new Date().toISOString(),
    voltooid_pdf_pad: voltooidPad,
  }).eq("id", envelopeId);

  // Mail iedereen
  for (const o of onds ?? []) {
    try {
      await resend.emails.send({
        from: FROM,
        to: o.email,
        subject: `✓ ${env.titel} — volledig getekend`,
        html: `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#10b981;margin:0 0 16px 0;">✓ Document volledig getekend</h2>
  <p>Hallo ${o.voornaam},</p>
  <p>Het document <b>${env.titel}</b> is door alle partijen ondertekend. Bewaar deze mail als bewijs.</p>
  <p style="margin-top:16px;font-size:12px;color:#666;">
    De definitieve versie met audit-trail is opgeslagen in Noah ATS.
  </p>
</div>`,
      });
    } catch (e) {
      console.error("[document] voltooid-mail mislukt:", e);
    }
  }
}

/**
 * Handmatige reminder vanuit dashboard.
 */
export async function stuurReminder(envelopeId: string) {
  const user = await verifySuperAdmin();
  if (!user) return { ok: false, error: "Geen toegang" };

  const admin = createAdminClient();
  const { data: env } = await admin
    .from("document_envelopes")
    .select("id, titel, beschrijving, status")
    .eq("id", envelopeId)
    .single();
  if (!env) return { ok: false, error: "Niet gevonden" };
  if (env.status === "voltooid" || env.status === "vervallen") {
    return { ok: false, error: "Envelope al afgerond" };
  }

  const { data: onds } = await admin
    .from("document_ondertekenaars")
    .select("token, voornaam, email, status, aantal_reminders")
    .eq("envelope_id", envelopeId)
    .eq("status", "wachtend");

  for (const o of onds ?? []) {
    try {
      await stuurUitnodigingsmail({
        token: o.token,
        voornaam: o.voornaam,
        email: o.email,
        titel: `Herinnering: ${env.titel}`,
        beschrijving: env.beschrijving,
      });
      await admin.from("document_ondertekenaars").update({
        laatste_reminder_op: new Date().toISOString(),
        aantal_reminders: (o.aantal_reminders ?? 0) + 1,
      }).eq("token", o.token);
    } catch (e) {
      console.error("[reminder] mislukt:", e);
    }
  }

  revalidatePath(`/documenten/${envelopeId}`);
  return { ok: true };
}

/**
 * Envelope intrekken (mail niet verlopen via cron).
 */
export async function trekIn(envelopeId: string) {
  const user = await verifySuperAdmin();
  if (!user) return { ok: false, error: "Geen toegang" };
  const admin = createAdminClient();
  await admin.from("document_envelopes")
    .update({ status: "ingetrokken" })
    .eq("id", envelopeId);
  revalidatePath("/documenten");
  revalidatePath(`/documenten/${envelopeId}`);
  return { ok: true };
}

/**
 * Signed URL voor download van origineel of getekend document.
 */
export async function getSignedDocumentUrl(envelopeId: string, type: "origineel" | "voltooid"): Promise<string | null> {
  const user = await verifySuperAdmin();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: env } = await admin
    .from("document_envelopes")
    .select("pdf_pad, voltooid_pdf_pad")
    .eq("id", envelopeId)
    .single();
  if (!env) return null;
  const pad = type === "voltooid" ? env.voltooid_pdf_pad : env.pdf_pad;
  if (!pad) return null;
  const { data } = await admin.storage.from("documenten").createSignedUrl(pad, 60 * 60);
  return data?.signedUrl ?? null;
}
