"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Calendar, Check } from "lucide-react";
import { reageerCoaching } from "./actions";

function Knop() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-60 text-white font-semibold px-3 py-1.5 rounded-md text-xs"
    >
      {pending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
      Reactie sturen
    </button>
  );
}

export function CoachingAanvraagItem({
  id,
  setterNaam,
  bericht,
  status,
  created_at,
}: {
  id: string;
  setterNaam: string;
  bericht: string | null;
  status: string;
  created_at: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-800">{setterNaam}</div>
          <div className="text-xs text-gray-400 mb-1">
            {new Date(created_at).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
            {status === "gepland" && <span className="ml-2 text-emerald-700 font-semibold">· Ingepland</span>}
          </div>
          {bericht && <p className="text-sm text-gray-700 whitespace-pre-wrap">{bericht}</p>}
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs font-semibold text-[#333399] hover:underline shrink-0"
        >
          {open ? "Sluiten" : "Reageren / inplannen"}
        </button>
      </div>

      {open && (
        <form action={reageerCoaching} className="mt-4 border-t pt-3 space-y-3">
          <input type="hidden" name="id" value={id} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                <Calendar size={11} className="inline mr-1" /> Geplande datum
              </label>
              <input
                type="datetime-local"
                name="geplande_datum"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Status</label>
              <select name="status" defaultValue="gepland" className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs">
                <option value="gepland">Gepland</option>
                <option value="afgerond">Afgerond</option>
                <option value="geannuleerd">Geannuleerd</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Bericht aan setter</label>
            <textarea
              name="reactie"
              rows={2}
              placeholder="bv. Donderdag 14:00 in mijn agenda — Google Meet link volgt."
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs"
            />
          </div>
          <div className="flex justify-end">
            <Knop />
          </div>
        </form>
      )}
    </div>
  );
}
