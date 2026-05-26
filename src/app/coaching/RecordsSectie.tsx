import { Trophy, Phone, CalendarCheck, Briefcase, Coins, Flame } from "lucide-react";

export type Records = {
  beste_calls_dag: { aantal: number; datum: string | null };
  beste_afspraken_dag: { aantal: number; datum: string | null };
  beste_plaatsingen_maand: { aantal: number; maand: string | null };
  beste_omzet_maand: { bedrag: number; maand: string | null };
  langste_streak: number;  // opeenvolgende werkdagen met doel behaald
};

function fmtDatum(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMaand(m: string | null): string {
  if (!m) return "—";
  const d = new Date(m + "-01");
  return d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

export function RecordsSectie({ records }: { records: Records }) {
  const items = [
    { icoon: <Phone size={14} />,         label: "Beste belDag",         waarde: records.beste_calls_dag.aantal,           sub: fmtDatum(records.beste_calls_dag.datum) },
    { icoon: <CalendarCheck size={14} />, label: "Beste afspraken-dag",  waarde: records.beste_afspraken_dag.aantal,       sub: fmtDatum(records.beste_afspraken_dag.datum) },
    { icoon: <Briefcase size={14} />,     label: "Beste maand plaatsingen", waarde: records.beste_plaatsingen_maand.aantal, sub: fmtMaand(records.beste_plaatsingen_maand.maand) },
    { icoon: <Coins size={14} />,         label: "Beste maand omzet",    waarde: `€ ${Math.round(records.beste_omzet_maand.bedrag).toLocaleString("nl-NL")}`, sub: fmtMaand(records.beste_omzet_maand.maand) },
    { icoon: <Flame size={14} />,         label: "Langste streak",       waarde: `${records.langste_streak} dagen`,        sub: "dagdoel behaald" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b inline-flex items-center gap-2">
        <Trophy size={16} /> Mijn persoonlijke records
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {items.map((it) => (
          <div key={it.label} className="bg-gradient-to-br from-[#333399]/5 to-amber-100/30 rounded-lg p-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 inline-flex items-center justify-center gap-1">
              {it.icoon}{it.label}
            </div>
            <div className="text-xl font-black text-[#333399]">{it.waarde}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{it.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
