"use client";

import { useState, useTransition } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import { verstuurSetterAbonnementMail } from "./setter-mail-actions";

export function SetterMailKnop({ userId, naam }: { userId: string; naam: string }) {
  const [pending, start] = useTransition();
  const [gelukt, setGelukt] = useState(false);

  function klik() {
    if (!confirm(`Stuur abonnement-betaallink (opnieuw) naar ${naam}?`)) return;
    start(async () => {
      const r = await verstuurSetterAbonnementMail(userId);
      if (r.ok) {
        setGelukt(true);
        setTimeout(() => setGelukt(false), 3000);
      } else {
        alert(r.error ?? "Versturen mislukt");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={klik}
      disabled={pending}
      title="Abonnement-mail (opnieuw) versturen"
      className={`p-1.5 rounded-md transition-colors ${
        gelukt
          ? "text-emerald-700 bg-emerald-50"
          : "text-gray-400 hover:text-[#333399] hover:bg-indigo-50"
      } disabled:opacity-50`}
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : gelukt ? <Check size={14} /> : <Mail size={14} />}
    </button>
  );
}
