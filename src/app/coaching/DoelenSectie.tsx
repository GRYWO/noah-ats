"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Target, Loader2, Edit3, Check, X } from "lucide-react";
import { updateDoelen } from "./actions";

export type Doelen = {
  doel_calls_dag: number;
  doel_voorgesteld_week: number;
  doel_afspraken_week: number;
  doel_plaatsingen_maand: number;
  doel_omzet_maand: number;
};

export type Voortgang = {
  calls_vandaag: number;
  voorgesteld_week: number;
  afspraken_week: number;
  plaatsingen_maand: number;
  omzet_maand: number;
};

function OpslaanKnop() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-60 text-white font-semibold px-4 py-1.5 rounded-md text-xs"
    >
      {pending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
      Opslaan
    </button>
  );
}

export function DoelenSectie({ doelen, voortgang }: { doelen: Doelen; voortgang: Voortgang }) {
  const [open, setOpen] = useState(false);

  const items = [
    { label: "Calls / dag",          doel: doelen.doel_calls_dag,         huidig: voortgang.calls_vandaag,      eenheid: "vandaag" },
    { label: "Voorgesteld / week",   doel: doelen.doel_voorgesteld_week,  huidig: voortgang.voorgesteld_week,   eenheid: "deze week" },
    { label: "Afspraken / week",     doel: doelen.doel_afspraken_week,    huidig: voortgang.afspraken_week,     eenheid: "deze week" },
    { label: "Plaatsingen / maand",  doel: doelen.doel_plaatsingen_maand, huidig: voortgang.plaatsingen_maand,  eenheid: "deze maand" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <h2 className="font-bold text-gray-800 inline-flex items-center gap-2">
          <Target size={16} /> Mijn doelen
        </h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs font-semibold text-[#333399] hover:underline inline-flex items-center gap-1"
        >
          {open ? <><X size={11} /> Sluiten</> : <><Edit3 size={11} /> Doelen aanpassen</>}
        </button>
      </div>

      {!open && (
        <div className="space-y-3">
          {items.map((it) => {
            const pct = it.doel > 0 ? Math.min(100, Math.round((it.huidig / it.doel) * 100)) : 0;
            const klaar = it.doel > 0 && it.huidig >= it.doel;
            return (
              <div key={it.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-700">{it.label}</span>
                  <span className={`font-mono ${klaar ? "text-emerald-700 font-bold" : "text-gray-600"}`}>
                    {it.huidig} / {it.doel} <span className="text-gray-400">({it.eenheid})</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${klaar ? "bg-emerald-500" : pct >= 66 ? "bg-amber-500" : "bg-[#333399]"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700">Omzet / maand</span>
              <span className={`font-mono ${voortgang.omzet_maand >= doelen.doel_omzet_maand && doelen.doel_omzet_maand > 0 ? "text-emerald-700 font-bold" : "text-gray-600"}`}>
                € {Math.round(voortgang.omzet_maand).toLocaleString("nl-NL")} / € {Math.round(doelen.doel_omzet_maand).toLocaleString("nl-NL")}
              </span>
            </div>
            {doelen.doel_omzet_maand > 0 && (
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all ${
                    voortgang.omzet_maand >= doelen.doel_omzet_maand
                      ? "bg-emerald-500"
                      : voortgang.omzet_maand / doelen.doel_omzet_maand >= 0.66
                      ? "bg-amber-500"
                      : "bg-[#333399]"
                  }`}
                  style={{ width: `${Math.min(100, Math.round((voortgang.omzet_maand / doelen.doel_omzet_maand) * 100))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {open && (
        <form action={updateDoelen} className="space-y-3">
          <p className="text-xs text-gray-500 mb-2">
            Stel realistische doelen waar je dagelijks naartoe kunt werken. Probeer ze stapsgewijs te verhogen zodra je ze haalt.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <DoelInput label="Calls / dag" name="doel_calls_dag" defaultValue={doelen.doel_calls_dag} />
            <DoelInput label="Voorgesteld / week" name="doel_voorgesteld_week" defaultValue={doelen.doel_voorgesteld_week} />
            <DoelInput label="Afspraken / week" name="doel_afspraken_week" defaultValue={doelen.doel_afspraken_week} />
            <DoelInput label="Plaatsingen / maand" name="doel_plaatsingen_maand" defaultValue={doelen.doel_plaatsingen_maand} />
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Omzet / maand (€)</label>
              <input
                type="number"
                name="doel_omzet_maand"
                min="0"
                step="100"
                defaultValue={doelen.doel_omzet_maand}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-600 hover:underline px-3 py-1.5">
              Annuleer
            </button>
            <OpslaanKnop />
          </div>
        </form>
      )}
    </div>
  );
}

function DoelInput({ label, name, defaultValue }: { label: string; name: string; defaultValue: number }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        name={name}
        min="0"
        defaultValue={defaultValue}
        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
      />
    </div>
  );
}
