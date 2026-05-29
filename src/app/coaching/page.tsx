import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { getViewerRol } from "@/utils/view-as";
import { TopBar } from "@/components/TopBar";
import { CheckCircle2, XCircle, Trophy, AlertTriangle, Phone, CalendarCheck, Briefcase, Coins, Sparkles, Battery, ListTodo } from "lucide-react";
import { EodForm } from "./EodForm";
import { CoachingKnop } from "./CoachingKnop";
import { CoachingAanvraagItem } from "./CoachingAanvraagItem";
import { DoelenSectie, type Doelen, type Voortgang } from "./DoelenSectie";
import { RecordsSectie, type Records } from "./RecordsSectie";
import { AdminFilterBar } from "./AdminFilterBar";
import { SetterReactieKnop } from "./SetterReactieKnop";
import { CoachToevoegenKnop } from "./CoachToevoegenKnop";
import { PaginaTour } from "@/components/PaginaTour";
import { TOUR_COACHING } from "@/utils/pagina-tours";

function vandaagAmsterdam(): string {
  const nu = new Date();
  const tz = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = tz.formatToParts(nu).reduce<Record<string, string>>((acc, p) => { if (p.type !== "literal") acc[p.type] = p.value; return acc; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function startVanWeekISO(): string {
  const nu = new Date();
  const dag = nu.getDay() === 0 ? 6 : nu.getDay() - 1; // ma = 0
  const ma = new Date(nu);
  ma.setDate(nu.getDate() - dag);
  ma.setHours(0, 0, 0, 0);
  return ma.toISOString().slice(0, 10);
}

function startVanMaandISO(): string {
  const nu = new Date();
  return `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, "0")}-01`;
}

function startVanJaarISO(): string {
  return `${new Date().getFullYear()}-01-01`;
}

type SetterStats = {
  id: string;
  naam: string;
  calls: number;
  voicemails: number;
  voorgesteld: number;
  afspraken: number;
  plaatsingen: number;
  bedrag: number;
};

type EodLight = {
  rapport_datum: string;
  doel_vandaag: string | null;
  doel_morgen: string | null;
  doel_behaald: boolean | null;
  aantal_calls: number | null;
  aantal_voicemails: number | null;
  aantal_voorgesteld: number | null;
  aantal_afspraken: number | null;
  aantal_plaatsingen: number | null;
  obstakel: string | null;
  afwijzings_reden: string | null;
  energie_focus: number | null;
  morgen_anders: string | null;
  setter?: { voornaam: string | null; achternaam: string | null } | null;
};

export default async function CoachingPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; ok?: string; error?: string; setter?: string; filter?: string }>;
}) {
  const { periode = "week", ok, error, setter: setterFilter, filter } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol, is_coach, voornaam, achternaam, doel_calls_dag, doel_voorgesteld_week, doel_afspraken_week, doel_plaatsingen_maand, doel_omzet_maand")
    .eq("id", user.id)
    .single();

  const superAdmin = isSuperAdminEmail(user.email);

  // Super-admin zonder profile/tenant: toon nette herstel-melding i.p.v. witte pagina
  if (!profile?.tenant_id) {
    return (
      <main className="min-h-screen bg-[#f4f4f7] pl-16">
        <TopBar active="coaching" />
        <div className="p-8 max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Coaching</h1>
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-5 text-sm space-y-3">
            <p><b>Geen tenant gekoppeld aan je account.</b> Daardoor is er geen coaching-data om te tonen.</p>
            {superAdmin ? (
              <p>
                Herstel je super-admin profiel via{" "}
                <a href="/api/debug/herstel-superadmin" className="text-[#333399] font-semibold underline">
                  /api/debug/herstel-superadmin
                </a>{" "}
                en laad de pagina opnieuw.
              </p>
            ) : (
              <p>Vraag je beheerder om je profiel aan een bureau te koppelen.</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Demo-modus respecteren voor UI
  const viewerRol = await getViewerRol();
  const isAdmin = viewerRol.isAdmin || viewerRol.isSuperAdmin;
  const isCoach = profile.is_coach && !viewerRol.demoActief;
  const isSetter = viewerRol.isSetter;
  const tenantId = profile.tenant_id;

  const admin = createAdminClient();
  const vandaag = vandaagAmsterdam();
  const startWeek = startVanWeekISO();
  const startMaand = startVanMaandISO();
  const startJaar = startVanJaarISO();
  const periodeStart = periode === "maand" ? startMaand : periode === "jaar" ? startJaar : startWeek;

  // Setter: eigen EOD vandaag + laatste 14 dagen
  let eigenEodVandaag: EodLight | null = null;
  let eigenEodGeschiedenis: EodLight[] = [];
  if (isSetter) {
    const { data: vd } = await admin
      .from("eod_rapporten")
      .select("*")
      .eq("setter_id", user.id)
      .eq("rapport_datum", vandaag)
      .maybeSingle();
    eigenEodVandaag = vd as EodLight | null;

    const grens = new Date(); grens.setDate(grens.getDate() - 14);
    const { data: gesch } = await admin
      .from("eod_rapporten")
      .select("*")
      .eq("setter_id", user.id)
      .gte("rapport_datum", grens.toISOString().slice(0, 10))
      .order("rapport_datum", { ascending: false });
    eigenEodGeschiedenis = (gesch ?? []) as EodLight[];
  }

  // Persoonlijke records + voortgang (alleen voor setter)
  let eigenRecords: Records | null = null;
  let eigenDoelen: Doelen | null = null;
  let eigenVoortgang: Voortgang | null = null;
  if (isSetter) {
    eigenDoelen = {
      doel_calls_dag:         profile.doel_calls_dag         ?? 50,
      doel_voorgesteld_week:  profile.doel_voorgesteld_week  ?? 5,
      doel_afspraken_week:    profile.doel_afspraken_week    ?? 3,
      doel_plaatsingen_maand: profile.doel_plaatsingen_maand ?? 2,
      doel_omzet_maand:       Number(profile.doel_omzet_maand ?? 0),
    };

    // Alle EOD-rapporten van deze setter (voor records + streak)
    const { data: alleEod } = await admin
      .from("eod_rapporten")
      .select("rapport_datum, doel_behaald, aantal_calls, aantal_voicemails, aantal_voorgesteld, aantal_afspraken, aantal_plaatsingen")
      .eq("setter_id", user.id)
      .order("rapport_datum", { ascending: false });

    // Records uit eod
    let besteCalls = { aantal: 0, datum: null as string | null };
    let besteAfspraken = { aantal: 0, datum: null as string | null };
    for (const r of alleEod ?? []) {
      const c = r.aantal_calls ?? 0;
      if (c > besteCalls.aantal) besteCalls = { aantal: c, datum: r.rapport_datum };
      const a = r.aantal_afspraken ?? 0;
      if (a > besteAfspraken.aantal) besteAfspraken = { aantal: a, datum: r.rapport_datum };
    }

    // Streak vanaf vandaag (werkdagen ma-vr, alleen tellen als doel_behaald=true)
    const eodMap = new Map<string, boolean>(
      (alleEod ?? []).map(r => [r.rapport_datum, r.doel_behaald === true])
    );
    let streak = 0;
    const cur = new Date();
    for (let i = 0; i < 365; i++) {
      const dag = cur.getDay();
      if (dag === 0 || dag === 6) { cur.setDate(cur.getDate() - 1); continue; }
      const iso = cur.toISOString().slice(0, 10);
      // Vandaag mag nog leeg zijn — sla over
      if (i === 0 && !eodMap.has(iso)) { cur.setDate(cur.getDate() - 1); continue; }
      if (eodMap.get(iso) === true) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else break;
    }

    // Plaatsingen — per maand groeperen voor records
    const { data: allePlaatsingen } = await admin
      .from("plaatsingen")
      .select("created_at, tarief_bedrag")
      .eq("aangemeld_door", user.id)
      .is("afgekeurd_op", null);

    const perMaand = new Map<string, { aantal: number; bedrag: number }>();
    for (const p of allePlaatsingen ?? []) {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const x = perMaand.get(key) ?? { aantal: 0, bedrag: 0 };
      x.aantal += 1;
      x.bedrag += Number(p.tarief_bedrag ?? 0);
      perMaand.set(key, x);
    }
    let bestePlaatsingen = { aantal: 0, maand: null as string | null };
    let besteOmzet = { bedrag: 0, maand: null as string | null };
    for (const [maand, x] of perMaand) {
      if (x.aantal > bestePlaatsingen.aantal) bestePlaatsingen = { aantal: x.aantal, maand };
      if (x.bedrag > besteOmzet.bedrag) besteOmzet = { bedrag: x.bedrag, maand };
    }

    eigenRecords = {
      beste_calls_dag: besteCalls,
      beste_afspraken_dag: besteAfspraken,
      beste_plaatsingen_maand: bestePlaatsingen,
      beste_omzet_maand: besteOmzet,
      langste_streak: streak,
    };

    // Voortgang in de huidige periodes
    const callsVandaag = eigenEodVandaag?.aantal_calls ?? 0;
    const eodWeek = (alleEod ?? []).filter(r => r.rapport_datum >= startWeek);
    const voorgesteldWeek = eodWeek.reduce((s, r) => s + (r.aantal_voorgesteld ?? 0), 0);
    const afsprakenWeek   = eodWeek.reduce((s, r) => s + (r.aantal_afspraken   ?? 0), 0);
    const plaatsingenMaand = (allePlaatsingen ?? []).filter(p => p.created_at >= new Date(startMaand).toISOString());
    const omzetMaand = plaatsingenMaand.reduce((s, p) => s + Number(p.tarief_bedrag ?? 0), 0);

    eigenVoortgang = {
      calls_vandaag: callsVandaag,
      voorgesteld_week: voorgesteldWeek,
      afspraken_week: afsprakenWeek,
      plaatsingen_maand: plaatsingenMaand.length,
      omzet_maand: omzetMaand,
    };
  }

  // Setters in tenant
  const { data: setters } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, rol, is_active")
    .eq("tenant_id", tenantId)
    .eq("rol", "setter");

  // Alle actieve users (voor admin coach-toggle modal)
  const { data: alleActieveUsers } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, rol, is_coach")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  const alleUsers = (alleActieveUsers ?? []).map(u => ({
    id: u.id,
    voornaam: u.voornaam,
    achternaam: u.achternaam,
    rol: u.rol,
    is_coach: !!u.is_coach,
  }));

  // Aggregeer eod-stats over periode
  const { data: eodRows } = await admin
    .from("eod_rapporten")
    .select("setter_id, aantal_calls, aantal_voicemails, aantal_voorgesteld, aantal_afspraken, aantal_plaatsingen")
    .eq("tenant_id", tenantId)
    .gte("rapport_datum", periodeStart);

  // Aggregeer plaatsingen over periode (telt voor leaderboard-bedragen)
  const { data: plaatsingsRows } = await admin
    .from("plaatsingen")
    .select("aangemeld_door, tarief_bedrag")
    .eq("tenant_id", tenantId)
    .is("afgekeurd_op", null)
    .gte("created_at", new Date(periodeStart).toISOString());

  const stats: Record<string, SetterStats> = {};
  for (const s of setters ?? []) {
    stats[s.id] = {
      id: s.id,
      naam: `${s.voornaam ?? ""} ${s.achternaam ?? ""}`.trim() || "Onbekend",
      calls: 0, voicemails: 0, voorgesteld: 0, afspraken: 0, plaatsingen: 0, bedrag: 0,
    };
  }
  for (const r of eodRows ?? []) {
    const s = stats[r.setter_id];
    if (!s) continue;
    s.calls       += r.aantal_calls       ?? 0;
    s.voicemails  += r.aantal_voicemails  ?? 0;
    s.voorgesteld += r.aantal_voorgesteld ?? 0;
    s.afspraken   += r.aantal_afspraken   ?? 0;
  }
  for (const p of plaatsingsRows ?? []) {
    const s = stats[p.aangemeld_door ?? ""];
    if (!s) continue;
    s.plaatsingen += 1;
    s.bedrag += Number(p.tarief_bedrag ?? 0);
  }
  const leaderboard = Object.values(stats)
    .sort((a, b) => b.plaatsingen - a.plaatsingen || b.bedrag - a.bedrag)
    .slice(0, 10);

  // Filter-data voor admin/coach
  const gefilterdeSetterId = (isAdmin || isCoach) ? (setterFilter || null) : null;
  const gefilterdeStatus = (isAdmin || isCoach) ? (filter || null) : null;
  let gefilterdEod: EodLight[] = [];
  let gefilterdeSetterStats: SetterStats | null = null;
  let gefilterdeSetterDoelen: Doelen | null = null;
  let gefilterdeSetterRecords: Records | null = null;
  if (gefilterdeSetterId) {
    // Volledig overzicht van 1 setter
    let q = admin
      .from("eod_rapporten")
      .select("rapport_datum, doel_vandaag, doel_morgen, doel_behaald, aantal_calls, aantal_voicemails, aantal_voorgesteld, aantal_afspraken, aantal_plaatsingen, obstakel, afwijzings_reden, energie_focus, morgen_anders")
      .eq("tenant_id", tenantId)
      .eq("setter_id", gefilterdeSetterId)
      .order("rapport_datum", { ascending: false })
      .limit(60);
    if (gefilterdeStatus === "behaald") q = q.eq("doel_behaald", true);
    else if (gefilterdeStatus === "niet_behaald") q = q.eq("doel_behaald", false);
    const { data: ed } = await q;
    gefilterdEod = (ed ?? []) as EodLight[];

    // Doelen van die setter
    const { data: sp } = await admin
      .from("profiles")
      .select("voornaam, achternaam, doel_calls_dag, doel_voorgesteld_week, doel_afspraken_week, doel_plaatsingen_maand, doel_omzet_maand")
      .eq("id", gefilterdeSetterId)
      .single();
    if (sp) {
      gefilterdeSetterDoelen = {
        doel_calls_dag:         sp.doel_calls_dag         ?? 50,
        doel_voorgesteld_week:  sp.doel_voorgesteld_week  ?? 5,
        doel_afspraken_week:    sp.doel_afspraken_week    ?? 3,
        doel_plaatsingen_maand: sp.doel_plaatsingen_maand ?? 2,
        doel_omzet_maand:       Number(sp.doel_omzet_maand ?? 0),
      };
    }

    // Stats van die setter over geselecteerde periode (uit reeds geladen stats)
    gefilterdeSetterStats = stats[gefilterdeSetterId] ?? null;

    // Records voor die setter (lifetime)
    const { data: alleEodSetter } = await admin
      .from("eod_rapporten")
      .select("rapport_datum, doel_behaald, aantal_calls, aantal_afspraken")
      .eq("setter_id", gefilterdeSetterId);
    let bC = { aantal: 0, datum: null as string | null };
    let bA = { aantal: 0, datum: null as string | null };
    const eodMap = new Map<string, boolean>();
    for (const r of alleEodSetter ?? []) {
      const c = r.aantal_calls ?? 0;
      if (c > bC.aantal) bC = { aantal: c, datum: r.rapport_datum };
      const a = r.aantal_afspraken ?? 0;
      if (a > bA.aantal) bA = { aantal: a, datum: r.rapport_datum };
      eodMap.set(r.rapport_datum, r.doel_behaald === true);
    }
    let streak = 0;
    const cur = new Date();
    for (let i = 0; i < 365; i++) {
      const dag = cur.getDay();
      if (dag === 0 || dag === 6) { cur.setDate(cur.getDate() - 1); continue; }
      const iso = cur.toISOString().slice(0, 10);
      if (i === 0 && !eodMap.has(iso)) { cur.setDate(cur.getDate() - 1); continue; }
      if (eodMap.get(iso) === true) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else break;
    }
    const { data: setterPlaatsingen } = await admin
      .from("plaatsingen")
      .select("created_at, tarief_bedrag")
      .eq("aangemeld_door", gefilterdeSetterId)
      .is("afgekeurd_op", null);
    const perMaand = new Map<string, { aantal: number; bedrag: number }>();
    for (const p of setterPlaatsingen ?? []) {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const x = perMaand.get(key) ?? { aantal: 0, bedrag: 0 };
      x.aantal += 1;
      x.bedrag += Number(p.tarief_bedrag ?? 0);
      perMaand.set(key, x);
    }
    let bP = { aantal: 0, maand: null as string | null };
    let bO = { bedrag: 0, maand: null as string | null };
    for (const [maand, x] of perMaand) {
      if (x.aantal > bP.aantal) bP = { aantal: x.aantal, maand };
      if (x.bedrag > bO.bedrag) bO = { bedrag: x.bedrag, maand };
    }
    gefilterdeSetterRecords = {
      beste_calls_dag: bC,
      beste_afspraken_dag: bA,
      beste_plaatsingen_maand: bP,
      beste_omzet_maand: bO,
      langste_streak: streak,
    };
  }

  // Niet-behaalde doelen vandaag (voor admin/coach banner)
  let nietBehaaldVandaag: EodLight[] = [];
  if (isAdmin || isCoach) {
    const { data } = await admin
      .from("eod_rapporten")
      .select("setter_id, doel_vandaag, doel_behaald, obstakel, setter:profiles!eod_rapporten_setter_id_fkey(voornaam, achternaam)")
      .eq("tenant_id", tenantId)
      .eq("rapport_datum", vandaag)
      .eq("doel_behaald", false);
    nietBehaaldVandaag = (data ?? []) as unknown as EodLight[];
  }

  // Coaching-aanvragen
  let openAanvragen: Array<{ id: string; setter_id: string; bericht: string | null; created_at: string; status: string; setter?: { voornaam: string | null; achternaam: string | null } | null }> = [];
  if (isAdmin || isCoach) {
    const { data } = await admin
      .from("coaching_aanvragen")
      .select("id, setter_id, bericht, created_at, status, setter:profiles!coaching_aanvragen_setter_id_fkey(voornaam, achternaam)")
      .eq("tenant_id", tenantId)
      .in("status", ["aangevraagd", "gepland"])
      .order("created_at", { ascending: false });
    openAanvragen = (data ?? []) as unknown as typeof openAanvragen;
  }

  const periodeLabel = periode === "maand" ? "Deze maand" : periode === "jaar" ? "Dit jaar" : "Deze week";

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="coaching" />

      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3" data-tour="coaching-titel">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
              <Sparkles size={20} /> Coaching
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isSetter ? "Jouw EOD-rapporten, doelen en stats" : isCoach ? "Coach-dashboard" : "Coaching-overzicht"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && <CoachToevoegenKnop users={alleUsers} />}
            {isSetter && <div data-tour="coaching-knop"><CoachingKnop /></div>}
          </div>
        </div>
        <PaginaTour pad="/coaching" naam="Coaching" stappen={TOUR_COACHING} />

        {ok && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
          {ok === "eod" ? "EOD-rapport opgeslagen." : ok === "coaching_aanvraag" ? "Aanvraag verzonden naar Pepijn." : ok === "coaching_reactie" ? "Reactie verzonden." : ok === "doelen" ? "Doelen bijgewerkt." : "Opgeslagen."}
        </div>}

        {/* Admin/coach: filter-bar */}
        {(isAdmin || isCoach) && (
          <AdminFilterBar
            setters={(setters ?? []).map(s => ({ id: s.id, voornaam: s.voornaam, achternaam: s.achternaam }))}
            huidigeSetter={gefilterdeSetterId}
            huidigeFilter={gefilterdeStatus}
          />
        )}

        {/* Setter-detailweergave wanneer geselecteerd */}
        {(isAdmin || isCoach) && gefilterdeSetterId && gefilterdeSetterStats && (
          <section className="mb-6 space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">{gefilterdeSetterStats.naam}</h2>
                <p className="text-xs text-gray-500">Detailweergave</p>
              </div>
              <SetterReactieKnop setterId={gefilterdeSetterId} setterNaam={gefilterdeSetterStats.naam} />
            </div>
            {gefilterdeSetterDoelen && gefilterdeSetterRecords && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RecordsSectie records={gefilterdeSetterRecords} />
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 mb-3 pb-2 border-b">Periode-stats ({periodeLabel.toLowerCase()})</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Calls"        v={gefilterdeSetterStats.calls} />
                    <Stat label="Voicemails"   v={gefilterdeSetterStats.voicemails} />
                    <Stat label="Voorgesteld"  v={gefilterdeSetterStats.voorgesteld} />
                    <Stat label="Afspraken"    v={gefilterdeSetterStats.afspraken} />
                    <Stat label="Plaatsingen"  v={gefilterdeSetterStats.plaatsingen} accent />
                    <Stat label="Omzet (€)"    v={Math.round(gefilterdeSetterStats.bedrag).toLocaleString("nl-NL")} accent />
                  </div>
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                    Doelen: {gefilterdeSetterDoelen.doel_calls_dag} calls/dag · {gefilterdeSetterDoelen.doel_plaatsingen_maand} plaatsingen/maand
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b font-bold text-gray-800 text-sm">
                EOD-rapporten {gefilterdeStatus === "behaald" ? "(alleen behaald)" : gefilterdeStatus === "niet_behaald" ? "(alleen niet behaald)" : ""}
              </div>
              {gefilterdEod.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">Geen rapporten met deze filter.</p>
              ) : (
                <div className="divide-y">
                  {gefilterdEod.map(r => <EodHistorieRow key={r.rapport_datum} r={r} />)}
                </div>
              )}
            </div>
          </section>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}

        {/* Niet-behaalde doelen vandaag — admin/coach */}
        {(isAdmin || isCoach) && nietBehaaldVandaag.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
            <h2 className="font-bold text-red-900 inline-flex items-center gap-2 mb-2">
              <AlertTriangle size={16} /> {nietBehaaldVandaag.length} setter(s) haalden hun doel vandaag niet
            </h2>
            <ul className="text-sm text-red-800 space-y-1">
              {nietBehaaldVandaag.map((r, i) => {
                const s = Array.isArray(r.setter) ? r.setter[0] : r.setter;
                const naam = `${s?.voornaam ?? ""} ${s?.achternaam ?? ""}`.trim() || "Onbekend";
                return (
                  <li key={i} className="flex items-start gap-2">
                    <XCircle size={12} className="mt-1 shrink-0" />
                    <span><b>{naam}</b>{r.obstakel ? ` — ${r.obstakel}` : ""}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Setter: records + doelen */}
        {isSetter && eigenRecords && eigenDoelen && eigenVoortgang && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div data-tour="doelen-kaart"><DoelenSectie doelen={eigenDoelen} voortgang={eigenVoortgang} /></div>
            <div data-tour="records-kaart"><RecordsSectie records={eigenRecords} /></div>
          </div>
        )}

        {/* Setter: eigen EOD-form */}
        {isSetter && (
          <section className="mb-8" data-tour="eod-form">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 inline-flex items-center gap-2">
              <ListTodo size={14} /> EOD-rapport vandaag {eigenEodVandaag && <span className="text-emerald-600 normal-case">— al ingevuld, je kunt bijwerken</span>}
            </h2>
            <EodForm bestaand={eigenEodVandaag} />
          </section>
        )}

        {/* Leaderboard */}
        <section className="mb-8" data-tour="leaderboard">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 inline-flex items-center gap-2">
              <Trophy size={14} /> Top 10 setters — {periodeLabel}
            </h2>
            <div className="inline-flex bg-gray-100 rounded-md p-1 text-xs">
              {(["week", "maand", "jaar"] as const).map(p => (
                <Link
                  key={p}
                  href={`/coaching?periode=${p}`}
                  className={`px-3 py-1.5 rounded font-semibold ${periode === p ? "bg-white text-[#333399] shadow-sm" : "text-gray-600 hover:text-gray-800"}`}
                >
                  {p === "week" ? "Week" : p === "maand" ? "Maand" : "Jaar"}
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">Geen activiteit in deze periode.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold w-10">#</th>
                    <th className="text-left px-4 py-2 font-semibold">Setter</th>
                    <th className="text-right px-3 py-2 font-semibold"><Phone size={11} className="inline" /> Calls</th>
                    <th className="text-right px-3 py-2 font-semibold"><CalendarCheck size={11} className="inline" /> Afspraken</th>
                    <th className="text-right px-3 py-2 font-semibold"><Briefcase size={11} className="inline" /> Plaatsingen</th>
                    <th className="text-right px-3 py-2 font-semibold"><Coins size={11} className="inline" /> Omzet</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((s, idx) => {
                    const isEigen = isSetter && s.id === user.id;
                    return (
                      <tr key={s.id} className={`border-t ${isEigen ? "bg-amber-50/40" : "hover:bg-gray-50"}`}>
                        <td className="px-4 py-2 font-bold text-gray-700">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                        </td>
                        <td className="px-4 py-2 font-semibold text-gray-800">{s.naam}{isEigen && <span className="ml-2 text-[10px] text-amber-700 font-bold">JIJ</span>}</td>
                        <td className="px-3 py-2 text-right font-medium">{s.calls}</td>
                        <td className="px-3 py-2 text-right font-medium">{s.afspraken}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">{s.plaatsingen}</td>
                        <td className="px-3 py-2 text-right font-medium">€ {s.bedrag.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Setter eigen geschiedenis */}
        {isSetter && eigenEodGeschiedenis.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Laatste 14 dagen</h2>
            <div className="bg-white rounded-xl shadow-sm divide-y">
              {eigenEodGeschiedenis.map((r) => (
                <EodHistorieRow key={r.rapport_datum} r={r} />
              ))}
            </div>
          </section>
        )}

        {/* Coach / Admin: open aanvragen */}
        {(isAdmin || isCoach) && openAanvragen.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Open 1-op-1 aanvragen</h2>
            <div className="space-y-2">
              {openAanvragen.map((a) => {
                const s = Array.isArray(a.setter) ? a.setter[0] : a.setter;
                const naam = `${s?.voornaam ?? ""} ${s?.achternaam ?? ""}`.trim() || "Onbekend";
                return (
                  <CoachingAanvraagItem key={a.id} id={a.id} setterNaam={naam} bericht={a.bericht} status={a.status} created_at={a.created_at} />
                );
              })}
            </div>
          </section>
        )}

        {/* Coach / Admin: per-setter overzicht */}
        {(isAdmin || isCoach) && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">EOD vandaag — alle setters</h2>
            <AdminVandaagOverzicht tenantId={tenantId} vandaag={vandaag} />
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({ label, v, accent = false }: { label: string; v: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${accent ? "bg-amber-50" : "bg-gray-50"}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-amber-800" : "text-gray-800"}`}>{v}</div>
    </div>
  );
}

function EodHistorieRow({ r }: { r: EodLight }) {
  const datum = new Date(r.rapport_datum).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
  return (
    <details className="px-5 py-3 group">
      <summary className="cursor-pointer flex items-center gap-3 list-none">
        {r.doel_behaald ? (
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
        ) : (
          <XCircle size={14} className="text-red-500 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-800">{datum}</div>
          <div className="text-xs text-gray-500 truncate">{r.doel_vandaag ?? "Geen doel ingevuld"}</div>
        </div>
        <div className="text-xs text-gray-500 hidden md:flex gap-3">
          <span><b>{r.aantal_calls ?? 0}</b> calls</span>
          <span><b>{r.aantal_afspraken ?? 0}</b> afspraken</span>
          <span><b>{r.aantal_plaatsingen ?? 0}</b> plaatsingen</span>
          <span className="inline-flex items-center gap-0.5"><Battery size={10} /> {r.energie_focus ?? "—"}</span>
        </div>
      </summary>
      <div className="mt-3 pl-7 text-xs text-gray-700 space-y-2">
        {r.obstakel && <div><b>Obstakel:</b> {r.obstakel}</div>}
        {r.afwijzings_reden && <div><b>Reden afwijzing:</b> {r.afwijzings_reden}</div>}
        {r.morgen_anders && <div><b>Morgen anders:</b> {r.morgen_anders}</div>}
        {r.doel_morgen && <div><b>Doel morgen:</b> {r.doel_morgen}</div>}
      </div>
    </details>
  );
}

async function AdminVandaagOverzicht({ tenantId, vandaag }: { tenantId: string; vandaag: string }) {
  const admin = createAdminClient();
  const { data: setters } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, rol")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .in("rol", ["setter", "recruiter"]);
  const { data: eodVandaag } = await admin
    .from("eod_rapporten")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("rapport_datum", vandaag);

  const map = new Map((eodVandaag ?? []).map((r) => [r.setter_id, r as EodLight]));

  if (!setters || setters.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
        <Sparkles size={28} className="mx-auto mb-2 text-gray-300" />
        <p className="text-sm font-semibold">Geen actieve setters/recruiters</p>
        <p className="text-xs mt-1">Zodra er setters worden toegevoegd, verschijnen ze hier met hun EOD vandaag.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {setters.map((s) => {
        const r = map.get(s.id);
        const naam = `${s.voornaam ?? ""} ${s.achternaam ?? ""}`.trim() || "—";
        const initialen = `${(s.voornaam ?? "?")[0]}${(s.achternaam ?? "")[0] ?? ""}`.toUpperCase();
        let statusBorder = "border-gray-200";
        let statusBadge = <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Nog niet ingevuld</span>;
        if (r) {
          if (r.doel_behaald) {
            statusBorder = "border-emerald-300";
            statusBadge = <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><CheckCircle2 size={10} /> Doel behaald</span>;
          } else {
            statusBorder = "border-red-300";
            statusBadge = <span className="text-[10px] font-bold uppercase text-red-700 bg-red-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><XCircle size={10} /> Niet behaald</span>;
          }
        }
        return (
          <div key={s.id} className={`bg-white rounded-xl shadow-sm p-5 border-2 ${statusBorder}`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#333399] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                {initialen}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-800 truncate">{naam}</div>
                <div className="text-[11px] text-gray-500 capitalize">{s.rol}</div>
              </div>
              {statusBadge}
            </div>

            {/* Body */}
            {!r ? (
              <div className="bg-gray-50 rounded-lg p-3 text-center text-xs text-gray-500 italic">
                Nog geen rapport vandaag
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-gray-400">Doel vandaag</div>
                    <div className="text-xs text-gray-700">{r.doel_vandaag ?? "—"}</div>
                  </div>
                  {r.obstakel && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">Obstakel</div>
                      <div className="text-xs text-gray-700">{r.obstakel}</div>
                    </div>
                  )}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-2 mb-3 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-base font-bold text-[#333399]">{r.aantal_calls ?? 0}</div>
                    <div className="text-[9px] uppercase text-gray-500">Calls</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-bold text-[#333399]">{r.aantal_afspraken ?? 0}</div>
                    <div className="text-[9px] uppercase text-gray-500">Afspraken</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-bold text-emerald-600">{r.aantal_plaatsingen ?? 0}</div>
                    <div className="text-[9px] uppercase text-gray-500">Plaatsingen</div>
                  </div>
                </div>

                {r.morgen_anders && (
                  <div className="text-[11px] text-gray-600 pt-2 border-t border-gray-100">
                    <b>Morgen anders:</b> {r.morgen_anders}
                  </div>
                )}
              </>
            )}

            {/* Reactie-knop */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <SetterReactieKnop setterId={s.id} setterNaam={naam} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
