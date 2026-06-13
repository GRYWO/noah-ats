"use client";

import { useState } from "react";
import { CheckCircle2, Send, Loader2, X } from "lucide-react";
import { stuurBevestiging } from "./aanvragen-actions";

export function BevestigingKnop() {
  const [open, setOpen] = useState(false);
  const [bericht, setBericht] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [verstuurd, setVerstuurd] = useState(false);

  async function verstuur() {
    if (!bericht.trim()) return;
    setBezig(true);
    setFout(null);
    const r = await stuurBevestiging({ bericht: bericht.trim() });
    setBezig(false);
    if (!r.ok) {
      setFout(r.error ?? "Versturen mislukt");
      return;
    }
    setVerstuurd(true);
    setTimeout(() => {
      setVerstuurd(false);
      setBericht("");
      setOpen(false);
    }, 2200);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 mt-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
      >
        <CheckCircle2 size={14} />
        Bevestigd
      </button>
    );
  }

  if (verstuurd) {
    return (
      <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 inline-flex items-center gap-2 text-sm text-emerald-700 font-semibold">
        <CheckCircle2 size={16} />
        Bericht verstuurd naar info@noah-recruitment.nl
      </div>
    );
  }

  return (
    <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2 max-w-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-emerald-800 inline-flex items-center gap-1.5">
          <CheckCircle2 size={14} />
          Bericht naar Noah recruitment (info@noah-recruitment.nl)
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={bezig}
          className="text-emerald-700 hover:text-emerald-900"
        >
          <X size={14} />
        </button>
      </div>

      <textarea
        value={bericht}
        onChange={(e) => setBericht(e.target.value)}
        disabled={bezig}
        rows={3}
        placeholder="Typ je bericht — bv. 'E-mail + Voys-nummer ontvangen, alles werkt'…"
        className="w-full px-3 py-2 border border-emerald-300 rounded-md text-sm bg-white focus:outline-none focus:border-emerald-500"
      />

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-md p-2">
          {fout}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={bezig}
          className="px-3 py-1.5 text-xs text-gray-600 hover:bg-white rounded-md"
        >
          Annuleren
        </button>
        <button
          type="button"
          onClick={verstuur}
          disabled={bezig || !bericht.trim()}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-1.5 rounded-md text-xs"
        >
          {bezig ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Versturen…
            </>
          ) : (
            <>
              <Send size={12} />
              Verzenden
            </>
          )}
        </button>
      </div>
    </div>
  );
}
