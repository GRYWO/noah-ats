import Image from "next/image";
import { createAdminClient } from "@/utils/supabase/admin";
import { ReplyForm } from "./ReplyForm";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  email: "E-mailadres (Hostnet)",
  voys: "Voys-nummer",
  bevestiging: "Bevestiging",
};

export default async function ReageerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: aanvraag } = await admin
    .from("aanvragen")
    .select("type, aanvrager_naam, aanvrager_email, bureau_naam, voor_voornaam, voor_achternaam, bericht, reply_verzonden_op, created_at")
    .eq("token", token)
    .single();

  if (!aanvraag) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0f0f23] text-white p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Aanvraag niet gevonden</h1>
          <p className="text-white/60 text-sm">De link is mogelijk verlopen.</p>
        </div>
      </main>
    );
  }

  const typeLabel = TYPE_LABEL[aanvraag.type] ?? aanvraag.type;
  const alBeantwoord = !!aanvraag.reply_verzonden_op;

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

      <section className="relative z-10 flex-1 flex flex-col items-center justify-start px-6 py-4 max-w-2xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-2">
          Reageren op aanvraag
        </h1>
        <p className="text-white/60 text-sm text-center mb-8">
          Je antwoord wordt automatisch naar de aanvrager verstuurd
        </p>

        {/* Aanvraag-overzicht */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6">
          <div className="text-xs uppercase text-white/50 font-semibold tracking-wider mb-3">
            Originele aanvraag
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1.5 text-white/50 w-32">Type</td><td className="py-1.5 font-semibold">{typeLabel}</td></tr>
              <tr><td className="py-1.5 text-white/50">Bureau</td><td className="py-1.5 font-semibold">{aanvraag.bureau_naam}</td></tr>
              <tr><td className="py-1.5 text-white/50">Aanvrager</td><td className="py-1.5 font-semibold">{aanvraag.aanvrager_naam}</td></tr>
              <tr><td className="py-1.5 text-white/50">E-mail</td><td className="py-1.5"><a href={`mailto:${aanvraag.aanvrager_email}`} className="text-[#ffd84d] underline">{aanvraag.aanvrager_email}</a></td></tr>
              {aanvraag.voor_voornaam && (
                <tr><td className="py-1.5 text-white/50">Voor</td><td className="py-1.5 font-semibold">{aanvraag.voor_voornaam} {aanvraag.voor_achternaam}</td></tr>
              )}
              {aanvraag.bericht && (
                <tr>
                  <td className="py-1.5 text-white/50 align-top">Bericht</td>
                  <td className="py-1.5 whitespace-pre-wrap">{aanvraag.bericht}</td>
                </tr>
              )}
              <tr><td className="py-1.5 text-white/50">Datum</td><td className="py-1.5">{new Date(aanvraag.created_at).toLocaleString("nl-NL")}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Reply form */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          {alBeantwoord ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">✓</div>
              <h3 className="text-xl font-bold mb-1">Al beantwoord</h3>
              <p className="text-white/60 text-sm">
                Antwoord verstuurd op{" "}
                {new Date(aanvraag.reply_verzonden_op).toLocaleString("nl-NL")}
              </p>
            </div>
          ) : (
            <ReplyForm
              token={token}
              aanvragerNaam={aanvraag.aanvrager_naam ?? "aanvrager"}
              aanvragerEmail={aanvraag.aanvrager_email}
            />
          )}
        </div>

        <p className="text-xs text-white/40 mt-6 text-center">
          Dit antwoord wordt vanuit <b className="text-white/60">info@grywo.nl</b> verstuurd.
        </p>
      </section>

      <footer className="relative z-10 px-8 py-6 text-center text-[11px] text-white/40">
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782
      </footer>
    </main>
  );
}
