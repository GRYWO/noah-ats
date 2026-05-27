import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { PrintKnop } from "./PrintKnop";

/**
 * Genereert een volledige verwerkersovereenkomst (DPA) met alle
 * gegevens van het bureau vooraf ingevuld. Print-vriendelijke layout:
 * Cmd+P / Ctrl+P → 'Opslaan als PDF' geeft een nette PDF.
 *
 * Alleen super-admin (GRYWO) kan deze pagina openen.
 */
export default async function DpaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: t } = await admin
    .from("tenants")
    .select("*")
    .eq("id", id)
    .single();
  if (!t) redirect("/bureaus?error=Niet+gevonden");

  const vandaag = new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const bureauNaamHandel = (t.handelsnaam || t.naam || "").trim();
  const bureauFormeel = t.tenaamstelling || t.naam || bureauNaamHandel;
  const adres = t.vestigingsadres || t.factuuradres || "_[adres]_";
  const contactNaam = t.contact_naam || "_[contactpersoon]_";
  const contactFunctie = t.contact_functie || "directeur";
  const kvk = t.kvk || "_[KvK-nummer]_";

  return (
    <main className="bg-white text-gray-900 print:bg-white">
      {/* Print-knop balk (verbergt bij printen) */}
      <div className="print:hidden bg-gray-100 border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <a href={`/bureaus/${id}`} className="text-sm text-[#333399] hover:underline">← Terug naar bureau</a>
          <h1 className="text-xl font-bold text-gray-800 mt-1">Verwerkersovereenkomst — {bureauNaamHandel}</h1>
        </div>
        <PrintKnop />
      </div>

      {/* DPA-inhoud — A4-stijl */}
      <article className="max-w-[800px] mx-auto px-12 py-12 print:px-16 print:py-12 print:max-w-none text-[14px] leading-relaxed">
        <header className="border-b-2 border-[#333399] pb-4 mb-8">
          <div className="text-[#333399] text-3xl font-bold tracking-tight">Verwerkersovereenkomst</div>
          <div className="text-sm text-gray-600 mt-1">Conform artikel 28 AVG · Datum: {vandaag}</div>
        </header>

        <section className="mb-6">
          <p className="mb-3"><b>Tussen:</b></p>
          <table className="w-full text-[13px] border-collapse">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-2 pr-4 font-semibold text-gray-700 w-1/3 align-top">Verwerkingsverantwoordelijke</td>
                <td className="py-2">
                  <b>{bureauFormeel}</b>
                  {bureauNaamHandel !== bureauFormeel && <> (handelsnaam: {bureauNaamHandel})</>}
                  <br />
                  {adres}<br />
                  KvK {kvk}<br />
                  Vertegenwoordigd door {contactNaam}, {contactFunctie}
                  <br />
                  <span className="text-gray-500">— hierna te noemen "<b>Bureau</b>"</span>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold text-gray-700 align-top">Verwerker</td>
                <td className="py-2">
                  <b>OneTwoStart NL B.V.</b> (handelsnaam: GRYWO)<br />
                  Raasdorperweg 191 A, 1175 KV Lijnden<br />
                  KvK 96738782<br />
                  Vertegenwoordigd door Yorith Hulzebosch, eigenaar
                  <br />
                  <span className="text-gray-500">— hierna te noemen "<b>GRYWO</b>"</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <H2>1. Doel en achtergrond</H2>
        <p>
          Bureau heeft GRYWO opdracht gegeven het ATS-platform <b>Noah ATS</b> (https://noah-ats.nl) te leveren.
          Bij die dienstverlening verwerkt GRYWO namens Bureau persoonsgegevens van kandidaten, opdrachtgevers
          en medewerkers van Bureau. Deze overeenkomst regelt die verwerking conform artikel 28 AVG.
        </p>

        <H2>2. Verwerkingen</H2>
        <p>GRYWO verwerkt namens Bureau onder andere:</p>
        <table className="w-full text-[12px] my-3 border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2 border border-gray-200">Categorie</th>
              <th className="text-left p-2 border border-gray-200">Persoonsgegevens</th>
              <th className="text-left p-2 border border-gray-200">Doel</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border border-gray-200"><b>Kandidaten</b></td>
              <td className="p-2 border border-gray-200">Naam, e-mail, telefoon, adres, geboortedatum, CV, opleiding, werkervaring, rijbewijs, salaris, profielschets, notities</td>
              <td className="p-2 border border-gray-200">Werving en selectie via Bureau {bureauNaamHandel}</td>
            </tr>
            <tr>
              <td className="p-2 border border-gray-200"><b>Opdrachtgevers</b></td>
              <td className="p-2 border border-gray-200">Bedrijfsnaam, contactpersoon, e-mail, telefoon, adres</td>
              <td className="p-2 border border-gray-200">Voorstellen verzenden en plaatsingen administreren</td>
            </tr>
            <tr>
              <td className="p-2 border border-gray-200"><b>Medewerkers Bureau</b></td>
              <td className="p-2 border border-gray-200">Naam, e-mail, telefoon, rol, mailbox-credentials (versleuteld)</td>
              <td className="p-2 border border-gray-200">Toegang tot het platform</td>
            </tr>
          </tbody>
        </table>

        <H2>3. Locatie van verwerking</H2>
        <p>Alle persoonsgegevens worden opgeslagen binnen de Europese Economische Ruimte (EER):</p>
        <ul className="list-disc pl-6 space-y-1 my-2">
          <li><b>Supabase</b> (Frankfurt, Duitsland) — database en bestandsopslag</li>
          <li><b>Vercel</b> (EU-regio) — applicatiehosting</li>
          <li><b>Resend</b> (Ierland) — e-mailverzending</li>
        </ul>

        <H2>4. Sub-verwerkers</H2>
        <p>GRYWO maakt gebruik van de volgende sub-verwerkers. Bureau geeft hiervoor toestemming.</p>
        <table className="w-full text-[12px] my-3 border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2 border border-gray-200">Sub-verwerker</th>
              <th className="text-left p-2 border border-gray-200">Functie</th>
              <th className="text-left p-2 border border-gray-200">Locatie</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="p-2 border border-gray-200">Supabase Inc.</td><td className="p-2 border border-gray-200">Database, opslag, authenticatie</td><td className="p-2 border border-gray-200">EU (Frankfurt)</td></tr>
            <tr><td className="p-2 border border-gray-200">Vercel Inc.</td><td className="p-2 border border-gray-200">Hosting</td><td className="p-2 border border-gray-200">EU</td></tr>
            <tr><td className="p-2 border border-gray-200">Resend Inc.</td><td className="p-2 border border-gray-200">E-mailverzending</td><td className="p-2 border border-gray-200">EU (Ierland)</td></tr>
            <tr><td className="p-2 border border-gray-200">Anthropic PBC</td><td className="p-2 border border-gray-200">AI-CV-parsing en profielschets (data wordt niet bewaard)</td><td className="p-2 border border-gray-200">EU/VS</td></tr>
          </tbody>
        </table>
        <p>Wijzigingen in subverwerkers worden minimaal 30 dagen vooraf gemeld.</p>

        <H2>5. Beveiliging</H2>
        <ul className="list-disc pl-6 space-y-1 my-2">
          <li>TLS 1.2+ versleuteling voor alle data-overdracht</li>
          <li>Encryption at rest (AES-256)</li>
          <li>Row-Level-Security in de database (tenant-isolatie per bureau)</li>
          <li>Tweestapsverificatie op administratieve accounts</li>
          <li>Wachtwoord-hashing via bcrypt</li>
          <li>Audit-log van alle voorstellen, plaatsingen en afwijzingen</li>
          <li>Beperkte toegang tot productiedata (alleen super-admin)</li>
          <li>Automatische cleanup van kandidaten op de wachtlijst na 7 dagen</li>
        </ul>

        <H2>6. Bewaartermijnen</H2>
        <table className="w-full text-[12px] my-3 border-collapse">
          <tbody>
            <tr><td className="p-2 border border-gray-200 w-1/2"><b>Actieve kandidaten</b></td><td className="p-2 border border-gray-200">Zolang in actief proces</td></tr>
            <tr><td className="p-2 border border-gray-200"><b>Afgewezen kandidaten</b></td><td className="p-2 border border-gray-200">4 weken; talentpool max 1 jaar (met toestemming)</td></tr>
            <tr><td className="p-2 border border-gray-200"><b>Opdrachtgevers</b></td><td className="p-2 border border-gray-200">Duur samenwerking + 7 jaar fiscaal</td></tr>
            <tr><td className="p-2 border border-gray-200"><b>Plaatsings-logs</b></td><td className="p-2 border border-gray-200">7 jaar (fiscale verplichting)</td></tr>
            <tr><td className="p-2 border border-gray-200"><b>Medewerker-accounts</b></td><td className="p-2 border border-gray-200">Verwijderd zodra dienstverband eindigt</td></tr>
          </tbody>
        </table>
        <p>Na beëindiging worden alle persoonsgegevens van Bureau binnen 30 dagen verwijderd of geretourneerd.</p>

        <H2>7. Rechten van betrokkenen</H2>
        <p>
          GRYWO ondersteunt Bureau bij verzoeken van betrokkenen (inzage, correctie, verwijdering,
          dataportabiliteit, bezwaar). Verzoeken worden binnen 5 werkdagen behandeld; binnen 30 dagen afgerond.
        </p>

        <H2>8. Datalekken</H2>
        <p>
          Bij een (vermoedelijk) datalek meldt GRYWO dit <b>binnen 24 uur</b> aan Bureau, inclusief aard,
          categorieën en aantal betrokkenen, mogelijke gevolgen en genomen maatregelen. Bureau is
          verantwoordelijk voor melding aan de Autoriteit Persoonsgegevens (binnen 72 uur) en betrokkenen waar van toepassing.
        </p>

        <H2>9. Audit-recht</H2>
        <p>
          Bureau mag eens per jaar (of bij gegronde reden vaker) een audit uitvoeren. Kosten zijn voor Bureau,
          tenzij de audit een ernstige tekortkoming aantoont.
        </p>

        <H2>10. Aansprakelijkheid</H2>
        <p>
          Iedere partij is aansprakelijk voor schade door eigen toedoen. GRYWO's aansprakelijkheid is beperkt tot
          het bedrag dat Bureau in de 12 maanden voorafgaand aan het schadevoorval aan GRYWO heeft betaald,
          behalve bij opzet of grove schuld.
        </p>

        <H2>11. Duur en beëindiging</H2>
        <p>Deze overeenkomst geldt zolang Bureau gebruikmaakt van Noah ATS. Beëindiging conform de hoofd-dienstverleningsovereenkomst.</p>

        <H2>12. Toepasselijk recht</H2>
        <p>
          Op deze overeenkomst is <b>Nederlands recht</b> van toepassing. Geschillen worden voorgelegd aan de
          rechtbank Midden-Nederland, locatie Utrecht.
        </p>

        {/* Handtekening-blokken */}
        <div className="mt-12 grid grid-cols-2 gap-12 page-break-inside-avoid">
          <div>
            <div className="font-bold text-gray-700 mb-2">Voor Bureau ({bureauNaamHandel})</div>
            <div className="text-xs text-gray-500 mb-8">Naam, functie, datum, handtekening</div>
            <div className="border-b border-gray-400 h-16"></div>
            <div className="mt-1 text-xs text-gray-600">{contactNaam}, {contactFunctie}</div>
          </div>
          <div>
            <div className="font-bold text-gray-700 mb-2">Voor GRYWO (OneTwoStart NL B.V.)</div>
            <div className="text-xs text-gray-500 mb-8">Naam, functie, datum, handtekening</div>
            <div className="border-b border-gray-400 h-16"></div>
            <div className="mt-1 text-xs text-gray-600">Yorith Hulzebosch, eigenaar</div>
          </div>
        </div>
      </article>

      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          body { font-size: 11pt; }
        }
        .page-break-inside-avoid { page-break-inside: avoid; }
      `}</style>
    </main>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold text-[#333399] mt-6 mb-2">{children}</h2>;
}
