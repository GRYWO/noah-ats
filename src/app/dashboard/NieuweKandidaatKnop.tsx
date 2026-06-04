"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, Check, X } from "lucide-react";
import { vraagNieuweKandidaatAan } from "./nieuwe-kandidaat-actions";

/**
 * Knop voor setters om handmatig een nieuwe kandidaat aan te vragen.
 * Mail gaat naar eerste beschikbare recruiter/admin in het bureau.
 * Werkt op elk moment — onafhankelijk van auto-toewijzing.
 */
export function NieuweKandidaatKnop() {
  const [open, setOpen] = useState(false);
  const [reden, setReden] = useState("");
  const [bezig, startTransition] = useTransition();
  const [resultaat, setResultaat] = useState<"ok" | string | null>(null);
  const [mailNaar, setMailNaar] = useState<string | null>(null);

  function aanvragen() {
    startTransition(async () => {
      const fd = new FormData();
      if (reden.trim()) fd.append("reden", reden.trim());
      const r = await vraagNieuweKandidaatAan(fd);
      if (r.ok) {
        setResultaat("ok");
        setMailNaar(r.mailNaar ?? null);
        setTimeout(() => {
          setOpen(false);
          setResultaat(null);
          setReden("");
        }, 4000);
      } else {
        setResultaat(r.error ?? "Onbekende fout");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResultaat(null);
          setReden("");
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition shadow-sm"
      >
        <Plus size={16} /> Nieuwe kandidaat aanvragen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            {resultaat === "ok" ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <Check size={28} />
                </div>
                <h2 className="text-xl font-bold mb-2">Verzoek verstuurd</h2>
                <p className="text-sm text-gray-600 mb-2">
                  De recruiter ontvangt een mail en wijst handmatig een kandidaat toe.
                </p>
                {mailNaar && (
                  <p className="text-xs text-gray-500">
                    Verstuurd naar: <b>{mailNaar}</b>
                  </p>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-2">Nieuwe kandidaat aanvragen</h2>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Een mail wordt gestuurd naar de eerste beschikbare recruiter in jouw bureau.
                  Hij kan handmatig een wachtende kandidaat aan jou toewijzen.
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Reden (optioneel)
                  </label>
                  <textarea
                    value={reden}
                    onChange={(e) => setReden(e.target.value)}
                    placeholder="bv. mijn huidige kandidaat is bijna afgerond, ik wil opbouwen..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                  />
                </div>

                {typeof resultaat === "string" && resultaat !== "ok" && (
                  <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded inline-flex items-start gap-1">
                    <X size={14} className="flex-shrink-0 mt-0.5" />
                    {resultaat}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2"
                  >
                    Annuleren
                  </button>
                  <button
                    type="button"
                    onClick={aanvragen}
                    disabled={bezig}
                    className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {bezig && <Loader2 size={14} className="animate-spin" />}
                    Verzoek versturen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
