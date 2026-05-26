import Link from "next/link";
import { vraagNieuwWachtwoordAan } from "./actions";

export default async function WachtwoordVergetenPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f4f4f7] p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">
        <div className="bg-[#333399] rounded-xl p-6 mb-8 flex items-baseline justify-center">
          <span className="text-white text-5xl font-black tracking-tighter">noah</span>
          <span className="ml-2 w-3 h-3 rounded-full bg-[#ffd84d] inline-block"></span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Wachtwoord vergeten</h1>
        <p className="text-gray-600 mb-6 text-sm">
          Vul je e-mailadres in. We sturen je direct een nieuw tijdelijk wachtwoord.
        </p>

        {ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            Als er een account bekend is bij dit e-mailadres, is er een nieuwe inlog verzonden. Controleer je inbox (en spam-folder).
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <form action={vraagNieuwWachtwoordAan} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">E-mailadres</label>
            <input
              type="email"
              name="email"
              required
              placeholder="jij@grywo.nl"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#333399]"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold py-3 rounded-lg transition"
          >
            Nieuw wachtwoord toesturen
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-[#333399] hover:underline font-semibold">
            ← Terug naar inloggen
          </Link>
        </div>
      </div>
    </main>
  );
}
