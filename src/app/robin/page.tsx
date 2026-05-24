import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { ExternalLink, Sparkles } from "lucide-react";

const ROBIN_URL = "https://app.recruitrobin.com";

export default async function RobinPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol === "setter") redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="robin" />

      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#eef0ff] flex items-center justify-center mb-6">
            <Sparkles size={32} className="text-[#333399]" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Recruit Robin</h1>
          <p className="text-sm text-gray-600 mb-8 max-w-md mx-auto">
            Robin werkt niet binnen Noah (technische beperking van hun kant). Open Robin in een nieuw tabblad — je blijft ingelogd in Noah.
          </p>
          <a
            href={ROBIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-3 rounded-lg text-sm"
          >
            <ExternalLink size={16} />
            Open Robin
          </a>
        </div>
      </div>
    </main>
  );
}
