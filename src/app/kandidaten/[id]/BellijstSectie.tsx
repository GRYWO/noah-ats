"use client";

import { useState } from "react";
import { Phone, Globe, Trash2, Plus, Upload, ChevronDown, ChevronUp } from "lucide-react";
import {
  uploadBellijst,
  updateBellijstItem,
  verwijderBellijstItem,
  verwijderBellijst,
  voegBellijstItemToeAanCrm,
} from "./bellijst-actions";

type BellijstItem = {
  id: string;
  functie: string | null;
  bedrijf: string | null;
  plaats: string | null;
  telefoon: string | null;
  website: string | null;
  branche: string | null;
  label: string | null;
  status: string | null;
  notitie: string | null;
  opdrachtgever_id: string | null;
};

type Bellijst = {
  id: string;
  naam: string;
  aantal_items: number;
  created_at: string;
  items: BellijstItem[];
};

const LABEL_OPTIES = [
  { value: "",               label: "—",                kleur: "bg-gray-50 text-gray-600 border-gray-200" },
  { value: "gebeld",         label: "Gebeld",           kleur: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "callback",       label: "Terugbellen",      kleur: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "geinteresseerd", label: "Geïnteresseerd",   kleur: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "niet_bellen",    label: "Niet bellen",      kleur: "bg-gray-100 text-gray-500 border-gray-300" },
  { value: "afgewezen",      label: "Afgewezen",        kleur: "bg-red-50 text-red-700 border-red-200" },
];

export function BellijstSectie({ kandidaatId, bellijsten }: { kandidaatId: string; bellijsten: Bellijst[] }) {
  const [openLijst, setOpenLijst] = useState<string | null>(bellijsten[0]?.id ?? null);
  const [showUpload, setShowUpload] = useState(bellijsten.length === 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <h2 className="font-bold text-gray-800">Bellijsten (Jobdigger)</h2>
        <button
          type="button"
          onClick={() => setShowUpload(!showUpload)}
          className="text-xs text-[#333399] hover:underline font-semibold inline-flex items-center gap-1"
        >
          <Plus size={14} /> Nieuwe bellijst
        </button>
      </div>

      {showUpload && (
        <form action={uploadBellijst} encType="multipart/form-data" className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
          <input type="hidden" name="kandidaat_id" value={kandidaatId} />
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Naam van de lijst (optioneel)</label>
            <input name="naam" placeholder="bv. Installatiemonteur Oisterwijk" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Excel-bestand uit Jobdigger</label>
            <input name="file" type="file" accept=".xlsx,.xls" required className="w-full text-sm" />
            <small className="text-gray-400 text-xs">Sleutel-kolommen worden automatisch herkend (bedrijf, telefoon, plaats, website, branche).</small>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-1.5 rounded-md text-xs inline-flex items-center gap-1">
              <Upload size={14} /> Uploaden
            </button>
            <button type="button" onClick={() => setShowUpload(false)} className="text-xs text-gray-500 hover:underline">
              Annuleren
            </button>
          </div>
        </form>
      )}

      {bellijsten.length === 0 ? (
        <p className="text-sm text-gray-500">Nog geen bellijsten. Maak er een via Jobdigger en upload de Excel hier.</p>
      ) : (
        <div className="space-y-3">
          {bellijsten.map((b) => {
            const isOpen = openLijst === b.id;
            const gedaan = b.items.filter(i => i.status === "gedaan" || i.label).length;
            return (
              <div key={b.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setOpenLijst(isOpen ? null : b.id)}
                    className="flex items-center gap-2 text-left flex-1"
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <span className="font-semibold text-sm text-gray-800">{b.naam}</span>
                    <span className="text-xs text-gray-500">{gedaan}/{b.aantal_items} verwerkt</span>
                  </button>
                  <form action={verwijderBellijst}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="kandidaat_id" value={kandidaatId} />
                    <button type="submit" title="Bellijst verwijderen" className="text-gray-400 hover:text-red-600 p-1">
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>

                {isOpen && (
                  <div className="divide-y divide-gray-100">
                    {b.items.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">Geen items.</p>
                    ) : b.items.map((item) => (
                      <BellijstItemRij key={item.id} item={item} kandidaatId={kandidaatId} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BellijstItemRij({ item, kandidaatId }: { item: BellijstItem; kandidaatId: string }) {
  const labelOptie = LABEL_OPTIES.find(o => o.value === (item.label ?? ""));
  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-800 truncate">{item.bedrijf || "—"}</span>
          {item.opdrachtgever_id && (
            <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">In CRM</span>
          )}
        </div>
        <div className="text-xs text-gray-500 flex flex-wrap gap-3 mt-0.5">
          {item.functie && <span>{item.functie}</span>}
          {item.plaats && <span>{item.plaats}</span>}
          {item.telefoon && (
            <a href={`tel:${item.telefoon}`} className="text-[#333399] hover:underline inline-flex items-center gap-1">
              <Phone size={11} /> {item.telefoon}
            </a>
          )}
          {item.website && (
            <a href={item.website.startsWith("http") ? item.website : `https://${item.website}`} target="_blank" rel="noopener noreferrer" className="text-[#333399] hover:underline inline-flex items-center gap-1">
              <Globe size={11} /> {item.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
        </div>
      </div>
      <form action={updateBellijstItem} className="flex items-center gap-1">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="kandidaat_id" value={kandidaatId} />
        <select
          name="label"
          defaultValue={item.label ?? ""}
          className={`text-xs px-2 py-1 rounded-md border ${labelOptie?.kleur ?? "bg-gray-50 border-gray-200"}`}
          onChange={(e) => e.target.form?.requestSubmit()}
        >
          {LABEL_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </form>
      {!item.opdrachtgever_id && item.bedrijf && (
        <form action={voegBellijstItemToeAanCrm}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="kandidaat_id" value={kandidaatId} />
          <button type="submit" title="Toevoegen aan CRM" className="text-xs text-emerald-700 hover:underline font-semibold whitespace-nowrap">
            → CRM
          </button>
        </form>
      )}
      <form action={verwijderBellijstItem}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="kandidaat_id" value={kandidaatId} />
        <button type="submit" title="Verwijderen" className="text-gray-400 hover:text-red-600 p-1">
          <Trash2 size={14} />
        </button>
      </form>
    </div>
  );
}
