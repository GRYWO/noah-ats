"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LeadKaart } from "./LeadKaart";
import type { LeadLabel } from "./lead-actions";

export type Vondst = {
  id: string;
  titel: string | null;
  bedrijf: string | null;
  plaats: string | null;
  telefoon: string | null;
  url: string | null;
  datum: string | null;
  isBureau: boolean;
};

// Toont de gevonden vacatures (leads) met: filter op uitzendbureaus, labels per lead
// en een lead-paneel (notitie, herinnering, tijdlijn, toevoegen aan CRM).
export function JobdiggerResultaten({
  vondsten,
  alleLabels,
  labelLinks,
}: {
  vondsten: Vondst[];
  alleLabels: LeadLabel[];
  labelLinks: Record<string, string[]>;
}) {
  const [verbergBureaus, setVerbergBureaus] = useState(false);
  const [openLead, setOpenLead] = useState<{ id: string; naam: string } | null>(null);

  useEffect(() => {
    setVerbergBureaus(localStorage.getItem("noah-verberg-bureaus") === "1");
  }, []);

  function toggle(aan: boolean) {
    setVerbergBureaus(aan);
    try { localStorage.setItem("noah-verberg-bureaus", aan ? "1" : "0"); } catch {}
  }

  const labelById = new Map(alleLabels.map((l) => [l.id, l]));
  const zichtbaar = verbergBureaus ? vondsten.filter((v) => !v.isBureau) : vondsten;
  const verborgen = vondsten.length - zichtbaar.length;

  return (
    <>
      <label className="mb-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600">
        <input type="checkbox" checked={verbergBureaus} onChange={(e) => toggle(e.target.checked)} className="h-4 w-4 accent-[#333399]" />
        Uitzendbureaus verbergen
        {verbergBureaus && verborgen > 0 && <span className="font-normal text-gray-400">· {verborgen} verborgen</span>}
      </label>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Functie</th>
              <th className="px-4 py-2 text-left">Bedrijf</th>
              <th className="px-4 py-2 text-left">Plaats</th>
              <th className="px-4 py-2 text-left">Telefoon</th>
              <th className="px-4 py-2 text-left">Labels</th>
              <th className="px-4 py-2 text-right">Actie</th>
            </tr>
          </thead>
          <tbody>
            {zichtbaar.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Geen vacatures om te tonen{verbergBureaus ? " (uitzendbureaus verborgen)" : ""}.</td></tr>
            ) : (
              zichtbaar.map((vd) => {
                const labels = (labelLinks[vd.id] ?? []).map((id) => labelById.get(id)).filter(Boolean) as LeadLabel[];
                const naam = vd.bedrijf || vd.titel || "Lead";
                return (
                  <tr key={vd.id} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-2 text-gray-800">
                      <Link href={`/vacature-aanmaken/nieuw?vondst=${vd.id}`} className="font-medium hover:text-[#333399] hover:underline" title="Bekijk en plaats deze vacature">
                        {vd.titel ?? "Onbekende functie"}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{vd.bedrijf ?? "-"}</td>
                    <td className="px-4 py-2 text-gray-600">{vd.plaats ?? "-"}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {vd.telefoon ? <a href={`tel:${vd.telefoon}`} className="text-[#333399] hover:underline">{vd.telefoon}</a> : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {labels.map((l) => (
                          <span key={l.id} className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: l.kleur }}>{l.naam}</span>
                        ))}
                        {labels.length === 0 && <span className="text-xs text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => setOpenLead({ id: vd.id, naam })}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#333399] hover:bg-gray-50"
                      >
                        Lead openen
                      </button>
                      <Link href={`/vacature-aanmaken/nieuw?vondst=${vd.id}`} className="btn-gold ml-2 inline-block px-3 py-1.5 text-xs">Plaats →</Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {openLead && (
        <LeadKaart
          open={true}
          onClose={() => setOpenLead(null)}
          leadId={openLead.id}
          leadType="vondst"
          leadNaam={openLead.naam}
          alleLabels={alleLabels}
          actieveLabelIds={labelLinks[openLead.id] ?? []}
        />
      )}
    </>
  );
}
