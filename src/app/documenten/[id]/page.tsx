import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { ArrowLeft, FileText, CheckCircle2, Clock, Download } from "lucide-react";
import { ReminderKnop, TrekInKnop, DownloadKnoppen } from "./Acties";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const { ok } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: env } = await admin
    .from("document_envelopes")
    .select("*")
    .eq("id", id)
    .single();
  if (!env) redirect("/documenten");

  const { data: onds } = await admin
    .from("document_ondertekenaars")
    .select("*")
    .eq("envelope_id", id)
    .order("volgorde", { ascending: true });

  const aantal = (onds ?? []).length;
  const getekend = (onds ?? []).filter(o => o.status === "getekend").length;
  const isVoltooid = env.status === "voltooid";

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="dashboard" />

      <div className="p-8 max-w-4xl mx-auto">
        <Link href="/documenten" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Terug
        </Link>

        {ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            {ok}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileText size={22} className="text-[#333399]" />
                {env.titel}
              </h1>
              {env.beschrijving && (
                <p className="text-sm text-gray-500 mt-1">{env.beschrijving}</p>
              )}
              <div className="text-xs text-gray-400 mt-2">
                Verzonden op {new Date(env.aangemaakt_op).toLocaleString("nl-NL")} ·{" "}
                Vervalt op {new Date(env.vervalt_op).toLocaleDateString("nl-NL")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#333399]">
                {getekend}<span className="text-base text-gray-400">/{aantal}</span>
              </div>
              <div className="text-xs text-gray-500 uppercase font-semibold">getekend</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <DownloadKnoppen envelopeId={env.id} hasVoltooid={!!env.voltooid_pdf_pad} />
            {!isVoltooid && env.status !== "ingetrokken" && (
              <>
                <ReminderKnop envelopeId={env.id} />
                <TrekInKnop envelopeId={env.id} />
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-bold text-gray-800">Ondertekenaars</h2>
          </div>
          <div className="divide-y">
            {(onds ?? []).map((o) => (
              <div key={o.id} className="px-6 py-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800">{o.voornaam} {o.achternaam}</div>
                  <div className="text-xs text-gray-500">{o.email}</div>
                  {o.getekend_op && (
                    <div className="text-xs text-gray-400 mt-1">
                      Getekend op {new Date(o.getekend_op).toLocaleString("nl-NL")} ·
                      IP {o.ip_adres ?? "—"}
                    </div>
                  )}
                  {o.aantal_reminders > 0 && (
                    <div className="text-[11px] text-amber-700 mt-0.5">
                      {o.aantal_reminders} reminder{o.aantal_reminders === 1 ? "" : "s"} verzonden
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {o.status === "getekend" ? (
                    <span className="text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                      <CheckCircle2 size={12} /> Getekend
                    </span>
                  ) : (
                    <span className="text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">
                      <Clock size={12} /> Wachtend
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          ⚖ Dit is een eIDAS Simple Electronic Signature (SES) — rechtsgeldig.
          Het uiteindelijke document bevat een audit-pagina met alle ondertekeningen.
        </p>
      </div>
    </main>
  );
}
