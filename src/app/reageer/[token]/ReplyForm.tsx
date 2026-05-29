"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { verstuurReply } from "@/app/users/aanvragen-actions";

type Props = {
  token: string;
  aanvragerNaam: string;
  aanvragerEmail: string;
};

export function ReplyForm({ token, aanvragerNaam, aanvragerEmail }: Props) {
  const [bericht, setBericht] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [klaar, setKlaar] = useState(false);

  async function verstuur() {
    if (!bericht.trim()) return;
    setBezig(true);
    setFout(null);
    const r = await verstuurReply({ token, bericht: bericht.trim() });
    setBezig(false);
    if (!r.ok) {
      setFout(r.error ?? "Versturen mislukt");
      return;
    }
    setKlaar(true);
  }

  if (klaar) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">Antwoord verstuurd!</h3>
        <p className="text-white/70 text-sm">
          <b className="text-white">{aanvragerNaam}</b> ({aanvragerEmail}) heeft je
          bericht ontvangen.
        </p>
      </div>
    );
  }

  return (
    <>
      <label className="block text-sm font-semibold text-white/80 mb-2">
        Jouw antwoord aan <span className="text-[#ffd84d]">{aanvragerNaam}</span>
      </label>
      <textarea
        value={bericht}
        onChange={(e) => setBericht(e.target.value)}
        disabled={bezig}
        rows={6}
        placeholder="Bijvoorbeeld: 'E-mailadres is aangemaakt: voornaam@grywo.nl, wachtwoord volgt apart.'"
        className="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 rounded-lg focus:outline-none focus:border-[#ffd84d] focus:bg-white/10 transition resize-none"
      />

      {fout && (
        <div className="mt-3 bg-red-500/10 border border-red-400/40 text-red-200 text-sm rounded-lg p-3">
          {fout}
        </div>
      )}

      <button
        type="button"
        onClick={verstuur}
        disabled={bezig || !bericht.trim()}
        className="mt-4 w-full bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#333399] font-bold py-3.5 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
      >
        {bezig ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Versturen…
          </>
        ) : (
          <>
            <Send size={16} />
            Verzenden naar {aanvragerNaam}
          </>
        )}
      </button>
    </>
  );
}
