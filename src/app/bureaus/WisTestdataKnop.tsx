"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { wisAlleTestdata } from "./wis-actions";

export function WisTestdataKnop() {
  const [pending, startTransition] = useTransition();

  function wis() {
    const bevestiging1 = confirm(
      "ALLE kandidaten, setters, recruiters en gerelateerde data (voorstellen, plaatsingen, EOD-rapporten, coaching-aanvragen, agenda, notificaties) worden verwijderd. Tenants en admins blijven.\n\nWeet je het zeker?"
    );
    if (!bevestiging1) return;
    const bevestiging2 = prompt("Typ WIS om definitief te bevestigen:");
    if (bevestiging2 !== "WIS") return;

    startTransition(async () => {
      const r = await wisAlleTestdata();
      if (r?.ok) {
        alert("Klaar — " + (r.samenvatting ?? ""));
      } else {
        alert("Mislukt: " + (r?.error ?? "onbekende fout"));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={wis}
      disabled={pending}
      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-md text-sm"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      Wis alle test-data
    </button>
  );
}
