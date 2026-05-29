import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { isSuperAdminEmail } from "@/utils/auth";
import { SetterPerformance } from "./SetterPerformance";
import { OnboardingTour, TOUR_VERSIE } from "@/components/OnboardingTour";
import { PaginaTour } from "@/components/PaginaTour";
import { TOUR_DASHBOARD } from "@/utils/pagina-tours";
import { RondleidingStarter } from "@/components/RondleidingStarter";
import { BureauAdminDashboard } from "./BureauAdminDashboard";
import { BotsStatus } from "./BotsStatus";
import { DemoKnoppen } from "./DemoKnoppen";
import { RecruiterDashboard } from "./RecruiterDashboard";
import { SuperAdminMonitor } from "./SuperAdminMonitor";
import { leesViewAs, effectieveRol } from "@/utils/view-as";

type Periode = "vandaag" | "week" | "maand" | "jaar" | "alles";
function geldigePeriode(p: string | undefined): Periode {
  return (["vandaag", "week", "maand", "jaar", "alles"] as const).includes(p as Periode)
    ? (p as Periode)
    : "maand";
}

const STATUS_KLEUR: Record<string, string> = {
  nieuw: "bg-blue-500",
  talentpool: "bg-emerald-500",
  in_proces: "bg-green-500",
  bemiddelbaar: "bg-amber-500",
  geplaatst: "bg-sky-600",
  afgewezen: "bg-red-400",
};

const PIPELINE = [
  { key: "interne_intake",            label: "Interne intake",  kleur: "bg-blue-500"   },
  { key: "in_afwachting_cv",          label: "Wacht op CV",     kleur: "bg-cyan-500"   },
  { key: "in_wachtrij",               label: "Wachtrij",        kleur: "bg-indigo-500" },
  { key: "bij_setter",                label: "Bij setter",      kleur: "bg-purple-500" },
  { key: "in_proces",                 label: "In proces",       kleur: "bg-fuchsia-500"},
  { key: "voorgesteld_opdrachtgever", label: "Voorgesteld",     kleur: "bg-pink-500"   },
  { key: "1e_gesprek",                label: "1e gesprek",      kleur: "bg-amber-500"  },
  { key: "2e_gesprek",                label: "2e gesprek",      kleur: "bg-orange-500" },
  { key: "geplaatst",                 label: "Geplaatst",       kleur: "bg-green-500"  },
];

const VOORSTEL_STATUS_LABEL: Record<string, string> = {
  verzonden: "Wachten op reactie",
  uitnodigen: "Uitgenodigd",
  niet_uitnodigen: "Afgewezen",
  verlopen: "Verlopen",
};

const VOORSTEL_STATUS_KLEUR: Record<string, string> = {
  verzonden: "bg-amber-100 text-amber-800",
  uitnodigen: "bg-emerald-100 text-emerald-800",
  niet_uitnodigen: "bg-red-100 text-red-800",
  verlopen: "bg-gray-100 text-gray-600",
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: Promise<{ periode?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const periode = geldigePeriode(sp.periode);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("voornaam, rol, tenant_id, onboarding_voltooid, onboarding_versie, kan_abonnementen_beheren")
    .eq("id", user!.id)
    .single();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("naam")
    .eq("id", myProfile?.tenant_id ?? "")
    .single();

  const echteIsSuperAdmin = isSuperAdminEmail(user?.email);
  // Demo-modus override
  const viewAs = await leesViewAs();
  const { rol: actieveRol, demoActief } = effectieveRol(myProfile?.rol, echteIsSuperAdmin, viewAs);

  const isSetter = actieveRol === "setter";
  const isRecruiter = actieveRol === "recruiter";
  const isSuperAdmin = echteIsSuperAdmin && !demoActief;
  // Sales-admin (Pepijn) = intern personeel, krijgt volledige admin-view (geen bureau-view).
  const isSalesAdmin = !!myProfile?.kan_abonnementen_beheren;
  // Echte bureau-admin = admin rol zonder super-admin én geen sales-admin, of demo "bureau_admin" keuze.
  // (demo "admin" = volledige admin-view, demo "bureau_admin" = simpele bureau-view)
  const isBureauAdmin = viewAs === "bureau_admin" || (actieveRol === "admin" && !isSuperAdmin && !isSalesAdmin && !demoActief);

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="dashboard" />
      <PaginaTour pad="/dashboard" naam="Dashboard" stappen={TOUR_DASHBOARD} />

      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Welkom {myProfile?.voornaam ?? ""}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {isSetter ? "Jouw werkruimte" : `Live overzicht van `}
              {!isSetter && <b>{tenant?.naam ?? "?"}</b>}
            </p>
          </div>
          <div className="flex gap-2 text-xs text-gray-500">
            <span className="px-3 py-1.5 bg-white border rounded-md">{new Date().toLocaleDateString("nl-NL")}</span>
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md">Live</span>
          </div>
        </div>

        {/* Super-admin: Demo-modus knoppen + Bots/Crons + uitgebreide monitor */}
        {isSuperAdmin && (
          <>
            <DemoKnoppen />
            <BotsStatus />
            <SuperAdminMonitor />
          </>
        )}

        {isSetter
          ? <SetterDashboard userId={user!.id} />
          : isRecruiter
            ? <RecruiterDashboard />
            : isBureauAdmin
              ? <BureauAdminDashboard tenantId={myProfile!.tenant_id!} bureauNaam={tenant?.naam ?? "jouw bureau"} />
              : <AdminDashboard />
        }

        {/* Performance / leaderboard — niet voor bureau-admin of recruiter */}
        {!isBureauAdmin && !isRecruiter && (
          <SetterPerformance
            periode={periode}
            beperkTotUserId={isSetter ? user!.id : undefined}
          />
        )}

        {/* Globale rondleiding: opent automatisch elke pagina + uitleg bij eerste login */}
        <RondleidingStarter
          autoStart={(myProfile?.onboarding_versie ?? 0) < TOUR_VERSIE}
        />
        {/* Oude tour-component blijft beschikbaar voor backwards compat, niet meer auto-start */}
        <OnboardingTour
          rol={isSuperAdminEmail(user?.email) ? "super_admin" : (myProfile?.rol ?? "setter") as "admin" | "recruiter" | "setter"}
          autoStart={false}
        />
      </div>
    </main>
  );
}

// ============ ADMIN / RECRUITER DASHBOARD ============
async function AdminDashboard() {
  const supabase = await createClient();

  const { data: kandidaten } = await supabase
    .from("kandidaten")
    .select("id, voornaam, achternaam, status, kanban_stap, score, eigenaar_id, created_at");

  const { data: setters } = await supabase
    .from("profiles")
    .select("id, voornaam, achternaam, rol");

  const totaalKandidaten = kandidaten?.length ?? 0;
  const geplaatst = kandidaten?.filter(k => k.status === "geplaatst").length ?? 0;
  const inProces = kandidaten?.filter(k => k.status === "in_proces").length ?? 0;
  const totaalSetters = setters?.filter(s => s.rol === "setter").length ?? 0;

  const pipelineCounts = PIPELINE.map(p => ({
    ...p,
    aantal: kandidaten?.filter(k => k.kanban_stap === p.key).length ?? 0,
  }));
  const maxPipeline = Math.max(1, ...pipelineCounts.map(p => p.aantal));

  const setterMap = new Map(setters?.map(s => [s.id, s]) ?? []);
  const setterCounts = new Map<string, number>();
  kandidaten?.forEach(k => {
    if (k.eigenaar_id) setterCounts.set(k.eigenaar_id, (setterCounts.get(k.eigenaar_id) ?? 0) + 1);
  });
  const topSetters = Array.from(setterCounts.entries())
    .map(([id, aantal]) => ({ ...setterMap.get(id)!, aantal }))
    .filter(s => s.voornaam)
    .sort((a, b) => b.aantal - a.aantal)
    .slice(0, 5);

  const recent = (kandidaten ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const statusCounts: Record<string, number> = {};
  kandidaten?.forEach(k => { statusCounts[k.status] = (statusCounts[k.status] ?? 0) + 1; });

  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Link href="/kandidaten" className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition group">
          <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Kandidaten</div>
          <div className="text-3xl font-bold text-[#333399]">{totaalKandidaten}</div>
          <div className="text-xs text-gray-400 mt-1 group-hover:text-[#333399]">Bekijk lijst</div>
        </Link>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 font-semibold mb-2">In proces</div>
          <div className="text-3xl font-bold text-amber-600">{inProces}</div>
          <div className="text-xs text-gray-400 mt-1">Actieve trajecten</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Geplaatst</div>
          <div className="text-3xl font-bold text-emerald-600">{geplaatst}</div>
          <div className="text-xs text-gray-400 mt-1">Succesvolle plaatsingen</div>
        </div>
        <Link href="/users" className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition group">
          <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Setters</div>
          <div className="text-3xl font-bold text-purple-600">{totaalSetters}</div>
          <div className="text-xs text-gray-400 mt-1 group-hover:text-purple-600">Beheer team</div>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800">Kandidaat pipeline</h2>
          <Link href="/kanban" className="text-sm text-[#333399] hover:underline">Naar kanban</Link>
        </div>
        <div className="flex items-end gap-3 h-48 border-b border-gray-200 pb-1">
          {pipelineCounts.map((p) => (
            <div key={p.key} className="flex-1 flex flex-col items-center justify-end h-full">
              <div
                className={`w-full ${p.kleur} text-white flex items-center justify-center font-bold rounded-t-md transition-all`}
                style={{ height: `${(p.aantal / maxPipeline) * 100}%`, minHeight: p.aantal > 0 ? "32px" : "4px" }}
              >
                {p.aantal > 0 ? p.aantal : ""}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-2">
          {pipelineCounts.map((p) => (
            <div key={p.key} className="flex-1 text-center text-xs text-gray-600">{p.label}</div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-4">Top setters</h2>
          {topSetters.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {topSetters.map((s, i) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 w-8 text-gray-500">{i + 1}.</td>
                    <td className="py-2 font-semibold text-gray-800">{s.voornaam} {s.achternaam}</td>
                    <td className="py-2 text-right text-gray-600">{s.aantal} kand.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-gray-500">Nog geen toegewezen kandidaten.</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-4">Status verdeling</h2>
          {Object.keys(statusCounts).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, aantal]) => {
                const pct = totaalKandidaten > 0 ? (aantal / totaalKandidaten) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 capitalize">{status.replace(/_/g, " ")}</span>
                      <span className="font-semibold">{aantal}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${STATUS_KLEUR[status] ?? "bg-gray-400"}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-500">Nog geen kandidaten.</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-4">Laatste activiteit</h2>
          {recent.length > 0 ? (
            <div className="space-y-3 text-sm">
              {recent.map(k => (
                <Link key={k.id} href={`/kandidaten/${k.id}`} className="flex justify-between items-start border-b pb-2 last:border-0 hover:bg-gray-50 -mx-2 px-2 py-1 rounded">
                  <div>
                    <div className="font-semibold text-gray-800">{k.voornaam} {k.achternaam}</div>
                    <div className="text-xs text-gray-500 capitalize">{k.status.replace(/_/g, " ")}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(k.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">Nog geen kandidaten.</p>}
        </div>
      </div>
    </>
  );
}

// ============ SETTER DASHBOARD ============
async function SetterDashboard({ userId }: { userId: string }) {
  const supabase = await createClient();

  // Mijn kandidaten
  const { data: mijnKandidaten } = await supabase
    .from("kandidaten")
    .select("*")
    .eq("eigenaar_id", userId)
    .order("created_at", { ascending: false });

  // Huidige kandidaat = meest recente die nog niet geplaatst is
  const huidigeKandidaat = mijnKandidaten?.find(k => k.status !== "geplaatst" && k.status !== "afgewezen");

  // Mijn voorstellen
  const { data: mijnVoorstellen } = await supabase
    .from("voorstellen")
    .select("*, kandidaat:kandidaten(voornaam, achternaam)")
    .eq("setter_id", userId)
    .order("verzonden_op", { ascending: false })
    .limit(10);

  const totaalMijn = mijnKandidaten?.length ?? 0;
  const mijnGeplaatst = mijnKandidaten?.filter(k => k.status === "geplaatst").length ?? 0;
  const mijnInProces = mijnKandidaten?.filter(k => k.status === "in_proces").length ?? 0;
  const wachtenOpReactie = mijnVoorstellen?.filter(v => v.status === "verzonden").length ?? 0;

  return (
    <>
      {/* Huidige kandidaat */}
      {huidigeKandidaat ? (
        <Link
          href={`/kandidaten/${huidigeKandidaat.id}`}
          className="block bg-gradient-to-r from-[#333399] to-[#5454c4] rounded-xl shadow-sm p-6 mb-6 text-white hover:shadow-md transition"
        >
          <div className="text-xs uppercase font-semibold opacity-80 mb-2">Jouw huidige kandidaat</div>
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold">
                {huidigeKandidaat.voornaam} {huidigeKandidaat.tussenvoegsel ? `${huidigeKandidaat.tussenvoegsel} ` : ""}{huidigeKandidaat.achternaam}
              </h2>
              <div className="text-sm opacity-90 mt-1 flex flex-wrap gap-4">
                {huidigeKandidaat.open_voor && <span>Open voor: {huidigeKandidaat.open_voor}</span>}
                {huidigeKandidaat.woonplaats && <span>{huidigeKandidaat.woonplaats}</span>}
                {huidigeKandidaat.telefoon && <span>{huidigeKandidaat.telefoon}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-70 uppercase">Score</div>
              <div className="text-3xl font-bold">{huidigeKandidaat.score ?? "—"}</div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <div className="font-bold text-amber-800 mb-1">Geen actieve kandidaat</div>
          <p className="text-sm text-amber-700">Vraag de admin om een kandidaat aan je toe te wijzen.</p>
        </div>
      )}

      {/* KPI's */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Mijn kandidaten</div>
          <div className="text-3xl font-bold text-[#333399]">{totaalMijn}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 font-semibold mb-2">In proces</div>
          <div className="text-3xl font-bold text-amber-600">{mijnInProces}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Wachten op reactie</div>
          <div className="text-3xl font-bold text-orange-600">{wachtenOpReactie}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Geplaatst</div>
          <div className="text-3xl font-bold text-emerald-600">{mijnGeplaatst}</div>
        </div>
      </div>

      {/* Mijn voorstellen */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800">Mijn voorstellen</h2>
          <Link href="/kandidaten" className="text-sm text-[#333399] hover:underline">Alle kandidaten</Link>
        </div>
        {mijnVoorstellen && mijnVoorstellen.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left py-2">Kandidaat</th>
                <th className="text-left py-2">Opdrachtgever</th>
                <th className="text-left py-2">Status</th>
                <th className="text-right py-2">Verzonden</th>
              </tr>
            </thead>
            <tbody>
              {mijnVoorstellen.map(v => (
                <tr key={v.id} className="border-t">
                  <td className="py-2 font-semibold text-gray-800">
                    {v.kandidaat.voornaam} {v.kandidaat.achternaam}
                  </td>
                  <td className="py-2 text-gray-600">
                    {v.opdrachtgever_naam ?? v.opdrachtgever_email}
                  </td>
                  <td className="py-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${VOORSTEL_STATUS_KLEUR[v.status]}`}>
                      {VOORSTEL_STATUS_LABEL[v.status]}
                    </span>
                  </td>
                  <td className="py-2 text-right text-xs text-gray-500">
                    {new Date(v.verzonden_op).toLocaleDateString("nl-NL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">Nog geen voorstellen verstuurd.</p>
        )}
      </div>

      {/* Mijn pipeline */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800">Mijn pipeline</h2>
          <Link href="/kanban" className="text-sm text-[#333399] hover:underline">Naar kanban</Link>
        </div>
        <SetterPipeline kandidaten={mijnKandidaten ?? []} />
      </div>

      {/* Quick actions */}
      <div className="bg-gradient-to-r from-[#333399] to-[#5454c4] rounded-xl shadow-sm p-6 text-white">
        <h2 className="font-bold mb-4">Snel naar</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/kandidaten" className="bg-white/10 hover:bg-white/20 transition rounded-md p-3 text-center text-sm">Alle kandidaten</Link>
          <Link href="/kanban" className="bg-white/10 hover:bg-white/20 transition rounded-md p-3 text-center text-sm">Kanban</Link>
          {huidigeKandidaat && (
            <Link href={`/kandidaten/${huidigeKandidaat.id}`} className="bg-white/10 hover:bg-white/20 transition rounded-md p-3 text-center text-sm">Huidige kandidaat</Link>
          )}
        </div>
      </div>
    </>
  );
}

function SetterPipeline({ kandidaten }: { kandidaten: Array<{ kanban_stap: string }> }) {
  const counts = PIPELINE.map(p => ({
    ...p,
    aantal: kandidaten.filter(k => k.kanban_stap === p.key).length,
  }));
  const max = Math.max(1, ...counts.map(p => p.aantal));

  return (
    <>
      <div className="flex items-end gap-3 h-32 border-b border-gray-200 pb-1">
        {counts.map(p => (
          <div key={p.key} className="flex-1 flex flex-col items-center justify-end h-full">
            <div
              className={`w-full ${p.kleur} text-white flex items-center justify-center font-bold rounded-t-md transition-all text-sm`}
              style={{ height: `${(p.aantal / max) * 100}%`, minHeight: p.aantal > 0 ? "28px" : "4px" }}
            >
              {p.aantal > 0 ? p.aantal : ""}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        {counts.map(p => (
          <div key={p.key} className="flex-1 text-center text-xs text-gray-600">{p.label}</div>
        ))}
      </div>
    </>
  );
}
