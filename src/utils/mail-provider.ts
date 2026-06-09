/**
 * Bepaalt IMAP/SMTP servers op basis van het mailadres.
 *
 * @grywo.nl → Migadu (sinds verhuizing van Hostnet)
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

export function getMailServers(mailAdres: string | null | undefined): MailServers {
  if (mailAdres && mailAdres.toLowerCase().endsWith("@grywo.nl")) {
    return MIGADU;
  }
  return HOSTNET;
}
