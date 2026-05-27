import Link from "next/link";

export const metadata = {
  title: "Privacybeleid — Noah ATS",
  description: "Privacybeleid van Noah ATS en de Chrome-extensie Noah ATS — Embed Helper.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f7] py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-10">
        <div className="bg-[#333399] rounded-xl p-5 mb-8 inline-flex items-baseline">
          <span className="text-white text-3xl font-black tracking-tighter">noah</span>
          <span className="ml-2 w-2.5 h-2.5 rounded-full bg-[#ffd84d] inline-block"></span>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">Privacybeleid</h1>
        <p className="text-sm text-gray-500 mb-8">Laatst bijgewerkt: 27 mei 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-5">
          <p>
            Dit privacybeleid is van toepassing op <b>Noah ATS</b> (het ATS-platform op{" "}
            <a href="https://noah-ats.nl" className="text-[#333399] underline">noah-ats.nl</a>) en op de Chrome-extensie{" "}
            <b>Noah ATS — Embed Helper</b>. Beide worden aangeboden door GRYWO.
          </p>

          <h2 className="text-xl font-bold text-gray-800 mt-8 mb-2">1. Wie verwerkt jouw gegevens?</h2>
          <p>
            <b>GRYWO</b> · Woerden, Nederland · <a href="mailto:noreply@grywo.nl" className="text-[#333399] underline">noreply@grywo.nl</a> · 085-4016082
          </p>

          <h2 className="text-xl font-bold text-gray-800 mt-8 mb-2">2. Chrome-extensie — Noah ATS Embed Helper</h2>
          <p>De extensie:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><b>Verzamelt geen persoonsgegevens.</b> Geen tracking, geen analytics, geen advertentie-IDs.</li>
            <li><b>Verstuurt geen gegevens naar externe servers</b> behalve Noah ATS, Recruit Robin en Jobdigger — de drie systemen die je zelf gebruikt.</li>
            <li>Slaat lokaal in de browser (<code>chrome.storage</code>) alleen de ID op van de kandidaat die je in Noah ATS open hebt staan, zodat downloads automatisch aan de juiste kandidaat gekoppeld worden.</li>
            <li>Wijzigt iframe-headers van Robin en Jobdigger zodat deze tools binnen Noah ATS in een ingebed scherm kunnen worden geladen.</li>
            <li>Heeft alleen toegang tot recruitrobin.com, jobdigger.nl en noah-ats.nl — geen enkele andere website.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-800 mt-8 mb-2">3. Noah ATS — gegevens binnen het platform</h2>
          <p>
            Noah ATS verwerkt namens recruitment-bureaus persoonsgegevens van kandidaten (naam, contactgegevens, CV, opmerkingen) en
            opdrachtgevers. Bureaus zijn verwerkingsverantwoordelijke voor deze data; GRYWO is verwerker. Data wordt opgeslagen
            binnen de EU (Supabase, Resend, Vercel) en alleen gebruikt voor de werking van het ATS-platform.
          </p>

          <h2 className="text-xl font-bold text-gray-800 mt-8 mb-2">4. Subverwerkers</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><b>Supabase</b> (database + opslag) — EU-regio</li>
            <li><b>Resend</b> (e-mailverzending)</li>
            <li><b>Vercel</b> (hosting)</li>
            <li><b>Anthropic</b> (AI-CV-parsing en profielschets — geen permanente opslag)</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-800 mt-8 mb-2">5. Jouw rechten</h2>
          <p>
            Je hebt het recht op inzage, correctie en verwijdering van je gegevens, plus dataportabiliteit.
            Stuur een verzoek naar{" "}
            <a href="mailto:noreply@grywo.nl" className="text-[#333399] underline">noreply@grywo.nl</a>{" "}
            — we reageren binnen 30 dagen.
          </p>

          <h2 className="text-xl font-bold text-gray-800 mt-8 mb-2">6. Cookies</h2>
          <p>
            Noah ATS gebruikt alleen functionele cookies die nodig zijn voor inloggen en het onthouden van voorkeuren.
            Geen tracking, geen advertenties.
          </p>

          <h2 className="text-xl font-bold text-gray-800 mt-8 mb-2">7. Wijzigingen</h2>
          <p>
            Bij wijzigingen op dit beleid wordt de datum bovenaan bijgewerkt. Wezenlijke wijzigingen melden we per e-mail aan ingelogde gebruikers.
          </p>
        </div>

        <div className="mt-12 pt-6 border-t text-sm text-gray-500 flex items-center justify-between">
          <Link href="/login" className="text-[#333399] hover:underline font-semibold">← Terug naar login</Link>
          <span>GRYWO · Noah ATS</span>
        </div>
      </div>
    </main>
  );
}
