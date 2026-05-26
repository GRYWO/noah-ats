import Link from "next/link";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  Users, Briefcase, PartyPopper, Coins,
  UserPlus, Mail, LifeBuoy, KanbanSquare, Phone, Sparkles,
} from "lucide-react";

const NOODNUMMER = "085-4016082";
const NOODNUMMER_RAW = "0854016082";

function startVanMaandISO(): string {
  const nu = new Date();
  return `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function BureauAdminDashboard({ tenantId, bureauNaam }: { tenantId: string; bureauNaam: string }) {
  const admin = createAdminClient();
  const startMaand = startVanMaandISO();

  // KPI's parallel ophalen
  const [
    kandidatenRes,
    voorstellenRes,
    plaatsingenRes,
    settersRes,
  ] = await Promise.all([
    admin.from("kandidaten").select("id, status", { count: "exact" }).eq("tenant_id", tenantId),
    admin.from("voorstellen").select("id, status", { count: "exact" }).eq("tenant_id", tenantId).eq("status", "verzonden"),
    admin.from("plaatsingen").select("tarief_bedrag", { count: "exact" })
      .eq("tenant_id", tenantId).is("afgekeurd_op", null).gte("created_at", new Date(startMaand).toISOString()),
    admin.from("profiles").select("id, rol").eq("tenant_id", tenantId).eq("is_active", true),
  ]);

  const totaalKandidaten = kandidatenRes.count ?? 0;
  const lopendeKandidaten = (kandidatenRes.data ?? []).filter(k => k.status !== "geplaatst" && k.status !== "afgewezen").length;
  const lopendeVoorstellen = voorstellenRes.count ?? 0;
  const plaatsingenMaand = plaatsingenRes.count ?? 0;
  const omzetMaand = (plaatsingenRes.data ?? []).reduce((s, p) => s + Number(p.tarief_bedrag ?? 0), 0);
  const setters = (settersRes.data ?? []).filter(p => p.rol === "setter").length;
  const recruiters = (settersRes.data ?? []).filter(p => p.rol === "recruiter").length;

  const kpis = [
    { label: "Lopende kandidaten", waarde: lopendeKandidaten,           sub: `${totaalKandidaten} totaal`, icoon: <Users size={16} />,        kleur: "bg-blue-500" },
    { label: "Voorstellen open",   waarde: lopendeVoorstellen,          sub: "wachten op reactie",        icoon: <Briefcase size={16} />,    kleur: "bg-amber-500" },
    { label: "Plaatsingen / maand", waarde: plaatsingenMaand,           sub: new Date().toLocaleDateString("nl-NL", { month: "long" }), icoon: <PartyPopper size={16} />, kleur: "bg-emerald-500" },
    { label: "Omzet / maand (€)",  waarde: omzetMaand.toLocaleString("nl-NL", { maximumFractionDigits: 0 }), sub: "Werving & Selectie", icoon: <Coins size={16} />, kleur: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Welkom + noodnummer */}
      <div className="bg-gradient-to-r from-[#333399] to-[#5454c4] rounded-2xl p-6 text-white shadow-md flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold inline-flex items-center gap-2">
            <Sparkles size={20} /> Welkom bij Noah, {bureauNaam}
          </h2>
          <p className="text-white/80 text-sm mt-1">
            Wij regelen de techniek — jij focust op je mensen. Heb je een vraag of probleem? Bel direct:
          </p>
        </div>
        <a
          href={`tel:${NOODNUMMER_RAW}`}
          className="bg-white text-[#333399] hover:bg-amber-50 font-bold px-5 py-3 rounded-xl text-sm inline-flex items-center gap-2 shadow-sm"
        >
          <LifeBuoy size={16} /> Noodnummer {NOODNUMMER}
        </a>
      </div>

      {/* KPI tegels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl shadow-sm p-4">
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${k.kleur} text-white mb-2`}>
              {k.icoon}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{k.label}</div>
            <div className="text-2xl font-black text-gray-800 mt-1">{k.waarde}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Team */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-3 pb-2 border-b inline-flex items-center gap-2">
          <Users size={16} /> Jouw team
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-3xl font-black text-[#333399]">{recruiters}</div>
            <div className="text-xs text-gray-500">recruiters</div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#333399]">{setters}</div>
            <div className="text-xs text-gray-500">setters</div>
          </div>
        </div>
      </div>

      {/* Snelkoppelingen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SnelLink
          href="/setters"
          titel="Recruiters & setters beheren"
          beschrijving="Voeg recruiters of setters toe, beheer rechten en wijs een coach aan."
          icoon={<UserPlus size={20} />}
        />
        <SnelLink
          href="/kanban"
          titel="Bekijk je pipeline"
          beschrijving="De volledige funnel van interne intake tot plaatsing voor jouw bureau."
          icoon={<KanbanSquare size={20} />}
        />
        <SnelLink
          href="/instellingen"
          titel="E-mailbox toevoegen"
          beschrijving="Koppel het zakelijk mailadres voor het bureau zodat voorstellen vanaf jouw domein vertrekken."
          icoon={<Mail size={20} />}
        />
        <SnelLink
          href={`tel:${NOODNUMMER_RAW}`}
          extern
          titel="Direct contact met Noah-team"
          beschrijving={`Vragen, storing of een wens? Bel ${NOODNUMMER}. We zijn er.`}
          icoon={<Phone size={20} />}
        />
      </div>
    </div>
  );
}

function SnelLink({
  href, titel, beschrijving, icoon, extern = false,
}: {
  href: string;
  titel: string;
  beschrijving: string;
  icoon: React.ReactNode;
  extern?: boolean;
}) {
  const Comp = extern ? "a" : Link;
  return (
    <Comp
      href={href}
      className="bg-white rounded-xl shadow-sm p-5 flex items-start gap-4 hover:shadow-md hover:border-[#333399]/30 border border-transparent transition"
    >
      <div className="w-12 h-12 rounded-xl bg-[#333399]/5 text-[#333399] flex items-center justify-center shrink-0">
        {icoon}
      </div>
      <div className="min-w-0">
        <div className="font-bold text-gray-800">{titel}</div>
        <div className="text-xs text-gray-500 mt-1 leading-relaxed">{beschrijving}</div>
      </div>
    </Comp>
  );
}
