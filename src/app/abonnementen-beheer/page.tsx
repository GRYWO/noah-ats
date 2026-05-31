import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { getPlans, getSetupFeeCent, eur } from "@/utils/plans";
import { CreditCard } from "lucide-react";
import { PlannenLijst } from "./PlannenLijst";
import { SetupFeeForm } from "./SetupFeeForm";
import { getAbonnementenOverzicht } from "@/utils/abonnementen-overzicht";
import { OverzichtSectie } from "./OverzichtSectie";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AbonnementenBeheerPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) redirect("/dashboard");

  const sp = (await searchParams) ?? {};
  const tab = sp.tab === "plannen" ? "plannen" : "overzicht";

  // Notities veilig ophalen — tabel kan nog niet bestaan (SQL 064 niet gerund).
  // In dat geval geven we lege maps door zodat de UI niet crashed.
  async function veiligNotitiesOphalen() {
    try {
      const { data, error } = await createAdminClient()
        .from("abonnement_notities")
        .select("tenant_id, user_id, notitie");
      if (error) return { data: [] as Array<{ tenant_id: string | null; user_id: string | null; notitie: string }> };
      return { data: data ?? [] };
    } catch {
      return { data: [] as Array<{ tenant_id: string | null; user_id: string | null; notitie: string }> };
    }
  }

  // getAbonnementenOverzicht zelf is al defensief, maar wrap voor extra zekerheid
  async function veiligOverzicht() {
    try {
      return await getAbonnementenOverzicht();
    } catch (e) {
      console.error("[abonnementen-beheer] overzicht-fout:", e);
      return {
        bureauActief: [], bureauOpgezegd: [],
        setterActief: [], setterOpgezegd: [],
        mrr: { bureau_cent: 0, setter_cent: 0, totaal_cent: 0, arr_projectie_cent: 0 },
        trend: [],
        churn: { bureau_deze_maand: 0, setter_deze_maand: 0, bureau_total_opgezegd: 0, setter_total_opgezegd: 0 },
      };
    }
  }

  const [plans, setupFeeCent, overzicht, notitiesRes] = await Promise.all([
    getPlans({ inclusiefInactief: true }),
    getSetupFeeCent(),
    veiligOverzicht(),
    veiligNotitiesOphalen(),
  ]);

  const notitiesBureau: Record<string, string> = {};
  const notitiesSetter: Record<string, string> = {};
  for (const n of notitiesRes.data) {
    if (n.tenant_id) notitiesBureau[n.tenant_id] = n.notitie;
    if (n.user_id) notitiesSetter[n.user_id] = n.notitie;
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="dashboard" />

      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <CreditCard size={28} className="text-[#333399]" />
            Abonnementen
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Overzicht van alle bureau- en setter-abonnementen, MRR en plan-beheer.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
          <TabLink href="?tab=overzicht" actief={tab === "overzicht"}>Overzicht</TabLink>
          <TabLink href="?tab=plannen" actief={tab === "plannen"}>Plannen-beheer</TabLink>
        </div>

        {tab === "overzicht" && (
          <OverzichtSectie
            data={overzicht}
            notitiesBureau={notitiesBureau}
            notitiesSetter={notitiesSetter}
          />
        )}

        {tab === "plannen" && (
          <>
            <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="font-bold text-gray-800 mb-1">Eenmalige setup-fee</h2>
              <p className="text-xs text-gray-500 mb-3">
                Wordt bij activatie van een abonnement eenmalig in rekening gebracht.
                Huidig: <b className="text-gray-700">{eur(setupFeeCent)}</b>
              </p>
              <SetupFeeForm huidigeFee={setupFeeCent} />
            </section>

            <PlannenLijst plannen={plans} />
          </>
        )}
      </div>
    </main>
  );
}

function TabLink({ href, actief, children }: { href: string; actief: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
        actief
          ? "border-[#333399] text-[#333399]"
          : "border-transparent text-gray-600 hover:text-gray-800"
      }`}
    >
      {children}
    </Link>
  );
}
