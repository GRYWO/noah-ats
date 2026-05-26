"use client";

import { useState } from "react";
import { PlayCircle, Loader2 } from "lucide-react";

export function TourHerstartKnop() {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBezig(true);
    setFout(null);
    try {
      // Lokale flag wissen zodat de tour 100% start, ook als DB-call faalt
      try { localStorage.removeItem("noah-tour-gezien"); } catch {}
      const r = await fetch("/api/profile/onboarding-voltooid", { method: "DELETE" });
      if (!r.ok) {
        setFout("Reset mislukt — probeer opnieuw.");
        setBezig(false);
        return;
      }
      // Forceer reload van /dashboard (ook als we daar al zijn)
      window.location.assign("/dashboard?tour=1");
    } catch (e) {
      setFout((e as Error).message);
      setBezig(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={bezig}
        className="text-sm text-[#333399] hover:underline font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
      >
        {bezig ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
        {bezig ? "Bezig..." : "Tour opnieuw bekijken"}
      </button>
      {fout && <span className="text-xs text-red-600">{fout}</span>}
    </div>
  );
}
