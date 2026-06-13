"use client";

import { useState, useEffect, useTransition } from "react";
import { AlertTriangle, Sparkles, AlertOctagon, X } from "lucide-react";
import { dismissSysteemMeldingVoorUser } from "@/app/systeem-meldingen/actions";

const DISMISS_STORAGE_KEY = "noah-systeem-melding-dismissed";

type Melding = {
  id: string;
  type: "let_op" | "update" | "storing";
  titel: string;
  bericht: string;
  aangemaakt_op: string;
};

const TYPE_META = {
  let_op: { label: "LET OP", icon: AlertTriangle },
  update: { label: "UPDATE", icon: Sparkles },
  storing: { label: "STORING", icon: AlertOctagon },
};

export function SysteemMeldingBanner({ melding }: { melding: Melding | null }) {
  const [open, setOpen] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [gehydrateerd, setGehydrateerd] = useState(false);
  const [, startTransition] = useTransition();

  // Laad bij mount welke melding-ID al is weggeklikt door deze user/browser.
  // Persistent in localStorage zodat 'Begrepen' onthouden wordt over
  // pagina-navigatie en sessies heen.
  useEffect(() => {
    try {
      const opgeslagen = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (opgeslagen) setDismissedId(opgeslagen);
    } catch {
      // localStorage kan in private mode geblokkeerd zijn — negeren
    }
    setGehydrateerd(true);
  }, []);

  function bewaarDismiss(id: string) {
    // Direct UI verbergen
    setDismissedId(id);
    // localStorage als snelle cache
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, id);
    } catch {
      // negeer
    }
    // Server-side opslaan zodat de melding ook op andere apparaten /
    // browsers permanent verborgen blijft voor deze user.
    startTransition(() => {
      dismissSysteemMeldingVoorUser(id).catch(() => {
        // Als de server-action faalt blijft de localStorage-cache hem
        // verbergen op dit apparaat — geen drama.
      });
    });
  }

  // Voorkom flash van banner tijdens hydration
  if (!gehydrateerd) return null;
  if (!melding || dismissedId === melding.id) return null;

  const meta = TYPE_META[melding.type] ?? TYPE_META.let_op;
  const Icon = meta.icon;

  return (
    <>
      {/* Rode balk bovenaan — klikbaar voor details + X-knop om direct weg te klikken */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-sm font-semibold shadow-lg flex items-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 hover:bg-red-700 transition cursor-pointer py-2 px-4 flex items-center justify-center gap-3"
        >
          <Icon size={18} className="animate-pulse shrink-0" />
          <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            {meta.label}
          </span>
          <span className="truncate max-w-[60vw]">{melding.titel}</span>
          <span className="text-white/80 text-xs underline">klik voor meer</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            bewaarDismiss(melding.id);
          }}
          className="hover:bg-red-700 transition cursor-pointer py-2 px-3 border-l border-white/20 flex items-center gap-1.5"
          title="Sluiten voor altijd"
          aria-label="Banner sluiten"
        >
          <X size={16} />
          <span className="hidden sm:inline text-xs">Sluiten</span>
        </button>
      </div>

      {/* Modal met volledige tekst */}
      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-20"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Icon size={22} />
                </div>
                <div>
                  <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {meta.label}
                  </span>
                  <h3 className="font-bold text-gray-900 text-base mt-1">{melding.titel}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{melding.bericht}</p>
            <p className="text-xs text-gray-400 mt-4">
              Geplaatst: {new Date(melding.aangemaakt_op).toLocaleString("nl-NL")}
            </p>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
              >
                Sluiten
              </button>
              <button
                type="button"
                onClick={() => {
                  bewaarDismiss(melding.id);
                  setOpen(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
              >
                Begrepen, verberg
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
