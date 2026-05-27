"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, Loader2, FileText, AlertTriangle, Sparkles, Check } from "lucide-react";
import { maakKandidaatVanWizard } from "./actions";

type Geparseerd = {
  voornaam?: string;
  tussenvoegsel?: string;
  achternaam?: string;
  email?: string;
  telefoon?: string;
  geboortedatum?: string;
  woonplaats?: string;
  opleiding?: string;
  open_voor?: string;
  rijbewijs?: string;
  eigen_vervoer?: boolean;
  talen?: string;
  werkervaring?: string;
  vaardigheden?: string;
  soort_dienstverband?: string;
  werving_of_uitzend?: string;
  salaris_indicatie?: string;
  max_reisafstand_km?: number;
  blacklist_bedrijven?: string;
  bijzonderheden?: string;
  tarief_ws?: string;
  ontbrekend?: string[];
  rode_vlaggen?: Array<{ code: string; beschrijving: string; punten: number; vraag_aan_recruiter?: string }>;
  ai_score?: number;
  ai_advies?: "goedkeuren" | "twijfel" | "afkeuren";
};

const VRAGEN: Record<string, { label: string; type: "tekst" | "getal" | "select"; opties?: string[]; placeholder?: string }> = {
  soort_dienstverband: { label: "Soort dienstverband", type: "select", opties: ["Fulltime", "Parttime", "Flex", "Stage"] },
  werving_of_uitzend:  { label: "Werving en selectie of uitzendbasis?", type: "select", opties: ["Werving en selectie", "Uitzendbasis", "Beide"] },
  salaris_indicatie:   { label: "Salaris indicatie (bruto per maand)", type: "tekst", placeholder: "bv. 3500 of 3500-4000" },
  max_reisafstand_km:  { label: "Maximale reisafstand (km)", type: "getal", placeholder: "bv. 30" },
  eigen_vervoer:       { label: "Eigen vervoer?", type: "select", opties: ["Ja", "Nee"] },
  rijbewijs:           { label: "Rijbewijs", type: "tekst", placeholder: "bv. B of geen" },
  blacklist_bedrijven: { label: "Bedrijven waar kandidaat NIET wil werken", type: "tekst", placeholder: "Komma-gescheiden" },
  bijzonderheden:      { label: "Bijzonderheden", type: "tekst", placeholder: "Medisch, persoonlijk, etc." },
  tarief_ws:           { label: "Tarief W&S", type: "tekst", placeholder: "bv. 15% bruto jaarsalaris" },
};

export function Wizard() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<Geparseerd | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [vragen, setVragen] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  // Per rode vlag: toelichting + logisch ja/nee (default = logisch zodat geen punten worden afgetrokken)
  const [vlagToelichting, setVlagToelichting] = useState<Record<string, string>>({});
  const [vlagLogisch, setVlagLogisch] = useState<Record<string, boolean>>({});

  async function onFile(f: File) {
    setFile(f);
    setParsing(true);
    setFout(null);
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch("/api/ai/parse-cv-anon", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) {
        setFout(data.error ?? "AI-parsing mislukt");
      } else {
        setParsed(data.parsed);
        // Pre-fill form fields uit AI-parse
        const init: Record<string, string> = {};
        if (data.parsed.voornaam) init.voornaam = data.parsed.voornaam;
        if (data.parsed.tussenvoegsel) init.tussenvoegsel = data.parsed.tussenvoegsel;
        if (data.parsed.achternaam) init.achternaam = data.parsed.achternaam;
        if (data.parsed.email) init.email = data.parsed.email;
        if (data.parsed.telefoon) init.telefoon = data.parsed.telefoon;
        if (data.parsed.woonplaats) init.woonplaats = data.parsed.woonplaats;
        if (data.parsed.opleiding) init.opleiding = data.parsed.opleiding;
        if (data.parsed.open_voor) init.open_voor = data.parsed.open_voor;
        if (data.parsed.rijbewijs) init.rijbewijs = data.parsed.rijbewijs;
        setFormData(init);
      }
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setFout("Geen CV geüpload");
      return;
    }
    const fd = new FormData();
    fd.append("cv_file", file);
    if (parsed) {
      // Merge form fields + vragen-antwoorden
      const merged = { ...parsed, ...formData, ...vragen };

      // Werk rode_vlaggen bij met de zojuist gegeven toelichting + logisch-keuze
      const vlaggenMetAntwoord = (parsed.rode_vlaggen ?? []).map((v) => ({
        ...v,
        toelichting: vlagToelichting[v.code] ?? "",
        logisch: vlagLogisch[v.code] !== false, // default = logisch (tenzij expliciet niet)
      }));
      const parsedMetAntwoorden = { ...parsed, rode_vlaggen: vlaggenMetAntwoord };
      fd.append("cv_geparseerd", JSON.stringify(parsedMetAntwoorden));

      for (const [k, v] of Object.entries(merged)) {
        if (v == null || v === "") continue;
        if (k === "ontbrekend" || k === "rode_vlaggen" || k === "ai_score" || k === "ai_advies") continue;
        if (typeof v === "boolean") fd.append(k, v ? "true" : "false");
        else fd.append(k, String(v));
      }
    }
    startTransition(async () => {
      await maakKandidaatVanWizard(fd);
    });
  }

  function setF(k: string, v: string) {
    setFormData(p => ({ ...p, [k]: v }));
  }

  const adviesKleur =
    parsed?.ai_advies === "goedkeuren" ? "bg-emerald-100 text-emerald-800" :
    parsed?.ai_advies === "afkeuren" ? "bg-red-100 text-red-800" :
    parsed?.ai_advies === "twijfel" ? "bg-amber-100 text-amber-800" :
    "bg-gray-100 text-gray-700";

  const ontbrekendeVragen = (parsed?.ontbrekend ?? []).filter(v => v in VRAGEN);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Stap 1: CV uploaden */}
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          className={`bg-white rounded-2xl shadow-sm border-2 border-dashed p-16 text-center transition-colors cursor-pointer ${
            dragging ? "border-[#333399] bg-[#eef0ff]" : "border-gray-300 hover:border-[#333399]"
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#eef0ff] items-center justify-center mb-4">
            <Upload size={32} className="text-[#333399]" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Sleep het CV hierop</h2>
          <p className="text-sm text-gray-500">PDF, Word (.docx), RTF, tekst (.txt/.md) of foto (JPG/PNG) — AI leest 'm uit en stelt daarna ontbrekende vragen</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.rtf,.txt,.md,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/rtf,text/plain,text/markdown,image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          />
        </div>
      )}

      {/* Bezig met parsen */}
      {file && parsing && (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Loader2 size={32} className="animate-spin text-[#333399] mx-auto mb-3" />
          <p className="text-sm text-gray-700">AI leest het CV...</p>
          <p className="text-xs text-gray-500 mt-1">{file.name}</p>
        </div>
      )}

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{fout}</div>
      )}

      {/* Stap 2: review + vragen */}
      {parsed && (
        <>
          {/* AI-score + advies */}
          {parsed.ai_score != null && (
            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold ${adviesKleur}`}>
                {parsed.ai_score}
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold uppercase text-gray-500">AI-score</div>
                <div className="text-lg font-bold text-gray-800">
                  Advies: {parsed.ai_advies === "goedkeuren" ? "Goedkeuren" : parsed.ai_advies === "afkeuren" ? "Afkeuren" : "Twijfel"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 inline-flex items-center gap-1">
                  <FileText size={11} /> {file?.name}
                </div>
              </div>
            </div>
          )}

          {/* Rode vlaggen — beantwoorden hier direct, niet pas in vervolg-stap */}
          {parsed.rode_vlaggen && parsed.rode_vlaggen.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-1 inline-flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-600" />
                Rode vlaggen — beantwoorden
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Geef per vlag een antwoord en klik <b>Logisch</b> (geen punten-aftrek) of <b>Niet logisch</b> (punten worden afgetrokken).
              </p>
              <div className="space-y-2">
                {parsed.rode_vlaggen.map((v) => {
                  const logischState = vlagLogisch[v.code];
                  return (
                    <div key={v.code} className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="font-bold text-red-900">{v.beschrijving}</div>
                          {v.vraag_aan_recruiter && (
                            <div className="text-red-800 mt-0.5 italic">Vraag: {v.vraag_aan_recruiter}</div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-red-800 bg-white border border-red-200 rounded-full px-2 py-0.5 shrink-0">
                          {v.punten}
                        </span>
                      </div>
                      <textarea
                        value={vlagToelichting[v.code] ?? ""}
                        onChange={(e) => setVlagToelichting(p => ({ ...p, [v.code]: e.target.value }))}
                        rows={2}
                        placeholder="Antwoord van kandidaat / jouw beoordeling..."
                        className="w-full px-2 py-1.5 border border-red-200 rounded-md text-xs bg-white"
                      />
                      <div className="mt-2 inline-flex rounded-md overflow-hidden border border-red-200 bg-white text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setVlagLogisch(p => ({ ...p, [v.code]: true }))}
                          className={`px-3 py-1 ${logischState === true ? "bg-emerald-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                          Logisch
                        </button>
                        <button
                          type="button"
                          onClick={() => setVlagLogisch(p => ({ ...p, [v.code]: false }))}
                          className={`px-3 py-1 ${logischState === false ? "bg-red-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                          Niet logisch
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Basis velden (pre-filled) */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3 inline-flex items-center gap-2">
              <Sparkles size={14} className="text-[#333399]" />
              Door AI gevonden — controleer en vul aan
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Veld label="Voornaam *" value={formData.voornaam ?? ""} onChange={(v) => setF("voornaam", v)} />
              <Veld label="Tussenvoegsel" value={formData.tussenvoegsel ?? ""} onChange={(v) => setF("tussenvoegsel", v)} />
              <Veld label="Achternaam *" value={formData.achternaam ?? ""} onChange={(v) => setF("achternaam", v)} />
              <Veld label="E-mail" value={formData.email ?? ""} type="email" onChange={(v) => setF("email", v)} />
              <Veld label="Telefoon" value={formData.telefoon ?? ""} onChange={(v) => setF("telefoon", v)} />
              <Veld label="Woonplaats" value={formData.woonplaats ?? ""} onChange={(v) => setF("woonplaats", v)} />
              <Veld label="Opleiding" value={formData.opleiding ?? ""} onChange={(v) => setF("opleiding", v)} />
              <Veld label="Rijbewijs" value={formData.rijbewijs ?? ""} onChange={(v) => setF("rijbewijs", v)} />
              <div className="col-span-2">
                <Veld label="Open voor functies" value={formData.open_voor ?? ""} onChange={(v) => setF("open_voor", v)} />
              </div>
            </div>
          </div>

          {/* Ontbrekend - vragen aan recruiter */}
          {ontbrekendeVragen.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-amber-900 mb-3 inline-flex items-center gap-2">
                <Sparkles size={14} />
                AI heeft deze info nog niet — vraag aan de kandidaat tijdens intake:
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {ontbrekendeVragen.map((veld) => {
                  const v = VRAGEN[veld];
                  return (
                    <div key={veld}>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{v.label}</label>
                      {v.type === "select" ? (
                        <select
                          value={vragen[veld] ?? ""}
                          onChange={(e) => setVragen(p => ({ ...p, [veld]: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        >
                          <option value="">—</option>
                          {v.opties?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={v.type === "getal" ? "number" : "text"}
                          value={vragen[veld] ?? ""}
                          onChange={(e) => setVragen(p => ({ ...p, [veld]: e.target.value }))}
                          placeholder={v.placeholder}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setFile(null); setParsed(null); setFormData({}); setVragen({}); }}
              className="text-sm text-gray-600 hover:underline"
            >
              Opnieuw beginnen
            </button>
            <button
              type="submit"
              disabled={pending || !formData.voornaam || !formData.achternaam}
              className="inline-flex items-center gap-2 bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Kandidaat aanmaken
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function Veld({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
      />
    </div>
  );
}
