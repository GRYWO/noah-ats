"use client";

import { useState } from "react";
import { Star, Trash2, Eye, EyeOff, Edit2, Save, X } from "lucide-react";
import { eur, type Plan } from "@/utils/plans-shared";
import { savePlan, deletePlan, togglePopulair } from "./actions";

export function PlannenLijst({ plannen }: { plannen: Plan[] }) {
  const [bewerken, setBewerken] = useState<string | null>(null);
  const [nieuw, setNieuw] = useState(false);

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-800">Plannen</h2>
          <p className="text-xs text-gray-500">
            Sleep nog niet ondersteund — gebruik &apos;Sortering&apos; om volgorde te wijzigen.
          </p>
        </div>
        {!nieuw && (
          <button
            onClick={() => setNieuw(true)}
            className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-2 rounded-md text-sm"
          >
            Nieuw plan
          </button>
        )}
      </div>

      <div className="space-y-3">
        {nieuw && (
          <PlanFormulier
            plan={null}
            onKlaar={() => setNieuw(false)}
          />
        )}
        {plannen.map((p) =>
          bewerken === p.id ? (
            <PlanFormulier key={p.id} plan={p} onKlaar={() => setBewerken(null)} />
          ) : (
            <PlanRij
              key={p.id}
              plan={p}
              onBewerken={() => setBewerken(p.id)}
            />
          )
        )}
      </div>
    </section>
  );
}

function PlanRij({ plan, onBewerken }: { plan: Plan; onBewerken: () => void }) {
  return (
    <div className={`border-2 rounded-lg p-4 ${plan.actief ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-800">{plan.label}</h3>
            {plan.populair && (
              <span className="text-[10px] bg-[#ffd84d] text-[#333399] font-bold px-2 py-0.5 rounded-full uppercase">
                Populair
              </span>
            )}
            {!plan.actief && (
              <span className="text-[10px] bg-gray-200 text-gray-600 font-semibold px-2 py-0.5 rounded-full uppercase">
                Inactief
              </span>
            )}
            <span className="text-xs text-gray-400">sleutel: <code>{plan.sleutel}</code></span>
          </div>
          <div className="text-sm">
            <b className="text-[#333399]">{eur(plan.prijs_per_maand_cent)}</b>
            <span className="text-gray-500"> / maand · </span>
            {plan.max_users === null ? "onbeperkt users" : `max ${plan.max_users} users`}
          </div>
          {plan.features.length > 0 && (
            <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0.5">
              {plan.features.map((f, i) => (
                <li key={i} className="text-xs text-gray-600">• {f}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[10px] text-gray-400">#{plan.sortering}</span>
          <button
            onClick={onBewerken}
            className="text-xs text-[#333399] hover:underline inline-flex items-center gap-1"
          >
            <Edit2 size={11} /> Bewerken
          </button>
          <button
            onClick={async () => { await togglePopulair(plan.id); }}
            className="text-xs text-gray-500 hover:text-[#333399] inline-flex items-center gap-1"
          >
            <Star size={11} /> {plan.populair ? "Niet meer populair" : "Markeer populair"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanFormulier({ plan, onKlaar }: { plan: Plan | null; onKlaar: () => void }) {
  const [bezig, setBezig] = useState(false);

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBezig(true);
    const fd = new FormData(e.currentTarget);
    await savePlan(fd);
    setBezig(false);
    onKlaar();
  }

  async function verwijder() {
    if (!plan) return;
    if (!confirm(`Plan "${plan.label}" verwijderen?`)) return;
    setBezig(true);
    const r = await deletePlan(plan.id);
    setBezig(false);
    if (r.ok) onKlaar();
    else alert(r.error ?? "Verwijderen mislukt");
  }

  return (
    <form onSubmit={verstuur} className="border-2 border-[#333399] rounded-lg p-4 bg-[#333399]/5 space-y-3">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Sleutel *</label>
          <input
            name="sleutel"
            required
            defaultValue={plan?.sleutel ?? ""}
            placeholder="bv. pro"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
          />
          <p className="text-[11px] text-gray-400 mt-0.5">Niet wijzigen als plan al gebruikt wordt.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Label *</label>
          <input
            name="label"
            required
            defaultValue={plan?.label ?? ""}
            placeholder="bv. Pro"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Prijs/mnd (€) *</label>
          <input
            name="prijs_eur"
            required
            defaultValue={plan ? (plan.prijs_per_maand_cent / 100).toFixed(2) : ""}
            placeholder="99.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Max users (0 = onbeperkt)</label>
          <input
            name="max_users"
            type="number"
            min="0"
            defaultValue={plan?.max_users ?? 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Sortering</label>
          <input
            name="sortering"
            type="number"
            defaultValue={plan?.sortering ?? 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div className="flex items-end gap-4">
          <label className="inline-flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="populair" defaultChecked={plan?.populair ?? false} className="accent-[#333399]" />
            Populair
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="actief" defaultChecked={plan?.actief ?? true} className="accent-[#333399]" />
            Actief
          </label>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Features (1 per regel)</label>
        <textarea
          name="features"
          rows={6}
          defaultValue={plan?.features.join("\n") ?? ""}
          placeholder={"Tot 10 users\nAlles van Starter\nCoaching dashboard"}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
        />
      </div>
      <div className="flex justify-end gap-2">
        {plan && (
          <button
            type="button"
            onClick={verwijder}
            disabled={bezig}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md inline-flex items-center gap-1"
          >
            <Trash2 size={12} /> Verwijderen
          </button>
        )}
        <button
          type="button"
          onClick={onKlaar}
          disabled={bezig}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md inline-flex items-center gap-1"
        >
          <X size={12} /> Annuleren
        </button>
        <button
          type="submit"
          disabled={bezig}
          className="bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-md text-sm inline-flex items-center gap-1"
        >
          <Save size={12} /> {bezig ? "Opslaan…" : "Opslaan"}
        </button>
      </div>
      <div className="text-[11px] text-gray-400 inline-flex items-center gap-1">
        {plan?.actief ? <Eye size={11} /> : <EyeOff size={11} />}
        {plan?.actief ? "Zichtbaar voor bureaus" : "Niet zichtbaar bij activatie"}
      </div>
    </form>
  );
}
