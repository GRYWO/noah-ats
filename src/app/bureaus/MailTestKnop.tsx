"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";

type Resultaat = {
  ok: boolean;
  from?: string;
  naar?: string;
  apiKeyLengte?: number;
  apiKeyStart?: string;
  resendResponse?: unknown;
  error?: unknown;
  diagnose?: string;
};

export function MailTestKnop() {
  const [bezig, setBezig] = useState(false);
  const [res, setRes] = useState<Resultaat | null>(null);

  async function test() {
    setBezig(true);
    setRes(null);
    try {
      const r = await fetch("/api/debug/mail-test");
      const data: Resultaat = await r.json();
      setRes(data);
    } catch (e) {
      setRes({ ok: false, error: (e as Error).message });
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={test}
        disabled={bezig}
        className="inline-flex items-center gap-2 bg-white border border-[#333399] text-[#333399] hover:bg-[#333399]/5 font-semibold px-4 py-2 rounded-md text-sm"
      >
        {bezig ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
        Test mail-config
      </button>
      {res && (
        <div className={`text-xs rounded-md p-3 max-w-md whitespace-pre-wrap ${res.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-900" : "bg-red-50 border border-red-200 text-red-900"}`}>
          <b>{res.ok ? "✓ OK" : "✗ Fout"}</b>
          {res.diagnose && <div className="mt-1">{res.diagnose}</div>}
          {res.from && <div className="mt-1">From: {res.from}</div>}
          {res.naar && <div>Naar: {res.naar}</div>}
          {res.apiKeyLengte !== undefined && (
            <div>API-key: {res.apiKeyStart} ({res.apiKeyLengte} tekens)</div>
          )}
          {!!res.error && (
            <div className="mt-2 font-mono text-[11px] bg-white/50 rounded p-2">
              {typeof res.error === "string" ? res.error : JSON.stringify(res.error, null, 2)}
            </div>
          )}
          {!!(res.resendResponse as { error?: unknown })?.error && (
            <div className="mt-2 font-mono text-[11px] bg-white/50 rounded p-2">
              Resend error: {JSON.stringify((res.resendResponse as { error: unknown }).error, null, 2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
