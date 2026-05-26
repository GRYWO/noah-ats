import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { nieuweOpdrachtgever } from "./actions";
import { PaginaTour } from "@/components/PaginaTour";
import { TOUR_OPDRACHTGEVERS } from "@/utils/pagina-tours";

const STATUS_KLEUREN: Record<string, string> = {
  lead:      "bg-blue-100 text-blue-800",
  prospect:  "bg-amber-100 text-amber-800",
  klant:     "bg-emerald-100 text-emerald-800",
  ex_klant:  "bg-red-100 text-red-800",
  partner:   "bg-purple-100 text-purple-800",
};

const STATUS_LABELS: Record<string, string> = {
  lead:     "Lead",
  prospect: "Prospect",
  klant:    "Klant",
  ex_klant: "Ex-klant",
  partner:  "Partner",
};

export default async function OpdrachtgeversPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; status?: string }>;
}) {
  const { ok, error, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("opdrachtgevers")
    .select("*")
    .order("naam", { ascending: true });

  if (status) query = query.eq("status", status);

  const { data: opdrachtgevers } = await query;
  const totaal = opdrachtgevers?.length ?? 0;

  // Counts per status
  const { data: alle } = await supabase.from("opdrachtgevers").select("status");
  const counts: Record<string, number> = { lead: 0, prospect: 0, klant: 0, ex_klant: 0, partner: 0 };
  (alle ?? []).forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1; });

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="opdrachtgevers" />
      <PaginaTour pad="/opdrachtgevers" naam="CRM" stappen={TOUR_OPDRACHTGEVERS} />

      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Relaties</h1>
            <p className="text-gray-500 text-sm mt-1">{totaal} {status ? `(${STATUS_LABELS[status]})` : "totaal"}</p>
          </div>
        </div>

        {ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            {ok === "verwijderd" ? "Relatie verwijderd" : "Opgeslagen"}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Status filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Link href="/opdrachtgevers" className={`text-xs px-3 py-1.5 rounded-full border ${!status ? "bg-[#333399] text-white border-[#333399]" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}>
            Alle ({Object.values(counts).reduce((a, b) => a + b, 0)})
          </Link>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <Link
              key={key}
              href={`/opdrachtgevers?status=${key}`}
              className={`text-xs px-3 py-1.5 rounded-full border ${status === key ? "bg-[#333399] text-white border-[#333399]" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
            >
              {label} ({counts[key] ?? 0})
            </Link>
          ))}
        </div>

        {/* Nieuw form */}
        <details className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          <summary className="cursor-pointer p-4 bg-[#333399] text-white font-semibold">
            Nieuwe relatie
          </summary>
          <form action={nieuweOpdrachtgever} className="p-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Bedrijfsnaam *</label>
              <input name="naam" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select name="status" defaultValue="lead" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">KvK-nummer</label>
              <input name="kvk" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">BTW-nummer</label>
              <input name="btw_nummer" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Adres</label>
              <input name="adres" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Plaats</label>
              <input name="plaats" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Website</label>
              <input name="website" placeholder="https://" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Branche</label>
              <input name="branche" placeholder="bv IT, Bouw, Sales" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notitie</label>
              <textarea name="notitie" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"></textarea>
            </div>
            <div className="col-span-2 flex justify-end">
              <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-2 rounded-md text-sm">
                Opslaan
              </button>
            </div>
          </form>
        </details>

        {/* Lijst */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {opdrachtgevers && opdrachtgevers.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Bedrijf</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Plaats</th>
                  <th className="text-left px-4 py-3 font-semibold">Branche</th>
                  <th className="text-left px-4 py-3 font-semibold">KvK</th>
                </tr>
              </thead>
              <tbody>
                {opdrachtgevers.map(o => (
                  <tr key={o.id} className="border-t hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      <Link href={`/opdrachtgevers/${o.id}`} className="block">{o.naam}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/opdrachtgevers/${o.id}`} className="block">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_KLEUREN[o.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600"><Link href={`/opdrachtgevers/${o.id}`} className="block">{o.plaats ?? "—"}</Link></td>
                    <td className="px-4 py-3 text-sm text-gray-600"><Link href={`/opdrachtgevers/${o.id}`} className="block">{o.branche ?? "—"}</Link></td>
                    <td className="px-4 py-3 text-sm text-gray-600"><Link href={`/opdrachtgevers/${o.id}`} className="block">{o.kvk ?? "—"}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500 text-sm">
              Nog geen relaties. Klap &quot;Nieuwe relatie&quot; open om je eerste toe te voegen.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
