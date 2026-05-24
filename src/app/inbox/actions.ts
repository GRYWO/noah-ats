"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ImapFlow } from "imapflow";
import { decrypt } from "@/utils/crypto";

export async function maakNieuweMap(formData: FormData) {
  const mapNaam = (formData.get("map_naam") as string)?.trim();
  if (!mapNaam) redirect("/inbox?error=Naam+leeg");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("mail_adres")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();
  const { data: secret } = await admin
    .from("profiles")
    .select("mail_wachtwoord")
    .eq("id", user.id)
    .single();

  if (!profile?.mail_adres || !secret?.mail_wachtwoord) {
    redirect("/inbox?error=Geen+mail-config");
  }

  const client = new ImapFlow({
    host: process.env.HOSTNET_IMAP_HOST ?? "imap.hostnet.nl",
    port: parseInt(process.env.HOSTNET_IMAP_PORT ?? "993"),
    secure: true,
    auth: { user: profile.mail_adres, pass: decrypt(secret.mail_wachtwoord) },
    logger: false,
  });

  try {
    await client.connect();
    await client.mailboxCreate(mapNaam);
  } catch (e) {
    await client.logout().catch(() => {});
    redirect(`/inbox?error=${encodeURIComponent((e as Error).message)}`);
  }

  await client.logout().catch(() => {});

  revalidatePath("/inbox");
  redirect(`/inbox?map=${encodeURIComponent(mapNaam)}`);
}

export async function verwijderMap(formData: FormData) {
  const mapPad = (formData.get("map_pad") as string)?.trim();
  if (!mapPad) redirect("/inbox?error=Geen+map");

  // Beveilig: voorkom verwijderen van systeem-mappen
  const systeem = ["inbox", "sent", "drafts", "trash", "junk", "spam"];
  if (systeem.includes(mapPad.toLowerCase())) {
    redirect("/inbox?error=Systeemmap+kan+niet+verwijderd+worden");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("mail_adres")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();
  const { data: secret } = await admin
    .from("profiles")
    .select("mail_wachtwoord")
    .eq("id", user.id)
    .single();

  if (!profile?.mail_adres || !secret?.mail_wachtwoord) {
    redirect("/inbox?error=Geen+mail-config");
  }

  const client = new ImapFlow({
    host: process.env.HOSTNET_IMAP_HOST ?? "imap.hostnet.nl",
    port: parseInt(process.env.HOSTNET_IMAP_PORT ?? "993"),
    secure: true,
    auth: { user: profile.mail_adres, pass: decrypt(secret.mail_wachtwoord) },
    logger: false,
  });

  try {
    await client.connect();
    await client.mailboxDelete(mapPad);
  } catch (e) {
    await client.logout().catch(() => {});
    redirect(`/inbox?error=${encodeURIComponent((e as Error).message)}`);
  }

  await client.logout().catch(() => {});

  revalidatePath("/inbox");
  redirect("/inbox");
}
