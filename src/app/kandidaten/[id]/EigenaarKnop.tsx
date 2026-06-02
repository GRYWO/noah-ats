"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCog, Loader2, Check, X } from "lucide-react";
import { wijzigEigenaar } from "./actions";

type User = {
  id: string;
  voornaam: string | null;
  achternaam: string | null;
  rol: string;
};

type Props = {
  kandidaatId: string;
  huidigeEigenaarId: string | null;
  users: User[];
};

export function EigenaarKnop({ kandidaatId, huidigeEigenaarId, users }: Props) {
  const [open, setOpen] = useState(false);
  const [bezig, startTransition] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const router = useRouter();

  const huidigeEigenaar = users.find((u) => u.id === huidigeEigenaarId);
  const huidigLabel = huidigeEigenaar
    ? `${huidigeEigenaar.voornaam ?? ""} ${huidigeEigenaar.achternaam ?? ""}`.trim() ||
      "Onbekend"
    : "Geen eigenaar";

  function wijzig(nieuweId: string | null) {
    setFout(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("kandidaat_id", kandidaatId);
      if (nieuweId) fd.append("eigenaar_id", nieuweId);
      const r = await wijzigEigenaar(fd);
      if (r.error) {
        setFout(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#333399] bg-[#333399]/10 hover:bg-[#333399]/20 rounded-md transition"
      >
        <UserCog size={14} />
        Eigenaar: <span className="font-bold">{huidigLabel}</span>
      </button>

      {open && (
        <>
          {/* Overlay om dichtklikken */}
          <button
            type="button"
            aria-label="Sluit menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-transparent"
          />
          <div className="absolute z-40 mt-2 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 w-72 max-h-96 overflow-auto py-1">
            <div className="px-3 py-2 border-b text-xs font-semibold text-gray-500 uppercase">
              Kies nieuwe eigenaar
            </div>

            <button
              type="button"
              onClick={() => wijzig(null)}
              disabled={bezig}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${
                !huidigeEigenaarId ? "bg-[#333399]/5" : ""
              }`}
            >
              <span className="text-gray-500 italic">— Geen eigenaar —</span>
              {!huidigeEigenaarId && <Check size={16} className="text-[#333399]" />}
            </button>

            {users.map((u) => {
              const naam = `${u.voornaam ?? ""} ${u.achternaam ?? ""}`.trim() || "Onbekend";
              const isHuidig = u.id === huidigeEigenaarId;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => wijzig(u.id)}
                  disabled={bezig}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    isHuidig ? "bg-[#333399]/5" : ""
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="font-semibold text-gray-800">{naam}</span>
                    <span className="text-[11px] text-gray-500 capitalize">{u.rol}</span>
                  </span>
                  {isHuidig && <Check size={16} className="text-[#333399]" />}
                </button>
              );
            })}

            {bezig && (
              <div className="px-4 py-2 text-xs text-gray-500 flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" /> Bezig...
              </div>
            )}
            {fout && (
              <div className="px-4 py-2 text-xs text-red-700 bg-red-50 flex items-start gap-1">
                <X size={14} className="flex-shrink-0 mt-0.5" />
                {fout}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
