"use client";

import { useEffect, useState } from "react";
import { Gauge, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";

type Bucket = {
  pad: string;
  type: string;
  aantal: number;
  p50: number;
  p95: number;
  p99: number;
  gem: number;
  max: number;
};

type Snapshot = {
  totaal: number;
  traag_200ms: number;
  traag_1s: number;
  breakdown: Bucket[];
  top10: { pad: string; type: string; duur_ms: number }[];
};

function kleur(ms: number): string {
  if (ms < 100) return "text-emerald-700 bg-emerald-50";
  if (ms < 300) return "text-amber-700 bg-amber-50";
  if (ms < 1000) return "text-orange-700 bg-orange-50";
  return "text-red-700 bg-red-50";
}

function fmt(ms: number): string {
  if (ms < 1) return "<1 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Performance Monitor — alleen op super-admin dashboard.
 * Toont p50/p95/p99 per pad over laatste 24u.
 * Refresh elke 30 sec.
 */
export function PerfMonitor() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function laden() {
    setBezig(true);
    setFout(null);
    try {
      const r = await fetch("/api/perf/snapshot", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j);
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Onbekende fout");
    } finally {
      setBezig(false);
    }
  }

  useEffect(() => {
    laden();
    const t = setInterval(laden, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-800 inline-flex items-center gap-2">
            <Gauge size={18} className="text-[#333399]" />
            Performance-monitor
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Latency-metingen laatste 24 uur. P50 = mediaan, P95 = 95% sneller dan dit, P99 = worst-case.
          </p>
        </div>
        <button
          type="button"
          onClick={laden}
          disabled={bezig}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          title="Ververs"
        >
          <RefreshCw size={14} className={bezig ? "animate-spin" : ""} />
        </button>
      </div>

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded p-2 mb-3">
          {fout}
        </div>
      )}

      {data && (
        <>
          {/* Top-stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Hits 24u" waarde={data.totaal.toLocaleString("nl-NL")} icoon={<TrendingUp size={14} />} />
            <Stat
              label="≥ 200 ms"
              waarde={data.traag_200ms.toString()}
              icoon={<AlertTriangle size={14} className="text-amber-600" />}
              kleur="text-amber-700"
            />
            <Stat
              label="≥ 1 s"
              waarde={data.traag_1s.toString()}
              icoon={<AlertTriangle size={14} className="text-red-600" />}
              kleur="text-red-700"
            />
          </div>

          {/* Breakdown tabel */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b">
                  <th className="text-left py-2 font-semibold">Pad</th>
                  <th className="text-right px-2 font-semibold">Hits</th>
                  <th className="text-right px-2 font-semibold">P50</th>
                  <th className="text-right px-2 font-semibold">P95</th>
                  <th className="text-right px-2 font-semibold">P99</th>
                  <th className="text-right px-2 font-semibold">Gem</th>
                </tr>
              </thead>
              <tbody>
                {data.breakdown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-xs text-gray-400 py-4">
                      Nog geen metingen. Refresh een paar pagina's en kom terug.
                    </td>
                  </tr>
                )}
                {data.breakdown.map((b) => (
                  <tr key={b.type + b.pad} className="border-b last:border-0">
                    <td className="py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400 px-1.5 py-0.5 rounded bg-gray-100">
                          {b.type}
                        </span>
                        <span className="text-gray-800 font-medium truncate max-w-[260px]">{b.pad}</span>
                      </div>
                    </td>
                    <td className="text-right text-xs text-gray-500 px-2">{b.aantal}</td>
                    <td className={`text-right text-xs px-2 rounded-md font-semibold ${kleur(b.p50)}`}>{fmt(b.p50)}</td>
                    <td className={`text-right text-xs px-2 rounded-md font-semibold ${kleur(b.p95)}`}>{fmt(b.p95)}</td>
                    <td className={`text-right text-xs px-2 rounded-md font-semibold ${kleur(b.p99)}`}>{fmt(b.p99)}</td>
                    <td className="text-right text-xs text-gray-600 px-2">{fmt(b.gem)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.top10.length > 0 && (
            <details className="mt-4 group">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Top 10 langzaamste individuele hits
              </summary>
              <ul className="mt-2 space-y-1 text-xs">
                {data.top10.map((h, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-gray-700 truncate">
                      <span className="text-[10px] uppercase font-bold text-gray-400 mr-2">{h.type}</span>
                      {h.pad}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-semibold ${kleur(h.duur_ms)}`}>{fmt(h.duur_ms)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  waarde,
  icoon,
  kleur = "text-gray-700",
}: {
  label: string;
  waarde: string;
  icoon: React.ReactNode;
  kleur?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5">
        {icoon}
        {label}
      </div>
      <div className={`text-xl font-bold mt-1 ${kleur}`}>{waarde}</div>
    </div>
  );
}
