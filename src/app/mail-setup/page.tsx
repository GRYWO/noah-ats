import { TopBar } from "@/components/TopBar";
import { Mail, Inbox, Send, Key, Globe, CheckCircle2 } from "lucide-react";
import { KopieerKnop } from "./KopieerKnop";

export const metadata = {
  title: "Mail-setup · Noah ATS",
};

const IMAP_HOST = "imap.migadu.com";
const IMAP_POORT = "993";
const SMTP_HOST = "smtp.migadu.com";
const SMTP_POORT = "465";

export default function MailSetupPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="mail-setup" />
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
          <Mail size={28} className="text-[#333399]" />
          Mail instellen in een externe app
        </h1>
        <p className="text-gray-600 mb-8">
          Wil je je @noah-recruitment.nl-mailbox naast Noah-ATS ook gebruiken in Outlook,
          Apple Mail of je telefoon? Hieronder vind je alle instellingen.
        </p>

        {/* Tip — gewoon Noah gebruiken */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-sm text-emerald-900">
            <b>Tip:</b> als je je mail alleen in Noah-ATS gebruikt, hoef je
            helemaal niks in te stellen. Je mailbox staat al automatisch
            gekoppeld onder{" "}
            <a href="/inbox" className="underline font-semibold">E-mail</a>.
          </div>
        </div>

        {/* Inkomend */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Inbox size={20} className="text-[#333399]" />
            Inkomende mail (IMAP)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <Veld label="Server" waarde={IMAP_HOST} />
            <Veld label="Poort" waarde={IMAP_POORT} />
            <Veld label="Encryptie" waarde="SSL/TLS" />
            <Veld label="Verificatie" waarde="Normaal wachtwoord" />
          </div>
        </section>

        {/* Uitgaand */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Send size={20} className="text-[#333399]" />
            Uitgaande mail (SMTP)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <Veld label="Server" waarde={SMTP_HOST} />
            <Veld label="Poort" waarde={SMTP_POORT} />
            <Veld label="Encryptie" waarde="SSL/TLS" />
            <Veld label="Verificatie" waarde="Normaal wachtwoord" />
          </div>
        </section>

        {/* Inloggen */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Key size={20} className="text-[#333399]" />
            Inloggegevens
          </h2>
          <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
            <li>
              <b>Gebruikersnaam:</b> je volledige @noah-recruitment.nl-adres
              (bv. <code className="bg-gray-100 px-1.5 py-0.5 rounded">voornaam@noah-recruitment.nl</code>)
            </li>
            <li>
              <b>Wachtwoord:</b> je Migadu-wachtwoord. Dit is hetzelfde
              wachtwoord waarmee je inlogt op Noah-ATS.
            </li>
            <li className="text-xs text-gray-500 italic">
              Wachtwoord vergeten? Vraag Yorith om 'm te resetten.
            </li>
          </ul>
        </section>

        {/* Webmail */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Globe size={20} className="text-[#333399]" />
            Liever niks instellen?
          </h2>
          <p className="text-sm text-gray-700 mb-4">
            Gebruik dan de webmail — werkt overal, geen instellingen nodig:
          </p>
          <a
            href="https://webmail.migadu.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#333399] hover:bg-[#252573] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
          >
            webmail.migadu.com →
          </a>
        </section>

        {/* Kopieer-blok om door te sturen */}
        <section className="bg-gray-900 rounded-2xl p-6 text-white">
          <h2 className="text-base font-bold mb-3">
            Doorsturen naar iemand?
          </h2>
          <p className="text-sm text-gray-300 mb-4">
            Kopieer onderstaande tekst en plak 'm in WhatsApp of een mail:
          </p>
          <KopieerKnop
            tekst={`Hoi,

Je @noah-recruitment.nl-mailbox is gehost bij Migadu. Pas je mailprogramma als volgt aan:

📥 INKOMEND (IMAP)
   Server:    imap.migadu.com
   Poort:     993
   Encryptie: SSL/TLS

📤 UITGAAND (SMTP)
   Server:    smtp.migadu.com
   Poort:     465
   Encryptie: SSL/TLS

🔑 INLOGGEN
   Gebruikersnaam: je volledige @noah-recruitment.nl-adres
   Wachtwoord:     je Migadu-wachtwoord (krijg je apart)

Webmail (geen instellingen nodig):
   https://webmail.migadu.com

Vragen? App me even.`}
          />
        </section>
      </div>
    </main>
  );
}

function Veld({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm text-gray-900">
        {waarde}
      </div>
    </div>
  );
}
