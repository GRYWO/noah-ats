import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { ExternalLink, MapPin, Briefcase, Ban } from "lucide-react";
import { DropZone } from "./DropZone";
import { PaginaTour } from "@/components/PaginaTour";
import { TOUR_JOBDIGGER } from "@/utils/pagina-tours";

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
  let kandidaat: {
    voornaam: string | null;
    achternaam: string | null;
    open_voor: string | null;
    woonplaats: string | null;
    max_reisafstand_km: number | null;
    blacklist_bedrijven: string | null;
  } | null = null;
  if (kandidaatId) {
    const { data: k } = await supabase
      .from("kandidaten")
      .select("voornaam, achternaam, open_voor, woonplaats, max_reisafstand_km, blacklist_bedrijven")
      .eq("id", kandidaatId)
      .single();
    if (k) {
      kandidaat = k;
      kandidaatNaam = `${k.voornaam} ${k.achternaam}`;
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="jobdigger" />
      <PaginaTour pad="/jobdigger" naam="Jobdigger" stappen={TOUR_JOBDIGGER} />

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

        {kandidaatId && kandidaat && (
          <>
            <Zoekfilters kandidaat={kandidaat} />
            <DropZone kandidaatId={kandidaatId} kandidaatNaam={kandidaatNaam ?? ""} />
            {/* Filter-payload voor Chrome-extensie — auto-fills Jobdigger
                zoekvelden. "inclusief_onbekend" altijd true zodat Jobdigger
                ook vacatures zonder volledige locatie meeneemt. */}
            <script
              type="application/json"
              id="noah-jobdigger-filters"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  kandidaat_id: kandidaatId,
                  functies: (kandidaat.open_voor ?? "").split(/[,;]/).map(s => s.trim()).filter(Boolean),
                  woonplaats: kandidaat.woonplaats ?? "",
                  reisafstand_km: kandidaat.max_reisafstand_km ?? null,
                  inclusief_onbekend: true,
                }),
              }}
            />
          </>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: kandidaatId ? "calc(100vh - 320px)" : "calc(100vh - 110px)" }}>
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

function Zoekfilters({ kandidaat }: { kandidaat: {
  voornaam: string | null;
  achternaam: string | null;
  open_voor: string | null;
  woonplaats: string | null;
  max_reisafstand_km: number | null;
  blacklist_bedrijven: string | null;
} }) {
  const functies = (kandidaat.open_voor ?? "").split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const blacklist = (kandidaat.blacklist_bedrijven ?? "").split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const heeftIets = functies.length > 0 || kandidaat.woonplaats || kandidaat.max_reisafstand_km || blacklist.length > 0;

  if (!heeftIets) {
    return (
      <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        Geen zoekfilters ingevuld voor deze kandidaat. Vraag de recruiter om deze aan te vullen op de kandidaat-pagina.
      </div>
    );
  }

  return (
    <div className="mb-3 bg-[#eef0ff] border border-[#333399]/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold uppercase tracking-wide text-[#333399]">Zoekfilters</div>
        <div className="text-xs text-[#333399]/80 italic">Tip: vul de zoekopdracht zo breed mogelijk in zodat de bellijst groter wordt.</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
            <Briefcase size={12} /> Open voor functies
          </div>
          {functies.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {functies.map((f, i) => (
                <span key={i} className="text-xs bg-white border border-gray-200 rounded-md px-2 py-0.5 font-semibold text-gray-800">{f}</span>
              ))}
            </div>
          ) : <span className="text-xs text-gray-400">—</span>}
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
            <MapPin size={12} /> Woont in / reisafstand
          </div>
          <div className="text-sm font-semibold text-gray-800">
            {kandidaat.woonplaats ?? "—"}
            {kandidaat.max_reisafstand_km != null && (
              <span className="text-gray-500 font-normal"> · max {kandidaat.max_reisafstand_km} km</span>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
            <Ban size={12} /> Niet bij
          </div>
          {blacklist.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {blacklist.map((b, i) => (
                <span key={i} className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-md px-2 py-0.5 font-semibold">{b}</span>
              ))}
            </div>
          ) : <span className="text-xs text-gray-400">—</span>}
        </div>
      </div>
    </div>
  );
}
