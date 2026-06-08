"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Sparkles, Check, X, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { goedkeurenCv, afkeurenCv, updateProfielschets, updateRodeVlagToelichting } from "./voorstelprofiel-actions";
import { IntakeQuiz } from "./IntakeQuiz";

type RodeVlag = {
  code: string;
  beschrijving: string;
  punten: number;
  vraag_aan_recruiter?: string;
  toelichting?: string;
};

type Geparseerd = {
  voornaam?: string;
  achternaam?: string;
  email?: string;
  telefoon?: string;
  woonplaats?: string;
  opleiding?: string;
  open_voor?: string;
  werkervaring?: string;
  vaardigheden?: string;
  rijbewijs?: string;
  eigen_vervoer?: boolean;
  talen?: string;
  ontbrekend?: string[];
  rode_vlaggen?: RodeVlag[] | string[];
  ai_score?: number;
  ai_advies?: "goedkeuren" | "twijfel" | "afkeuren";
};

type Props = {
  kandidaatId: string;
  cvUrl: string | null;
  cvControleStatus: string;
  cvGeparseerd: Geparseerd | null;
  voorstelprofielToken: string | null;
  profielschets: string | null;
  intakeVoltooid: boolean;
};

const STATUS_KLEUR: Record<string, string> = {
  niet_gecontroleerd: "bg-gray-100 text-gray-700",
  in_controle:        "bg-amber-100 text-amber-800",
  goedgekeurd:        "bg-emerald-100 text-emerald-800",
  afgekeurd:          "bg-red-100 text-red-800",
};
const STATUS_LABEL: Record<string, string> = {
  niet_gecontroleerd: "Nog niet gecontroleerd",
  in_controle:        "In controle",
  goedgekeurd:        "Goedgekeurd",
  afgekeurd:          "Afgekeurd",
};

export function CvControle({
  kandidaatId,
  cvUrl,
  cvControleStatus,
  cvGeparseerd,
  voorstelprofielToken,
  profielschets,
  intakeVoltooid,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const [schetsTekst, setSchetsTekst] = useState(profielschets ?? "");
  const router = useRouter();

  function callApi(url: string) {
    setFout(null);
    startTransition(async () => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kandidaat_id: kandidaatId }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFout(data.error ?? "Onbekende fout");
        return;
      }
      if (data.profielschets) setSchetsTekst(data.profielschets);
      router.refresh();
    });
  }

  function onGoedkeuren() {
    const fd = new FormData();
    fd.append("id", kandidaatId);
    startTransition(async () => { await goedkeurenCv(fd); router.refresh(); });
  }
  function onAfkeuren() {
    if (!confirm("Weet je zeker dat je deze kandidaat wilt afkeuren?")) return;
    const fd = new FormData();
    fd.append("id", kandidaatId);
    startTransition(async () => { await afkeurenCv(fd); router.refresh(); });
  }
  function onSchetsOpslaan() {
    const fd = new FormData();
    fd.append("id", kandidaatId);
    fd.append("profielschets", schetsTekst);
    startTransition(async () => { await updateProfielschets(fd); router.refresh(); });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-gray-800">CV-controle & voorstelprofiel</h2>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_KLEUR[cvControleStatus] ?? "bg-gray-100"}`}>
            {STATUS_LABEL[cvControleStatus] ?? cvControleStatus}
          </span>
        </div>
        {voorstelprofielToken && (
          <a
            href={`/voorstelprofiel/${voorstelprofielToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#333399] hover:underline font-semibold inline-flex items-center gap-1"
          >
            <ExternalLink size={12} /> Voorstelprofiel openen
          </a>
        )}
      </div>

      {!cvUrl ? (
        <p className="text-sm text-gray-500">Upload eerst een CV bovenaan deze pagina.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => callApi("/api/ai/parse-cv")}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#333399] hover:bg-[#2a2a80] text-white px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              {pending ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              CV laten lezen door AI
            </button>
            {cvGeparseerd && (
              <button
                type="button"
                onClick={() => callApi("/api/ai/profielschets")}
                disabled={pending}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                {pending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Profielschets genereren
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={onGoedkeuren}
                disabled={pending || cvControleStatus === "goedgekeurd"}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                <Check size={12} /> Goedkeuren
              </button>
              <button
                type="button"
                onClick={onAfkeuren}
                disabled={pending || cvControleStatus === "afgekeurd"}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                <X size={12} /> Afkeuren
              </button>
            </div>
          </div>

          {fout && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-md p-2 mb-4">
              {fout}
            </div>
          )}

          {cvGeparseerd && (cvGeparseerd.ontbrekend?.length ?? 0) > 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <IntakeQuiz
                kandidaatId={kandidaatId}
                ontbrekend={cvGeparseerd.ontbrekend ?? []}
                intakeVoltooid={intakeVoltooid}
              />
            </div>
          )}

          {cvGeparseerd && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-xs font-bold uppercase text-gray-600 mb-2">AI-extractie uit CV</h3>
                <dl className="text-xs space-y-1.5">
                  {cvGeparseerd.opleiding && <Rij k="Opleiding" v={cvGeparseerd.opleiding} />}
                  {cvGeparseerd.open_voor && <Rij k="Open voor" v={cvGeparseerd.open_voor} />}
                  {cvGeparseerd.talen && <Rij k="Talen" v={cvGeparseerd.talen} />}
                  {cvGeparseerd.rijbewijs && <Rij k="Rijbewijs" v={cvGeparseerd.rijbewijs} />}
                  {cvGeparseerd.werkervaring && <Rij k="Werkervaring" v={cvGeparseerd.werkervaring} />}
                  {cvGeparseerd.vaardigheden && <Rij k="Vaardigheden" v={cvGeparseerd.vaardigheden} />}
                </dl>
              </div>
              <RodeVlaggenSectie kandidaatId={kandidaatId} vlaggen={cvGeparseerd.rode_vlaggen} />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase text-gray-600">Profielschets (3e persoon)</label>
              {schetsTekst !== (profielschets ?? "") && (
                <button
                  type="button"
                  onClick={onSchetsOpslaan}
                  disabled={pending}
                  className="text-xs text-[#333399] hover:underline font-semibold disabled:opacity-50"
                >
                  Opslaan
                </button>
              )}
            </div>
            <textarea
              value={schetsTekst}
              onChange={(e) => setSchetsTekst(e.target.value)}
              rows={8}
              placeholder="Klik 'Profielschets genereren' om automatisch te laten schrijven, of typ hier handmatig."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}

function Rij({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex">
      <dt className="w-28 text-gray-500 shrink-0">{k}</dt>
      <dd className="font-medium text-gray-800 flex-1">{v}</dd>
    </div>
  );
}

function RodeVlaggenSectie({
  kandidaatId,
  vlaggen,
}: {
  kandidaatId: string;
  vlaggen?: RodeVlag[] | string[];
  score?: number;
  advies?: "goedkeuren" | "twijfel" | "afkeuren";
}) {
  if (!vlaggen || vlaggen.length === 0) return null;

  // Backwards compat: oude string-array vorm
  const lijst: RodeVlag[] = vlaggen.map((v) => {
    if (typeof v === "string") return { code: "overig", beschrijving: v, punten: -5 };
    return v;
  });

  // Hoeveel vlaggen hebben nog GEEN toelichting? → gebruik dit om gebruiker
  // duidelijk naar de wizard te sturen voor beantwoording.
  const zonderToelichting = lijst.filter((v) => !v.toelichting?.trim()).length;

  return (
    <div className="space-y-3">
      {/* AI-score is uit het systeem gehaald. */}

      {/* Prominente knop naar de intake-wizard zolang er nog vlaggen zonder
          toelichting zijn — daar staan ze met groene/rode knop én textarea
          en wordt de score automatisch herrekend. */}
      {zonderToelichting > 0 && (
        <a
          href={`/kandidaten/${kandidaatId}/intake`}
          className="block bg-gradient-to-r from-[#333399] to-[#4a4abf] hover:from-[#2a2a80] hover:to-[#3a3aa0] text-white rounded-lg p-3 text-sm font-semibold flex items-center justify-between shadow-sm"
        >
          <span>→ Beantwoord {zonderToelichting} vlag{zonderToelichting === 1 ? "" : "(gen)"} in de intake-wizard</span>
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wide">Snelste route</span>
        </a>
      )}

      <div className="space-y-2">
        {lijst.map((v) => <VlagItem key={v.code} kandidaatId={kandidaatId} vlag={v} />)}
      </div>
    </div>
  );
}

function VlagItem({ kandidaatId, vlag }: { kandidaatId: string; vlag: RodeVlag }) {
  const [toelichting, setToelichting] = useState(vlag.toelichting ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function opslaan() {
    const fd = new FormData();
    fd.append("id", kandidaatId);
    fd.append("code", vlag.code);
    fd.append("toelichting", toelichting);
    startTransition(async () => {
      await updateRodeVlagToelichting(fd);
      router.refresh();
    });
  }

  const veranderd = (toelichting ?? "") !== (vlag.toelichting ?? "");

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} className="text-red-700 mt-0.5 shrink-0" />
          <div className="text-xs">
            <div className="font-bold text-red-900">{vlag.beschrijving}</div>
            {vlag.vraag_aan_recruiter && (
              <div className="text-red-800 mt-0.5 italic">Vraag: {vlag.vraag_aan_recruiter}</div>
            )}
          </div>
        </div>
        <span className="text-xs font-bold text-red-800 bg-white border border-red-200 rounded-full px-2 py-0.5 shrink-0">
          {vlag.punten}
        </span>
      </div>
      <div className="mt-2">
        <textarea
          value={toelichting}
          onChange={(e) => setToelichting(e.target.value)}
          rows={2}
          placeholder={vlag.vraag_aan_recruiter ? "Antwoord van recruiter..." : "Optionele toelichting van recruiter..."}
          className="w-full px-2 py-1.5 border border-red-200 rounded-md text-xs bg-white"
        />
        {veranderd && (
          <button
            type="button"
            onClick={opslaan}
            disabled={pending}
            className="mt-1 text-xs text-[#333399] hover:underline font-semibold inline-flex items-center gap-1"
          >
            {pending && <Loader2 size={10} className="animate-spin" />}
            Toelichting opslaan
          </button>
        )}
        {vlag.toelichting && !veranderd && (
          <div className="mt-1 text-xs text-emerald-700 inline-flex items-center gap-1">
            <Check size={10} /> Opgeslagen
          </div>
        )}
      </div>
    </div>
  );
}
