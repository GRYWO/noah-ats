import Link from "next/link";
import { Fragment } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TopBar } from "@/components/TopBar";
import { zetVacatureStatus, verwijderVacature, maakRobinZoekJob, maakJobdiggerZoekJob, hernoemJobdiggerLijst, verwijderJobdiggerLijst, vergrootJobdiggerLijst, maakVoorstelprofielVanKandidaat, onthulTelefoon, stelKandidaatVoor } from "./actions";
import { SubmitKnop } from "./SubmitKnop";
import { AutoVernieuw } from "./AutoVernieuw";
import { LinkedInKnop } from "./LinkedInKnop";

// Herkenning van uitzend-/bemiddelingsbureaus, zodat die onderaan komen: we
// willen liefst direct de werkgever bellen, niet een ander bureau.
const BUREAU = /uitzend|flex|payroll|detacher|detach|secondment|personeel|staffing|recruit|werving|selectie|bemiddel|talent|vacature|\bbanen\b|\bjobs\b|workforce|randstad|tempo[\s-]?team|adecco|manpower|\byacht\b|olympia|\bluba\b|\btiming\b|start ?people|young ?capital|\bunique\b|driessen|continu|maandag|\busg\b|covebo|jobbird|actief|tence|\botto\b|abu\b/i;

// Vacatures met telefoonnummer bovenaan, uitzendbureaus onderaan.
function sorteerVondsten(vondsten: JobdiggerVondst[]): JobdiggerVondst[] {
  return [...vondsten].sort((a, b) => {
    const aBureau = BUREAU.test(a.bedrijf ?? "") ? 1 : 0;
    const bBureau = BUREAU.test(b.bedrijf ?? "") ? 1 : 0;
    if (aBureau !== bBureau) return aBureau - bBureau; // bureaus onderaan
    const aTel = a.telefoon ? 0 : 1;
    const bTel = b.telefoon ? 0 : 1;
    if (aTel !== bTel) return aTel - bTel; // mét telefoon bovenaan
    return 0;
  });
}

export const metadata = { title: "Vacature aanmaken" };

type JobdiggerVondst = {
  id: string;
  titel: string | null;
  bedrijf: string | null;
  plaats: string | null;
  url: string | null;
  telefoon: string | null;
  datum: string | null;
  jobdigger_url: string | null;
};

type JobdiggerLijst = {
  id: string;
  naam: string;
  limiet: number;
  vondsten: JobdiggerVondst[];
};

type Kandidaat = {
  id: string;
  naam: string | null;
  plaats: string | null;
  telefoon: string | null;
  website: string | null;
  cv_url: string | null;
  match_score: number | null;
  match_reden: string | null;
  voorstelprofiel_token: string | null;
  telefoon_status: string | null;
  email: string | null;
  voorgesteld_at: string | null;
  bezig?: boolean;
};

type Vacature = {
  id: string;
  titel: string;
  locatie: string | null;
  dienstverband: string | null;
  status: string;
  aangemaakt: string;
  eigenaar: string | null;
  afspraak_tarief_type: string | null;
  afspraak_ws_percentage: number | null;
  afspraak_ws_toelichting: string | null;
  afspraak_uitzend_factor: number | null;
  afspraak_uitzend_uren_per_week: string | null;
  afspraak_overname_na_uren: number | null;
};

type Profiel = { id: string; voornaam: string | null; achternaam: string | null };

function formatDatum(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function naamVoor(p: Profiel | undefined): string {
  if (!p) return "Onbekend";
  const n = [p.voornaam, p.achternaam].filter(Boolean).join(" ").trim();
  return n || "Onbekend";
}

function korteAfspraak(v: Vacature): string {
  switch (v.afspraak_tarief_type) {
    case "ws_10":
      return "W&S 10 procent";
    case "ws_15":
      return "W&S 15 procent";
    case "ws_anders":
      return v.afspraak_ws_percentage != null
        ? `W&S ${v.afspraak_ws_percentage} procent`
        : "W&S afwijkend";
    case "uitzend":
      return v.afspraak_uitzend_factor != null
        ? `Uitzend ${v.afspraak_uitzend_factor}x`
        : "Uitzend";
    default:
      return "Geen afspraak";
  }
}

export default async function VacatureAanmakenLijst() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ownProfiel } = await supabase
    .from("profiles")
    .select("rol, tenant_id, voornaam")
    .eq("id", user.id)
    .single();
  const setterVoornaam = ((ownProfiel as { voornaam?: string } | null)?.voornaam ?? "").toString().trim();

  const rol = (ownProfiel?.rol ?? "").toString().toLowerCase();
  const isAdmin = rol === "admin" || rol === "super-admin" || rol === "super_admin";
  const tenantId = (ownProfiel as { tenant_id?: string } | null)?.tenant_id ?? null;

  const admin = createAdminClient();

  const baseSelect =
    "id, titel, locatie, dienstverband, status, aangemaakt, eigenaar, " +
    "afspraak_tarief_type, afspraak_ws_percentage, afspraak_ws_toelichting, " +
    "afspraak_uitzend_factor, afspraak_uitzend_uren_per_week, afspraak_overname_na_uren";

  const query = admin
    .from("rec_vacatures")
    .select(baseSelect)
    .order("aangemaakt", { ascending: false });

  const { data: vacatures } = isAdmin
    ? await query
    : await query.eq("eigenaar", user.id);

  const lijst = ((vacatures ?? []) as unknown) as Vacature[];

  // Eigenaar-namen ophalen (alleen voor admin-view).
  const eigenaarNamen = new Map<string, Profiel>();
  if (isAdmin && lijst.length > 0) {
    const ids = Array.from(new Set(lijst.map((v) => v.eigenaar).filter(Boolean) as string[]));
    if (ids.length > 0) {
      const { data: profielen } = await admin
        .from("profiles")
        .select("id, voornaam, achternaam")
        .in("id", ids);
      for (const p of (profielen ?? []) as Profiel[]) {
        eigenaarNamen.set(p.id, p);
      }
    }
  }

  // Jobdigger: lopende opdracht + de gevonden vacatures gegroepeerd per zoeklijst.
  let jobdiggerLoopt = false;
  let lijsten: JobdiggerLijst[] = [];
  if (tenantId) {
    const { data: lopend } = await admin
      .from("zoek_jobs")
      .select("status")
      .eq("tenant_id", tenantId)
      .eq("type", "jobdigger")
      .in("status", ["open", "bezig"])
      .limit(1);
    jobdiggerLoopt = (lopend ?? []).length > 0;

    const { data: jobs } = await admin
      .from("zoek_jobs")
      .select("id, lijst_naam, zoekterm, created_at, limiet")
      .eq("tenant_id", tenantId)
      .eq("type", "jobdigger")
      .in("status", ["klaar", "bezig", "open"])
      .order("created_at", { ascending: false })
      .limit(20);

    const jobIds = (jobs ?? []).map((j) => j.id as string);
    let vd: Array<JobdiggerVondst & { job_id: string }> = [];
    if (jobIds.length) {
      const res = await admin
        .from("jobdigger_vondsten")
        .select("id, titel, bedrijf, plaats, url, telefoon, datum, jobdigger_url, job_id")
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });
      vd = (res.data ?? []) as unknown as Array<JobdiggerVondst & { job_id: string }>;
    }

    const perJob = new Map<string, JobdiggerVondst[]>();
    for (const v of vd) {
      const arr = perJob.get(v.job_id) ?? [];
      arr.push(v);
      perJob.set(v.job_id, arr);
    }

    lijsten = (jobs ?? [])
      .map((j) => ({
        id: j.id as string,
        naam: ((j.lijst_naam as string | null) ?? (j.zoekterm as string)) || "Zoeklijst",
        limiet: Number((j as { limiet?: number }).limiet) || 50,
        vondsten: sorteerVondsten(perJob.get(j.id as string) ?? []),
      }))
      .filter((l) => l.vondsten.length > 0);
  }

  // Kandidaten (Robin): de meest recente bellijst per vacature + items (gerangschikt).
  const kandidatenPerVac = new Map<string, Kandidaat[]>();
  let robinLoopt = false;
  let telefoonLoopt = false;
  const bezigItems = new Set<string>();
  if (tenantId && lijst.length > 0) {
    const vacIds = lijst.map((v) => v.id);
    const { data: rl } = await admin
      .from("zoek_jobs")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("type", "robin")
      .in("status", ["open", "bezig"])
      .limit(1);
    robinLoopt = (rl ?? []).length > 0;

    // Lopende telefoon-onthul-opdrachten: welke kandidaten zijn 'bezig'.
    const { data: telJobs } = await admin
      .from("zoek_jobs")
      .select("doel_item_id")
      .eq("tenant_id", tenantId)
      .eq("type", "robin_telefoon")
      .in("status", ["open", "bezig"]);
    for (const j of telJobs ?? []) {
      const id = (j as { doel_item_id: string | null }).doel_item_id;
      if (id) bezigItems.add(id);
    }
    telefoonLoopt = bezigItems.size > 0;

    const { data: bl } = await admin
      .from("bellijsten")
      .select("id, vacature_id, created_at")
      .in("vacature_id", vacIds)
      .eq("bron", "robin")
      .order("created_at", { ascending: false });

    const nieuwsteBlPerVac = new Map<string, string>();
    for (const b of bl ?? []) {
      const vid = b.vacature_id as string;
      if (vid && !nieuwsteBlPerVac.has(vid)) nieuwsteBlPerVac.set(vid, b.id as string);
    }
    const blToVac = new Map(Array.from(nieuwsteBlPerVac.entries()).map(([vid, bid]) => [bid, vid]));
    const blIds = Array.from(nieuwsteBlPerVac.values());
    if (blIds.length) {
      const { data: items } = await admin
        .from("bellijst_items")
        .select("id, bellijst_id, naam, plaats, telefoon, website, cv_url, match_score, match_reden, volgorde, voorstelprofiel_token, telefoon_status, email, voorgesteld_at")
        .in("bellijst_id", blIds)
        .order("volgorde", { ascending: true });
      for (const it of items ?? []) {
        const vid = blToVac.get((it as { bellijst_id: string }).bellijst_id);
        if (!vid) continue;
        const arr = kandidatenPerVac.get(vid) ?? [];
        const kand = it as unknown as Kandidaat;
        kand.bezig = bezigItems.has(kand.id);
        arr.push(kand);
        kandidatenPerVac.set(vid, arr);
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <AutoVernieuw snel={jobdiggerLoopt || robinLoopt || telefoonLoopt} />
      <TopBar active="vacature-aanmaken" />
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {isAdmin ? "Alle vacatures (admin-overzicht)" : "Vacatures op jouw naam"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {isAdmin
                ? "Je ziet alle vacatures van alle setters, inclusief de interne afspraken."
                : "Vacatures die jij als setter publiceert op noah-recruitment.nl. Kandidaten zien jouw naam als contactpersoon."}
            </p>
          </div>
          <Link
            href="/vacature-aanmaken/nieuw"
            className="rounded-lg bg-[#333399] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#27277a] transition"
          >
            Nieuwe vacature
          </Link>
        </div>

        {/* Stap 2/3: Jobdigger-zoekbalk + gevonden vacatures */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-800">Vacatures zoeken via Jobdigger</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Zoek op beroep. De machine draait de zoekopdracht op de achtergrond en levert hier de gevonden vacatures aan.
          </p>
          <form action={maakJobdiggerZoekJob} className="mt-3 flex gap-2">
            <input
              name="beroep"
              required
              placeholder="bv. Allround monteur, Heftruckchauffeur, Administratief medewerker"
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
            />
            <SubmitKnop
              bezigTekst="Zoeken…"
              className="rounded-lg bg-[#333399] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#27277a]"
            >
              Vacatures zoeken
            </SubmitKnop>
          </form>

          {jobdiggerLoopt && (
            <p className="mt-3 text-xs font-semibold text-amber-700">
              Zoekopdracht loopt… de resultaten verschijnen hier zodra de machine klaar is.
            </p>
          )}

          {lijsten.map((lijst) => (
            <details key={lijst.id} open className="mt-4 rounded-lg border border-gray-200">
              <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-gray-800">
                {lijst.naam} <span className="text-gray-400 font-normal">· {lijst.vondsten.length} vacatures</span>
              </summary>
              <div className="border-t border-gray-100 p-3">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <form action={hernoemJobdiggerLijst} className="flex items-center gap-2">
                    <input type="hidden" name="jobId" value={lijst.id} />
                    <input
                      name="naam"
                      defaultValue={lijst.naam}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
                    />
                    <SubmitKnop bezigTekst="Opslaan…" className="text-xs font-semibold text-[#333399] hover:underline">
                      Naam opslaan
                    </SubmitKnop>
                  </form>
                  <form action={vergrootJobdiggerLijst}>
                    <input type="hidden" name="jobId" value={lijst.id} />
                    <SubmitKnop bezigTekst="Zoeken…" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                      Zoek 50 meer
                    </SubmitKnop>
                  </form>
                  <form action={verwijderJobdiggerLijst}>
                    <input type="hidden" name="jobId" value={lijst.id} />
                    <SubmitKnop bezigTekst="Verwijderen…" className="text-xs font-semibold text-red-600 hover:underline">
                      Lijst verwijderen
                    </SubmitKnop>
                  </form>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Functie</th>
                        <th className="px-4 py-2 text-left">Bedrijf</th>
                        <th className="px-4 py-2 text-left">Plaats</th>
                        <th className="px-4 py-2 text-left">Telefoon</th>
                        <th className="px-4 py-2 text-left">Website</th>
                        <th className="px-4 py-2 text-left">Datum</th>
                        <th className="px-4 py-2 text-right">Actie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lijst.vondsten.map((vd) => (
                        <tr key={vd.id} className="border-t border-gray-100">
                          <td className="px-4 py-2 text-gray-800">
                            {vd.jobdigger_url ? (
                              <a href={vd.jobdigger_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#333399] hover:underline" title="Bekijk de vacature op Jobdigger">
                                {vd.titel ?? "Onbekende functie"}
                              </a>
                            ) : (
                              vd.titel ?? "Onbekende functie"
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600">{vd.bedrijf ?? "-"}</td>
                          <td className="px-4 py-2 text-gray-600">{vd.plaats ?? "-"}</td>
                          <td className="px-4 py-2 text-gray-600">
                            {vd.telefoon ? (
                              <a href={`tel:${vd.telefoon}`} className="text-[#333399] hover:underline">{vd.telefoon}</a>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {vd.url ? (
                              <a href={vd.url.startsWith("http") ? vd.url : `https://${vd.url}`} target="_blank" rel="noopener noreferrer" className="text-[#333399] hover:underline">
                                {vd.url.replace(/^https?:\/\//, "")}
                              </a>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-2 text-gray-500">{vd.datum ?? "-"}</td>
                          <td className="px-4 py-2 text-right">
                            <Link
                              href={`/vacature-aanmaken/nieuw?vondst=${vd.id}`}
                              className="text-xs font-semibold text-emerald-700 hover:underline"
                            >
                              Controleer en plaats
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {lijst.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-sm">
              Je hebt nog geen vacatures aangemaakt. Klik op &quot;Nieuwe vacature&quot; om te beginnen.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3">Titel</th>
                  <th className="text-left px-4 py-3">Locatie</th>
                  <th className="text-left px-4 py-3">Dienstverband</th>
                  {isAdmin && <th className="text-left px-4 py-3">Eigenaar</th>}
                  <th className="text-left px-4 py-3">Afspraak</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Aangemaakt</th>
                  <th className="text-right px-4 py-3">Acties</th>
                </tr>
              </thead>
              <tbody>
                {lijst.map((v) => {
                  const eigenaar = v.eigenaar ? eigenaarNamen.get(v.eigenaar) : undefined;
                  const kandidaten = kandidatenPerVac.get(v.id) ?? [];
                  const kolommen = isAdmin ? 8 : 7;
                  return (
                    <Fragment key={v.id}>
                    <tr className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        <a
                          href={`https://noah-recruitment.nl/vacatures/${v.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#333399] hover:underline"
                        >
                          {v.titel}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{v.locatie ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{v.dienstverband ?? "-"}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-gray-600">{naamVoor(eigenaar)}</td>
                      )}
                      <td className="px-4 py-3">
                        <details className="group">
                          <summary className="cursor-pointer list-none text-xs font-semibold text-[#333399] hover:underline">
                            {korteAfspraak(v)}
                            <span className="ml-1 text-gray-400 group-open:hidden">(toon)</span>
                            <span className="ml-1 text-gray-400 hidden group-open:inline">(verberg)</span>
                          </summary>
                          <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-700 space-y-1">
                            <AfspraakDetails v={v} />
                          </div>
                        </details>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            v.status === "open"
                              ? "inline-block text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800"
                              : "inline-block text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                          }
                        >
                          {v.status === "open" ? "Open" : "Gesloten"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDatum(v.aangemaakt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {v.status === "open" && (
                            <form action={maakRobinZoekJob}>
                              <input type="hidden" name="vacature" value={v.id} />
                              <input type="hidden" name="functie" value={v.titel} />
                              <SubmitKnop
                                bezigTekst="Bezig…"
                                className="text-xs font-semibold text-emerald-700 hover:underline"
                              >
                                Zoek kandidaten
                              </SubmitKnop>
                            </form>
                          )}
                          <Link
                            href={`/vacature-aanmaken/${v.id}/bewerken`}
                            className="text-xs font-semibold text-[#333399] hover:underline"
                          >
                            Bewerken
                          </Link>
                          <a
                            href={`https://noah-recruitment.nl/vacatures/${v.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#333399] hover:underline"
                          >
                            Bekijk live
                          </a>
                          {v.status === "open" && (
                            <form action={zetVacatureStatus}>
                              <input type="hidden" name="id" value={v.id} />
                              <input type="hidden" name="status" value="gesloten" />
                              <SubmitKnop
                                bezigTekst="Sluiten…"
                                className="text-xs text-gray-500 hover:underline"
                              >
                                Sluiten
                              </SubmitKnop>
                            </form>
                          )}
                          <form
                            action={verwijderVacature}
                          >
                            <input type="hidden" name="id" value={v.id} />
                            <SubmitKnop
                              bezigTekst="Verwijderen…"
                              className="text-xs font-semibold text-red-600 hover:underline"
                            >
                              Verwijderen
                            </SubmitKnop>
                          </form>
                        </div>
                      </td>
                    </tr>
                    {(kandidaten.length > 0 || robinLoopt) && (
                      <tr className="bg-gray-50/40">
                        <td colSpan={kolommen} className="px-4 pb-4">
                          <KandidatenPaneel kandidaten={kandidaten} loopt={robinLoopt} vacatureId={v.id} vacatureTitel={v.titel} setterVoornaam={setterVoornaam} />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}

function KandidatenPaneel({
  kandidaten,
  loopt,
  vacatureId,
  vacatureTitel,
  setterVoornaam,
}: {
  kandidaten: Kandidaat[];
  loopt: boolean;
  vacatureId: string;
  vacatureTitel: string;
  setterVoornaam: string;
}) {
  // Persoonlijk bericht met vacaturelink: voor WhatsApp (url-encoded) en om te
  // kopiëren (LinkedIn ondersteunt geen vooraf ingevuld bericht via een link).
  const ik = setterVoornaam || "een recruiter";
  const bericht =
    `Hoi! Ik ben ${ik} van Noah Recruitment. Ik kwam je profiel tegen en deze functie past volgens mij echt goed bij je: ${vacatureTitel}. ` +
    `Bekijk 'm hier: https://noah-recruitment.nl/vacatures/${vacatureId} — lijkt het je wat? Ik hoor graag van je!`;
  const waBericht = encodeURIComponent(bericht);
  const linkedinUrl = (k: Kandidaat) =>
    k.website && /linkedin\.com/i.test(k.website)
      ? k.website
      : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${k.naam ?? ""} ${k.plaats ?? ""}`.trim())}`;
  return (
    <details open className="rounded-lg border border-gray-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-semibold text-gray-800">
        Kandidaten (Robin){" "}
        <span className="font-normal text-gray-400">
          · {kandidaten.length}
          {loopt ? " · zoekt…" : ""}
        </span>
      </summary>
      <div className="border-t border-gray-100 p-3">
        {kandidaten.length === 0 ? (
          <p className="text-xs font-semibold text-amber-700">
            Zoekopdracht loopt… de kandidaten verschijnen hier vanzelf zodra de machine klaar is.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Match</th>
                  <th className="px-3 py-2 text-left">Naam</th>
                  <th className="px-3 py-2 text-left">Plaats</th>
                  <th className="px-3 py-2 text-left">Telefoon</th>
                  <th className="px-3 py-2 text-left">CV / profiel</th>
                  <th className="px-3 py-2 text-left">Waarom</th>
                </tr>
              </thead>
              <tbody>
                {kandidaten.map((k, i) => (
                  <tr key={k.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      {k.match_score != null ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          {k.match_score}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800">{k.naam ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{k.plaats ?? "—"}</td>
                    <td className="px-3 py-2 align-top text-gray-600">
                      <div className="flex flex-col gap-1.5">
                        {k.telefoon ? (
                          <span className="flex flex-wrap items-center gap-2">
                            <a href={`tel:${k.telefoon}`} className="font-medium text-gray-800 hover:text-[#333399]">
                              {k.telefoon}
                            </a>
                            <a
                              href={`https://wa.me/${k.telefoon.replace(/[^0-9]/g, "").replace(/^0/, "31")}?text=${waBericht}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-full border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              WhatsApp
                            </a>
                          </span>
                        ) : k.bezig ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
                            Bezig met onthullen…
                          </span>
                        ) : k.telefoon_status === "niet_beschikbaar" ? (
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-400">Niet beschikbaar</span>
                            <form action={onthulTelefoon}>
                              <input type="hidden" name="itemId" value={k.id} />
                              <SubmitKnop bezigTekst="Onthullen…" className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-[#333399] hover:bg-gray-50">
                                Opnieuw
                              </SubmitKnop>
                            </form>
                          </span>
                        ) : (
                          <form action={onthulTelefoon}>
                            <input type="hidden" name="itemId" value={k.id} />
                            <SubmitKnop bezigTekst="Onthullen…" className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-[#333399] hover:bg-gray-50">
                              Onthul telefoon
                            </SubmitKnop>
                          </form>
                        )}
                        <span className="flex flex-wrap items-center gap-2">
                          <LinkedInKnop url={linkedinUrl(k)} bericht={bericht} />
                          {k.email ? (
                            <a
                              href={`mailto:${k.email}?subject=${encodeURIComponent("Een functie die bij je past")}&body=${waBericht}`}
                              className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-[#333399] hover:bg-gray-50"
                            >
                              E-mail
                            </a>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-col items-start gap-1.5">
                        {k.voorstelprofiel_token ? (
                          <a
                            href={`https://noah-recruitment.nl/voorstelprofiel/${k.voorstelprofiel_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-full border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            Voorstelprofiel
                          </a>
                        ) : (
                          <form action={maakVoorstelprofielVanKandidaat}>
                            <input type="hidden" name="itemId" value={k.id} />
                            <SubmitKnop bezigTekst="Bezig…" className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-[#333399] hover:bg-gray-50">
                              Maak voorstelprofiel
                            </SubmitKnop>
                          </form>
                        )}
                        {k.voorgesteld_at ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                            Voorgesteld ✓
                          </span>
                        ) : (
                          <form action={stelKandidaatVoor}>
                            <input type="hidden" name="itemId" value={k.id} />
                            <SubmitKnop bezigTekst="Versturen…" className="inline-flex items-center rounded-full bg-[#333399] px-3 py-1 text-xs font-semibold text-white hover:bg-[#27277a]">
                              Stel voor
                            </SubmitKnop>
                          </form>
                        )}
                        {k.website ? (
                          <a href={k.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 hover:underline">
                            Robin
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{k.match_reden ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}

function AfspraakDetails({ v }: { v: Vacature }) {
  if (!v.afspraak_tarief_type) {
    return <p className="text-gray-500">Geen interne afspraak vastgelegd.</p>;
  }

  if (v.afspraak_tarief_type === "ws_10" || v.afspraak_tarief_type === "ws_15") {
    return (
      <>
        <p>
          <span className="font-semibold">Soort:</span> Werving en selectie
        </p>
        <p>
          <span className="font-semibold">Percentage:</span>{" "}
          {v.afspraak_ws_percentage ?? (v.afspraak_tarief_type === "ws_10" ? 10 : 15)} procent
        </p>
        {v.afspraak_tarief_type === "ws_10" && (
          <p className="text-gray-500">Speciaal tarief uitzendbureaus.</p>
        )}
      </>
    );
  }

  if (v.afspraak_tarief_type === "ws_anders") {
    return (
      <>
        <p>
          <span className="font-semibold">Soort:</span> Werving en selectie (afwijkend)
        </p>
        <p>
          <span className="font-semibold">Percentage:</span>{" "}
          {v.afspraak_ws_percentage != null ? `${v.afspraak_ws_percentage} procent` : "onbekend"}
        </p>
        {v.afspraak_ws_toelichting && (
          <p>
            <span className="font-semibold">Toelichting:</span> {v.afspraak_ws_toelichting}
          </p>
        )}
      </>
    );
  }

  if (v.afspraak_tarief_type === "uitzend") {
    return (
      <>
        <p>
          <span className="font-semibold">Soort:</span> Uitzendbasis
        </p>
        {v.afspraak_uitzend_factor != null && (
          <p>
            <span className="font-semibold">Factor:</span> {v.afspraak_uitzend_factor}
          </p>
        )}
        {v.afspraak_uitzend_uren_per_week && (
          <p>
            <span className="font-semibold">Uren per week:</span> {v.afspraak_uitzend_uren_per_week}
          </p>
        )}
        {v.afspraak_overname_na_uren != null && (
          <p>
            <span className="font-semibold">Overname na:</span> {v.afspraak_overname_na_uren} uren
          </p>
        )}
      </>
    );
  }

  return <p className="text-gray-500">Onbekende afspraak.</p>;
}
