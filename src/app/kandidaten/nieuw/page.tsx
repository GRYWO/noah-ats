import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { Wizard } from "./Wizard";
import { WachtendOpCvSectie } from "./WachtendOpCv";
import { ruimOudeWachtenden } from "./wachtend-actions";

export default async function NieuweKandidaatPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
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

  // Auto-cleanup wachtenden ouder dan 7 dagen
  await ruimOudeWachtenden();

  const { data: wachtenden } = await supabase
    .from("wachtend_op_cv")
    .select("*")
    .order("created_at", { ascending: false });

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
        {ok === "wachtend" && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            Toegevoegd aan wachtlijst — krijg je het CV later, dan kun je 'm via deze pagina alsnog uploaden.
          </div>
        )}

        <Wizard />

        <div className="mt-8">
          <WachtendOpCvSectie wachtenden={wachtenden ?? []} />
        </div>
      </div>
    </main>
  );
}
