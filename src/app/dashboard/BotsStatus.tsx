import { createAdminClient } from "@/utils/supabase/admin";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Activity, Inbox, Database, Mail, Sparkles } from "lucide-react";

type Run = {
  id: string;
  cron_naam: string;
  status: string;
  duur_ms: number | null;
  resultaat: Record<string, unknown> | null;
  fout_melding: string | null;
  gestart_op: string;
};

type BotDef = {
  naam: string;
  label: string;
  beschrijving: string;
  schedule: string;
  icoon: React.ReactNode;
};

const BOTS: BotDef[] = [
  {
    naam: "reminders",
    label: "Kandidaat-reminders",
    beschrijving: "Stuurt herinneringsmails naar kandidaten (kennismaking + bellijst)",
    schedule: "08:00 + 13:00 (werkdagen)",
    icoon: <Mail size={16} />,
  },
  {
    naam: "agenda-reminders",
    label: "Agenda-reminders",
    beschrijving: "30-min push-notificatie voor afspraken en team-events",
    schedule: "elke 5-15 min",
    icoon: <Clock size={16} />,
  },
  {
    naam: "cleanup-avg",
    label: "AVG cleanup",
    beschrijving: "Verwijdert oude data: afgewezen kandidaten >4w, contracten >24u, oude tokens",
    schedule: "03:00 elke nacht",
    icoon: <Database size={16} />,
  },
];

export async function BotsStatus() {
  const admin = createAdminClient();
  // Haal voor elke bot de laatste 10 runs
  const { data: runs } = await admin
    .from("cron_runs")
    .select("id, cron_naam, status, duur_ms, resultaat, fout_melding, gestart_op")
    .order("gestart_op", { ascending: false })
    .limit(50);

  const rijen = runs ?? [];

  // Group by cron_naam
  const perBot = new Map<string, Run[]>();
  for (const r of rijen as Run[]) {
    const lijst = perBot.get(r.cron_naam) ?? [];
    lijst.push(r);
    perBot.set(r.cron_naam, lijst);
  }

  // Tellingen laatste 7 dagen
  const week = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return (
    <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Activity size={20} className="text-[#333399]" />
            Bots & Crons
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Live status van automatische processen (alleen voor jou zichtbaar)
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {BOTS.map((bot) => {
          const botRuns = perBot.get(bot.naam) ?? [];
          const laatste = botRuns[0];
          const weekRuns = botRuns.filter((r) => new Date(r.gestart_op).getTime() > week);
          const succes = weekRuns.filter((r) => r.status === "succes").length;
          const fout = weekRuns.filter((r) => r.status === "fout").length;
          const gedeeltelijk = weekRuns.filter((r) => r.status === "gedeeltelijk").length;

          return (
            <BotRij
              key={bot.naam}
              bot={bot}
              laatste={laatste}
              succes={succes}
              gedeeltelijk={gedeeltelijk}
              fout={fout}
            />
          );
        })}

        {/* Extra: AI / Anthropic — geen cron, maar handig om te laten zien dat het werkt */}
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#333399]/10 text-[#333399] flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800">Claude AI</div>
            <div className="text-xs text-gray-500">
              CV-parsing · contract-extractie · profielschets (Anthropic API)
            </div>
          </div>
          <div className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            on-demand
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-200 rounded-lg p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#333399]/10 text-[#333399] flex items-center justify-center flex-shrink-0">
            <Inbox size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800">Resend (mail)</div>
            <div className="text-xs text-gray-500">
              Verzending van alle systeem-mails via noreply@grywo.nl
            </div>
          </div>
          <div className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            on-demand
          </div>
        </div>
      </div>
    </section>
  );
}

function BotRij({
  bot,
  laatste,
  succes,
  gedeeltelijk,
  fout,
}: {
  bot: BotDef;
  laatste?: Run;
  succes: number;
  gedeeltelijk: number;
  fout: number;
}) {
  const status = laatste?.status ?? "onbekend";
  const noggedraaid = !!laatste;

  let statusIcoon: React.ReactNode;
  let statusKleur: string;
  let statusLabel: string;
  if (!noggedraaid) {
    statusIcoon = <Clock size={14} />;
    statusKleur = "text-gray-400";
    statusLabel = "Nog niet gedraaid";
  } else if (status === "succes") {
    statusIcoon = <CheckCircle2 size={14} />;
    statusKleur = "text-emerald-600";
    statusLabel = "OK";
  } else if (status === "gedeeltelijk") {
    statusIcoon = <AlertTriangle size={14} />;
    statusKleur = "text-amber-600";
    statusLabel = "Met fouten";
  } else if (status === "fout") {
    statusIcoon = <XCircle size={14} />;
    statusKleur = "text-red-600";
    statusLabel = "Mislukt";
  } else {
    statusIcoon = <Clock size={14} />;
    statusKleur = "text-gray-400";
    statusLabel = status;
  }

  const tijdGeleden = laatste ? formatRelatief(new Date(laatste.gestart_op)) : "—";
  const duur = laatste?.duur_ms ? `${(laatste.duur_ms / 1000).toFixed(1)}s` : "—";

  return (
    <details className="border border-gray-200 rounded-lg group">
      <summary className="cursor-pointer p-3.5 flex items-center gap-3 hover:bg-gray-50 rounded-lg">
        <div className="w-9 h-9 rounded-lg bg-[#333399]/10 text-[#333399] flex items-center justify-center flex-shrink-0">
          {bot.icoon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">{bot.label}</span>
            <span className={`text-xs inline-flex items-center gap-1 font-semibold ${statusKleur}`}>
              {statusIcoon}
              {statusLabel}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {bot.schedule} · laatste run: {tijdGeleden} {laatste && `(${duur})`}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="text-center">
            <div className="text-emerald-600 font-bold">{succes}</div>
            <div className="text-[10px] text-gray-400">OK</div>
          </div>
          {gedeeltelijk > 0 && (
            <div className="text-center">
              <div className="text-amber-600 font-bold">{gedeeltelijk}</div>
              <div className="text-[10px] text-gray-400">deels</div>
            </div>
          )}
          {fout > 0 && (
            <div className="text-center">
              <div className="text-red-600 font-bold">{fout}</div>
              <div className="text-[10px] text-gray-400">fout</div>
            </div>
          )}
          <div className="text-[10px] text-gray-400 max-w-[60px] leading-tight">
            laatste<br />7 dagen
          </div>
        </div>
      </summary>

      {/* Detail-paneel */}
      <div className="px-4 pb-4 pt-1 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-3 italic">{bot.beschrijving}</p>

        {laatste?.fout_melding && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <div className="text-xs font-semibold text-red-700 mb-1">⚠ Fout in laatste run:</div>
            <code className="text-xs text-red-800 whitespace-pre-wrap break-all">
              {laatste.fout_melding}
            </code>
          </div>
        )}

        {laatste?.resultaat && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
            <div className="text-xs font-semibold text-gray-600 mb-1">Resultaat laatste run:</div>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {JSON.stringify(laatste.resultaat, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <b className="text-gray-700">Schedule:</b> {bot.schedule} ·{" "}
          <b className="text-gray-700">Endpoint:</b> <code>/api/cron/{bot.naam}</code>
        </div>
      </div>
    </details>
  );
}

function formatRelatief(d: Date): string {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "zojuist";
  if (min < 60) return `${min} min geleden`;
  const uur = Math.floor(min / 60);
  if (uur < 24) return `${uur} uur geleden`;
  const dag = Math.floor(uur / 24);
  return `${dag} ${dag === 1 ? "dag" : "dagen"} geleden`;
}
