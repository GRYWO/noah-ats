"use client";

import { useState } from "react";
import { Check, X, Play, Loader2, Mail } from "lucide-react";

type Stap = { naam: string; ok: boolean; detail: string };
type Mail = { to: string; subject: string };
type Resultaat = { ok: boolean; stappen: Stap[]; mails: Mail[]; fout?: string };

export function TestFlowApp() {
  const [bezig, setBezig] = useState(false);
  const [res, setRes] = useState<Resultaat | null>(null);

  async function start() {
    setBezig(true);
    setRes(null);
    try {
      const r = await fetch("/api/admin/test-flow", { method: "POST" });
      const d = (await r.json()) as Resultaat;
      setRes(d);
    } catch (e) {
      setRes({ ok: false, stappen: [], mails: [], fout: String((e as Error).message) });
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={start}
        disabled={bezig}
        className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-60"
      >
        {bezig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {bezig ? "Test loopt…" : res ? "Opnieuw testen" : "Start de flow-test"}
      </button>

      {res?.fout && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{res.fout}</div>
      )}

      {res && !res.fout && (
        <div className="mt-6 space-y-5">
          <div
            className={`rounded-xl border p-4 text-sm font-semibold ${
              res.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {res.ok ? "✅ Alle stappen geslaagd — de flow werkt." : "⚠️ Niet alle stappen slaagden — zie hieronder."}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {res.stappen.map((s, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-gray-100 px-4 py-3 last:border-0">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    s.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {s.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.naam}</p>
                  <p className="text-xs text-gray-500">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
              <Mail className="h-4 w-4 text-[#333399]" />
              E-mails die verstuurd zouden zijn ({res.mails.length}) — niet echt verzonden
            </h2>
            {res.mails.length === 0 ? (
              <p className="text-xs text-gray-500">Geen mails klaargezet in deze run.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {res.mails.map((m, i) => (
                  <div key={i} className="border-b border-gray-100 px-4 py-2.5 last:border-0">
                    <p className="text-sm text-gray-800">{m.subject || "(geen onderwerp)"}</p>
                    <p className="text-xs text-gray-500">naar: {m.to || "(onbekend)"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
