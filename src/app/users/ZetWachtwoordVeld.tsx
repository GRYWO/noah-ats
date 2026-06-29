"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Check } from "lucide-react";
import { zetWachtwoordHandmatig } from "./zet-wachtwoord-actions";

// Alleen voor super-admin: zet handmatig een zelfgekozen wachtwoord op een account.
export function ZetWachtwoordVeld() {
  const [pending, startTransition] = useTransition();
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");

  function opslaan() {
    setMelding(null);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("wachtwoord", wachtwoord);
    startTransition(async () => {
      const r = await zetWachtwoordHandmatig(fd);
      if (r?.ok) {
        setMelding({ ok: true, tekst: `Wachtwoord ingesteld voor ${r.email}. De gebruiker kan nu inloggen.` });
        setWachtwoord("");
      } else {
        setMelding({ ok: false, tekst: r?.error ?? "Mislukt." });
      }
    });
  }

  return (
    <div className="mb-6 rounded-xl border border-[#333399]/20 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#333399]">
        <KeyRound size={15} />
        Wachtwoord handmatig instellen (super-admin)
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Zet direct een zelfgekozen wachtwoord op een account, ongeacht de rol. Geef het wachtwoord daarna zelf door aan de gebruiker.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e-mailadres van de gebruiker"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#333399]"
        />
        <input
          type="text"
          value={wachtwoord}
          onChange={(e) => setWachtwoord(e.target.value)}
          placeholder="nieuw wachtwoord"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#333399]"
        />
        <button
          type="button"
          onClick={opslaan}
          disabled={pending || !email || wachtwoord.length < 6}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#333399] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Instellen
        </button>
      </div>
      {melding && (
        <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${melding.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {melding.tekst}
        </div>
      )}
    </div>
  );
}
