"use client";

import { useMemo, useState } from "react";
import {
  Building2, User as UserIcon, TrendingUp, AlertTriangle, ExternalLink, FileDown,
  Search, X, MessageSquare, Save, Loader2, Ban, RotateCcw,
} from "lucide-react";
import type { AbonnementenOverzicht, BureauRij, SetterRij } from "@/utils/abonnementen-overzicht";
import { saveNotitie, opzeggenBureau, opzeggenSetter, reactiveerSetter } from "./overzicht-actions";

function eur(cent: number): string {
  return `€ ${(cent / 100).toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_KLEUR: Record<string, string> = {
  actief: "bg-emerald-100 text-emerald-800 border-emerald-200",
  wachtend_betaling: "bg-amber-100 text-amber-800 border-amber-200",
  achterstallig: "bg-red-100 text-red-800 border-red-200",
  read_only: "bg-orange-100 text-orange-800 border-orange-200",
  opgezegd: "bg-gray-100 text-gray-700 border-gray-200",
  geblokkeerd: "bg-red-200 text-red-900 border-red-300",
  geen: "bg-gray-50 text-gray-500 border-gray-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_KLEUR[status] ?? STATUS_KLEUR.geen}`}>
      {status}
    </span>
  );
}

function MrrGrafiek({ data }: { data: { maand: string; mrr_cent: number }[] }) {
  const max = Math.max(...data.map((d) => d.mrr_cent), 1);
  const W = 600;
  const H = 140;
  const padX = 30;
  const padY = 20;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const stepX = innerW / Math.max(1, data.length - 1);

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - (d.mrr_cent / max) * innerH;
    return [x, y] as const;
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const fillPath = `${path} L ${points[points.length - 1][0]} ${padY + innerH} L ${points[0][0]} ${padY + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#333399" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#333399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#g1)" />
      <path d={path} fill="none" stroke="#333399" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3" fill="#333399" />
          <text x={p[0]} y={H - 4} textAnchor="middle" fontSize="9" fill="#888">{data[i].maand}</text>
        </g>
      ))}
    </svg>
  );
}

function downloadCsv(naam: string, rijen: Record<string, string | number>[]) {
  if (rijen.length === 0) return;
  const headers = Object.keys(rijen[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(";"), ...rijen.map(r => headers.map(h => escape(r[h])).join(";"))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${naam}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

type NotitieMap = Record<string, string>;

export function OverzichtSectie({
  data,
  notitiesBureau,
  notitiesSetter,
}: {
  data: AbonnementenOverzicht;
  notitiesBureau: NotitieMap; // key = tenant_id
  notitiesSetter: NotitieMap; // key = user_id
}) {
  const [zoek, setZoek] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("alle");
  const [actieveNotitie, setActieveNotitie] = useState<string | null>(null);
  const [notitieTekst, setNotitieTekst] = useState("");
  const [notitieBezig, setNotitieBezig] = useState(false);

  function filterRij(rij: BureauRij | SetterRij): boolean {
    if (statusFilter !== "alle" && rij.status !== statusFilter) return false;
    if (!zoek.trim()) return true;
    const term = zoek.toLowerCase();
    if ("plan_label" in rij) {
      // BureauRij
      return `${rij.bureau_naam} ${rij.contact_email ?? ""} ${rij.plan_label}`.toLowerCase().includes(term);
    }
    // SetterRij
    return `${rij.user_naam} ${rij.email} ${rij.bureau_naam ?? ""}`.toLowerCase().includes(term);
  }

  const bureauActief = useMemo(() => data.bureauActief.filter(filterRij), [data.bureauActief, zoek, statusFilter]);
  const setterActief = useMemo(() => data.setterActief.filter(filterRij), [data.setterActief, zoek, statusFilter]);
  const bureauOpgezegd = useMemo(() => data.bureauOpgezegd.filter(filterRij), [data.bureauOpgezegd, zoek, statusFilter]);
  const setterOpgezegd = useMemo(() => data.setterOpgezegd.filter(filterRij), [data.setterOpgezegd, zoek, statusFilter]);

  async function openNotitie(key: string, huidige?: string) {
    setActieveNotitie(key);
    setNotitieTekst(huidige ?? "");
  }

  async function bewaarNotitie(type: "bureau" | "setter", id: string) {
    setNotitieBezig(true);
    await saveNotitie({ type, id, notitie: notitieTekst });
    setNotitieBezig(false);
    setActieveNotitie(null);
  }

  return (
    <div className="space-y-6">
      {/* KPI HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiKaart titel="MRR totaal" waarde={eur(data.mrr.totaal_cent)} icoon={<TrendingUp size={16} />} kleur="text-[#333399]" />
        <KpiKaart titel="ARR-projectie" waarde={eur(data.mrr.arr_projectie_cent)} kleur="text-emerald-700" />
        <KpiKaart titel="Bureaus actief" waarde={`${data.bureauActief.filter(b => b.status === "actief").length}`} icoon={<Building2 size={16} />} />
        <KpiKaart titel="Setters actief" waarde={`${data.setterActief.filter(s => s.status === "actief").length}`} icoon={<UserIcon size={16} />} />
      </div>

      {/* MRR-GRAFIEK */}
      <section className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-800">MRR-trend</h3>
            <p className="text-xs text-gray-500">Geschatte maandelijkse omzet — laatste 6 maanden</p>
          </div>
          <div className="text-xs text-gray-500">
            Bureau {eur(data.mrr.bureau_cent)} · Setter {eur(data.mrr.setter_cent)}
          </div>
        </div>
        <MrrGrafiek data={data.trend} />
      </section>

      {/* FILTER + ZOEK */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoek bureau, setter, e-mail..."
              className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-md text-sm"
            />
            {zoek && (
              <button onClick={() => setZoek("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="alle">Alle statussen</option>
            <option value="actief">Actief</option>
            <option value="wachtend_betaling">Wachtend op betaling</option>
            <option value="achterstallig">Achterstallig</option>
            <option value="opgezegd">Opgezegd</option>
            <option value="geblokkeerd">Geblokkeerd</option>
          </select>
        </div>
      </section>

      {/* BUREAUS */}
      <section className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
            <Building2 size={16} className="text-[#333399]" />
            Bureau-abonnementen
            <span className="text-xs text-gray-500 font-normal">({bureauActief.length})</span>
          </h3>
          <button
            type="button"
            onClick={() => downloadCsv("bureaus", bureauActief.map(b => ({
              Bureau: b.bureau_naam,
              Plan: b.plan_label,
              Status: b.status,
              "MRR (€)": b.prijs_per_maand_cent / 100,
              "Setup-fee betaald": b.setup_fee_betaald ? "Ja" : "Nee",
              "Volgende factuur": fmtDate(b.huidige_periode_einde),
              "E-mail": b.contact_email ?? "",
              "Gestart op": fmtDate(b.gestart_op),
            })))}
            className="text-xs text-gray-600 hover:text-[#333399] inline-flex items-center gap-1"
          >
            <FileDown size={12} /> CSV
          </button>
        </div>
        <BureauTabel
          rijen={bureauActief}
          notities={notitiesBureau}
          actieveNotitie={actieveNotitie}
          openNotitie={openNotitie}
          notitieTekst={notitieTekst}
          setNotitieTekst={setNotitieTekst}
          bewaarNotitie={bewaarNotitie}
          notitieBezig={notitieBezig}
        />
      </section>

      {/* SETTERS */}
      <section className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
            <UserIcon size={16} className="text-[#333399]" />
            Setter-abonnementen
            <span className="text-xs text-gray-500 font-normal">({setterActief.length})</span>
          </h3>
          <button
            type="button"
            onClick={() => downloadCsv("setters", setterActief.map(s => ({
              Naam: s.user_naam,
              Bureau: s.bureau_naam ?? "",
              "E-mail": s.email,
              Status: s.status,
              "MRR (€)": s.prijs_per_maand_cent / 100,
              "Actief sinds": fmtDate(s.actief_sinds),
            })))}
            className="text-xs text-gray-600 hover:text-[#333399] inline-flex items-center gap-1"
          >
            <FileDown size={12} /> CSV
          </button>
        </div>
        <SetterTabel
          rijen={setterActief}
          notities={notitiesSetter}
          actieveNotitie={actieveNotitie}
          openNotitie={openNotitie}
          notitieTekst={notitieTekst}
          setNotitieTekst={setNotitieTekst}
          bewaarNotitie={bewaarNotitie}
          notitieBezig={notitieBezig}
        />
      </section>

      {/* CHURN */}
      <section className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            Opgezegde abonnementen
          </h3>
          <div className="text-xs text-gray-500">
            Deze maand: {data.churn.bureau_deze_maand} bureaus · {data.churn.setter_deze_maand} setters
          </div>
        </div>
        {bureauOpgezegd.length === 0 && setterOpgezegd.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">Nog geen opzeggingen.</p>
        ) : (
          <>
            {bureauOpgezegd.length > 0 && (
              <BureauTabel
                rijen={bureauOpgezegd}
                notities={notitiesBureau}
                actieveNotitie={actieveNotitie}
                openNotitie={openNotitie}
                notitieTekst={notitieTekst}
                setNotitieTekst={setNotitieTekst}
                bewaarNotitie={bewaarNotitie}
                notitieBezig={notitieBezig}
              />
            )}
            {setterOpgezegd.length > 0 && (
              <SetterTabel
                rijen={setterOpgezegd}
                notities={notitiesSetter}
                actieveNotitie={actieveNotitie}
                openNotitie={openNotitie}
                notitieTekst={notitieTekst}
                setNotitieTekst={setNotitieTekst}
                bewaarNotitie={bewaarNotitie}
                notitieBezig={notitieBezig}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}

function KpiKaart({ titel, waarde, icoon, kleur = "text-gray-800" }: { titel: string; waarde: string; icoon?: React.ReactNode; kleur?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5">
        {icoon}{titel}
      </div>
      <div className={`text-2xl font-bold mt-1 ${kleur}`}>{waarde}</div>
    </div>
  );
}

type TabelProps<T> = {
  rijen: T[];
  notities: NotitieMap;
  actieveNotitie: string | null;
  openNotitie: (key: string, huidige?: string) => void;
  notitieTekst: string;
  setNotitieTekst: (v: string) => void;
  bewaarNotitie: (type: "bureau" | "setter", id: string) => void;
  notitieBezig: boolean;
};

function BureauTabel({ rijen, notities, actieveNotitie, openNotitie, notitieTekst, setNotitieTekst, bewaarNotitie, notitieBezig }: TabelProps<BureauRij>) {
  if (rijen.length === 0) return <p className="px-5 py-6 text-sm text-gray-400 text-center">Geen bureaus die aan deze filter voldoen.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left px-4 py-2 font-semibold">Bureau</th>
            <th className="text-left px-3 py-2 font-semibold">Plan</th>
            <th className="text-left px-3 py-2 font-semibold">Status</th>
            <th className="text-left px-3 py-2 font-semibold">Setup-fee</th>
            <th className="text-right px-3 py-2 font-semibold">MRR</th>
            <th className="text-left px-3 py-2 font-semibold">Volgende factuur</th>
            <th className="text-right px-3 py-2 font-semibold">Acties</th>
          </tr>
        </thead>
        <tbody>
          {rijen.map((b) => {
            const naam = b.bureau_naam;
            const notitie = notities[b.tenant_id];
            const isOpen = actieveNotitie === `bureau-${b.tenant_id}`;
            return (
              <>
                <tr key={b.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <a href={`/bureaus/${b.tenant_id}`} className="font-semibold text-gray-800 hover:text-[#333399]">{naam}</a>
                    {b.contact_email && <div className="text-[11px] text-gray-500">{b.contact_email}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{b.plan_label}</td>
                  <td className="px-3 py-2"><StatusBadge status={b.status} /></td>
                  <td className="px-3 py-2">
                    {b.setup_fee_betaald
                      ? <span className="text-[11px] text-emerald-700 font-semibold">✓ Betaald</span>
                      : <span className="text-[11px] text-red-700 font-semibold">○ Open</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">{eur(b.prijs_per_maand_cent)}</td>
                  <td className="px-3 py-2 text-gray-600">{fmtDate(b.huidige_periode_einde)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openNotitie(`bureau-${b.tenant_id}`, notitie)}
                        title="Notitie"
                        className={`p-1.5 rounded hover:bg-gray-100 ${notitie ? "text-amber-600" : "text-gray-400"}`}
                      >
                        <MessageSquare size={13} />
                      </button>
                      {b.stripe_subscription_id && (
                        <a
                          href={`https://dashboard.stripe.com/subscriptions/${b.stripe_subscription_id}`}
                          target="_blank" rel="noopener noreferrer"
                          title="Open in Stripe"
                          className="p-1.5 rounded text-gray-400 hover:text-[#635bff] hover:bg-indigo-50"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      {b.status === "actief" && (
                        <form action={async () => { await opzeggenBureau(b.tenant_id); }}>
                          <button
                            type="submit"
                            title="Opzeggen"
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => { if (!confirm(`${naam} opzeggen per einde periode?`)) e.preventDefault(); }}
                          >
                            <Ban size={13} />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`${b.id}-notitie`} className="border-t bg-amber-50">
                    <td colSpan={7} className="px-4 py-3">
                      <textarea
                        value={notitieTekst}
                        onChange={(e) => setNotitieTekst(e.target.value)}
                        placeholder="Interne notitie over dit bureau..."
                        rows={2}
                        className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm bg-white"
                      />
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => openNotitie("")}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >Annuleren</button>
                        <button
                          type="button"
                          onClick={() => bewaarNotitie("bureau", b.tenant_id)}
                          disabled={notitieBezig}
                          className="bg-[#333399] hover:bg-[#2a2a80] text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          {notitieBezig ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                          Opslaan
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SetterTabel({ rijen, notities, actieveNotitie, openNotitie, notitieTekst, setNotitieTekst, bewaarNotitie, notitieBezig }: TabelProps<SetterRij>) {
  if (rijen.length === 0) return <p className="px-5 py-6 text-sm text-gray-400 text-center">Geen setter-abonnementen.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left px-4 py-2 font-semibold">Setter</th>
            <th className="text-left px-3 py-2 font-semibold">Bureau</th>
            <th className="text-left px-3 py-2 font-semibold">Status</th>
            <th className="text-right px-3 py-2 font-semibold">MRR</th>
            <th className="text-left px-3 py-2 font-semibold">Actief sinds</th>
            <th className="text-right px-3 py-2 font-semibold">Acties</th>
          </tr>
        </thead>
        <tbody>
          {rijen.map((s) => {
            const notitie = notities[s.id];
            const isOpen = actieveNotitie === `setter-${s.id}`;
            return (
              <>
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-semibold text-gray-800">{s.user_naam}</div>
                    {s.email && <div className="text-[11px] text-gray-500">{s.email}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{s.bureau_naam ?? "—"}</td>
                  <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">{eur(s.prijs_per_maand_cent)}</td>
                  <td className="px-3 py-2 text-gray-600">{fmtDate(s.actief_sinds)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openNotitie(`setter-${s.id}`, notitie)}
                        title="Notitie"
                        className={`p-1.5 rounded hover:bg-gray-100 ${notitie ? "text-amber-600" : "text-gray-400"}`}
                      >
                        <MessageSquare size={13} />
                      </button>
                      {s.stripe_subscription_id && (
                        <a
                          href={`https://dashboard.stripe.com/subscriptions/${s.stripe_subscription_id}`}
                          target="_blank" rel="noopener noreferrer"
                          title="Open in Stripe"
                          className="p-1.5 rounded text-gray-400 hover:text-[#635bff] hover:bg-indigo-50"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      {s.status === "actief" && (
                        <form action={async () => { await opzeggenSetter(s.id); }}>
                          <button
                            type="submit"
                            title="Opzeggen"
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => { if (!confirm(`Abonnement van ${s.user_naam} opzeggen?`)) e.preventDefault(); }}
                          >
                            <Ban size={13} />
                          </button>
                        </form>
                      )}
                      {s.status === "opgezegd" && (
                        <form action={async () => { await reactiveerSetter(s.id); }}>
                          <button
                            type="submit"
                            title="Heractiveren"
                            className="p-1.5 rounded text-gray-400 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <RotateCcw size={13} />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`${s.id}-notitie`} className="border-t bg-amber-50">
                    <td colSpan={6} className="px-4 py-3">
                      <textarea
                        value={notitieTekst}
                        onChange={(e) => setNotitieTekst(e.target.value)}
                        placeholder="Interne notitie over deze setter..."
                        rows={2}
                        className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm bg-white"
                      />
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => openNotitie("")}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >Annuleren</button>
                        <button
                          type="button"
                          onClick={() => bewaarNotitie("setter", s.id)}
                          disabled={notitieBezig}
                          className="bg-[#333399] hover:bg-[#2a2a80] text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          {notitieBezig ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                          Opslaan
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
