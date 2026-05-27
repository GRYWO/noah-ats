import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TopBar } from "@/components/TopBar";
import { IntakeWizard } from "./IntakeWizard";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (profile?.rol !== "admin" && profile?.rol !== "recruiter") {
    redirect(`/kandidaten/${id}?error=Geen+rechten`);
  }

  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select("*")
    .eq("id", id)
    .single();

  if (!k) redirect("/kandidaten?error=Niet+gevonden");

  // Als al goedgekeurd of afgewezen → geen wizard meer, terug naar detail
  if (k.cv_controle_status === "goedgekeurd" || k.cv_controle_status === "afgekeurd") {
    redirect(`/kandidaten/${id}?ok=intake_al_afgerond`);
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="kandidaten" />
      <div className="p-8 max-w-5xl mx-auto">
        <IntakeWizard kandidaat={k} />
      </div>
    </main>
  );
}
