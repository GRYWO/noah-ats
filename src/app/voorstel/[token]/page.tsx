import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { afwijzen } from "./actions";
import Link from "next/link";

export default async function VoorstelPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const admin = createAdminClient();
  const { data: voorstel } = await admin
    .from("voorstellen")
    .select("*, kandidaat:kandidaten(*), tenant:tenants(*)")
    .eq("token", token)
    .single();

  if (!voorstel) notFound();

  const k = voorstel.kandidaat;
  const t = voorstel.tenant;

  if (voorstel.status !== "verzonden") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f4f4f7] p-6">
        <div className="bg-white rounded-2xl shadow-xl max-w-md p-8 text-center">
          <div className="bg-[#333399] rounded-xl p-4 mb-6 inline-flex items-baseline">
            <span className="text-white text-3xl font-black tracking-tighter">noah</span>
            <span className="ml-1.5 w-2 h-2 rounded-full bg-[#ffd84d] inline-block"></span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            {voorstel.status === "uitnodigen" ? "Je hebt deze kandidaat uitgenodigd" :
             voorstel.status === "niet_uitnodigen" ? "Je hebt deze kandidaat afgewezen" :
             "Dit voorstel is verlopen"}
          </h1>
          <p className="text-gray-600 text-sm">
            Je reactie is verwerkt. Vragen? Mail <a href={`mailto:noah@grywo.nl`} className="text-[#333399] hover:underline">noah@grywo.nl</a>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#333399] rounded-t-2xl p-6 text-center">
          <div className="inline-flex items-baseline">
            <span className="text-white text-4xl font-black tracking-tighter">noah</span>
            <span className="ml-1.5 w-3 h-3 rounded-full bg-[#ffd84d] inline-block"></span>
          </div>
          <p className="text-white/80 text-sm mt-2">powered by {t.naam}</p>
        </div>

        <div className="bg-white rounded-b-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-[#333399] mb-2">
            Kandidaat voorstel
          </h1>
          {voorstel.opdrachtgever_naam && (
            <p className="text-gray-600 mb-4">Beste {voorstel.opdrachtgever_naam},</p>
          )}
          <p className="text-gray-700 mb-6">
            We hebben een sterke kandidaat voor je openstaande functie:
          </p>

          <div className="bg-gray-50 rounded-lg p-5 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-3">
              {k.voornaam} {k.tussenvoegsel ? `${k.tussenvoegsel} ` : ""}{k.achternaam}
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {k.leeftijd && <tr><td className="py-1 text-gray-500 w-1/3">Leeftijd</td><td className="font-semibold">{k.leeftijd}</td></tr>}
                {k.woonplaats && <tr><td className="py-1 text-gray-500">Woonplaats</td><td className="font-semibold">{k.woonplaats}</td></tr>}
                {k.opleiding && <tr><td className="py-1 text-gray-500">Opleiding</td><td className="font-semibold">{k.opleiding}</td></tr>}
                {k.open_voor && <tr><td className="py-1 text-gray-500">Open voor</td><td className="font-semibold">{k.open_voor}</td></tr>}
                {k.tarief_ws && <tr><td className="py-1 text-gray-500">Tarief</td><td className="font-semibold">{k.tarief_ws}</td></tr>}
                {k.score != null && (
                  <tr><td className="py-1 text-gray-500">Score</td>
                    <td className={`font-bold ${k.score >= 75 ? "text-emerald-600" : k.score >= 50 ? "text-amber-600" : "text-red-500"}`}>
                      {k.score}/100
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {voorstel.bericht && (
            <div className="bg-blue-50 border-l-4 border-[#333399] p-4 mb-6 text-sm text-gray-700 italic">
              &quot;{voorstel.bericht}&quot;
            </div>
          )}

          <p className="text-gray-700 mb-4 font-semibold text-center">
            Wil je deze kandidaat uitnodigen voor een kennismaking?
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Link
              href={`/voorstel/${token}/uitnodigen`}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg text-center transition"
            >
              Uitnodigen
            </Link>
            <form action={afwijzen}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg transition"
              >
                Niet uitnodigen
              </button>
            </form>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            Bij uitnodigen vul je in 1 minuut je bedrijfsgegevens + 3 voorkeursdata in.
          </p>
        </div>
      </div>
    </main>
  );
}
