import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { isSalesAdmin } from "@/utils/sales-admin";
import { TopBar } from "@/components/TopBar";
import { nieuweSetter } from "@/app/users/actions";
import { SubmitKnop } from "@/app/vacature-aanmaken/SubmitKnop";

export const metadata = { title: "Setters" };

type Setter = { id: string; voornaam: string | null; achternaam: string | null; mail_adres: string | null };
type Akkoord = { user_id: string; type: string; status: string; getekend_op: string | null; getekend_door_naam: string | null };

function naam(s: Setter): string {
  return [s.voornaam, s.achternaam].filter(Boolean).join(" ").trim() || "—";
}

function StatusPil({ status }: { status: string | undefined }) {
  if (status === "getekend") return <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Getekend</span>;
  if (status === "ingetrokken") return <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Ingetrokken</span>;
  if (status === "wachtend") return <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Wacht op tekenen</span>;
  return <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">Niet verstuurd</span>;
}

export default async function SettersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mag = isSuperAdminEmail(user.email) || (await isSalesAdmin(user));
  if (!mag) redirect("/vacature-aanmaken");

  const { data: myProfile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
  const tenantId = (myProfile as { tenant_id?: string } | null)?.tenant_id ?? null;

  const admin = createAdminClient();
  const { data: settersRaw } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, mail_adres")
    .eq("rol", "setter")
    .eq("tenant_id", tenantId)
    .order("voornaam", { ascending: true });
  const setters = (settersRaw ?? []) as Setter[];

  // Teken-status per setter ophalen.
  const akkoordPer = new Map<string, { nda?: Akkoord; contract?: Akkoord }>();
  if (setters.length) {
    const ids = setters.map((s) => s.id);
    const { data: akk } = await admin
      .from("user_agreements")
      .select("user_id, type, status, getekend_op, getekend_door_naam")
      .in("user_id", ids);
    for (const a of (akk ?? []) as Akkoord[]) {
      const huidig = akkoordPer.get(a.user_id) ?? {};
      if (a.type === "nda_setter") huidig.nda = a;
      if (a.type === "setter_contract") huidig.contract = a;
      akkoordPer.set(a.user_id, huidig);
    }
  }

  const aantalSetters = setters.length;
  const aantalVolledigGetekend = setters.filter((s) => {
    const a = akkoordPer.get(s.id);
    return a?.nda?.status === "getekend" && a?.contract?.status === "getekend";
  }).length;

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="setters" />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="gold-hr mb-6 rounded-full" />
        <span className="gold-chip inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
          Noah<span className="text-gold">.</span>&nbsp;setters
        </span>
        <h1 className="mt-3 text-3xl font-bold text-gray-800">Setters &amp; contracten</h1>
        <p className="mt-1 text-sm text-gray-500">Nodig een nieuwe setter uit — die krijgt automatisch een Noah-account, een @noah-recruitment.nl-mailbox en het contract om te tekenen.</p>

        {ok && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Uitnodiging verstuurd — de setter heeft de NDA én de samenwerkingsovereenkomst per mail ontvangen.</div>}
        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{decodeURIComponent(error)}</div>}

        {/* Tellers */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="gold-frame rounded-xl bg-white p-4">
            <div className="text-3xl font-bold text-goldgrad">{aantalSetters}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Setters totaal</div>
          </div>
          <div className="gold-frame rounded-xl bg-white p-4">
            <div className="text-3xl font-bold text-goldgrad">{aantalVolledigGetekend}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Volledig getekend</div>
          </div>
          <div className="gold-frame rounded-xl bg-white p-4">
            <div className="text-3xl font-bold text-goldgrad">{aantalSetters - aantalVolledigGetekend}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nog niet compleet</div>
          </div>
        </div>

        {/* Uitnodig-formulier */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold text-gray-800">Nieuwe setter uitnodigen</h2>
          <form action={nieuweSetter} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="rol" value="setter" />
            <input type="hidden" name="next" value="/setters" />
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Voornaam</label>
              <input name="voornaam" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Voornaam" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Achternaam</label>
              <input name="achternaam" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Achternaam" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">E-mailadres (privé — hier komt de uitnodiging)</label>
              <input name="email" type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="naam@voorbeeld.nl" />
            </div>
            <div className="sm:col-span-2">
              <SubmitKnop bezigTekst="Versturen…" className="btn-gold px-5 py-2.5 text-sm">
                Contract versturen
              </SubmitKnop>
            </div>
          </form>
        </div>

        {/* Overzicht setters */}
        <h2 className="mb-3 mt-8 text-lg font-bold text-gray-800">Alle setters</h2>
        {setters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">Nog geen setters. Nodig hierboven je eerste setter uit.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Naam</th>
                  <th className="px-4 py-3 text-left">Mailbox</th>
                  <th className="px-4 py-3 text-left">NDA</th>
                  <th className="px-4 py-3 text-left">Overeenkomst</th>
                  <th className="px-4 py-3 text-left">Getekend op</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {setters.map((s) => {
                  const a = akkoordPer.get(s.id);
                  const getekendOp = a?.contract?.getekend_op || a?.nda?.getekend_op;
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-semibold text-gray-800">{naam(s)}</td>
                      <td className="px-4 py-3 text-gray-500">{s.mail_adres ?? "—"}</td>
                      <td className="px-4 py-3"><StatusPil status={a?.nda?.status} /></td>
                      <td className="px-4 py-3"><StatusPil status={a?.contract?.status} /></td>
                      <td className="px-4 py-3 text-gray-500">
                        {getekendOp ? new Date(getekendOp).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
