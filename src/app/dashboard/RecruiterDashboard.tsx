import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { PieChart, Activity, Users, TrendingUp } from "lucide-react";

const STATUS_KLEUR: Record<string, string> = {
  nieuw: "bg-blue-500",
  in_proces: "bg-amber-500",
  voorgesteld: "bg-purple-500",
  geplaatst: "bg-emerald-500",
  afgewezen: "bg-red-500",
  talentpool: "bg-cyan-500",
  bemiddelbaar: "bg-indigo-500",
};

const STATUS_LABEL: Record<string, string> = {
  nieuw: "Nieuw",
  in_proces: "In proces",
  voorgesteld: "Voorgesteld",
  geplaatst: "Geplaatst",
  afgewezen: "Afgewezen",
  talentpool: "Talentpool",
  bemiddelbaar: "Bemiddelbaar",
};

/**
 * Compact dashboard voor recruiters — alleen status verdeling +
 * laatste activiteit. Geen team-overzicht of leaderboard.
 */
export async function RecruiterDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: kandidaten } = await supabase
    .from("kandidaten")
    .select("id, voornaam, achternaam, status, created_at, updated_at")
    .eq("eigenaar_id", user?.id ?? "")
    .order("updated_at", { ascending: false });

  const lijst = kandidaten ?? [];
  const totaal = lijst.length;
  const geplaatst = lijst.filter((k) => k.status === "geplaatst").length;
  const inProces = lijst.filter((k) => k.status === "in_proces").length;

  const statusCounts: Record<string, number> = {};
  for (const k of lijst) {
    statusCounts[k.status] = (statusCounts[k.status] ?? 0) + 1;
  }
  const statusEntries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

  const recent = lijst.slice(0, 8);

  const fmtRelatief = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const dag = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (dag === 0) return "vandaag";
    if (dag === 1) return "gisteren";
    if (dag < 7) return `${dag} dgn`;
    return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  };

  return (
    <>
      {/* KPI cards — 3 items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link href="/kandidaten" className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase text-gray-500 font-semibold">Totaal kandidaten</div>
            <Users size={16} className="text-[#333399]" />
          </div>
          <div className="text-3xl font-bold text-[#333399]">{totaal}</div>
          <div className="text-xs text-gray-400 mt-1 group-hover:text-[#333399]">Bekijk lijst →</div>
        </Link>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase text-gray-500 font-semibold">In proces</div>
            <Activity size={16} className="text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-amber-600">{inProces}</div>
          <div className="text-xs text-gray-400 mt-1">Actieve trajecten</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase text-gray-500 font-semibold">Geplaatst</div>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">{geplaatst}</div>
          <div className="text-xs text-gray-400 mt-1">Succesvol</div>
        </div>
      </div>

      {/* Status verdeling + Laatste activiteit — naast elkaar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status verdeling */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-lg bg-[#333399]/10 text-[#333399] flex items-center justify-center">
              <PieChart size={18} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Status verdeling</h2>
              <p className="text-xs text-gray-500">Alle kandidaten naar status</p>
            </div>
          </div>

          {statusEntries.length > 0 ? (
            <div className="space-y-4">
              {statusEntries.map(([status, aantal]) => {
                const pct = totaal > 0 ? (aantal / totaal) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-700 font-medium">
                        {STATUS_LABEL[status] ?? status.replace(/_/g, " ")}
                      </span>
                      <span className="text-gray-500">
                        <b className="text-gray-800">{aantal}</b>
                        <span className="text-xs ml-1">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full ${STATUS_KLEUR[status] ?? "bg-gray-400"} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Nog geen kandidaten in deze tenant.</p>
          )}
        </section>

        {/* Laatste activiteit */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-lg bg-[#333399]/10 text-[#333399] flex items-center justify-center">
              <Activity size={18} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Laatste activiteit</h2>
              <p className="text-xs text-gray-500">Meest recent bijgewerkt</p>
            </div>
          </div>

          {recent.length > 0 ? (
            <div className="space-y-2">
              {recent.map((k) => {
                const kleur = STATUS_KLEUR[k.status] ?? "bg-gray-400";
                return (
                  <Link
                    key={k.id}
                    href={`/kandidaten/${k.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className={`w-2 h-2 rounded-full ${kleur} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800 group-hover:text-[#333399] truncate">
                        {k.voornaam} {k.achternaam}
                      </div>
                      <div className="text-xs text-gray-500">
                        {STATUS_LABEL[k.status] ?? k.status.replace(/_/g, " ")}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {fmtRelatief(k.updated_at ?? k.created_at)}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Nog geen activiteit.</p>
          )}
        </section>
      </div>
    </>
  );
}
