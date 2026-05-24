"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Loader2, Clock, Mail, Phone } from "lucide-react";
import { voegToeWachtendOpCv, verwijderWachtend } from "./wachtend-actions";

type Wachtend = {
  id: string;
  voornaam: string;
  achternaam: string;
  telefoon: string | null;
  email: string | null;
  notitie: string | null;
  created_at: string;
};

function dagenSinds(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

function kleurVoorDagen(dagen: number): string {
  if (dagen >= 4) return "bg-red-50 border-red-200 text-red-800";
  if (dagen >= 2) return "bg-amber-50 border-amber-200 text-amber-800";
  return "bg-emerald-50 border-emerald-200 text-emerald-800";
}

export function WachtendOpCvSectie({ wachtenden }: { wachtenden: Wachtend[] }) {
  const [tonen, setTonen] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onVerwijder(id: string) {
    const fd = new FormData();
    fd.append("id", id);
    startTransition(async () => {
      await verwijderWachtend(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Knop om form te tonen */}
      {!tonen && (
        <button
          type="button"
          onClick={() => setTonen(true)}
          className="text-sm text-[#333399] hover:underline font-semibold inline-flex items-center gap-1.5"
        >
          <UserPlus size={14} />
          Of: voeg toe zonder CV (in afwachting)
        </button>
      )}

      {/* Form */}
      {tonen && (
        <form action={voegToeWachtendOpCv} className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-sm inline-flex items-center gap-2">
              <UserPlus size={14} /> In afwachting van CV
            </h3>
            <button type="button" onClick={() => setTonen(false)} className="text-gray-400 hover:text-gray-700">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Voornaam *</label>
              <input name="voornaam" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Achternaam *</label>
              <input name="achternaam" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Telefoon</label>
              <input name="telefoon" placeholder="+31 6 12345678" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail</label>
              <input name="email" type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Notitie (optioneel)</label>
              <input name="notitie" placeholder="bv. CV beloofd op dinsdag" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-2 rounded-md text-sm">
              Toevoegen aan wachtlijst
            </button>
          </div>
        </form>
      )}

      {/* Lijst */}
      {wachtenden.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800 text-sm inline-flex items-center gap-2">
              <Clock size={14} className="text-amber-600" />
              In afwachting van CV ({wachtenden.length})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Auto-verwijderd na 7 dagen — groen 0-1 dag, oranje 2-3 dagen, rood vanaf 4 dagen.</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {wachtenden.map((w) => {
              const dagen = dagenSinds(w.created_at);
              const kleur = kleurVoorDagen(dagen);
              return (
                <li key={w.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <span className={`text-xs font-bold rounded-full border px-2 py-1 ${kleur} whitespace-nowrap`}>
                    {dagen === 0 ? "vandaag" : `${dagen} dag${dagen === 1 ? "" : "en"}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-800 truncate">
                      {w.voornaam} {w.achternaam}
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-3 mt-0.5">
                      {w.telefoon && (
                        <a href={`tel:${w.telefoon}`} className="text-[#333399] hover:underline inline-flex items-center gap-1">
                          <Phone size={10} /> {w.telefoon}
                        </a>
                      )}
                      {w.email && (
                        <a href={`mailto:${w.email}`} className="text-[#333399] hover:underline inline-flex items-center gap-1">
                          <Mail size={10} /> {w.email}
                        </a>
                      )}
                      {w.notitie && <span className="italic">{w.notitie}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onVerwijder(w.id)}
                    disabled={pending}
                    title="Verwijderen"
                    className="text-gray-400 hover:text-red-600 p-1"
                  >
                    {pending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
