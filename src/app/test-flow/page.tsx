import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { TestFlowApp } from "./TestFlowApp";

export const metadata = { title: "Flow-test" };

export default async function TestFlowPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email ?? "")) redirect("/vacature-aanmaken");

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="vacature-aanmaken" />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="gold-hr mb-6 rounded-full" />
        <span className="gold-chip inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
          Noah<span className="text-gold">.</span>&nbsp;flow-test
        </span>
        <h1 className="mt-3 text-3xl font-bold text-gray-800">Klikbare flow-test</h1>
        <p className="mt-1 text-sm text-gray-500">
          Doorloopt de hele setter-flow (intake → pijplijn → voorstel → plaatsing) met testdata.
          Er gaat <strong>geen enkele echte e-mail</strong> uit — je ziet alleen wélke mails verstuurd zouden worden.
          De testdata wordt na afloop automatisch opgeruimd.
        </p>
        <TestFlowApp />
      </div>
    </main>
  );
}
