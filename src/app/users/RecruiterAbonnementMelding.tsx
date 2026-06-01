"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

/**
 * Toont een melding zodra de Rol-select op "Recruiter" staat.
 * Maakt duidelijk dat het bureau-abonnement automatisch meeschaalt.
 */
export function RecruiterAbonnementMelding() {
  const [isRecruiter, setIsRecruiter] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const rolSelect = document.querySelector('select[name="rol"]') as HTMLSelectElement | null;
    // Hidden input (bureau-admin krijgt geen select, alleen hidden "recruiter")
    const hiddenRol = document.querySelector('input[name="rol"][type="hidden"]') as HTMLInputElement | null;
    const huidigeRol = rolSelect?.value ?? hiddenRol?.value ?? "";
    setIsRecruiter(huidigeRol === "recruiter");

    if (rolSelect) {
      const handler = () => setIsRecruiter(rolSelect.value === "recruiter");
      rolSelect.addEventListener("change", handler);
      return () => rolSelect.removeEventListener("change", handler);
    }
  }, []);

  if (!isRecruiter) return null;

  return (
    <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
      <TrendingUp size={18} className="text-amber-700 mt-0.5 flex-shrink-0" />
      <div className="text-sm text-gray-700">
        <p className="font-semibold text-amber-900 mb-1">Abonnement schaalt automatisch mee</p>
        <p className="text-xs leading-relaxed mb-2">
          Het bureau-abonnement wordt automatisch aangepast op basis van het aantal recruiters:
        </p>
        <ul className="text-xs space-y-0.5 ml-2">
          <li>• <b>1 recruiter</b> → Starter (€ 5.000 / mnd)</li>
          <li>• <b>2-3 recruiters</b> → Pro (€ 10.000 / mnd)</li>
          <li>• <b>4+ recruiters</b> → Enterprise (€ 15.000 / mnd)</li>
        </ul>
        <p className="text-[11px] text-amber-700 mt-2 italic">
          Stripe past prorata toe — bureau betaalt alleen voor de extra dagen tot de volgende factuur.
        </p>
      </div>
    </div>
  );
}
