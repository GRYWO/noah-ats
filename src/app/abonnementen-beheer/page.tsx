import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { getPlans, getSetupFeeCent, eur } from "@/utils/plans";
import { CreditCard } from "lucide-react";
import { PlannenLijst } from "./PlannenLijst";
import { SetupFeeForm } from "./SetupFeeForm";

export const dynamic = "force-dynamic";

export default async function AbonnementenBeheerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) redirect("/dashboard");

  const [plans, setupFeeCent] = await Promise.all([
    getPlans({ inclusiefInactief: true }),
    getSetupFeeCent(),
  ]);

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="dashboard" />

      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <CreditCard size={28} className="text-[#333399]" />
            Abonnementsplannen
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Beheer prijzen, features en plannen die bureaus zien bij activatie.
          </p>
        </div>

        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-bold text-gray-800 mb-1">Eenmalige setup-fee</h2>
          <p className="text-xs text-gray-500 mb-3">
            Wordt bij activatie van een abonnement eenmalig in rekening gebracht.
            Huidig: <b className="text-gray-700">{eur(setupFeeCent)}</b>
          </p>
          <SetupFeeForm huidigeFee={setupFeeCent} />
        </section>

        <PlannenLijst plannen={plans} />
      </div>
    </main>
  );
}
