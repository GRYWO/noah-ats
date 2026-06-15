import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { IntakeStarter } from "./IntakeStarter";

// Nieuwe CV-first intake-flow. Setter, recruiter en admin mogen hier
// een kandidaat aanmaken; de setter doet de intake en levert daarna
// door aan een recruiter (kanban-stap 'in_wachtrij').
export default async function IntakenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  // Alleen setter, recruiter en admin mogen een intake starten.
  // Bureau-admin niet (die runt geen intakes).
  if (!profile || (profile.rol !== "setter" && profile.rol !== "recruiter" && profile.rol !== "admin" && profile.rol !== "super_admin")) {
    redirect("/kandidaten?error=Geen+toegang+tot+intake-flow");
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="intaken" />

      <div className="p-8 max-w-4xl mx-auto">
        <Link href="/kandidaten" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block">
          Terug naar kandidaten
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Intake starten</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload het CV, Noah leest het uit en voert daarna direct het intakegesprek met je.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <IntakeStarter rolIsSetter={profile.rol === "setter"} />
      </div>
    </main>
  );
}
