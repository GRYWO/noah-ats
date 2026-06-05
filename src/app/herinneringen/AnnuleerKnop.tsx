"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { annuleerHerinnering } from "./actions";

export function AnnuleerKnop({ id }: { id: string }) {
  const [bezig, startTransition] = useTransition();
  const router = useRouter();

  function annuleer() {
    if (!confirm("Deze herinnering annuleren?")) return;
    const fd = new FormData();
    fd.append("id", id);
    startTransition(async () => {
      const r = await annuleerHerinnering(fd);
      if (!r.ok) {
        alert(r.error ?? "Annuleren mislukt");
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={annuleer}
      disabled={bezig}
      className="text-red-600 hover:text-red-700 text-sm inline-flex items-center gap-1 disabled:opacity-60"
    >
      {bezig ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      Annuleren
    </button>
  );
}
