import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { decrypt } from "./crypto";
import { getMailServers } from "./mail-provider";

function getLogoAttachment() {
  try {
    const logoPath = path.join(process.cwd(), "public", "grywo-logo.png");
    if (!fs.existsSync(logoPath)) return null;
    return {
      filename: "grywo-logo.png",
      path: logoPath,
      cid: "grywo-logo",
      contentDisposition: "inline" as const,
    };
  } catch {
    return null;
  }
}

export type InboxBericht = {
  uid: number;
  van: string;
  naam: string;
  onderwerp: string;
  datum: string;
  preview: string;
  gelezen: boolean;
};

export type MailMap = {
  pad: string;            // IMAP path
  label: string;          // mens-leesbaar
  aantal: number;
  ongelezen: number;
  type: "inbox" | "sent" | "drafts" | "trash" | "spam" | "ander";
};

const MAP_TYPES: Record<string, MailMap["type"]> = {
  "\\Inbox": "inbox",
  "\\Sent": "sent",
  "\\Drafts": "drafts",
  "\\Trash": "trash",
  "\\Junk": "spam",
};

const MAP_LABELS: Record<MailMap["type"], string> = {
  inbox: "Postvak IN",
  sent: "Verzonden",
  drafts: "Concepten",
  trash: "Prullenbak",
  spam: "Spam",
  ander: "Overig",
};

/**
 * Haal in 1 IMAP-sessie alles op: mappen, berichten van huidige map, en optioneel mail detail.
 * Bespaart 2-3 connect/disconnect cycles → ~1.5 sec sneller.
 */
export async function fetchAllInboxData({
  mailAdres,
  encryptedPassword,
  mapPad,
  uid,
  limit = 30,
}: {
  mailAdres: string;
  encryptedPassword: string;
  mapPad: string;
  uid?: number;
  limit?: number;
}): Promise<{ mappen: MailMap[]; berichten: InboxBericht[]; mail: MailDetail | null }> {
  const client = getImapClient(mailAdres, encryptedPassword);
  await client.connect();

  const mappen: MailMap[] = [];
  const berichten: InboxBericht[] = [];
  let mail: MailDetail | null = null;

  try {
    // 1. Mappen ophalen
    const list = await client.list();
    for (const m of list) {
      if (m.flags?.has("\\Noselect")) continue;

      let type: MailMap["type"] = "ander";
      for (const flag of Array.from(m.specialUse ? [m.specialUse] : [])) {
        if (MAP_TYPES[flag]) type = MAP_TYPES[flag];
      }
      const naamLower = m.path.toLowerCase();
      if (type === "ander") {
        if (naamLower === "inbox") type = "inbox";
        else if (naamLower.includes("sent") || naamLower.includes("verzonden")) type = "sent";
        else if (naamLower.includes("draft") || naamLower.includes("concept")) type = "drafts";
        else if (naamLower.includes("trash") || naamLower.includes("prullen")) type = "trash";
        else if (naamLower.includes("junk") || naamLower.includes("spam")) type = "spam";
      }

      const status = await client.status(m.path, { messages: true, unseen: true });
      mappen.push({
        pad: m.path,
        label: type === "ander" ? m.name : MAP_LABELS[type],
        aantal: status.messages ?? 0,
        ongelezen: status.unseen ?? 0,
        type,
      });
    }

    const volgorde: Record<MailMap["type"], number> = {
      inbox: 1, sent: 2, drafts: 3, spam: 4, trash: 5, ander: 6,
    };
    mappen.sort((a, b) => volgorde[a.type] - volgorde[b.type] || a.label.localeCompare(b.label));

    // 2. Inbox van huidige map ophalen
    const lock = await client.getMailboxLock(mapPad);
    try {
      const mailbox = client.mailbox as { exists: number };
      const totaal = mailbox.exists;
      if (totaal > 0) {
        const start = Math.max(1, totaal - limit + 1);
        const end = totaal;
        for await (const msg of client.fetch(`${start}:${end}`, {
          envelope: true,
          flags: true,
          internalDate: true,
        })) {
          const env = msg.envelope;
          const van = env?.from?.[0];
          const datum = msg.internalDate
            ? new Date(msg.internalDate).toISOString()
            : env?.date?.toISOString() ?? new Date().toISOString();
          berichten.push({
            uid: msg.uid,
            van: van?.address ?? "?",
            naam: van?.name ?? van?.address ?? "?",
            onderwerp: env?.subject ?? "(geen onderwerp)",
            datum,
            preview: "",
            gelezen: msg.flags?.has("\\Seen") ?? false,
          });
        }
        berichten.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
      }

      // 3. Optioneel: mail detail
      if (uid) {
        const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
        if (msg && msg.source) {
          const parsed: ParsedMail = await simpleParser(msg.source);
          await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
          mail = {
            uid,
            van: (parsed.from?.value?.[0]?.address ?? "?"),
            naar: typeof parsed.to === "object" && !Array.isArray(parsed.to) ? (parsed.to?.value?.[0]?.address ?? "?") : "?",
            onderwerp: parsed.subject ?? "(geen onderwerp)",
            datum: parsed.date?.toISOString() ?? new Date().toISOString(),
            html: parsed.html || null,
            tekst: parsed.text || null,
          };
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { mappen, berichten, mail };
}

export async function fetchMappen(
  mailAdres: string,
  encryptedPassword: string,
): Promise<MailMap[]> {
  const client = getImapClient(mailAdres, encryptedPassword);
  await client.connect();

  const mappen: MailMap[] = [];

  try {
    const list = await client.list();
    for (const m of list) {
      if (m.flags?.has("\\Noselect")) continue;

      let type: MailMap["type"] = "ander";
      for (const flag of Array.from(m.specialUse ? [m.specialUse] : [])) {
        if (MAP_TYPES[flag]) type = MAP_TYPES[flag];
      }
      // Fallback: check naam
      const naamLower = m.path.toLowerCase();
      if (type === "ander") {
        if (naamLower === "inbox") type = "inbox";
        else if (naamLower.includes("sent") || naamLower.includes("verzonden")) type = "sent";
        else if (naamLower.includes("draft") || naamLower.includes("concept")) type = "drafts";
        else if (naamLower.includes("trash") || naamLower.includes("prullen")) type = "trash";
        else if (naamLower.includes("junk") || naamLower.includes("spam")) type = "spam";
      }

      const status = await client.status(m.path, { messages: true, unseen: true });
      mappen.push({
        pad: m.path,
        label: type === "ander" ? m.name : MAP_LABELS[type],
        aantal: status.messages ?? 0,
        ongelezen: status.unseen ?? 0,
        type,
      });
    }
  } finally {
    await client.logout();
  }

  // Sorteer: inbox, sent, drafts, spam, trash, ander
  const volgorde: Record<MailMap["type"], number> = {
    inbox: 1, sent: 2, drafts: 3, spam: 4, trash: 5, ander: 6,
  };
  return mappen.sort((a, b) => volgorde[a.type] - volgorde[b.type] || a.label.localeCompare(b.label));
}

export type MailDetail = {
  uid: number;
  van: string;
  naar: string;
  onderwerp: string;
  datum: string;
  html: string | null;
  tekst: string | null;
  gevlagd?: boolean;
};

function getImapClient(mailAdres: string, encryptedPassword: string) {
  const password = decrypt(encryptedPassword);
  // Route op basis van mailadres: @noah-recruitment.nl → Migadu, rest → Hostnet
  const servers = getMailServers(mailAdres);
  return new ImapFlow({
    host: servers.imapHost,
    port: servers.imapPort,
    secure: true,
    auth: { user: mailAdres, pass: password },
    logger: false,
  });
}

export async function fetchInbox(
  mailAdres: string,
  encryptedPassword: string,
  limit = 30,
  mapPad = "INBOX",
): Promise<InboxBericht[]> {
  const client = getImapClient(mailAdres, encryptedPassword);
  await client.connect();
  const lock = await client.getMailboxLock(mapPad);
  const berichten: InboxBericht[] = [];

  try {
    const mailbox = client.mailbox as { exists: number };
    const totaal = mailbox.exists;
    if (totaal === 0) return [];

    const start = Math.max(1, totaal - limit + 1);
    const end = totaal;

    for await (const msg of client.fetch(`${start}:${end}`, {
      envelope: true,
      flags: true,
      internalDate: true,
      bodyStructure: false,
      source: false,
    })) {
      const env = msg.envelope;
      const van = env?.from?.[0];
      // internalDate is wanneer mailserver de mail ontving — meest betrouwbaar voor sorteren
      const datum = msg.internalDate
        ? new Date(msg.internalDate).toISOString()
        : env?.date?.toISOString() ?? new Date().toISOString();
      berichten.push({
        uid: msg.uid,
        van: van?.address ?? "?",
        naam: van?.name ?? van?.address ?? "?",
        onderwerp: env?.subject ?? "(geen onderwerp)",
        datum,
        preview: "",
        gelezen: msg.flags?.has("\\Seen") ?? false,
      });
    }
  } finally {
    lock.release();
    await client.logout();
  }

  // Recentste eerst
  return berichten.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
}

export async function fetchMailDetail(
  mailAdres: string,
  encryptedPassword: string,
  uid: number,
  mapPad = "INBOX",
): Promise<MailDetail | null> {
  const client = getImapClient(mailAdres, encryptedPassword);
  await client.connect();
  const lock = await client.getMailboxLock(mapPad);

  try {
    const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
    if (!msg || !msg.source) return null;

    const parsed: ParsedMail = await simpleParser(msg.source);
    // Markeer als gelezen
    await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });

    return {
      uid,
      van: (parsed.from?.value?.[0]?.address ?? "?"),
      naar: typeof parsed.to === "object" && !Array.isArray(parsed.to) ? (parsed.to?.value?.[0]?.address ?? "?") : "?",
      onderwerp: parsed.subject ?? "(geen onderwerp)",
      datum: parsed.date?.toISOString() ?? new Date().toISOString(),
      html: parsed.html || null,
      tekst: parsed.text || null,
    };
  } finally {
    lock.release();
    await client.logout();
  }
}

export async function verstuurMail({
  vanAdres,
  vanWachtwoord,
  vanVoornaam,
  vanBureau,
  naar,
  onderwerp,
  htmlBody,
  handtekening,
  appendHandtekening = true,
}: {
  vanAdres: string;
  vanWachtwoord: string;  // encrypted
  vanVoornaam: string;
  vanBureau: string;
  naar: string;
  onderwerp: string;
  // Volledige HTML-body. Kan zelf de handtekening al bevatten
  // (zie appendHandtekening). Backward compatible met legacy callers die
  // hier een aaneengeplakte plain-text-met-<br>-string doorgeven.
  htmlBody: string;
  handtekening: string | null;
  // Optioneel: zet op false als de aanroeper de handtekening al in htmlBody
  // heeft staan (bijvoorbeeld vanuit de compose-editor). Default true voor
  // backward-compat met systeem-mails die de handtekening apart meegeven.
  appendHandtekening?: boolean;
}) {
  const servers = getMailServers(vanAdres);
  const transporter = nodemailer.createTransport({
    host: servers.smtpHost,
    port: servers.smtpPort,
    secure: servers.smtpSecure,
    auth: { user: vanAdres, pass: decrypt(vanWachtwoord) },
  });

  // Veiligheidsnet: als de body al een data-handtekening="ja"-blok bevat,
  // forceer appendHandtekening uit — anders krijg je een dubbele handtekening.
  const bevatHandtekeningMarker =
    typeof htmlBody === "string" && /data-handtekening=("|')ja("|')/i.test(htmlBody);
  const voegToe = appendHandtekening && handtekening && !bevatHandtekeningMarker;

  const fullBody = `<div>${htmlBody}</div>${voegToe ? `<br><br>${handtekening}` : ""}`;
  const displayName = `${vanVoornaam} | ${vanBureau}`;

  const tekstFallback = fullBody
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return transporter.sendMail({
    from: `"${displayName}" <${vanAdres}>`,
    to: naar,
    subject: onderwerp,
    html: fullBody,
    text: tekstFallback,
  });
}
