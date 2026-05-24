import Link from "next/link";
import { stuurMail } from "./actions";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ reply_to?: string; subject?: string; error?: string }>;
}) {
  const { reply_to, subject, error } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f4f4f7]">
      <div className="bg-[#333399] h-16 flex items-center px-6 shadow-md">
        <Link href="/dashboard" className="flex items-baseline">
          <span className="text-white text-3xl font-black tracking-tighter">noah</span>
          <span className="ml-1.5 w-2.5 h-2.5 rounded-full bg-[#ffd84d] inline-block"></span>
        </Link>
        <nav className="ml-8 flex gap-1">
          <Link href="/inbox" className="text-white bg-white/15 px-3 py-1.5 text-sm rounded-md">E-mail</Link>
        </nav>
      </div>

      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/inbox" className="text-sm text-gray-600 hover:text-[#333399] mb-3 inline-block">
          ← Terug naar inbox
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-6">Nieuwe mail</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <form action={stuurMail} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Aan *</label>
            <input name="naar" type="email" required defaultValue={reply_to ?? ""} placeholder="ontvanger@bedrijf.nl" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Onderwerp *</label>
            <input name="onderwerp" required defaultValue={subject ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Bericht *</label>
            <textarea name="body" required rows={12} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Hi, ..."></textarea>
            <small className="text-gray-400 text-xs">Je handtekening wordt automatisch toegevoegd.</small>
          </div>
          <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-8 py-2 rounded-md text-sm">
            Verzenden
          </button>
        </form>
      </div>
    </main>
  );
}
