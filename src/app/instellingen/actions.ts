"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getGrywoLogoDataUri } from "@/utils/grywo-logo";

export async function updateMailConfig(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const voornaam       = (formData.get("voornaam") as string)?.trim();
  const achternaam     = (formData.get("achternaam") as string)?.trim();
  const telefoon       = (formData.get("telefoon") as string)?.trim();
  const functieTitel   = (formData.get("functie_titel") as string)?.trim();

  // Haal rol + primair mail-adres op
  const admin = createAdminClient();
  const { data: huidigeProfile } = await admin
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  const { data: primair } = await admin
    .from("mail_accounts")
    .select("mail_adres")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();
  const mailAdres = primair?.mail_adres ?? user.email ?? "";
  const rol = huidigeProfile?.rol ?? "setter";
  const rolFallback = rol === "admin" ? "Admin" : rol === "recruiter" ? "Recruiter" : "Setter";
  const rolLabel = functieTitel || `${rolFallback} bij GRYWO`;

  // Mooie handtekening — logo als base64 (klein bestand, geen losse bijlage)
  const logoUri = getGrywoLogoDataUri();
  const handtekening = `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:30px;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;border-collapse:collapse;">
  <tr>
    <td style="padding:0 22px 0 0;border-right:3px solid #333399;vertical-align:middle;">
      ${logoUri ? `<img src="${logoUri}" alt="GRYWO" width="90" style="display:block;border:0;outline:none;text-decoration:none;">` : `<div style="font-family:'Avenir Next Rounded',sans-serif;font-size:32px;font-weight:900;color:#333399;letter-spacing:-2px;">grywo</div>`}
    </td>
    <td style="padding:0 0 0 22px;vertical-align:middle;line-height:1.5;">
      <div style="font-size:16px;font-weight:700;color:#1a1a2e;letter-spacing:-0.2px;margin-bottom:2px;">
        ${voornaam} ${achternaam}
      </div>
      <div style="font-size:13px;color:#666;font-weight:500;margin-bottom:8px;">
        ${rolLabel}
      </div>
      <div style="font-size:12px;color:#444;">
        ${telefoon ? `<a href="tel:${telefoon}" style="color:#444;text-decoration:none;">${telefoon}</a>&nbsp;&nbsp;·&nbsp;&nbsp;` : ""}<a href="mailto:${mailAdres}" style="color:#444;text-decoration:none;">${mailAdres}</a>
      </div>
      <div style="font-size:12px;margin-top:2px;">
        <a href="https://grywo.nl" style="color:#333399;text-decoration:none;font-weight:600;">grywo.nl</a>
      </div>
    </td>
  </tr>
</table>`;

  const update: Record<string, unknown> = {
    voornaam,
    achternaam,
    telefoon,
    functie_titel: functieTitel || null,
    handtekening_html: handtekening,
  };

  const { error } = await admin.from("profiles").update(update).eq("id", user.id);

  if (error) {
    redirect(`/instellingen?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/instellingen");
  redirect("/instellingen?ok=profiel");
}
