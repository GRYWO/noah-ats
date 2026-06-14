"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { verstuurMail } from "@/utils/mail";

export async function stuurMail(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const naar      = (formData.get("naar") as string)?.trim();
  // Onderwerp: CR/LF eruit (header-injectie-hardening) en lengte begrenzen.
  const onderwerp = (formData.get("onderwerp") as string)?.replace(/[\r\n]+/g, " ").trim().slice(0, 255);
  const body      = (formData.get("body") as string)?.trim();
  const accountId = (formData.get("account_id") as string)?.trim();
  const conceptId = (formData.get("concept_id") as string)?.trim();

  if (!naar || !onderwerp || !body) {
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
    // De body bevat de handtekening al (de user kan hem in de textarea zien
    // en aanpassen voor verzenden), dus we slaan auto-appenden over.
    await verstuurMail({
      vanAdres: account.mail_adres,
      vanWachtwoord: account.mail_wachtwoord,
      vanVoornaam: profile?.voornaam ?? "",
      vanBureau: tenant?.naam ?? "Noah recruitment",
      naar,
      onderwerp,
      htmlBody: body.replace(/\n/g, "<br>"),
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
