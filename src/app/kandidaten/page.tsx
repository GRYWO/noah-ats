import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { nieuweKandidaat } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  nieuw: "bg-blue-100 text-blue-800",
  talentpool: "bg-emerald-100 text-emerald-800",
  in_proces: "bg-green-100 text-green-800",
  bemiddelbaar: "bg-amber-100 text-amber-800",
  geplaatst: "bg-sky-100 text-sky-800",
};

export default async function KandidatenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user!.id)
    .single();

  const isSetter = myProfile?.rol === "setter";

  const { data: kandidaten } = await supabase
    .from("kandidaten")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="kandidaten" />

      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Kandidaten</h1>
            <p className="text-gray-500 text-sm mt-1">{kandidaten?.length ?? 0} totaal</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Quick form — alleen recruiters + admins */}
        {!isSetter && (
        <details className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          <summary className="cursor-pointer p-4 bg-[#333399] text-white font-semibold">
            + Nieuwe kandidaat toevoegen
          </summary>
          <form action={nieuweKandidaat} className="p-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Voornaam *</label>
              <input name="voornaam" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Achternaam *</label>
              <input name="achternaam" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
              <input name="email" type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon</label>
              <input name="telefoon" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Woonplaats</label>
              <input name="woonplaats" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Leeftijd</label>
              <input name="leeftijd" type="number" min="16" max="99" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Open voor functies</label>
              <input name="open_voor" placeholder="bv Python Engineer, Sales Manager" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
            </div>
            <div className="col-span-2 flex justify-end">
              <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-2 rounded-md text-sm">
                Opslaan
              </button>
            </div>
          </form>
        </details>
        )}

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {kandidaten && kandidaten.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Naam</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Telefoon</th>
                  <th className="text-left px-4 py-3 font-semibold">E-mail</th>
                  <th className="text-left px-4 py-3 font-semibold">Woonplaats</th>
                  <th className="text-left px-4 py-3 font-semibold">Open voor</th>
                </tr>
              </thead>
              <tbody>
                {kandidaten.map((k) => (
                  <tr key={k.id} className="border-t hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      <Link href={`/kandidaten/${k.id}`} className="block hover:text-[#333399]">
                        {k.voornaam} {k.tussenvoegsel ? `${k.tussenvoegsel} ` : ""}{k.achternaam}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/kandidaten/${k.id}`} className="block">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[k.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {k.status}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600"><Link href={`/kandidaten/${k.id}`} className="block">{k.telefoon ?? "—"}</Link></td>
                    <td className="px-4 py-3 text-sm text-gray-600"><Link href={`/kandidaten/${k.id}`} className="block">{k.email ?? "—"}</Link></td>
                    <td className="px-4 py-3 text-sm text-gray-600"><Link href={`/kandidaten/${k.id}`} className="block">{k.woonplaats ?? "—"}</Link></td>
                    <td className="px-4 py-3 text-sm text-gray-600"><Link href={`/kandidaten/${k.id}`} className="block">{k.open_voor ?? "—"}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <p className="text-sm">Nog geen kandidaten. Klap "+ Nieuwe kandidaat toevoegen" open om je eerste toe te voegen.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
