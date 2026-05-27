import Link from "next/link";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  Users, Briefcase, PartyPopper, Coins,
  UserPlus, Mail, LifeBuoy, KanbanSquare, Phone, Sparkles,
  Building2, FileText, Download,
} from "lucide-react";
import { updateBureauContactgegevens } from "./bureau-admin-actions";

const NOODNUMMER = "085-4016082";
const NOODNUMMER_RAW = "0854016082";

function startVanMaandISO(): string {
  const nu = new Date();
  return `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function BureauAdminDashboard({ tenantId, bureauNaam }: { tenantId: string; bureauNaam: string }) {
  const admin = createAdminClient();
  const startMaand = startVanMaandISO();

  // KPI's + bedrijfsgegevens + documenten parallel ophalen
  const [
    kandidatenRes,
    voorstellenRes,
    plaatsingenRes,
    settersRes,
    tenantRes,
    documentenRes,
  ] = await Promise.all([
    admin.from("kandidaten").select("id, status", { count: "exact" }).eq("tenant_id", tenantId),
    admin.from("voorstellen").select("id, status", { count: "exact" }).eq("tenant_id", tenantId).eq("status", "verzonden"),
    admin.from("plaatsingen").select("tarief_bedrag", { count: "exact" })
      .eq("tenant_id", tenantId).is("afgekeurd_op", null).gte("created_at", new Date(startMaand).toISOString()),
    admin.from("profiles").select("id, rol").eq("tenant_id", tenantId).eq("is_active", true),
    admin.from("tenants")
      .select("contact_naam, contact_functie, contact_tel, contact_email, telefoon, algemeen_email, vestigingsadres, factuuradres, kvk, btw_nummer, iban")
      .eq("id", tenantId).single(),
    admin.from("bureau_documenten")
      .select("id, naam, bestand_url, type, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
  ]);
  const tenantData = tenantRes.data;
  const documenten = documentenRes.data ?? [];

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

      {/* Bedrijfsgegevens */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-3 pb-2 border-b inline-flex items-center gap-2">
          <Building2 size={16} /> Bedrijfsgegevens
        </h3>
        <form action={updateBureauContactgegevens} className="space-y-4">
          {(tenantData?.kvk || tenantData?.btw_nummer || tenantData?.iban) && (
            <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-600 grid grid-cols-1 md:grid-cols-3 gap-3">
              {tenantData?.kvk && <div><span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] block">KvK</span>{tenantData.kvk}</div>}
              {tenantData?.btw_nummer && <div><span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] block">BTW</span>{tenantData.btw_nummer}</div>}
              {tenantData?.iban && <div><span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] block">IBAN</span>{tenantData.iban}</div>}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Veld label="Contactpersoon"><input name="contact_naam" defaultValue={tenantData?.contact_naam ?? ""} className={ba_input} /></Veld>
            <Veld label="Functie"><input name="contact_functie" defaultValue={tenantData?.contact_functie ?? ""} className={ba_input} /></Veld>
            <Veld label="Telefoon contactpersoon"><input name="contact_tel" defaultValue={tenantData?.contact_tel ?? ""} className={ba_input} /></Veld>
            <Veld label="E-mail contactpersoon"><input type="email" name="contact_email" defaultValue={tenantData?.contact_email ?? ""} className={ba_input} /></Veld>
            <Veld label="Telefoon bedrijf"><input name="telefoon" defaultValue={tenantData?.telefoon ?? ""} className={ba_input} /></Veld>
            <Veld label="Algemeen e-mailadres"><input type="email" name="algemeen_email" defaultValue={tenantData?.algemeen_email ?? ""} className={ba_input} /></Veld>
            <Veld label="Vestigingsadres" fullWidth>
              <input name="vestigingsadres" defaultValue={tenantData?.vestigingsadres ?? ""} placeholder="Straatnaam 12, 1234 AB Plaats" className={ba_input} />
            </Veld>
            <Veld label="Factuuradres (indien anders)" fullWidth>
              <input name="factuuradres" defaultValue={tenantData?.factuuradres ?? ""} placeholder="Laat leeg = gelijk aan vestigingsadres" className={ba_input} />
            </Veld>
          </div>
          <div className="flex justify-end pt-2 border-t">
            <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm">
              Opslaan
            </button>
          </div>
        </form>
      </div>

      {/* Documenten */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-1 pb-2 border-b inline-flex items-center gap-2">
          <FileText size={16} /> Documenten
        </h3>
        <p className="text-xs text-gray-500 mt-2 mb-4">
          Contracten, overeenkomsten en andere documenten. Noah uploadt deze voor jou.
        </p>
        {documenten.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-md">
            <FileText size={24} className="mx-auto text-gray-300 mb-2" />
            Nog geen documenten geüpload.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {documenten.map((d) => (
              <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-gray-800 truncate">{d.naam}</div>
                  <div className="text-xs text-gray-500">
                    {d.type && <span className="inline-block bg-gray-100 px-2 py-0.5 rounded-full mr-2">{d.type}</span>}
                    {new Date(d.created_at).toLocaleDateString("nl-NL")}
                  </div>
                </div>
                {d.bestand_url && (
                  <a
                    href={d.bestand_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#333399] hover:bg-[#333399]/5 px-3 py-1.5 rounded-md border border-[#333399]/20"
                  >
                    <Download size={11} /> Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Snelkoppelingen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SnelLink
          href="/setters"
          titel="Recruiters beheren"
          beschrijving="Voeg recruiters toe en beheer hun gegevens. Setters worden centraal door GRYWO geregeld."
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

const ba_input = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]";

function Veld({ label, children, fullWidth = false }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
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
