"use client";

import { useEffect, useRef, useState } from "react";

type Snippet = {
  id: string;
  naam: string;
  tekst: string;
  // DB-kolom heet nog "sneltoets" (legacy naam), maar in de UI tonen we
  // dit als "code/alias" omdat we (nog) geen keydown-shortcut afhandelen.
  sneltoets: string | null;
};

type Props = {
  onInvoegen: (tekst: string) => void;
};

export function SnippetPicker({ onInvoegen }: Props) {
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [fout, setFout] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function buitenKlik(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", buitenKlik);
      return () => document.removeEventListener("mousedown", buitenKlik);
    }
  }, [open]);

  async function open_en_laad() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/inbox/snippets", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.error ?? "Fout bij laden");
        setSnippets([]);
      } else {
        setSnippets(data.snippets ?? []);
      }
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setBezig(false);
    }
  }

  function kiezen(s: Snippet) {
    onInvoegen(s.tekst);
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={open_en_laad}
        className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition border border-gray-200"
        title="Voeg een snippet in"
      >
        Snippet
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-[260px] max-h-[320px] overflow-y-auto">
          {bezig && (
            <div className="px-3 py-2 text-xs text-gray-500">Laden...</div>
          )}
          {!bezig && fout && (
            <div className="px-3 py-2 text-xs text-red-600">{fout}</div>
          )}
          {!bezig && !fout && snippets.length === 0 && (
            <div className="px-3 py-3 text-xs text-gray-500">
              Nog geen snippets. Maak ze aan via Snippets in het menu.
            </div>
          )}
          {!bezig && !fout && snippets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => kiezen(s)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{s.naam}</span>
                {s.sneltoets && (
                  <span
                    className="text-[10px] text-gray-400 uppercase tracking-wide"
                    title="Code / alias"
                  >
                    {s.sneltoets}
                  </span>
                )}
              </div>
              <div className="text-gray-500 truncate mt-0.5">
                {s.tekst.slice(0, 80)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
