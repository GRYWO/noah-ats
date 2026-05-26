"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Check } from "lucide-react";
import { resetUserWachtwoord } from "./reset-actions";

export function ResetWachtwoordKnop({ userId, naam }: { userId: string; naam: string }) {
  const [pending, startTransition] = useTransition();
  const [gelukt, setGelukt] = useState(false);

  function reset() {
    if (!confirm(`Weet je zeker dat je het wachtwoord van ${naam} wilt resetten? Er wordt een nieuw tijdelijk wachtwoord per mail verstuurd.`)) return;
    const fd = new FormData();
    fd.append("user_id", userId);
    startTransition(async () => {
      const r = await resetUserWachtwoord(fd);
      if (r?.ok) {
        setGelukt(true);
        setTimeout(() => setGelukt(false), 3000);
      } else {
        // Toon volledige error zodat Resend-feedback zichtbaar is
        alert(r?.error ?? "Reset mislukt — controleer Vercel-logs voor details");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={reset}
      disabled={pending}
      title={`Nieuw wachtwoord mailen naar ${naam}`}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md disabled:opacity-50 ${
        gelukt ? "bg-emerald-50 text-emerald-700" : "text-[#333399] hover:bg-[#333399]/5"
      }`}
    >
      {pending ? <Loader2 size={11} className="animate-spin" /> : gelukt ? <Check size={11} /> : <KeyRound size={11} />}
      {gelukt ? "Verzonden" : "Wachtwoord resetten"}
    </button>
  );
}
