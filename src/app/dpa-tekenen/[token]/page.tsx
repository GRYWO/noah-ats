import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { GrywoLogo } from "@/components/GrywoLogo";
import { TekenForm } from "./TekenForm";
import { CheckCircle2 } from "lucide-react";

/**
 * Publieke DPA-tekenpagina. Geen login vereist — alleen geldig token.
 */
export default async function TekenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("dpa_signatures")
    .select("*")
    .eq("token", token)
    .single();

  if (!row) notFound();

  const bureauHandel = row.bureau_handelsnaam || row.bureau_naam || "je bureau";
  const bureauFormeel = row.bureau_naam || bureauHandel;
  const adres = row.bureau_adres || "_[adres]_";
  const kvk = row.bureau_kvk || "_[KvK-nummer]_";
  const contactNaam = row.verzonden_aan_naam || "";
  const contactEmail = row.verzonden_aan_email || "";

  // Als al getekend → toon read-only versie
  const isGetekend = row.status === "getekend";
  const isIngetrokken = row.status === "ingetrokken";

  return (
    <main className="min-h-screen bg-[#f4f4f7] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header banner */}
        <div className="bg-[#333399] rounded-2xl p-5 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex items-center gap-3">
            <GrywoLogo size="md" wit={true} />
            <span className="text-white/70 text-xs">Verwerkersovereenkomst — Noah ATS</span>
          </div>
          <StatusBadge status={row.status} />
        </div>

        {isIngetrokken && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-4 text-sm">
            <b>Deze uitnodiging is ingetrokken.</b> Neem contact op met Noah recruitment voor een nieuwe.
          </div>
        )}

        {isGetekend && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 mb-4 flex items-start gap-3">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600" />
            <div className="text-sm">
              <b>Deze overeenkomst is getekend op {new Date(row.getekend_op!).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })}</b><br />
              door <b>{row.getekend_door_naam}</b> ({row.getekend_door_functie}) — {row.getekend_door_email}
            </div>
          </div>
        )}

        {/* DPA-inhoud */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Verwerkersovereenkomst</h1>
          <p className="text-sm text-gray-500 mb-6">
            Conform artikel 28 AVG · {new Date(row.verzonden_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1">
              <div className="font-semibold text-gray-600">Verwerkingsverantwoordelijke</div>
              <div className="md:col-span-2 text-gray-900">
                <b>{bureauFormeel}</b>
                {bureauHandel !== bureauFormeel && <> (handelsnaam: {bureauHandel})</>}
                <br />{adres}<br />KvK {kvk}
                {contactNaam && <><br />Vertegenwoordigd door {contactNaam}</>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1 mt-2 border-t border-gray-200 pt-3">
              <div className="font-semibold text-gray-600">Verwerker</div>
              <div className="md:col-span-2 text-gray-900">
                <b>OneTwoStart NL B.V.</b> (handelsnaam: Noah recruitment)<br />
                Raasdorperweg 191 A, 1175 KV Lijnden<br />
                KvK 96738782 · vertegenwoordigd door Yorith Hulzebosch, eigenaar
              </div>
            </div>
          </div>

          <Section nr="1" titel="Doel">
            <p>Noah recruitment levert het Noah ATS-platform en verwerkt namens {bureauHandel} persoonsgegevens van kandidaten, opdrachtgevers en medewerkers.</p>
          </Section>
          <Section nr="2" titel="Verwerkingen">
            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
              <li><b>Kandidaten</b> — naam, e-mail, telefoon, CV, salaris — voor werving en selectie</li>
              <li><b>Opdrachtgevers</b> — bedrijfsnaam, contactpersoon — voor voorstellen en plaatsingen</li>
              <li><b>Medewerkers</b> — naam, e-mail, mailbox — voor platform-toegang</li>
            </ul>
          </Section>
          <Section nr="3" titel="Locatie van verwerking">
            <p>Alle data binnen de EER: Supabase (Frankfurt), Vercel (EU), Resend (Ierland). Anthropic AI verwerkt zonder data te bewaren.</p>
          </Section>
          <Section nr="4" titel="Beveiliging">
            <p>TLS 1.2+, encryption at rest (AES-256), Row-Level-Security per bureau, 2FA op admin-accounts, audit-log van alle handelingen.</p>
          </Section>
          <Section nr="5" titel="Bewaartermijnen">
            <p>Afgewezen kandidaten max 4 weken (talentpool 1 jaar met toestemming). Plaatsings-logs 7 jaar (fiscaal). Bij beëindiging samenwerking binnen 30 dagen verwijderd.</p>
          </Section>
          <Section nr="6" titel="Datalekken">
            <p>Noah recruitment meldt binnen 24 uur aan het bureau. Bureau is verantwoordelijk voor melding aan AP (binnen 72 uur).</p>
          </Section>
          <Section nr="7" titel="Rechten van betrokkenen">
            <p>Noah recruitment ondersteunt verzoeken om inzage, correctie, verwijdering en dataportabiliteit binnen 30 dagen.</p>
          </Section>
          <Section nr="8" titel="Audit-recht, aansprakelijkheid, duur">
            <p>
              Bureau mag eens per jaar audit doen. Aansprakelijkheid Noah recruitment beperkt tot de in de 12 voorgaande maanden betaalde bedragen. Overeenkomst loopt zolang Bureau gebruikmaakt van Noah ATS.
            </p>
          </Section>
          <Section nr="9" titel="Toepasselijk recht">
            <p>Nederlands recht. Geschillen voor rechtbank Midden-Nederland, locatie Utrecht.</p>
          </Section>

          <p className="text-xs text-gray-500 mt-4">
            Vragen vooraf? Mail info@grywo.nl of bel 085-4016082.
          </p>
        </div>

        {/* Onderteken-kaart */}
        {!isGetekend && !isIngetrokken && (
          <div className="bg-gradient-to-br from-[#eef0ff] to-[#f4f4f7] border-2 border-dashed border-[#333399] rounded-2xl p-6">
            <h2 className="text-xl font-bold text-[#333399] inline-flex items-center gap-2 mb-2">
              ✍️ Onderteken hier
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Typ je naam of teken met de muis/touchpad. Beide zijn rechtsgeldig (eIDAS — Simple Electronic Signature).
            </p>

            <TekenForm token={token} defaultNaam={contactNaam} defaultEmail={contactEmail} />
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
                <tr><td className="py-1.5 text-gray-500">Type</td><td className="py-1.5">{row.handtekening_type === "drawn" ? "Handgetekend (canvas)" : "Getypt"}</td></tr>
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
  if (status === "getekend") {
    return (
      <div className="text-white/85 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2 bg-emerald-500/30 px-3 py-1 rounded-full">
        <span className="w-2 h-2 bg-emerald-300 rounded-full"></span>
        Getekend
      </div>
    );
  }
  if (status === "ingetrokken") {
    return (
      <div className="text-white/85 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2">
        <span className="w-2 h-2 bg-red-400 rounded-full"></span>
        Ingetrokken
      </div>
    );
  }
  return (
    <div className="text-white/85 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2">
      <span className="w-2 h-2 bg-[#ffd84d] rounded-full"></span>
      Wachten op handtekening
    </div>
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
