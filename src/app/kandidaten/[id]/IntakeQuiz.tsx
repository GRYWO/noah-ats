"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles } from "lucide-react";
import { updateIntakeAntwoorden } from "./intake-quiz-actions";

const VRAGEN: Record<string, { label: string; type: "tekst" | "getal" | "select"; opties?: string[]; placeholder?: string }> = {
  soort_dienstverband: { label: "Soort dienstverband", type: "select", opties: ["Fulltime", "Parttime", "Flex", "Stage"] },
  werving_of_uitzend:  { label: "Werving en selectie of uitzendbasis?", type: "select", opties: ["Werving en selectie", "Uitzendbasis", "Beide"] },
  salaris_indicatie:   { label: "Salaris indicatie (bruto per maand)", type: "tekst", placeholder: "bv. 3500 of 3500-4000" },
  max_reisafstand_km:  { label: "Maximale reisafstand (km)", type: "getal", placeholder: "bv. 30" },
  eigen_vervoer:       { label: "Eigen vervoer?", type: "select", opties: ["Ja", "Nee"] },
  rijbewijs:           { label: "Rijbewijs", type: "tekst", placeholder: "bv. B of geen" },
  blacklist_bedrijven: { label: "Bedrijven waar kandidaat NIET wil werken", type: "tekst", placeholder: "Komma-gescheiden, of laat leeg" },
  bijzonderheden:      { label: "Bijzonderheden", type: "tekst", placeholder: "Medisch, persoonlijk, etc." },
  tarief_ws:           { label: "Tarief W&S", type: "tekst", placeholder: "bv. 15% bruto jaarsalaris" },
  omrekenfactor_uitzendbasis: { label: "Omrekenfactor uitzendbasis", type: "tekst", placeholder: "bruto uurloon × factor = tarief" },
};

export function IntakeQuiz({
  kandidaatId,
  ontbrekend,
  intakeVoltooid,
}: {
  kandidaatId: string;
  ontbrekend: string[];
  intakeVoltooid: boolean;
}) {
  const [antwoorden, setAntwoorden] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Filter alleen vragen die we kennen
  const vragen = ontbrekend.filter(v => v in VRAGEN);

  if (intakeVoltooid && vragen.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800 inline-flex items-center gap-2">
        <Check size={14} /> Intake voltooid — alle benodigde info is bekend.
      </div>
    );
  }

  if (vragen.length === 0) {
    return (
      <p className="text-sm text-gray-500">Geen ontbrekende intake-vragen. AI heeft alles uit het CV gehaald.</p>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("id", kandidaatId);
    fd.append("antwoorden", JSON.stringify(antwoorden));
    startTransition(async () => {
      await updateIntakeAntwoorden(fd);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-amber-600" />
        <h3 className="text-sm font-bold text-amber-900">Intake-vragen die AI nog niet uit het CV kon halen:</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {vragen.map((veld) => {
          const v = VRAGEN[veld];
          return (
            <div key={veld}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{v.label}</label>
              {v.type === "select" ? (
                <select
                  value={antwoorden[veld] ?? ""}
                  onChange={(e) => setAntwoorden({ ...antwoorden, [veld]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="">—</option>
                  {v.opties?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={v.type === "getal" ? "number" : "text"}
                  value={antwoorden[veld] ?? ""}
                  onChange={(e) => setAntwoorden({ ...antwoorden, [veld]: e.target.value })}
                  placeholder={v.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={pending || Object.values(antwoorden).every(v => !v)}
          className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-1.5 rounded-md text-xs disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {pending && <Loader2 size={12} className="animate-spin" />}
          Antwoorden opslaan
        </button>
        <p className="text-xs text-gray-500">Sla op zodra je antwoorden hebt — onbeantwoord blijft openstaan.</p>
      </div>
    </form>
  );
}
