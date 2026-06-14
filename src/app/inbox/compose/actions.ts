"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { verstuurMail } from "@/utils/mail";
import { saneerMailHtml } from "@/utils/html-sanitize";

export async function stuurMail(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const naar      = (formData.get("naar") as string)?.trim();
  // Onderwerp: CR/LF eruit (header-injectie-hardening) en lengte begrenzen.
  const onderwerp = (formData.get("onderwerp") as string)?.replace(/[\r\n]+/g, " ").trim().slice(0, 255);
  // body_html is de nieuwe WYSIWYG-payload (kan handtekening al bevatten).
  // body is de legacy plain-text-fallback uit oudere clients/tests.
  const bodyHtml          = (formData.get("body_html") as string | null)?.trim() ?? "";
  const bodyPlain         = (formData.get("body") as string | null)?.trim() ?? "";
  const handtekeningHtml  = (formData.get("handtekening_html") as string | null)?.trim() ?? "";
  const accountId         = (formData.get("account_id") as string)?.trim();
  const conceptId         = (formData.get("concept_id") as string)?.trim();

  // Minstens 1 van beide body-velden moet inhoud hebben.
  if (!naar || !onderwerp || (!bodyHtml && !bodyPlain)) {
    redirect("/inbox/compose?error=Alle+velden+verplicht");
  }

  // Ontvanger moet precies één geldig e-mailadres zijn (geen lijst, geen
  // CR/LF). Voorkomt onbedoeld massamailen en header-injectie.
  const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
  if (!EMAIL_RE.test(naar)) {
    redirect("/inbox/compose?error=Ongeldig+e-mailadres");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("voornaam, achternaam, tenant_id")
    .eq("id", user.id)
    .single();

  // Kies account: meegegeven id of primair
  let accountQuery = admin
    .from("mail_accounts")
    .select("mail_adres, mail_wachtwoord")
    .eq("user_id", user.id);
  if (accountId) {
    accountQuery = accountQuery.eq("id", accountId);
  } else {
    accountQuery = accountQuery.eq("is_primary", true);
  }
  const { data: account } = await accountQuery.maybeSingle();

  if (!account?.mail_adres || !account.mail_wachtwoord) {
    redirect("/inbox/compose?error=Mailbox+niet+ingesteld");
  }

  const { data: tenant } = await admin
    .from("tenants")
    .select("naam")
    .eq("id", profile?.tenant_id ?? "")
    .single();

  try {
    // De body bevat de handtekening al (de user heeft 'm in de editor staan
    // en kan hem aanpassen voor verzenden), dus we slaan auto-appenden over.
    // Voorkeur: body_html (WYSIWYG). Fallback: plain body met <br>-conversie.
    const ruwHoofd = bodyHtml
      ? bodyHtml
      : `<div>${bodyPlain.replace(/\n/g, "<br>")}</div>`;
    const veiligeHoofd = saneerMailHtml(ruwHoofd);
    const veiligeHandtekening = handtekeningHtml ? saneerMailHtml(handtekeningHtml) : "";
    // Hoofdtekst en handtekening worden hier samengevoegd. De handtekening
    // is dezelfde HTML als in /instellingen, dus de ontvanger ziet exact
    // dezelfde gestylede tabel (paarse balk, logo-wordmark, contactstrook).
    const htmlBody = veiligeHandtekening
      ? `${veiligeHoofd}<br><br>${veiligeHandtekening}`
      : veiligeHoofd;

    await verstuurMail({
      vanAdres: account.mail_adres,
      vanWachtwoord: account.mail_wachtwoord,
      vanVoornaam: profile?.voornaam ?? "",
      vanBureau: tenant?.naam ?? "Noah recruitment",
      naar,
      onderwerp,
      htmlBody,
      handtekening: null,
      appendHandtekening: false,
    });
  } catch (e) {
    redirect(`/inbox/compose?error=${encodeURIComponent((e as Error).message)}`);
  }

  // Concept opruimen na succesvol verzenden.
  if (conceptId) {
    await admin
      .from("mail_concepten")
      .delete()
      .eq("id", conceptId)
      .eq("user_id", user.id);
  }

  redirect("/inbox?ok=verzonden");
}
