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
  const onderwerp = (formData.get("onderwerp") as string)?.trim();
  const body      = (formData.get("body") as string)?.trim();

  if (!naar || !onderwerp || !body) {
    redirect("/inbox/compose?error=Alle+velden+verplicht");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("mail_adres, mail_wachtwoord, handtekening_html, voornaam, achternaam, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.mail_adres || !profile.mail_wachtwoord) {
    redirect("/inbox/compose?error=Mailbox+niet+ingesteld");
  }

  const { data: tenant } = await admin
    .from("tenants")
    .select("naam")
    .eq("id", profile.tenant_id ?? "")
    .single();

  try {
    await verstuurMail({
      vanAdres: profile.mail_adres,
      vanWachtwoord: profile.mail_wachtwoord,
      vanVoornaam: profile.voornaam ?? "",
      vanBureau: tenant?.naam ?? "GRYWO",
      naar,
      onderwerp,
      htmlBody: body.replace(/\n/g, "<br>"),
      handtekening: profile.handtekening_html,
    });
  } catch (e) {
    redirect(`/inbox/compose?error=${encodeURIComponent((e as Error).message)}`);
  }

  redirect("/inbox?ok=verzonden");
}
