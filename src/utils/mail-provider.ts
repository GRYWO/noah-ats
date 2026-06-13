/**
 * Bepaalt IMAP/SMTP servers op basis van het mailadres.
 *
 * @grywo.nl en @noah-recruitment.nl → Migadu (sinds verhuizing van Hostnet)
 * Alle andere → Hostnet (legacy default)
 */

type MailServers = {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
};

const MIGADU: MailServers = {
  imapHost: "imap.migadu.com",
  imapPort: 993,
  smtpHost: "smtp.migadu.com",
  smtpPort: 465,
  smtpSecure: true,
};

const HOSTNET: MailServers = {
  imapHost: process.env.HOSTNET_IMAP_HOST ?? "imap.hostnet.nl",
  imapPort: 993,
  smtpHost: process.env.HOSTNET_SMTP_HOST ?? "smtp.hostnet.nl",
  smtpPort: 465,
  smtpSecure: true,
};

const MIGADU_DOMAINS = ["grywo.nl", "noah-recruitment.nl"] as const;

export function getMailServers(mailAdres: string | null | undefined): MailServers {
  if (mailAdres) {
    const lower = mailAdres.toLowerCase();
    if (MIGADU_DOMAINS.some((domain) => lower.endsWith(`@${domain}`))) {
      return MIGADU;
    }
  }
  return HOSTNET;
}
