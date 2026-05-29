import Image from "next/image";
import { createAdminClient } from "@/utils/supabase/admin";
import { TekenForm } from "./TekenForm";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TekenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: ond } = await admin
    .from("document_ondertekenaars")
    .select("id, voornaam, achternaam, email, status, envelope_id, getekend_op")
    .eq("token", token)
    .single();

  if (!ond) {
    return <FoutPagina titel="Link niet gevonden" tekst="De link is mogelijk verlopen of incorrect." />;
  }

  const { data: env } = await admin
    .from("document_envelopes")
    .select("id, titel, beschrijving, pdf_pad, status, vervalt_op")
    .eq("id", ond.envelope_id)
    .single();
  if (!env) return <FoutPagina titel="Document niet gevonden" tekst="Het bijbehorende document is verwijderd." />;

  if (env.status === "ingetrokken") {
    return <FoutPagina titel="Document ingetrokken" tekst="De afzender heeft dit document ingetrokken." />;
  }
  if (env.status === "vervallen" || new Date(env.vervalt_op) < new Date()) {
    return <FoutPagina titel="Document verlopen" tekst="De ondertekeningstermijn is verstreken." />;
  }
  if (ond.status === "getekend") {
    return (
      <BedanktPagina
        voornaam={ond.voornaam}
        titel={env.titel}
        getekendOp={ond.getekend_op}
      />
    );
  }

  // Signed URL voor PDF preview (1 uur geldig)
  const { data: signed } = await admin.storage.from("documenten").createSignedUrl(env.pdf_pad, 60 * 60);
  const pdfUrl = signed?.signedUrl ?? "";

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0f0f23] text-white flex flex-col">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23]"
      />

      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span>Powered by</span>
          <Image src="/grywo-logo-wit.png" alt="GRYWO" width={70} height={20} className="opacity-90" />
        </div>
        <div className="text-xs text-white/50">
          Verloopt {new Date(env.vervalt_op).toLocaleDateString("nl-NL")}
        </div>
      </header>

      <section className="relative z-10 flex-1 flex flex-col items-center justify-start px-6 py-4 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white text-center mb-2">
          {env.titel}
        </h1>
        <p className="text-white/60 text-sm text-center mb-2">
          Voor <b className="text-white">{ond.voornaam} {ond.achternaam}</b>
        </p>
        {env.beschrijving && (
          <p className="text-white/50 text-sm text-center max-w-2xl mb-6">{env.beschrijving}</p>
        )}

        {/* PDF preview */}
        <div className="w-full mb-6">
          <div className="text-xs uppercase text-white/50 font-semibold tracking-wider mb-2">Document</div>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden" style={{ height: "60vh", minHeight: "500px" }}>
            <iframe
              src={pdfUrl + "#toolbar=1&view=FitH"}
              className="w-full h-full"
              title={env.titel}
            />
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/60 hover:text-white underline inline-block mt-2"
          >
            Open in nieuw tabblad ↗
          </a>
        </div>

        {/* Teken-form */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <TekenForm
            token={token}
            voornaam={ond.voornaam}
            achternaam={ond.achternaam}
          />
        </div>

        <p className="text-[11px] text-white/40 mt-6 text-center max-w-xl">
          ⚖ Deze ondertekening is rechtsgeldig (eIDAS Simple Electronic Signature).
          IP-adres, browser-info en tijdstip worden in het uiteindelijke document opgenomen
          als bewijs.
        </p>
      </section>

      <footer className="relative z-10 px-8 py-6 text-center text-[11px] text-white/40">
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782
      </footer>
    </main>
  );
}

function FoutPagina({ titel, tekst }: { titel: string; tekst: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f0f23] text-white p-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-2">{titel}</h1>
        <p className="text-white/60 text-sm">{tekst}</p>
        <p className="text-white/50 text-xs mt-4">
          Vragen? Mail{" "}
          <a href="mailto:info@grywo.nl" className="underline">info@grywo.nl</a>
        </p>
      </div>
    </main>
  );
}

function BedanktPagina({
  voornaam,
  titel,
  getekendOp,
}: {
  voornaam: string;
  titel: string;
  getekendOp: string | null;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f0f23] text-white p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-4">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="text-3xl font-bold mb-2">Bedankt {voornaam}!</h1>
        <p className="text-white/70 mb-4">
          Je hebt <b className="text-white">{titel}</b> succesvol ondertekend.
        </p>
        {getekendOp && (
          <p className="text-white/50 text-xs">
            Getekend op {new Date(getekendOp).toLocaleString("nl-NL")}
          </p>
        )}
        <p className="text-white/40 text-xs mt-6">
          Je krijgt automatisch een kopie van het volledig getekende document
          zodra alle partijen hebben getekend.
        </p>
      </div>
    </main>
  );
}
