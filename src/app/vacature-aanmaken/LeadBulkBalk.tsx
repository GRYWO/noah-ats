"use client";

import { useState, useTransition } from "react";
import { Building2 } from "lucide-react";
import { voegLabelgroepToeAanCrm, type LeadLabel } from "./lead-actions";

// Bulk: alle leads met een bepaald label in één keer naar het CRM.
export function LeadBulkBalk({ labels, counts }: { labels: LeadLabel[]; counts: Record<string, number> }) {
  const [pending, start] = useTransition();
  const [melding, setMelding] = useState("");
  const relevant = labels.filter((l) => (counts[l.id] ?? 0) > 0);
  if (relevant.length === 0) return null;

  return (
    <div className={`mb-4 rounded-xl border border-gray-200 bg-white p-3 ${pending ? "opacity-70" : ""}`}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Bulk naar CRM</div>
      <div className="flex flex-wrap items-center gap-2">
        {relevant.map((l) => (
          <button
            key={l.id}
            onClick={() => start(async () => { const r = await voegLabelgroepToeAanCrm(l.id); setMelding(r.melding); })}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-gray-50"
            style={{ borderColor: l.kleur, color: l.kleur }}
          >
            <Building2 className="h-3.5 w-3.5" /> Alle &ldquo;{l.naam}&rdquo; → CRM
            <span className="text-gray-400">({counts[l.id]})</span>
          </button>
        ))}
      </div>
      {melding && <div className="mt-2 text-sm font-medium text-emerald-700">{melding}</div>}
    </div>
  );
}
