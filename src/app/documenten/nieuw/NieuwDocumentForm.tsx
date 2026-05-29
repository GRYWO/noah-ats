"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, Send, Loader2, FileText } from "lucide-react";
import { verstuurDocument } from "../actions";

type Ondertekenaar = { voornaam: string; achternaam: string; email: string };

export function NieuwDocumentForm() {
  const [bestand, setBestand] = useState<File | null>(null);
  const [ondertekenaars, setOndertekenaars] = useState<Ondertekenaar[]>([
    { voornaam: "", achternaam: "", email: "" },
  ]);
  const [bezig, setBezig] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function update(i: number, veld: keyof Ondertekenaar, waarde: string) {
    setOndertekenaars((prev) => {
      const kop = [...prev];
      kop[i] = { ...kop[i], [veld]: waarde };
      return kop;
    });
  }

  function voegToe() {
    setOndertekenaars((prev) => [...prev, { voornaam: "", achternaam: "", email: "" }]);
  }

  function verwijder(i: number) {
    setOndertekenaars((prev) => prev.filter((_, idx) => idx !== i));
  }

  const compleet =
    bestand !== null &&
    ondertekenaars.length > 0 &&
    ondertekenaars.every((o) => o.voornaam.trim() && o.achternaam.trim() && o.email.trim());

  return (
    <form
      ref={formRef}
      action={verstuurDocument}
      onSubmit={() => setBezig(true)}
      encType="multipart/form-data"
      className="space-y-6"
    >
      {/* Titel + beschrijving */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Document-info</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Titel *</label>
            <input
              name="titel"
              required
              placeholder="bv. Samenwerkingsovereenkomst GRYWO × ABC B.V."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Beschrijving (optioneel)</label>
            <textarea
              name="beschrijving"
              rows={2}
              placeholder="Korte uitleg die in de mail komt te staan..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
            />
          </div>
        </div>
      </section>

      {/* PDF upload */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">PDF document</h2>
        <input
          ref={fileRef}
          type="file"
          name="pdf"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setBestand(e.target.files?.[0] ?? null)}
        />
        {!bestand ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 hover:border-[#333399] rounded-xl p-8 text-center transition-colors"
          >
            <Upload size={28} className="mx-auto mb-2 text-gray-400" />
            <div className="text-sm font-semibold text-gray-700">Kies PDF</div>
            <div className="text-xs text-gray-500 mt-0.5">Max 20 MB</div>
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="w-10 h-10 bg-[#333399]/10 text-[#333399] rounded-lg flex items-center justify-center">
              <FileText size={18} />
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
      </section>

      {/* Ondertekenaars */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 pb-2 border-b">
          <h2 className="font-bold text-gray-800">Ondertekenaars</h2>
          <span className="text-xs text-gray-500">
            {ondertekenaars.length} {ondertekenaars.length === 1 ? "persoon" : "personen"} (parallel)
          </span>
        </div>

        <div className="space-y-3">
          {ondertekenaars.map((o, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="col-span-12 md:col-span-3">
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Voornaam</label>
                <input
                  value={o.voornaam}
                  onChange={(e) => update(i, "voornaam", e.target.value)}
                  required
                  placeholder="Jan"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                />
              </div>
              <div className="col-span-12 md:col-span-3">
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Achternaam</label>
                <input
                  value={o.achternaam}
                  onChange={(e) => update(i, "achternaam", e.target.value)}
                  required
                  placeholder="de Vries"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                />
              </div>
              <div className="col-span-11 md:col-span-5">
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">E-mailadres</label>
                <input
                  type="email"
                  value={o.email}
                  onChange={(e) => update(i, "email", e.target.value)}
                  required
                  placeholder="jan@abc.nl"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                />
              </div>
              <div className="col-span-1 flex items-end justify-end">
                {ondertekenaars.length > 1 && (
                  <button
                    type="button"
                    onClick={() => verwijder(i)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md mt-5"
                    title="Verwijder ondertekenaar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={voegToe}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#333399] bg-[#333399]/10 hover:bg-[#333399]/20 rounded-md"
        >
          Ondertekenaar toevoegen
        </button>

        <input type="hidden" name="ondertekenaars" value={JSON.stringify(ondertekenaars)} />
      </section>

      {/* Submit */}
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="text-xs text-amber-800">
          ⚖ Rechtsgeldig (eIDAS Simple Electronic Signature). Audit-trail met IP + tijdstip wordt automatisch toegevoegd.
        </div>
        <button
          type="submit"
          disabled={!compleet || bezig}
          className="bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-lg text-sm inline-flex items-center gap-2 shadow-sm"
        >
          {bezig ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Verzenden…
            </>
          ) : (
            <>
              <Send size={14} />
              Verzenden naar {ondertekenaars.length} {ondertekenaars.length === 1 ? "persoon" : "personen"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
