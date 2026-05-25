"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, MessagesSquare, X, Send } from "lucide-react";
import { vraagCoachingMeetingAan } from "./actions";

function VerstuurKnop() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-md text-sm"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
      Verstuur aanvraag
    </button>
  );
}

export function CoachingKnop() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-white border border-[#333399] text-[#333399] hover:bg-[#333399]/5 font-semibold px-4 py-2 rounded-md text-sm"
      >
        <MessagesSquare size={14} /> 1-op-1 met Pepijn aanvragen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
                <MessagesSquare size={14} /> 1-op-1 aanvragen
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
            <form action={vraagCoachingMeetingAan} className="p-5 space-y-3">
              <p className="text-xs text-gray-500">
                Pepijn krijgt direct een melding en stuurt jou een uitnodiging zodra hij iets heeft ingepland.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Waarover wil je het hebben? (optioneel)</label>
                <textarea
                  name="bericht"
                  rows={4}
                  placeholder="Bijvoorbeeld: hulp bij omgaan met afwijzingen, doelen voor komende periode..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-600 hover:underline px-3 py-1.5">
                  Annuleer
                </button>
                <VerstuurKnop />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
