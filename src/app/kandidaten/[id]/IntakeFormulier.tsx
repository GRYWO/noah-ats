"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Sparkles, Loader2, Check, Sparkle, AlertTriangle, X, ThumbsDown } from "lucide-react";
import { verzendIntake, keurProfielschetsGoed, keurIntakeAf } from "./intake-formulier-actions";

type RodeVlag = {
  code: string;
  beschrijving: string;
  punten: number;
  vraag_aan_recruiter?: string;
  toelichting?: string;
};

type Geparseerd = {
  werkervaring?: string;
  vaardigheden?: string;
  talen?: string;
  rijbewijs?: string;
  eigen_vervoer?: boolean;
  rode_vlaggen?: RodeVlag[] | string[];
  ai_score?: number;
  ai_advies?: "goedkeuren" | "twijfel" | "afkeuren";
};

export type IntakeKandidaat = {
  id: string;
  voornaam: string | null;
  tussenvoegsel: string | null;
  achternaam: string | null;
  email: string | null;
  telefoon: string | null;
  geslacht: string | null;
  leeftijd: number | null;
  woonplaats: string | null;
  opleiding: string | null;
  open_voor: string | null;
  rijbewijs: string | null;
  eigen_vervoer: boolean | null;
  max_reisafstand_km: number | null;
  soort_dienstverband: string | null;
  werving_of_uitzend: string | null;
  salaris_indicatie: string | null;
  tarief_ws: string | null;
  bijzonderheden: string | null;
  blacklist_bedrijven: string | null;
  notitie: string | null;
  profielschets: string | null;
  cv_geparseerd: Geparseerd | null;
  cv_url: string | null;
};

export function IntakeFormulier({
  k,
  fase,
}: {
  k: IntakeKandidaat;
  fase: "vragenlijst" | "schets";
}) {
  if (fase === "schets") {
    return <SchetsEditor k={k} />;
  }
  return <Vragenlijst k={k} />;
}

function Vragenlijst({ k }: { k: IntakeKandidaat }) {
  const cv = k.cv_geparseerd ?? {};
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFout, setAiFout] = useState<string | null>(null);
  const [afkeurOpen, setAfkeurOpen] = useState(false);
  const router = useRouter();

  const vlaggenRaw = cv.rode_vlaggen ?? [];
  const vlaggen: RodeVlag[] = vlaggenRaw.map((v) =>
    typeof v === "string" ? { code: "overig", beschrijving: v, punten: -5 } : v
  );

  async function aiCvLezen() {
    if (!k.cv_url) {
      setAiFout("Eerst CV uploaden bovenaan deze pagina");
      return;
    }
    setAiLoading(true);
    setAiFout(null);
    try {
      const r = await fetch("/api/ai/parse-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kandidaat_id: k.id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) setAiFout(data.error ?? "AI-fout");
      else router.refresh();
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <form action={verzendIntake} className="space-y-5">
      <input type="hidden" name="id" value={k.id} />

      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-md p-4">
        <h3 className="font-bold text-amber-900 mb-1 inline-flex items-center gap-2">
          <Sparkle size={16} /> Interne intake
        </h3>
        <p className="text-xs text-amber-800">
          Controleer of alles klopt en vul aan waar de AI iets miste. Bij verzenden
          wordt automatisch een profielschets in 3e persoon gegenereerd die je daarna
          kunt aanpassen en goedkeuren.
        </p>
        {k.cv_url && (
          <button
            type="button"
            onClick={aiCvLezen}
            disabled={aiLoading}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-[#333399] hover:bg-[#2a2a80] text-white px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            CV laten lezen door AI (vult onderstaande velden)
          </button>
        )}
        {aiFout && <div className="mt-2 text-xs text-red-700">{aiFout}</div>}
      </div>

      {/* Persoonlijk */}
      <Card titel="Persoonlijk">
        <Row2>
          <Veld label="Voornaam *"><input name="voornaam" required defaultValue={k.voornaam ?? ""} className={input} /></Veld>
          <Veld label="Tussenvoegsel"><input name="tussenvoegsel" defaultValue={k.tussenvoegsel ?? ""} className={input} /></Veld>
          <Veld label="Achternaam *"><input name="achternaam" required defaultValue={k.achternaam ?? ""} className={input} /></Veld>
          <Veld label="E-mail"><input name="email" type="email" defaultValue={k.email ?? ""} className={input} /></Veld>
          <Veld label="Telefoon"><input name="telefoon" defaultValue={k.telefoon ?? ""} className={input} /></Veld>
          <Veld label="Geslacht">
            <select name="geslacht" defaultValue={k.geslacht ?? ""} className={input}>
              <option value="">—</option><option value="man">Man</option><option value="vrouw">Vrouw</option><option value="anders">Anders</option>
            </select>
          </Veld>
          <Veld label="Leeftijd"><input name="leeftijd" type="number" min="16" max="99" defaultValue={k.leeftijd ?? ""} className={input} /></Veld>
          <Veld label="Woonplaats"><input name="woonplaats" defaultValue={k.woonplaats ?? ""} className={input} /></Veld>
        </Row2>
      </Card>

      {/* Voorkeuren */}
      <Card titel="Werkvoorkeuren">
        <Row2>
          <Veld label="Open voor functies" fullWidth><input name="open_voor" defaultValue={k.open_voor ?? ""} placeholder="bv. Python Engineer, Sales Manager" className={input} /></Veld>
          <Veld label="Soort dienstverband">
            <select name="soort_dienstverband" defaultValue={k.soort_dienstverband ?? ""} className={input}>
              <option value="">—</option>
              <option value="fulltime">Fulltime</option>
              <option value="parttime">Parttime</option>
              <option value="flexibel">Flexibel</option>
            </select>
          </Veld>
          <Veld label="Werving & selectie / uitzend">
            <select name="werving_of_uitzend" defaultValue={k.werving_of_uitzend ?? ""} className={input}>
              <option value="">—</option>
              <option value="werving_selectie">Werving &amp; Selectie</option>
              <option value="uitzend">Uitzendbasis</option>
              <option value="beide">Beide</option>
            </select>
          </Veld>
          <Veld label="Salarisindicatie"><input name="salaris_indicatie" defaultValue={k.salaris_indicatie ?? ""} placeholder="bv. €3500 - €4200 bruto" className={input} /></Veld>
          <Veld label="Tarief W&S"><input name="tarief_ws" defaultValue={k.tarief_ws ?? ""} placeholder="bv. 15% bruto jaarsalaris" className={input} /></Veld>
          <Veld label="Max reisafstand (km)"><input name="max_reisafstand_km" type="number" min="0" max="500" defaultValue={k.max_reisafstand_km ?? ""} className={input} /></Veld>
          <Veld label="Blacklist bedrijven" fullWidth><input name="blacklist_bedrijven" defaultValue={k.blacklist_bedrijven ?? ""} placeholder="Komma-gescheiden bedrijfsnamen" className={input} /></Veld>
        </Row2>
      </Card>

      {/* CV-info (AI vult dit) */}
      <Card titel="CV & ervaring" badge="AI-extractie">
        <Veld label="Opleiding"><input name="opleiding" defaultValue={k.opleiding ?? ""} placeholder="bv. HBO Bedrijfskunde" className={input} /></Veld>
        <Veld label="Werkervaring">
          <textarea name="werkervaring" rows={4} defaultValue={cv.werkervaring ?? ""} placeholder="Kort overzicht van laatste functies en jaren" className={input} />
        </Veld>
        <Veld label="Vaardigheden">
          <textarea name="vaardigheden" rows={3} defaultValue={cv.vaardigheden ?? ""} placeholder="bv. Python, SQL, Klantcontact, Teamleiding" className={input} />
        </Veld>
        <Veld label="Talen"><input name="talen" defaultValue={cv.talen ?? ""} placeholder="bv. NL (moedertaal), EN (vloeiend)" className={input} /></Veld>
        <Row2>
          <Veld label="Rijbewijs"><input name="rijbewijs" defaultValue={k.rijbewijs ?? ""} placeholder="bv. Ja, B" className={input} /></Veld>
          <Veld label="">
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
              <input type="checkbox" name="eigen_vervoer" defaultChecked={k.eigen_vervoer ?? false} className="w-4 h-4 accent-[#333399]" />
              Eigen vervoer
            </label>
          </Veld>
        </Row2>
      </Card>

      <Card titel="Notities">
        <Veld label="Bijzonderheden">
          <textarea name="bijzonderheden" rows={3} defaultValue={k.bijzonderheden ?? ""} placeholder="Wat moet de setter zeker weten?" className={input} />
        </Veld>
        <Veld label="Interne notitie (niet voor opdrachtgever)">
          <textarea name="notitie" rows={2} defaultValue={k.notitie ?? ""} className={input} />
        </Veld>
      </Card>

      {/* Rode vlaggen — verplichte toelichting */}
      {vlaggen.length > 0 && (
        <Card titel="Rode vlaggen — toelichting verplicht" badge="AI-detectie">
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-900 mb-3">
            <b>Belangrijk:</b> de AI heeft {vlaggen.length} mogelijke aandachtspunt(en) gevonden in
            het CV. Geef bij elk een logische verklaring (bv. &quot;was 3 jaar ZZP&apos;er&quot;).
            Geen verklaring? Gebruik dan onderaan &quot;Kandidaat afkeuren&quot;.
          </div>
          <div className="space-y-3">
            {vlaggen.map((v) => (
              <div key={v.code} className="bg-red-50/50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-red-700 mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <div className="font-bold text-red-900">{v.beschrijving}</div>
                      {v.vraag_aan_recruiter && (
                        <div className="text-red-800 mt-0.5 italic">Vraag: {v.vraag_aan_recruiter}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red-800 bg-white border border-red-200 rounded-full px-2 py-0.5 shrink-0">{v.punten}</span>
                </div>
                <textarea
                  name={`vlag_toelichting_${v.code}`}
                  defaultValue={v.toelichting ?? ""}
                  required
                  rows={2}
                  placeholder={v.vraag_aan_recruiter ? "Antwoord van recruiter (verplicht)..." : "Toelichting (verplicht)..."}
                  className="w-full px-2 py-1.5 border border-red-200 rounded-md text-xs bg-white"
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {k.profielschets && (
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" name="forceer_nieuwe_schets" value="1" className="w-3.5 h-3.5 accent-[#333399]" />
          Profielschets opnieuw laten genereren door AI (huidige wordt overschreven)
        </label>
      )}

      <div className="flex items-center justify-between gap-3 pt-3 border-t flex-wrap">
        <button
          type="button"
          onClick={() => setAfkeurOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 border border-red-200 px-3 py-2 rounded-md"
        >
          <ThumbsDown size={13} /> Kandidaat afkeuren
        </button>
        <VerstuurKnop />
      </div>

      {afkeurOpen && <AfkeurModal kandidaatId={k.id} onClose={() => setAfkeurOpen(false)} />}
    </form>
  );
}

function AfkeurModal({ kandidaatId, onClose }: { kandidaatId: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
            <ThumbsDown size={14} /> Kandidaat afkeuren
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>
        <form
          action={keurIntakeAf}
          onSubmit={() => startTransition(() => {})}
          className="p-5 space-y-3"
        >
          <input type="hidden" name="id" value={kandidaatId} />
          <div className="bg-red-50 border border-red-200 text-red-900 text-xs rounded-md p-3">
            Status wordt &quot;afgewezen&quot;, kanban-stap wordt &quot;afgewezen&quot;, en de
            kandidaat krijgt een afwijzings-mail. De reden wordt toegevoegd aan de notitie.
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reden afkeuring *</label>
            <textarea
              name="afkeur_reden"
              required
              rows={4}
              autoFocus
              placeholder="bv. 'geen logische uitleg voor jobhoppen' of 'twijfels over werkervaring'"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="text-sm text-gray-600 hover:underline px-3 py-1.5">
              Annuleer
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-md text-sm"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : <ThumbsDown size={14} />}
              Afkeuren
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SchetsEditor({ k }: { k: IntakeKandidaat }) {
  const [schets, setSchets] = useState(k.profielschets ?? "");
  const [regenereren, setRegenereren] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const router = useRouter();

  async function opnieuwGenereren() {
    setRegenereren(true);
    setFout(null);
    try {
      const r = await fetch("/api/ai/profielschets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kandidaat_id: k.id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) setFout(data.error ?? "AI-fout");
      else if (data.profielschets) {
        setSchets(data.profielschets);
        router.refresh();
      }
    } finally {
      setRegenereren(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border-l-4 border-emerald-400 rounded-md p-4">
        <h3 className="font-bold text-emerald-900 mb-1 inline-flex items-center gap-2">
          <Sparkles size={16} /> Profielschets klaar voor controle
        </h3>
        <p className="text-xs text-emerald-800">
          Pas de tekst aan waar nodig en klik op &quot;Goedkeuren&quot; om de kandidaat
          door te zetten naar de volgende fase.
        </p>
      </div>

      <form action={keurProfielschetsGoed} className="space-y-3">
        <input type="hidden" name="id" value={k.id} />
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase text-gray-600">Profielschets (3e persoon)</label>
            <button
              type="button"
              onClick={opnieuwGenereren}
              disabled={regenereren}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#333399] hover:underline disabled:opacity-50"
            >
              {regenereren ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              Opnieuw laten genereren
            </button>
          </div>
          <textarea
            name="profielschets"
            value={schets}
            onChange={(e) => setSchets(e.target.value)}
            rows={12}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm leading-relaxed"
          />
          {fout && <div className="mt-2 text-xs text-red-700">{fout}</div>}
        </div>
        <div className="flex items-center justify-end">
          <GoedkeurKnop />
        </div>
      </form>
    </div>
  );
}

function VerstuurKnop() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="submit"
      onClick={(e) => {
        // Laat React form.action de submit doen; transition voor visuele feedback
        startTransition(() => {});
        void e;
      }}
      disabled={pending}
      className="inline-flex items-center gap-2 bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-60 text-white font-semibold px-6 py-2 rounded-md text-sm"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
      Verzenden & profielschets genereren
    </button>
  );
}

function GoedkeurKnop() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="submit"
      onClick={() => startTransition(() => {})}
      disabled={pending}
      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-6 py-2 rounded-md text-sm"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      Goedkeuren & doorzetten
    </button>
  );
}

const input = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]";

function Card({ titel, badge, children }: { titel: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        <h2 className="font-bold text-gray-800">{titel}</h2>
        {badge && <span className="text-[10px] font-bold uppercase tracking-wide bg-[#333399]/10 text-[#333399] px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Veld({ label, children, fullWidth = false }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      {label && <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>}
      {children}
    </div>
  );
}
