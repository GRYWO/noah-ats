import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TopBar } from "@/components/TopBar";
import { matchTalentpool, type TalentKandidaatIn } from "@/utils/talentpool-match";
import { claimKandidaat } from "./actions";

type SearchParams = { vacature?: string; ok?: string; error?: string };

type PoolKandidaat = {
  id: string;
  voornaam: string | null;
  tussenvoegsel: string | null;
  achternaam: string | null;
  email: string | null;
  telefoon: string | null;
  woonplaats: string | null;
  leeftijd: number | null;
  open_voor: string | null;
  salaris_indicatie: string | null;
  beschikbaarheid: string | null;
  profielschets: string | null;
  cv_geparseerd: Record<string, unknown> | null;
  website_intake_ai_oordeel: string | null;
};

function naamVan(k: PoolKandidaat): string {
  return `${k.voornaam ?? ""}${k.tussenvoegsel ? " " + k.tussenvoegsel : ""} ${k.achternaam ?? ""}`.trim() || "-";
}

export default async function KandidatenpoolPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) redirect("/dashboard");

  const rol = (profile.rol ?? "").toString().toLowerCase();
  const isAdmin = rol === "admin" || rol === "super-admin" || rol === "super_admin";

  const admin = createAdminClient();

  // Je eigen openstaande vacatures (om matches op te tonen en te claimen).
  let vacQuery = admin
    .from("rec_vacatures")
    .select("id, titel, taken, eisen, locatie")
    .eq("status", "open")
    .order("titel", { ascending: true });
  if (!isAdmin) vacQuery = vacQuery.eq("eigenaar", user.id);
  const { data: vacatures } = await vacQuery;
  const eigenVacatures = vacatures ?? [];

  const gekozenVacatureId =
    params.vacature && eigenVacatures.some((v) => v.id === params.vacature) ? params.vacature : null;
  const gekozenVacature = gekozenVacatureId ? eigenVacatures.find((v) => v.id === gekozenVacatureId)! : null;

  // Talentenpool: open sollicitanten die nog niet geclaimd zijn.
  const { data: poolData } = await admin
    .from("kandidaten")
    .select(
      "id, voornaam, tussenvoegsel, achternaam, email, telefoon, woonplaats, leeftijd, open_voor, salaris_indicatie, beschikbaarheid, profielschets, cv_geparseerd, website_intake_ai_oordeel",
    )
    .eq("tenant_id", profile.tenant_id)
    .eq("kanban_stap", "talentpool")
    .order("created_at", { ascending: false })
    .limit(100);
  let kandidaten = (poolData ?? []) as PoolKandidaat[];

  // AI-matching zodra een vacature gekozen is: score + reden per kandidaat.
  const scores = new Map<string, { score: number; reden: string }>();
  if (gekozenVacature && kandidaten.length > 0) {
    const invoer: TalentKandidaatIn[] = kandidaten.map((k) => {
      const cvg = (k.cv_geparseerd ?? {}) as Record<string, unknown>;
      const profiel = [
        k.profielschets ?? "",
        k.open_voor ? `Zoekt: ${k.open_voor}` : "",
        cvg.werkervaring ? `Werkervaring: ${String(cvg.werkervaring)}` : "",
        cvg.vaardigheden ? `Vaardigheden: ${String(cvg.vaardigheden)}` : "",
        k.woonplaats ? `Woonplaats: ${k.woonplaats}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return { id: k.id, naam: naamVan(k), plaats: k.woonplaats ?? "", profiel };
    });
    const m = await matchTalentpool(
      { titel: gekozenVacature.titel, taken: gekozenVacature.taken, eisen: gekozenVacature.eisen, plaats: gekozenVacature.locatie },
      invoer,
    );
    for (const [id, v] of m) scores.set(id, v);
    // Sorteer op matchscore (beste boven); kandidaten zonder score onderaan.
    kandidaten = [...kandidaten].sort((a, b) => (scores.get(b.id)?.score ?? -1) - (scores.get(a.id)?.score ?? -1));
  }

  const okBericht = params.ok === "geclaimd" ? "Kandidaat geclaimd. Staat nu in de intake van je vacature." : null;

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="kandidatenpool" />
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Talentenpool</h1>
          <p className="text-gray-500 text-sm mt-1">
            Open sollicitaties via de website. Kies een eigen vacature: Noah toont de beste matches met AI. Claim een
            kandidaat om 'm in de intake van die vacature te zetten (bellen en controleren), daarna naar de pool.
          </p>
        </div>

        {okBericht && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">{okBericht}</div>
        )}
        {params.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{params.error}</div>
        )}

        {/* Vacature kiezen -> AI-matches */}
        <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <label className="flex-1 min-w-[240px]">
            <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Jouw vacature</span>
            <select
              name="vacature"
              defaultValue={gekozenVacatureId ?? ""}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
            >
              <option value="">Kies een openstaande vacature…</option>
              {eigenVacatures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.titel}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-[#333399] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#27277a]">
            Toon AI-matches
          </button>
          {eigenVacatures.length === 0 && (
            <span className="text-xs text-amber-700">Je hebt nog geen openstaande vacatures. Maak er eerst één aan.</span>
          )}
        </form>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {kandidaten.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  {gekozenVacature && <th className="text-left px-4 py-3 font-semibold">Match</th>}
                  <th className="text-left px-4 py-3 font-semibold">Naam</th>
                  <th className="text-left px-4 py-3 font-semibold">Woonplaats</th>
                  <th className="text-left px-4 py-3 font-semibold">Open voor</th>
                  <th className="text-left px-4 py-3 font-semibold">Telefoon</th>
                  {gekozenVacature && <th className="text-left px-4 py-3 font-semibold">Waarom</th>}
                  <th className="text-right px-4 py-3 font-semibold">Actie</th>
                </tr>
              </thead>
              <tbody>
                {kandidaten.map((k) => {
                  const sc = scores.get(k.id);
                  return (
                    <tr key={k.id} className="border-t hover:bg-gray-50 align-top">
                      {gekozenVacature && (
                        <td className="px-4 py-3">
                          {sc ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{sc.score}%</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Link href={`/kandidaten/${k.id}`} className="font-semibold text-gray-800 hover:text-[#333399]">
                          {naamVan(k)}
                        </Link>
                        {k.email && <div className="text-xs text-gray-500">{k.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {k.woonplaats ?? "-"}
                        {k.leeftijd ? <div className="text-xs text-gray-400">{k.leeftijd} jaar</div> : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{k.open_voor ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {k.telefoon ? (
                          <a href={`tel:${k.telefoon}`} className="text-[#333399] hover:underline">
                            {k.telefoon}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      {gekozenVacature && (
                        <td className="px-4 py-3 text-sm text-gray-600">{sc?.reden ?? "—"}</td>
                      )}
                      <td className="px-4 py-3 text-right">
                        {gekozenVacatureId ? (
                          <form action={claimKandidaat}>
                            <input type="hidden" name="kandidaatId" value={k.id} />
                            <input type="hidden" name="vacatureId" value={gekozenVacatureId} />
                            <button
                              type="submit"
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Kandidaat claimen
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-gray-400">Kies eerst een vacature</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <h2 className="text-base font-semibold text-gray-700">Geen open sollicitaties</h2>
              <p className="mt-1 text-sm">Zodra iemand een open sollicitatie doet op de website, verschijnt die hier.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
