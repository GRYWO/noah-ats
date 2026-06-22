"use client";

import { useState } from "react";

type TariefType = "" | "ws_10" | "ws_15" | "ws_anders" | "uitzend";

type AfsprakenDefaults = {
  tarief?: string;
  wsPercentage?: string;
  wsToelichting?: string;
  uitzendFactor?: string;
  uitzendUren?: string;
  overnameUren?: string;
};

export function AfsprakenSectie({ defaults }: { defaults?: AfsprakenDefaults } = {}) {
  const [tarief, setTarief] = useState<TariefType>((defaults?.tarief as TariefType) || "");
  const [wsPercentage, setWsPercentage] = useState<string>(defaults?.wsPercentage ?? "");
  const [wsToelichting, setWsToelichting] = useState<string>(defaults?.wsToelichting ?? "");
  const [uitzendFactor, setUitzendFactor] = useState<string>(defaults?.uitzendFactor || "2.4");
  const [uitzendUren, setUitzendUren] = useState<string>(defaults?.uitzendUren ?? "");
  const [overnameUren, setOvernameUren] = useState<string>(defaults?.overnameUren || "1040");

  // Voor ws_10 en ws_15 wordt het percentage automatisch vastgezet.
  const effectiefWsPercentage =
    tarief === "ws_10" ? "10" : tarief === "ws_15" ? "15" : tarief === "ws_anders" ? wsPercentage : "";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="font-bold text-gray-800">Afspraken (intern)</h2>
      <p className="mt-1 text-xs text-gray-500">
        Alleen zichtbaar voor jou en de admin. Komt niet op de website.
      </p>

      <fieldset className="mt-5 space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Soort tarief
        </legend>

        <Radio
          name="afspraak_tarief_type_keuze"
          value="ws_10"
          checked={tarief === "ws_10"}
          onChange={() => setTarief("ws_10")}
          label="Werving en selectie 10 procent (speciaal tarief uitzendbureaus)"
        />
        <Radio
          name="afspraak_tarief_type_keuze"
          value="ws_15"
          checked={tarief === "ws_15"}
          onChange={() => setTarief("ws_15")}
          label="Werving en selectie 15 procent (normaal tarief)"
        />
        <Radio
          name="afspraak_tarief_type_keuze"
          value="ws_anders"
          checked={tarief === "ws_anders"}
          onChange={() => setTarief("ws_anders")}
          label="Uitgezonderd (afwijkend percentage)"
        />
        <Radio
          name="afspraak_tarief_type_keuze"
          value="uitzend"
          checked={tarief === "uitzend"}
          onChange={() => setTarief("uitzend")}
          label="Uitzendbasis"
        />
      </fieldset>

      {tarief === "ws_anders" && (
        <div className="mt-5 space-y-4 rounded-xl bg-gray-50 p-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Afgesproken percentage
            </span>
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={wsPercentage}
              onChange={(e) => setWsPercentage(e.target.value)}
              placeholder="bv. 12.5"
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Toelichting op de afspraak
            </span>
            <textarea
              rows={3}
              value={wsToelichting}
              onChange={(e) => setWsToelichting(e.target.value)}
              placeholder="Waarom afwijkend? Bijvoorbeeld: vaste klant, meerdere vacatures, garantie."
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
            />
          </label>
        </div>
      )}

      {tarief === "uitzend" && (
        <div className="mt-5 space-y-4 rounded-xl bg-gray-50 p-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Uitzendfactor
            </span>
            <select
              value={uitzendFactor}
              onChange={(e) => setUitzendFactor(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
            >
              <option value="2.3">2.3</option>
              <option value="2.4">2.4</option>
              <option value="2.5">2.5</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Uren per week
            </span>
            <input
              type="text"
              value={uitzendUren}
              onChange={(e) => setUitzendUren(e.target.value)}
              placeholder="bv. 32-40 uur"
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Overname na (uren)
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={overnameUren}
              onChange={(e) => setOvernameUren(e.target.value)}
              placeholder="1040"
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
            />
            <span className="mt-1 block text-xs text-gray-500">
              Standaard 1040 uren (zes maanden fulltime).
            </span>
          </label>
        </div>
      )}

      {/* Hidden inputs die meegestuurd worden in de form-submit. */}
      <input type="hidden" name="afspraak_tarief_type" value={tarief} />
      <input type="hidden" name="afspraak_ws_percentage" value={effectiefWsPercentage} />
      <input
        type="hidden"
        name="afspraak_ws_toelichting"
        value={tarief === "ws_anders" ? wsToelichting : ""}
      />
      <input
        type="hidden"
        name="afspraak_uitzend_factor"
        value={tarief === "uitzend" ? uitzendFactor : ""}
      />
      <input
        type="hidden"
        name="afspraak_uitzend_uren_per_week"
        value={tarief === "uitzend" ? uitzendUren : ""}
      />
      <input
        type="hidden"
        name="afspraak_overname_na_uren"
        value={tarief === "uitzend" ? overnameUren : ""}
      />
    </div>
  );
}

function Radio({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 transition hover:border-[#333399]">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 accent-[#333399]"
      />
      <span>{label}</span>
    </label>
  );
}
