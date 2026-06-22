"use client";

import { useState } from "react";

// Kopieert een bericht (zinnetje + link) naar het klembord, zodat je het in
// LinkedIn (of elders) kunt plakken. LinkedIn ondersteunt geen vooraf ingevuld
// bericht via een link, dus kopiëren + plakken is de snelste nette weg.
export function KopieerBericht({ tekst, label = "Kopieer bericht" }: { tekst: string; label?: string }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(tekst);
          setGekopieerd(true);
          setTimeout(() => setGekopieerd(false), 1800);
        } catch {
          // klembord niet beschikbaar; stil falen
        }
      }}
      className="text-xs font-semibold text-gray-500 hover:underline active:scale-95 transition"
    >
      {gekopieerd ? "Gekopieerd!" : label}
    </button>
  );
}
