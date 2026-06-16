import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { RecruiterIntake } from "./RecruiterIntake";

// Recruiter-intake-flow, geport van de publieke /werk-intake op
// noah-recruitment.nl. De recruiter doorloopt deze samen met de
// kandidaat aan de telefoon. Na finish landt de kandidaat in BOTH
// rec_kandidaten (publieke site) en de noah-ats kandidaten-tabel via
// de bestaande mirror in /api/intake/finish op noah-recruitment.
//
// Toegang: recruiter, admin, super_admin. Setter en bureau_admin niet.
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

  if (
    !profile ||
    (profile.rol !== "recruiter" &&
      profile.rol !== "admin" &&
      profile.rol !== "super_admin")
  ) {
    redirect("/kandidaten?error=Geen+toegang+tot+intake-flow");
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="intaken" />

      <div className="p-8 max-w-4xl mx-auto">
        <Link
          href="/kandidaten"
          className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block"
        >
          Terug naar kandidaten
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Recruiter intake</h1>
          <p className="text-sm text-gray-500 mt-1">
            Doorloop deze samen met de kandidaat aan de telefoon.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-[#333399]/15 bg-[#eef0ff]/50 p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-800">Zo werkt het</p>
          <p className="mt-1 leading-relaxed">
            Upload het CV van de kandidaat. Noah leest het uit en stelt
            daarna gerichte vragen die je samen met de kandidaat aan de
            lijn beantwoordt. Na afronden verschijnt de kandidaat
            automatisch in het kandidaten-overzicht op stap website en
            tegelijk op noah-recruitment.nl met passende vacatures.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <RecruiterIntake />
      </div>
    </main>
  );
}
