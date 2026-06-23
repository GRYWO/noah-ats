import type { ReactNode } from "react";

// Gedeelde documentteksten: gebruikt door de echte teken-pagina én de
// super-admin contract-preview, zodat ze ALTIJD identiek zijn.

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-bold text-[#333399] border-b-2 border-[#333399] pb-1 mb-2 inline-block mt-5">{children}</h2>;
}

/* ─────────── NDA SETTERS ─────────── */
export function NdaSetterTekst({ naam, bureau, datum }: { naam: string; bureau: string; datum: string }) {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Geheimhoudingsverklaring</h1>
      <p className="text-sm text-gray-500 mb-6">Voor setters in de Noah recruitment-pool · {datum}</p>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1">
          <div className="font-semibold text-gray-600">Tussen</div>
          <div className="md:col-span-2 text-gray-900">
            <b>OneTwoStart NL B.V.</b> (handelsnaam: Noah recruitment) — Raasdorperweg 191 A, 1175 KV Lijnden — KvK 96738782
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1 mt-2 border-t border-gray-200 pt-3">
          <div className="font-semibold text-gray-600">En</div>
          <div className="md:col-span-2 text-gray-900">
            <b>{naam || "Setter"}</b>
            {bureau && bureau !== "—" && <> — werkzaam vanuit bureau {bureau}</>}
            <br />
            <span className="text-gray-500 text-xs">— hierna te noemen &ldquo;<b>Setter</b>&rdquo;</span>
          </div>
        </div>
      </div>

      <H2>1. Waarom deze verklaring?</H2>
      <p className="text-sm text-gray-700">
        Als Noah recruitment-setter werk je in Noah ATS met kandidaten, opdrachtgevers en interne gegevens
        van <b>Noah recruitment</b>. Deze verklaring beschermt al die data en is verplicht onder AVG art. 32 lid 4.
      </p>

      <H2>2. Wat versta je onder &ldquo;vertrouwelijke informatie&rdquo;?</H2>
      <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
        <li>Persoonsgegevens van kandidaten (NAW, e-mail, telefoon, geboortedatum, CV, salaris, profielschets, notities)</li>
        <li>Bedrijfsgegevens en contactpersonen van opdrachtgevers</li>
        <li>Voorstellen, plaatsings-tarieven, interne marges, betalingsstatus</li>
        <li>Bellijsten, EOD-rapporten, coaching-aanvragen, doelen, statistieken van collega&apos;s</li>
        <li>Login-gegevens, mailbox-credentials, IT-architectuur, source-code, screenshots van Noah ATS</li>
        <li>Strategie, business-modellen en alle niet-publieke informatie van Noah recruitment</li>
      </ul>

      <H2>3. Je verplichtingen</H2>
      <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
        <li>Vertrouwelijke informatie blijft <b>strikt binnen Noah ATS</b> — geen export naar Excel, e-mail of WhatsApp voor eigen doel</li>
        <li>Je deelt geen wachtwoorden, niet met collega&apos;s en niet met externen</li>
        <li>Je maakt geen screenshots of foto&apos;s van Noah-schermen behalve waar uitdrukkelijk verzocht door Noah recruitment</li>
        <li>Schermdeling (Zoom/Teams) tijdens werk-uren alleen voor werk-doeleinden; deel geen kandidaat-data via je persoonlijke devices</li>
        <li>Je benadert geen kandidaten of opdrachtgevers <b>buiten</b> Noah ATS om voor eigen voordeel (geen &ldquo;side-deals&rdquo;)</li>
        <li>Verdachte activiteit of een vermoed datalek meld je <b>direct</b> aan Yorith Hulzebosch (085-4016082)</li>
      </ul>

      <H2>4. Duur en na beëindiging</H2>
      <p className="text-sm text-gray-700">
        Deze verklaring geldt tijdens je dienstverband bij Noah recruitment én <b>5 jaar daarna</b>. Bij beëindiging:
        je toegang tot Noah ATS wordt direct ingetrokken, je vernietigt alle lokale kopieën (downloads, screenshots, notities)
        en je geeft alle Noah recruitment-apparatuur retour.
      </p>

      <H2>5. Boete bij overtreding</H2>
      <p className="text-sm text-gray-700">
        Bij aantoonbare overtreding ben je een <b>direct opeisbare boete</b> van € 5.000 per overtreding verschuldigd,
        plus € 500 voor elke dag dat de overtreding voortduurt — onverminderd het recht van Noah recruitment op volledige schadevergoeding.
      </p>

      <H2>6. Toepasselijk recht</H2>
      <p className="text-sm text-gray-700">
        Nederlands recht. Geschillen voor rechtbank Midden-Nederland, locatie Utrecht.
      </p>
    </>
  );
}

/* ─────────── SETTER SAMENWERKINGSOVEREENKOMST ─────────── */
export function SetterContractTekst({ naam, datum }: { naam: string; datum: string }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <h1 className="text-2xl font-bold mb-1">Samenwerkingsovereenkomst</h1>
      <p className="text-sm text-gray-500 mb-6">Opgesteld op {datum} · Setter-positie bij Noah recruitment</p>

      <h2 className="text-base font-bold mt-4 mb-2">Partijen</h2>
      <p className="text-sm leading-relaxed">
        <b>OneTwoStart NL B.V.</b> (handelend onder de naam <b>Noah recruitment</b>), gevestigd te Nederland,
        KvK 96738782, hierna: &ldquo;Noah recruitment&rdquo;.
      </p>
      <p className="text-sm leading-relaxed">
        en <b>{naam || "[Naam setter]"}</b>, hierna: &ldquo;Setter&rdquo;.
      </p>

      <h2 className="text-base font-bold mt-6 mb-2">1. Werkzaamheden</h2>
      <p className="text-sm leading-relaxed">
        Setter voert telefonische acquisitie uit voor Noah recruitment via het ATS-platform Noah.
        Werkzaamheden omvatten het bellen van opdrachtgevers, voorstellen versturen van
        kandidaten, voortgang vastleggen en deelnemen aan dagelijkse EOD-coaching.
      </p>

      <h2 className="text-base font-bold mt-4 mb-2">2. Vergoeding</h2>
      <p className="text-sm leading-relaxed">
        Setter ontvangt een vast basisbedrag per maand zoals individueel afgesproken,
        vermeerderd met een bonus per gerealiseerde plaatsing van een door Setter voorgestelde
        kandidaat. Uitbetaling vindt maandelijks plaats achteraf, na ontvangst van een
        deugdelijke factuur van Setter aan Noah recruitment.
      </p>

      <h2 className="text-base font-bold mt-4 mb-2">3. Eigendom en data</h2>
      <p className="text-sm leading-relaxed">
        Alle kandidaten, leads en opdrachtgever-gegevens die binnen Noah worden verzameld
        of bewerkt zijn eigendom van Noah recruitment. Bij beëindiging van deze samenwerking blijven
        gegevens bij Noah recruitment en wordt de toegang van Setter onmiddellijk gerevoceerd.
      </p>

      <h2 className="text-base font-bold mt-4 mb-2">4. Geheimhouding</h2>
      <p className="text-sm leading-relaxed">
        Aanvullend op de afzonderlijke Geheimhoudingsverklaring (NDA) verbindt Setter zich
        alle informatie over opdrachtgevers, kandidaten, tarieven, marges en interne werkwijzen
        van Noah recruitment strikt vertrouwelijk te behandelen. Schending van geheimhouding leidt tot
        directe beëindiging van de samenwerking en mogelijke aansprakelijkheid.
      </p>

      <h2 className="text-base font-bold mt-4 mb-2">5. Concurrentie &amp; relatiebeding</h2>
      <p className="text-sm leading-relaxed">
        Tijdens de samenwerking en gedurende <b>12 maanden na beëindiging</b> verricht Setter
        geen vergelijkbare werkzaamheden voor opdrachtgevers van Noah recruitment waarmee hij/zij
        gedurende de samenwerking direct of indirect contact heeft gehad, behoudens uitdrukkelijke
        schriftelijke toestemming van Noah recruitment.
      </p>

      <h2 className="text-base font-bold mt-4 mb-2">6. Duur en beëindiging</h2>
      <p className="text-sm leading-relaxed">
        Deze samenwerking gaat in vanaf de datum van ondertekening en is voor onbepaalde
        tijd. Beide partijen kunnen schriftelijk opzeggen met een opzegtermijn van één maand.
        Noah recruitment mag bij ernstige tekortkomingen of geheimhouding-schendingen per direct beëindigen.
      </p>

      <h2 className="text-base font-bold mt-4 mb-2">7. Toepasselijk recht</h2>
      <p className="text-sm leading-relaxed">
        Op deze overeenkomst is uitsluitend Nederlands recht van toepassing. Geschillen worden
        voorgelegd aan de bevoegde rechter in het arrondissement van vestiging van Noah recruitment.
      </p>

      <p className="text-xs text-gray-500 mt-6">
        Door deze overeenkomst hieronder elektronisch te ondertekenen verklaart Setter
        akkoord met alle bovengenoemde voorwaarden. De handtekening wordt opgeslagen met
        tijdstempel, IP-adres en user-agent als bewijs (eIDAS Simple Electronic Signature).
      </p>
    </div>
  );
}

/* ─────────── GEBRUIKSVOORWAARDEN ─────────── */
export function GebruiksvoorwaardenTekst({ naam, rol, bureau, datum }: { naam: string; rol: string; bureau: string; datum: string }) {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Gebruiksvoorwaarden Noah ATS</h1>
      <p className="text-sm text-gray-500 mb-6">Voor {rol === "admin" ? "bureau-admins" : "recruiters"} · {datum}</p>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1">
          <div className="font-semibold text-gray-600">Tussen</div>
          <div className="md:col-span-2 text-gray-900">
            <b>OneTwoStart NL B.V.</b> (handelsnaam: Noah recruitment) — KvK 96738782
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1 mt-2 border-t border-gray-200 pt-3">
          <div className="font-semibold text-gray-600">En</div>
          <div className="md:col-span-2 text-gray-900">
            <b>{naam || "Gebruiker"}</b> ({rol})
            {bureau && bureau !== "—" && <> — bureau {bureau}</>}
          </div>
        </div>
      </div>

      <H2>1. Waarvoor gebruik je Noah ATS?</H2>
      <p className="text-sm text-gray-700">
        Noah ATS is een platform voor werving en selectie. Je gebruikt het uitsluitend voor werk-doeleinden binnen je rol
        bij <b>{bureau || "je bureau"}</b>.
      </p>

      <H2>2. Wat mag je niet?</H2>
      <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
        <li>Je wachtwoord delen met anderen, ook niet binnen het eigen bureau</li>
        <li>Kandidaat-data exporteren of doormailen voor andere doeleinden dan werving</li>
        <li>Schermdeling (Zoom/Teams) tijdens werk met Noah open op privé-accounts</li>
        <li>Inloggen op publieke computers zonder daarna uit te loggen</li>
        <li>Toegang misbruiken na beëindiging van je dienstverband</li>
      </ul>

      <H2>3. Wat moet je wel doen?</H2>
      <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
        <li>Wachtwoord direct na eerste login wijzigen (via Instellingen)</li>
        <li>2FA aanzetten zodra dit beschikbaar is op je account</li>
        <li>Verdachte activiteit (vreemde mails, ongebruikelijke logins) direct melden aan je bureau-admin of aan info@noah-recruitment.nl</li>
        <li>Kandidaten respectvol behandelen — je werkt met persoonlijke data</li>
      </ul>

      <H2>4. Privacy en data</H2>
      <p className="text-sm text-gray-700">
        Noah recruitment verwerkt persoonsgegevens conform de AVG, zie <a href="/privacy" className="text-[#333399] underline">privacybeleid</a>.
        Tussen je bureau en Noah recruitment is een verwerkersovereenkomst getekend die de juridische basis vormt voor data-verwerking.
      </p>

      <H2>5. Beëindiging</H2>
      <p className="text-sm text-gray-700">
        Zodra je geen recruiter/admin meer bent bij {bureau || "je bureau"} wordt je toegang tot Noah ATS verwijderd.
        Vanaf dat moment mag je geen kandidaat-data of bedrijfsgegevens meer gebruiken.
      </p>

      <H2>6. Toepasselijk recht</H2>
      <p className="text-sm text-gray-700">Nederlands recht. Geschillen voor rechtbank Midden-Nederland, locatie Utrecht.</p>
    </>
  );
}
