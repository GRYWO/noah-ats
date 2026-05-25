"use client";

import { useState, useTransition } from "react";
import { MessageSquare, X, Loader2, Check } from "lucide-react";
import { contactOpnemenMetRecruiter } from "./contact-actions";

export function ContactRecruiterKnop({ kandidaatId }: { kandidaatId: string }) {
  const [open, setOpen] = useState(false);
  const [bericht, setBericht] = useState("");
  const [pending, startTransition] = useTransition();
  const [verstuurd, setVerstuurd] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  function verzenden() {
    if (!bericht.trim()) return;
    setFout(null);
    const fd = new FormData();
    fd.append("kandidaat_id", kandidaatId);
    fd.append("bericht", bericht);
    startTransition(async () => {
      const r = await contactOpnemenMetRecruiter(fd);
      if (r?.error) {
        setFout(r.error);
      } else {
        setVerstuurd(true);
        setBericht("");
        setTimeout(() => { setOpen(false); setVerstuurd(false); }, 1500);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-md text-sm"
      >
        <MessageSquare size={14} /> Neem contact op met recruiter
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !pending && setOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
                <MessageSquare size={14} /> Bericht aan recruiter
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700" disabled={pending}>
                <X size={14} />
              </button>
            </div>
            <div className="p-5">
              {verstuurd ? (
                <div className="text-center py-8">
                  <Check size={32} className="mx-auto text-emerald-600 mb-2" />
                  <p className="text-sm text-emerald-700 font-semibold">Bericht verstuurd</p>
                </div>
              ) : (
                <>
                  <textarea
                    value={bericht}
                    onChange={(e) => setBericht(e.target.value)}
                    rows={5}
                    autoFocus
                    placeholder="Stel je vraag of geef een update over deze kandidaat..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  {fout && <div className="text-xs text-red-600 mt-2">{fout}</div>}
                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => setOpen(false)} disabled={pending} className="text-sm text-gray-600 hover:underline px-3 py-1.5">
                      Annuleren
                    </button>
                    <button
                      onClick={verzenden}
                      disabled={pending || !bericht.trim()}
                      className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {pending && <Loader2 size={12} className="animate-spin" />}
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
