import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { ArrowLeft, FileCheck2, CheckCircle2, Clock, Upload, Download } from "lucide-react";
import { DownloadButton } from "./DownloadButton";

export const dynamic = "force-dynamic";

export default async function ContractDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: c } = await admin
    .from("contract_verzoeken")
    .select("*, tenant:tenants(naam)")
    .eq("id", id)
    .single();

  if (!c) redirect("/documenten");

  const t = Array.isArray(c.tenant) ? c.tenant[0] : c.tenant;
  const isAfgerond = c.status === "afgerond";

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="dashboard" />

      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/documenten" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Terug naar documenten
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileCheck2 size={22} className="text-[#333399]" />
                Contract-verificatie
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Voor <b>{c.kandidaat_naam}</b> bij {c.opdrachtgever_naam}
              </p>
            </div>
            <span className={`text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
              isAfgerond ? "bg-emerald-100 text-emerald-700" :
              c.status === "geupload" ? "bg-blue-100 text-blue-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {isAfgerond ? <CheckCircle2 size={12} /> :
               c.status === "geupload" ? <Upload size={12} /> :
               <Clock size={12} />}
              {c.status === "verzonden" ? "Wacht op upload" :
               c.status === "geupload" ? "Wordt verwerkt" :
               c.status === "afgerond" ? "Afgerond" : c.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-gray-100">
            <Veld label="Kandidaat" waarde={c.kandidaat_naam} />
            <Veld label="Bureau" waarde={t?.naam ?? "—"} />
            <Veld label="Opdrachtgever" waarde={c.opdrachtgever_naam} />
            <Veld label="E-mail" waarde={c.opdrachtgever_email} />
            <Veld label="Opgegeven salaris" waarde={c.opgegeven_salaris ? `€ ${Number(c.opgegeven_salaris).toLocaleString("nl-NL")}` : "—"} />
            {c.contract_salaris != null && (
              <Veld label="Contract bruto/jaar" waarde={
                <span className="text-[#333399] font-bold">€ {Number(c.contract_salaris).toLocaleString("nl-NL")}</span>
              } />
            )}
            {c.contract_functie && <Veld label="Functie" waarde={c.contract_functie} />}
            {c.contract_werkgever && <Veld label="Werkgever" waarde={c.contract_werkgever} />}
            {c.contract_startdatum && (
              <Veld label="Startdatum" waarde={new Date(c.contract_startdatum).toLocaleDateString("nl-NL")} />
            )}
            {c.contract_duur && <Veld label="Contractduur" waarde={c.contract_duur} />}
            <Veld label="Aangevraagd op" waarde={c.verzonden_op ? new Date(c.verzonden_op).toLocaleString("nl-NL") : "—"} />
            {c.geupload_op && (
              <Veld label="Geupload op" waarde={new Date(c.geupload_op).toLocaleString("nl-NL")} />
            )}
            {c.afgerond_op && (
              <Veld label="Afgerond op" waarde={new Date(c.afgerond_op).toLocaleString("nl-NL")} />
            )}
          </div>

          {isAfgerond && c.samenvatting_pad && (
            <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <Download size={13} /> Samenvattings-PDF beschikbaar
                </span>
              </div>
              <DownloadButton verzoekId={c.id} />
            </div>
          )}

          {c.status === "verzonden" && c.token && (
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-600">Upload-link voor opdrachtgever:</span>
              <Link
                href={`/contract-controle/${c.token}`}
                target="_blank"
                className="text-xs font-semibold text-[#333399] hover:underline"
              >
                Open upload-pagina ↗
              </Link>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          ⚖ AVG-conform: origineel binnen 24u verwijderd, alleen geredacteerde versie + samenvatting bewaard.
        </p>
      </div>
    </main>
  );
}

function Veld({ label, waarde }: { label: string; waarde: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</div>
      <div className="text-sm text-gray-800 font-medium mt-0.5">{waarde}</div>
    </div>
  );
}
