import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TopBar } from "@/components/TopBar";
import { CalendarClock } from "lucide-react";
import { AnnuleerKnop } from "./AnnuleerKnop";
import { TestNuKnop } from "./TestNuKnop";
import { redirect } from "next/navigation";

type Herinnering = {
  id: string;
  titel: string;
  bericht: string | null;
  geplande_tijd: string;
  status: string;
  verstuurd_op: string | null;
  voor_user_id: string;
  gepland_door: string;
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; kleur: string }> = {
  open:        { label: "Gepland",     kleur: "bg-blue-50 text-blue-700 border-blue-200" },
  verstuurd:   { label: "Verstuurd",   kleur: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  geannuleerd: { label: "Geannuleerd", kleur: "bg-gray-50 text-gray-600 border-gray-200" },
};

export default async function HerinneringenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Eigen geplande + voor mij geplande herinneringen
  const { data: herinneringen } = await admin
    .from("geplande_notificaties")
    .select("id, titel, bericht, geplande_tijd, status, verstuurd_op, voor_user_id, gepland_door")
    .or(`gepland_door.eq.${user.id},voor_user_id.eq.${user.id}`)
    .order("geplande_tijd", { ascending: false })
    .limit(100);

  const ids = Array.from(
    new Set((herinneringen ?? []).flatMap((h) => [h.voor_user_id, h.gepland_door])),
  );
  const { data: users } = ids.length > 0
    ? await admin
        .from("profiles")
        .select("id, voornaam, achternaam")
        .in("id", ids)
    : { data: [] };
  const naamById = new Map<string, string>();
  for (const u of users ?? []) {
    naamById.set(u.id, `${u.voornaam ?? ""} ${u.achternaam ?? ""}`.trim() || "Onbekend");
  }

  const open = (herinneringen ?? []).filter((h) => h.status === "open");
  const archief = (herinneringen ?? []).filter((h) => h.status !== "open");

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar />

      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
              <CalendarClock size={22} className="text-[#333399]" />
              Herinneringen
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Geplande pop-ups voor jezelf of voor collega's. Open de notificatie-bel om er nieuwe toe te voegen.
            </p>
          </div>
          <TestNuKnop />
        </div>

        {open.length === 0 && archief.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-500">
            Nog geen herinneringen ingepland.
          </div>
        ) : (
          <>
            {open.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xs uppercase font-semibold text-gray-500 mb-2 tracking-wider">
                  Komende ({open.length})
                </h2>
                <div className="space-y-2">
                  {open.map((h) => (
                    <HerinneringRij
                      key={h.id}
                      h={h}
                      vanMij={h.gepland_door === user.id}
                      ontvangerNaam={naamById.get(h.voor_user_id) ?? "Onbekend"}
                      plannerNaam={naamById.get(h.gepland_door) ?? "Onbekend"}
                      magAnnuleren={h.gepland_door === user.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {archief.length > 0 && (
              <section>
                <h2 className="text-xs uppercase font-semibold text-gray-500 mb-2 tracking-wider">
                  Archief ({archief.length})
                </h2>
                <div className="space-y-2">
                  {archief.map((h) => (
                    <HerinneringRij
                      key={h.id}
                      h={h}
                      vanMij={h.gepland_door === user.id}
                      ontvangerNaam={naamById.get(h.voor_user_id) ?? "Onbekend"}
                      plannerNaam={naamById.get(h.gepland_door) ?? "Onbekend"}
                      magAnnuleren={false}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function HerinneringRij({
  h,
  vanMij,
  ontvangerNaam,
  plannerNaam,
  magAnnuleren,
}: {
  h: Herinnering;
  vanMij: boolean;
  ontvangerNaam: string;
  plannerNaam: string;
  magAnnuleren: boolean;
}) {
  const stat = STATUS_LABEL[h.status] ?? STATUS_LABEL.open;
  const datum = new Date(h.geplande_tijd).toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-start gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-bold text-gray-800">{h.titel}</h3>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stat.kleur}`}>
            {stat.label}
          </span>
        </div>
        {h.bericht && (
          <p className="text-sm text-gray-600 mb-2 whitespace-pre-line">{h.bericht}</p>
        )}
        <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
          <span><b>{datum}</b></span>
          <span>
            {vanMij
              ? `Voor ${ontvangerNaam === plannerNaam ? "mezelf" : ontvangerNaam}`
              : `Van ${plannerNaam}`}
          </span>
        </div>
      </div>
      {magAnnuleren && (
        <div className="flex-shrink-0">
          <AnnuleerKnop id={h.id} />
        </div>
      )}
    </div>
  );
}
