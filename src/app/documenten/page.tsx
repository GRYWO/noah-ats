import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { FileText, Plus, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; kleur: string; icoon: React.ReactNode }> = {
  verzonden:       { label: "Verzonden",       kleur: "bg-blue-100 text-blue-700",       icoon: <Clock size={12} /> },
  deels_getekend:  { label: "Deels getekend",  kleur: "bg-amber-100 text-amber-700",     icoon: <AlertCircle size={12} /> },
  voltooid:        { label: "Voltooid",        kleur: "bg-emerald-100 text-emerald-700", icoon: <CheckCircle2 size={12} /> },
  vervallen:       { label: "Vervallen",       kleur: "bg-gray-100 text-gray-700",       icoon: <XCircle size={12} /> },
  ingetrokken:     { label: "Ingetrokken",     kleur: "bg-gray-100 text-gray-700",       icoon: <XCircle size={12} /> },
};

export default async function DocumentenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: envelopes } = await admin
    .from("document_envelopes")
    .select("id, titel, beschrijving, status, aangemaakt_op, voltooid_op, vervalt_op")
    .order("aangemaakt_op", { ascending: false });

  // Aantal ondertekenaars per envelope + getekend-count
  const envIds = (envelopes ?? []).map(e => e.id);
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
              Upload + verstuur documenten ter rechtsgeldige ondertekening (eIDAS SES)
            </p>
          </div>
          <Link
            href="/documenten/nieuw"
            className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2.5 rounded-lg text-sm inline-flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            Nieuw document
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {(envelopes ?? []).length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold">Nog geen documenten</p>
              <p className="text-xs mt-1">Klik &quot;Nieuw document&quot; om je eerste te versturen.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Document</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Ondertekenaars</th>
                  <th className="text-left px-4 py-3 font-semibold">Verzonden</th>
                </tr>
              </thead>
              <tbody>
                {(envelopes ?? []).map((e) => {
                  const c = countMap.get(e.id) ?? { totaal: 0, getekend: 0 };
                  const s = STATUS_MAP[e.status] ?? STATUS_MAP.verzonden;
                  return (
                    <tr key={e.id} className="border-t hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3">
                        <Link href={`/documenten/${e.id}`} className="block">
                          <div className="font-semibold text-gray-800">{e.titel}</div>
                          {e.beschrijving && (
                            <div className="text-xs text-gray-500 truncate max-w-md">{e.beschrijving}</div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-full ${s.kleur}`}>
                          {s.icoon}
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <b className="text-emerald-600">{c.getekend}</b> / {c.totaal} getekend
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(e.aangemaakt_op).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
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
