import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { Calendar, Video, MapPin, Trash2, Users, Briefcase, PartyPopper } from "lucide-react";
import { maakAgendaEvent, verwijderAgendaEvent } from "./actions";

type AgendaItem = {
  id: string;
  type: "1e_gesprek" | "2e_gesprek" | "startdatum" | "team_event";
  start: string;
  eind: string | null;
  titel: string;
  subtitel: string | null;
  linkUrl: string | null;
  meetUrl: string | null;
  locatie: string | null;
  beschrijving: string | null;
};

const TYPE_STYLE: Record<AgendaItem["type"], { kleur: string; label: string; icoon: React.ReactNode }> = {
  "1e_gesprek": { kleur: "border-l-amber-500 bg-amber-50/40",  label: "1e gesprek",     icoon: <Briefcase size={14} /> },
  "2e_gesprek": { kleur: "border-l-orange-500 bg-orange-50/40", label: "2e gesprek",     icoon: <Briefcase size={14} /> },
  "startdatum": { kleur: "border-l-emerald-500 bg-emerald-50/40", label: "Eerste werkdag", icoon: <PartyPopper size={14} /> },
  "team_event": { kleur: "border-l-[#333399] bg-blue-50/40",     label: "Team-afspraak",  icoon: <Users size={14} /> },
};

function groepeerPerDag(items: AgendaItem[]): Map<string, AgendaItem[]> {
  const map = new Map<string, AgendaItem[]>();
  for (const it of items) {
    const datum = new Date(it.start).toISOString().slice(0, 10);
    const arr = map.get(datum) ?? [];
    arr.push(it);
    map.set(datum, arr);
  }
  return map;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const userId = user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", userId)
    .single();
  if (!profile?.tenant_id) return null;

  const isAdmin = profile.rol === "admin";
  const rol = profile.rol;
  const tenantId = profile.tenant_id;

  // 1e + 2e gesprekken uit voorstellen
  let voorstellenQ = supabase
    .from("voorstellen")
    .select("id, kandidaat_id, bedrijf, opdrachtgever_naam, kennismaking_op, tweede_gesprek_op, setter_id, kandidaat:kandidaten(voornaam, achternaam, eigenaar_id)")
    .eq("tenant_id", tenantId)
    .eq("status", "uitnodigen");
  if (!isAdmin && rol === "setter") {
    voorstellenQ = voorstellenQ.eq("setter_id", userId);
  }
  const { data: voorstellen } = await voorstellenQ;

  // Plaatsingen (eerste werkdag)
  let plaatsingenQ = supabase
    .from("plaatsingen")
    .select("id, kandidaat_id, bedrijf, startdatum, aangemeld_door, kandidaat:kandidaten(voornaam, achternaam, eigenaar_id, cv_controle_door)")
    .eq("tenant_id", tenantId)
    .is("afgekeurd_op", null)
    .not("startdatum", "is", null)
    .gte("startdatum", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  if (!isAdmin) {
    // setter/recruiter alleen eigen
    plaatsingenQ = plaatsingenQ.eq("aangemeld_door", userId);
  }
  const { data: plaatsingen } = await plaatsingenQ;

  // Team-events (alle tenant-leden zien)
  const { data: teamEvents } = await supabase
    .from("agenda_events")
    .select("id, titel, beschrijving, start_op, eind_op, locatie, meet_url, aangemaakt_door")
    .eq("tenant_id", tenantId)
    .gte("start_op", new Date(Date.now() - 7 * 86400000).toISOString())
    .order("start_op", { ascending: true });

  // Recruiter-filter handmatig (eigen kandidaten): toon alleen items waar user = setter_id of cv_controle_door of eigenaar_id
  function userMagZienVoorstel(v: { setter_id: string | null; kandidaat: { eigenaar_id: string | null } | null }): boolean {
    if (isAdmin) return true;
    if (rol === "setter") {
      return v.setter_id === userId || v.kandidaat?.eigenaar_id === userId;
    }
    return true;
  }

  const items: AgendaItem[] = [];

  for (const v of voorstellen ?? []) {
    const k = Array.isArray(v.kandidaat) ? v.kandidaat[0] : v.kandidaat;
    const kandidaatNaam = `${k?.voornaam ?? ""} ${k?.achternaam ?? ""}`.trim();
    const bedrijf = v.bedrijf ?? v.opdrachtgever_naam ?? "Onbekend";
    if (v.kennismaking_op && userMagZienVoorstel({ setter_id: v.setter_id, kandidaat: k ? { eigenaar_id: k.eigenaar_id } : null })) {
      items.push({
        id: `v1-${v.id}`,
        type: "1e_gesprek",
        start: v.kennismaking_op,
        eind: null,
        titel: `${kandidaatNaam} — 1e gesprek`,
        subtitel: `bij ${bedrijf}`,
        linkUrl: `/kandidaten/${v.kandidaat_id}`,
        meetUrl: null,
        locatie: null,
        beschrijving: null,
      });
    }
    if (v.tweede_gesprek_op && userMagZienVoorstel({ setter_id: v.setter_id, kandidaat: k ? { eigenaar_id: k.eigenaar_id } : null })) {
      items.push({
        id: `v2-${v.id}`,
        type: "2e_gesprek",
        start: v.tweede_gesprek_op,
        eind: null,
        titel: `${kandidaatNaam} — 2e gesprek`,
        subtitel: `bij ${bedrijf}`,
        linkUrl: `/kandidaten/${v.kandidaat_id}`,
        meetUrl: null,
        locatie: null,
        beschrijving: null,
      });
    }
  }

  for (const p of plaatsingen ?? []) {
    const k = Array.isArray(p.kandidaat) ? p.kandidaat[0] : p.kandidaat;
    const kandidaatNaam = `${k?.voornaam ?? ""} ${k?.achternaam ?? ""}`.trim();
    items.push({
      id: `p-${p.id}`,
      type: "startdatum",
      start: new Date(p.startdatum + "T08:00:00").toISOString(),
      eind: null,
      titel: `${kandidaatNaam} start bij ${p.bedrijf ?? "klant"}`,
      subtitel: "Eerste werkdag",
      linkUrl: `/kandidaten/${p.kandidaat_id}`,
      meetUrl: null,
      locatie: null,
      beschrijving: null,
    });
  }

  for (const e of teamEvents ?? []) {
    items.push({
      id: `t-${e.id}`,
      type: "team_event",
      start: e.start_op,
      eind: e.eind_op,
      titel: e.titel,
      subtitel: null,
      linkUrl: null,
      meetUrl: e.meet_url,
      locatie: e.locatie,
      beschrijving: e.beschrijving,
    });
  }

  items.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const groepen = groepeerPerDag(items);
  const sortedDays = Array.from(groepen.keys()).sort();

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="agenda" />

      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
              <Calendar size={20} /> Agenda
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin ? "Alle afspraken binnen jouw bureau" : "Afspraken van jouw kandidaten + team-events"}
            </p>
          </div>
          {isAdmin && (
            <details className="bg-white rounded-xl shadow-sm">
              <summary className="cursor-pointer bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-2 rounded-md text-sm inline-flex items-center gap-2 list-none">
                <Users size={14} /> Team-afspraak toevoegen
              </summary>
              <form action={maakAgendaEvent} className="p-5 space-y-3 w-[480px] max-w-full">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Titel *</label>
                  <input name="titel" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Start *</label>
                    <input type="datetime-local" name="start_op" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Eind</label>
                    <input type="datetime-local" name="eind_op" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Google Meet URL</label>
                  <input name="meet_url" type="url" placeholder="https://meet.google.com/..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Locatie</label>
                  <input name="locatie" placeholder="Of een adres / online" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Beschrijving</label>
                  <textarea name="beschrijving" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm">
                  Aanmaken
                </button>
              </form>
            </details>
          )}
        </div>

        {ok && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">{ok === "event" ? "Team-afspraak toegevoegd" : "Opgeslagen"}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}

        {items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
            Geen aankomende afspraken.
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDays.map((dag) => {
              const dagItems = groepen.get(dag)!;
              const datum = new Date(dag);
              const datumLabel = datum.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
              return (
                <div key={dag}>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{datumLabel}</h2>
                  <div className="space-y-2">
                    {dagItems.map((it) => {
                      const style = TYPE_STYLE[it.type];
                      const tijd = new Date(it.start).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
                      const eindTijd = it.eind ? new Date(it.eind).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : null;
                      const isTeamEvent = it.type === "team_event";
                      return (
                        <div key={it.id} className={`bg-white rounded-lg shadow-sm border-l-4 ${style.kleur} p-4 flex items-start gap-4`}>
                          <div className="w-16 text-center shrink-0">
                            <div className="text-sm font-bold text-gray-800">{tijd}</div>
                            {eindTijd && <div className="text-xs text-gray-400">tot {eindTijd}</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 inline-flex items-center gap-1">
                                {style.icoon} {style.label}
                              </span>
                            </div>
                            <div className="font-semibold text-gray-800">
                              {it.linkUrl ? (
                                <Link href={it.linkUrl} className="hover:underline">{it.titel}</Link>
                              ) : it.titel}
                            </div>
                            {it.subtitel && <div className="text-xs text-gray-500">{it.subtitel}</div>}
                            {it.beschrijving && <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{it.beschrijving}</p>}
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              {it.meetUrl && (
                                <a href={it.meetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#333399] hover:underline font-semibold">
                                  <Video size={12} /> Google Meet
                                </a>
                              )}
                              {it.locatie && (
                                <span className="inline-flex items-center gap-1 text-gray-600">
                                  <MapPin size={12} /> {it.locatie}
                                </span>
                              )}
                            </div>
                          </div>
                          {isTeamEvent && isAdmin && (
                            <form action={verwijderAgendaEvent}>
                              <input type="hidden" name="id" value={it.id.replace(/^t-/, "")} />
                              <button type="submit" className="text-gray-400 hover:text-red-600 p-1" title="Verwijderen">
                                <Trash2 size={14} />
                              </button>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
