"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setKanbanFase } from "./actions";
import { PlaatsingModal } from "./PlaatsingModal";

type Kandidaat = {
  id: string;
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
  kanban_stap: string | null;
  voorstel_status: string | null;
  score: number | null;
  open_voor: string | null;
};

// De 7 fases van de pijplijn.
const KOLOMMEN: { key: string; kleur: string }[] = [
  { key: "Intake", kleur: "border-amber-500" },
  { key: "Pool", kleur: "border-slate-500" },
  { key: "Voorgesteld", kleur: "border-indigo-500" },
  { key: "Gezien", kleur: "border-blue-500" },
  { key: "Op gesprek", kleur: "border-emerald-500" },
  { key: "Afgewezen", kleur: "border-red-500" },
  { key: "Geplaatst", kleur: "border-green-600" },
];

// voorstel_status gaat vóór op kanban_stap.
function faseVan(k: Kandidaat): string {
  const eff = k.voorstel_status || k.kanban_stap || "";
  switch (eff) {
    case "kandidatenpool":
      return "Pool";
    case "voorgesteld":
    case "in_proces":
    case "voorgesteld_opdrachtgever":
      return "Voorgesteld";
    case "gezien":
      return "Gezien";
    case "op_gesprek":
    case "1e_gesprek":
    case "2e_gesprek":
      return "Op gesprek";
    case "afgewezen":
      return "Afgewezen";
    case "geplaatst":
      return "Geplaatst";
    default:
      return "Intake";
  }
}

// Optimistische velden per doel-fase (zelfde mapping als de server-actie).
const FASE_VELDEN: Record<string, { kanban_stap: string; voorstel_status: string | null }> = {
  Intake: { kanban_stap: "interne_intake", voorstel_status: null },
  Pool: { kanban_stap: "kandidatenpool", voorstel_status: null },
  Voorgesteld: { kanban_stap: "in_proces", voorstel_status: "voorgesteld" },
  Gezien: { kanban_stap: "in_proces", voorstel_status: "gezien" },
  "Op gesprek": { kanban_stap: "in_proces", voorstel_status: "op_gesprek" },
  Afgewezen: { kanban_stap: "in_proces", voorstel_status: "afgewezen" },
};

export function KanbanBoard({ initialKandidaten }: { initialKandidaten: Kandidaat[]; isSetter?: boolean }) {
  const router = useRouter();
  const [kandidaten, setKandidaten] = useState(initialKandidaten);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [plaatsModal, setPlaatsModal] = useState<{ id: string; naam: string } | null>(null);

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragEnd = () => { setDraggedId(null); setDragOverCol(null); };

  const handleDrop = (kolomKey: string) => {
    if (!draggedId) return;
    const kandidaat = kandidaten.find((k) => k.id === draggedId);
    if (!kandidaat || faseVan(kandidaat) === kolomKey) {
      setDraggedId(null); setDragOverCol(null); return;
    }

    // Sleep naar "Geplaatst" → plaatsings-dialoog.
    if (kolomKey === "Geplaatst") {
      const naam = `${kandidaat.voornaam}${kandidaat.tussenvoegsel ? " " + kandidaat.tussenvoegsel : ""} ${kandidaat.achternaam}`.trim();
      setPlaatsModal({ id: kandidaat.id, naam });
      setDraggedId(null); setDragOverCol(null);
      return;
    }

    const velden = FASE_VELDEN[kolomKey];
    const vorige = { kanban_stap: kandidaat.kanban_stap, voorstel_status: kandidaat.voorstel_status };
    setKandidaten((prev) => prev.map((k) => (k.id === draggedId ? { ...k, ...velden } : k)));
    setDraggedId(null); setDragOverCol(null);

    startTransition(async () => {
      const result = await setKanbanFase(draggedId, kolomKey);
      if (result.error) {
        alert(`Fout: ${result.error}`);
        setKandidaten((prev) => prev.map((k) => (k.id === draggedId ? { ...k, ...vorige } : k)));
      }
    });
  };

  return (
    <>
      <PlaatsingModal
        open={plaatsModal !== null}
        kandidaatId={plaatsModal?.id ?? ""}
        kandidaatNaam={plaatsModal?.naam ?? ""}
        onAnnuleer={() => setPlaatsModal(null)}
        onSucces={() => {
          if (plaatsModal) {
            setKandidaten((prev) => prev.map((k) => (k.id === plaatsModal.id ? { ...k, kanban_stap: "geplaatst", voorstel_status: "geplaatst" } : k)));
          }
          setPlaatsModal(null);
          router.refresh();
        }}
      />
      <div className="flex gap-3 overflow-x-auto pb-4" data-tour="kanban-board">
        {KOLOMMEN.map((kolom) => {
          const items = kandidaten.filter((k) => faseVan(k) === kolom.key);
          const isOver = dragOverCol === kolom.key;
          return (
            <div
              key={kolom.key}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(kolom.key); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(kolom.key)}
              className={`min-w-[240px] max-w-[240px] bg-gray-50 rounded-lg p-3 flex-shrink-0 border-t-4 ${kolom.kleur} ${isOver ? "ring-2 ring-[#333399] bg-blue-50" : ""}`}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs uppercase font-bold text-gray-600">{kolom.key}</h3>
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[40px]">
                {items.map((k) => (
                  <div
                    key={k.id}
                    draggable
                    onDragStart={() => handleDragStart(k.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white p-3 rounded-md shadow-sm cursor-move hover:shadow-md transition border-l-4 border-[#333399] ${draggedId === k.id ? "opacity-40" : ""}`}
                  >
                    <Link href={`/kandidaten/${k.id}`} className="block">
                      <div className="font-semibold text-sm text-gray-800 mb-1">
                        {k.voornaam} {k.tussenvoegsel ? `${k.tussenvoegsel} ` : ""}{k.achternaam}
                      </div>
                      {k.open_voor && <div className="text-xs text-gray-500 truncate">{k.open_voor}</div>}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
