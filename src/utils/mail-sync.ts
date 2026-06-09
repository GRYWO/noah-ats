import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { decrypt } from "./crypto";
import { getMailServers } from "./mail-provider";
import { createAdminClient } from "./supabase/admin";

type MapType = "inbox" | "sent" | "drafts" | "trash" | "spam" | "ander";

const MAP_TYPES: Record<string, MapType> = {
  "\\Inbox": "inbox",
  "\\Sent": "sent",
  "\\Drafts": "drafts",
  "\\Trash": "trash",
  "\\Junk": "spam",
};

const MAP_LABELS: Record<MapType, string> = {
  inbox: "Postvak IN",
  sent: "Verzonden",
  drafts: "Concepten",
  trash: "Prullenbak",
  spam: "Spam",
  ander: "Overig",
};

function detectMapType(path: string, specialUse?: string): MapType {
  if (specialUse && MAP_TYPES[specialUse]) return MAP_TYPES[specialUse];
  const p = path.toLowerCase();
  if (p === "inbox") return "inbox";
  if (p.includes("sent") || p.includes("verzonden")) return "sent";
  if (p.includes("draft") || p.includes("concept")) return "drafts";
  if (p.includes("trash") || p.includes("prullen")) return "trash";
  if (p.includes("junk") || p.includes("spam")) return "spam";
  return "ander";
}

/**
 * Sync mails voor één specifiek mail-account.
 */
export async function syncMailsVoorAccount(accountId: string, mailLimitPerMap = 50) {
  const admin = createAdminClient();

  const { data: account } = await admin
    .from("mail_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (!account?.mail_adres || !account.mail_wachtwoord) {
    return { error: "Account niet geconfigureerd" };
  }

  const servers = getMailServers(account.mail_adres);
  const client = new ImapFlow({
    host: account.imap_host ?? servers.imapHost,
    port: account.imap_port ?? servers.imapPort,
    secure: true,
    auth: { user: account.mail_adres, pass: decrypt(account.mail_wachtwoord) },
    logger: false,
  });

  let totaalNieuw = 0;

  try {
    await client.connect();
    const list = await client.list();

    for (const mapInfo of list) {
      if (mapInfo.flags?.has("\\Noselect")) continue;

      const type = detectMapType(mapInfo.path, mapInfo.specialUse);
      const label = type === "ander" ? mapInfo.name : MAP_LABELS[type];

      const status = await client.status(mapInfo.path, { messages: true, unseen: true });

      await admin.from("mail_mappen").upsert({
        user_id: account.user_id,
        account_id: accountId,
        pad: mapInfo.path,
        label,
        type,
        aantal: status.messages ?? 0,
        ongelezen: status.unseen ?? 0,
        last_sync: new Date().toISOString(),
      }, { onConflict: "user_id,pad" });

      const lock = await client.getMailboxLock(mapInfo.path);
      try {
        const mailbox = client.mailbox as { exists: number };
        const totaal = mailbox.exists;
        if (totaal === 0) continue;

        const start = Math.max(1, totaal - mailLimitPerMap + 1);
        const end = totaal;

        const { data: bestaand } = await admin
          .from("mail_berichten")
          .select("uid")
          .eq("account_id", accountId)
          .eq("map_pad", mapInfo.path);

        const bestaandeUids = new Set((bestaand ?? []).map(b => b.uid));

        const nieuweBerichten: Array<{
          user_id: string;
          account_id: string;
          map_pad: string;
          uid: number;
          van: string | null;
          naam: string | null;
          onderwerp: string | null;
          datum: string;
          gelezen: boolean;
          gevlagd: boolean;
        }> = [];

        for await (const msg of client.fetch(`${start}:${end}`, {
          envelope: true,
          flags: true,
          internalDate: true,
        })) {
          if (bestaandeUids.has(msg.uid)) continue;

          const env = msg.envelope;
          const van = env?.from?.[0];
          const datum = msg.internalDate
            ? new Date(msg.internalDate).toISOString()
            : env?.date?.toISOString() ?? new Date().toISOString();

          nieuweBerichten.push({
            user_id: account.user_id,
            account_id: accountId,
            map_pad: mapInfo.path,
            uid: msg.uid,
            van: van?.address ?? null,
            naam: van?.name ?? van?.address ?? null,
            onderwerp: env?.subject ?? "(geen onderwerp)",
            datum,
            gelezen: msg.flags?.has("\\Seen") ?? false,
            gevlagd: msg.flags?.has("\\Flagged") ?? false,
          });
        }

        if (nieuweBerichten.length > 0) {
          await admin.from("mail_berichten").upsert(nieuweBerichten, {
            onConflict: "user_id,map_pad,uid",
          });
          totaalNieuw += nieuweBerichten.length;
        }
      } finally {
        lock.release();
      }
    }
  } finally {
    await client.logout().catch(() => {});
  }

  // Push notificatie als er nieuwe mail is — niet awaiten zodat sync snel blijft
  if (totaalNieuw > 0 && account.user_id) {
    import("@/utils/push")
      .then(({ stuurPushNaarUser }) =>
        stuurPushNaarUser(account.user_id, {
          title: totaalNieuw === 1 ? "📬 1 nieuwe mail" : `📬 ${totaalNieuw} nieuwe mails`,
          body: account.mail_adres,
          url: "/inbox",
          tag: "noah-mail",
        })
      )
      .catch((e) => console.error("[mail-sync] push mislukt:", e));
  }

  return { ok: true, nieuw: totaalNieuw };
}

/**
 * Sync ALL accounts van een user.
 */
export async function syncMailsVoorUser(userId: string, mailLimitPerMap = 50) {
  const admin = createAdminClient();

  const { data: accounts } = await admin
    .from("mail_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("mail_status", "actief");

  if (!accounts || accounts.length === 0) return { ok: true, nieuw: 0 };

  let totaal = 0;
  for (const a of accounts) {
    const r = await syncMailsVoorAccount(a.id, mailLimitPerMap);
    if (r.ok) totaal += r.nieuw ?? 0;
  }

  return { ok: true, nieuw: totaal };
}

/**
 * Laad de body van een specifiek mail-bericht uit IMAP, sla op in Supabase.
 */
export async function laadMailBody(accountId: string, mapPad: string, uid: number) {
  const admin = createAdminClient();

  const { data: bestaand } = await admin
    .from("mail_berichten")
    .select("body_loaded, html, tekst")
    .eq("account_id", accountId)
    .eq("map_pad", mapPad)
    .eq("uid", uid)
    .single();

  if (bestaand?.body_loaded) {
    return { html: bestaand.html, tekst: bestaand.tekst };
  }

  const { data: account } = await admin
    .from("mail_accounts")
    .select("mail_adres, mail_wachtwoord, imap_host, imap_port, user_id")
    .eq("id", accountId)
    .single();

  if (!account?.mail_adres || !account.mail_wachtwoord) {
    return { error: "Account niet geconfigureerd" };
  }

  const servers2 = getMailServers(account.mail_adres);
  const client = new ImapFlow({
    host: account.imap_host ?? servers2.imapHost,
    port: account.imap_port ?? servers2.imapPort,
    secure: true,
    auth: { user: account.mail_adres, pass: decrypt(account.mail_wachtwoord) },
    logger: false,
  });

  let html: string | null = null;
  let tekst: string | null = null;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(mapPad);
    try {
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (msg && msg.source) {
        const parsed = await simpleParser(msg.source);
        html = parsed.html || null;
        tekst = parsed.text || null;
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  await admin
    .from("mail_berichten")
    .update({
      html,
      tekst,
      gelezen: true,
      body_loaded: true,
    })
    .eq("account_id", accountId)
    .eq("map_pad", mapPad)
    .eq("uid", uid);

  return { html, tekst };
}
