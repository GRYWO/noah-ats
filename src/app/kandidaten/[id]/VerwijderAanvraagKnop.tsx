"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Check } from "lucide-react";
import { vraagVerwijderingAan } from "./verwijder-verzoek-actions";

/**
 * Knop voor setters om verwijdering van een kandidaat aan te vragen.
 * Geen directe delete: opent een waarschuwingsmodal, daarna mailflow naar recruiter.
 */
export function VerwijderAanvraagKnop({
  kandidaatId,
  alOpenVerzoek,
}: {
  kandidaatId: string;
  alOpenVerzoek: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reden, setReden] = useState("");
  const [bezig, startTransition] = useTransition();
  const [resultaat, setResultaat] = useState<"ok" | string | null>(null);
  const [mailNaar, setMailNaar] = useState<string | null>(null);
  const router = useRouter();

  if (alOpenVerzoek && !open) {
    return (
      <div className="text-sm px-4 py-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md inline-flex items-center gap-2">
        <AlertTriangle size={14} />
        Verwijder-verzoek staat open bij recruiter
      </div>
    );
  }

  function aanvragen() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("kandidaat_id", kandidaatId);
      if (reden.trim()) fd.append("reden", reden.trim());
      const r = await vraagVerwijderingAan(fd);
      if (r.ok) {
        setResultaat("ok");
        setMailNaar(r.mailNaar ?? null);
        setTimeout(() => {
          setOpen(false);
          router.refresh();
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
        className="text-red-600 hover:text-red-700 text-sm px-4 py-2"
      >
        Verwijderen aanvragen
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
                  De recruiter ontvangt nu een mail om goedkeuring te geven.
                </p>
                {mailNaar && (
                  <p className="text-xs text-gray-500">
                    Verstuurd naar: <b>{mailNaar}</b>
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-1">Let op!</h2>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Een kandidaat verwijderen is <b>alleen mogelijk door goedkeuring van de recruiter</b>. Wil je dit verzoek doorzetten?
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Reden (optioneel)
                  </label>
                  <textarea
                    value={reden}
                    onChange={(e) => setReden(e.target.value)}
                    placeholder="bv. dubbele kandidaat, niet bereikbaar..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                  />
                </div>

                {typeof resultaat === "string" && resultaat !== "ok" && (
                  <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
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
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {bezig && <Loader2 size={14} className="animate-spin" />}
                    Verzoek doorzetten
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
