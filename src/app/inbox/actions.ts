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

  let foutmelding: string | null = null;
  try {
    await client.connect();

    // 1. Leeg de map: verplaats berichten naar Prullenbak, of hard delete
    //    als er geen trash is / we al in trash zitten.
    const list = await client.list();
    const trash = list.find(m => m.specialUse === "\\Trash")
               ?? list.find(m => m.path.toLowerCase().includes("trash") || m.path.toLowerCase().includes("prullen"));

    const lock = await client.getMailboxLock(mapPad);
    try {
      const mailbox = client.mailbox as { exists: number };
      if (mailbox.exists > 0) {
        if (trash && trash.path !== mapPad) {
          await client.messageMove("1:*", trash.path).catch(async () => {
            // Fallback: als move faalt (bv. quota of permissies), hard delete
            await client.messageDelete("1:*");
          });
        } else {
          await client.messageDelete("1:*");
        }
      }
    } finally {
      lock.release();
    }

    // 2. BELANGRIJK: switch naar INBOX (of een andere mailbox) voordat
    //    we de target deleten. Migadu (en RFC 3501) weigeren DELETE op
    //    een geselecteerde mailbox met "Command failed". Door INBOX te
    //    openen wordt de huidige selectie gedeselecteerd.
    try {
      await client.mailboxOpen("INBOX");
      await client.mailboxClose();
    } catch {
      // Negeer — als INBOX niet kan worden geopend gaan we toch door
    }

    // 3. Probeer de mailbox te verwijderen
    await client.mailboxDelete(mapPad);

    // 4. Lokale cache opruimen zodat map direct verdwijnt in UI
    await admin.from("mail_mappen").delete().eq("user_id", user.id).eq("pad", mapPad);
    await admin.from("mail_berichten").delete().eq("user_id", user.id).eq("map_pad", mapPad);
  } catch (e) {
    foutmelding = (e as Error).message || "Onbekende fout";
    console.error("[verwijderMap] IMAP-fout:", foutmelding, "map:", mapPad);
  } finally {
    await client.logout().catch(() => {});
  }

  revalidatePath("/inbox");
  if (foutmelding) {
    redirect(`/inbox?error=${encodeURIComponent("Map verwijderen mislukt: " + foutmelding)}`);
  }
  redirect("/inbox");
}
