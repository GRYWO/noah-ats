import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
// Geen icoon-imports, conform projectregel "geen iconen in UI".
import { NoahRecruitmentLogo } from "@/components/NoahRecruitmentLogo";
import { NoahAvatar } from "@/components/NoahAvatar";

export const dynamic = "force-dynamic";

const NOAH_PAARS = "#333399";

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

  // Setter-email uit meest recente voorstel, voor footer "vragen?" link
  const { data: laatsteVoorstel } = await admin
    .from("voorstellen")
    .select("setter_id")
    .eq("kandidaat_id", k.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let setterContact: { naam: string; email: string } | null = null;
  if (laatsteVoorstel?.setter_id) {
    const { data: setterProfiel } = await admin
      .from("profiles")
      .select("voornaam, achternaam, mail_adres")
      .eq("id", laatsteVoorstel.setter_id)
      .single();
    if (setterProfiel?.mail_adres) {
      setterContact = {
        naam: `${setterProfiel.voornaam ?? ""} ${setterProfiel.achternaam ?? ""}`.trim() || "je contactpersoon",
        email: setterProfiel.mail_adres,
      };
    }
  }

  // Belangrijk: opdrachtgever mag de kandidaat niet zelf kunnen benaderen.
  // Daarom tonen we alleen de voornaam, geen achternaam, geen email, geen telefoon.
  const naam = (k.voornaam ?? "").trim();
  const cv = (k.cv_geparseerd ?? {}) as { talen?: string; werkervaring?: string; vaardigheden?: string; diplomas?: string };

  // Splits multiline-strings naar lijstjes (één regel per item).
  // Eerst splitten op newline, dan ook op '•' of ';' als fallback.
  function naarLijst(s: string | null | undefined): string[] {
    if (!s) return [];
    return s
      .split(/\r?\n|•|;|·\s*\n/g)
      .map((r) => r.trim().replace(/^[•·\-*]\s*/, ""))
      .filter((r) => r.length > 0);
  }
  const werkervaringRegels = naarLijst(cv.werkervaring);
  const diplomasRegels = naarLijst(cv.diplomas);
  const extra = (k.voorstelprofiel_extra ?? {}) as Record<string, unknown>;

  return (
    <main className="min-h-screen bg-[#f4f4f7] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header met Noah recruitment-branding */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
          <div className="px-8 py-6 flex items-center justify-between" style={{ backgroundColor: NOAH_PAARS }}>
            <NoahRecruitmentLogo variant="dark" size="lg" />
            <div className="text-xs text-white/70 uppercase tracking-wider">Kandidaatprofiel</div>
          </div>

          <div className="p-8 flex items-center gap-6">
            <NoahAvatar size={96} />
            <div className="flex-1 min-w-0">
              {k.open_voor && (
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  {k.open_voor}
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900">{naam || "Onbekende kandidaat"}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                {k.woonplaats && (
                  <span>
                    {k.woonplaats}
                    {k.max_reisafstand_km ? ` (max ${k.max_reisafstand_km} km)` : ""}
                  </span>
                )}
                {k.leeftijd && <span>{k.leeftijd} jaar</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Eerstvolgende kennismaking */}
        {eerstvolgendeKennismaking && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: NOAH_PAARS }}>
              Eerstvolgende kennismaking
            </div>
            <div className="text-lg font-bold text-gray-900">
              {new Date(eerstvolgendeKennismaking).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })}
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
            <Card titel="Open voor functies">
              {k.open_voor}
            </Card>
          )}
          {werkervaringRegels.length > 0 && (
            <Card titel="Werkervaring">
              <ul className="space-y-1.5">
                {werkervaringRegels.map((r, i) => (
                  <li key={i} className="text-sm text-gray-800 flex gap-2">
                    <span className="text-gray-400 mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {diplomasRegels.length > 0 && (
            <Card titel="Diploma's & certificaten">
              <ul className="space-y-1.5">
                {diplomasRegels.map((r, i) => (
                  <li key={i} className="text-sm text-gray-800 flex gap-2">
                    <span className="text-gray-400 mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {cv.vaardigheden && (
            <Card titel="Vaardigheden">
              {cv.vaardigheden}
            </Card>
          )}
          {cv.talen && (
            <Card titel="Talen">
              {cv.talen}
            </Card>
          )}
          {(k.rijbewijs || k.eigen_vervoer) && (
            <Card titel="Mobiliteit">
              {k.rijbewijs && <div>Rijbewijs: <b>{k.rijbewijs}</b></div>}
              {k.eigen_vervoer && <div>Eigen vervoer</div>}
            </Card>
          )}
          {k.soort_dienstverband && (
            <Card titel="Dienstverband">
              {k.soort_dienstverband}
              {k.werving_of_uitzend && <div className="text-xs text-gray-500 mt-1">{k.werving_of_uitzend}</div>}
            </Card>
          )}
          {k.salaris_indicatie && (
            <Card titel="Salarisindicatie">
              {k.salaris_indicatie}
              {k.tarief_ws && <div className="text-xs text-gray-500 mt-1">Tarief W&amp;S: {k.tarief_ws}</div>}
            </Card>
          )}
          {k.bijzonderheden && (
            <Card titel="Bijzonderheden">
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

        {/* Footer met Noah recruitment-merk */}
        <div className="flex flex-col items-center gap-2 py-6 text-xs text-gray-500">
          <div className="inline-flex items-center gap-2">
            <span>Voorgesteld door</span>
            <NoahRecruitmentLogo variant="light" size="sm" />
          </div>
          {setterContact && (
            <div>
              Vragen? Mail{" "}
              <a href={`mailto:${setterContact.email}`} style={{ color: NOAH_PAARS }}>
                <b>{setterContact.naam}</b> ({setterContact.email})
              </a>
            </div>
          )}
          <div className="mt-1">
            <a href="https://www.noah-recruitment.nl" style={{ color: NOAH_PAARS }}>
              www.noah-recruitment.nl
            </a>
          </div>
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
