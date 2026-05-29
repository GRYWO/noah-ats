import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, ShieldCheck, FileSignature, FileCheck2 } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; kleur: string; icoon: React.ReactNode }> = {
  verzonden:       { label: "Verzonden",       kleur: "bg-blue-100 text-blue-700",       icoon: <Clock size={12} /> },
  deels_getekend:  { label: "Deels getekend",  kleur: "bg-amber-100 text-amber-700",     icoon: <AlertCircle size={12} /> },
  voltooid:        { label: "Voltooid",        kleur: "bg-emerald-100 text-emerald-700", icoon: <CheckCircle2 size={12} /> },
  getekend:        { label: "Getekend",        kleur: "bg-emerald-100 text-emerald-700", icoon: <CheckCircle2 size={12} /> },
  wachtend:        { label: "Wacht op handtekening", kleur: "bg-amber-100 text-amber-700", icoon: <Clock size={12} /> },
  afgerond:        { label: "Afgerond",        kleur: "bg-emerald-100 text-emerald-700", icoon: <CheckCircle2 size={12} /> },
  vervallen:       { label: "Vervallen",       kleur: "bg-gray-100 text-gray-700",       icoon: <XCircle size={12} /> },
  ingetrokken:     { label: "Ingetrokken",     kleur: "bg-gray-100 text-gray-700",       icoon: <XCircle size={12} /> },
};

type GedeeldDoc = {
  id: string;
  bron: "document" | "dpa" | "nda" | "voorwaarden" | "contract";
  titel: string;
  beschrijving: string | null;
  status: string;
  datum: string;
  detail_link: string;
  ondertekenaars: string; // bv "1/1 getekend"
};

const BRON_META: Record<GedeeldDoc["bron"], { label: string; kleur: string; icoon: React.ReactNode }> = {
  document:    { label: "Document",        kleur: "bg-[#333399]/10 text-[#333399]", icoon: <FileText size={12} /> },
  dpa:         { label: "DPA",             kleur: "bg-blue-100 text-blue-700",      icoon: <ShieldCheck size={12} /> },
  nda:         { label: "NDA",             kleur: "bg-purple-100 text-purple-700",  icoon: <FileSignature size={12} /> },
  voorwaarden: { label: "Gebruiksvoorw.",  kleur: "bg-indigo-100 text-indigo-700",  icoon: <FileSignature size={12} /> },
  contract:    { label: "Contract",        kleur: "bg-amber-100 text-amber-700",    icoon: <FileCheck2 size={12} /> },
};

export default async function DocumentenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) redirect("/dashboard");

  const admin = createAdminClient();

  // 1) Eigen documenten (envelopes)
  const { data: envelopes } = await admin
    .from("document_envelopes")
    .select("id, titel, beschrijving, status, aangemaakt_op, voltooid_op, vervalt_op")
    .order("aangemaakt_op", { ascending: false });

  const envIds = (envelopes ?? []).map((e) => e.id);
  const { data: onds } = await admin
    .from("document_ondertekenaars")
    .select("envelope_id, status")
    .in("envelope_id", envIds.length > 0 ? envIds : ["00000000-0000-0000-0000-000000000000"]);
  const countMap = new Map<string, { totaal: number; getekend: number }>();
  for (const o of onds ?? []) {
    const c = countMap.get(o.envelope_id) ?? { totaal: 0, getekend: 0 };
    c.totaal += 1;
    if (o.status === "getekend") c.getekend += 1;
    countMap.set(o.envelope_id, c);
  }

  // 2) DPA's
  const { data: dpas } = await admin
    .from("dpa_signatures")
    .select("id, status, verzonden_op, getekend_op, verzonden_aan_naam, verzonden_aan_email, tenant_id, tenant:tenants(naam)")
    .order("verzonden_op", { ascending: false });

  // 3) NDA / gebruiksvoorwaarden
  const { data: akkoorden } = await admin
    .from("user_agreements")
    .select("id, type, status, verzonden_op, getekend_op, user_id, profiel:profiles(voornaam, achternaam, email)")
    .order("verzonden_op", { ascending: false });

  // 4) Contract-verzoeken
  const { data: contracten } = await admin
    .from("contract_verzoeken")
    .select("id, kandidaat_naam, opdrachtgever_naam, status, verzonden_op, geupload_op, afgerond_op")
    .order("verzonden_op", { ascending: false });

  // Samenvoegen tot uniforme lijst
  const lijst: GedeeldDoc[] = [];

  for (const e of envelopes ?? []) {
    const c = countMap.get(e.id) ?? { totaal: 0, getekend: 0 };
    lijst.push({
      id: "env-" + e.id,
      bron: "document",
      titel: e.titel,
      beschrijving: e.beschrijving,
      status: e.status,
      datum: e.aangemaakt_op,
      detail_link: `/documenten/${e.id}`,
      ondertekenaars: `${c.getekend}/${c.totaal} getekend`,
    });
  }

  for (const d of dpas ?? []) {
    const tenant = Array.isArray(d.tenant) ? d.tenant[0] : d.tenant;
    lijst.push({
      id: "dpa-" + d.id,
      bron: "dpa",
      titel: `DPA — ${tenant?.naam ?? "Bureau"}`,
      beschrijving: `Verwerkersovereenkomst voor ${d.verzonden_aan_naam ?? d.verzonden_aan_email ?? "—"}`,
      status: d.status,
      datum: d.getekend_op ?? d.verzonden_op,
      detail_link: d.tenant_id ? `/bureaus/${d.tenant_id}` : "#",
      ondertekenaars: d.status === "getekend" ? "1/1 getekend" : "0/1 getekend",
    });
  }

  for (const a of akkoorden ?? []) {
    const p = Array.isArray(a.profiel) ? a.profiel[0] : a.profiel;
    const naam = p ? `${p.voornaam ?? ""} ${p.achternaam ?? ""}`.trim() : "—";
    const bron: GedeeldDoc["bron"] = a.type === "nda_setter" ? "nda" : "voorwaarden";
    const titelLabel = a.type === "nda_setter" ? "Geheimhouding (NDA)" : "Gebruiksvoorwaarden";
    lijst.push({
      id: "ag-" + a.id,
      bron,
      titel: `${titelLabel} — ${naam}`,
      beschrijving: p?.email ?? null,
      status: a.status,
      datum: a.getekend_op ?? a.verzonden_op,
      detail_link: a.user_id ? `/users` : "#",
      ondertekenaars: a.status === "getekend" ? "1/1 getekend" : "0/1 getekend",
    });
  }

  for (const c of contracten ?? []) {
    const status = c.status === "afgerond" ? "afgerond" : c.status === "geupload" ? "deels_getekend" : "verzonden";
    lijst.push({
      id: "ct-" + c.id,
      bron: "contract",
      titel: `Contract — ${c.kandidaat_naam}`,
      beschrijving: `Voor ${c.opdrachtgever_naam}`,
      status,
      datum: c.afgerond_op ?? c.geupload_op ?? c.verzonden_op,
      detail_link: "#",
      ondertekenaars: c.status === "afgerond" ? "Verwerkt" : "Wachtend",
    });
  }

  lijst.sort((a, b) => new Date(b.datum ?? 0).getTime() - new Date(a.datum ?? 0).getTime());

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="dashboard" />

      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <FileText size={28} className="text-[#333399]" />
              Documenten
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Alle ondertekenings-flows verzameld — eigen documenten, DPA&apos;s, NDA&apos;s, contracten ({lijst.length} totaal)
            </p>
          </div>
          <Link
            href="/documenten/nieuw"
            className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2.5 rounded-lg text-sm inline-flex items-center gap-2 shadow-sm"
          >
            Nieuw document
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {lijst.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold">Nog geen ondertekenings-flows</p>
              <p className="text-xs mt-1">DPA&apos;s, NDA&apos;s en jouw documenten verschijnen hier automatisch.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Document</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Voortgang</th>
                  <th className="text-left px-4 py-3 font-semibold">Datum</th>
                </tr>
              </thead>
              <tbody>
                {lijst.map((d) => {
                  const s = STATUS_MAP[d.status] ?? STATUS_MAP.verzonden;
                  const b = BRON_META[d.bron];
                  return (
                    <tr key={d.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-full ${b.kleur}`}>
                          {b.icoon} {b.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={d.detail_link} className="block">
                          <div className="font-semibold text-gray-800">{d.titel}</div>
                          {d.beschrijving && (
                            <div className="text-xs text-gray-500 truncate max-w-md">{d.beschrijving}</div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-full ${s.kleur}`}>
                          {s.icoon} {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{d.ondertekenaars}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {d.datum ? new Date(d.datum).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
