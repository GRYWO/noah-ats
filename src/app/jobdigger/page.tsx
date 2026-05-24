import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { ExternalLink } from "lucide-react";
import { DropZone } from "./DropZone";

const JOBDIGGER_URL = "https://jobdigger.nl/auth/login";

export default async function JobdiggerPage({
  searchParams,
}: {
  searchParams: Promise<{ kandidaat?: string }>;
}) {
  const { kandidaat: kandidaatId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let kandidaatNaam: string | null = null;
  if (kandidaatId) {
    const { data: k } = await supabase
      .from("kandidaten")
      .select("voornaam, achternaam")
      .eq("id", kandidaatId)
      .single();
    if (k) kandidaatNaam = `${k.voornaam} ${k.achternaam}`;
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="jobdigger" />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Jobdigger</h1>
            <p className="text-xs text-gray-500">Werkt met de Noah-extensie. Wit scherm? Herlaad de extensie in Chrome.</p>
          </div>
          <a
            href={JOBDIGGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#333399] hover:underline font-semibold"
          >
            <ExternalLink size={14} />
            Open in nieuw tabblad
          </a>
        </div>

        {kandidaatId && kandidaatNaam && (
          <DropZone kandidaatId={kandidaatId} kandidaatNaam={kandidaatNaam} />
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: kandidaatId ? "calc(100vh - 200px)" : "calc(100vh - 110px)" }}>
          <iframe
            src={JOBDIGGER_URL}
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </main>
  );
}
