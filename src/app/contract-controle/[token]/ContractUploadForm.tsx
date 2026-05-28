"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, FileCheck } from "lucide-react";
import { verwerkContractUpload } from "./actions";

type Props = {
  token: string;
  kandidaatNaam: string;
};

export function ContractUploadForm({ token, kandidaatNaam }: Props) {
  const [bestand, setBestand] = useState<File | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [klaar, setKlaar] = useState<{ salaris: number | null; functie: string | null } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function verstuur() {
    if (!bestand) return;
    setBezig(true);
    setFout(null);
    const fd = new FormData();
    fd.append("token", token);
    fd.append("contract", bestand);
    const r = await verwerkContractUpload(fd);
    if (!r.ok) {
      setFout(r.error ?? "Verwerking mislukt");
      setBezig(false);
      return;
    }
    setKlaar({ salaris: r.salaris ?? null, functie: r.functie ?? null });
    setBezig(false);
  }

  if (klaar) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-4">
          <FileCheck size={32} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Verwerkt en verzonden!</h3>
        <p className="text-white/70 text-sm mb-4">
          Het contract van <b className="text-white">{kandidaatNaam}</b> is geanalyseerd, geredacteerd en doorgestuurd naar onze backoffice voor facturatie.
        </p>
        {klaar.salaris && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/80 max-w-sm mx-auto">
            <div className="mb-1">
              <span className="text-white/50">Geverifieerd jaarsalaris:</span>{" "}
              <b className="text-[#ffd84d]">€ {klaar.salaris.toLocaleString("nl-NL")}</b>
            </div>
            {klaar.functie && (
              <div>
                <span className="text-white/50">Functie:</span> {klaar.functie}
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-white/40 mt-6">
          U mag deze pagina nu sluiten. Het originele contract wordt binnen 24 uur vernietigd.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-bold text-white text-base mb-4">Upload het arbeidscontract</h2>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setBestand(f);
        }}
      />

      {!bestand ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-white/20 hover:border-[#ffd84d]/50 rounded-xl p-10 text-center transition-colors group"
        >
          <Upload size={32} className="mx-auto mb-3 text-white/40 group-hover:text-[#ffd84d]" />
          <div className="text-sm font-semibold text-white mb-1">Kies PDF-bestand</div>
          <div className="text-xs text-white/50">Max 10 MB · alleen PDF</div>
        </button>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-[#ffd84d]/20 text-[#ffd84d] rounded-lg flex items-center justify-center flex-shrink-0">
                📄
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{bestand.name}</div>
                <div className="text-xs text-white/50">
                  {(bestand.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
            <button
              onClick={() => setBestand(null)}
              disabled={bezig}
              className="text-xs text-white/50 hover:text-white"
            >
              Wissel
            </button>
          </div>
        </div>
      )}

      {fout && (
        <div className="bg-red-500/10 border border-red-400/40 text-red-200 text-sm rounded-lg p-3 mb-4">
          {fout}
        </div>
      )}

      <button
        type="button"
        onClick={verstuur}
        disabled={!bestand || bezig}
        className="w-full bg-white hover:bg-white/90 text-[#333399] font-bold py-3.5 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {bezig ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Bezig met veilig verwerken... (10-30 sec)
          </>
        ) : (
          <>Verwerken & versturen →</>
        )}
      </button>

      <p className="text-[11px] text-white/40 text-center mt-3">
        Door te uploaden gaat u akkoord met onze{" "}
        <a href="/privacy" target="_blank" className="underline">
          privacyverklaring
        </a>
        .
      </p>
    </div>
  );
}
