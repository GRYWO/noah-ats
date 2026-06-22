"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubmitKnop } from "./SubmitKnop";
import { PlaatsKnop } from "./PlaatsKnop";
import { stelPoolVoor, verplaatsKandidaat } from "./actions";

export type PijplijnKandidaat = {
  id: string;
  voornaam: string | null;
  achternaam: string | null;
  woonplaats: string | null;
  kanban_stap: string | null;
  voorstel_status: string | null;
};

const KOLOMMEN: { key: string; kleur: string }[] = [
  { key: "Intake", kleur: "bg-amber-100 text-amber-800" },
  { key: "Pool", kleur: "bg-[#333399]/10 text-[#333399]" },
  { key: "Voorgesteld", kleur: "bg-[#333399]/10 text-[#333399]" },
  { key: "Gezien", kleur: "bg-indigo-100 text-indigo-800" },
  { key: "Op gesprek", kleur: "bg-emerald-100 text-emerald-800" },
  { key: "Afgewezen", kleur: "bg-red-100 text-red-700" },
  { key: "Geplaatst", kleur: "bg-emerald-600 text-white" },
];

// Fases waar een verplaatsing automatisch een mail verstuurt — daar vragen we
// eerst om bevestiging.
const MAIL_FASEN: Record<string, string> = {
  Voorgesteld: "Er gaat automatisch een mail met het voorstelprofiel naar de opdrachtgever.",
  Geplaatst: "Er gaat automatisch een mail naar de backoffice en — bij W&S — een contract-verzoek naar de opdrachtgever.",
};

function naamVan(k: PijplijnKandidaat): string {
  return [k.voornaam, k.achternaam].filter(Boolean).join(" ") || "Kandidaat";
}

// De voorstel-status gaat vóór op de kanban-fase. "kandidatenpool" wordt "Pool".
function faseLabelVan(k: PijplijnKandidaat): string {
  const eff = k.voorstel_status || k.kanban_stap;
  switch (eff) {
    case "kandidatenpool":
      return "Pool";
    case "nieuwe_sollicitatie":
    case "interne_intake":
    case "in_afwachting_cv":
      return "Intake";
    case "voorgesteld":
    case "in_proces":
      return "Voorgesteld";
    case "gezien":
      return "Gezien";
    case "op_gesprek":
      return "Op gesprek";
    case "afgewezen":
      return "Afgewezen";
    case "geplaatst":
      return "Geplaatst";
    default:
      return "Intake";
  }
}

// Pijplijn als kanban-bord: kolommen (vakjes) naast elkaar per fase, met de
// kandidaatnamen erin. Kaarten zijn met de hand te verslepen naar een andere
// kolom; de Pool-kolom heeft daarnaast de bulk-actie "Stel voor".
export function PijplijnBord({
  vacatureId,
  kandidaten,
}: {
  vacatureId: string;
  kandidaten: PijplijnKandidaat[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sleeptId, setSleeptId] = useState<string | null>(null);
  const [overKolom, setOverKolom] = useState<string | null>(null);

  const perLabel = new Map<string, PijplijnKandidaat[]>();
  for (const k of kandidaten) {
    const l = faseLabelVan(k);
    const arr = perLabel.get(l) ?? [];
    arr.push(k);
    perLabel.set(l, arr);
  }

  function verplaatsNaar(k: PijplijnKandidaat, naar: string) {
    if (faseLabelVan(k) === naar) return;
    const waarschuwing = MAIL_FASEN[naar];
    if (waarschuwing && !window.confirm(`${naamVan(k)} verplaatsen naar "${naar}"?\n\n${waarschuwing}`)) {
      return;
    }
    startTransition(async () => {
      await verplaatsKandidaat(k.id, vacatureId, naar);
      router.refresh();
    });
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-3 ${pending ? "opacity-60" : ""}`}>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-gray-800">Pijplijn</span>
        <span className="text-xs text-gray-400">Sleep een kandidaat naar een andere kolom om te verplaatsen.</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {KOLOMMEN.map((kol) => {
          const items = perLabel.get(kol.key) ?? [];
          const isPool = kol.key === "Pool";
          return (
            <div
              key={kol.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverKolom(kol.key);
              }}
              onDragLeave={() => setOverKolom((c) => (c === kol.key ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverKolom(null);
                const id = e.dataTransfer.getData("text/plain");
                const k = kandidaten.find((x) => x.id === id);
                if (k) verplaatsNaar(k, kol.key);
              }}
              className={`w-44 shrink-0 rounded-lg p-2 transition ${
                overKolom === kol.key ? "bg-[#333399]/10 ring-2 ring-[#333399]/40" : "bg-gray-50"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${kol.kleur}`}>{kol.key}</span>
                <span className="text-xs text-gray-400">{items.length}</span>
              </div>

              <div className="space-y-1.5">
                {items.map((k) => (
                  <div
                    key={k.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", k.id);
                      e.dataTransfer.effectAllowed = "move";
                      setSleeptId(k.id);
                    }}
                    onDragEnd={() => setSleeptId(null)}
                    className={`cursor-grab rounded-md bg-white px-2 py-1.5 text-xs text-gray-800 shadow-sm active:cursor-grabbing ${
                      sleeptId === k.id ? "opacity-50" : ""
                    }`}
                  >
                    {isPool ? (
                      <label className="flex items-start gap-1.5">
                        <input
                          form={`pool-${vacatureId}`}
                          type="checkbox"
                          name="ids"
                          value={k.id}
                          defaultChecked
                          className="mt-0.5 h-3.5 w-3.5 accent-[#333399]"
                        />
                        <span>
                          <span className="font-medium">{naamVan(k)}</span>
                          {k.woonplaats && <span className="text-gray-400"> · {k.woonplaats}</span>}
                        </span>
                      </label>
                    ) : (
                      <a href={`/kandidaten/${k.id}`} draggable={false} className="block hover:underline">
                        <span className="font-medium">{naamVan(k)}</span>
                        {k.woonplaats && <span className="text-gray-400"> · {k.woonplaats}</span>}
                      </a>
                    )}
                    {kol.key !== "Geplaatst" && kol.key !== "Afgewezen" && (
                      <PlaatsKnop vacatureId={vacatureId} kandidaatId={k.id} naam={naamVan(k)} />
                    )}
                  </div>
                ))}

                {isPool && items.length > 0 && (
                  <form id={`pool-${vacatureId}`} action={stelPoolVoor}>
                    <input type="hidden" name="vacature" value={vacatureId} />
                    <SubmitKnop
                      bezigTekst="Versturen…"
                      className="mt-1 w-full justify-center rounded-md bg-[#333399] px-2 py-1.5 text-xs font-semibold text-white hover:bg-[#27277a]"
                    >
                      Stel voor ({items.length})
                    </SubmitKnop>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
