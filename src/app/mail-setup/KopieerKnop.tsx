"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function KopieerKnop({ tekst }: { tekst: string }) {
  const [gekopieerd, setGekopieerd] = useState(false);

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(tekst);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      // fallback voor oudere browsers
      const ta = document.createElement("textarea");
      ta.value = tekst;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    }
  }

  return (
    <div className="relative">
      <pre className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-xs text-gray-200 overflow-x-auto whitespace-pre-wrap font-mono">
        {tekst}
      </pre>
      <button
        type="button"
        onClick={kopieer}
        className="absolute top-3 right-3 bg-white hover:bg-gray-100 text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition shadow"
      >
        {gekopieerd ? (
          <>
            <Check size={14} className="text-emerald-600" />
            Gekopieerd
          </>
        ) : (
          <>
            <Copy size={14} />
            Kopieer
          </>
        )}
      </button>
    </div>
  );
}
