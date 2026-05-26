"use client";

import { useState, useTransition } from "react";
import { MessageCircle, X, Loader2, ThumbsUp, AlertTriangle } from "lucide-react";
import { stuurSetterReactie } from "./actions";

export function SetterReactieKnop({ setterId, setterNaam }: { setterId: string; setterNaam: string }) {
  const [open, setOpen] = useState(false);
  const [toon, setToon] = useState<"positief" | "alert">("positief");
  const [bericht, setBericht] = useState("");
  const [pending, startTransition] = useTransition();
  const [verzonden, setVerzonden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  function versturen() {
    if (!bericht.trim()) return;
    setFout(null);
    const fd = new FormData();
    fd.append("setter_id", setterId);
    fd.append("bericht", bericht);
    fd.append("toon", toon);
    startTransition(async () => {
      const r = await stuurSetterReactie(fd);
      if (r?.ok) {
        setVerzonden(true);
        setBericht("");
        setTimeout(() => { setOpen(false); setVerzonden(false); }, 1200);
      } else {
        setFout(r?.error ?? "Versturen mislukt");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#333399] hover:bg-[#333399]/5 px-2 py-1 rounded-md"
      >
        <MessageCircle size={11} /> Reactie sturen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !pending && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
                <MessageCircle size={14} /> Reactie aan {setterNaam}
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {verzonden ? (
                <p className="text-center text-emerald-700 font-semibold py-4">Reactie verstuurd ✓</p>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Type reactie</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setToon("positief")}
                        className={`border-2 rounded-md px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                          toon === "positief"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <ThumbsUp size={14} /> Positief / compliment
                      </button>
                      <button
                        type="button"
                        onClick={() => setToon("alert")}
                        className={`border-2 rounded-md px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                          toon === "alert"
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <AlertTriangle size={14} /> Alert / aandacht
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Bericht</label>
                    <textarea
                      value={bericht}
                      onChange={(e) => setBericht(e.target.value)}
                      rows={4}
                      autoFocus
                      placeholder={toon === "alert"
                        ? "bv. 'Let op je calls deze week — je doel is nog ver weg'"
                        : "bv. 'Top week! Lekker bezig met die afspraken'"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  {fout && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{fout}</div>}

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button onClick={() => setOpen(false)} disabled={pending} className="text-sm text-gray-600 hover:underline px-3 py-1.5">
                      Annuleer
                    </button>
                    <button
                      onClick={versturen}
                      disabled={pending || !bericht.trim()}
                      className={`text-white font-semibold px-5 py-2 rounded-md text-sm disabled:opacity-50 inline-flex items-center gap-2 ${
                        toon === "alert" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {pending ? <Loader2 size={12} className="animate-spin" /> : (toon === "alert" ? <AlertTriangle size={12} /> : <ThumbsUp size={12} />)}
                      Verstuur
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
