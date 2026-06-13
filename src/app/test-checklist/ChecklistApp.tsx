"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Check, X, RotateCcw, ChevronRight } from "lucide-react";

type Test = {
  id: string;
  titel: string;
  instructie: string;
  pad?: string; // optionele directe link
};

type Categorie = { naam: string; tests: Test[] };

const CHECKLIST: Categorie[] = [
  {
    naam: "1. Setup",
    tests: [
      { id: "wis", titel: "Wis test-data", instructie: "Ga naar /bureaus → rode knop 'Wis alle test-data' → typ WIS → groene melding?", pad: "/bureaus" },
      { id: "bucket", titel: "Storage bucket aanmaken", instructie: "Supabase → Storage → New bucket 'bureau-documenten' → private. Aangemaakt?" },
      { id: "login", titel: "Super-admin inloggen", instructie: "Log in als Yorith → zie je het volledige Noah recruitment-dashboard (niet bureau-versie)?", pad: "/dashboard" },
    ],
  },
  {
    naam: "2. Bureau aanmaken",
    tests: [
      { id: "nieuw", titel: "Nieuw bureau toevoegen", instructie: "/bureaus → 'Nieuw bureau toevoegen' → vul bedrijf + contactpersoon + email in. Verschijnt het in de lijst?", pad: "/bureaus" },
      { id: "welkomstmail", titel: "Welkomstmail komt aan", instructie: "Check inbox van de contact-email. Mail met paarse 'Open je dashboard' knop + 4-stappen-lijst?" },
      { id: "bureau-login", titel: "Bureau-admin inloggen", instructie: "Log in met die inloggegevens. Zie je het simpele bureau-dashboard (KPI's, bedrijfsgegevens, documenten, noodnummer)?", pad: "/dashboard" },
    ],
  },
  {
    naam: "3. Bureau-admin flow",
    tests: [
      { id: "bedrijfsgegevens", titel: "Bedrijfsgegevens opslaan", instructie: "Op dashboard: vul contactpersoon/telefoon/adres in → Opslaan. Blijft staan na refresh?", pad: "/dashboard" },
      { id: "recruiter-toevoegen", titel: "Recruiter toevoegen", instructie: "/setters → Nieuwe user toevoegen. Zie je alleen 'Recruiter' als rol (geen dropdown)?", pad: "/users" },
      { id: "recruiter-mail", titel: "Recruiter krijgt welkomstmail", instructie: "Check inbox van die recruiter. Welkomstmail met inloggegevens?" },
    ],
  },
  {
    naam: "4. Recruiter flow",
    tests: [
      { id: "recruiter-login", titel: "Recruiter inloggen", instructie: "Log in met de recruiter-account. Zie je kandidaten/kanban/instellingen in menu?", pad: "/dashboard" },
      { id: "kandidaat", titel: "Kandidaat aanmaken + CV upload", instructie: "/kandidaten/nieuw → vul gegevens in + upload PDF-CV. Kandidaat verschijnt in lijst?", pad: "/kandidaten/nieuw" },
      { id: "ai-cv", titel: "AI leest CV", instructie: "Open de kandidaat → klik 'CV laten lezen door AI'. Worden velden automatisch gevuld + verschijnen rode vlaggen + score?" },
      { id: "intake", titel: "Intake-formulier", instructie: "Vul de intake in, beantwoord alle rode vlaggen, klik 'Verzenden & profielschets genereren'. Verschijnt de schets-pagina?" },
      { id: "schets", titel: "Profielschets goedkeuren", instructie: "Pas eventueel de schets aan → 'Goedkeuren & doorzetten'. Schuift kandidaat door naar 'in wachtrij'/'bij setter'?" },
    ],
  },
  {
    naam: "5. Setter flow (Noah recruitment-pool)",
    tests: [
      { id: "auto-toewijzing", titel: "Auto-toewijzing", instructie: "De kandidaat krijgt automatisch een Noah recruitment-setter toegewezen. Check op kanban dat hij bij 'bij_setter' staat." },
      { id: "setter-login", titel: "Setter inloggen", instructie: "Log in als een Noah recruitment-setter. Zie je de kandidaat in /kandidaten?", pad: "/kandidaten" },
      { id: "bellijst", titel: "Bellijst uploaden", instructie: "Open de kandidaat → upload Jobdigger-Excel. Kandidaat schuift door naar 'in proces' + mail komt aan?" },
    ],
  },
  {
    naam: "6. Voorstel & plaatsing",
    tests: [
      { id: "voorstel", titel: "Voorstel verzenden", instructie: "Bij de kandidaat: voorstel verzenden naar test-email (jezelf). Mail aankomen?" },
      { id: "voorstelprofiel", titel: "Voorstelprofiel", instructie: "Klik in de mail op 'Bekijk voorstelprofiel'. Pagina toont Noah recruitment-logo + functie/woonplaats/voornaam + setter-email onderaan?" },
      { id: "uitnodigen", titel: "Uitnodigen + kennismaking", instructie: "Op het voorstel: klik 'Uitnodigen' → vul kennismaking-datum in. Krijgt kandidaat afspraakbevestiging-mail?" },
      { id: "plaatsing", titel: "Plaatsing", instructie: "Status naar 'geplaatst' → plaatsings-modal vullen (basis, tarief, startdatum). Backoffice-mail aangekomen op backoffice@noah-recruitment.nl?" },
    ],
  },
  {
    naam: "7. Coaching & agenda",
    tests: [
      { id: "eod", titel: "EOD-rapport", instructie: "Log in als setter → /coaching → vul alle 12 vragen in → verzenden. Verschijnt het in geschiedenis?", pad: "/coaching" },
      { id: "doelen", titel: "Doelen aanpassen", instructie: "Op /coaching → 'Doelen aanpassen' → wijzig targets → opslaan. Updaten de progress-bars?", pad: "/coaching" },
      { id: "leaderboard", titel: "Leaderboard", instructie: "Als admin/coach: filter setters via dropdown. Zie je top-10 met week/maand/jaar tabs?", pad: "/coaching" },
      { id: "agenda", titel: "Agenda", instructie: "/agenda → toont 1e gesprek + eerste werkdag van plaatsing? Admin ziet 'Team-afspraak toevoegen' knop?", pad: "/agenda" },
    ],
  },
  {
    naam: "8. Extra checks",
    tests: [
      { id: "reset-setters", titel: "Wachtwoord reset", instructie: "/setters → klik 'Wachtwoord resetten' bij een user. Mail komt aan met nieuw wachtwoord?", pad: "/users" },
      { id: "reset-bureau", titel: "Inloggegevens bureau", instructie: "/bureaus → bij bureau zonder admin: 'Inloggegevens sturen'. Mail komt aan?", pad: "/bureaus" },
      { id: "notificatie", titel: "Notificatie + pieptoon", instructie: "Stuur een setter-reactie of help-vraag. Krijgt de ontvanger een melding in de bel met pieptoon?" },
    ],
  },
];

type Status = "open" | "ok" | "fout";

type Voortgang = Record<string, { status: Status; opmerking?: string }>;

const KEY = "noah-test-checklist";

export function ChecklistApp() {
  const [voortgang, setVoortgang] = useState<Voortgang>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setVoortgang(JSON.parse(raw));
    } catch {}
  }, []);

  function update(id: string, patch: Partial<Voortgang[string]>) {
    setVoortgang(prev => {
      const next = { ...prev, [id]: { ...prev[id], status: prev[id]?.status ?? "open", ...patch } };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function reset() {
    if (!confirm("Alle voortgang wissen?")) return;
    try { localStorage.removeItem(KEY); } catch {}
    setVoortgang({});
  }

  const totaal = CHECKLIST.reduce((s, c) => s + c.tests.length, 0);
  const ok = Object.values(voortgang).filter(v => v.status === "ok").length;
  const fout = Object.values(voortgang).filter(v => v.status === "fout").length;

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
            <ClipboardCheck size={22} /> Test-checklist
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Loop alles door — vink groen aan als het werkt of rood als het breekt. Voortgang wordt lokaal bewaard.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-red-600"
        >
          <RotateCcw size={14} /> Reset alles
        </button>
      </div>

      {/* Voortgang */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-gray-800">{ok}/{totaal}</span>
          <span className="text-emerald-700">✓ {ok} werkt</span>
          <span className="text-red-700">✗ {fout} fout</span>
          <span className="text-gray-500">○ {totaal - ok - fout} nog te doen</span>
        </div>
        <div className="flex-1 max-w-md bg-gray-100 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(ok / totaal) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-6">
        {CHECKLIST.map((cat) => (
          <section key={cat.naam}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{cat.naam}</h2>
            <div className="space-y-2">
              {cat.tests.map((t) => {
                const v = voortgang[t.id] ?? { status: "open" as Status };
                return (
                  <div
                    key={t.id}
                    className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${
                      v.status === "ok" ? "border-l-emerald-500" :
                      v.status === "fout" ? "border-l-red-500" :
                      "border-l-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 inline-flex items-center gap-2">
                          {t.titel}
                          {t.pad && (
                            <a href={t.pad} target="_blank" rel="noopener noreferrer" className="text-xs text-[#333399] hover:underline inline-flex items-center gap-1">
                              open <ChevronRight size={11} />
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{t.instructie}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => update(t.id, { status: "ok" })}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md ${
                            v.status === "ok"
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          <Check size={12} /> Werkt
                        </button>
                        <button
                          type="button"
                          onClick={() => update(t.id, { status: "fout" })}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md ${
                            v.status === "fout"
                              ? "bg-red-600 text-white"
                              : "bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          <X size={12} /> Fout
                        </button>
                      </div>
                    </div>
                    {v.status === "fout" && (
                      <textarea
                        value={v.opmerking ?? ""}
                        onChange={(e) => update(t.id, { opmerking: e.target.value })}
                        placeholder="Wat ging er fout? (deel dit met de ontwikkelaar)"
                        rows={2}
                        className="w-full mt-3 px-3 py-2 border border-red-200 bg-red-50/30 rounded-md text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
