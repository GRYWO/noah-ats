import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Trophy, Send, Calendar, CheckCircle2, XCircle } from "lucide-react";

type Periode = "vandaag" | "week" | "maand" | "jaar" | "alles";

function periodeStart(p: Periode): Date | null {
  const nu = new Date();
  switch (p) {
    case "vandaag": {
      const d = new Date(nu);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(nu);
      const day = d.getDay() || 7;
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (day - 1));
      return d;
    }
    case "maand": {
      return new Date(nu.getFullYear(), nu.getMonth(), 1);
    }
    case "jaar": {
      return new Date(nu.getFullYear(), 0, 1);
    }
    case "alles":
      return null;
  }
}

const PERIODES: { key: Periode; label: string }[] = [
  { key: "vandaag", label: "Vandaag" },
  { key: "week",    label: "Deze week" },
  { key: "maand",   label: "Deze maand" },
  { key: "jaar",    label: "Dit jaar" },
  { key: "alles",   label: "Alles" },
];

type SetterStat = {
  id: string;
  voornaam: string | null;
  achternaam: string | null;
  voorstellen_verstuurd: number;
  uitgenodigd: number;
  afgewezen: number;
  kennismakingen: number;
  plaatsingen: number;
};

export async function SetterPerformance({
  periode,
  beperkTotUserId,
}: {
  periode: Periode;
  beperkTotUserId?: string;
}) {
  const supabase = await createClient();
  const start = periodeStart(periode);
  const startIso = start?.toISOString();

  // Haal voorstellen op (met optionele datum-filter en optionele setter-filter)
  let voorstellenQ = supabase
    .from("voorstellen")
    .select("setter_id, status, verzonden_op, reactie_op, kennismaking_op");
  if (startIso) voorstellenQ = voorstellenQ.gte("verzonden_op", startIso);
  if (beperkTotUserId) voorstellenQ = voorstellenQ.eq("setter_id", beperkTotUserId);
  const { data: voorstellen } = await voorstellenQ;

  // Plaatsingen: kandidaten met status=geplaatst, plaatsing_mail_sent in periode
  let kandidatenQ = supabase
    .from("kandidaten")
    .select("eigenaar_id, status, plaatsing_mail_sent")
    .eq("status", "geplaatst");
  if (startIso) kandidatenQ = kandidatenQ.gte("plaatsing_mail_sent", startIso);
  if (beperkTotUserId) kandidatenQ = kandidatenQ.eq("eigenaar_id", beperkTotUserId);
  const { data: plaatsingen } = await kandidatenQ;

  // Haal alle setters/recruiters op om namen te hebben
  let profielQ = supabase
    .from("profiles")
    .select("id, voornaam, achternaam, rol")
    .eq("rol", "setter");
  if (beperkTotUserId) profielQ = profielQ.eq("id", beperkTotUserId);
  const { data: profielen } = await profielQ;

  // Aggreeer
  const stats = new Map<string, SetterStat>();
  for (const p of profielen ?? []) {
    stats.set(p.id, {
      id: p.id,
      voornaam: p.voornaam,
      achternaam: p.achternaam,
      voorstellen_verstuurd: 0,
      uitgenodigd: 0,
      afgewezen: 0,
      kennismakingen: 0,
      plaatsingen: 0,
    });
  }

  for (const v of voorstellen ?? []) {
    if (!v.setter_id) continue;
    const s = stats.get(v.setter_id);
    if (!s) continue;
    s.voorstellen_verstuurd++;
    if (v.status === "uitnodigen") s.uitgenodigd++;
    if (v.status === "niet_uitnodigen") s.afgewezen++;
    if (v.kennismaking_op) s.kennismakingen++;
  }

  for (const k of plaatsingen ?? []) {
    if (!k.eigenaar_id) continue;
    const s = stats.get(k.eigenaar_id);
    if (!s) continue;
    s.plaatsingen++;
  }

  const lijst = Array.from(stats.values())
    .sort((a, b) => (b.plaatsingen - a.plaatsingen) || (b.voorstellen_verstuurd - a.voorstellen_verstuurd));

  // Totalen
  const totaal = lijst.reduce((acc, s) => ({
    voorstellen_verstuurd: acc.voorstellen_verstuurd + s.voorstellen_verstuurd,
    uitgenodigd: acc.uitgenodigd + s.uitgenodigd,
    afgewezen: acc.afgewezen + s.afgewezen,
    kennismakingen: acc.kennismakingen + s.kennismakingen,
    plaatsingen: acc.plaatsingen + s.plaatsingen,
  }), { voorstellen_verstuurd: 0, uitgenodigd: 0, afgewezen: 0, kennismakingen: 0, plaatsingen: 0 });

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
      <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-800 inline-flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Performance per {beperkTotUserId ? "jou" : "setter"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Voorstellen, kennismakingen en plaatsingen.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIODES.map(p => {
            const actief = p.key === periode;
            return (
              <Link
                key={p.key}
                href={`/dashboard?periode=${p.key}`}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                  actief
                    ? "bg-[#333399] text-white border-[#333399]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Totalen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border-b">
        <Cel icoon={<Send size={14} />} label="Voorstellen" waarde={totaal.voorstellen_verstuurd} />
        <Cel icoon={<CheckCircle2 size={14} />} label="Uitgenodigd" waarde={totaal.uitgenodigd} kleur="text-emerald-700" />
        <Cel icoon={<XCircle size={14} />} label="Afgewezen" waarde={totaal.afgewezen} kleur="text-red-700" />
        <Cel icoon={<Calendar size={14} />} label="Kennismakingen" waarde={totaal.kennismakingen} kleur="text-blue-700" />
        <Cel icoon={<Trophy size={14} />} label="Plaatsingen" waarde={totaal.plaatsingen} kleur="text-amber-700" />
      </div>

      {/* Per setter */}
      {lijst.length === 0 ? (
        <div className="p-6 text-sm text-gray-500 text-center">Geen data voor deze periode.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="text-left px-5 py-2">Setter</th>
              <th className="text-right px-3 py-2">Voorstellen</th>
              <th className="text-right px-3 py-2">Uitgenodigd</th>
              <th className="text-right px-3 py-2">Afgewezen</th>
              <th className="text-right px-3 py-2">Kennismaking</th>
              <th className="text-right px-5 py-2">Plaatsingen</th>
            </tr>
          </thead>
          <tbody>
            {lijst.map((s, i) => {
              const isTop = i === 0 && s.plaatsingen > 0;
              return (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {isTop && <span className="mr-1.5">🏆</span>}
                    {s.voornaam} {s.achternaam}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700">{s.voorstellen_verstuurd}</td>
                  <td className="px-3 py-3 text-right text-emerald-700 font-semibold">{s.uitgenodigd}</td>
                  <td className="px-3 py-3 text-right text-red-700">{s.afgewezen}</td>
                  <td className="px-3 py-3 text-right text-blue-700 font-semibold">{s.kennismakingen}</td>
                  <td className="px-5 py-3 text-right text-amber-700 font-bold">{s.plaatsingen}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Cel({ icoon, label, waarde, kleur = "text-gray-800" }: {
  icoon: React.ReactNode;
  label: string;
  waarde: number;
  kleur?: string;
}) {
  return (
    <div className="p-4 border-r last:border-r-0 border-gray-100">
      <div className="text-xs text-gray-500 inline-flex items-center gap-1.5">{icoon} {label}</div>
      <div className={`text-2xl font-bold mt-1 ${kleur}`}>{waarde}</div>
    </div>
  );
}
