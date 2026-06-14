"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Treffer = {
  id: string;
  onderwerp: string;
  van: string;
  datum: string;
  snippet: string;
  account_id: string;
  map_pad: string;
  uid: number;
};

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [resultaten, setResultaten] = useState<Treffer[]>([]);
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [actiefIndex, setActiefIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce: 200ms wachten na laatste toetsaanslag voor we de API hitten.
  // AbortController voorkomt race conditions: als de gebruiker doortypt
  // terwijl een vorige fetch nog loopt, breken we die af voor de nieuwere
  // request, anders kan een oud antwoord het nieuwe overschrijven.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResultaten([]);
      setActiefIndex(-1);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setBezig(true);
      try {
        const res = await fetch("/api/mail/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q }),
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (data?.ok && Array.isArray(data.resultaten)) {
          setResultaten(data.resultaten);
          setActiefIndex(-1);
        } else {
          setResultaten([]);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("[SearchBar] zoek mislukt:", e);
          setResultaten([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setBezig(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  // Klik buiten de container = sluiten.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function openTreffer(t: Treffer) {
    setOpen(false);
    setQuery("");
    router.push(
      `/inbox?account=${encodeURIComponent(t.account_id)}&map=${encodeURIComponent(t.map_pad)}&uid=${t.uid}`,
    );
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || resultaten.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiefIndex((i) => Math.min(resultaten.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiefIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = actiefIndex >= 0 ? actiefIndex : 0;
      const t = resultaten[idx];
      if (t) openTreffer(t);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Doorzoek alle mail"
        aria-label="Doorzoek alle mail"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#333399] focus:border-[#333399]"
      />
      {open && (query.trim().length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-30 max-h-96 overflow-y-auto">
          {bezig && resultaten.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">Bezig met zoeken...</div>
          )}
          {!bezig && resultaten.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">Geen resultaten</div>
          )}
          {resultaten.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onMouseEnter={() => setActiefIndex(i)}
              onClick={() => openTreffer(t)}
              className={`w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 ${
                i === actiefIndex ? "bg-[#333399]/10" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-800 truncate">{t.onderwerp}</span>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {new Date(t.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                </span>
              </div>
              <div className="text-xs text-gray-500 truncate">{t.van}</div>
              {t.snippet && (
                <div className="text-xs text-gray-400 truncate mt-0.5">{t.snippet}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
