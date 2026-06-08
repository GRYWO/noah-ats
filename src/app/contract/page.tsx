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
            en GRYWO.
          </h1>
          <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Lees alles rustig door. Akkoord? Onderteken hieronder digitaal en
            Pepijn neemt binnen 24 uur contact op.
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
            Setter-positie bij GRYWO · met 7-daagse trial
          </p>

          <Sectie nummer="" titel="Partijen">
            <p>
              <b>OneTwoStart NL B.V.</b> (handelend onder de naam <b>GRYWO</b>),
              gevestigd te Nederland, KvK 96738782, hierna: &ldquo;GRYWO&rdquo;.
            </p>
            <p>
              en de Setter wiens gegevens in het ondertekenformulier hieronder
              zijn ingevuld, hierna: &ldquo;Setter&rdquo;.
            </p>
          </Sectie>

          <Sectie nummer="1" titel="Werkzaamheden">
            <p>
              Setter voert telefonische acquisitie uit voor GRYWO via het
              ATS-platform Noah. Werkzaamheden omvatten het bellen van
              opdrachtgevers, voorstellen versturen van kandidaten, voortgang
              vastleggen in Noah en deelnemen aan dagelijkse EOD-coaching met
              Pepijn als coach.
            </p>
          </Sectie>

          <Sectie nummer="2" titel="Vergoeding">
            <p>
              Setter ontvangt een vast basisbedrag per maand zoals individueel
              afgesproken, vermeerderd met een bonus per gerealiseerde plaatsing
              van een door Setter voorgestelde kandidaat. Uitbetaling vindt
              maandelijks plaats achteraf, na ontvangst van een deugdelijke
              factuur van Setter aan GRYWO.
            </p>
          </Sectie>

          <Sectie nummer="3" titel="Tools & toegang">
            <p>
              GRYWO stelt aan Setter ter beschikking: een persoonlijk
              Noah-account, een <b>voornaam@grywo.nl</b>-mailadres, toegang tot
              Jobdigger en de Robin AI-assistent.
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
              beëindiging van deze samenwerking blijven gegevens bij GRYWO en
              wordt de toegang van Setter onmiddellijk gerevoceerd.
            </p>
          </Sectie>

          <Sectie nummer="5" titel="Geheimhouding">
            <p>
              Setter verbindt zich alle informatie over opdrachtgevers,
              kandidaten, tarieven, marges en interne werkwijzen van GRYWO
              strikt vertrouwelijk te behandelen. Schending van geheimhouding
              leidt tot directe beëindiging van de samenwerking en mogelijke
              aansprakelijkheid.
            </p>
          </Sectie>

          <Sectie nummer="6" titel="Concurrentie & relatiebeding">
            <p>
              Tijdens de samenwerking en gedurende{" "}
              <b>12 maanden na beëindiging</b> verricht Setter geen
              vergelijkbare werkzaamheden voor opdrachtgevers van GRYWO waarmee
              hij/zij gedurende de samenwerking direct of indirect contact
              heeft gehad, behoudens uitdrukkelijke schriftelijke toestemming
              van GRYWO.
            </p>
          </Sectie>

          <Sectie nummer="7" titel="Duur en beëindiging">
            <p>
              De samenwerking start met een <b>7-daagse trial</b>. Beide
              partijen kunnen tijdens en na de trial schriftelijk opzeggen met
              een opzegtermijn van één maand. GRYWO mag bij ernstige
              tekortkomingen of geheimhouding-schendingen per direct beëindigen.
            </p>
          </Sectie>

          <Sectie nummer="8" titel="Toepasselijk recht">
            <p>
              Op deze overeenkomst is uitsluitend Nederlands recht van
              toepassing. Geschillen worden voorgelegd aan de bevoegde rechter
              in het arrondissement van vestiging van GRYWO.
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
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782 ·{" "}
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
