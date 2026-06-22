import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TopBar } from "@/components/TopBar";
import { updateVacatureNoahAts } from "../../actions";
import { AfsprakenSectie } from "../../AfsprakenSectie";
import { SubmitKnop } from "../../SubmitKnop";

export const metadata = { title: "Vacature bewerken" };

const SECTOREN = [
  "Techniek & Industrie",
  "Bouw & Infra",
  "Logistiek & Transport",
  "Kantoor & Administratie",
  "Productie & Food",
  "Anders",
];
const DIENSTVERBANDEN = ["Uitzendbasis", "Werving & selectie"];

type Vac = {
  eigenaar: string | null;
  titel: string | null;
  sector: string | null;
  locatie: string | null;
  dienstverband: string | null;
  uren: string | null;
  ervaring: string | null;
  salaris: string | null;
  taken: string | null;
  eisen: string | null;
  intern_contactpersoon: string | null;
  intern_telefoon: string | null;
  intern_mailadres: string | null;
  intern_bedrijf: string | null;
  afspraak_tarief_type: string | null;
  afspraak_ws_percentage: number | null;
  afspraak_ws_toelichting: string | null;
  afspraak_uitzend_factor: number | null;
  afspraak_uitzend_uren_per_week: string | null;
  afspraak_overname_na_uren: number | null;
};

export default async function VacatureBewerkenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ fout?: string }>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data } = await admin
    .from("rec_vacatures")
    .select(
      "eigenaar, titel, sector, locatie, dienstverband, uren, ervaring, salaris, taken, eisen, " +
        "intern_contactpersoon, intern_telefoon, intern_mailadres, intern_bedrijf, " +
        "afspraak_tarief_type, afspraak_ws_percentage, afspraak_ws_toelichting, " +
        "afspraak_uitzend_factor, afspraak_uitzend_uren_per_week, afspraak_overname_na_uren",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const v = data as unknown as Vac;

  // Alleen de eigenaar of een admin mag bewerken.
  const { data: profiel } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
  const rol = (profiel?.rol ?? "").toString().toLowerCase();
  const isAdmin = rol === "admin" || rol === "super-admin" || rol === "super_admin";
  if (v.eigenaar !== user.id && !isAdmin) redirect("/vacature-aanmaken");

  const afsprakenDefaults = {
    tarief: v.afspraak_tarief_type ?? "",
    wsPercentage: v.afspraak_ws_percentage != null ? String(v.afspraak_ws_percentage) : "",
    wsToelichting: v.afspraak_ws_toelichting ?? "",
    uitzendFactor: v.afspraak_uitzend_factor != null ? String(v.afspraak_uitzend_factor) : "2.4",
    uitzendUren: v.afspraak_uitzend_uren_per_week ?? "",
    overnameUren: v.afspraak_overname_na_uren != null ? String(v.afspraak_overname_na_uren) : "1040",
  };

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="vacature-aanmaken" />
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/vacature-aanmaken" className="text-sm text-[#333399] hover:underline">
            &larr; Terug naar mijn vacatures
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mt-2">Vacature bewerken</h1>
          <p className="text-gray-500 text-sm mt-1">
            Pas de vacature aan. Noah schrijft de anonieme website-tekst opnieuw bij het opslaan.
          </p>
        </div>

        {sp.fout && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {sp.fout}
          </div>
        )}

        <form action={updateVacatureNoahAts} className="space-y-6">
          <input type="hidden" name="id" value={id} />

          <Sectie titel="De functie">
            <Rij label="Functietitel" name="titel" required defaultValue={v.titel ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Sector" name="sector" opties={SECTOREN} defaultValue={v.sector ?? ""} />
              <Rij label="Locatie / regio" name="locatie" defaultValue={v.locatie ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Dienstverband" name="dienstverband" opties={DIENSTVERBANDEN} defaultValue={v.dienstverband ?? ""} />
              <Rij label="Uren per week" name="uren" defaultValue={v.uren ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Rij label="Gevraagde ervaring" name="ervaring" defaultValue={v.ervaring ?? ""} />
              <Rij label="Salarisindicatie" name="salaris" defaultValue={v.salaris ?? ""} />
            </div>
            <Tekst label="Wat ga je doen? (taken)" name="taken" defaultValue={v.taken ?? ""} />
            <Tekst label="Wat vraag je? (eisen)" name="eisen" defaultValue={v.eisen ?? ""} />
          </Sectie>

          <Sectie titel="Contactgegevens — alleen voor ons (niet op de website)">
            <Rij label="Bedrijf (intern)" name="intern_bedrijf" defaultValue={v.intern_bedrijf ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Rij label="Contactpersoon" name="contactpersoon" required defaultValue={v.intern_contactpersoon ?? ""} />
              <Rij label="Telefoonnummer" name="contact_telefoon" required defaultValue={v.intern_telefoon ?? ""} />
            </div>
            <Rij
              label="E-mailadres (voor de automatische mail)"
              name="contact_mailadres"
              type="email"
              required
              defaultValue={v.intern_mailadres ?? ""}
            />
          </Sectie>

          <AfsprakenSectie defaults={afsprakenDefaults} />

          <SubmitKnop
            bezigTekst="Opslaan…"
            className="w-full rounded-xl bg-[#333399] py-3 font-semibold text-white hover:bg-[#27277a]"
          >
            Wijzigingen opslaan
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
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
      />
    </label>
  );
}

function Tekst({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={defaultValue ? 8 : 3}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#333399]"
      />
    </label>
  );
}

function Select({ label, name, opties, defaultValue }: { label: string; name: string; opties: string[]; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
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
