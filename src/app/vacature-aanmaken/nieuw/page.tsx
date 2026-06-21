import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TopBar } from "@/components/TopBar";
import { maakVacatureNoahAts } from "../actions";
import { AfsprakenSectie } from "../AfsprakenSectie";
import { SubmitKnop } from "../SubmitKnop";

export const metadata = { title: "Nieuwe vacature" };

const SECTOREN = [
  "Techniek & Industrie",
  "Bouw & Infra",
  "Logistiek & Transport",
  "Kantoor & Administratie",
  "Productie & Food",
  "Anders",
];
const DIENSTVERBANDEN = ["Uitzendbasis", "Werving & selectie"];

export default async function NieuweVacaturePage({
  searchParams,
}: {
  searchParams?: Promise<{ fout?: string; titel?: string; locatie?: string; telefoon?: string; bedrijf?: string; vondst?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = (await searchParams) ?? {};

  // Komt het vanuit een Jobdigger-vondst? Laad dan de gevonden vacature en vul
  // het formulier voor met alles wat we hebben (incl. de uitgelezen tekst).
  let vondst: {
    titel: string | null;
    plaats: string | null;
    telefoon: string | null;
    bedrijf: string | null;
    detail_tekst: string | null;
  } | null = null;
  if (sp.vondst) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("jobdigger_vondsten")
      .select("titel, plaats, telefoon, bedrijf, detail_tekst")
      .eq("id", sp.vondst)
      .maybeSingle();
    vondst = (data as unknown as typeof vondst) ?? null;
  }

  // Voorgevulde waarden: vondst heeft voorrang, anders losse URL-parameters.
  const vTitel = vondst?.titel ?? sp.titel ?? "";
  const vLocatie = vondst?.plaats ?? sp.locatie ?? "";
  const vTelefoon = vondst?.telefoon ?? sp.telefoon ?? "";
  const vBedrijf = vondst?.bedrijf ?? sp.bedrijf ?? "";
  const vTaken = vondst?.detail_tekst ?? "";

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="vacature-aanmaken" />
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/vacature-aanmaken" className="text-sm text-[#333399] hover:underline">
            &larr; Terug naar mijn vacatures
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mt-2">Nieuwe vacature</h1>
          <p className="text-gray-500 text-sm mt-1">
            Beantwoord de vragen. Noah schrijft er een aantrekkelijke, anonieme vacaturetekst van.
            De vacature komt direct online op noah-recruitment.nl met jou als contactpersoon.
          </p>
        </div>

        {sp.fout && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {sp.fout}
          </div>
        )}

        <form action={maakVacatureNoahAts} className="space-y-6">
          <Sectie titel="De functie">
            <Rij label="Functietitel" name="titel" placeholder="bv. Allround timmerman" required defaultValue={vTitel} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Sector" name="sector" opties={SECTOREN} />
              <Rij label="Locatie / regio" name="locatie" placeholder="bv. regio Tilburg" defaultValue={vLocatie} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Dienstverband" name="dienstverband" opties={DIENSTVERBANDEN} />
              <Rij label="Uren per week" name="uren" placeholder="bv. 32-40 uur" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Rij label="Gevraagde ervaring" name="ervaring" placeholder="bv. 2 tot 5 jaar" />
              <Rij label="Salarisindicatie" name="salaris" placeholder="bv. 2800 tot 3400 euro" />
            </div>
            <Tekst label="Wat ga je doen? (taken)" name="taken" placeholder="Beschrijf de belangrijkste taken." defaultValue={vTaken} />
            <Tekst label="Wat vraag je? (eisen)" name="eisen" placeholder="Diploma's, vaardigheden, rijbewijs, enzovoort." />
          </Sectie>

          <Sectie titel="Contactgegevens — alleen voor ons (niet op de website)">
            {vBedrijf && <input type="hidden" name="intern_bedrijf" value={vBedrijf} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <Rij label="Contactpersoon" name="contactpersoon" placeholder="Naam contactpersoon" required />
              <Rij label="Telefoonnummer" name="contact_telefoon" placeholder="bv. 06-12345678" required defaultValue={vTelefoon} />
            </div>
            <Rij
              label="E-mailadres (voor de automatische mail)"
              name="contact_mailadres"
              type="email"
              placeholder="naam@bedrijf.nl"
              required
            />
          </Sectie>

          <AfsprakenSectie />

          <SubmitKnop
            bezigTekst="Vacature aanmaken…"
            className="w-full rounded-xl bg-[#333399] py-3 font-semibold text-white hover:bg-[#27277a]"
          >
            Vacature aanmaken
          </SubmitKnop>
        </form>
      </div>
    </main>
  );
}

function Sectie({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 font-bold text-gray-800">{titel}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Rij({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
      />
    </label>
  );
}

function Tekst({ label, name, placeholder, defaultValue }: { label: string; name: string; placeholder?: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <textarea
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        rows={defaultValue ? 8 : 3}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
      />
    </label>
  );
}

function Select({ label, name, opties }: { label: string; name: string; opties: string[] }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <select
        name={name}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
      >
        <option value="">Kies een optie</option>
        {opties.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
