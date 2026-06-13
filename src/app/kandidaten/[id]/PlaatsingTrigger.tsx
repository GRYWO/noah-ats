"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { PartyPopper, Undo2, X, Loader2 } from "lucide-react";
import { PlaatsingDialog } from "./PlaatsingDialog";
import { keurAfPlaatsing } from "./plaatsing-actions";

type VoorstelOpt = React.ComponentProps<typeof PlaatsingDialog>["voorstellen"][number];

function AfkeurKnop() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-2"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
      Plaatsing afkeuren
    </button>
  );
}

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
  const [afkeurOpen, setAfkeurOpen] = useState(false);

  if (alAangemeld) {
    return (
      <>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg p-3 inline-flex items-center gap-2">
            <PartyPopper size={14} />
            Plaatsing is aangemeld bij backoffice.
          </div>
          {isAdmin && plaatsingId && (
            <button
              type="button"
              onClick={() => setAfkeurOpen(true)}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 border border-red-300 text-red-700 font-semibold px-3 py-2 rounded-md text-sm"
            >
              <Undo2 size={13} /> Afkeuren
            </button>
          )}
        </div>

        {afkeurOpen && plaatsingId && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="font-bold text-gray-800">Plaatsing afkeuren</h2>
                <button onClick={() => setAfkeurOpen(false)} className="text-gray-400 hover:text-gray-700">
                  <X size={18} />
                </button>
              </div>
              <form action={keurAfPlaatsing} className="p-6 space-y-4">
                <input type="hidden" name="plaatsing_id" value={plaatsingId} />
                <input type="hidden" name="kandidaat_id" value={kandidaatId} />

                <div className="bg-red-50 border border-red-200 text-red-900 text-sm rounded-md p-3">
                  De plaatsing wordt afgekeurd, backoffice@noah-recruitment.nl krijgt een mail met
                  de reden en wie heeft afgekeurd. De kandidaat keert terug naar
                  &quot;in proces&quot;.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Reden voor afkeuring *
                  </label>
                  <textarea
                    name="reden"
                    required
                    rows={4}
                    autoFocus
                    placeholder="Waarom wordt de plaatsing afgekeurd?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setAfkeurOpen(false)}
                    className="text-sm text-gray-600 hover:underline px-4 py-2"
                  >
                    Annuleer
                  </button>
                  <AfkeurKnop />
                </div>
              </form>
            </div>
          </div>
        )}
      </>
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
