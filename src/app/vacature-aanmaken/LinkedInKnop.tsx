"use client";

import { useState } from "react";

// Eén klik: kopieert het bericht (zinnetje + vacaturelink) naar het klembord,
// opent LinkedIn in een nieuw tabblad en toont een melding. In LinkedIn hoef je
// dan alleen 'Bericht' → plakken → versturen. (LinkedIn ondersteunt geen vooraf
// ingevuld bericht via een link.)
export function LinkedInKnop({ url, bericht }: { url: string; bericht: string }) {
  const [melding, setMelding] = useState("");
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(bericht);
          } catch {
            // klembord niet beschikbaar; LinkedIn opent alsnog
          }
          window.open(url, "_blank", "noopener,noreferrer");
          setMelding("Bericht gekopieerd — plak het in LinkedIn");
          setTimeout(() => setMelding(""), 4000);
        }}
        className="text-xs font-semibold text-[#0a66c2] hover:underline active:scale-95 transition"
      >
        LinkedIn + bericht
      </button>
      {melding && <span className="text-xs font-semibold text-emerald-700">{melding}</span>}
    </span>
  );
}
