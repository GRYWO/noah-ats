import { GrywoLogo } from "@/components/GrywoLogo";

export default function BedanktPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f4f4f7] p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md p-10 text-center">
        <div className="bg-[#333399] rounded-xl px-5 py-3 mb-6 inline-block">
          <GrywoLogo size="md" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Bedankt</h1>
        <p className="text-gray-600 mb-6">
          Je reactie is ontvangen. De kandidaat krijgt direct een mail met alle informatie.
        </p>
        <p className="text-sm text-gray-400">
          Vragen? Mail <a href="mailto:noah@grywo.nl" className="text-[#333399] hover:underline">noah@grywo.nl</a>
        </p>
      </div>
    </main>
  );
}
