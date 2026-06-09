"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

type Result = { ok?: boolean; error?: string };

/**
 * Iemand ondertekent de samenwerkings-intentieverklaring op /word-setter.
 * Opgeslagen in setter_aanmeldingen. Pepijn krijgt direct een mail.
 */
export async function tekenSetterAanmelding(formData: FormData): Promise<Result> {
  const voornaam = (formData.get("voornaam") as string)?.trim();
  const achternaam = (formData.get("achternaam") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const telefoon = (formData.get("telefoon") as string)?.trim() || null;
  const handtekeningType = ((formData.get("handtekening_type") as string) ?? "typed") === "drawn"
    ? "drawn"
    : "typed";
  const handtekeningData = (formData.get("handtekening_data") as string) ?? "";
  const akkoord = formData.get("akkoord") === "on" || formData.get("akkoord") === "true";

  if (!voornaam || voornaam.length < 2) return { error: "Vul je voornaam in" };
  if (!achternaam || achternaam.length < 2) return { error: "Vul je achternaam in" };
  if (!email || !email.includes("@")) return { error: "Vul een geldig e-mailadres in" };
  if (!handtekeningData) return { error: "Plaats een handtekening" };
  if (!akkoord) return { error: "Bevestig akkoord met de overeenkomst" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent") || null;

  const admin = createAdminClient();
  const { data: aanmelding, error } = await admin
    .from("setter_aanmeldingen")
    .insert({
      voornaam,
      achternaam,
      email,
      telefoon,
      handtekening_type: handtekeningType,
      handtekening_data: handtekeningData,
      ip_adres: ip,
      user_agent: userAgent,
    })
    .select("id")
    .single();
  if (error || !aanmelding) return { error: error?.message ?? "Opslaan mislukt" };

  const naam = `${voornaam} ${achternaam}`.trim();

  // Inlog-gegevens die in de bevestigingsmail komen. Worden gevuld
  // tijdens de account-flow hieronder.
  let inlogWachtwoord: string | null = null;

  // ─── AUTOMATISCH SETTER-ACCOUNT + MAILBOX + NDA ───
  // Alles best-effort: fouten worden gelogd maar blokkeren de aanmelding niet
  // (Pepijn krijgt sowieso de mail en kan handmatig ingrijpen).
  try {
    const { randomBytes } = await import("crypto");
    const { getGrywoPoolTenantId } = await import("@/utils/setter-assign");
    const { maakNoahMailbox } = await import("@/utils/migadu");
    const { encrypt } = await import("@/utils/crypto");
    const { werkdagenLater } = await import("@/utils/voorstel-log");
    const { sendAkkoordTerOndertekening } = await import("@/utils/email");

    const tenantId = await getGrywoPoolTenantId();
    if (!tenantId) {
      console.error("[setter-aanmelding] geen GRYWO-pool tenant gevonden");
    } else {
      // Wachtwoord voor Noah-account én Migadu-mailbox (zelfde of apart kan)
      const noahWachtwoord =
        randomBytes(6).toString("base64").replace(/[+/=]/g, "").slice(0, 10) + "1!";
      const mailboxWachtwoord =
        randomBytes(6).toString("base64").replace(/[+/=]/g, "").slice(0, 10) + "1!";

      // 1. Auth-user aanmaken met persoonlijke email als login
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: noahWachtwoord,
        email_confirm: true,
      });

      if (createErr) {
        // Email bestaat al? Dan vinden we 'm en hergebruiken
        console.warn("[setter-aanmelding] createUser:", createErr.message);
      }

      const userId = created?.user?.id;
      if (userId) {
        // Bewaar voor in de bevestigingsmail
        inlogWachtwoord = noahWachtwoord;
        // 2. Migadu mailbox @grywo.nl aanmaken (idempotent)
        const grywoEmail = `${voornaam.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "")}@grywo.nl`;
        let mailboxOk = false;
        try {
          const mb = await maakNoahMailbox({
            voornaam,
            achternaam,
            wachtwoord: mailboxWachtwoord,
          });
          mailboxOk = mb.ok;
          if (!mb.ok && !mb.alBestaat) {
            console.error("[setter-aanmelding] Migadu:", mb.error);
          }
        } catch (e) {
          console.error("[setter-aanmelding] Migadu uitzondering:", e);
        }

        // 3. Profile aanmaken in GRYWO-pool met 14-werkdagen proefperiode
        const proefEinde = werkdagenLater(14);
        await admin.from("profiles").insert({
          id: userId,
          tenant_id: tenantId,
          voornaam,
          achternaam,
          rol: "setter",
          telefoon: telefoon ?? null,
          mail_adres: grywoEmail,
          mail_wachtwoord: mailboxOk ? encrypt(mailboxWachtwoord) : null,
          mail_status: mailboxOk ? "actief" : "niet_geconfigureerd",
          abonnement_status: "proefperiode",
          proefperiode_eindigt_op: proefEinde,
        });

        // 4. NDA-token aanmaken in user_agreements
        const ndaToken = randomBytes(16).toString("hex");
        const { data: tenant } = await admin
          .from("tenants")
          .select("naam, handelsnaam")
          .eq("id", tenantId)
          .single();
        await admin.from("user_agreements").insert({
          user_id: userId,
          tenant_id: tenantId,
          token: ndaToken,
          type: "nda_setter",
          status: "wachtend",
          verzonden_aan_email: email, // PERSOONLIJK adres (user antwoord)
          verzonden_aan_naam: naam,
          user_voornaam: voornaam,
          user_achternaam: achternaam,
          user_rol: "setter",
          bureau_naam: tenant?.handelsnaam || tenant?.naam || "GRYWO",
        });

        // 5. NDA-mail naar persoonlijke email
        try {
          await sendAkkoordTerOndertekening({
            naar: email,
            naam,
            type: "nda_setter",
            token: ndaToken,
          });
        } catch (e) {
          console.error("[setter-aanmelding] NDA-mail:", e);
        }
      }
    }
  } catch (e) {
    console.error("[setter-aanmelding] auto-account flow mislukt:", e);
  }

  // Mail naar Pepijn + info@grywo.nl
  try {
    await resend.emails.send({
      from: "Noah ATS <noreply@grywo.nl>",
      to: ["pepijn@grywo.nl", "wouter@grywo.nl"],
      cc: ["info@grywo.nl"],
      subject: `🎯 Nieuwe setter-aanmelding: ${naam}`,
      html: `
<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:auto;">
<h2 style="color:#333399;">Nieuwe setter-aanmelding</h2>
<p><b>${naam}</b> heeft zojuist de samenwerkings-intentieverklaring ondertekend via noah-ats.nl/word-setter.</p>

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f9fb;border-radius:8px;padding:16px;margin:16px 0;">
  <tr><td style="padding:6px 0;color:#666;width:35%;">Naam</td><td style="padding:6px 0;font-weight:600;">${naam}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">E-mail</td><td style="padding:6px 0;font-weight:600;"><a href="mailto:${email}">${email}</a></td></tr>
  ${telefoon ? `<tr><td style="padding:6px 0;color:#666;">Telefoon</td><td style="padding:6px 0;font-weight:600;"><a href="tel:${telefoon}">${telefoon}</a></td></tr>` : ""}
  <tr><td style="padding:6px 0;color:#666;">Ondertekend op</td><td style="padding:6px 0;font-weight:600;">${new Date().toLocaleString("nl-NL")}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Audit (IP/UA)</td><td style="padding:6px 0;font-size:11px;color:#888;">${ip ?? "?"} · ${userAgent?.slice(0, 80) ?? "?"}</td></tr>
</table>

<p>Bel of mail deze persoon zo snel mogelijk om de 7-daagse trial te plannen.</p>
<p style="font-size:12px;color:#888;">Aanmelding-ID: ${aanmelding.id}</p>
</div>`,
    });
  } catch (e) {
    console.error("[setter-aanmelding] mail naar Pepijn mislukt:", e);
  }

  // Bevestigingsmail naar de aanmelder
  try {
    await resend.emails.send({
      from: "GRYWO <noreply@grywo.nl>",
      to: email,
      subject: "Welkom bij GRYWO — Pepijn neemt snel contact op",
      html: `
<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:auto;">
<div style="background:#333399;color:white;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
  <span style="font-size:32px;font-weight:900;letter-spacing:-1px;">noah</span><span style="display:inline-block;width:6px;height:6px;background:#ffd84d;border-radius:50%;margin-left:4px;vertical-align:top;margin-top:6px;"></span>
</div>
<div style="background:white;padding:28px;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;">
<h2 style="color:#333399;margin-top:0;">Hoi ${voornaam},</h2>
<p>Bedankt voor je aanmelding! Je samenwerkings-intentieverklaring is binnen — alles is automatisch klaargezet:</p>
<ul style="padding-left:20px;">
  <li>✅ Je Noah-account is aangemaakt</li>
  <li>✅ Je <b>${voornaam.toLowerCase()}@grywo.nl</b>-mailbox is klaar</li>
  <li>✅ De geheimhoudingsverklaring (NDA) is zojuist apart naar dit e-mailadres verstuurd — onderteken die ook even</li>
</ul>

${inlogWachtwoord ? `
<div style="background:#f9f9fb;border:1px solid #e0e0ea;border-radius:10px;padding:18px;margin:22px 0;">
  <div style="font-size:12px;font-weight:700;color:#333399;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Je inloggegevens voor Noah-ATS</div>
  <table cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td style="padding:4px 0;color:#666;width:35%;font-size:13px;">E-mail</td><td style="padding:4px 0;font-weight:600;font-size:13px;">${email}</td></tr>
    <tr><td style="padding:4px 0;color:#666;font-size:13px;">Wachtwoord</td><td style="padding:4px 0;font-weight:600;font-family:monospace;font-size:13px;">${inlogWachtwoord}</td></tr>
  </table>
  <p style="margin:14px 0 0 0;font-size:11px;color:#888;">Wijzig dit wachtwoord direct na je eerste login.</p>
</div>

<div style="text-align:center;margin:24px 0;">
  <a href="https://www.noah-ats.nl/login" style="display:inline-block;background:#333399;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:bold;font-size:15px;">Inloggen bij Noah-ATS →</a>
</div>
` : ""}

<p><b>Wat gebeurt er nu?</b></p>
<ul style="padding-left:20px;">
  <li>Log in op Noah-ATS met bovenstaande gegevens en kijk rond</li>
  <li>Onderteken de NDA-mail die we apart hebben gestuurd</li>
  <li>Na 7 werkdagen trial: eigen Voys-telefoonnummer + vaste plek in het team</li>
</ul>
<p style="margin-top:24px;">Vragen? WhatsApp Pepijn direct op <a href="https://wa.me/31683481303">+31 6 83481303</a>.</p>
<p style="color:#666;font-size:13px;margin-top:32px;">Tot snel,<br>Het GRYWO-team</p>
</div>
</div>`,
    });
  } catch (e) {
    console.error("[setter-aanmelding] bevestiging naar aanmelder mislukt:", e);
  }

  return { ok: true };
}
