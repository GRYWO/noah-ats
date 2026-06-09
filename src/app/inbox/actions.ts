"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ImapFlow } from "imapflow";
import { getMailServers } from "@/utils/mail-provider";
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

  const servers = getMailServers(profile.mail_adres);
  const client = new ImapFlow({
    host: servers.imapHost,
    port: servers.imapPort,
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

  const servers = getMailServers(profile.mail_adres);
  const client = new ImapFlow({
    host: servers.imapHost,
    port: servers.imapPort,
    secure: true,
    auth: { user: profile.mail_adres, pass: decrypt(secret.mail_wachtwoord) },
    logger: false,
  });

  try {
    await client.connect();

    // Voordat we de map zelf verwijderen, eerst alle berichten verplaatsen
    // naar de Prullenbak. Veel IMAP-servers (waaronder Migadu) weigeren
    // anders met "Command failed" als de mailbox niet leeg is.
    const list = await client.list();
    const trash = list.find(m => m.specialUse === "\\Trash")
               ?? list.find(m => m.path.toLowerCase().includes("trash") || m.path.toLowerCase().includes("prullen"));

    const lock = await client.getMailboxLock(mapPad);
    try {
      const mailbox = client.mailbox as { exists: number };
      if (mailbox.exists > 0 && trash && trash.path !== mapPad) {
        // Alle mails uit deze map naar de Prullenbak verplaatsen
        await client.messageMove("1:*", trash.path);
      } else if (mailbox.exists > 0) {
        // Geen trash beschikbaar of we zitten al in trash → hard delete
        await client.messageDelete("1:*");
      }
    } finally {
      lock.release();
    }

    await client.mailboxDelete(mapPad);

    // Lokale cache opruimen zodat de map ook in Noah-ATS direct verdwijnt
    await admin.from("mail_mappen").delete().eq("user_id", user.id).eq("pad", mapPad);
    await admin.from("mail_berichten").delete().eq("user_id", user.id).eq("map_pad", mapPad);
  } catch (e) {
    await client.logout().catch(() => {});
    const msg = (e as Error).message || "Onbekende fout";
    redirect(`/inbox?error=${encodeURIComponent("Map verwijderen mislukt: " + msg)}`);
  }

  await client.logout().catch(() => {});

  revalidatePath("/inbox");
  redirect("/inbox");
}
