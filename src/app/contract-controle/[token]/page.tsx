import Image from "next/image";
import { createAdminClient } from "@/utils/supabase/admin";
import { ContractUploadForm } from "./ContractUploadForm";
import { ShieldCheck, Lock, Trash2, Eye } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ContractControlePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: verzoek } = await admin
    .from("contract_verzoeken")
    .select("id, status, kandidaat_naam, opdrachtgever_naam")
    .eq("token", token)
    .single();

  if (!verzoek) {
    return <FoutPagina titel="Verzoek niet gevonden" />;
  }
  if (verzoek.status === "afgerond") {
    return <BedanktPagina kandidaatNaam={verzoek.kandidaat_naam} />;
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0f0f23] text-white flex flex-col">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23]"
      />

      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span>Powered by</span>
          <Image src="/grywo-logo-wit.png" alt="Noah recruitment" width={70} height={20} className="opacity-90" />
        </div>
      </header>

      <section className="relative z-10 flex-1 flex flex-col items-center justify-start px-6 py-8 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white text-center mb-3">
          Contract-verificatie
        </h1>
        <p className="text-white/70 text-base text-center mb-2">
          Voor de plaatsing van <b className="text-white">{verzoek.kandidaat_naam}</b>
        </p>
        <p className="text-white/50 text-sm text-center mb-8">
          Upload het arbeidscontract zodat we de factuur kunnen opmaken
        </p>

        {/* AVG-uitleg */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#ffd84d]/20 text-[#ffd84d] flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base mb-1">Strenge AVG-regels</h2>
              <p className="text-white/60 text-sm">
                Wij behandelen uw contract met de grootst mogelijke zorgvuldigheid conform AVG art. 5 (dataminimalisatie):
              </p>
            </div>
          </div>

          <ul className="space-y-2.5 ml-13">
            <AvgPunt
              icoon={<Eye size={14} />}
              titel="Automatische redactie"
              tekst="Onze AI maakt direct alle privacy-gevoelige info zwart: BSN, IBAN, privé-adres, geboortedatum, telefoon, partner-/kindgegevens."
            />
            <AvgPunt
              icoon={<Trash2 size={14} />}
              titel="Origineel binnen 24 uur weg"
              tekst="Het originele contract wordt na verwerking volledig vernietigd. Wij bewaren alleen de geredacteerde versie."
            />
            <AvgPunt
              icoon={<Lock size={14} />}
              titel="Beperkte toegang"
              tekst="Alleen geautoriseerde Noah recruitment-medewerkers kunnen de geredacteerde versie inzien. Alle toegang wordt gelogd."
            />
          </ul>
        </div>

        {/* Upload form */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <ContractUploadForm token={token} kandidaatNaam={verzoek.kandidaat_naam} />
        </div>

        <p className="text-xs text-white/40 mt-8 text-center">
          Vragen? Mail{" "}
          <a href="mailto:backoffice@grywo.nl" className="text-white/70 underline">
            backoffice@grywo.nl
          </a>{" "}
          of bel 085-4016082
        </p>
      </section>

      <footer className="relative z-10 px-8 py-6 text-center text-[11px] text-white/40">
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782
      </footer>
    </main>
  );
}

function AvgPunt({
  icoon,
  titel,
  tekst,
}: {
  icoon: React.ReactNode;
  titel: string;
  tekst: string;
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="text-[#ffd84d] mt-0.5 flex-shrink-0">{icoon}</span>
      <span>
        <b className="text-white">{titel}.</b>{" "}
        <span className="text-white/65">{tekst}</span>
      </span>
    </li>
  );
}

function FoutPagina({ titel }: { titel: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f0f23] text-white p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{titel}</h1>
        <p className="text-white/60 text-sm">
          De link is mogelijk verlopen. Mail{" "}
          <a href="mailto:backoffice@grywo.nl" className="underline">
            backoffice@grywo.nl
          </a>
          .
        </p>
      </div>
    </main>
  );
}

function BedanktPagina({ kandidaatNaam }: { kandidaatNaam: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f0f23] text-white p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-3xl font-bold mb-2">Dank u wel!</h1>
        <p className="text-white/70 mb-4">
          Het contract voor <b>{kandidaatNaam}</b> is succesvol verwerkt en
          doorgestuurd naar onze backoffice.
        </p>
        <p className="text-white/50 text-sm">
          U ontvangt binnenkort de factuur per mail. Het originele contract is conform AVG vernietigd.
        </p>
      </div>
    </main>
  );
}
