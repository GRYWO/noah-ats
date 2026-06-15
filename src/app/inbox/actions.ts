"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ImapFlow } from "imapflow";
import { getMailServers } from "@/utils/mail-provider";
import { decrypt } from "@/utils/crypto";

/**
 * Haal het juiste mail_accounts-record op voor deze user. Als formData een
 * 'account_id' bevat (multi-account: gebruiker zit in een specifiek account)
 * pakken we dat account, anders het primaire account. Geeft credentials,
 * IMAP-host/-port en account_id terug. Redirect bij ontbrekende config.
 */
async function haalActiefMailAccount(
  userId: string,
  accountId?: string | null,
): Promise<{
  id: string;
  mail_adres: string;
  mail_wachtwoord: string;
  imap_host: string | null;
  imap_port: number | null;
}> {
  const admin = createAdminClient();
  let query = admin
    .from("mail_accounts")
    .select("id, mail_adres, mail_wachtwoord, imap_host, imap_port, is_primary, user_id")
    .eq("user_id", userId);

  if (accountId) {
    query = query.eq("id", accountId);
  } else {
    query = query.eq("is_primary", true);
  }

  const { data: account } = await query.maybeSingle();

  // Fallback: als er geen primary is, pak het eerste actieve account
  let gekozen = account;
  if (!gekozen) {
    const { data: eerste } = await admin
      .from("mail_accounts")
      .select("id, mail_adres, mail_wachtwoord, imap_host, imap_port, is_primary, user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    gekozen = eerste;
  }

  if (!gekozen?.mail_adres || !gekozen.mail_wachtwoord) {
    redirect("/inbox?error=Geen+mail-config+voor+dit+account");
  }

  return {
    id: gekozen.id,
    mail_adres: gekozen.mail_adres,
    mail_wachtwoord: gekozen.mail_wachtwoord,
    imap_host: gekozen.imap_host,
    imap_port: gekozen.imap_port,
  };
}

export async function maakNieuweMap(formData: FormData) {
  const mapNaam = (formData.get("map_naam") as string)?.trim();
  if (!mapNaam) redirect("/inbox?error=Naam+leeg");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountIdInput = (formData.get("account_id") as string | null)?.trim() || null;
  const account = await haalActiefMailAccount(user.id, accountIdInput);

  const servers = getMailServers(account.mail_adres);
  const client = new ImapFlow({
    host: account.imap_host ?? servers.imapHost,
    port: account.imap_port ?? servers.imapPort,
    secure: true,
    auth: { user: account.mail_adres, pass: decrypt(account.mail_wachtwoord) },
    logger: false,
  });

  try {
    await client.connect();
    await client.mailboxCreate(mapNaam);
  } catch (e) {
    await client.logout().catch(() => {});
    console.error("[maakNieuweMap] IMAP-fout:", (e as Error).message, "map:", mapNaam);
    redirect(`/inbox?error=${encodeURIComponent("Map aanmaken mislukt: " + (e as Error).message)}`);
  }

  await client.logout().catch(() => {});

  // Direct een mail_mappen-row schrijven zodat de nieuwe map meteen in de
  // sidebar verschijnt, zonder te hoeven wachten op de volgende auto-sync
  // (15s). Type 'ander' want het is per definitie een door de user
  // aangemaakte map, geen systeem-map.
  const admin = createAdminClient();
  const nieuweRij = {
    user_id: user.id,
    account_id: account.id,
    pad: mapNaam,
    label: mapNaam,
    type: "ander",
    aantal: 0,
    ongelezen: 0,
    last_sync: new Date().toISOString(),
  };
  const { data: bestaande } = await admin
    .from("mail_mappen")
    .select("id")
    .eq("account_id", account.id)
    .eq("pad", mapNaam)
    .maybeSingle();
  if (bestaande?.id) {
    await admin.from("mail_mappen").update(nieuweRij).eq("id", bestaande.id);
  } else {
    await admin.from("mail_mappen").insert(nieuweRij);
  }

  revalidatePath("/inbox");
  redirect(`/inbox?map=${encodeURIComponent(mapNaam)}&account=${encodeURIComponent(account.id)}`);
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

  const accountIdInput = (formData.get("account_id") as string | null)?.trim() || null;
  const account = await haalActiefMailAccount(user.id, accountIdInput);
  const admin = createAdminClient();

  const servers = getMailServers(account.mail_adres);
  const client = new ImapFlow({
    host: account.imap_host ?? servers.imapHost,
    port: account.imap_port ?? servers.imapPort,
    secure: true,
    auth: { user: account.mail_adres, pass: decrypt(account.mail_wachtwoord) },
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

    // 4. Lokale cache opruimen zodat map direct verdwijnt in UI.
    // Filter per account_id zodat een gelijknamige map van een ANDER
    // mail-account van dezelfde user (multi-account) niet ook gewist
    // wordt.
    await admin.from("mail_mappen").delete().eq("account_id", account.id).eq("pad", mapPad);
    await admin.from("mail_berichten").delete().eq("account_id", account.id).eq("map_pad", mapPad);
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
