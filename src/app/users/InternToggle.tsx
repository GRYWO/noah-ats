"use client";

import { useState, useTransition } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toggleInternPersoneel } from "./sales-admin-actions";

export function InternToggle({
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
      ? "Intern-personeel vlag weghalen? Deze admin krijgt dan weer een bureau-view."
      : "Markeren als intern Noah/GRYWO personeel? Deze admin krijgt dan de volledige admin-view i.p.v. bureau-view."
    )) return;
    setAan(!aan);
    start(async () => {
      await toggleInternPersoneel(userId);
    });
  }

  return (
    <button
      type="button"
      onClick={klik}
      disabled={pending}
      title={aan ? "Intern personeel: actief" : "Niet intern"}
      className={`p-1.5 rounded-md transition-colors ${
        aan
          ? "text-[#333399] bg-indigo-50 hover:bg-indigo-100"
          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
      }`}
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
    </button>
  );
}
