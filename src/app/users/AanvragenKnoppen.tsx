"use client";

import { useState } from "react";
import { Mail, Phone, X, Loader2, CheckCircle2 } from "lucide-react";
import { vraagAan } from "./aanvragen-actions";

type Type = "email" | "voys";

export function AanvragenKnop({ type }: { type: Type }) {
  const [open, setOpen] = useState(false);
  const [voornaam, setVoornaam] = useState("");
  const [achternaam, setAchternaam] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [klaar, setKlaar] = useState(false);

  const label = type === "email" ? "E-mailadres aanvragen" : "Voys-nummer aanvragen";
  const icoon = type === "email" ? <Mail size={14} /> : <Phone size={14} />;

  async function verstuur() {
    setBezig(true);
    setFout(null);
    const r = await vraagAan({ type, voornaam: voornaam.trim(), achternaam: achternaam.trim() });
    setBezig(false);
    if (!r.ok) {
      setFout(r.error ?? "Aanvraag mislukt");
      return;
    }
    setKlaar(true);
    setTimeout(() => {
      setOpen(false);
      setKlaar(false);
      setVoornaam("");
      setAchternaam("");
    }, 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1.5 text-xs font-semibold text-[#333399] bg-[#333399]/10 hover:bg-[#333399]/20 rounded-md transition-colors"
      >
        {icoon}
        {label} →
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !bezig && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="bg-[#333399] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icoon}
                <h3 className="font-bold text-base">{label}</h3>
              </div>
              {!bezig && (
                <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
                  <X size={18} />
                </button>
              )}
            </div>

            {klaar ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 size={28} />
                </div>
                <h4 className="font-bold text-gray-800 mb-1">Aanvraag verstuurd!</h4>
                <p className="text-sm text-gray-500">
                  Noah recruitment krijgt deze aanvraag binnen — meestal binnen 1 werkdag geregeld.
                </p>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Voor welke recruiter willen we{" "}
                  {type === "email" ? "een e-mailadres" : "een Voys-nummer"} aanmaken?
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Voornaam *</label>
                    <input
                      value={voornaam}
                      onChange={(e) => setVoornaam(e.target.value)}
                      disabled={bezig}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
                      placeholder="Jan"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Achternaam *</label>
                    <input
                      value={achternaam}
                      onChange={(e) => setAchternaam(e.target.value)}
                      disabled={bezig}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
                      placeholder="de Vries"
                    />
                  </div>
                </div>

                {fout && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-md p-2">
                    {fout}
                  </div>
                )}

                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-2.5">
                  📨 Een mail gaat automatisch naar <b>info@noah-recruitment.nl</b> met deze gegevens
                  + jouw bureau. Noah recruitment regelt het en stuurt het terug zodra klaar.
                </p>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={bezig}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                  >
                    Annuleren
                  </button>
                  <button
                    type="button"
                    onClick={verstuur}
                    disabled={bezig || !voornaam.trim() || !achternaam.trim()}
                    className="bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-2"
                  >
                    {bezig ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Versturen…
                      </>
                    ) : (
                      <>Aanvraag versturen</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
