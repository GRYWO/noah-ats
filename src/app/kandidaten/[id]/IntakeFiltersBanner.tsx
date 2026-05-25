"use client";

import { useState } from "react";
import { Search, X, Check } from "lucide-react";
import { updateIntakeFilters, verbergIntakeFilters } from "./intake-actions";

type Props = {
  kandidaatId: string;
  voornaam: string;
  open_voor: string | null;
  woonplaats: string | null;
  max_reisafstand_km: number | null;
  blacklist_bedrijven: string | null;
  voltooid: boolean;
};

export function IntakeFiltersBanner(props: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (props.voltooid || dismissed) {
    // Compacte herinneringbalk als voltooid
    if (props.voltooid) {
      return (
        <details className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl">
          <summary className="px-5 py-3 cursor-pointer flex items-center gap-2 text-sm">
            <Check size={16} className="text-emerald-700" />
            <span className="text-emerald-800 font-semibold">Zoekfilters ingevuld</span>
            <span className="text-emerald-700 text-xs ml-2">— klik om aan te passen</span>
          </summary>
          <div className="px-5 pb-4 pt-1">
            <Form {...props} />
          </div>
        </details>
      );
    }
    return null;
  }

  return (
    <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-amber-700" />
          <h2 className="font-bold text-amber-900 text-sm">Zoekfilters voor {props.voornaam}</h2>
        </div>
        <form action={verbergIntakeFilters}>
          <input type="hidden" name="id" value={props.kandidaatId} />
          <button
            type="submit"
            title="Verberg (kun je later weer aanvullen)"
            onClick={() => setDismissed(true)}
            className="text-amber-700 hover:text-amber-900 p-1"
          >
            <X size={16} />
          </button>
        </form>
      </div>
      <div className="px-5 py-4">
        <Form {...props} />
      </div>
    </div>
  );
}

function Form(props: Props) {
  return (
    <form action={updateIntakeFilters} className="space-y-3">
      <input type="hidden" name="id" value={props.kandidaatId} />
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Open voor functies</label>
        <input
          name="open_voor"
          defaultValue={props.open_voor ?? ""}
          placeholder="bv. Installatiemonteur, Loodgieter, CV-monteur, Servicetechnicus"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Woonplaats</label>
          <input
            name="woonplaats"
            defaultValue={props.woonplaats ?? ""}
            placeholder="bv. Oisterwijk"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Max reisafstand (km)</label>
          <input
            name="max_reisafstand_km"
            type="number"
            min="0"
            max="500"
            defaultValue={props.max_reisafstand_km ?? ""}
            placeholder="bv. 30"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Niet bij deze bedrijven werken</label>
        <input
          name="blacklist_bedrijven"
          defaultValue={props.blacklist_bedrijven ?? ""}
          placeholder="bv. Feenstra, B&R (komma-gescheiden)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          name="voltooid"
          value="1"
          className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-1.5 rounded-md text-xs inline-flex items-center gap-1"
        >
          <Check size={14} /> Opslaan en markeer voltooid
        </button>
        <button
          type="submit"
          className="text-xs text-gray-600 hover:underline"
        >
          Tussentijds opslaan
        </button>
      </div>
    </form>
  );
}
