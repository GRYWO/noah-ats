"use client";

import { useState } from "react";
import { Palette, Upload, Trash2, ShieldCheck } from "lucide-react";
import { updateHuisstijl } from "./huisstijl-actions";

type Props = {
  tenantId: string;
  bureauNaam: string;
  huidigeLogo: string | null;
  primair: string;
  accent: string;
  actief: boolean;
};

export function HuisstijlSectie({
  tenantId,
  bureauNaam,
  huidigeLogo,
  primair: initialPrimair,
  accent: initialAccent,
  actief: initialActief,
}: Props) {
  const [primair, setPrimair] = useState(initialPrimair ?? "#333399");
  const [accent, setAccent] = useState(initialAccent ?? "#ffd84d");
  const [actief, setActief] = useState(initialActief);
  const [logoPreview, setLogoPreview] = useState<string | null>(huidigeLogo);
  const [verwijderen, setVerwijderen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBezig(true);
    setMelding(null);
    const fd = new FormData(e.currentTarget);
    const r = await updateHuisstijl(fd);
    setBezig(false);
    setMelding({ ok: r.ok, tekst: r.ok ? "Huisstijl opgeslagen ✓" : (r.error ?? "Fout") });
  }

  function laadPreview(f: File) {
    const url = URL.createObjectURL(f);
    setLogoPreview(url);
    setVerwijderen(false);
  }

  return (
    <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#333399]/10 text-[#333399] flex items-center justify-center flex-shrink-0">
          <Palette size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            Huisstijl
            <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full uppercase font-bold">
              <ShieldCheck size={10} /> Super-admin
            </span>
          </h2>
          <p className="text-sm text-gray-500">
            Logo + kleuren die door <b>{bureauNaam}</b>-gebruikers worden gezien.
            Master-switch onderin om aan te zetten.
          </p>
        </div>
      </div>

      <form onSubmit={verstuur} className="space-y-5">
        <input type="hidden" name="tenant_id" value={tenantId} />

        {/* Live preview */}
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-5">
          <div className="text-xs uppercase text-gray-500 font-semibold mb-3">Voorbeeld</div>
          <div
            className="rounded-lg p-4 flex items-center gap-4"
            style={{ background: `linear-gradient(135deg, ${primair} 0%, ${primair}dd 100%)` }}
          >
            {logoPreview && !verwijderen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-12 max-w-[180px] object-contain"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
              />
            ) : (
              <div className="text-white font-black text-3xl tracking-tighter">
                {bureauNaam.slice(0, 6).toLowerCase()}
                <span
                  className="ml-1 inline-block w-3 h-3 rounded-full align-baseline"
                  style={{ background: accent }}
                />
              </div>
            )}
            <div className="text-white/80 text-sm ml-auto">
              <span style={{ color: accent }}>●</span> Voorbeeld accent-kleur
            </div>
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Logo (PNG/SVG/JPG, max 2MB)
          </label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#333399] hover:bg-[#2a2a80] text-white rounded-md text-sm font-semibold cursor-pointer">
              <Upload size={14} />
              {huidigeLogo ? "Vervang logo" : "Upload logo"}
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) laadPreview(f);
                }}
              />
            </label>
            {huidigeLogo && (
              <label className="inline-flex items-center gap-1.5 text-xs text-red-600 cursor-pointer">
                <input
                  type="checkbox"
                  name="logo_verwijderen"
                  checked={verwijderen}
                  onChange={(e) => {
                    setVerwijderen(e.target.checked);
                    if (e.target.checked) setLogoPreview(null);
                    else setLogoPreview(huidigeLogo);
                  }}
                  className="accent-red-600"
                />
                <Trash2 size={12} /> Huidig logo verwijderen
              </label>
            )}
          </div>
        </div>

        {/* Kleuren */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
              Hoofdkleur
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                name="primair"
                value={primair}
                onChange={(e) => setPrimair(e.target.value)}
                className="w-14 h-10 rounded cursor-pointer border border-gray-300"
              />
              <input
                type="text"
                value={primair}
                onChange={(e) => setPrimair(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                placeholder="#333399"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Standaard: #333399 (Noah paars)</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
              Accent-kleur
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                name="accent"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="w-14 h-10 rounded cursor-pointer border border-gray-300"
              />
              <input
                type="text"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                placeholder="#ffd84d"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Standaard: #ffd84d (Noah goud)</p>
          </div>
        </div>

        {/* Master switch */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="actief"
              checked={actief}
              onChange={(e) => setActief(e.target.checked)}
              className="mt-0.5 accent-[#333399]"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-800 text-sm">Huisstijl activeren</div>
              <p className="text-xs text-gray-600 mt-0.5">
                Als aan: deze huisstijl wordt toegepast op alles wat
                gebruikers van {bureauNaam} zien. Standaard uit zodat je
                eerst kunt voorbereiden.
              </p>
            </div>
          </label>
        </div>

        {melding && (
          <div
            className={`text-sm rounded-md p-3 ${
              melding.ok
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {melding.tekst}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={bezig}
            className="bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-60 text-white font-semibold px-6 py-2 rounded-md text-sm"
          >
            {bezig ? "Opslaan…" : "Huisstijl opslaan"}
          </button>
        </div>
      </form>
    </section>
  );
}
