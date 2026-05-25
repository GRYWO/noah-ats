"use client";

import { useState } from "react";

export function BetaaldSelect({ defaultBetaald = false }: { defaultBetaald?: boolean }) {
  const [betaald, setBetaald] = useState(defaultBetaald);
  const klasse = betaald
    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
    : "border-red-300 bg-red-50 text-red-800";

  return (
    <select
      name="setup_fee_paid"
      value={betaald ? "true" : "false"}
      onChange={(e) => setBetaald(e.target.value === "true")}
      className={`w-full px-3 py-2 border rounded-md text-sm font-semibold ${klasse}`}
    >
      <option value="true">Betaald</option>
      <option value="false">Niet betaald</option>
    </select>
  );
}
