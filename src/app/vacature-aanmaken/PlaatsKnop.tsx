"use client";

import { useFormStatus } from "react-dom";
import { plaatsKandidaatVanuitVacature } from "./actions";

// Plaats-knop die vanuit elke fase van de pijplijn werkt. Vraagt eerst om een
// bevestiging ("weet je het zeker?") omdat plaatsen automatisch mails verstuurt
// (backoffice + bij W&S de contract-uitnodiging naar de opdrachtgever).
function Knop() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-1.5 w-full justify-center rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 active:scale-95 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Plaatsen…" : "Plaats"}
    </button>
  );
}

export function PlaatsKnop({
  vacatureId,
  kandidaatId,
  naam,
}: {
  vacatureId: string;
  kandidaatId: string;
  naam: string;
}) {
  return (
    <form
      action={plaatsKandidaatVanuitVacature}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Weet je zeker dat je ${naam} wilt plaatsen?\n\n` +
              "Er gaat automatisch een mail naar de backoffice en — bij W&S — een contract-verzoek naar de opdrachtgever.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="vacature" value={vacatureId} />
      <input type="hidden" name="kandidaatId" value={kandidaatId} />
      <Knop />
    </form>
  );
}
