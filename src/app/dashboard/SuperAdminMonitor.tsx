import { createAdminClient } from "@/utils/supabase/admin";
import {
  Users as UsersIcon,
  Building2,
  Database,
  FileText,
  Briefcase,
  ScrollText,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  FileCheck2,
  Trash2,
  Activity,
  Wifi,
} from "lucide-react";

type Event = {
  id: string;
  type: "plaatsing" | "contract" | "dpa" | "akkoord" | "cleanup";
  titel: string;
  details: string | null;
  tijd: string;
};

export async function SuperAdminMonitor() {
  const admin = createAdminClient();
  const nu = Date.now();
  const vijfMin = new Date(nu - 5 * 60 * 1000).toISOString();
  const dagGeleden = new Date(nu - 24 * 60 * 60 * 1000).toISOString();

  // ----- ONLINE NU -----
  const { data: onlineUsers } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, email, rol, laatst_actief_op")
    .gte("laatst_actief_op", vijfMin)
    .order("laatst_actief_op", { ascending: false })
    .limit(20);

  const { count: totaalActief24u } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("laatst_actief_op", dagGeleden);

  // ----- DATABASE STATS -----
  const [kandidatenC, voorstellenC, plaatsingenC, contractenC, usersC, bureausC] = await Promise.all([
    admin.from("kandidaten").select("*", { count: "exact", head: true }),
    admin.from("voorstellen").select("*", { count: "exact", head: true }),
    admin.from("plaatsingen").select("*", { count: "exact", head: true }),
    admin.from("contract_verzoeken").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("tenants").select("*", { count: "exact", head: true }),
  ]);

  // Per bureau: aantal kandidaten + recente activiteit
  const { data: bureausLijst } = await admin
    .from("tenants")
    .select("id, naam")
    .order("created_at", { ascending: false });

  const bureauStats: Array<{
    id: string;
    naam: string;
    aantalKandidaten: number;
    laatsteActiviteit: string | null;
  }> = [];
  for (const b of bureausLijst ?? []) {
    const { count } = await admin
      .from("kandidaten")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", b.id);
    const { data: laatste } = await admin
      .from("kandidaten")
      .select("updated_at")
      .eq("tenant_id", b.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    bureauStats.push({
      id: b.id,
      naam: b.naam,
      aantalKandidaten: count ?? 0,
      laatsteActiviteit: laatste?.updated_at ?? null,
    });
  }

  // ----- SYSTEM EVENTS LOG -----
  const events: Event[] = [];

  // Plaatsingen
  const { data: plaatsingen } = await admin
    .from("plaatsingen")
    .select("id, bedrijf, startdatum, created_at, kandidaat:kandidaten(voornaam, achternaam), tenant:tenants(naam)")
    .order("created_at", { ascending: false })
    .limit(15);
  for (const p of plaatsingen ?? []) {
    const k = Array.isArray(p.kandidaat) ? p.kandidaat[0] : p.kandidaat;
    const t = Array.isArray(p.tenant) ? p.tenant[0] : p.tenant;
    events.push({
      id: "p-" + p.id,
      type: "plaatsing",
      titel: `${k?.voornaam ?? "?"} ${k?.achternaam ?? ""} geplaatst bij ${p.bedrijf ?? "?"}`,
      details: `${t?.naam ?? "?"} · start ${p.startdatum ?? "?"}`,
      tijd: p.created_at,
    });
  }

  // Contract-verzoeken
  const { data: contracten } = await admin
    .from("contract_verzoeken")
    .select("id, kandidaat_naam, status, contract_salaris, geupload_op, created_at, tenant:tenants(naam)")
    .order("created_at", { ascending: false })
    .limit(15);
  for (const c of contracten ?? []) {
    const t = Array.isArray(c.tenant) ? c.tenant[0] : c.tenant;
    const status = c.status === "afgerond"
      ? `geredacteerd, € ${c.contract_salaris?.toLocaleString("nl-NL") ?? "?"}`
      : c.status;
    events.push({
      id: "c-" + c.id,
      type: "contract",
      titel: `Contract ${c.kandidaat_naam} — ${status}`,
      details: t?.naam ?? null,
      tijd: c.geupload_op ?? c.created_at,
    });
  }

  // DPA-ondertekeningen
  const { data: dpas } = await admin
    .from("dpa_signatures")
    .select("id, status, getekend_op, bureau:tenants(naam)")
    .order("created_at", { ascending: false })
    .limit(10);
  for (const d of dpas ?? []) {
    const b = Array.isArray(d.bureau) ? d.bureau[0] : d.bureau;
    events.push({
      id: "d-" + d.id,
      type: "dpa",
      titel: `DPA ${d.status === "getekend" ? "getekend" : d.status}`,
      details: b?.naam ?? null,
      tijd: d.getekend_op ?? null,
    });
  }

  // Akkoord (NDA / gebruiksvoorwaarden)
  const { data: akkoorden } = await admin
    .from("user_agreements")
    .select("id, type, status, getekend_op, profile:profiles(voornaam, achternaam, tenant_id)")
    .eq("status", "getekend")
    .order("getekend_op", { ascending: false })
    .limit(10);
  for (const a of akkoorden ?? []) {
    const p = Array.isArray(a.profile) ? a.profile[0] : a.profile;
    events.push({
      id: "a-" + a.id,
      type: "akkoord",
      titel: `${a.type === "nda_setter" ? "NDA" : "Gebruiksvoorwaarden"} getekend`,
      details: p ? `${p.voornaam ?? ""} ${p.achternaam ?? ""}`.trim() : null,
      tijd: a.getekend_op ?? null,
    });
  }

  // AVG cleanup runs
  const { data: cleanups } = await admin
    .from("cron_runs")
    .select("id, cron_naam, status, resultaat, gestart_op")
    .eq("cron_naam", "cleanup-avg")
    .order("gestart_op", { ascending: false })
    .limit(5);
  for (const c of cleanups ?? []) {
    const r = (c.resultaat ?? {}) as Record<string, number>;
    const samen = [
      r.afgewezen_verwijderd ? `${r.afgewezen_verwijderd} afgewezen` : null,
      r.contract_originelen_verwijderd ? `${r.contract_originelen_verwijderd} contract-originelen` : null,
      r.mijn_data_tokens_opgeruimd ? `${r.mijn_data_tokens_opgeruimd} tokens` : null,
    ].filter(Boolean).join(" · ") || "niets te verwijderen";
    events.push({
      id: "cl-" + c.id,
      type: "cleanup",
      titel: `AVG-cleanup ${c.status === "succes" ? "✓" : "⚠"}`,
      details: samen,
      tijd: c.gestart_op,
    });
  }

  // Sort all events by tijd (descending)
  events.sort((a, b) => new Date(b.tijd ?? 0).getTime() - new Date(a.tijd ?? 0).getTime());
  const top50 = events.slice(0, 50);

  return (
    <div className="space-y-6 mb-6">
      {/* ============= ONLINE NU ============= */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Wifi size={18} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-800">Wie is nu online</h2>
          <span className="ml-auto text-xs text-gray-500">
            {totaalActief24u ?? 0} actief afgelopen 24u
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Users met activiteit in laatste 5 minuten
        </p>

        {(onlineUsers ?? []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {(onlineUsers ?? []).map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
              >
                <span className="relative flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {u.voornaam} {u.achternaam}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {u.rol} · {formatRelatief(u.laatst_actief_op)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Niemand is op dit moment actief.</p>
        )}
      </section>

      {/* ============= DATABASE STATS ============= */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database size={18} className="text-[#333399]" />
          <h2 className="text-lg font-bold text-gray-800">Database stats</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatKaart icoon={<UsersIcon size={14} />} label="Kandidaten" waarde={kandidatenC.count ?? 0} kleur="blue" />
          <StatKaart icoon={<FileText size={14} />} label="Voorstellen" waarde={voorstellenC.count ?? 0} kleur="purple" />
          <StatKaart icoon={<Briefcase size={14} />} label="Plaatsingen" waarde={plaatsingenC.count ?? 0} kleur="emerald" />
          <StatKaart icoon={<FileCheck2 size={14} />} label="Contracten" waarde={contractenC.count ?? 0} kleur="amber" />
          <StatKaart icoon={<UsersIcon size={14} />} label="Users" waarde={usersC.count ?? 0} kleur="indigo" />
          <StatKaart icoon={<Building2 size={14} />} label="Bureaus" waarde={bureausC.count ?? 0} kleur="rose" />
        </div>

        <div>
          <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Per bureau</div>
          <div className="space-y-1.5">
            {bureauStats.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="font-semibold text-gray-800 truncate">{b.naam}</span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-3 flex-shrink-0">
                  <span>
                    <b className="text-[#333399]">{b.aantalKandidaten}</b> kand.
                  </span>
                  <span>
                    {b.laatsteActiviteit
                      ? `actief ${formatRelatief(b.laatsteActiviteit)}`
                      : "geen activiteit"}
                  </span>
                </div>
              </div>
            ))}
            {bureauStats.length === 0 && (
              <p className="text-sm text-gray-500 italic">Nog geen bureaus.</p>
            )}
          </div>
        </div>
      </section>

      {/* ============= SYSTEM EVENTS LOG ============= */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText size={18} className="text-[#333399]" />
          <h2 className="text-lg font-bold text-gray-800">System events</h2>
          <span className="ml-auto text-xs text-gray-500">{top50.length} laatste</span>
        </div>

        {top50.length > 0 ? (
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {top50.map((e) => (
              <EventRij key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Nog geen events.</p>
        )}
      </section>
    </div>
  );
}

function StatKaart({
  icoon,
  label,
  waarde,
  kleur,
}: {
  icoon: React.ReactNode;
  label: string;
  waarde: number;
  kleur: "blue" | "purple" | "emerald" | "amber" | "indigo" | "rose";
}) {
  const kleurMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <div className={`rounded-lg border p-3 ${kleurMap[kleur]}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-1">
        {icoon}
        {label}
      </div>
      <div className="text-2xl font-bold">{waarde.toLocaleString("nl-NL")}</div>
    </div>
  );
}

function EventRij({ event }: { event: Event }) {
  const meta: Record<Event["type"], { icoon: React.ReactNode; kleur: string }> = {
    plaatsing: { icoon: <Briefcase size={12} />, kleur: "text-emerald-600 bg-emerald-50" },
    contract: { icoon: <FileCheck2 size={12} />, kleur: "text-amber-600 bg-amber-50" },
    dpa: { icoon: <ShieldCheck size={12} />, kleur: "text-blue-600 bg-blue-50" },
    akkoord: { icoon: <CheckCircle2 size={12} />, kleur: "text-purple-600 bg-purple-50" },
    cleanup: { icoon: <Trash2 size={12} />, kleur: "text-gray-600 bg-gray-100" },
  };
  const m = meta[event.type];

  return (
    <div className="flex items-start gap-3 p-2.5 hover:bg-gray-50 rounded-lg">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${m.kleur}`}>
        {m.icoon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800 truncate">{event.titel}</div>
        {event.details && (
          <div className="text-xs text-gray-500 truncate">{event.details}</div>
        )}
      </div>
      <div className="text-xs text-gray-400 flex-shrink-0">
        {event.tijd ? formatRelatief(event.tijd) : "—"}
      </div>
    </div>
  );
}

function formatRelatief(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "zojuist";
  if (min < 60) return `${min}m`;
  const uur = Math.floor(min / 60);
  if (uur < 24) return `${uur}u`;
  const dag = Math.floor(uur / 24);
  return `${dag}d`;
}

// Voorkom unused warning
export const XCircleUsed = XCircle;
export const ActivityUsed = Activity;
