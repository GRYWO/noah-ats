"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Sparkles, Check, X, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { goedkeurenCv, afkeurenCv, updateProfielschets } from "./voorstelprofiel-actions";

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
  rode_vlaggen?: string[];
};

type Props = {
  kandidaatId: string;
  cvUrl: string | null;
  cvControleStatus: string;
  cvGeparseerd: Geparseerd | null;
  voorstelprofielToken: string | null;
  profielschets: string | null;
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
              <div className="space-y-3">
                {cvGeparseerd.ontbrekend && cvGeparseerd.ontbrekend.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
                      <AlertTriangle size={12} /> Ontbreekt — vraag bij intake
                    </div>
                    <ul className="text-xs text-amber-800 list-disc pl-4">
                      {cvGeparseerd.ontbrekend.map((v, i) => <li key={i}>{v}</li>)}
                    </ul>
                  </div>
                )}
                {cvGeparseerd.rode_vlaggen && cvGeparseerd.rode_vlaggen.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-900 mb-1">
                      <AlertTriangle size={12} /> Rode vlaggen
                    </div>
                    <ul className="text-xs text-red-800 list-disc pl-4">
                      {cvGeparseerd.rode_vlaggen.map((v, i) => <li key={i}>{v}</li>)}
                    </ul>
                  </div>
                )}
              </div>
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
