import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { ArrowLeft, FileSignature, CheckCircle2, Clock, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AkkoordDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: a } = await admin
    .from("user_agreements")
    .select(`
      *,
      profiel:profiles(voornaam, achternaam, email, tenant_id),
      tenant:tenants(naam)
    `)
    .eq("id", id)
    .single();

  if (!a) redirect("/documenten");

  const p = Array.isArray(a.profiel) ? a.profiel[0] : a.profiel;
  const t = Array.isArray(a.tenant) ? a.tenant[0] : a.tenant;
  const naam = p ? `${p.voornaam ?? ""} ${p.achternaam ?? ""}`.trim() : "—";
  const typeLabel = a.type === "nda_setter" ? "Geheimhoudingsverklaring (NDA)" : "Gebruiksvoorwaarden";
  const isGetekend = a.status === "getekend";

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
                <FileSignature size={22} className="text-[#333399]" />
                {typeLabel}
              </h1>
              <p className="text-sm text-gray-500 mt-1">Ondertekend door {naam}</p>
            </div>
            <span className={`text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
              isGetekend ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>
              {isGetekend ? <CheckCircle2 size={12} /> : <Clock size={12} />}
              {isGetekend ? "Getekend" : "Wacht op handtekening"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-gray-100">
            <Veld label="Naam" waarde={naam} />
            <Veld label="E-mail" waarde={p?.email ?? "—"} />
            <Veld label="Bureau" waarde={t?.naam ?? "—"} />
            <Veld label="Type document" waarde={typeLabel} />
            <Veld label="Status" waarde={a.status} />
            <Veld label="Verzonden op" waarde={a.verzonden_op ? new Date(a.verzonden_op).toLocaleString("nl-NL") : "—"} />
            {a.getekend_op && (
              <Veld label="Getekend op" waarde={new Date(a.getekend_op).toLocaleString("nl-NL")} />
            )}
            {a.token && (
              <Veld label="Token" waarde={
                <code className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded">{a.token.slice(0, 20)}…</code>
              } />
            )}
          </div>

          {a.token && !isGetekend && (
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-600">Teken-link voor de gebruiker:</span>
              <Link
                href={`/tekenen/${a.token}`}
                target="_blank"
                className="text-xs font-semibold text-[#333399] hover:underline inline-flex items-center gap-1"
              >
                <Mail size={11} /> Open teken-pagina
              </Link>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          ⚖ Deze ondertekening is rechtsgeldig (eIDAS SES). Audit-info met IP + tijdstip is opgeslagen.
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
