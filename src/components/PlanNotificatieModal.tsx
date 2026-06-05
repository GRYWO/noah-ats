"use client";

import { useState, useTransition, useEffect } from "react";
import { CalendarClock, Loader2, X, Check } from "lucide-react";
import { lijstTenantUsers, planNotificatie } from "./PlanNotificatieActies";

type User = {
  id: string;
  voornaam: string | null;
  achternaam: string | null;
};

export function PlanNotificatieModal({
  open,
  onClose,
  huidigeUserId,
}: {
  open: boolean;
  onClose: () => void;
  huidigeUserId: string;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [voorUserId, setVoorUserId] = useState(huidigeUserId);
  const [titel, setTitel] = useState("");
  const [bericht, setBericht] = useState("");
  const [datum, setDatum] = useState(""); // YYYY-MM-DD
  const [tijd, setTijd] = useState(""); // HH:mm
  const [bezig, startTransition] = useTransition();
  const [resultaat, setResultaat] = useState<"ok" | string | null>(null);

  useEffect(() => {
    if (open) {
      lijstTenantUsers().then(setUsers);
      // Default: over 1 uur
      const standaard = new Date(Date.now() + 60 * 60 * 1000);
      standaard.setSeconds(0, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      setDatum(`${standaard.getFullYear()}-${pad(standaard.getMonth() + 1)}-${pad(standaard.getDate())}`);
      setTijd(`${pad(standaard.getHours())}:${pad(standaard.getMinutes())}`);
      setTitel("");
      setBericht("");
      setVoorUserId(huidigeUserId);
      setResultaat(null);
    }
  }, [open, huidigeUserId]);

  if (!open) return null;

  function opslaan() {
    setResultaat(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("voor_user_id", voorUserId);
      fd.append("titel", titel);
      fd.append("bericht", bericht);
      // Combineer datum + tijd in een echte ISO-string in de lokale tijdzone
      // van de gebruiker. Server interpreteert ISO als absolute moment.
      const [jaar, maand, dag] = datum.split("-").map((n) => parseInt(n, 10));
      const [uren, minuten] = tijd.split(":").map((n) => parseInt(n, 10));
      const lokaalMoment = new Date(jaar, (maand || 1) - 1, dag || 1, uren || 0, minuten || 0, 0, 0);
      fd.append("geplande_tijd", lokaalMoment.toISOString());
      const r = await planNotificatie(fd);
      if (r.ok) {
        setResultaat("ok");
        setTimeout(() => onClose(), 1500);
      } else {
        setResultaat(r.error ?? "Onbekende fout");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold inline-flex items-center gap-2">
            <CalendarClock size={18} className="text-[#333399]" />
            Notificatie inplannen
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Sluiten"
          >
            <X size={18} />
          </button>
        </div>

        {resultaat === "ok" ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <Check size={28} />
            </div>
            <h3 className="text-base font-bold mb-1">Notificatie ingepland</h3>
            <p className="text-sm text-gray-600">
              Verschijnt automatisch op het ingestelde moment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Voor wie?</label>
              <select
                value={voorUserId}
                onChange={(e) => setVoorUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {users.map((u) => {
                  const naam = `${u.voornaam ?? ""} ${u.achternaam ?? ""}`.trim() || "Onbekend";
                  return (
                    <option key={u.id} value={u.id}>
                      {u.id === huidigeUserId ? `Mij (${naam})` : naam}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Datum</label>
                <input
                  type="date"
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                  style={{ colorScheme: "light", color: "#111827", backgroundColor: "#fff" }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tijd</label>
                <input
                  type="time"
                  value={tijd}
                  onChange={(e) => setTijd(e.target.value)}
                  step="60"
                  style={{ colorScheme: "light", color: "#111827", backgroundColor: "#fff" }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Titel *</label>
              <input
                type="text"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="bv. Bellen met opdrachtgever X"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Bericht (optioneel)</label>
              <textarea
                value={bericht}
                onChange={(e) => setBericht(e.target.value)}
                rows={3}
                placeholder="Korte herinnering met details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
              />
            </div>

            {typeof resultaat === "string" && resultaat !== "ok" && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {resultaat}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={opslaan}
                disabled={bezig}
                className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-2 disabled:opacity-60"
              >
                {bezig && <Loader2 size={14} className="animate-spin" />}
                Inplannen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
