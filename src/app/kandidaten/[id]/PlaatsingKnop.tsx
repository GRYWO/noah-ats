"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PlaatsingModal } from "@/app/kanban/PlaatsingModal";

type Props = {
  kandidaatId: string;
  kandidaatNaam: string;
  alGeplaatst: boolean;
};

export function PlaatsingKnop({ kandidaatId, kandidaatNaam, alGeplaatst }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (alGeplaatst) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-semibold">
        <CheckCircle2 size={16} />
        Geplaatst
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition-colors"
      >
        <CheckCircle2 size={16} />
        Plaatsing aanmaken
      </button>

      <PlaatsingModal
        open={open}
        kandidaatId={kandidaatId}
        kandidaatNaam={kandidaatNaam}
        onAnnuleer={() => setOpen(false)}
        onSucces={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
