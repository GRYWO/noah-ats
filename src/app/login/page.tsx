import { login } from "./actions";
import { GrywoLogo } from "@/components/GrywoLogo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f4f4f7] p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">
        <div className="bg-[#333399] rounded-xl p-6 mb-3 flex items-baseline justify-center">
          <span className="text-white text-5xl font-black tracking-tighter">noah</span>
          <span className="ml-2 w-3 h-3 rounded-full bg-[#ffd84d] inline-block"></span>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 mb-8 text-xs text-gray-500">
          <span>Powered by</span>
          <GrywoLogo size="md" wit={false} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Welkom terug</h1>
        <p className="text-gray-600 mb-6 text-sm">Log in met je e-mailadres</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              E-mailadres
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="yorith@grywo.nl"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#333399]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Wachtwoord
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#333399]"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold py-3 rounded-lg transition"
          >
            Inloggen
          </button>
        </form>
      </div>
    </main>
  );
}
