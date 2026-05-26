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
    {
      icoon: <Phone size={12} />,
      label: "Belrecord",
      waarde: records.beste_calls_dag.aantal,
      eenheid: "calls",
      sub: fmtDatum(records.beste_calls_dag.datum),
    },
    {
      icoon: <CalendarCheck size={12} />,
      label: "Afspraken",
      waarde: records.beste_afspraken_dag.aantal,
      eenheid: "op 1 dag",
      sub: fmtDatum(records.beste_afspraken_dag.datum),
    },
    {
      icoon: <Briefcase size={12} />,
      label: "Plaatsingen",
      waarde: records.beste_plaatsingen_maand.aantal,
      eenheid: "in 1 maand",
      sub: fmtMaand(records.beste_plaatsingen_maand.maand),
    },
    {
      icoon: <Coins size={12} />,
      label: "Omzet",
      waarde: `€ ${Math.round(records.beste_omzet_maand.bedrag).toLocaleString("nl-NL")}`,
      eenheid: "in 1 maand",
      sub: fmtMaand(records.beste_omzet_maand.maand),
    },
    {
      icoon: <Flame size={12} />,
      label: "Streak",
      waarde: records.langste_streak,
      eenheid: records.langste_streak === 1 ? "dag" : "dagen",
      sub: "dagdoel behaald",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b inline-flex items-center gap-2">
        <Trophy size={16} /> Mijn persoonlijke records
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="bg-gradient-to-br from-[#333399]/5 to-amber-100/30 rounded-lg p-3 flex flex-col items-center justify-between text-center h-28"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 inline-flex items-center gap-1 whitespace-nowrap">
              {it.icoon}{it.label}
            </div>
            <div className="text-lg font-black text-[#333399] leading-tight">
              {it.waarde}{" "}
              <span className="text-[10px] font-semibold text-gray-500 normal-case tracking-normal">
                {it.eenheid}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 leading-tight truncate w-full" title={it.sub}>
              {it.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
