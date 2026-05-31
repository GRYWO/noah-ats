"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";

/**
 * Toont een melding zodra de Rol-select op "Setter" staat.
 * Maakt de admin duidelijk dat de setter €250/mnd via Stripe gaat betalen.
 */
export function SetterAbonnementMelding() {
  const [isSetter, setIsSetter] = useState(true); // setter is default

  useEffect(() => {
    if (typeof document === "undefined") return;
    const rolSelect = document.querySelector('select[name="rol"]') as HTMLSelectElement | null;
    if (!rolSelect) return;
    setIsSetter(rolSelect.value === "setter");
    const handler = () => setIsSetter(rolSelect.value === "setter");
    rolSelect.addEventListener("change", handler);
    return () => rolSelect.removeEventListener("change", handler);
  }, []);

  if (!isSetter) return null;

  return (
    <div className="col-span-2 bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
      <CreditCard size={18} className="text-[#333399] mt-0.5 flex-shrink-0" />
      <div className="text-sm text-gray-700">
        <p className="font-semibold text-[#333399] mb-0.5">Setter-abonnement € 250 / maand</p>
        <p className="text-xs leading-relaxed">
          Setters sluiten zelf hun abonnement af via Stripe. Na het aanmaken krijgt de setter eerst de
          NDA per mail; daarna een betaallink van € 250/mnd. Pas na betaling is inloggen mogelijk.
          Maandelijks opzegbaar.
        </p>
      </div>
    </div>
  );
}
