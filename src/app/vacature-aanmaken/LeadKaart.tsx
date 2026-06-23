"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Tag, StickyNote, BellPlus, Building2, Clock } from "lucide-react";
import {
  wisselLabel,
  maakEnZetLabel,
  voegLeadNotitieToe,
  zetLeadHerinnering,
  voegLeadToeAanCrm,
  getLeadTijdlijn,
  type LeadType,
  type LeadLabel,
  type LeadEvent,
} from "./lead-actions";

const KLEUREN = ["#f59e0b", "#16a34a", "#dc2626", "#2563eb", "#7c3aed", "#0891b2", "#db2777", "#64748b"];

export function LeadKaart({
  open,
  onClose,
  leadId,
  leadType,
  leadNaam,
  alleLabels,
  actieveLabelIds,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadType: LeadType;
  leadNaam: string;
  alleLabels: LeadLabel[];
  actieveLabelIds: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tijdlijn, setTijdlijn] = useState<LeadEvent[]>([]);
  const [notitie, setNotitie] = useState("");
  const [herinnerTekst, setHerinnerTekst] = useState("Terugbellen");
  const [herinnerTijd, setHerinnerTijd] = useState("");
  const [nieuwLabel, setNieuwLabel] = useState("");
  const [nieuwKleur, setNieuwKleur] = useState(KLEUREN[0]);
  const [melding, setMelding] = useState("");

  const actief = new Set(actieveLabelIds);

  async function laadTijdlijn() {
    const t = await getLeadTijdlijn(leadId, leadType);
    setTijdlijn(t);
  }

  useEffect(() => {
    if (open) {
      setMelding("");
      laadTijdlijn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId]);

  if (!open) return null;

  function naActie() {
    laadTijdlijn();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lead</div>
            <h2 className="text-lg font-bold text-gray-800">{leadNaam}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`space-y-5 px-5 py-5 ${pending ? "opacity-70" : ""}`}>
          {melding && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{melding}</div>}

          {/* Labels */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><Tag className="h-4 w-4 text-[#333399]" /> Labels</div>
            <div className="flex flex-wrap items-center gap-2">
              {alleLabels.map((l) => {
                const aan = actief.has(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => start(async () => { await wisselLabel(leadId, leadType, l.id); naActie(); })}
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition"
                    style={aan
                      ? { backgroundColor: l.kleur, borderColor: l.kleur, color: "#fff" }
                      : { borderColor: l.kleur, color: l.kleur, backgroundColor: "transparent" }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: aan ? "#fff" : l.kleur }} />
                    {l.naam}
                  </button>
                );
              })}
            </div>
            {/* Nieuw label */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={nieuwLabel}
                onChange={(e) => setNieuwLabel(e.target.value)}
                placeholder="Nieuw label…"
                className="w-40 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <div className="flex items-center gap-1">
                {KLEUREN.map((k) => (
                  <button
                    key={k}
                    onClick={() => setNieuwKleur(k)}
                    className={`h-5 w-5 rounded-full border-2 ${nieuwKleur === k ? "border-gray-800" : "border-transparent"}`}
                    style={{ backgroundColor: k }}
                    aria-label={k}
                  />
                ))}
              </div>
              <button
                disabled={!nieuwLabel.trim()}
                onClick={() => start(async () => { await maakEnZetLabel(leadId, leadType, nieuwLabel, nieuwKleur); setNieuwLabel(""); naActie(); })}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#333399] hover:bg-gray-50 disabled:opacity-50"
              >
                + Maak label
              </button>
            </div>
          </section>

          {/* CRM */}
          <section>
            <button
              onClick={() => start(async () => { const r = await voegLeadToeAanCrm(leadId, leadType); setMelding(r.melding); naActie(); })}
              className="inline-flex items-center gap-2 rounded-lg bg-[#333399] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a2a80]"
            >
              <Building2 className="h-4 w-4" /> Voeg toe aan CRM
            </button>
          </section>

          {/* Notitie */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><StickyNote className="h-4 w-4 text-[#333399]" /> Notitie</div>
            <textarea
              value={notitie}
              onChange={(e) => setNotitie(e.target.value)}
              rows={2}
              placeholder="Wat is er besproken?"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              disabled={!notitie.trim()}
              onClick={() => start(async () => { await voegLeadNotitieToe(leadId, leadType, notitie); setNotitie(""); naActie(); })}
              className="mt-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#333399] hover:bg-gray-50 disabled:opacity-50"
            >
              Notitie toevoegen
            </button>
          </section>

          {/* Herinnering */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><BellPlus className="h-4 w-4 text-[#333399]" /> Herinnering</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={herinnerTekst}
                onChange={(e) => setHerinnerTekst(e.target.value)}
                placeholder="bv. Terugbellen"
                className="w-44 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <input
                type="datetime-local"
                value={herinnerTijd}
                onChange={(e) => setHerinnerTijd(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <button
                disabled={!herinnerTijd}
                onClick={() => start(async () => { await zetLeadHerinnering(leadId, leadType, herinnerTekst, herinnerTijd); setHerinnerTijd(""); setMelding("Herinnering ingesteld."); naActie(); })}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#333399] hover:bg-gray-50 disabled:opacity-50"
              >
                Instellen
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">Je krijgt op het gekozen moment een melding op je Herinneringen-pagina.</p>
          </section>

          {/* Tijdlijn */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><Clock className="h-4 w-4 text-[#333399]" /> Tijdlijn</div>
            {tijdlijn.length === 0 ? (
              <p className="text-xs text-gray-400">Nog geen contactmomenten. Voeg een notitie, label of herinnering toe.</p>
            ) : (
              <ol className="space-y-2 border-l-2 border-gray-100 pl-4">
                {tijdlijn.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#333399]" />
                    <div className="text-sm text-gray-800">{e.tekst || e.soort}</div>
                    <div className="text-[11px] text-gray-400">
                      {e.door} · {new Date(e.created_at).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
