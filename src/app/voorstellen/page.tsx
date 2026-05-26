import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { Mail, MailOpen, Check, X, Clock } from "lucide-react";
import { PaginaTour } from "@/components/PaginaTour";
import { TOUR_VOORSTELLEN } from "@/utils/pagina-tours";

const STATUS_LABELS: Record<string, string> = {
  verzonden: "Wachten op reactie",
  uitnodigen: "Akkoord",
  niet_uitnodigen: "Afgewezen",
  verlopen: "Verlopen",
};

const STATUS_KLEUREN: Record<string, string> = {
  verzonden: "bg-amber-100 text-amber-800 border-amber-200",
  uitnodigen: "bg-emerald-100 text-emerald-800 border-emerald-200",
  niet_uitnodigen: "bg-red-100 text-red-800 border-red-200",
  verlopen: "bg-gray-100 text-gray-600 border-gray-300",
};

const ALLE_STATUSSEN = ["verzonden", "uitnodigen", "niet_uitnodigen", "verlopen"] as const;

export default async function VoorstellenPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user?.id ?? "")
    .single();
  const isSetter = profile?.rol === "setter";

  let query = supabase
    .from("voorstellen")
    .select(`
      id, status, verzonden_op, geopend_op, reactie_op, bedrijf,
      opdrachtgever_email, opdrachtgever_naam, kennismaking_op, token,
      kandidaat:kandidaten(id, voornaam, tussenvoegsel, achternaam),
      setter:profiles!voorstellen_setter_id_fkey(voornaam, achternaam)
    `)
    .order("verzonden_op", { ascending: false })
    .limit(200);

  // Setter ziet alleen eigen voorstellen
  if (isSetter && user) {
    query = query.eq("setter_id", user.id);
  }

  if (status && status !== "alle") {
    query = query.eq("status", status);
  }

  const { data: voorstellenRaw } = await query;
  type VoorstelRow = {
    id: string;
    status: string;
    verzonden_op: string;
    geopend_op: string | null;
    reactie_op: string | null;
    bedrijf: string | null;
    opdrachtgever_email: string;
    opdrachtgever_naam: string | null;
    kennismaking_op: string | null;
    token: string;
    kandidaat: { id: string; voornaam: string; tussenvoegsel: string | null; achternaam: string } | null;
    setter: { voornaam: string; achternaam: string } | null;
  };
  let voorstellen = ((voorstellenRaw ?? []) as unknown as VoorstelRow[]);

  // Vrije zoekterm op kandidaat- of opdrachtgever-naam
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    voorstellen = voorstellen.filter(v => {
      const k = v.kandidaat;
      const knm = k ? `${k.voornaam} ${k.achternaam}`.toLowerCase() : "";
      const onm = (v.opdrachtgever_naam ?? "").toLowerCase();
      const bdr = (v.bedrijf ?? "").toLowerCase();
      const oem = (v.opdrachtgever_email ?? "").toLowerCase();
      return knm.includes(term) || onm.includes(term) || bdr.includes(term) || oem.includes(term);
    });
  }

  // Tellingen (op de totale ongefilterde dataset, zonder de zoekterm)
  let telQuery = supabase.from("voorstellen").select("status");
  if (isSetter && user) {
    telQuery = telQuery.eq("setter_id", user.id);
  }
  const { data: alleVoor } = await telQuery;
  const aantallen: Record<string, number> = { alle: alleVoor?.length ?? 0 };
  for (const s of ALLE_STATUSSEN) aantallen[s] = 0;
  for (const v of alleVoor ?? []) {
    aantallen[v.status] = (aantallen[v.status] ?? 0) + 1;
  }

  const filters: Array<{ key: string; label: string; Icon?: typeof Mail }> = [
    { key: "alle", label: "Alle" },
    { key: "verzonden", label: STATUS_LABELS.verzonden, Icon: Mail },
    { key: "uitnodigen", label: STATUS_LABELS.uitnodigen, Icon: Check },
    { key: "niet_uitnodigen", label: STATUS_LABELS.niet_uitnodigen, Icon: X },
    { key: "verlopen", label: STATUS_LABELS.verlopen, Icon: Clock },
  ];

  const huidigFilter = status ?? "alle";

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="voorstellen" />
      <PaginaTour pad="/voorstellen" naam="Voorstellen" stappen={TOUR_VOORSTELLEN} />

      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Voorstellen</h1>
          <p className="text-xs text-gray-500 mt-1">
            {isSetter ? "Jouw verstuurde voorstellen" : "Alle voorstellen binnen het bureau"}
          </p>
        </div>

        {/* Stats + filter chips */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {filters.map(f => {
            const actief = huidigFilter === f.key;
            const aantal = aantallen[f.key] ?? 0;
            return (
              <Link
                key={f.key}
                href={`/voorstellen${f.key === "alle" ? "" : `?status=${f.key}`}${q ? `${f.key === "alle" ? "?" : "&"}q=${encodeURIComponent(q)}` : ""}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  actief
                    ? "bg-[#333399] text-white border-[#333399]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                }`}
              >
                {f.Icon && <f.Icon size={12} />}
                {f.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${actief ? "bg-white/20" : "bg-gray-100"}`}>{aantal}</span>
              </Link>
            );
          })}
        </div>

        {/* Zoek */}
        <form action="/voorstellen" method="get" className="mb-4 flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Zoek op kandidaat-naam, bedrijf of email..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
          />
          <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-2 rounded-md text-sm">
            Zoek
          </button>
          {q && (
            <Link href={`/voorstellen${status ? `?status=${status}` : ""}`} className="text-sm text-gray-600 hover:underline">
              Wissen
            </Link>
          )}
        </form>

        {/* Tabel */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {voorstellen.length === 0 ? (
            <p className="text-sm text-gray-500 p-6">Geen voorstellen gevonden.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4">Kandidaat</th>
                  <th className="text-left py-3 px-4">Opdrachtgever</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Verzonden</th>
                  <th className="text-left py-3 px-4">Geopend</th>
                  <th className="text-left py-3 px-4">Reactie</th>
                  <th className="text-left py-3 px-4">Setter</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {voorstellen.map(v => {
                  const k = v.kandidaat;
                  const s = v.setter;
                  return (
                    <tr key={v.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {k ? (
                          <Link href={`/kandidaten/${k.id}`} className="font-semibold text-[#333399] hover:underline">
                            {k.voornaam} {k.tussenvoegsel ? `${k.tussenvoegsel} ` : ""}{k.achternaam}
                          </Link>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{v.bedrijf ?? v.opdrachtgever_naam ?? "—"}</div>
                        <div className="text-xs text-gray-500 truncate">{v.opdrachtgever_email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_KLEUREN[v.status] ?? "bg-gray-100"}`}>
                          {STATUS_LABELS[v.status] ?? v.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {new Date(v.verzonden_op).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {v.geopend_op ? (
                          <span className="inline-flex items-center gap-1 text-blue-700">
                            <MailOpen size={12} />
                            {new Date(v.geopend_op).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" })}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {v.reactie_op
                          ? new Date(v.reactie_op).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" })
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {s ? `${s.voornaam} ${s.achternaam}` : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`/voorstel/${v.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#333399] hover:underline"
                        >
                          Bekijk
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {voorstellen.length === 200 && (
          <p className="text-xs text-gray-500 mt-3 text-center">
            Toont eerste 200. Gebruik filters of zoek om te verfijnen.
          </p>
        )}
      </div>
    </main>
  );
}
