"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Loader2 } from "lucide-react";
import { bewerkUser } from "./actions";

type Props = {
  user: {
    id: string;
    voornaam: string | null;
    achternaam: string | null;
    telefoon: string | null;
    voys_nummer: string | null;
    mail_adres: string | null;
    functie_titel: string | null;
    rol: string;
  };
  magRolWijzigen: boolean;
};

export function BewerkUserKnop({ user, magRolWijzigen }: Props) {
  const [open, setOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [bezig, setBezig] = useState(false);
  const router = useRouter();

  function onSubmit(fd: FormData) {
    setFout(null);
    setBezig(true);
    startTransition(async () => {
      const r = await bewerkUser(fd);
      setBezig(false);
      if (r?.error) {
        setFout(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Bewerken"
        className="text-gray-500 hover:text-[#333399] p-1.5 rounded-md hover:bg-gray-100"
      >
        <Pencil size={14} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800">User bewerken</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
            <form action={onSubmit} className="p-5 grid grid-cols-2 gap-4">
              <input type="hidden" name="id" value={user.id} />

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Voornaam *</label>
                <input name="voornaam" defaultValue={user.voornaam ?? ""} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Achternaam *</label>
                <input name="achternaam" defaultValue={user.achternaam ?? ""} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon (mobiel)</label>
                <input name="telefoon" defaultValue={user.telefoon ?? ""} placeholder="+31 6 12345678" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Voys-nummer</label>
                <input name="voys_nummer" defaultValue={user.voys_nummer ?? ""} placeholder="+31 85 ..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mail-adres bedrijf</label>
                <input name="mail_adres" type="email" defaultValue={user.mail_adres ?? ""} placeholder="voorbeeld@noah-recruitment.nl" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Functietitel</label>
                <input name="functie_titel" defaultValue={user.functie_titel ?? ""} placeholder="bv. Recruitment Consultant" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                <small className="text-gray-400 text-xs">Verschijnt onder de mail-handtekening (admin altijd; recruiter/setter alleen als ingevuld)</small>
              </div>
              {magRolWijzigen && (
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Rol</label>
                  <select name="rol" defaultValue={user.rol} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="setter">Setter</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              {fout && (
                <div className="col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-2">
                  {fout}
                </div>
              )}

              <div className="col-span-2 flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2">
                  Annuleren
                </button>
                <button type="submit" disabled={bezig} className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
                  {bezig && <Loader2 size={12} className="animate-spin" />}
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
