import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { ExternalLink } from "lucide-react";

const ROBIN_URL = "https://app.recruitrobin.com";

export default async function RobinPage({
  searchParams,
}: {
  searchParams?: Promise<{ functie?: string; vacature?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol === "setter") redirect("/dashboard");

  const sp = (await searchParams) ?? {};
  const functie = (sp.functie ?? "").trim();
  const vacatureId = (sp.vacature ?? "").trim();
  // Payload die de Noah-extensie (content-script op /robin) oppakt en via de
  // achtergrond doorgeeft aan content-robin.js, zodat Robin de zoekopdracht start.
  const robinZoek = functie ? { functie, vacatureId } : null;

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="robin" />

      {/* Onzichtbare payload voor de Noah-extensie */}
      {robinZoek && (
        <script
          id="noah-robin-zoek"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(robinZoek) }}
        />
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Kandidaten zoeken</h1>
            {functie ? (
              <p className="text-xs font-semibold text-emerald-700">
                Zoekt kandidaten voor: {functie}
              </p>
            ) : (
              <p className="text-xs text-gray-500">Werkt alleen met de Noah-extensie. Wit scherm? Installeer de extensie.</p>
            )}
          </div>
          <a
            href={ROBIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#333399] hover:underline font-semibold"
          >
            <ExternalLink size={14} />
            Open in nieuw tabblad
          </a>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: "calc(100vh - 110px)" }}>
          <iframe
            src={ROBIN_URL}
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </main>
  );
}
