"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { updateSetterVoysNummer } from "./actions";

export function InlineVoysEdit({
  setterId,
  huidig,
  kanBewerken,
}: {
  setterId: string;
  huidig: string | null;
  kanBewerken: boolean;
}) {
  const [bewerken, setBewerken] = useState(false);
  const [waarde, setWaarde] = useState(huidig ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!kanBewerken) {
    return <span className="text-gray-600">{huidig ?? "—"}</span>;
  }

  if (!bewerken) {
    return (
      <button
        type="button"
        onClick={() => setBewerken(true)}
        className="inline-flex items-center gap-1 group text-gray-600 hover:text-[#333399]"
        title="Voys-nummer wijzigen"
      >
        <span>{huidig ?? "—"}</span>
        <Pencil size={11} className="opacity-0 group-hover:opacity-100" />
      </button>
    );
  }

  function opslaan() {
    const fd = new FormData();
    fd.append("id", setterId);
    fd.append("voys_nummer", waarde.trim());
    startTransition(async () => {
      await updateSetterVoysNummer(fd);
      setBewerken(false);
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        value={waarde}
        onChange={(e) => setWaarde(e.target.value)}
        placeholder="+31 85 ..."
        autoFocus
        className="px-2 py-1 border border-gray-300 rounded text-xs w-32"
        onKeyDown={(e) => {
          if (e.key === "Enter") opslaan();
          if (e.key === "Escape") {
            setWaarde(huidig ?? "");
            setBewerken(false);
          }
        }}
      />
      <button
        type="button"
        onClick={opslaan}
        disabled={pending}
        title="Opslaan"
        className="text-emerald-600 hover:text-emerald-800 p-1"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
      </button>
      <button
        type="button"
        onClick={() => { setWaarde(huidig ?? ""); setBewerken(false); }}
        disabled={pending}
        title="Annuleren"
        className="text-gray-400 hover:text-red-600 p-1"
      >
        <X size={12} />
      </button>
    </div>
  );
}
