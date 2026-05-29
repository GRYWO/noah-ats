"use client";

import { useState } from "react";
import { saveSetupFee } from "./actions";

export function SetupFeeForm({ huidigeFee }: { huidigeFee: number }) {
  const [eurStr, setEurStr] = useState((huidigeFee / 100).toFixed(2));
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBezig(true);
    const fd = new FormData(e.currentTarget);
    await saveSetupFee(fd);
    setBezig(false);
    setKlaar(true);
    setTimeout(() => setKlaar(false), 2000);
  }

  return (
    <form onSubmit={verstuur} className="flex items-end gap-2 flex-wrap">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Bedrag (€)</label>
        <input
          name="setup_fee_eur"
          value={eurStr}
          onChange={(e) => setEurStr(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm w-32"
          placeholder="495.00"
        />
      </div>
      <button
        type="submit"
        disabled={bezig}
        className="bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-md text-sm"
      >
        {bezig ? "Opslaan…" : "Opslaan"}
      </button>
      {klaar && <span className="text-xs text-emerald-600 font-semibold">✓ Opgeslagen</span>}
    </form>
  );
}
