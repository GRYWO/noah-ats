"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Vacature kiezen -> AI-matches tonen. De knop drukt in en toont een laad-rondje
// zolang de AI de talentenpool rangschikt (dat duurt een paar seconden).
export function VacatureZoeker({
  vacatures,
  gekozenId,
}: {
  vacatures: { id: string; titel: string }[];
  gekozenId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [val, setVal] = useState(gekozenId ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(() => {
          router.push(val ? `/kandidatenpool?vacature=${val}` : "/kandidatenpool");
        });
      }}
      className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      <label className="flex-1 min-w-[240px]">
        <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Jouw vacature</span>
        <select
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
        >
          <option value="">Zoek je vacature…</option>
          {vacatures.map((v) => (
            <option key={v.id} value={v.id}>
              {v.titel}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending || !val}
        aria-busy={pending}
        className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm active:scale-95 disabled:cursor-wait disabled:opacity-70"
      >
        {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2a2785]/30 border-t-[#2a2785]" />}
        {pending ? "Zoeken…" : "Toon AI-matches"}
      </button>
      {vacatures.length === 0 && (
        <span className="text-xs text-amber-700">Je hebt nog geen openstaande vacatures. Maak er eerst één aan.</span>
      )}
    </form>
  );
}
