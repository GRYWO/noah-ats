import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { updateKandidaat } from "./actions";
import { stuurVoorstel } from "./voorstel-actions";
import { DeleteButton } from "./DeleteButton";
import { CvUpload } from "./CvUpload";
import { BellijstSectie } from "./BellijstSectie";
import { IntakeFiltersBanner } from "./IntakeFiltersBanner";
import { CvControle } from "./CvControle";
import { ContactRecruiterKnop } from "./ContactRecruiter";

const STATUS_OPTIES = [
  { value: "nieuw", label: "Nieuw" },
  { value: "talentpool", label: "Talentpool" },
  { value: "in_proces", label: "In proces" },
  { value: "bemiddelbaar", label: "Bemiddelbaar" },
  { value: "geplaatst", label: "Geplaatst" },
  { value: "afgewezen", label: "Afgewezen" },
];

const KANBAN_OPTIES = [
  { value: "nieuwe_sollicitatie", label: "1. Nieuwe sollicitatie" },
  { value: "shortlist", label: "2. Shortlist" },
  { value: "interne_intake_ingepland", label: "3. Interne intake ingepland" },
  { value: "interne_intake_voltooid", label: "4. Interne intake voltooid" },
  { value: "voorgesteld_opdrachtgever", label: "5. Voorgesteld opdrachtgever" },
  { value: "opdrachtgever_geinteresseerd", label: "6. Opdrachtgever geïnteresseerd" },
  { value: "kennismaking_ingepland", label: "7. Kennismaking ingepland" },
  { value: "1e_gesprek", label: "8. 1e gesprek" },
  { value: "2e_gesprek", label: "9. 2e gesprek" },
  { value: "geplaatst", label: "Geplaatst" },
  { value: "niet_geplaatst", label: "Niet geplaatst" },
];

const VOORSTEL_STATUS_KLEUREN: Record<string, string> = {
  verzonden: "bg-amber-100 text-amber-800",
  uitnodigen: "bg-emerald-100 text-emerald-800",
  niet_uitnodigen: "bg-red-100 text-red-800",
  verlopen: "bg-gray-100 text-gray-600",
};

const VOORSTEL_STATUS_LABEL: Record<string, string> = {
  verzonden: "Wachten op reactie",
  uitnodigen: "Uitnodigen",
  niet_uitnodigen: "Niet uitnodigen",
  verlopen: "Verlopen",
};

export default async function KandidaatDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user!.id)
    .single();

  const isRecruiter = myProfile?.rol === "recruiter";
  const isSetter = myProfile?.rol === "setter";

  const { data: k } = await supabase
    .from("kandidaten")
    .select("*")
    .eq("id", id)
    .single();

  if (!k) notFound();

  const { data: voorstellen } = await supabase
    .from("voorstellen")
    .select("*")
    .eq("kandidaat_id", id)
    .order("created_at", { ascending: false });

  const { data: logs } = await supabase
    .from("voorstel_logs")
    .select("id, event_type, beschrijving, created_at, zichtbaar_voor_kandidaat")
    .eq("kandidaat_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: bellijstenRaw } = await supabase
    .from("bellijsten")
    .select(`
      id, naam, aantal_items, created_at,
      items:bellijst_items(id, functie, bedrijf, plaats, telefoon, website, branche, label, status, notitie, opdrachtgever_id, volgorde)
    `)
    .eq("kandidaat_id", id)
    .order("created_at", { ascending: false });

  const bellijsten = (bellijstenRaw ?? []).map(b => ({
    ...b,
    items: (b.items ?? []).sort((a: { volgorde: number | null }, b: { volgorde: number | null }) => (a.volgorde ?? 0) - (b.volgorde ?? 0)),
  }));

  const EVENT_LABELS: Record<string, { label: string; kleur: string }> = {
    voorstel_verstuurd:    { label: "Voorstel verstuurd",     kleur: "bg-[#333399] text-white" },
    voorstel_geopend:      { label: "Voorstel geopend",       kleur: "bg-blue-100 text-blue-800" },
    reminder_verstuurd:    { label: "Reminder verstuurd",     kleur: "bg-amber-100 text-amber-800" },
    voorstel_groen:        { label: "Groen — wil kennismaken", kleur: "bg-emerald-100 text-emerald-800" },
    voorstel_rood:         { label: "Rood — afgewezen",       kleur: "bg-red-100 text-red-800" },
    kennismaking_gepland:  { label: "Kennismaking gepland",   kleur: "bg-emerald-100 text-emerald-800" },
    kennismaking_reminder: { label: "Reminder kandidaat",     kleur: "bg-amber-100 text-amber-800" },
    plaatsing:             { label: "Geplaatst",              kleur: "bg-emerald-600 text-white" },
    afwijzing:             { label: "Afgewezen",              kleur: "bg-red-100 text-red-800" },
    verlopen:              { label: "Verlopen",               kleur: "bg-gray-100 text-gray-600" },
  };

  const initials = `${k.voornaam?.[0] ?? ""}${k.achternaam?.[0] ?? ""}`.toUpperCase();
  const scoreColor =
    k.score == null ? "text-gray-400" :
    k.score >= 75 ? "text-emerald-600" :
    k.score >= 50 ? "text-amber-600" : "text-red-500";

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="kandidaten" />

      <div className="p-8 max-w-6xl mx-auto">
        <Link href="/kandidaten" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block">
          ← Terug naar kandidaten
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#333399] to-[#5454c4] text-white text-2xl font-bold flex items-center justify-center">
            {initials || "??"}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">
              {k.voornaam} {k.tussenvoegsel ? `${k.tussenvoegsel} ` : ""}{k.achternaam}
            </h1>
            <div className="text-sm text-gray-500 flex flex-wrap gap-4 mt-1">
              {k.email && <span>{k.email}</span>}
              {k.telefoon && <span>{k.telefoon}</span>}
              {k.woonplaats && <span>{k.woonplaats}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase font-semibold">Score</div>
            <div className={`text-4xl font-bold ${scoreColor}`}>
              {k.score ?? "—"}{k.score != null && <span className="text-base text-gray-400">/100</span>}
            </div>
          </div>
        </div>

        {/* Intake zoekfilters — alleen voor recruiter/admin (setter mag niet aanpassen) */}
        {!isSetter && (
          <IntakeFiltersBanner
            kandidaatId={k.id}
            voornaam={k.voornaam ?? ""}
            open_voor={k.open_voor ?? null}
            woonplaats={k.woonplaats ?? null}
            max_reisafstand_km={k.max_reisafstand_km ?? null}
            blacklist_bedrijven={k.blacklist_bedrijven ?? null}
            voltooid={k.intake_zoekfilters_voltooid ?? false}
          />
        )}

        {ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            {ok === "voorstel" ? "Voorstel verzonden — opdrachtgever krijgt een mail" : ok === "bellijst" ? "Bellijst geïmporteerd" : "Opgeslagen"}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* EDIT FORM */}
        <form action={updateKandidaat} className="space-y-6">
          <input type="hidden" name="id" value={k.id} />

          {/* Status & kanban */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Status & pipeline</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                <select name="status" defaultValue={k.status ?? "nieuw"} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]">
                  {STATUS_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Kanban stap</label>
                <select name="kanban_stap" defaultValue={k.kanban_stap ?? "nieuwe_sollicitatie"} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]">
                  {KANBAN_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Score (0-100)</label>
                <input name="score" type="number" min="0" max="100" defaultValue={k.score ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
              </div>
            </div>
          </div>

          {/* Persoonlijk */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Persoonlijke gegevens</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Voornaam *</label><input name="voornaam" required defaultValue={k.voornaam ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tussenvoegsel</label><input name="tussenvoegsel" defaultValue={k.tussenvoegsel ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Achternaam *</label><input name="achternaam" required defaultValue={k.achternaam ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label><input name="email" type="email" defaultValue={k.email ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon</label><input name="telefoon" defaultValue={k.telefoon ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Geslacht</label>
                <select name="geslacht" defaultValue={k.geslacht ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="">—</option><option value="man">Man</option><option value="vrouw">Vrouw</option><option value="anders">Anders</option>
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Leeftijd</label><input name="leeftijd" type="number" min="16" max="99" defaultValue={k.leeftijd ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Woonplaats</label><input name="woonplaats" defaultValue={k.woonplaats ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
            </div>
          </div>

          {/* Werk */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Werk & profiel</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Open voor functies</label><input name="open_voor" defaultValue={k.open_voor ?? ""} placeholder="bv Python Engineer, Sales Manager" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Opleiding</label><input name="opleiding" defaultValue={k.opleiding ?? ""} placeholder="bv HBO Software Engineer" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tarief W&S</label><input name="tarief_ws" defaultValue={k.tarief_ws ?? ""} placeholder="bv 15% bruto jaarsalaris" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Rijbewijs</label><input name="rijbewijs" defaultValue={k.rijbewijs ?? ""} placeholder="bv Ja, B" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
              <div className="flex items-center"><label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="eigen_vervoer" defaultChecked={k.eigen_vervoer ?? false} className="w-4 h-4 accent-[#333399]" />Eigen vervoer</label></div>
            </div>
          </div>

          {/* Notitie */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Notitie</h2>
            <textarea name="notitie" defaultValue={k.notitie ?? ""} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" placeholder="Eigen opmerkingen over deze kandidaat..."></textarea>
          </div>

          {/* Save button */}
          <div>
            <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-8 py-2 rounded-md text-sm">
              Opslaan
            </button>
          </div>
        </form>

        {/* CV upload (separate, has own logic) */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">CV (PDF)</h2>
          <CvUpload kandidaatId={k.id} tenantId={k.tenant_id} huidigeCvUrl={k.cv_url} />
        </div>

        {/* Voorstellen (separate form) */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Voorstellen naar opdrachtgevers</h2>

          {!isRecruiter && (
          <details className="mb-4">
            <summary className="cursor-pointer text-[#333399] font-semibold text-sm py-2">
              Nieuw voorstel versturen
            </summary>
            <form action={stuurVoorstel} className="mt-3 space-y-3">
              <input type="hidden" name="kandidaat_id" value={k.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail opdrachtgever *</label>
                  <input name="opdrachtgever_email" type="email" required placeholder="jan@techcorp.nl" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Naam contactpersoon</label>
                  <input name="opdrachtgever_naam" placeholder="Jan van der Berg" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Persoonlijk bericht (optioneel)</label>
                <textarea name="bericht" rows={3} placeholder="Bijvoorbeeld: 'Sterke match voor jullie openstaande functie...'" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"></textarea>
              </div>
              <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-2 rounded-md text-sm">
                Verstuur voorstel
              </button>
            </form>
          </details>
          )}

          {isRecruiter && (
            <p className="text-sm text-gray-500 italic mb-4">Voorstellen worden door setters verstuurd.</p>
          )}

          {voorstellen && voorstellen.length > 0 ? (
            <div className="space-y-3">
              {voorstellen.map((v) => {
                const bedrijfNaam = v.bedrijf || v.opdrachtgever_naam || "Onbekend";
                const fmtDate = (d: string | null | undefined) =>
                  d ? new Date(d).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" }) : null;
                const reactieLabel =
                  v.status === "uitnodigen"      ? "Uitgenodigd" :
                  v.status === "niet_uitnodigen" ? "Afgewezen" :
                  v.status === "verlopen"        ? "Verlopen" :
                  "Reactie";
                const reactieKleur =
                  v.status === "uitnodigen"      ? "bg-emerald-500" :
                  v.status === "niet_uitnodigen" ? "bg-red-500" :
                  v.status === "verlopen"        ? "bg-gray-500" : "bg-gray-300";
                const reactieText =
                  v.status === "uitnodigen"      ? "text-emerald-700" :
                  v.status === "niet_uitnodigen" ? "text-red-700" :
                  v.status === "verlopen"        ? "text-gray-600" : "text-gray-700";
                const stappen: Array<{ label: string; datum: string | null; kleur: string; tekst?: string }> = [
                  { label: "Verzonden", datum: fmtDate(v.verzonden_op), kleur: "bg-[#333399]" },
                  { label: "Geopend",   datum: fmtDate(v.geopend_op),   kleur: v.geopend_op ? "bg-blue-500" : "bg-gray-300" },
                  { label: reactieLabel, datum: fmtDate(v.reactie_op), kleur: reactieKleur, tekst: reactieText },
                  { label: "Kennismaking", datum: fmtDate(v.kennismaking_op), kleur: v.kennismaking_op ? "bg-amber-500" : "bg-gray-300" },
                ];
                return (
                  <div key={v.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="font-bold text-gray-800">{bedrijfNaam}</div>
                        <div className="text-xs text-gray-500">
                          {v.opdrachtgever_naam && v.bedrijf && <span>{v.opdrachtgever_naam} · </span>}
                          <a href={`mailto:${v.opdrachtgever_email}`} className="text-[#333399] hover:underline">{v.opdrachtgever_email}</a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${VOORSTEL_STATUS_KLEUREN[v.status] ?? "bg-gray-100"}`}>
                          {VOORSTEL_STATUS_LABEL[v.status] ?? v.status}
                        </span>
                        <a href={`/voorstel/${v.token}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#333399] hover:underline">
                          Voorbeeld
                        </a>
                      </div>
                    </div>
                    {/* Tijdlijn */}
                    <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {stappen.map((s) => (
                        <div key={s.label} className="flex items-start gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${s.kleur} mt-1 shrink-0`} />
                          <div className="min-w-0">
                            <div className={`font-semibold ${s.tekst ?? "text-gray-700"}`}>{s.label}</div>
                            <div className="text-gray-500 truncate">{s.datum ?? "—"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Extra info bij groen */}
                    {v.status === "uitnodigen" && (v.contactpersoon || v.contact_telefoon || v.contact_email || v.locatie_url) && (
                      <div className="px-4 py-2 bg-emerald-50/50 border-t border-emerald-100 text-xs text-gray-700">
                        <div className="font-semibold text-emerald-800 mb-1">Contact bij {bedrijfNaam}</div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {v.contactpersoon && <span><b>Naam:</b> {v.contactpersoon}</span>}
                          {v.contact_telefoon && <span><b>Tel:</b> <a href={`tel:${v.contact_telefoon}`} className="text-[#333399] hover:underline">{v.contact_telefoon}</a></span>}
                          {v.contact_email && <span><b>Mail:</b> <a href={`mailto:${v.contact_email}`} className="text-[#333399] hover:underline">{v.contact_email}</a></span>}
                          {v.locatie_url && <span><a href={v.locatie_url} target="_blank" rel="noopener noreferrer" className="text-[#333399] hover:underline">Locatie</a></span>}
                        </div>
                        {v.opmerking && <div className="mt-2 italic text-gray-600">&ldquo;{v.opmerking}&rdquo;</div>}
                      </div>
                    )}
                    {/* Reden bij rood */}
                    {v.status === "niet_uitnodigen" && v.opmerking && (
                      <div className="px-4 py-2 bg-red-50/50 border-t border-red-100 text-xs text-red-800">
                        <b>Reden:</b> {v.opmerking}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nog geen voorstellen verstuurd voor deze kandidaat.</p>
          )}
        </div>

        {/* CV-controle & voorstelprofiel — alleen voor admin/recruiter */}
        {!isSetter && (
          <CvControle
            kandidaatId={k.id}
            cvUrl={k.cv_url ?? null}
            cvControleStatus={k.cv_controle_status ?? "niet_gecontroleerd"}
            cvGeparseerd={k.cv_geparseerd ?? null}
            voorstelprofielToken={k.voorstelprofiel_token ?? null}
            profielschets={k.profielschets ?? null}
            intakeVoltooid={k.intake_voltooid ?? false}
          />
        )}

        {/* Setter ziet alleen voorstelprofiel-link + contact-knop */}
        {isSetter && (
          <div className="bg-white rounded-xl shadow-sm p-6 mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-800">Voorstelprofiel</h2>
              <p className="text-xs text-gray-500 mt-1">Alle relevante info over deze kandidaat in GRYWO-stijl.</p>
            </div>
            <div className="flex items-center gap-2">
              {k.voorstelprofiel_token && (
                <a
                  href={`/voorstelprofiel/${k.voorstelprofiel_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-2 rounded-md text-sm"
                >
                  Open voorstelprofiel
                </a>
              )}
              <ContactRecruiterKnop kandidaatId={k.id} />
            </div>
          </div>
        )}

        {/* Bellijsten (Jobdigger) */}
        {!isRecruiter && (
          <BellijstSectie kandidaatId={k.id} bellijsten={bellijsten} />
        )}

        {/* Voorstel-log */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Tijdlijn</h2>
          {logs && logs.length > 0 ? (
            <ol className="relative border-l-2 border-gray-200 ml-2 space-y-4">
              {logs.map((l) => {
                const evt = EVENT_LABELS[l.event_type] ?? { label: l.event_type, kleur: "bg-gray-100 text-gray-700" };
                return (
                  <li key={l.id} className="ml-4">
                    <div className="absolute -left-[7px] w-3 h-3 rounded-full bg-[#333399] mt-1.5"></div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${evt.kleur}`}>{evt.label}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(l.created_at).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                      {l.zichtbaar_voor_kandidaat && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">kandidaat gemaild</span>
                      )}
                    </div>
                    {l.beschrijving && <p className="text-sm text-gray-700">{l.beschrijving}</p>}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-gray-500">Nog geen voorstel-events.</p>
          )}
        </div>

        {/* Delete button */}
        <div className="mt-6 flex justify-end">
          <DeleteButton id={k.id} />
        </div>

        <div className="mt-6 text-xs text-gray-400 text-center">
          Aangemaakt: {new Date(k.created_at).toLocaleString("nl-NL")} · Laatst gewijzigd: {new Date(k.updated_at).toLocaleString("nl-NL")}
        </div>
      </div>
    </main>
  );
}
