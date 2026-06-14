import Link from "next/link";
import { GrywoLogo } from "@/components/GrywoLogo";
import { createAdminClient } from "@/utils/supabase/admin";
import { valideerToken, verwijderMij } from "../actions";
import { AlertCircle, Trash2 } from "lucide-react";

export default async function MijnDataDetailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const res = await valideerToken(token);

  if (res.error || !res.row) {
    return (
      <FoutPage melding={res.error ?? "Onbekende link"} />
    );
  }

  const admin = createAdminClient();
  // Alleen kandidaat-eigen velden — GEEN interne kolommen (notitie, rode_vlaggen,
  // scores e.d.) tonen aan de kandidaat zelf.
  const { data: k } = await admin
    .from("kandidaten")
    .select("voornaam, tussenvoegsel, achternaam, email, telefoon, woonplaats, geboortedatum, opleiding, open_voor, status, profielschets, created_at")
    .eq("id", res.row.kandidaat_id)
    .single();

  if (!k) {
    return <FoutPage melding="Je gegevens zijn niet meer in ons systeem." />;
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#333399] rounded-2xl p-5 mb-4 flex items-center justify-center">
          <GrywoLogo size="md" wit={true} />
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hoi {k.voornaam}!</h1>
          <p className="text-sm text-gray-600 mb-6">
            Dit zijn de gegevens die Noah ATS over jou heeft opgeslagen. Wil je iets laten aanpassen of helemaal laten wissen?
            Gebruik onderstaande knop of mail naar <a href="mailto:info@noah-recruitment.nl" className="text-[#333399] font-semibold">info@noah-recruitment.nl</a>.
          </p>

          <div className="space-y-2 text-sm">
            <Veld label="Voornaam" v={k.voornaam} />
            <Veld label="Tussenvoegsel" v={k.tussenvoegsel} />
            <Veld label="Achternaam" v={k.achternaam} />
            <Veld label="E-mail" v={k.email} />
            <Veld label="Telefoon" v={k.telefoon} />
            <Veld label="Woonplaats" v={k.woonplaats} />
            <Veld label="Geboortedatum" v={k.geboortedatum} />
            <Veld label="Opleiding" v={k.opleiding} />
            <Veld label="Open voor" v={k.open_voor} />
            <Veld label="Status" v={k.status} />
            <Veld label="Profielschets" v={k.profielschets} />
            <Veld label="Aangemaakt op" v={k.created_at ? new Date(k.created_at).toLocaleString("nl-NL") : null} />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-4">
          <h2 className="text-lg font-bold text-red-900 mb-2 inline-flex items-center gap-2">
            <Trash2 size={18} /> Mijn gegevens laten verwijderen
          </h2>
          <p className="text-sm text-red-800 mb-4">
            Onder AVG art. 17 (recht op vergetelheid) kun je vragen om volledige verwijdering van je gegevens.
            Deze actie is <b>onomkeerbaar</b>. Eventueel lopende sollicitaties / processen worden direct gestopt.
          </p>
          <form action={verwijderMij}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-md text-sm inline-flex items-center gap-2"
            >
              <Trash2 size={14} /> Ja, verwijder al mijn gegevens
            </button>
          </form>
        </div>

        <div className="text-center py-5 text-xs text-gray-500">
          <Link href="/privacy" className="text-[#333399] font-semibold">Privacyverklaring</Link>
        </div>
      </div>
    </main>
  );
}

function Veld({ label, v }: { label: string; v: string | number | boolean | null | undefined }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-gray-100">
      <div className="text-xs font-semibold text-gray-500 w-1/3 pt-0.5">{label}</div>
      <div className="text-sm text-gray-800 flex-1 whitespace-pre-wrap">{String(v)}</div>
    </div>
  );
}

function FoutPage({ melding }: { melding: string }) {
  return (
    <main className="min-h-screen bg-[#f4f4f7] py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="bg-[#333399] rounded-2xl p-6 mb-6 inline-flex items-center justify-center w-full">
          <GrywoLogo size="lg" wit={true} />
        </div>
        <div className="bg-white rounded-2xl shadow-md p-10">
          <div className="w-14 h-14 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertCircle size={28} className="text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link ongeldig</h1>
          <p className="text-sm text-gray-600">{melding}</p>
          <Link href="/mijn-data" className="inline-block mt-6 text-sm font-semibold text-[#333399] hover:underline">
            ← Vraag een nieuwe link aan
          </Link>
        </div>
      </div>
    </main>
  );
}
