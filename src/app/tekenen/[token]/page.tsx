import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { NoahRecruitmentLogo } from "@/components/NoahRecruitmentLogo";
import { TekenForm } from "./TekenForm";
import { CheckCircle2 } from "lucide-react";
import { NdaSetterTekst, SetterContractTekst, GebruiksvoorwaardenTekst } from "./DocumentTeksten";

export default async function TekenAkkoordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("user_agreements")
    .select("*")
    .eq("token", token)
    .single();

  if (!row) notFound();

  const isGetekend = row.status === "getekend";
  const isIngetrokken = row.status === "ingetrokken";
  const isSetter = row.type === "nda_setter";
  const isContract = row.type === "setter_contract";
  const naam = `${row.user_voornaam ?? ""} ${row.user_achternaam ?? ""}`.trim();
  const bureau = row.bureau_naam || "—";

  return (
    <main className="min-h-screen bg-[#f4f4f7] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Banner */}
        <div className="bg-[#333399] rounded-2xl p-5 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex items-center gap-3">
            <NoahRecruitmentLogo variant="dark" size="md" label="ATS" />
            <span className="text-white/70 text-xs">
              {isSetter ? "Geheimhoudingsverklaring (NDA)" :
               isContract ? "Samenwerkingsovereenkomst — Setter" :
               "Gebruiksvoorwaarden Noah ATS"}
            </span>
          </div>
          <StatusBadge status={row.status} />
        </div>

        {isIngetrokken && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-4 text-sm">
            <b>Deze uitnodiging is ingetrokken.</b> Neem contact op met je beheerder voor een nieuwe.
          </div>
        )}
        {isGetekend && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 mb-4 flex items-start gap-3">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600" />
            <div className="text-sm">
              <b>Getekend op {new Date(row.getekend_op!).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })}</b><br />
              door <b>{row.getekend_door_naam}</b>
            </div>
          </div>
        )}

        {/* Document */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-4">
          {isSetter ? (
            <NdaSetterTekst naam={naam} bureau={bureau} datum={new Date(row.verzonden_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })} />
          ) : isContract ? (
            <SetterContractTekst naam={naam} datum={new Date(row.verzonden_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })} />
          ) : (
            <GebruiksvoorwaardenTekst naam={naam} rol={row.user_rol || "user"} bureau={bureau} datum={new Date(row.verzonden_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })} />
          )}
        </div>

        {/* Onderteken */}
        {!isGetekend && !isIngetrokken && (
          <div className="bg-gradient-to-br from-[#eef0ff] to-[#f4f4f7] border-2 border-dashed border-[#333399] rounded-2xl p-6">
            <h2 className="text-xl font-bold text-[#333399] inline-flex items-center gap-2 mb-2">✍️ Onderteken hier</h2>
            <p className="text-sm text-gray-600 mb-4">
              Typ je naam of teken met de muis/touchpad. Beide zijn rechtsgeldig.
            </p>
            <TekenForm token={token} defaultNaam={naam} />
          </div>
        )}

        {isGetekend && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-600">
            <h2 className="text-base font-bold text-gray-800 mb-3">Audit-trail</h2>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-1.5 text-gray-500 w-1/3">Tijdstip</td><td className="py-1.5 font-mono">{new Date(row.getekend_op!).toLocaleString("nl-NL")}</td></tr>
                <tr><td className="py-1.5 text-gray-500">IP-adres</td><td className="py-1.5 font-mono">{row.ip_adres ?? "—"}</td></tr>
                <tr><td className="py-1.5 text-gray-500">Browser</td><td className="py-1.5 font-mono text-[11px]">{row.user_agent?.slice(0, 80) ?? "—"}</td></tr>
                <tr><td className="py-1.5 text-gray-500">Type</td><td className="py-1.5">{row.handtekening_type === "drawn" ? "Handgetekend" : "Getypt"}</td></tr>
              </tbody>
            </table>
            {row.handtekening_type === "drawn" && row.handtekening_data?.startsWith("data:image") && (
              <div className="mt-4">
                <div className="text-xs font-bold text-gray-600 mb-1">Handtekening:</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.handtekening_data} alt="Handtekening" className="bg-white border border-gray-200 rounded p-2 max-w-xs" />
              </div>
            )}
            {row.handtekening_type === "typed" && (
              <div className="mt-4">
                <div className="text-xs font-bold text-gray-600 mb-1">Handtekening:</div>
                <div className="bg-white border border-gray-200 rounded p-3 text-2xl text-gray-900" style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive" }}>
                  {row.handtekening_data}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center py-5 text-xs text-gray-500">
          Vragen? Mail <a href="mailto:info@noah-recruitment.nl" className="text-[#333399] font-semibold">info@noah-recruitment.nl</a> of bel 085-4016082
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "getekend") return (
    <div className="text-white/85 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2 bg-emerald-500/30 px-3 py-1 rounded-full">
      <span className="w-2 h-2 bg-emerald-300 rounded-full"></span> Getekend
    </div>
  );
  if (status === "ingetrokken") return (
    <div className="text-white/85 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2">
      <span className="w-2 h-2 bg-red-400 rounded-full"></span> Ingetrokken
    </div>
  );
  return (
    <div className="text-white/85 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2">
      <span className="w-2 h-2 bg-[#ffd84d] rounded-full"></span> Wachten op handtekening
    </div>
  );
}
