import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { MapPin, GraduationCap, Briefcase, Languages, Car, Calendar, Wallet, Clock, FileCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const GRYWO_PAARS = "#333399";
const GRYWO_GEEL = "#ffd84d";

export default async function VoorstelprofielPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select(`
      id, voornaam, tussenvoegsel, achternaam, leeftijd, woonplaats,
      opleiding, open_voor, rijbewijs, eigen_vervoer, score,
      profielschets, cv_geparseerd, voorstelprofiel_extra, max_reisafstand_km,
      soort_dienstverband, werving_of_uitzend, salaris_indicatie, tarief_ws,
      bijzonderheden
    `)
    .eq("voorstelprofiel_token", token)
    .single();

  if (!k) notFound();

  // Eerstvolgende geplande kennismaking voor deze kandidaat
  const nuIso = new Date().toISOString();
  const { data: aankomendVoorstel } = await admin
    .from("voorstellen")
    .select("kennismaking_op")
    .eq("kandidaat_id", k.id)
    .eq("status", "uitnodigen")
    .not("kennismaking_op", "is", null)
    .gte("kennismaking_op", nuIso)
    .order("kennismaking_op", { ascending: true })
    .limit(1)
    .maybeSingle();
  const eerstvolgendeKennismaking = aankomendVoorstel?.kennismaking_op ?? null;

  // Belangrijk: opdrachtgever mag de kandidaat niet zelf kunnen benaderen.
  // Daarom tonen we alléén de voornaam — geen achternaam, geen email, geen telefoon.
  const naam = (k.voornaam ?? "").trim();
  const initials = (k.voornaam?.[0] ?? "?").toUpperCase();
  const cv = (k.cv_geparseerd ?? {}) as { talen?: string; werkervaring?: string; vaardigheden?: string };
  const extra = (k.voorstelprofiel_extra ?? {}) as Record<string, unknown>;

  return (
    <main className="min-h-screen bg-[#f4f4f7] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header met GRYWO-branding */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
          <div className="px-8 py-6 flex items-center justify-between" style={{ backgroundColor: GRYWO_PAARS }}>
            <div className="flex items-baseline">
              <span className="text-white text-4xl font-black tracking-tighter">GRYWO</span>
              <span className="ml-1 w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: GRYWO_GEEL }}></span>
            </div>
            <div className="text-xs text-white/70 uppercase tracking-wider">Kandidaatprofiel</div>
          </div>

          <div className="p-8 flex items-center gap-6">
            <div
              className="w-24 h-24 rounded-full text-white text-3xl font-bold flex items-center justify-center shrink-0"
              style={{ backgroundColor: GRYWO_PAARS }}
            >
              {initials || "??"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900">{naam || "Onbekende kandidaat"}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                {k.leeftijd && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={14} /> {k.leeftijd} jaar
                  </span>
                )}
                {k.woonplaats && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} /> {k.woonplaats}
                    {k.max_reisafstand_km ? ` (max ${k.max_reisafstand_km} km)` : ""}
                  </span>
                )}
                {k.opleiding && (
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap size={14} /> {k.opleiding}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Eerstvolgende kennismaking */}
        {eerstvolgendeKennismaking && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: GRYWO_PAARS }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Eerstvolgende kennismaking</div>
              <div className="text-lg font-bold text-gray-900">
                {new Date(eerstvolgendeKennismaking).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })}
              </div>
            </div>
          </div>
        )}

        {/* Profielschets */}
        {k.profielschets && (
          <div className="bg-white rounded-2xl shadow-md p-8 mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Over deze kandidaat</h2>
            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {k.profielschets}
            </div>
          </div>
        )}

        {/* Detail-kolommen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {k.open_voor && (
            <Card icon={<Briefcase size={16} />} titel="Open voor functies">
              {k.open_voor}
            </Card>
          )}
          {cv.werkervaring && (
            <Card icon={<Briefcase size={16} />} titel="Werkervaring">
              {cv.werkervaring}
            </Card>
          )}
          {cv.vaardigheden && (
            <Card icon={<Briefcase size={16} />} titel="Vaardigheden">
              {cv.vaardigheden}
            </Card>
          )}
          {cv.talen && (
            <Card icon={<Languages size={16} />} titel="Talen">
              {cv.talen}
            </Card>
          )}
          {(k.rijbewijs || k.eigen_vervoer) && (
            <Card icon={<Car size={16} />} titel="Mobiliteit">
              {k.rijbewijs && <div>Rijbewijs: <b>{k.rijbewijs}</b></div>}
              {k.eigen_vervoer && <div>Eigen vervoer</div>}
            </Card>
          )}
          {k.soort_dienstverband && (
            <Card icon={<Clock size={16} />} titel="Dienstverband">
              {k.soort_dienstverband}
              {k.werving_of_uitzend && <div className="text-xs text-gray-500 mt-1">{k.werving_of_uitzend}</div>}
            </Card>
          )}
          {k.salaris_indicatie && (
            <Card icon={<Wallet size={16} />} titel="Salarisindicatie">
              {k.salaris_indicatie}
              {k.tarief_ws && <div className="text-xs text-gray-500 mt-1">Tarief W&amp;S: {k.tarief_ws}</div>}
            </Card>
          )}
          {k.bijzonderheden && (
            <Card icon={<FileCheck size={16} />} titel="Bijzonderheden">
              {k.bijzonderheden}
            </Card>
          )}
          {extra && typeof extra === "object" && Object.keys(extra).map((label) => {
            const v = extra[label];
            if (v == null || v === "") return null;
            return (
              <Card key={label} titel={label}>
                {String(v)}
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 py-4">
          Voorgesteld door <b style={{ color: GRYWO_PAARS }}>GRYWO</b> · Vragen? <a href="mailto:noah@grywo.nl" style={{ color: GRYWO_PAARS }}>noah@grywo.nl</a>
        </div>
      </div>
    </main>
  );
}

function Card({ icon, titel, children }: { icon?: React.ReactNode; titel: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 inline-flex items-center gap-1.5">
        {icon}
        {titel}
      </div>
      <div className="text-sm text-gray-800 whitespace-pre-wrap">{children}</div>
    </div>
  );
}
