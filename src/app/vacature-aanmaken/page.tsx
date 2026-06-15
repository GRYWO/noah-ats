import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TopBar } from "@/components/TopBar";
import { zetVacatureStatus } from "./actions";

export const metadata = { title: "Vacature aanmaken" };

type Vacature = {
  id: string;
  titel: string;
  locatie: string | null;
  dienstverband: string | null;
  status: string;
  aangemaakt: string;
};

function formatDatum(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default async function VacatureAanmakenLijst() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .select("voornaam, achternaam, mail_adres, rol")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();
  const { data: vacatures } = await admin
    .from("rec_vacatures")
    .select("id, titel, locatie, dienstverband, status, aangemaakt")
    .eq("eigenaar", user.id)
    .order("aangemaakt", { ascending: false });

  const lijst = (vacatures ?? []) as Vacature[];

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="vacature-aanmaken" />
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Vacatures op jouw naam</h1>
            <p className="text-gray-500 text-sm mt-1">
              Vacatures die jij als setter publiceert op noah-recruitment.nl. Kandidaten zien jouw naam als contactpersoon.
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
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Aangemaakt</th>
                  <th className="text-right px-4 py-3">Acties</th>
                </tr>
              </thead>
              <tbody>
                {lijst.map((v) => (
                  <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
