"use client";

import { useState } from "react";
import { PartyPopper, Undo2 } from "lucide-react";
import { PlaatsingDialog } from "./PlaatsingDialog";
import { verwijderPlaatsing } from "./plaatsing-actions";

type VoorstelOpt = React.ComponentProps<typeof PlaatsingDialog>["voorstellen"][number];

export function PlaatsingTrigger({
  kandidaatId,
  kandidaatNaam,
  voorstellen,
  autoOpen = false,
  alAangemeld = false,
  plaatsingId = null,
  isAdmin = false,
}: {
  kandidaatId: string;
  kandidaatNaam: string;
  voorstellen: VoorstelOpt[];
  autoOpen?: boolean;
  alAangemeld?: boolean;
  plaatsingId?: string | null;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);

  if (alAangemeld) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg p-3 inline-flex items-center gap-2">
          <PartyPopper size={14} />
          Plaatsing is aangemeld bij backoffice.
        </div>
        {isAdmin && plaatsingId && (
          <form
            action={verwijderPlaatsing}
            onSubmit={(e) => {
              if (!confirm("Plaatsing ongedaan maken? Status keert terug naar 'in proces'.")) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="plaatsing_id" value={plaatsingId} />
            <input type="hidden" name="kandidaat_id" value={kandidaatId} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 border border-red-300 text-red-700 font-semibold px-3 py-2 rounded-md text-sm"
            >
              <Undo2 size={13} /> Ongedaan maken
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-md text-sm"
      >
        <PartyPopper size={14} /> Plaatsing aanmelden
      </button>
      <PlaatsingDialog
        open={open}
        onClose={() => setOpen(false)}
        kandidaatId={kandidaatId}
        kandidaatNaam={kandidaatNaam}
        voorstellen={voorstellen}
      />
    </>
  );
}
