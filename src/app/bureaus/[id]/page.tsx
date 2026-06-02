import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { isSalesAdmin } from "@/utils/sales-admin";
import { HuisstijlSectie } from "./HuisstijlSectie";
import { AbonnementSectie } from "./AbonnementSectie";
import { stripeBeschikbaar } from "@/utils/stripe";
import { getPlans, getSetupFeeCent } from "@/utils/plans";
import { TopBar } from "@/components/TopBar";
import { updateBureau } from "./actions";
import { stuurDpaUit, trekDpaIn } from "./dpa-actions";
import { DeleteBureauButton } from "./DeleteBureauButton";
import { ShieldCheck, Send, RefreshCw, X, FileSignature, TrendingUp } from "lucide-react";

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
  if (!(await isSalesAdmin(user))) redirect("/dashboard");
  const echtSuperAdmin = isSuperAdminEmail(user?.email);

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

  // Laatste DPA-uitnodiging (voor status-blok)
  const { data: dpa } = await admin
    .from("dpa_signatures")
    .select("*")
    .eq("tenant_id", id)
    .order("verzonden_op", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="bureaus" />

      <div className="p-8 max-w-5xl mx-auto">
        <Link href="/bureaus" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block">
          ← Terug naar bureaus
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{b.naam}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {userCount ?? 0} users · {kandidaatCount ?? 0} kandidaten
            </p>
          </div>
          <div className="inline-flex items-center gap-3">
            <Link
              href={`/bureaus/${id}/dpa`}
              target="_blank"
              className="text-sm bg-white border border-[#333399] text-[#333399] hover:bg-[#333399]/5 font-semibold px-4 py-2 rounded-md inline-flex items-center gap-1.5"
            >
              📄 DPA genereren
            </Link>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              b.status === "actief" ? "bg-emerald-100 text-emerald-800" :
              b.status === "setup" ? "bg-amber-100 text-amber-800" :
              "bg-gray-100 text-gray-600"
            }`}>
              {b.status}
            </span>
          </div>
        </div>

        {ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            {ok === "dpa_verzonden" ? "Verzoek tot ondertekening verstuurd naar de contactpersoon." : "Opgeslagen."}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Abonnement (super-admin only) */}
        {await renderAbonnementSectie(b, id)}

        {/* Info-blok: abonnement schaalt automatisch mee */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 flex items-start gap-3">
          <TrendingUp size={18} className="text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-amber-900 mb-1">Abonnement schaalt automatisch mee</p>
            <p className="text-xs leading-relaxed mb-2">
              Het bureau-abonnement wordt automatisch aangepast op basis van het aantal recruiters:
            </p>
            <ul className="text-xs space-y-0.5 ml-2">
              <li>• <b>1 recruiter</b> → Starter (€ 5.000 / mnd)</li>
              <li>• <b>2-3 recruiters</b> → Pro (€ 10.000 / mnd)</li>
              <li>• <b>4+ recruiters</b> → Enterprise (€ 15.000 / mnd)</li>
            </ul>
            <p className="text-[11px] text-amber-700 mt-2 italic">
              Stripe past prorata toe — bureau betaalt alleen voor de extra dagen tot de volgende factuur.
            </p>
          </div>
        </div>

        {/* Huisstijl (super-admin only — Yorith) */}
        <HuisstijlSectie
          tenantId={b.id}
          bureauNaam={b.naam ?? "bureau"}
          huidigeLogo={b.huisstijl_logo_url ?? null}
          primair={b.huisstijl_primair ?? "#333399"}
          accent={b.huisstijl_accent ?? "#ffd84d"}
          actief={!!b.huisstijl_actief}
        />

        {/* DPA-status */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <h2 className="font-bold text-gray-800 inline-flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#333399]" />
                Verwerkersovereenkomst (DPA)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Verplicht onder AVG art. 28 — bureau moet tekenen vóór hij data invoert.
              </p>
            </div>
            <div className="inline-flex items-center gap-2">
              <Link
                href={`/bureaus/${id}/dpa`}
                target="_blank"
                className="text-xs text-[#333399] hover:underline font-semibold inline-flex items-center gap-1"
              >
                <FileSignature size={12} /> PDF-preview
              </Link>
            </div>
          </div>

          {!dpa && (
            <form action={stuurDpaUit}>
              <input type="hidden" name="tenant_id" value={id} />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-amber-900">
                  <b>Nog niet verzonden.</b> Klik op de knop om de DPA naar <b>{b.contact_email || "[geen contact-email]"}</b> te sturen ter digitale ondertekening.
                </div>
                <button
                  type="submit"
                  disabled={!b.contact_email}
                  className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send size={13} /> Stuur DPA ter ondertekening
                </button>
              </div>
            </form>
          )}

          {dpa?.status === "wachtend" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-amber-900">
                  <b>⏳ Wacht op handtekening</b><br />
                  Verzonden naar <b>{dpa.verzonden_aan_email}</b> op {new Date(dpa.verzonden_op).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short" })}
                </div>
                <div className="inline-flex items-center gap-2">
                  <Link
                    href={`/dpa-tekenen/${dpa.token}`}
                    target="_blank"
                    className="text-xs text-[#333399] hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    Bekijk teken-link
                  </Link>
                  <form action={stuurDpaUit}>
                    <input type="hidden" name="tenant_id" value={id} />
                    <button type="submit" className="text-xs bg-[#333399]/10 hover:bg-[#333399]/20 text-[#333399] font-semibold px-3 py-1.5 rounded-md inline-flex items-center gap-1">
                      <RefreshCw size={11} /> Opnieuw sturen
                    </button>
                  </form>
                  <form action={trekDpaIn}>
                    <input type="hidden" name="id" value={dpa.id} />
                    <button type="submit" className="text-xs text-red-600 hover:bg-red-50 font-semibold px-2 py-1.5 rounded-md inline-flex items-center gap-1">
                      <X size={11} /> Intrekken
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {dpa?.status === "getekend" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-emerald-900">
                <b>✅ Getekend op {new Date(dpa.getekend_op!).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short" })}</b><br />
                door <b>{dpa.getekend_door_naam}</b> ({dpa.getekend_door_functie}) — {dpa.getekend_door_email}
              </div>
              <Link
                href={`/dpa-tekenen/${dpa.token}`}
                target="_blank"
                className="text-sm bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-semibold px-4 py-2 rounded-md inline-flex items-center gap-1.5"
              >
                Bekijk getekende DPA
              </Link>
            </div>
          )}

          {dpa?.status === "ingetrokken" && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-gray-700">
                Vorige uitnodiging ingetrokken op {new Date(dpa.verzonden_op).toLocaleDateString("nl-NL")}
              </div>
              <form action={stuurDpaUit}>
                <input type="hidden" name="tenant_id" value={id} />
                <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-2 rounded-md text-sm inline-flex items-center gap-1.5">
                  <Send size={13} /> Stuur nieuwe uitnodiging
                </button>
              </form>
            </div>
          )}
        </div>

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
              <div className="col-span-2">
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

async function renderAbonnementSectie(b: { id: string; naam: string | null; contact_email: string | null; contact_naam: string | null }, _id: string) {
  const admin = createAdminClient();
  const [{ data: ab }, plans, setupFeeCent] = await Promise.all([
    admin.from("abonnementen")
      .select("plan, status, max_users, prijs_per_maand_cent, setup_fee_betaald, huidige_periode_einde, gestart_op, stripe_customer_id")
      .eq("tenant_id", b.id)
      .maybeSingle(),
    getPlans(),
    getSetupFeeCent(),
  ]);
  return (
    <AbonnementSectie
      tenantId={b.id}
      bureauNaam={b.naam ?? "bureau"}
      contactEmail={b.contact_email ?? ""}
      contactNaam={b.contact_naam ?? ""}
      abonnement={ab ?? null}
      stripeBeschikbaar={stripeBeschikbaar()}
      plans={plans.filter((p) => p.sleutel !== "setter_stoel")}
      setupFeeCent={setupFeeCent}
    />
  );
}
