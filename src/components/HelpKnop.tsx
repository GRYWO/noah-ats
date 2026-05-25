"use client";

import { useState, useTransition } from "react";
import { HelpCircle, X, MessageCircleQuestion, AlertCircle, Loader2, Check, Send } from "lucide-react";
import { verstuurHelpVraag } from "@/app/help-actions";

type Stap = "keuze" | "vraag" | "probleem" | "verzonden";

export function HelpKnop() {
  const [open, setOpen] = useState(false);
  const [stap, setStap] = useState<Stap>("keuze");
  const [bericht, setBericht] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStap("keuze");
    setBericht("");
    setFout(null);
  }

  function sluit() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  function versturen(type: "vraag" | "probleem") {
    if (!bericht.trim()) return;
    setFout(null);
    const fd = new FormData();
    fd.append("type", type);
    fd.append("bericht", bericht);
    startTransition(async () => {
      const r = await verstuurHelpVraag(fd);
      if (r?.ok) {
        setStap("verzonden");
        setBericht("");
        setTimeout(sluit, 1800);
      } else {
        setFout(r?.error ?? "Versturen mislukt");
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Hulp nodig?"
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-800"
      >
        <HelpCircle size={20} strokeWidth={1.8} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={sluit}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800 inline-flex items-center gap-2">
                <HelpCircle size={16} /> Hulp & support
              </h2>
              <button onClick={sluit} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {stap === "keuze" && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">
                    Yorith krijgt direct een melding en kan reageren.
                  </p>
                  <button
                    onClick={() => setStap("vraag")}
                    className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-[#333399] hover:bg-[#333399]/5 transition flex items-start gap-3"
                  >
                    <MessageCircleQuestion size={20} className="text-[#333399] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-800">Ik heb een vraag</div>
                      <div className="text-xs text-gray-500 mt-0.5">Bv. hoe iets werkt of waar je iets vindt</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setStap("probleem")}
                    className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-red-500 hover:bg-red-50 transition flex items-start gap-3"
                  >
                    <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-800">Ik wil een probleem melden</div>
                      <div className="text-xs text-gray-500 mt-0.5">Bv. een bug, fout of iets dat niet werkt</div>
                    </div>
                  </button>
                </div>
              )}

              {(stap === "vraag" || stap === "probleem") && (
                <div className="space-y-3">
                  <button
                    onClick={() => setStap("keuze")}
                    className="text-xs text-gray-500 hover:text-gray-700 mb-1"
                  >
                    ← Terug
                  </button>
                  <div className={`text-sm font-semibold inline-flex items-center gap-2 ${stap === "probleem" ? "text-red-700" : "text-[#333399]"}`}>
                    {stap === "probleem" ? <AlertCircle size={14} /> : <MessageCircleQuestion size={14} />}
                    {stap === "probleem" ? "Probleem melden" : "Stel je vraag"}
                  </div>
                  <textarea
                    value={bericht}
                    onChange={(e) => setBericht(e.target.value)}
                    rows={5}
                    autoFocus
                    placeholder={stap === "probleem"
                      ? "Beschrijf zo precies mogelijk wat er niet werkt. Welke pagina, wat probeerde je te doen, wat gebeurde er?"
                      : "Waar kunnen we je mee helpen?"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
                  />
                  {fout && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{fout}</div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={sluit}
                      disabled={pending}
                      className="text-sm text-gray-600 hover:underline px-3 py-1.5"
                    >
                      Annuleer
                    </button>
                    <button
                      onClick={() => versturen(stap === "vraag" ? "vraag" : "probleem")}
                      disabled={pending || !bericht.trim()}
                      className={`text-white font-semibold px-5 py-2 rounded-md text-sm disabled:opacity-50 inline-flex items-center gap-2 ${
                        stap === "probleem" ? "bg-red-600 hover:bg-red-700" : "bg-[#333399] hover:bg-[#2a2a80]"
                      }`}
                    >
                      {pending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Verstuur
                    </button>
                  </div>
                </div>
              )}

              {stap === "verzonden" && (
                <div className="text-center py-6">
                  <Check size={36} className="mx-auto text-emerald-600 mb-2" />
                  <p className="text-sm font-semibold text-emerald-700">Bericht verstuurd</p>
                  <p className="text-xs text-gray-500 mt-1">Yorith ziet het meteen en kan reageren via je notificaties.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
