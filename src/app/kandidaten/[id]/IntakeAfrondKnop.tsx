"use client";

import { useFormStatus } from "react-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { rondIntakeAf } from "./intake-actions";

function Knop() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-md text-sm"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
      Interne intake afronden
    </button>
  );
}

export function IntakeAfrondKnop({ kandidaatId, heeftCv }: { kandidaatId: string; heeftCv: boolean }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h3 className="font-bold text-amber-900 text-sm">Interne intake nog open</h3>
        <p className="text-xs text-amber-800 mt-0.5">
          Rond af zodra alle gegevens kloppen. Kandidaat krijgt een mail{" "}
          {heeftCv ? "en gaat door naar de wachtrij." : "en gaat naar 'in afwachting van CV'."}
        </p>
      </div>
      <form action={rondIntakeAf}>
        <input type="hidden" name="kandidaat_id" value={kandidaatId} />
        <Knop />
      </form>
    </div>
  );
}
