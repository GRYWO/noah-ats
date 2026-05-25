import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { updateBureau } from "./actions";
import { DeleteBureauButton } from "./DeleteBureauButton";

export default async function BureauDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: b } = await admin
    .from("tenants")
    .select("*")
    .eq("id", id)
    .single();

  if (!b) notFound();

  const { count: userCount } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", id);

  const { count: kandidaatCount } = await admin
    .from("kandidaten")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", id);

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="bureaus" />

      <div className="p-8 max-w-5xl mx-auto">
        <Link href="/bureaus" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block">
          ← Terug naar bureaus
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{b.naam}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {userCount ?? 0} users · {kandidaatCount ?? 0} kandidaten
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
            b.status === "actief" ? "bg-emerald-100 text-emerald-800" :
            b.status === "setup" ? "bg-amber-100 text-amber-800" :
            "bg-gray-100 text-gray-600"
          }`}>
            {b.status}
          </span>
        </div>

        {ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            Opgeslagen.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <form action={updateBureau} className="space-y-6">
          <input type="hidden" name="id" value={b.id} />

          {/* Bedrijfsgegevens */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Bedrijfsgegevens</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Statutaire bedrijfsnaam *</label>
                <input name="naam" required defaultValue={b.naam ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Handelsnaam</label>
                <input name="handelsnaam" defaultValue={b.handelsnaam ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">KvK-nummer *</label>
                <input name="kvk" required defaultValue={b.kvk ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rechtsvorm</label>
                <select name="rechtsvorm" defaultValue={b.rechtsvorm ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="">—</option>
                  <option value="BV">BV</option><option value="VOF">VOF</option>
                  <option value="Eenmanszaak">Eenmanszaak</option><option value="NV">NV</option>
                  <option value="Stichting">Stichting</option><option value="Anders">Anders</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">BTW-nummer</label>
                <input name="btw_nummer" defaultValue={b.btw_nummer ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">BTW-ID (ZZP)</label>
                <input name="btw_id" defaultValue={b.btw_id ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Vestigingsadres</label>
                <input name="vestigingsadres" defaultValue={b.vestigingsadres ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Factuuradres</label>
                <input name="factuuradres" defaultValue={b.factuuradres ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Land</label>
                <select name="land" defaultValue={b.land ?? "Nederland"} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option>Nederland</option><option>België</option><option>Duitsland</option><option>Anders</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon bedrijf</label>
                <input name="telefoon" defaultValue={b.telefoon ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Algemeen mailadres</label>
                <input name="algemeen_email" type="email" defaultValue={b.algemeen_email ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
            </div>
          </div>

          {/* Financieel */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Financieel</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">IBAN</label>
                <input name="iban" defaultValue={b.iban ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">BIC</label>
                <input name="bic" defaultValue={b.bic ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tenaamstelling rekening</label>
                <input name="tenaamstelling" defaultValue={b.tenaamstelling ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Betaling</label>
                <select
                  name="setup_fee_paid"
                  defaultValue={b.setup_fee_paid ? "true" : "false"}
                  className={`w-full px-3 py-2 border rounded-md text-sm font-semibold ${
                    b.setup_fee_paid
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-red-300 bg-red-50 text-red-800"
                  }`}
                >
                  <option value="true">Betaald</option>
                  <option value="false">Niet betaald</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Finance mailadres</label>
                <input name="finance_email" type="email" defaultValue={b.finance_email ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
            </div>
          </div>

          {/* Contactpersoon */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Contactpersoon</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Naam</label>
                <input name="contact_naam" defaultValue={b.contact_naam ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Functie</label>
                <input name="contact_functie" defaultValue={b.contact_functie ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon</label>
                <input name="contact_tel" defaultValue={b.contact_tel ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
                <input name="contact_email" type="email" defaultValue={b.contact_email ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
            </div>

            <h3 className="font-bold text-gray-800 mt-5 mb-3 pb-2 border-b">UBO (anti-witwas)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Naam UBO</label>
                <input name="ubo_naam" defaultValue={b.ubo_naam ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Geboortedatum UBO</label>
                <input name="ubo_geboortedatum" type="date" defaultValue={b.ubo_geboortedatum ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Status</h2>
            <select name="status" defaultValue={b.status ?? "setup"} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="setup">setup (nog niet live)</option>
              <option value="actief">actief</option>
              <option value="inactief">inactief / opgezegd</option>
            </select>
          </div>

          <div>
            <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-8 py-2 rounded-md text-sm">
              Opslaan
            </button>
          </div>
        </form>

        <div className="mt-6 flex justify-end">
          <DeleteBureauButton id={b.id} naam={b.naam} />
        </div>

        <div className="mt-6 text-xs text-gray-400 text-center">
          Aangemaakt: {new Date(b.created_at).toLocaleString("nl-NL")}
        </div>
      </div>
    </main>
  );
}
