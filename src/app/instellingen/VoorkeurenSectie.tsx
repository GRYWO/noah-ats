"use client";

import { useState, useEffect } from "react";
import { Bell, RefreshCw, Check } from "lucide-react";

const AUTO_REFRESH_KEY = "noah-auto-refresh-sec";
const DESKTOP_NOTIF_KEY = "noah-desktop-notif";

export function VoorkeurenSectie() {
  const [refreshSec, setRefreshSec] = useState<number>(30); // default 30s
  const [desktopAan, setDesktopAan] = useState(true); // default aan
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const rRaw = localStorage.getItem(AUTO_REFRESH_KEY);
    const r = rRaw === null ? 30 : parseInt(rRaw); // default 30s
    setRefreshSec(isNaN(r) ? 30 : r);
    const dRaw = localStorage.getItem(DESKTOP_NOTIF_KEY);
    setDesktopAan(dRaw === null ? true : dRaw === "1"); // default aan
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  function kiesRefresh(sec: number) {
    setRefreshSec(sec);
    localStorage.setItem(AUTO_REFRESH_KEY, String(sec));
    window.dispatchEvent(new CustomEvent("noah-refresh-change", { detail: sec }));
  }

  async function toggleDesktop() {
    if (typeof Notification === "undefined") {
      alert("Je browser ondersteunt geen desktop-notificaties.");
      return;
    }
    if (!desktopAan) {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        alert("Toestemming geweigerd. Sta notificaties toe in je browser-instellingen.");
        return;
      }
      setDesktopAan(true);
      localStorage.setItem(DESKTOP_NOTIF_KEY, "1");
      // Test-notificatie
      new Notification("Noah ATS", {
        body: "Desktop-notificaties zijn aan ✓",
        icon: "/grywo-icoon.jpg",
      });
    } else {
      setDesktopAan(false);
      localStorage.setItem(DESKTOP_NOTIF_KEY, "0");
    }
  }

  const refreshOpties = [
    { sec: 0, label: "Uit" },
    { sec: 30, label: "30 sec" },
    { sec: 60, label: "1 min" },
    { sec: 300, label: "5 min" },
  ];

  return (
    <section className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Voorkeuren</h2>
        <p className="text-sm text-gray-500">Notificaties en automatisch vernieuwen.</p>
      </div>

      {/* Desktop-notificaties */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#333399]/10 text-[#333399] flex items-center justify-center">
            <Bell size={18} />
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-800">Desktop-notificaties</div>
            <p className="text-xs text-gray-500 mt-0.5 max-w-md">
              Krijg een browser-pop-up bij nieuwe kandidaten, voorstellen en berichten — ook als Noah op de achtergrond staat.
            </p>
            {permission === "denied" && (
              <p className="text-xs text-red-600 mt-1">
                Geweigerd. Sta toe via het slot-icoon in de adresbalk.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleDesktop}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            desktopAan ? "bg-[#333399]" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
              desktopAan ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Auto-refresh */}
      <div>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#333399]/10 text-[#333399] flex items-center justify-center">
            <RefreshCw size={18} />
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-800">Auto-vernieuwen</div>
            <p className="text-xs text-gray-500 mt-0.5">
              Kandidatenlijst en kanban automatisch ophalen zonder F5.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 ml-13">
          {refreshOpties.map((o) => {
            const actief = refreshSec === o.sec;
            return (
              <button
                key={o.sec}
                type="button"
                onClick={() => kiesRefresh(o.sec)}
                className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                  actief
                    ? "border-[#333399] bg-[#333399]/5 text-[#333399]"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                {actief && <Check size={12} className="inline mr-1" />}
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
