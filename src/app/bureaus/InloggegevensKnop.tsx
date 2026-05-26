"use client";

import { useState, useTransition } from "react";
import { Send, Loader2, Check } from "lucide-react";
import { stuurInloggegevensBureau } from "./inloggegevens-actions";

export function InloggegevensKnop({ tenantId, bureauNaam, heeftEmail }: {
  tenantId: string;
  bureauNaam: string;
  heeftEmail: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [gelukt, setGelukt] = useState(false);

  if (!heeftEmail) {
    return <span className="text-xs text-gray-400">Geen contact-email</span>;
  }

  function verstuur() {
    if (!confirm(`Inloggegevens naar de contactpersoon van ${bureauNaam} versturen? Er wordt een nieuw wachtwoord aangemaakt.`)) return;
    const fd = new FormData();
    fd.append("tenant_id", tenantId);
    startTransition(async () => {
      const r = await stuurInloggegevensBureau(fd);
      if (r?.ok) {
        setGelukt(true);
        setTimeout(() => setGelukt(false), 3000);
      } else {
        alert(r?.error ?? "Versturen mislukt");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={verstuur}
      disabled={pending}
      title={`Inloggegevens mailen naar contactpersoon ${bureauNaam}`}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md disabled:opacity-50 ${
        gelukt ? "bg-emerald-50 text-emerald-700" : "text-[#333399] hover:bg-[#333399]/5"
      }`}
    >
      {pending ? <Loader2 size={11} className="animate-spin" /> : gelukt ? <Check size={11} /> : <Send size={11} />}
      {gelukt ? "Verzonden" : "Inloggegevens sturen"}
    </button>
  );
}
