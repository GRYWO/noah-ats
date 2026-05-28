import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { GrywoLogo } from "@/components/GrywoLogo";
import { TekenForm } from "./TekenForm";
import { CheckCircle2 } from "lucide-react";

export default async function TekenAkkoordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("user_agreements")
    .select("*")
    .eq("token", token)
    .single();

  if (!row) notFound();

  const isGetekend = row.status === "getekend";
  const isIngetrokken = row.status === "ingetrokken";
  const isSetter = row.type === "nda_setter";
  const naam = `${row.user_voornaam ?? ""} ${row.user_achternaam ?? ""}`.trim();
  const bureau = row.bureau_naam || "—";

  return (
    <main className="min-h-screen bg-[#f4f4f7] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Banner */}
        <div className="bg-[#333399] rounded-2xl p-5 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex items-center gap-3">
            <GrywoLogo size="md" wit={true} />
            <span className="text-white/70 text-xs">{isSetter ? "Geheimhoudingsverklaring (NDA)" : "Gebruiksvoorwaarden Noah ATS"}</span>
          </div>
          <StatusBadge status={row.status} />
        </div>

        {isIngetrokken && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-4 text-sm">
            <b>Deze uitnodiging is ingetrokken.</b> Neem contact op met je beheerder voor een nieuwe.
          </div>
        )}
        {isGetekend && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 mb-4 flex items-start gap-3">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600" />
            <div className="text-sm">
              <b>Getekend op {new Date(row.getekend_op!).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })}</b><br />
              door <b>{row.getekend_door_naam}</b>
            </div>
          </div>
        )}

        {/* Document */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-4">
          {isSetter ? (
            <NdaSetterTekst naam={naam} bureau={bureau} datum={new Date(row.verzonden_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })} />
          ) : (
            <GebruiksvoorwaardenTekst naam={naam} rol={row.user_rol || "user"} bureau={bureau} datum={new Date(row.verzonden_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })} />
          )}
        </div>

        {/* Onderteken */}
        {!isGetekend && !isIngetrokken && (
          <div className="bg-gradient-to-br from-[#eef0ff] to-[#f4f4f7] border-2 border-dashed border-[#333399] rounded-2xl p-6">
            <h2 className="text-xl font-bold text-[#333399] inline-flex items-center gap-2 mb-2">✍️ Onderteken hier</h2>
            <p className="text-sm text-gray-600 mb-4">
              Typ je naam of teken met de muis/touchpad. Beide zijn rechtsgeldig.
            </p>
            <TekenForm token={token} defaultNaam={naam} />
          </div>
        )}

        {isGetekend && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-600">
            <h2 className="text-base font-bold text-gray-800 mb-3">Audit-trail</h2>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-1.5 text-gray-500 w-1/3">Tijdstip</td><td className="py-1.5 font-mono">{new Date(row.getekend_op!).toLocaleString("nl-NL")}</td></tr>
                <tr><td className="py-1.5 text-gray-500">IP-adres</td><td className="py-1.5 font-mono">{row.ip_adres ?? "—"}</td></tr>
                <tr><td className="py-1.5 text-gray-500">Browser</td><td className="py-1.5 font-mono text-[11px]">{row.user_agent?.slice(0, 80) ?? "—"}</td></tr>
                <tr><td className="py-1.5 text-gray-500">Type</td><td className="py-1.5">{row.handtekening_type === "drawn" ? "Handgetekend" : "Getypt"}</td></tr>
              </tbody>
            </table>
            {row.handtekening_type === "drawn" && row.handtekening_data?.startsWith("data:image") && (
              <div className="mt-4">
                <div className="text-xs font-bold text-gray-600 mb-1">Handtekening:</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.handtekening_data} alt="Handtekening" className="bg-white border border-gray-200 rounded p-2 max-w-xs" />
              </div>
            )}
            {row.handtekening_type === "typed" && (
              <div className="mt-4">
                <div className="text-xs font-bold text-gray-600 mb-1">Handtekening:</div>
                <div className="bg-white border border-gray-200 rounded p-3 text-2xl text-gray-900" style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive" }}>
                  {row.handtekening_data}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center py-5 text-xs text-gray-500">
          Vragen? Mail <a href="mailto:info@grywo.nl" className="text-[#333399] font-semibold">info@grywo.nl</a> of bel 085-4016082
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "getekend") return (
    <div className="text-white/85 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2 bg-emerald-500/30 px-3 py-1 rounded-full">
      <span className="w-2 h-2 bg-emerald-300 rounded-full"></span> Getekend
    </div>
  );
  if (status === "ingetrokken") return (
    <div className="text-white/85 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2">
      <span className="w-2 h-2 bg-red-400 rounded-full"></span> Ingetrokken
    </div>
  );
  return (
    <div className="text-white/85 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2">
      <span className="w-2 h-2 bg-[#ffd84d] rounded-full"></span> Wachten op handtekening
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold text-[#333399] border-b-2 border-[#333399] pb-1 mb-2 inline-block mt-5">{children}</h2>;
}

/* ─────────── NDA SETTERS ─────────── */
function NdaSetterTekst({ naam, bureau, datum }: { naam: string; bureau: string; datum: string }) {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Geheimhoudingsverklaring</h1>
      <p className="text-sm text-gray-500 mb-6">Voor setters in de GRYWO-pool · {datum}</p>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1">
          <div className="font-semibold text-gray-600">Tussen</div>
          <div className="md:col-span-2 text-gray-900">
            <b>OneTwoStart NL B.V.</b> (handelsnaam: GRYWO) — Raasdorperweg 191 A, 1175 KV Lijnden — KvK 96738782
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1 mt-2 border-t border-gray-200 pt-3">
          <div className="font-semibold text-gray-600">En</div>
          <div className="md:col-span-2 text-gray-900">
            <b>{naam || "Setter"}</b>
            {bureau && bureau !== "—" && <> — werkzaam vanuit bureau {bureau}</>}
            <br />
            <span className="text-gray-500 text-xs">— hierna te noemen "<b>Setter</b>"</span>
          </div>
        </div>
      </div>

      <H2>1. Waarom deze verklaring?</H2>
      <p className="text-sm text-gray-700">
        Als GRYWO-setter werk je in Noah ATS centraal voor <b>meerdere recruitment-bureaus</b>. Daardoor zie je kandidaten,
        opdrachtgevers en interne data van verschillende klanten door elkaar. Deze verklaring beschermt al die data en is
        verplicht onder AVG art. 32 lid 4.
      </p>

      <H2>2. Wat versta je onder "vertrouwelijke informatie"?</H2>
      <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
        <li>Persoonsgegevens van kandidaten (NAW, e-mail, telefoon, geboortedatum, CV, salaris, profielschets, notities)</li>
        <li>Bedrijfsgegevens en contactpersonen van opdrachtgevers</li>
        <li>Voorstellen, plaatsings-tarieven, interne marges, betalingsstatus</li>
        <li>Bellijsten, EOD-rapporten, coaching-aanvragen, doelen, statistieken van collega's</li>
        <li>Login-gegevens, mailbox-credentials, IT-architectuur, source-code, screenshots van Noah ATS</li>
        <li>Strategie, business-modellen en alle niet-publieke informatie van GRYWO en aangesloten bureaus</li>
      </ul>

      <H2>3. Je verplichtingen</H2>
      <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
        <li>Vertrouwelijke informatie blijft <b>strikt binnen Noah ATS</b> — geen export naar Excel, e-mail of WhatsApp voor eigen doel</li>
        <li>Je deelt geen wachtwoorden, niet met collega's en niet met externen</li>
        <li>Je maakt geen screenshots of foto's van Noah-schermen behalve waar uitdrukkelijk verzocht door GRYWO</li>
        <li>Schermdeling (Zoom/Teams) tijdens werk-uren alleen voor werk-doeleinden; deel geen kandidaat-data via je persoonlijke devices</li>
        <li>Je benadert geen kandidaten of opdrachtgevers <b>buiten</b> Noah ATS om voor eigen voordeel (geen "side-deals")</li>
        <li>Verdachte activiteit of een vermoed datalek meld je <b>direct</b> aan Yorith Hulzebosch (085-4016082)</li>
      </ul>

      <H2>4. Cross-tenant — extra regel</H2>
      <p className="text-sm text-gray-700">
        Als je tijdens een gesprek voor bureau A toevallig info ziet van bureau B (door cross-tenant zichtbaarheid in Noah),
        is dat <b>geen toestemming</b> om die info te gebruiken. Gegevens van bureau B blijven van bureau B.
      </p>

      <H2>5. Duur en na beëindiging</H2>
      <p className="text-sm text-gray-700">
        Deze verklaring geldt tijdens je dienstverband bij GRYWO én <b>5 jaar daarna</b>. Bij beëindiging:
        je toegang tot Noah ATS wordt direct ingetrokken, je vernietigt alle lokale kopieën (downloads, screenshots, notities)
        en je geeft alle GRYWO-apparatuur retour.
      </p>

      <H2>6. Boete bij overtreding</H2>
      <p className="text-sm text-gray-700">
        Bij aantoonbare overtreding ben je een <b>direct opeisbare boete</b> van € 5.000 per overtreding verschuldigd,
        plus € 500 voor elke dag dat de overtreding voortduurt — onverminderd het recht van GRYWO op volledige schadevergoeding.
      </p>

      <H2>7. Toepasselijk recht</H2>
      <p className="text-sm text-gray-700">
        Nederlands recht. Geschillen voor rechtbank Midden-Nederland, locatie Utrecht.
      </p>
    </>
  );
}

/* ─────────── GEBRUIKSVOORWAARDEN ─────────── */
function GebruiksvoorwaardenTekst({ naam, rol, bureau, datum }: { naam: string; rol: string; bureau: string; datum: string }) {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Gebruiksvoorwaarden Noah ATS</h1>
      <p className="text-sm text-gray-500 mb-6">Voor {rol === "admin" ? "bureau-admins" : "recruiters"} · {datum}</p>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1">
          <div className="font-semibold text-gray-600">Tussen</div>
          <div className="md:col-span-2 text-gray-900">
            <b>OneTwoStart NL B.V.</b> (handelsnaam: GRYWO) — KvK 96738782
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
        <li>Verdachte activiteit (vreemde mails, ongebruikelijke logins) direct melden aan je bureau-admin of aan info@grywo.nl</li>
        <li>Kandidaten respectvol behandelen — je werkt met persoonlijke data</li>
      </ul>

      <H2>4. Privacy en data</H2>
      <p className="text-sm text-gray-700">
        GRYWO verwerkt persoonsgegevens conform de AVG, zie <a href="/privacy" className="text-[#333399] underline">privacybeleid</a>.
        Tussen je bureau en GRYWO is een verwerkersovereenkomst getekend die de juridische basis vormt voor data-verwerking.
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
