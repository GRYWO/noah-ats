import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { nieuwBureau } from "./actions";
import { BetaaldSelect } from "./BetaaldSelect";
import { ResetWachtwoordKnop } from "@/app/setters/ResetWachtwoordKnop";

export default async function BureausPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isSuperAdminEmail(user?.email)) {
    redirect("/dashboard");
  }

  // Super admin: gebruik admin client om alle tenants te zien (RLS bypass)
  const admin = createAdminClient();
  const { data: bureaus } = await admin
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  // Per bureau de hoofd-admin (oudste admin van die tenant) ophalen voor reset-knop
  const tenantIds = (bureaus ?? []).map(b => b.id);
  const { data: admins } = tenantIds.length > 0
    ? await admin
        .from("profiles")
        .select("id, tenant_id, voornaam, achternaam, created_at, rol")
        .in("tenant_id", tenantIds)
        .eq("rol", "admin")
        .order("created_at", { ascending: true })
    : { data: [] };
  const hoofdAdminPerTenant = new Map<string, { id: string; naam: string }>();
  for (const a of admins ?? []) {
    if (!hoofdAdminPerTenant.has(a.tenant_id)) {
      hoofdAdminPerTenant.set(a.tenant_id, {
        id: a.id,
        naam: `${a.voornaam ?? ""} ${a.achternaam ?? ""}`.trim() || "Admin",
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="bureaus" />

      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Bureaus</h1>
          <p className="text-gray-500 text-sm mt-1">{bureaus?.length ?? 0} bureaus die Noah gebruiken</p>
        </div>

        {ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            Bureau toegevoegd.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Wizard form */}
        <details className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          <summary className="cursor-pointer p-4 bg-[#333399] text-white font-semibold">
            Nieuw bureau toevoegen
          </summary>

          <form action={nieuwBureau} className="p-6 space-y-6">

            {/* Stap 1: Bedrijfsgegevens */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3 pb-2 border-b">Stap 1 — Bedrijfsgegevens</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Statutaire bedrijfsnaam *</label>
                  <input name="naam" required placeholder="BureauX B.V." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Handelsnaam</label>
                  <input name="handelsnaam" placeholder="BureauX Recruitment" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">KvK-nummer *</label>
                  <input name="kvk" required placeholder="12345678" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Rechtsvorm</label>
                  <select name="rechtsvorm" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="">—</option>
                    <option value="BV">BV (Besloten vennootschap)</option>
                    <option value="VOF">VOF</option>
                    <option value="Eenmanszaak">Eenmanszaak</option>
                    <option value="NV">NV</option>
                    <option value="Stichting">Stichting</option>
                    <option value="Anders">Anders</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">BTW-nummer</label>
                  <input name="btw_nummer" placeholder="NL001234567B01" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">BTW-ID (ZZP)</label>
                  <input name="btw_id" placeholder="NL001234567B01" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Vestigingsadres</label>
                  <input name="vestigingsadres" placeholder="Hoofdstraat 1, 1234 AB Amsterdam" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Factuuradres (als anders)</label>
                  <input name="factuuradres" placeholder="Postbus 100, 1234 AB Amsterdam" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Land</label>
                  <select name="land" defaultValue="Nederland" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option>Nederland</option><option>België</option><option>Duitsland</option><option>Anders</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon bedrijf</label>
                  <input name="telefoon" placeholder="+31 20 1234567" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Algemeen mailadres</label>
                  <input name="algemeen_email" type="email" placeholder="info@bureaux.nl" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
            </div>

            {/* Stap 2: Financieel */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3 pb-2 border-b">Stap 2 — Financieel</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">IBAN</label>
                  <input name="iban" placeholder="NL12 INGB 0000 0000 00" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">BIC</label>
                  <input name="bic" placeholder="INGBNL2A" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tenaamstelling rekening</label>
                  <input name="tenaamstelling" placeholder="BureauX B.V." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Betaling</label>
                  <BetaaldSelect defaultBetaald={false} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Mail finance (voor marge-overzicht)</label>
                  <input name="finance_email" type="email" placeholder="finance@bureaux.nl" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
            </div>

            {/* Stap 3: Contactpersonen */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3 pb-2 border-b">Stap 3 — Contactpersoon</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Naam</label>
                  <input name="contact_naam" placeholder="Jan van der Berg" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Functie</label>
                  <input name="contact_functie" placeholder="Directeur" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon</label>
                  <input name="contact_tel" placeholder="+31 6 12345678" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
                  <input name="contact_email" type="email" placeholder="jan@bureaux.nl" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>

              <h3 className="font-bold text-gray-800 mb-3 mt-4 pb-2 border-b">UBO (anti-witwas)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Naam UBO</label>
                  <input name="ubo_naam" placeholder="Jan van der Berg" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Geboortedatum UBO</label>
                  <input name="ubo_geboortedatum" type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 text-sm text-amber-900">
              <b>Stap 4 (documenten):</b> upload van KvK-uittreksel, contract, ID-UBO — toevoegen in volgende update.
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-2 rounded-md text-sm">
                Bureau activeren
              </button>
            </div>
          </form>
        </details>

        {/* Lijst */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {bureaus && bureaus.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Bedrijf</th>
                  <th className="text-left px-4 py-3 font-semibold">KvK</th>
                  <th className="text-left px-4 py-3 font-semibold">BTW</th>
                  <th className="text-left px-4 py-3 font-semibold">IBAN</th>
                  <th className="text-left px-4 py-3 font-semibold">Betaling</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Acties</th>
                </tr>
              </thead>
              <tbody>
                {bureaus.map(b => (
                  <tr key={b.id} className="border-t hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 font-semibold text-gray-800"><Link href={`/bureaus/${b.id}`} className="block">{b.naam}</Link></td>
                    <td className="px-4 py-3 text-sm text-gray-600"><Link href={`/bureaus/${b.id}`} className="block">{b.kvk ?? "—"}</Link></td>
                    <td className="px-4 py-3 text-sm text-gray-600"><Link href={`/bureaus/${b.id}`} className="block">{b.btw_nummer ?? "—"}</Link></td>
                    <td className="px-4 py-3 text-sm text-gray-600"><Link href={`/bureaus/${b.id}`} className="block">{b.iban ?? "—"}</Link></td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/bureaus/${b.id}`} className="block">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          b.setup_fee_paid
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {b.setup_fee_paid ? "Betaald" : "Niet betaald"}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/bureaus/${b.id}`} className="block">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          b.status === "actief" ? "bg-emerald-100 text-emerald-800" :
                          b.status === "setup" ? "bg-amber-100 text-amber-800" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {b.status}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const hoofdAdmin = hoofdAdminPerTenant.get(b.id);
                        return hoofdAdmin
                          ? <ResetWachtwoordKnop userId={hoofdAdmin.id} naam={hoofdAdmin.naam} />
                          : <span className="text-xs text-gray-400">Geen admin</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <p className="text-sm">Nog geen bureaus.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
