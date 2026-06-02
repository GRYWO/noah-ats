import Link from "next/link";
import Image from "next/image";
import { Check, X, AlertTriangle } from "lucide-react";
import { behandelVerwijderVerzoek } from "./actions";

type SearchParams = { actie?: string };

export default async function VerwijderVerzoekPagina({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { token } = await params;
  const { actie } = await searchParams;

  // Als geen actie in URL → toon keuze-scherm. Anders → voer direct uit.
  let resultaat: { ok?: boolean; error?: string; actie?: "akkoord" | "weiger" } | null = null;
  if (actie === "akkoord" || actie === "weiger") {
    resultaat = await behandelVerwijderVerzoek(token, actie);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23] text-white flex flex-col">
      <header className="px-8 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-baseline">
          <span className="text-white text-2xl font-black tracking-tighter">noah</span>
          <span className="ml-1.5 w-2 h-2 rounded-full bg-[#ffd84d] inline-block" />
        </Link>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>Powered by</span>
          <Image src="/grywo-logo-wit.png" alt="GRYWO" width={60} height={16} className="opacity-80" />
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 -mt-8">
        <div className="w-full max-w-lg bg-white text-gray-900 rounded-3xl shadow-2xl p-10">
          {!resultaat ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
                <AlertTriangle size={32} />
              </div>
              <h1 className="text-2xl font-black text-center mb-3">Verwijder-verzoek</h1>
              <p className="text-gray-600 text-center mb-8">
                Een setter heeft een verzoek ingediend om een kandidaat te verwijderen.
                Wat wil je doen?
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href={`/verwijder/${token}?actie=akkoord`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl text-center inline-flex items-center justify-center gap-2 transition"
                >
                  <Check size={18} /> Akkoord, verwijder de kandidaat
                </Link>
                <Link
                  href={`/verwijder/${token}?actie=weiger`}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-center inline-flex items-center justify-center gap-2 transition"
                >
                  <X size={18} /> Weigeren
                </Link>
              </div>
            </>
          ) : resultaat.error ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mb-5">
                <X size={32} />
              </div>
              <h1 className="text-2xl font-black text-center mb-3">Kon niet uitvoeren</h1>
              <p className="text-gray-600 text-center mb-6">{resultaat.error}</p>
              <Link href="/" className="block text-center text-sm text-[#333399] hover:underline">
                Terug naar Noah →
              </Link>
            </>
          ) : (
            <>
              <div
                className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 ${
                  resultaat.actie === "akkoord"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {resultaat.actie === "akkoord" ? <Check size={32} /> : <X size={32} />}
              </div>
              <h1 className="text-2xl font-black text-center mb-3">
                {resultaat.actie === "akkoord"
                  ? "Kandidaat verwijderd"
                  : "Verzoek geweigerd"}
              </h1>
              <p className="text-gray-600 text-center mb-6">
                {resultaat.actie === "akkoord"
                  ? "De kandidaat is verwijderd. De setter krijgt een bevestigingsmail en kan nu een nieuwe kandidaat ontvangen."
                  : "Het verzoek is geweigerd. De setter ontvangt hier een mail over."}
              </p>
              <Link href="/" className="block text-center text-sm text-[#333399] hover:underline">
                Terug naar Noah →
              </Link>
            </>
          )}
        </div>
      </section>

      <footer className="px-8 py-6 text-center text-[11px] text-white/40">
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782
      </footer>
    </main>
  );
}
