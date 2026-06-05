"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";
import { triggerNuVerlopen } from "./actions";

export function TestNuKnop() {
  const [bezig, startTransition] = useTransition();
  const [resultaat, setResultaat] = useState<string | null>(null);
  const router = useRouter();

  function klik() {
    setResultaat(null);
    startTransition(async () => {
      const r = await triggerNuVerlopen();
      if (r.error) {
        setResultaat(`Fout: ${r.error}`);
        return;
      }
      setResultaat(
        r.verwerkt === 0
          ? "Geen verlopen herinneringen om te verzilveren."
          : `${r.verwerkt} herinnering(en) verstuurd.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={klik}
        disabled={bezig}
        className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-md text-sm inline-flex items-center gap-2 disabled:opacity-60"
        title="Loopt langs alle verlopen 'open' herinneringen en stuurt ze nu"
      >
        {bezig ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
        Verlopen nu versturen
      </button>
      {resultaat && (
        <span className="text-xs text-gray-600">{resultaat}</span>
      )}
    </div>
  );
}
