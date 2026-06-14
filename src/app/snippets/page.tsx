import { redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { createClient } from "@/utils/supabase/server";
import { SnippetsClient } from "./SnippetsClient";

export const dynamic = "force-dynamic";

export default async function SnippetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: snippets } = await supabase
    .from("mail_snippets")
    .select("id, naam, tekst, sneltoets, gemaakt_op")
    .order("naam", { ascending: true });

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="instellingen" />

      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Snippets</h1>
        <p className="text-sm text-gray-600 mb-6">
          Bewaar standaardteksten die je vaak in mails plakt. In de mail-compose
          klik je op Snippet om er een in te voegen.
        </p>

        <SnippetsClient initieel={snippets ?? []} />
      </div>
    </main>
  );
}
