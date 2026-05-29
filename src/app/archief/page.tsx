import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { Archive, FileCheck2, Calendar, Search } from "lucide-react";
import { DownloadKnop } from "./DownloadKnop";
import { ToevoegenKnop } from "./ToevoegenKnop";

export const dynamic = "force-dynamic";

const MAANDEN = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];

export default async function ArchiefPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) redirect("/dashboard");

  const admin = createAdminClient();

  let query = admin
    .from("document_envelopes")
    .select("id, titel, beschrijving, voltooid_op, voltooid_pdf_pad, aangemaakt_op")
    .eq("status", "voltooid")
    .not("voltooid_pdf_pad", "is", null)
    .order("voltooid_op", { ascending: false });

  if (q) query = query.ilike("titel", `%${q}%`);

  const { data: docs } = await query;

  // Aantal ondertekenaars per envelope
  const envIds = (docs ?? []).map((d) => d.id);
  const { data: onds } = await admin
    .from("document_ondertekenaars")
    .select("envelope_id, voornaam, achternaam, email, getekend_op")
    .in("envelope_id", envIds.length > 0 ? envIds : ["00000000-0000-0000-0000-000000000000"])
    .order("volgorde", { ascending: true });

  const ondertekenaarsMap = new Map<string, Array<{ voornaam: string; achternaam: string; email: string; getekend_op: string | null }>>();
  for (const o of onds ?? []) {
    const lijst = ondertekenaarsMap.get(o.envelope_id) ?? [];
    lijst.push({
      voornaam: o.voornaam,
      achternaam: o.achternaam,
      email: o.email,
      getekend_op: o.getekend_op,
    });
    ondertekenaarsMap.set(o.envelope_id, lijst);
  }

  // Groeperen per jaar-maand
  type Groep = {
    label: string;
    items: typeof docs;
  };
  const groepen = new Map<string, Groep>();
  for (const d of docs ?? []) {
    const dt = new Date(d.voltooid_op ?? d.aangemaakt_op);
    const key = `${dt.getFullYear()}-${String(dt.getMonth()).padStart(2, "0")}`;
    const label = `${MAANDEN[dt.getMonth()]} ${dt.getFullYear()}`;
    const g = groepen.get(key) ?? { label, items: [] };
    g.items!.push(d);
    groepen.set(key, g);
  }
  const groepenLijst = Array.from(groepen.values());

  const totaal = docs?.length ?? 0;

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="dashboard" />

      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Archive size={28} className="text-[#333399]" />
              Archief
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {totaal} ondertekende document{totaal === 1 ? "" : "en"} — automatisch gerangschikt per maand
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/documenten"
              className="text-sm text-[#333399] hover:underline"
            >
              ← Documenten
            </Link>
            <ToevoegenKnop />
          </div>
        </div>

        {/* Search */}
        <form className="mb-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Zoek op titel..."
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#333399]"
            />
          </div>
        </form>

        {totaal === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            <Archive size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold">
              {q ? `Geen documenten gevonden voor "${q}"` : "Nog geen ondertekende documenten"}
            </p>
            <p className="text-xs mt-1">
              {q ? "Probeer een andere zoekterm." : "Documenten verschijnen hier automatisch zodra ze volledig ondertekend zijn."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groepenLijst.map((g) => (
              <section key={g.label} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <Calendar size={14} className="text-[#333399]" />
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{g.label}</h2>
                  <span className="text-xs text-gray-500 ml-auto">{g.items!.length} document{g.items!.length === 1 ? "" : "en"}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {g.items!.map((d) => {
                    const onds = ondertekenaarsMap.get(d.id) ?? [];
                    return (
                      <div key={d.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileCheck2 size={16} className="text-emerald-600 flex-shrink-0" />
                              <h3 className="font-bold text-gray-800 truncate">{d.titel}</h3>
                            </div>
                            {d.beschrijving && (
                              <p className="text-xs text-gray-500 mb-2 truncate">{d.beschrijving}</p>
                            )}
                            <div className="text-xs text-gray-500">
                              Getekend op{" "}
                              <b className="text-gray-700">
                                {d.voltooid_op
                                  ? new Date(d.voltooid_op).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short" })
                                  : "—"}
                              </b>
                            </div>
                            {onds.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {onds.map((o, i) => (
                                  <span
                                    key={i}
                                    className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full"
                                    title={o.email}
                                  >
                                    ✓ {o.voornaam} {o.achternaam}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <DownloadKnop envelopeId={d.id} />
                            <Link
                              href={`/documenten/${d.id}`}
                              className="text-xs text-[#333399] hover:underline text-center"
                            >
                              Details →
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
