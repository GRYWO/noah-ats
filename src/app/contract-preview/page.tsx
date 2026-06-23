import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { NdaSetterTekst, SetterContractTekst, GebruiksvoorwaardenTekst } from "@/app/tekenen/[token]/DocumentTeksten";

export const metadata = { title: "Contract-preview" };

// Super-admin preview van de échte teken-documenten (zelfde teksten als de
// teken-pagina). Met voorbeeld-naam/-datum zodat je ze kan nalezen vóór je een
// setter uitnodigt.
export default async function ContractPreviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email ?? "")) redirect("/vacature-aanmaken");

  const naam = "Jan Voorbeeld";
  const bureau = "Noah recruitment";
  const datum = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-[#f4f4f7] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#333399] rounded-2xl p-5 mb-6 text-white">
          <div className="text-xs uppercase tracking-[0.18em] text-white/70">Preview · alleen voor jou zichtbaar</div>
          <h1 className="text-2xl font-bold mt-1">De echte teken-documenten</h1>
          <p className="text-sm text-white/80 mt-1">
            Dit zijn exact de documenten die een setter ziet en tekent (met voorbeeld-naam &ldquo;{naam}&rdquo;).
            Lees ze na — geef je wijzigingen door, dan pas ik de teksten aan.
          </p>
        </div>

        <DocKaart label="Document 1 · Geheimhoudingsverklaring (NDA)">
          <NdaSetterTekst naam={naam} bureau={bureau} datum={datum} />
        </DocKaart>

        <DocKaart label="Document 2 · Samenwerkingsovereenkomst">
          <SetterContractTekst naam={naam} datum={datum} />
        </DocKaart>

        <DocKaart label="Document 3 · Gebruiksvoorwaarden (recruiters/admins — geen setters)">
          <GebruiksvoorwaardenTekst naam={naam} rol="recruiter" bureau={bureau} datum={datum} />
        </DocKaart>
      </div>
    </main>
  );
}

function DocKaart({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 text-sm font-bold text-[#333399]">{label}</div>
      <div className="bg-white rounded-2xl shadow-sm p-8">{children}</div>
    </section>
  );
}
