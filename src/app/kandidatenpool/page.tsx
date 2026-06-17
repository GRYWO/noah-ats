import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { getViewerRol } from "@/utils/view-as";
import { logPerf } from "@/utils/perf";
import { PoolFilter } from "./PoolFilter";
import { PoolKaartActies } from "./PoolKaartActies";

const PAGE_SIZE = 50;

type SearchParams = {
  ok?: string;
  error?: string;
  page?: string;
  q?: string;
  functie?: string;
  woonplaats?: string;
  max_km?: string;
  leeftijd_min?: string;
  leeftijd_max?: string;
  rijbewijs?: string;
  eigen_vervoer?: string;
  werkvergunning?: string;
  taal_ok?: string;
  uren_min?: string;
  uren_max?: string;
  beschikbaarheid?: string;
  ai_oordeel?: string;
  orderBy?: string;
};

function orderToColumn(orderBy: string | undefined): { kolom: string; asc: boolean } {
  switch (orderBy) {
    case "created_at_asc":
      return { kolom: "created_at", asc: true };
    case "naam_asc":
      return { kolom: "voornaam", asc: true };
    case "created_at_desc":
    default:
      return { kolom: "created_at", asc: false };
  }
}

export default async function KandidatenpoolPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t0 = performance.now();
  const params = await searchParams;
  const pageNum = Math.max(1, parseInt(params.page ?? "1") || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const [{ data: { user } }, viewer] = await Promise.all([
    supabase.auth.getUser(),
    getViewerRol(),
  ]);

  if (!user) redirect("/login");

  // Setters en bureau-admins krijgen geen toegang tot de pool
  if (viewer.isSetter || viewer.isBureauAdminDemo) {
    redirect("/dashboard");
  }

  // Tenant ophalen
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) redirect("/dashboard");

  // Bouw de query
  const { kolom, asc } = orderToColumn(params.orderBy);
  let query = supabase
    .from("kandidaten")
    .select(
      "id, voornaam, tussenvoegsel, achternaam, email, woonplaats, leeftijd, open_voor, soort_dienstverband, uren_per_week, salaris_indicatie, beschikbaarheid, website_intake_ai_oordeel",
      { count: "planned" },
    )
    .eq("tenant_id", profile.tenant_id)
    .eq("kanban_stap", "kandidatenpool")
    .order(kolom, { ascending: asc })
    .range(offset, offset + PAGE_SIZE - 1);

  // Free-text zoek (naam + e-mail)
  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    query = query.or(
      `voornaam.ilike.%${q}%,achternaam.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }
  if (params.functie && params.functie.trim()) {
    query = query.ilike("open_voor", `%${params.functie.trim()}%`);
  }
  if (params.woonplaats && params.woonplaats.trim()) {
    query = query.ilike("woonplaats", `%${params.woonplaats.trim()}%`);
  }
  if (params.max_km && /^\d+$/.test(params.max_km)) {
    query = query.lte("max_reisafstand_km", parseInt(params.max_km));
  }
  if (params.leeftijd_min && /^\d+$/.test(params.leeftijd_min)) {
    query = query.gte("leeftijd", parseInt(params.leeftijd_min));
  }
  if (params.leeftijd_max && /^\d+$/.test(params.leeftijd_max)) {
    query = query.lte("leeftijd", parseInt(params.leeftijd_max));
  }
  if (params.rijbewijs && params.rijbewijs.trim()) {
    query = query.ilike("rijbewijs", `%${params.rijbewijs.trim()}%`);
  }
  if (params.eigen_vervoer === "ja") query = query.eq("eigen_vervoer", true);
  if (params.eigen_vervoer === "nee") query = query.eq("eigen_vervoer", false);
  if (params.werkvergunning === "ja") query = query.eq("werkvergunning", true);
  if (params.werkvergunning === "nee") query = query.eq("werkvergunning", false);
  if (params.taal_ok === "ja") query = query.eq("nederlands_voldoende", true);
  if (params.taal_ok === "nee") query = query.eq("nederlands_voldoende", false);
  if (params.uren_min && /^\d+$/.test(params.uren_min)) {
    query = query.gte("uren_per_week", parseInt(params.uren_min));
  }
  if (params.uren_max && /^\d+$/.test(params.uren_max)) {
    query = query.lte("uren_per_week", parseInt(params.uren_max));
  }
  if (params.beschikbaarheid && params.beschikbaarheid.trim()) {
    query = query.ilike("beschikbaarheid", `%${params.beschikbaarheid.trim()}%`);
  }
  if (params.ai_oordeel === "goedgekeurd" || params.ai_oordeel === "afgekeurd") {
    query = query.eq("website_intake_ai_oordeel", params.ai_oordeel);
  } else if (params.ai_oordeel === "onbekend") {
    query = query.or("website_intake_ai_oordeel.is.null,website_intake_ai_oordeel.eq.");
  }

  const kandidatenRes = await query;
  const kandidaten = kandidatenRes.data ?? [];
  const totaal = kandidatenRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totaal / PAGE_SIZE));

  logPerf({
    pad: "/kandidatenpool",
    type: "page",
    duur_ms: performance.now() - t0,
    user_id: user.id,
    extra: { pageNum, totaal },
  });

  // Bewaar huidige querystring voor paginatie-links
  const huidigeParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && typeof v === "string" && k !== "page") huidigeParams.set(k, v);
  }

  const okBericht =
    params.ok === "uit_pool"
      ? "Kandidaat uit de pool gehaald"
      : params.ok === "naar_wachtrij"
        ? "Kandidaat doorgezet naar de wachtrij"
        : null;

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="kandidatenpool" />

      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Kandidatenpool</h1>
            <p className="text-gray-500 text-sm mt-1">
              {totaal} {totaal === 1 ? "kandidaat" : "kandidaten"} in de talentpool
              {totalPages > 1 && ` , pagina ${pageNum} van ${totalPages}`}
            </p>
          </div>
        </div>

        {okBericht && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            {okBericht}
          </div>
        )}
        {params.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {params.error}
          </div>
        )}

        <PoolFilter
          q={params.q}
          functie={params.functie}
          woonplaats={params.woonplaats}
          max_km={params.max_km}
          leeftijd_min={params.leeftijd_min}
          leeftijd_max={params.leeftijd_max}
          rijbewijs={params.rijbewijs}
          eigen_vervoer={params.eigen_vervoer}
          werkvergunning={params.werkvergunning}
          taal_ok={params.taal_ok}
          uren_min={params.uren_min}
          uren_max={params.uren_max}
          beschikbaarheid={params.beschikbaarheid}
          ai_oordeel={params.ai_oordeel}
          orderBy={params.orderBy}
        />

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {kandidaten.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Naam</th>
                  <th className="text-left px-4 py-3 font-semibold">Woonplaats</th>
                  <th className="text-left px-4 py-3 font-semibold">Open voor</th>
                  <th className="text-left px-4 py-3 font-semibold">Dienstverband</th>
                  <th className="text-left px-4 py-3 font-semibold">Uren</th>
                  <th className="text-left px-4 py-3 font-semibold">Salaris</th>
                  <th className="text-left px-4 py-3 font-semibold">Beschikbaar</th>
                  <th className="text-left px-4 py-3 font-semibold">AI-oordeel</th>
                  <th className="text-right px-4 py-3 font-semibold">Acties</th>
                </tr>
              </thead>
              <tbody>
                {kandidaten.map((k) => {
                  const oordeel = (k.website_intake_ai_oordeel ?? "").toString().toLowerCase();
                  const oordeelKleur =
                    oordeel === "goedgekeurd"
                      ? "bg-emerald-100 text-emerald-800"
                      : oordeel === "afgekeurd"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-600";
                  const oordeelLabel = oordeel || "onbekend";
                  const naam = `${k.voornaam ?? ""}${k.tussenvoegsel ? " " + k.tussenvoegsel : ""} ${k.achternaam ?? ""}`.trim();
                  return (
                    <tr key={k.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/kandidaten/${k.id}`}
                          className="font-semibold text-gray-800 hover:text-[#333399]"
                        >
                          {naam || "-"}
                        </Link>
                        {k.email && (
                          <div className="text-xs text-gray-500">{k.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {k.woonplaats ?? "-"}
                        {k.leeftijd && (
                          <div className="text-xs text-gray-400">{k.leeftijd} jaar</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {k.open_voor ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {k.soort_dienstverband ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {k.uren_per_week ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {k.salaris_indicatie ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {k.beschikbaarheid ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${oordeelKleur}`}
                        >
                          {oordeelLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <PoolKaartActies kandidaatId={k.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <h2 className="text-base font-semibold text-gray-700 mb-1">Pool is leeg</h2>
              <p className="text-sm">
                Nog geen kandidaten in de pool. Wouter kan vanuit website-intakes kandidaten in de pool plaatsen.
              </p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm">
            <div className="text-gray-500">
              Pagina {pageNum} van {totalPages} , {totaal} kandidaten totaal
            </div>
            <div className="inline-flex items-center gap-1">
              {pageNum > 1 && (
                <Link
                  href={`/kandidatenpool?${(() => {
                    const p = new URLSearchParams(huidigeParams);
                    p.set("page", String(pageNum - 1));
                    return p.toString();
                  })()}`}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  ← Vorige
                </Link>
              )}
              {pageNum < totalPages && (
                <Link
                  href={`/kandidatenpool?${(() => {
                    const p = new URLSearchParams(huidigeParams);
                    p.set("page", String(pageNum + 1));
                    return p.toString();
                  })()}`}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Volgende →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
