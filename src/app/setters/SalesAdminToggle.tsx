"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toggleSalesAdmin } from "./sales-admin-actions";

export function SalesAdminToggle({
  userId,
  actief,
}: {
  userId: string;
  actief: boolean;
}) {
  const [aan, setAan] = useState(actief);
  const [pending, start] = useTransition();

  function klik() {
    if (!confirm(aan
      ? "Sales-admin rechten intrekken? Deze user kan dan geen bureaus + abonnementen meer aanmaken."
      : "Sales-admin rechten geven? Deze user mag dan bureaus aanmaken én abonnementen activeren (maar geen tarieven aanpassen)."
    )) return;
    setAan(!aan);
    start(async () => {
      await toggleSalesAdmin(userId);
    });
  }

  return (
    <button
      type="button"
      onClick={klik}
      disabled={pending}
      title={aan ? "Sales-admin: actief" : "Geen sales-admin"}
      className={`p-1.5 rounded-md transition-colors ${
        aan
          ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
      }`}
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
    </button>
  );
}
