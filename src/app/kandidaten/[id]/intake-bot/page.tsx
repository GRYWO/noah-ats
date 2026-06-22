import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TopBar } from "@/components/TopBar";
import { IntakeBot } from "../IntakeBot";

export const metadata = { title: "Intake-bot" };

// Schone, gefocuste pagina: alleen de pratende intake-bot, die meteen begint
// met vraag-voor-vraag uitvragen wat nog ontbreekt.
export default async function IntakeBotPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select("id, voornaam, achternaam, woonplaats, notitie")
    .eq("id", id)
    .maybeSingle();
  if (!k) notFound();

  const naam = [k.voornaam, k.achternaam].filter(Boolean).join(" ").trim();

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="kandidaten" />
      <div className="mx-auto max-w-2xl p-8">
        <Link href={`/kandidaten/${id}`} className="text-sm text-[#333399] hover:underline">
          &larr; Naar kandidaat
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">Intake — {naam}</h1>
        <p className="mt-1 mb-6 text-sm text-gray-500">
          Noah stelt vraag voor vraag wat nog ontbreekt. Beantwoord ze; daarna staat het profiel klaar.
        </p>
        <IntakeBot kandidaatId={k.id} cvContext={(k.notitie as string | null) ?? undefined} autoStart />
      </div>
    </main>
  );
}
