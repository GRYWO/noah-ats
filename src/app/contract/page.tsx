import Link from "next/link";
import Image from "next/image";
import { FileSignature, ShieldCheck, MapPin, BadgeCheck } from "lucide-react";
import { AanmeldForm } from "../word-setter/AanmeldForm";

export const metadata = {
  title: "Samenwerkingsovereenkomst — GRYWO Setter",
  description:
    "Lees de samenwerkings-intentieverklaring tussen GRYWO en jou als setter. Onderteken digitaal met eIDAS-handtekening.",
};

export default function ContractPagina() {
  return (
    <main className="min-h-screen bg-[#f5f5f7]">
      {/* ─── PAARSE HEADER ─── */}
      <header className="relative bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23] text-white overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,216,77,0.25) 0%, rgba(51,51,153,0) 60%)",
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-6 py-8 flex items-center justify-between">
          <Link href="/word-setter" className="flex items-baseline">
            <span className="text-white text-2xl font-black tracking-tighter">noah</span>
            <span className="ml-1.5 w-2 h-2 rounded-full bg-[#ffd84d] inline-block" />
          </Link>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span>Powered by</span>
            <Image src="/grywo-logo-wit.png" alt="GRYWO" width={70} height={20} className="opacity-90" />
          </div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-6 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffd84d]/10 border border-[#ffd84d]/30 text-[#ffd84d] text-sm font-semibold mb-6">
            <FileSignature size={14} /> Samenwerkings-intentieverklaring
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
            De afspraak tussen{" "}
            <span className="text-[#ffd84d]">jou</span>{" "}
            en Binqie.
          </h1>
          <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Lees alles rustig door. Akkoord? Onderteken hieronder digitaal.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            <TrustBadge icon={<ShieldCheck size={12} />} label="eIDAS-handtekening" />
            <TrustBadge icon={<MapPin size={12} />} label="Nederlands recht" />
            <TrustBadge icon={<BadgeCheck size={12} />} label="AVG-proof" />
          </div>
        </div>
      </header>

      {/* ─── CONTRACT ─── */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-7 md:p-12">
          <h2 className="text-2xl font-black mb-1">Samenwerkingsovereenkomst</h2>
          <p className="text-xs text-gray-500 mb-8">
            Setter-positie bij Binqie B.V. · met 7-daagse trial
          </p>

          <Sectie nummer="" titel="Partijen">
            <p>
              <b>Binqie B.V.</b>, gevestigd aan de St.-Jacobsstraat 6 A
              (p/a KVK), 3511 BR Utrecht, ingeschreven bij de Kamer van
              Koophandel onder nummer <b>94799822</b>, hierna te noemen:{" "}
              &ldquo;Binqie&rdquo;.
            </p>
            <p>
              en de Setter wiens gegevens in het ondertekenformulier hieronder
              zijn ingevuld, hierna te noemen: &ldquo;Setter&rdquo;.
            </p>
            <p className="text-xs text-gray-500 italic">
              Binqie handelt onder andere onder het merk <b>GRYWO</b> voor
              recruitment-werkzaamheden. Waar in deze overeenkomst over GRYWO
              wordt gesproken, wordt Binqie B.V. bedoeld.
            </p>
          </Sectie>

          <Sectie nummer="1" titel="Werkzaamheden">
            <p>
              Setter voert telefonische acquisitie uit voor Binqie (handelend
              als GRYWO) via het ATS-platform Noah. Werkzaamheden omvatten het
              bellen van opdrachtgevers, voorstellen versturen van kandidaten,
              voortgang vastleggen in Noah en deelnemen aan dagelijkse
              EOD-coaching met Pepijn Zwartenberg als coach.
            </p>
          </Sectie>

          <Sectie nummer="2" titel="Vergoeding">
            <p>
              Setter ontvangt per gerealiseerde plaatsing een{" "}
              <b>percentage van het bruto jaarsalaris</b> van de geplaatste
              kandidaat, dat <b>maandelijks wordt uitgekeerd</b>. Het percentage
              wordt staffelgewijs verhoogd op basis van het totaal aantal
              plaatsingen van Setter:
            </p>

            <div className="bg-[#333399]/5 border border-[#333399]/15 rounded-xl p-4 mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="py-2 font-semibold">Aantal plaatsingen</th>
                    <th className="py-2 font-semibold text-right">% van bruto jaarsalaris</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#333399]/15">
                    <td className="py-2">1 tot en met 5 plaatsingen</td>
                    <td className="py-2 text-right font-bold text-[#333399]">2,5%</td>
                  </tr>
                  <tr className="border-t border-[#333399]/15">
                    <td className="py-2">Vanaf 8 plaatsingen</td>
                    <td className="py-2 text-right font-bold text-[#333399]">3,0%</td>
                  </tr>
                  <tr className="border-t border-[#333399]/15">
                    <td className="py-2">Vanaf 12 plaatsingen</td>
                    <td className="py-2 text-right font-bold text-[#333399]">3,25%</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-600 mt-3 italic">
                Het percentage wordt elke maand opnieuw berekend over het bruto
                jaarsalaris en uitbetaald zolang de kandidaat geplaatst blijft.
              </p>
            </div>

            <p className="mt-4">
              <b>Factuur en betaling:</b> Setter stuurt elke{" "}
              <b>1e van de maand</b> een factuur per e-mail naar{" "}
              <a href="mailto:pepijn@grywo.nl" className="text-[#333399] underline">
                pepijn@grywo.nl
              </a>. Binqie betaalt de factuur uit binnen <b>7 dagen</b> na
              ontvangst, mits de factuur volledig en correct is.
            </p>
          </Sectie>

          <Sectie nummer="3" titel="Tools & toegang">
            <p>
              Binqie stelt aan Setter ter beschikking: een persoonlijk
              Noah-account, een eigen <b>@grywo.nl</b>-mailadres en toegang tot
              Jobdigger.
            </p>
            <p>
              Na de 7-daagse trial ontvangt Setter een eigen{" "}
              <b>Voys-telefoonnummer</b> waarmee onbeperkt en gratis kan worden
              gebeld vanaf elke locatie.
            </p>
          </Sectie>

          <Sectie nummer="4" titel="Eigendom en data">
            <p>
              Alle kandidaten, leads en opdrachtgever-gegevens die binnen Noah
              worden verzameld of bewerkt zijn eigendom van GRYWO. Bij
              beëindiging van deze samenwerking blijven alle gegevens bij
              GRYWO en wordt de toegang van Setter onmiddellijk gerevoceerd.
            </p>
          </Sectie>

          <Sectie nummer="5" titel="Geheimhouding">
            <p>
              <b>Alle informatie</b> die Setter tijdens of voor de samenwerking
              te weten komt over Binqie en GRYWO, haar opdrachtgevers,
              kandidaten, tarieven, marges, processen, software-functionaliteit,
              klantenbestanden, financiële gegevens en strategie is strikt
              vertrouwelijk.
            </p>
            <p>Setter verplicht zich:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                Deze informatie <b>nooit</b> te delen met derden, ook niet na
                beëindiging van de samenwerking.
              </li>
              <li>
                Geen kandidaten, opdrachtgevers of contactgegevens uit Noah te
                exporteren, kopiëren, foto&apos;s te maken of op andere wijze
                buiten Noah te bewaren.
              </li>
              <li>
                Inloggegevens, accounts en mailboxen niet te delen met derden.
              </li>
              <li>
                Bij beëindiging direct alle toegang in te leveren en eventuele
                lokale kopieën te vernietigen.
              </li>
            </ul>
            <p>
              De geheimhoudingsplicht geldt{" "}
              <b>tijdens én na de samenwerking voor onbepaalde tijd</b>.
              Schending leidt tot onmiddellijke beëindiging van de samenwerking
              en een direct opeisbare boete van{" "}
              <b>€ 10.000 per overtreding</b>, vermeerderd met € 500 per dag
              dat de overtreding voortduurt, onverminderd het recht van Binqie
              op volledige schadevergoeding.
            </p>
          </Sectie>

          <Sectie nummer="6" titel="Concurrentie & relatiebeding">
            <p>
              <b>Tijdens de samenwerking</b> is het Setter niet toegestaan
              werkzaamheden te verrichten voor andere recruitmentbureaus,
              uitzendbureaus, detacheringspartijen of vergelijkbare partijen
              die concurreren met Binqie en GRYWO.
            </p>
            <p>
              <b>
                Gedurende 12 maanden na beëindiging van de samenwerking
              </b>{" "}
              is het Setter niet toegestaan:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                Vergelijkbare werkzaamheden te verrichten voor opdrachtgevers
                van Binqie waarmee Setter direct of indirect contact heeft
                gehad.
              </li>
              <li>
                Kandidaten die via Binqie en GRYWO in beeld zijn gekomen te
                bemiddelen, te benaderen of te plaatsen.
              </li>
              <li>
                Werknemers, collega-setters of recruiters van Binqie actief te
                benaderen voor een overstap (anti-ronselbeding).
              </li>
            </ul>
            <p>
              Bij overtreding van dit beding is Setter een direct opeisbare
              boete verschuldigd van <b>€ 10.000 per overtreding</b>,
              vermeerderd met € 500 per dag dat de overtreding voortduurt,
              onverminderd het recht van Binqie op volledige schadevergoeding.
            </p>
            <p className="text-xs text-gray-500 italic">
              Schriftelijke toestemming van Binqie kan dit beding opheffen in
              individuele gevallen.
            </p>
          </Sectie>

          <Sectie nummer="7" titel="Duur en beëindiging">
            <p>
              De samenwerking start met een <b>7-daagse trial</b>. Beide
              partijen kunnen tijdens en na de trial schriftelijk opzeggen met
              een opzegtermijn van één maand. Binqie mag bij ernstige
              tekortkomingen of schending van geheimhouding/concurrentiebeding
              per direct beëindigen.
            </p>
          </Sectie>

          <Sectie nummer="8" titel="Toepasselijk recht">
            <p>
              Op deze overeenkomst is uitsluitend Nederlands recht van
              toepassing. Geschillen worden voorgelegd aan de bevoegde rechter
              in het arrondissement Utrecht.
            </p>
          </Sectie>

          <div className="mt-10 bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900 leading-relaxed">
            <b>Over de digitale handtekening:</b> door het ondertekenformulier
            hieronder in te vullen en te ondertekenen verklaart Setter akkoord
            met alle bovengenoemde voorwaarden. De handtekening wordt
            opgeslagen met tijdstempel, IP-adres en user-agent als bewijs
            (eIDAS Simple Electronic Signature).
          </div>
        </div>
      </section>

      {/* ─── ONDERTEKEN ─── */}
      <section id="onderteken" className="max-w-3xl mx-auto px-6 pb-16">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black mb-2 text-gray-900">
            Onderteken digitaal
          </h2>
          <p className="text-gray-600">
            Vul je gegevens in en plaats je handtekening hieronder.
          </p>
        </div>
        <AanmeldForm />
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#0f0f23] text-white/40 text-xs text-center py-6">
        © {new Date().getFullYear()} Binqie B.V. — KvK 94799822 · Utrecht ·{" "}
        <Link href="/word-setter" className="text-white/60 hover:text-white underline">
          Terug naar setter-pagina
        </Link>
      </footer>
    </main>
  );
}

function Sectie({
  nummer,
  titel,
  children,
}: {
  nummer: string;
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <h3 className="text-base font-bold text-[#333399] mb-2 inline-flex items-center gap-2">
        {nummer && (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#333399]/10 text-[#333399] text-xs font-black">
            {nummer}
          </span>
        )}
        {titel}
      </h3>
      <div className="text-gray-700 text-[15px] leading-relaxed space-y-2 pl-9">
        {children}
      </div>
    </div>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-[12px] text-white/85">
      <span className="text-[#ffd84d]">{icon}</span>
      {label}
    </div>
  );
}
