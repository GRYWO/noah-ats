"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send, Battery } from "lucide-react";
import { submitEodRapport } from "./actions";

type Bestaand = {
  doel_vandaag: string | null;
  doel_behaald: boolean | null;
  doel_morgen: string | null;
  aantal_calls: number | null;
  aantal_voicemails: number | null;
  aantal_voorgesteld: number | null;
  aantal_afspraken: number | null;
  aantal_plaatsingen: number | null;
  obstakel: string | null;
  afwijzings_reden: string | null;
  energie_focus: number | null;
  morgen_anders: string | null;
};

function VerzendKnop({ label = "Verzenden" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-60 text-white font-semibold px-6 py-2 rounded-md text-sm"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
      {label}
    </button>
  );
}

export function EodForm({ bestaand }: { bestaand?: Bestaand | null }) {
  const [focus, setFocus] = useState<number>(bestaand?.energie_focus ?? 3);
  const [behaald, setBehaald] = useState<"ja" | "nee">(
    bestaand?.doel_behaald === true ? "ja" : "nee"
  );

  const numIn = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-center";
  const txtIn = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm";

  return (
    <form action={submitEodRapport} className="space-y-5">
      <div data-tour="eod-doelen"><Card titel="Doelen">
        <Veld label="Wat was je doel van vandaag? *">
          <textarea name="doel_vandaag" required rows={2} defaultValue={bestaand?.doel_vandaag ?? ""} className={txtIn} />
        </Veld>
        <Veld label="Heb je je dagdoel behaald? *">
          <div className="flex gap-2">
            {(["ja", "nee"] as const).map((v) => (
              <label key={v} className={`cursor-pointer border-2 rounded-md px-4 py-2 text-sm font-semibold flex-1 text-center ${
                behaald === v
                  ? (v === "ja" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-500 bg-red-50 text-red-700")
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
                <input type="radio" name="doel_behaald" value={v} checked={behaald === v} onChange={() => setBehaald(v)} className="sr-only" />
                {v === "ja" ? "Ja, behaald" : "Nee, niet behaald"}
              </label>
            ))}
          </div>
        </Veld>
        <Veld label="Wat is je doel van morgen? *">
          <textarea name="doel_morgen" required rows={2} defaultValue={bestaand?.doel_morgen ?? ""} className={txtIn} />
        </Veld>
      </Card></div>

      <div data-tour="eod-activiteit"><Card titel="Activiteit">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <NumVeld label="Calls" name="aantal_calls" defaultValue={bestaand?.aantal_calls ?? 0} cls={numIn} />
          <NumVeld label="Voicemails / geen gehoor" name="aantal_voicemails" defaultValue={bestaand?.aantal_voicemails ?? 0} cls={numIn} />
          <NumVeld label="Voorgesteld" name="aantal_voorgesteld" defaultValue={bestaand?.aantal_voorgesteld ?? 0} cls={numIn} />
          <NumVeld label="Afspraken ingepland" name="aantal_afspraken" defaultValue={bestaand?.aantal_afspraken ?? 0} cls={numIn} />
          <NumVeld label="Plaatsingen" name="aantal_plaatsingen" defaultValue={bestaand?.aantal_plaatsingen ?? 0} cls={numIn} />
        </div>
      </Card></div>

      <div data-tour="eod-reflectie"><Card titel="Reflectie">
        <Veld label="Wat was je grootste obstakel vandaag?">
          <textarea name="obstakel" rows={2} defaultValue={bestaand?.obstakel ?? ""} className={txtIn} />
        </Veld>
        <Veld label="Meest voorkomende reden van afwijzing">
          <textarea name="afwijzings_reden" rows={2} defaultValue={bestaand?.afwijzings_reden ?? ""} className={txtIn} />
        </Veld>
        <Veld label={`Energie / focus vandaag (1 = laag, 5 = top)`}>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={`cursor-pointer border-2 rounded-md px-4 py-2 text-sm font-bold flex-1 text-center ${
                focus === n ? "border-[#333399] bg-[#333399]/5 text-[#333399]" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
                <input type="radio" name="energie_focus" value={n} checked={focus === n} onChange={() => setFocus(n)} className="sr-only" />
                <Battery size={12} className="inline mr-1" />{n}
              </label>
            ))}
          </div>
        </Veld>
        <Veld label="Wat is 1 ding dat je morgen anders moet doen?">
          <textarea name="morgen_anders" rows={2} defaultValue={bestaand?.morgen_anders ?? ""} className={txtIn} />
        </Veld>
      </Card></div>

      <div className="flex justify-end pt-3 border-t">
        <VerzendKnop label={bestaand ? "Bijwerken" : "Verzenden"} />
      </div>
    </form>
  );
}

function Card({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="font-bold text-gray-800 mb-3 pb-2 border-b">{titel}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumVeld({ label, name, defaultValue, cls }: { label: string; name: string; defaultValue: number; cls: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-600 mb-1 text-center">{label}</label>
      <input type="number" name={name} min="0" defaultValue={defaultValue} className={cls} />
    </div>
  );
}
