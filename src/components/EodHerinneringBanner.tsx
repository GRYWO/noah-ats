import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ListTodo } from "lucide-react";

function vandaagAmsterdam(): { datum: string; uurAms: number; isWerkdag: boolean } {
  const nu = new Date();
  const tz = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short",
    hour12: false,
  });
  const parts = tz.formatToParts(nu).reduce<Record<string, string>>((acc, p) => { if (p.type !== "literal") acc[p.type] = p.value; return acc; }, {});
  const datum = `${parts.year}-${parts.month}-${parts.day}`;
  const uurAms = parseInt(parts.hour ?? "0");
  const weekday = (parts.weekday ?? "").toLowerCase();
  const isWerkdag = !["zat", "zo"].some(w => weekday.startsWith(w));
  return { datum, uurAms, isWerkdag };
}

/**
 * Toont bovenaan elke pagina een prominente herinnering aan de setter zodra
 * het na 16:00 (Amsterdam) is op een werkdag en zijn EOD-rapport nog niet
 * is ingevuld. Klikbaar naar /coaching.
 */
export async function EodHerinneringBanner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (profile?.rol !== "setter") return null;

  const { datum, uurAms, isWerkdag } = vandaagAmsterdam();
  if (!isWerkdag) return null;
  if (uurAms < 16) return null;

  const { data: bestaand } = await supabase
    .from("eod_rapporten")
    .select("id")
    .eq("setter_id", user.id)
    .eq("rapport_datum", datum)
    .maybeSingle();
  if (bestaand) return null;

  return (
    <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between gap-4 flex-wrap sticky top-0 z-20">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ListTodo size={16} />
        Vul je EOD-rapport in voor je naar huis gaat — verplicht elke werkdag.
      </div>
      <Link
        href="/coaching"
        className="bg-white text-red-700 hover:bg-red-50 font-bold px-4 py-1.5 rounded-md text-sm"
      >
        Naar EOD-rapport
      </Link>
    </div>
  );
}
