"use client";

import { useState } from "react";
import { Calendar, Check, X } from "lucide-react";
import { updateTweedeGesprek } from "./voorstel-actions";

function naarLokaleInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TweedeGesprekEdit({
  voorstelId,
  kandidaatId,
  huidigeDatum,
}: {
  voorstelId: string;
  kandidaatId: string;
  huidigeDatum: string | null;
}) {
  const [open, setOpen] = useState(false);
  const huidig = naarLokaleInput(huidigeDatum);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#333399] hover:bg-[#333399]/5 px-2 py-1 rounded-md"
      >
        <Calendar size={12} />
        {huidigeDatum ? "2e gesprek wijzigen" : "2e gesprek inplannen"}
      </button>
    );
  }

  return (
    <form action={updateTweedeGesprek} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="voorstel_id" value={voorstelId} />
      <input type="hidden" name="kandidaat_id" value={kandidaatId} />
      <input
        type="datetime-local"
        name="tweede_gesprek_op"
        defaultValue={huidig}
        className="text-xs px-2 py-1 border border-gray-300 rounded-md"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white"
        title="Opslaan"
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
        title="Annuleren"
      >
        <X size={14} />
      </button>
    </form>
  );
}
