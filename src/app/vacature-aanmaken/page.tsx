import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TopBar } from "@/components/TopBar";
import { zetVacatureStatus, maakRobinZoekJob } from "./actions";

export const metadata = { title: "Vacature aanmaken" };

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
    .select("rol")
    .eq("id", user.id)
    .single();

  const rol = (ownProfiel?.rol ?? "").toString().toLowerCase();
  const isAdmin = rol === "admin" || rol === "super-admin" || rol === "super_admin";

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

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
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
                  return (
                    <tr key={v.id} className="border-t border-gray-100 align-top">
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
                        <div className="flex justify-end gap-2">
                          {v.status === "open" && (
                            <form action={maakRobinZoekJob}>
                              <input type="hidden" name="vacature" value={v.id} />
                              <input type="hidden" name="functie" value={v.titel} />
                              <button
                                type="submit"
                                className="text-xs font-semibold text-emerald-700 hover:underline"
                              >
                                Zoek kandidaten
                              </button>
                            </form>
                          )}
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
                              <button
                                type="submit"
                                className="text-xs text-red-600 hover:underline"
                              >
                                Sluiten
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
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
