"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Users, Building2, Contact, Send, Loader2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type Hit = {
  type: "kandidaat" | "bureau" | "opdrachtgever" | "voorstel";
  id: string;
  titel: string;
  ondertitel?: string;
  url: string;
};

const ICOON: Record<Hit["type"], React.ReactNode> = {
  kandidaat: <Users size={16} />,
  bureau: <Building2 size={16} />,
  opdrachtgever: <Contact size={16} />,
  voorstel: <Send size={16} />,
};

const LABEL: Record<Hit["type"], string> = {
  kandidaat: "Kandidaat",
  bureau: "Bureau",
  opdrachtgever: "Opdrachtgever",
  voorstel: "Voorstel",
};

export function SnelZoeken() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [zoekterm, setZoekterm] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [bezig, setBezig] = useState(false);
  const [actief, setActief] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus input bij openen
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setZoekterm("");
      setHits([]);
      setActief(0);
    }
  }, [open]);

  // Debounced search met race-condition guard:
  // bij snel typen kan een trage oudere request resultaten OVER nieuwere
  // schrijven. Daarom checken we of de query nog steeds actueel is.
  useEffect(() => {
    const term = zoekterm.trim();
    if (term.length < 2) {
      // Minimum 2 tekens — voorkomt zoeken op "a" (té veel hits, traag)
      setHits([]);
      setBezig(false);
      return;
    }
    setBezig(true);
    let geannuleerd = false;
    const handle = setTimeout(async () => {
      const like = `%${term}%`;
      const [k, b, o] = await Promise.all([
        supabase
          .from("kandidaten")
          .select("id, voornaam, tussenvoegsel, achternaam, status")
          .or(`voornaam.ilike.${like},achternaam.ilike.${like},email.ilike.${like}`)
          .limit(6),
        supabase
          .from("tenants")
          .select("id, naam")
          .ilike("naam", like)
          .limit(4),
        supabase
          .from("opdrachtgevers")
          .select("id, bedrijfsnaam, contactpersoon")
          .or(`bedrijfsnaam.ilike.${like},contactpersoon.ilike.${like}`)
          .limit(4),
      ]);

      const resultaat: Hit[] = [];
      (k.data ?? []).forEach((r) => {
        const naam = [r.voornaam, r.tussenvoegsel, r.achternaam].filter(Boolean).join(" ");
        resultaat.push({
          type: "kandidaat",
          id: r.id,
          titel: naam || "Onbekend",
          ondertitel: r.status,
          url: `/kandidaten/${r.id}`,
        });
      });
      (b.data ?? []).forEach((r) => {
        resultaat.push({
          type: "bureau",
          id: r.id,
          titel: r.naam,
          url: `/bureaus/${r.id}`,
        });
      });
      (o.data ?? []).forEach((r) => {
        resultaat.push({
          type: "opdrachtgever",
          id: r.id,
          titel: r.bedrijfsnaam,
          ondertitel: r.contactpersoon ?? undefined,
          url: `/opdrachtgevers/${r.id}`,
        });
      });

      if (geannuleerd) return; // race-condition guard
      setHits(resultaat);
      setActief(0);
      setBezig(false);
    }, 200);

    return () => {
      geannuleerd = true;
      clearTimeout(handle);
    };
  }, [zoekterm, supabase]);

  function navigeer(h: Hit) {
    setOpen(false);
    router.push(h.url);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActief((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActief((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hits[actief]) navigeer(hits[actief]);
    }
  }

  return (
    <>
      {/* Triggerknop in topbar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-full shadow-sm text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Search size={14} />
        <span className="hidden sm:inline">Snel zoeken...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 rounded border border-gray-200">
          ⌘K
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Search size={18} className="text-gray-400" />
              <input
                ref={inputRef}
                value={zoekterm}
                onChange={(e) => setZoekterm(e.target.value)}
                onKeyDown={onKey}
                placeholder="Zoek kandidaat, bureau, opdrachtgever..."
                className="flex-1 outline-none text-sm placeholder-gray-400"
              />
              {bezig && <Loader2 size={16} className="animate-spin text-gray-400" />}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Resultaten */}
            <div className="max-h-96 overflow-y-auto">
              {hits.length === 0 && zoekterm && !bezig && (
                <div className="p-6 text-center text-sm text-gray-500">
                  Geen resultaten voor &quot;{zoekterm}&quot;
                </div>
              )}
              {hits.length === 0 && !zoekterm && (
                <div className="p-6 text-center text-sm text-gray-400">
                  Begin met typen om te zoeken...
                </div>
              )}
              {hits.map((h, i) => (
                <button
                  key={`${h.type}-${h.id}`}
                  onClick={() => navigeer(h)}
                  onMouseEnter={() => setActief(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i === actief ? "bg-[#333399]/5" : "hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      i === actief
                        ? "bg-[#333399] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ICOON[h.type]}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-800 truncate">
                      {h.titel}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">
                      {LABEL[h.type]}
                      {h.ondertitel && ` · ${h.ondertitel}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[11px] text-gray-500">
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↑↓</kbd> navigeren
                <kbd className="ml-2 px-1.5 py-0.5 bg-white border border-gray-200 rounded">↵</kbd> openen
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">esc</kbd> sluiten
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
