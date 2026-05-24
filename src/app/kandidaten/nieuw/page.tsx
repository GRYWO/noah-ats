import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { Wizard } from "./Wizard";

export default async function NieuweKandidaatPage({
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

  if (profile?.rol === "setter") {
    redirect("/kandidaten?error=Setters+kunnen+geen+kandidaten+aanmaken");
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="kandidaten" />

      <div className="p-8 max-w-4xl mx-auto">
        <Link href="/kandidaten" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block">
          ← Terug naar kandidaten
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Nieuwe kandidaat</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sleep het CV erin — AI leest de gegevens en stelt alleen vragen over wat ontbreekt.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <Wizard />
      </div>
    </main>
  );
}
