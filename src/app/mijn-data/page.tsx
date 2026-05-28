import { GrywoLogo } from "@/components/GrywoLogo";
import { MijnDataForm } from "./MijnDataForm";

export const metadata = { title: "Mijn gegevens — Noah ATS" };

export default function MijnDataPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f7] py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-[#333399] rounded-2xl p-5 mb-4 flex items-center justify-center">
          <GrywoLogo size="md" wit={true} />
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mijn gegevens</h1>
          <p className="text-sm text-gray-600 mb-6">
            Onder de AVG (artikel 15 + 17) heb je recht op <b>inzage</b> in je gegevens en op <b>verwijdering</b>.
            Vul hieronder je e-mailadres in waarmee je bij ons bekend bent — wij sturen je een persoonlijke link
            waarmee je je gegevens kunt bekijken of laten wissen.
          </p>

          <MijnDataForm />

          <div className="mt-6 pt-4 border-t text-xs text-gray-500">
            De link is <b>1 uur geldig</b> en kan eenmalig gebruikt worden. Geen mail ontvangen?
            Check je spam-map of mail <a href="mailto:info@grywo.nl" className="text-[#333399] font-semibold">info@grywo.nl</a>.
          </div>
        </div>

        <div className="text-center py-5 text-xs text-gray-500">
          Onze volledige <a href="/privacy" className="text-[#333399] font-semibold">privacyverklaring</a>
        </div>
      </div>
    </main>
  );
}
