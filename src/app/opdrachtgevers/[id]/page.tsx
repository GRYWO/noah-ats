import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { updateOpdrachtgever, nieuweContactpersoon } from "../actions";
import { DeleteOpdrachtgeverButton, DeleteContactButton } from "./DeleteButtons";

const STATUS_LABELS: Record<string, string> = {
  lead:     "Lead",
  prospect: "Prospect",
  klant:    "Klant",
  ex_klant: "Ex-klant",
  partner:  "Partner",
};

export default async function OpdrachtgeverDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();

  const { data: o } = await supabase
    .from("opdrachtgevers")
    .select("*")
    .eq("id", id)
    .single();

  if (!o) notFound();

  const { data: contacten } = await supabase
    .from("contactpersonen")
    .select("*")
    .eq("opdrachtgever_id", id)
    .order("primair", { ascending: false })
    .order("achternaam", { ascending: true });

  return (
    <main className="min-h-screen bg-[#f4f4f7]">
      <TopBar active="opdrachtgevers" />

      <div className="p-8 max-w-5xl mx-auto">
        <Link href="/opdrachtgevers" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block">
          ← Terug naar relaties
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{o.naam}</h1>
          <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-4">
            {o.plaats && <span>{o.plaats}</span>}
            {o.branche && <span>· {o.branche}</span>}
            {o.website && <span>· <a href={o.website.startsWith("http") ? o.website : `https://${o.website}`} target="_blank" className="text-[#333399] hover:underline">{o.website}</a></span>}
          </div>
        </div>

        {ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            {ok === "contact" ? "Contactpersoon toegevoegd" : "Opgeslagen"}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Bedrijfsgegevens */}
        <form action={updateOpdrachtgever} className="space-y-6">
          <input type="hidden" name="id" value={o.id} />

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Bedrijfsgegevens</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Bedrijfsnaam *</label>
                <input name="naam" required defaultValue={o.naam ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                <select name="status" defaultValue={o.status ?? "lead"} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">KvK-nummer</label>
                <input name="kvk" defaultValue={o.kvk ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">BTW-nummer</label>
                <input name="btw_nummer" defaultValue={o.btw_nummer ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Adres</label>
                <input name="adres" defaultValue={o.adres ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Plaats</label>
                <input name="plaats" defaultValue={o.plaats ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Branche</label>
                <input name="branche" defaultValue={o.branche ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Website</label>
                <input name="website" defaultValue={o.website ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notitie</label>
                <textarea name="notitie" rows={3} defaultValue={o.notitie ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"></textarea>
              </div>
            </div>
          </div>

          <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-2 rounded-md text-sm">
            Opslaan
          </button>
        </form>

        {/* Contactpersonen */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Contactpersonen ({contacten?.length ?? 0})</h2>

          <details className="mb-4">
            <summary className="cursor-pointer text-[#333399] font-semibold text-sm py-2">
              + Nieuwe contactpersoon
            </summary>
            <form action={nieuweContactpersoon} className="mt-3 grid grid-cols-2 gap-3">
              <input type="hidden" name="opdrachtgever_id" value={o.id} />
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Voornaam *</label>
                <input name="voornaam" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Achternaam *</label>
                <input name="achternaam" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tussenvoegsel</label>
                <input name="tussenvoegsel" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Functie</label>
                <input name="functie" placeholder="bv HR Manager" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon</label>
                <input name="telefoon" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
                <input name="email" type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" name="primair" id="primair" className="w-4 h-4 accent-[#333399]" />
                <label htmlFor="primair" className="text-sm text-gray-700">Primaire contactpersoon</label>
              </div>
              <div className="col-span-2 flex justify-end">
                <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-2 rounded-md text-sm">
                  Toevoegen
                </button>
              </div>
            </form>
          </details>

          {contacten && contacten.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left py-2">Naam</th>
                  <th className="text-left py-2">Functie</th>
                  <th className="text-left py-2">Telefoon</th>
                  <th className="text-left py-2">E-mail</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contacten.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="py-3">
                      <div className="font-semibold text-gray-800">
                        {c.voornaam} {c.tussenvoegsel ? `${c.tussenvoegsel} ` : ""}{c.achternaam}
                        {c.primair && <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Primair</span>}
                      </div>
                    </td>
                    <td className="py-3 text-gray-600">{c.functie ?? "—"}</td>
                    <td className="py-3 text-gray-600">{c.telefoon ?? "—"}</td>
                    <td className="py-3 text-gray-600">{c.email ?? "—"}</td>
                    <td className="py-3 text-right">
                      <DeleteContactButton id={c.id} opdrachtgeverId={o.id} naam={`${c.voornaam} ${c.achternaam}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500">Geen contactpersonen.</p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <DeleteOpdrachtgeverButton id={o.id} naam={o.naam} />
        </div>
      </div>
    </main>
  );
}
