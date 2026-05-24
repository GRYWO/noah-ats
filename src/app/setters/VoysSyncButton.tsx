"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function VoysSyncButton() {
  const [pending, startTransition] = useTransition();
  const [resultaat, setResultaat] = useState<null | {
    ok: boolean;
    bericht: string;
    detail?: string;
  }>(null);
  const router = useRouter();

  function onClick() {
    setResultaat(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/voys/sync", { method: "POST" });
        const data = await r.json();
        if (r.ok) {
          const aantal = (data.updates ?? []).length;
          const niet = (data.niet_gematched ?? []).length;
          setResultaat({
            ok: true,
            bericht: `${aantal} nummer${aantal === 1 ? "" : "s"} gesynchroniseerd vanuit Voys`,
            detail: niet > 0 ? `${niet} email${niet === 1 ? "" : "s"} geen match in Voys` : undefined,
          });
          router.refresh();
        } else {
          setResultaat({
            ok: false,
            bericht: data.error ?? "Sync mislukt",
          });
        }
      } catch (e) {
        setResultaat({ ok: false, bericht: (e as Error).message });
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-gray-300 hover:border-[#333399] text-gray-700 hover:text-[#333399] px-3 py-1.5 rounded-md disabled:opacity-50"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        Sync Voys-nummers
      </button>
      {resultaat && (
        <div className={`text-xs inline-flex items-center gap-1 ${
          resultaat.ok ? "text-emerald-700" : "text-red-700"
        }`}>
          {resultaat.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          <span>{resultaat.bericht}</span>
          {resultaat.detail && <span className="text-gray-500">· {resultaat.detail}</span>}
        </div>
      )}
    </div>
  );
}
