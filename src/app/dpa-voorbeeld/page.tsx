/**
 * Visuele preview van de inline DPA-tekenflow.
 * Publiek toegankelijk (zit in middleware whitelist).
 * Knoppen werken NIET — alleen voor design-review.
 */
export default function DpaVoorbeeldPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f7] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 mb-4 text-sm">
          <b>👀 Visuele preview</b> — dit is hoe een bureau de DPA zou zien. Knoppen werken nog niet, dit is alleen om het design te beoordelen.
        </div>

        {/* Header banner */}
        <div className="bg-[#333399] rounded-2xl p-5 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex items-baseline">
            <span className="text-white text-3xl font-black tracking-tighter">grywo</span>
            <span className="ml-1 w-2 h-2 rounded-full bg-[#ffd84d] inline-block self-center"></span>
            <span className="ml-3 text-white/70 text-xs">Verwerkersovereenkomst — Noah ATS</span>
          </div>
          <div className="text-white/85 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-[#ffd84d] rounded-full"></span>
            Wachten op handtekening
          </div>
        </div>

        {/* DPA-inhoud */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Verwerkersovereenkomst</h1>
          <p className="text-sm text-gray-500 mb-6">Conform artikel 28 AVG · 27 mei 2026</p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1">
              <div className="font-semibold text-gray-600">Verwerkingsverantwoordelijke</div>
              <div className="md:col-span-2 text-gray-900">
                <b>Acme Recruitment B.V.</b><br />
                Hoofdstraat 12, 1234 AB Amsterdam<br />
                KvK 87654321 · vertegenwoordigd door Jan Jansen, directeur
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1 mt-2 border-t border-gray-200 pt-3">
              <div className="font-semibold text-gray-600">Verwerker</div>
              <div className="md:col-span-2 text-gray-900">
                <b>OneTwoStart NL B.V.</b> (handelsnaam: GRYWO)<br />
                Raasdorperweg 191 A, 1175 KV Lijnden<br />
                KvK 96738782 · vertegenwoordigd door Yorith Hulzebosch, eigenaar
              </div>
            </div>
          </div>

          <Section nr="1" titel="Doel">
            <p>GRYWO levert het Noah ATS-platform en verwerkt namens Acme Recruitment B.V. persoonsgegevens van kandidaten, opdrachtgevers en medewerkers.</p>
          </Section>

          <Section nr="2" titel="Verwerkingen">
            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
              <li><b>Kandidaten</b> — naam, e-mail, telefoon, CV, salaris — voor werving en selectie</li>
              <li><b>Opdrachtgevers</b> — bedrijfsnaam, contactpersoon — voor voorstellen en plaatsingen</li>
              <li><b>Medewerkers</b> — naam, e-mail, mailbox — voor platform-toegang</li>
            </ul>
          </Section>

          <Section nr="3" titel="Beveiliging">
            <p>TLS 1.2+, encryption at rest (AES-256), Row-Level-Security per bureau, 2FA op admin-accounts, audit-log van alle handelingen.</p>
          </Section>

          <Section nr="4" titel="Datalekken">
            <p>GRYWO meldt binnen 24 uur. Locatie verwerking: EU (Supabase Frankfurt, Vercel EU, Resend Ierland).</p>
          </Section>

          <p className="text-xs text-gray-500 mt-4">
            — Volledige tekst (12 artikelen) staat in de PDF die je hieronder ontvangt nadat je hebt getekend.
          </p>
        </div>

        {/* Onderteken-kaart */}
        <div className="bg-gradient-to-br from-[#eef0ff] to-[#f4f4f7] border-2 border-dashed border-[#333399] rounded-2xl p-6">
          <h2 className="text-xl font-bold text-[#333399] inline-flex items-center gap-2 mb-2">
            ✍️ Onderteken hier
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Je kunt je handtekening typen of met de muis/touchpad tekenen. Beide zijn rechtsgeldig.
          </p>

          {/* Tabbladen */}
          <div className="inline-flex border-b border-[#d4d7f5] mb-0">
            <div className="bg-white border border-[#d4d7f5] border-b-0 rounded-t-lg px-5 py-2 text-sm font-bold text-[#333399]">
              ⌨ Typ je naam
            </div>
            <div className="px-5 py-2 text-sm font-semibold text-gray-500">
              ✏️ Teken handmatig
            </div>
          </div>

          <div className="bg-white border border-[#d4d7f5] rounded-r-lg rounded-bl-lg p-5">
            <div className="mb-3">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">Voor- en achternaam *</label>
              <input
                className="w-full px-4 py-3 border border-[#333399] rounded-md bg-[#fafaff] text-2xl text-gray-900"
                style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive" }}
                value="Jan Jansen"
                readOnly
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">Je functie *</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value="Directeur" readOnly />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">E-mailadres (ter bevestiging) *</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value="jan@acmerecruitment.nl" readOnly />
            </div>

            <label className="flex items-start gap-2 text-xs text-gray-700 py-3">
              <input type="checkbox" defaultChecked className="mt-0.5 accent-[#333399]" />
              <span>Ik ga akkoord met de bovenstaande verwerkersovereenkomst en bevestig dat ik bevoegd ben om namens Acme Recruitment B.V. te tekenen.</span>
            </label>

            <button className="bg-[#333399] hover:bg-[#2a2a80] text-white font-bold px-6 py-3 rounded-lg text-sm inline-flex items-center gap-2 shadow-sm mt-2">
              ✓ Onderteken & verstuur
            </button>

            <div className="bg-gray-50 rounded-md px-4 py-3 mt-4 text-[11px] text-gray-600 font-mono">
              <b className="text-gray-800">Audit-trail wordt vastgelegd:</b><br />
              Tijdstip: 27-05-2026 14:32:18 CET<br />
              IP: 84.105.xx.xx · Chrome 129 op macOS<br />
              Token: dpa_3f7a9c2e... (unieke link)
            </div>
          </div>
        </div>

        <div className="text-center py-5 text-xs text-gray-500">
          Vragen? Mail <a href="mailto:yorith@grywo.nl" className="text-[#333399] font-semibold">yorith@grywo.nl</a> of bel 085-4016082
        </div>
      </div>
    </main>
  );
}

function Section({ nr, titel, children }: { nr: string; titel: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-[#333399] border-b-2 border-[#333399] pb-1 mb-2 inline-block">
        {nr}. {titel}
      </h2>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}
