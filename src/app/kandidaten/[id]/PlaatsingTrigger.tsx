"use client";

import { useState } from "react";
import { PartyPopper } from "lucide-react";
import { PlaatsingDialog } from "./PlaatsingDialog";

type VoorstelOpt = React.ComponentProps<typeof PlaatsingDialog>["voorstellen"][number];

export function PlaatsingTrigger({
  kandidaatId,
  kandidaatNaam,
  voorstellen,
  autoOpen = false,
  alAangemeld = false,
}: {
  kandidaatId: string;
  kandidaatNaam: string;
  voorstellen: VoorstelOpt[];
  autoOpen?: boolean;
  alAangemeld?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);

  if (alAangemeld) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg p-3 inline-flex items-center gap-2">
        <PartyPopper size={14} />
        Plaatsing is aangemeld bij backoffice.
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
