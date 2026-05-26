"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, X, Loader2, Check, UserPlus } from "lucide-react";
import { setCoachStatus } from "@/app/setters/coach-actions";

type User = { id: string; voornaam: string | null; achternaam: string | null; rol: string; is_coach: boolean };

export function CoachToevoegenKnop({ users }: { users: User[] }) {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function maakCoach(userId: string, isAlCoach: boolean) {
    setPendingId(userId);
    const fd = new FormData();
    fd.append("user_id", userId);
    fd.append("is_coach", isAlCoach ? "false" : "true");
    startTransition(async () => {
      const r = await setCoachStatus(fd);
      setPendingId(null);
      if (!r?.error) {
        router.refresh();
        if (!isAlCoach) setOpen(false);
      } else {
        alert(r.error);
      }
    });
  }

  const huidigeCoach = users.find(u => u.is_coach);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold px-4 py-2 rounded-md text-sm"
      >
        <Sparkles size={14} />
        {huidigeCoach
          ? `Coach: ${huidigeCoach.voornaam ?? ""} ${huidigeCoach.achternaam ?? ""}`.trim()
          : "Coach toewijzen"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800 inline-flex items-center gap-2">
                <Sparkles size={14} /> Coach toewijzen
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500">
                De coach krijgt automatisch alle 1-op-1 aanvragen en &quot;doel niet behaald&quot;-meldingen.
                Eén coach per bureau — wisselen kan altijd.
              </p>

              {users.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Nog geen users in dit bureau.</p>
              ) : (
                <ul className="divide-y border rounded-md max-h-80 overflow-y-auto">
                  {users.map((u) => {
                    const naam = `${u.voornaam ?? ""} ${u.achternaam ?? ""}`.trim() || "Onbekend";
                    const bezig = pendingId === u.id;
                    return (
                      <li key={u.id} className="px-4 py-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-800 truncate">{naam}</div>
                          <div className="text-xs text-gray-500">{u.rol}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => maakCoach(u.id, u.is_coach)}
                          disabled={bezig}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${
                            u.is_coach
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              : "bg-[#333399]/5 text-[#333399] hover:bg-[#333399]/10"
                          } disabled:opacity-50`}
                        >
                          {bezig ? <Loader2 size={11} className="animate-spin" /> : u.is_coach ? <Check size={11} /> : <UserPlus size={11} />}
                          {u.is_coach ? "Coach (klik om te verwijderen)" : "Maak coach"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <Link
                href="/setters"
                className="block text-center text-xs text-[#333399] hover:underline mt-2"
              >
                Nieuwe user aanmaken → ga naar Users
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
