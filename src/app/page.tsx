import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f4f4f7] p-6">
      <div className="bg-[#333399] rounded-2xl shadow-xl p-12 mb-8 flex items-baseline">
        <span className="text-white text-7xl font-black tracking-tighter">noah</span>
        <span className="ml-2 w-4 h-4 rounded-full bg-[#ffd84d] inline-block"></span>
      </div>
      <p className="text-gray-600 text-lg mb-8">
        Het ATS-platform voor recruitment bureaus
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-8 py-3 rounded-lg transition"
        >
          Inloggen
        </Link>
        <a
          href="mailto:info@noah-ats.nl"
          className="bg-white hover:bg-gray-50 text-[#333399] font-semibold px-8 py-3 rounded-lg border-2 border-[#333399] transition"
        >
          Demo aanvragen
        </a>
      </div>
      <p className="text-xs text-gray-400 mt-12">
        Noah is online
      </p>
    </main>
  );
}
