"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";

type Setter = { id: string; voornaam: string | null; achternaam: string | null };

export function AdminFilterBar({ setters, huidigeSetter, huidigeFilter }: {
  setters: Setter[];
  huidigeSetter: string | null;
  huidigeFilter: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function navigeer(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params?.toString() ?? "");
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.push(`/coaching?${next.toString()}`);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center gap-3 flex-wrap">
      <div className="inline-flex items-center gap-1.5 text-sm text-gray-500">
        <Filter size={14} /> Filter:
      </div>

      <select
        value={huidigeSetter ?? ""}
        onChange={(e) => navigeer({ setter: e.target.value || null })}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
      >
        <option value="">Alle setters</option>
        {setters.map((s) => (
          <option key={s.id} value={s.id}>{`${s.voornaam ?? ""} ${s.achternaam ?? ""}`.trim()}</option>
        ))}
      </select>

      <div className="inline-flex bg-gray-100 rounded-md p-0.5 text-xs">
        {([
          ["", "Alle"],
          ["behaald", "✓ Doel behaald"],
          ["niet_behaald", "✗ Niet behaald"],
        ] as const).map(([w, label]) => (
          <button
            key={w}
            type="button"
            onClick={() => navigeer({ filter: w || null })}
            className={`px-3 py-1 rounded font-semibold ${
              (huidigeFilter ?? "") === w
                ? "bg-white text-[#333399] shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(huidigeSetter || huidigeFilter) && (
        <button
          type="button"
          onClick={() => navigeer({ setter: null, filter: null })}
          className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 ml-auto"
        >
          <X size={11} /> Reset
        </button>
      )}
    </div>
  );
}
