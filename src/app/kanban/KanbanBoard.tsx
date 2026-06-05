"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setKanbanStap } from "./actions";
import { KANBAN_STAPPEN } from "@/utils/kanban";
import { PlaatsingModal } from "./PlaatsingModal";

type Kandidaat = {
  id: string;
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
  kanban_stap: string;
  score: number | null;
  open_voor: string | null;
};

const KOLOMMEN = KANBAN_STAPPEN.map(s => ({ key: s.key, titel: s.kortLabel, kleur: s.rand }));

export function KanbanBoard({
  initialKandidaten,
  isSetter = false,
}: {
  initialKandidaten: Kandidaat[];
  isSetter?: boolean;
}) {
  const router = useRouter();
  const [kandidaten, setKandidaten] = useState(initialKandidaten);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [plaatsModal, setPlaatsModal] = useState<{ id: string; naam: string; oudeStap: string } | null>(null);

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragEnd = () => { setDraggedId(null); setDragOverCol(null); };

  const handleDrop = (kolomKey: string) => {
    if (!draggedId) return;
    const kandidaat = kandidaten.find(k => k.id === draggedId);
    if (!kandidaat || kandidaat.kanban_stap === kolomKey) {
      setDraggedId(null); setDragOverCol(null); return;
    }

    // Speciale flow: sleep naar "geplaatst" → open modal
    if (kolomKey === "geplaatst") {
      const naam = `${kandidaat.voornaam}${kandidaat.tussenvoegsel ? " " + kandidaat.tussenvoegsel : ""} ${kandidaat.achternaam}`.trim();
      setPlaatsModal({ id: kandidaat.id, naam, oudeStap: kandidaat.kanban_stap });
      setDraggedId(null); setDragOverCol(null);
      return;
    }

    // Optimistic update
    setKandidaten(prev => prev.map(k => k.id === draggedId ? { ...k, kanban_stap: kolomKey } : k));
    setDraggedId(null); setDragOverCol(null);

    startTransition(async () => {
      const result = await setKanbanStap(draggedId, kolomKey);
      if (result.error) {
        alert(`Fout: ${result.error}`);
        // Revert
        setKandidaten(prev => prev.map(k => k.id === draggedId ? { ...k, kanban_stap: kandidaat.kanban_stap } : k));
      }
    });
  };

  const scoreColor = (s: number | null) =>
    s == null ? "text-gray-400" :
    s >= 75 ? "text-emerald-600" :
    s >= 50 ? "text-amber-600" : "text-red-500";

  return (
    <>
    <PlaatsingModal
      open={plaatsModal !== null}
      kandidaatId={plaatsModal?.id ?? ""}
      kandidaatNaam={plaatsModal?.naam ?? ""}
      onAnnuleer={() => setPlaatsModal(null)}
      onSucces={() => {
        // Update lokale state zodat kaart in "geplaatst"-kolom verschijnt
        if (plaatsModal) {
          setKandidaten(prev =>
            prev.map(k => k.id === plaatsModal.id ? { ...k, kanban_stap: "geplaatst" } : k)
          );
        }
        setPlaatsModal(null);
        router.refresh();
      }}
    />
    <div className="flex gap-3 overflow-x-auto pb-4" data-tour="kanban-board">
      {KOLOMMEN.map(kolom => {
        const items = kandidaten.filter(k => k.kanban_stap === kolom.key);
        const isOver = dragOverCol === kolom.key;
        return (
          <div
            key={kolom.key}
            data-tour={`kol-${kolom.key}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(kolom.key); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => handleDrop(kolom.key)}
            className={`min-w-[240px] max-w-[240px] bg-gray-50 rounded-lg p-3 flex-shrink-0 border-t-4 ${kolom.kleur} ${isOver ? "ring-2 ring-[#333399] bg-blue-50" : ""}`}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs uppercase font-bold text-gray-600">{kolom.titel}</h3>
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <div className="space-y-2 min-h-[40px]">
              {items.map(k => (
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
                    {k.open_voor && (
                      <div className="text-xs text-gray-500 truncate">{k.open_voor}</div>
                    )}
                    {/* Score alleen voor recruiter/admin/super — niet voor setter */}
                    {!isSetter && k.score != null && (
                      <div className={`text-xs font-semibold mt-1 ${scoreColor(k.score)}`}>
                        Score {k.score}/100
                      </div>
                    )}
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
