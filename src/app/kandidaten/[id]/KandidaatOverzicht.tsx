import {
  User, Mail, Phone, MapPin, GraduationCap, Briefcase,
  Car, Calendar, Wallet, Clock, FileCheck, Languages
} from "lucide-react";

type Kandidaat = {
  voornaam: string | null;
  tussenvoegsel: string | null;
  achternaam: string | null;
  email: string | null;
  telefoon: string | null;
  geslacht: string | null;
  leeftijd: number | null;
  woonplaats: string | null;
  opleiding: string | null;
  open_voor: string | null;
  rijbewijs: string | null;
  eigen_vervoer: boolean | null;
  max_reisafstand_km: number | null;
  soort_dienstverband: string | null;
  werving_of_uitzend: string | null;
  salaris_indicatie: string | null;
  tarief_ws: string | null;
  bijzonderheden: string | null;
  blacklist_bedrijven: string | null;
  profielschets: string | null;
  cv_geparseerd: { talen?: string; werkervaring?: string; vaardigheden?: string } | null;
};

export function KandidaatOverzicht({ k }: { k: Kandidaat }) {
  const cv = k.cv_geparseerd ?? {};
  const naam = `${k.voornaam ?? ""} ${k.tussenvoegsel ? k.tussenvoegsel + " " : ""}${k.achternaam ?? ""}`.trim();

  return (
    <div className="space-y-4">
      {k.profielschets && (
        <Card titel="Profielschets" icoon={<User size={14} />}>
          <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{k.profielschets}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card titel="Persoonlijk" icoon={<User size={14} />}>
          <Rij label="Naam" waarde={naam} />
          {k.leeftijd != null && <Rij label="Leeftijd" waarde={`${k.leeftijd} jaar`} />}
          {k.geslacht && <Rij label="Geslacht" waarde={k.geslacht} />}
          {k.email && <Rij label="E-mail" waarde={<a href={`mailto:${k.email}`} className="text-[#333399] hover:underline">{k.email}</a>} icoon={<Mail size={11} />} />}
          {k.telefoon && <Rij label="Telefoon" waarde={<a href={`tel:${k.telefoon}`} className="text-[#333399] hover:underline">{k.telefoon}</a>} icoon={<Phone size={11} />} />}
        </Card>

        <Card titel="Woon & vervoer" icoon={<MapPin size={14} />}>
          {k.woonplaats && <Rij label="Woonplaats" waarde={k.woonplaats} icoon={<MapPin size={11} />} />}
          {k.max_reisafstand_km != null && <Rij label="Max reisafstand" waarde={`${k.max_reisafstand_km} km`} />}
          {k.rijbewijs && <Rij label="Rijbewijs" waarde={k.rijbewijs} icoon={<Car size={11} />} />}
          {k.eigen_vervoer != null && <Rij label="Eigen vervoer" waarde={k.eigen_vervoer ? "Ja" : "Nee"} />}
        </Card>

        <Card titel="Opleiding & ervaring" icoon={<GraduationCap size={14} />}>
          {k.opleiding && <Rij label="Opleiding" waarde={k.opleiding} />}
          {cv.werkervaring && <Rij label="Werkervaring" waarde={cv.werkervaring} />}
          {cv.vaardigheden && <Rij label="Vaardigheden" waarde={cv.vaardigheden} />}
          {cv.talen && <Rij label="Talen" waarde={cv.talen} icoon={<Languages size={11} />} />}
        </Card>

        <Card titel="Werk & voorwaarden" icoon={<Briefcase size={14} />}>
          {k.open_voor && <Rij label="Open voor" waarde={k.open_voor} />}
          {k.soort_dienstverband && <Rij label="Dienstverband" waarde={k.soort_dienstverband} icoon={<Clock size={11} />} />}
          {k.werving_of_uitzend && <Rij label="Type" waarde={k.werving_of_uitzend} />}
          {k.salaris_indicatie && <Rij label="Salaris" waarde={k.salaris_indicatie} icoon={<Wallet size={11} />} />}
          {k.tarief_ws && <Rij label="Tarief W&S" waarde={k.tarief_ws} />}
        </Card>

        {(k.bijzonderheden || k.blacklist_bedrijven) && (
          <Card titel="Bijzonderheden" icoon={<FileCheck size={14} />} fullWidth>
            {k.bijzonderheden && <Rij label="Notitie" waarde={k.bijzonderheden} />}
            {k.blacklist_bedrijven && <Rij label="Niet bij" waarde={k.blacklist_bedrijven} />}
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ titel, icoon, children, fullWidth = false }: {
  titel: string;
  icoon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-5 ${fullWidth ? "md:col-span-2" : ""}`}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 inline-flex items-center gap-1.5">
        {icoon}{titel}
      </h3>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  );
}

function Rij({ label, waarde, icoon }: { label: string; waarde: React.ReactNode; icoon?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-32 text-gray-500 shrink-0 inline-flex items-center gap-1">{icoon}{label}</dt>
      <dd className="font-medium text-gray-800 flex-1 min-w-0">{waarde}</dd>
    </div>
  );
}
