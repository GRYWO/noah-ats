import Link from "next/link";
import { GrywoLogo } from "@/components/GrywoLogo";
import { CheckCircle2 } from "lucide-react";

export default function VerwijderdPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f7] py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="bg-[#333399] rounded-2xl p-6 mb-6 inline-flex items-center justify-center w-full">
          <GrywoLogo size="lg" wit={true} />
        </div>
        <div className="bg-white rounded-2xl shadow-md p-10">
          <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gegevens verwijderd</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Je persoonsgegevens zijn uit Noah ATS verwijderd. Eventuele lopende sollicitaties zijn gestopt.
            Een verwijderverzoek is gelogd voor onze administratie (alleen anonieme tijdsregistratie).
          </p>
          <Link href="/" className="inline-block mt-6 text-sm font-semibold text-[#333399] hover:underline">
            Sluit deze pagina
          </Link>
        </div>
      </div>
    </main>
  );
}
