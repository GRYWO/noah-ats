"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
import { voegArchiefDocumentToe } from "./archief-actions";

export function ToevoegenKnop() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bestand, setBestand] = useState<File | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [klaar, setKlaar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    const fd = new FormData(e.currentTarget);
    const r = await voegArchiefDocumentToe(fd);
    setBezig(false);
    if (!r.ok) {
      setFout(r.error ?? "Toevoegen mislukt");
      return;
    }
    setKlaar(true);
    setTimeout(() => {
      setOpen(false);
      setKlaar(false);
      setBestand(null);
      formRef.current?.reset();
      router.refresh();
    }, 1500);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2.5 rounded-lg text-sm inline-flex items-center gap-2 shadow-sm"
      >
        Document toevoegen
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !bezig && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-[#333399] text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-base">Document toevoegen aan archief</h3>
              {!bezig && (
                <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
                  <X size={18} />
                </button>
              )}
            </div>

            {klaar ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="font-bold text-gray-800 mb-1">Toegevoegd aan archief!</h4>
              </div>
            ) : (
              <form ref={formRef} onSubmit={verstuur} className="p-5 space-y-4">
                <p className="text-xs text-gray-500">
                  Voeg een al ondertekend (extern) document toe aan het archief.
                  Wordt direct als &quot;voltooid&quot; opgeslagen, zonder signing-flow.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Titel *</label>
                  <input
                    name="titel"
                    required
                    placeholder="bv. Huurcontract kantoor Amsterdam 2026"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Beschrijving (optioneel)</label>
                  <textarea
                    name="beschrijving"
                    rows={2}
                    placeholder="Korte aantekening..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Datum getekend (optioneel)</label>
                  <input
                    type="date"
                    name="getekend_op"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">Leeg laten = vandaag.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Ondertekenaars (optioneel)</label>
                  <textarea
                    name="ondertekenaars"
                    rows={3}
                    placeholder={"Jan de Vries <jan@abc.nl>\nMaria Pietersen <maria@xyz.nl>"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399] font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    1 per regel: <code>Naam &lt;email&gt;</code> — verschijnt als groene chip bij het document.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">PDF *</label>
                  <input
                    ref={fileRef}
                    type="file"
                    name="pdf"
                    accept="application/pdf"
                    required
                    className="hidden"
                    onChange={(e) => setBestand(e.target.files?.[0] ?? null)}
                  />
                  {!bestand ? (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 hover:border-[#333399] rounded-lg p-5 text-center"
                    >
                      <Upload size={20} className="mx-auto mb-1 text-gray-400" />
                      <div className="text-sm font-semibold text-gray-700">Kies PDF</div>
                      <div className="text-xs text-gray-500">Max 20 MB</div>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="w-9 h-9 bg-[#333399]/10 text-[#333399] rounded-lg flex items-center justify-center">
                        <FileText size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{bestand.name}</div>
                        <div className="text-xs text-gray-500">{(bestand.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBestand(null);
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="text-xs text-gray-500 hover:text-red-600"
                      >
                        Wissel
                      </button>
                    </div>
                  )}
                </div>

                {fout && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-md p-2">
                    {fout}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={bezig}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    disabled={bezig || !bestand}
                    className="bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-2"
                  >
                    {bezig ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Opslaan…
                      </>
                    ) : (
                      <>Toevoegen aan archief</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
