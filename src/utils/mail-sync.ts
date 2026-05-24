import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { decrypt } from "./crypto";
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
 * Sync nieuwe mails uit IMAP naar Supabase voor een specifieke user.
 * Per map: pakt nieuwste mails op tot een limit, slaat alleen onbekende UIDs op.
 */
export async function syncMailsVoorUser(userId: string, mailLimitPerMap = 50) {
  const admin = createAdminClient();

  // Haal mail-config op
  const { data: profile } = await admin
    .from("profiles")
    .select("mail_adres, mail_wachtwoord")
    .eq("id", userId)
    .single();

  if (!profile?.mail_adres || !profile.mail_wachtwoord) {
    return { error: "Mailbox niet geconfigureerd" };
  }

  const client = new ImapFlow({
    host: process.env.HOSTNET_IMAP_HOST ?? "imap.hostnet.nl",
    port: parseInt(process.env.HOSTNET_IMAP_PORT ?? "993"),
    secure: true,
    auth: { user: profile.mail_adres, pass: decrypt(profile.mail_wachtwoord) },
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

      // Status ophalen voor counts
      const status = await client.status(mapInfo.path, { messages: true, unseen: true });

      // Map upserten in Supabase
      await admin.from("mail_mappen").upsert({
        user_id: userId,
        pad: mapInfo.path,
        label,
        type,
        aantal: status.messages ?? 0,
        ongelezen: status.unseen ?? 0,
        last_sync: new Date().toISOString(),
      }, { onConflict: "user_id,pad" });

      // Open mailbox en haal recente UIDs
      const lock = await client.getMailboxLock(mapInfo.path);
      try {
        const mailbox = client.mailbox as { exists: number };
        const totaal = mailbox.exists;
        if (totaal === 0) continue;

        const start = Math.max(1, totaal - mailLimitPerMap + 1);
        const end = totaal;

        // Haal alle bestaande UIDs voor deze map op
        const { data: bestaand } = await admin
          .from("mail_berichten")
          .select("uid")
          .eq("user_id", userId)
          .eq("map_pad", mapInfo.path);

        const bestaandeUids = new Set((bestaand ?? []).map(b => b.uid));

        const nieuweBerichten: Array<{
          user_id: string;
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
            user_id: userId,
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

  return { ok: true, nieuw: totaalNieuw };
}

/**
 * Laad de body van een specifiek mail-bericht uit IMAP, sla op in Supabase.
 * Lazy loading: pas wanneer user de mail opent.
 */
export async function laadMailBody(userId: string, mapPad: string, uid: number) {
  const admin = createAdminClient();

  // Eerst checken of body al geladen is
  const { data: bestaand } = await admin
    .from("mail_berichten")
    .select("body_loaded, html, tekst")
    .eq("user_id", userId)
    .eq("map_pad", mapPad)
    .eq("uid", uid)
    .single();

  if (bestaand?.body_loaded) {
    return { html: bestaand.html, tekst: bestaand.tekst };
  }

  // Anders ophalen via IMAP
  const { data: profile } = await admin
    .from("profiles")
    .select("mail_adres, mail_wachtwoord")
    .eq("id", userId)
    .single();

  if (!profile?.mail_adres || !profile.mail_wachtwoord) {
    return { error: "Mailbox niet geconfigureerd" };
  }

  const client = new ImapFlow({
    host: process.env.HOSTNET_IMAP_HOST ?? "imap.hostnet.nl",
    port: parseInt(process.env.HOSTNET_IMAP_PORT ?? "993"),
    secure: true,
    auth: { user: profile.mail_adres, pass: decrypt(profile.mail_wachtwoord) },
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
        // Markeer als gelezen
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  // Sla op in Supabase
  await admin
    .from("mail_berichten")
    .update({
      html,
      tekst,
      gelezen: true,
      body_loaded: true,
    })
    .eq("user_id", userId)
    .eq("map_pad", mapPad)
    .eq("uid", uid);

  return { html, tekst };
}
