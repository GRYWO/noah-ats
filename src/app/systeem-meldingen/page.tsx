import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { AlertTriangle, Sparkles, AlertOctagon, Megaphone } from "lucide-react";
import { plaatsSysteemMelding, deactiveerSysteemMelding } from "./actions";

export const metadata = { title: "Systeemmeldingen · Noah ATS" };

const TYPE_META: Record<string, { label: string; icon: typeof AlertTriangle; kleur: string }> = {
  let_op: { label: "Let op", icon: AlertTriangle, kleur: "bg-amber-100 text-amber-900 border-amber-300" },
  update: { label: "Update", icon: Sparkles, kleur: "bg-indigo-100 text-indigo-900 border-indigo-300" },
  storing: { label: "Storing", icon: AlertOctagon, kleur: "bg-red-100 text-red-900 border-red-300" },
};

export default async function SysteemMeldingenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: meldingen } = await admin
    .from("systeem_meldingen")
    .select("*")
    .order("aangemaakt_op", { ascending: false })
    .limit(20);

  const huidigeActief = meldingen?.find((m) => m.actief);

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar />
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
          <Megaphone size={28} className="text-red-600" />
          Systeem-meldingen
        </h1>
        <p className="text-gray-600 mb-8">
          Plaats een rode banner bovenaan elke pagina voor iedereen. Maximaal
          één melding actief tegelijk — een nieuwe plaatsen deactiveert
          automatisch de vorige.
        </p>

        {/* Huidige actieve melding */}
        {huidigeActief ? (
          <section className="bg-white rounded-2xl border-2 border-red-300 p-6 mb-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${TYPE_META[huidigeActief.type]?.kleur}`}>
                  {TYPE_META[huidigeActief.type]?.label ?? huidigeActief.type}
                </span>
                <span className="text-xs text-gray-500">
                  geplaatst {new Date(huidigeActief.aangemaakt_op).toLocaleString("nl-NL")}
                </span>
              </div>
              <form action={deactiveerSysteemMelding}>
                <input type="hidden" name="id" value={huidigeActief.id} />
                <button
                  type="submit"
                  className="text-xs font-semibold text-red-600 hover:text-red-700 underline"
                >
                  Deactiveren
                </button>
              </form>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{huidigeActief.titel}</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{huidigeActief.bericht}</p>
          </section>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8 text-sm text-emerald-900">
            ✅ Geen actieve melding. Iedereen ziet een schone interface.
          </div>
        )}

        {/* Nieuwe melding plaatsen */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Nieuwe melding plaatsen</h2>
          <form action={plaatsSysteemMelding} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(["let_op", "update", "storing"] as const).map((t) => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  return (
                    <label
                      key={t}
                      className={`cursor-pointer border-2 rounded-lg p-3 flex flex-col items-center gap-1 hover:bg-gray-50 transition has-[:checked]:border-red-500 has-[:checked]:bg-red-50`}
                    >
                      <input type="radio" name="type" value={t} defaultChecked={t === "let_op"} className="sr-only" />
                      <Icon size={20} className="text-gray-700" />
                      <span className="text-xs font-semibold">{meta.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Titel</label>
              <input
                name="titel"
                type="text"
                required
                placeholder="Korte titel"
                maxLength={80}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Bericht</label>
              <textarea
                name="bericht"
                required
                placeholder="Wat moet iedereen weten? Verschijnt in een popup als gebruikers op de banner klikken."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
            >
              Plaats melding voor iedereen
            </button>
          </form>
        </section>

        {/* Historie */}
        {meldingen && meldingen.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Historie</h2>
            <ul className="space-y-2">
              {meldingen.map((m) => (
                <li
                  key={m.id}
                  className={`bg-white border rounded-lg p-3 text-xs ${m.actief ? "border-red-300" : "border-gray-200"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold px-2 py-0.5 rounded ${TYPE_META[m.type]?.kleur}`}>
                      {TYPE_META[m.type]?.label}
                    </span>
                    <span className="font-semibold text-gray-900">{m.titel}</span>
                    {m.actief && <span className="text-red-600 font-bold">· ACTIEF</span>}
                  </div>
                  <p className="text-gray-600 text-xs">{m.bericht.slice(0, 120)}{m.bericht.length > 120 ? "…" : ""}</p>
                  <p className="text-gray-400 text-[10px] mt-1">
                    {new Date(m.aangemaakt_op).toLocaleString("nl-NL")}
                    {m.gedeactiveerd_op && ` · gestopt ${new Date(m.gedeactiveerd_op).toLocaleString("nl-NL")}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
