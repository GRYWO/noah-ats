"use client";

import { useState, useTransition } from "react";
import { Send, Check, Loader2, AlertCircle, Mail } from "lucide-react";
import { verstuurTestMail } from "./actions";

type MailDef = {
  key: string;
  naam: string;
  uitleg: string;
  groep: string;
};

const MAILS: MailDef[] = [
  // Opdrachtgevers
  { groep: "Opdrachtgever", key: "voorstel",              naam: "Voorstel — nieuw",                uitleg: "Mail naar opdrachtgever met kandidaatprofiel + groen/rood/uitnodigen-knoppen" },
  { groep: "Opdrachtgever", key: "reminder",              naam: "Voorstel — reminder",             uitleg: "Herinnering aan opdrachtgever als er nog niet is gereageerd" },

  // Kandidaten
  { groep: "Kandidaat",    key: "kandidaat_voorgesteld",  naam: "Voorgesteld",                     uitleg: "Mail aan kandidaat dat hij/zij is voorgesteld bij een opdrachtgever" },
  { groep: "Kandidaat",    key: "intake_afgerond",        naam: "Intake afgerond",                 uitleg: "Mail aan kandidaat zodra de intake-wizard is voltooid" },
  { groep: "Kandidaat",    key: "in_proces_gestart",      naam: "We zijn voor je gestart",         uitleg: "Mail aan kandidaat wanneer setter-traject start" },
  { groep: "Kandidaat",    key: "bevestiging",            naam: "Kennismaking gepland",            uitleg: "Bevestiging aan kandidaat met datum + contact + locatie" },
  { groep: "Kandidaat",    key: "gesprek1_bevestiging",   naam: "1e gesprek bevestiging",          uitleg: "Bevestiging eerste gesprek" },
  { groep: "Kandidaat",    key: "gesprek2_succes",        naam: "2e gesprek (gefeliciteerd)",      uitleg: "Mail na succesvol 2e gesprek" },
  { groep: "Kandidaat",    key: "kennismaking_reminder",  naam: "Kennismaking reminder (30 min)",  uitleg: "30-min voor kennismaking automatisch verzonden" },
  { groep: "Kandidaat",    key: "kandidaat_plaatsing",    naam: "Geplaatst!",                      uitleg: "Mail aan kandidaat dat de plaatsing rond is" },
  { groep: "Kandidaat",    key: "kandidaat_afwijzing",    naam: "Afwijzing (na voorstel)",         uitleg: "Mail dat opdrachtgever niet door wil" },
  { groep: "Kandidaat",    key: "kandidaat_status_afwijzing", naam: "Talentpool / einde traject",  uitleg: "Mail bij status='afgewezen' — bewaarbericht voor talentpool" },
  { groep: "Kandidaat",    key: "cv_reminder",            naam: "CV-reminder (wachtend)",          uitleg: "Reminder aan kandidaat om CV alsnog te sturen" },

  // Account / inloggen
  { groep: "Account",      key: "welkom_user",            naam: "Welkomstmail user",               uitleg: "Bij nieuwe recruiter/setter/admin aanmaak — met inloggegevens" },
  { groep: "Account",      key: "welkom_bureau",          naam: "Welkomstmail bureau",             uitleg: "Bij nieuw bureau-aanmelding — admin krijgt inloggegevens + 4-stappen-lijst" },
  { groep: "Account",      key: "inloggegevens_opnieuw",  naam: "Wachtwoord-reset (admin)",        uitleg: "Admin reset wachtwoord van user — krijgt nieuwe inloggegevens" },

  // Intern (backoffice)
  { groep: "Intern",       key: "plaatsing_backoffice",   naam: "Plaatsing → backoffice",          uitleg: "Auto-mail naar backoffice@grywo.nl bij plaatsing-aanmelding" },
  { groep: "Intern",       key: "plaatsing_afgekeurd",    naam: "Plaatsing afgekeurd → backoffice", uitleg: "Wanneer admin een eerder aangemelde plaatsing afkeurt" },
  { groep: "Intern",       key: "help_yorith",            naam: "Help-vraag naar Yorith",          uitleg: "Bij 'Hulp nodig?' knop in app — mailt naar Yorith" },
];

const GROEP_KLEUREN: Record<string, string> = {
  Opdrachtgever: "bg-blue-50 border-blue-200 text-blue-800",
  Kandidaat:     "bg-emerald-50 border-emerald-200 text-emerald-800",
  Account:       "bg-amber-50 border-amber-200 text-amber-800",
  Intern:        "bg-purple-50 border-purple-200 text-purple-800",
};

export function TestMailsApp() {
  const [verzonden, setVerzonden] = useState<Set<string>>(new Set());
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<{ key: string; msg: string } | null>(null);
  const [, startTransition] = useTransition();

  function verstuur(key: string) {
    setBezig(key);
    setFout(null);
    startTransition(async () => {
      const r = await verstuurTestMail(key);
      setBezig(null);
      if (r.error) {
        setFout({ key, msg: r.error });
        return;
      }
      setVerzonden((s) => new Set([...s, key]));
      // Auto-reset na 5 sec zodat je weer kunt verzenden
      setTimeout(() => {
        setVerzonden((s) => {
          const n = new Set(s);
          n.delete(key);
          return n;
        });
      }, 5000);
    });
  }

  const groepen = Array.from(new Set(MAILS.map((m) => m.groep)));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 inline-flex items-center gap-2">
            <Mail size={24} /> Mail-test-pagina
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Verstuur elk type mail met dummy-data naar <b>yorith@grywo.nl</b>.
          </p>
        </div>
        <div className="text-xs text-gray-400 bg-white border border-gray-200 rounded-md px-3 py-2">
          Alleen super-admin (Yorith) — niet zichtbaar voor anderen.
        </div>
      </div>

      <div className="space-y-6">
        {groepen.map((groep) => (
          <section key={groep}>
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-3 py-1 rounded inline-block ${GROEP_KLEUREN[groep] ?? "bg-gray-100 text-gray-700"}`}>
              {groep}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MAILS.filter((m) => m.groep === groep).map((m) => {
                const isVerzonden = verzonden.has(m.key);
                const isBezig = bezig === m.key;
                const heeftFout = fout?.key === m.key;
                return (
                  <div
                    key={m.key}
                    className={`bg-white rounded-xl shadow-sm border p-4 ${heeftFout ? "border-red-300" : isVerzonden ? "border-emerald-300" : "border-gray-200"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-800 text-sm">{m.naam}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{m.uitleg}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => verstuur(m.key)}
                        disabled={isBezig || isVerzonden}
                        className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md ${
                          isVerzonden
                            ? "bg-emerald-500 text-white"
                            : isBezig
                            ? "bg-gray-100 text-gray-500"
                            : "bg-[#333399] hover:bg-[#2a2a80] text-white"
                        } disabled:cursor-not-allowed`}
                      >
                        {isBezig ? <Loader2 size={12} className="animate-spin" /> :
                         isVerzonden ? <Check size={12} /> :
                         <Send size={12} />}
                        {isVerzonden ? "Verzonden" : isBezig ? "Bezig..." : "Verstuur"}
                      </button>
                    </div>
                    {heeftFout && (
                      <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 inline-flex items-start gap-1.5">
                        <AlertCircle size={11} className="mt-0.5 shrink-0" />
                        <span>{fout?.msg}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs">
        <b>Let op:</b> deze pagina is voor testen. De mails gebruiken dummy-data
        (Pieter de Vries, Acme B.V., test-token-12345). Alle mails worden afgeleverd
        op <b>yorith@grywo.nl</b> — pas hier <code>NAAR</code> in <code>actions.ts</code>
        aan om naar een ander adres te sturen.
      </div>
    </div>
  );
}
