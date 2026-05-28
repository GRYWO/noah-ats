"use client";

import { useState, useEffect } from "react";
import { PanelLeftOpen, MousePointer2, Lock } from "lucide-react";

type SidebarModus = "handmatig" | "hover" | "altijd-open";

export function SidebarSectie() {
  const [modus, setModus] = useState<SidebarModus>("handmatig");

  useEffect(() => {
    const saved = (localStorage.getItem("noah-sidebar-modus") as SidebarModus | null) ?? "handmatig";
    setModus(saved);
  }, []);

  function kies(m: SidebarModus) {
    setModus(m);
    localStorage.setItem("noah-sidebar-modus", m);
    // Zorg dat de sidebar direct opnieuw inleest — emit een event
    window.dispatchEvent(new CustomEvent("noah-sidebar-modus-change", { detail: m }));
    // Voor "altijd-open" zetten we de open-flag direct
    if (m === "altijd-open") {
      localStorage.setItem("noah-sidebar-open", "1");
      document.documentElement.setAttribute("data-sidebar", "open");
    }
  }

  const opties: { id: SidebarModus; label: string; icoon: React.ReactNode; uitleg: string }[] = [
    {
      id: "handmatig",
      label: "Handmatig",
      icoon: <PanelLeftOpen size={18} />,
      uitleg: "Klik op de pijl om uit/in te klappen",
    },
    {
      id: "hover",
      label: "Bij hover",
      icoon: <MousePointer2 size={18} />,
      uitleg: "Sidebar schuift open zodra je er over hovert",
    },
    {
      id: "altijd-open",
      label: "Altijd open",
      icoon: <Lock size={18} />,
      uitleg: "Sidebar blijft permanent uitgeklapt",
    },
  ];

  return (
    <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Zijbalk</h2>
      <p className="text-sm text-gray-500 mb-4">
        Bepaal hoe het navigatiemenu zich gedraagt.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {opties.map((o) => {
          const actief = modus === o.id;
          return (
            <button
              key={o.id}
              onClick={() => kies(o.id)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                actief
                  ? "border-[#333399] bg-[#333399]/5 shadow-sm"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div
                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-2 ${
                  actief
                    ? "bg-[#333399] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {o.icoon}
              </div>
              <div
                className={`text-sm font-semibold ${
                  actief ? "text-[#333399]" : "text-gray-800"
                }`}
              >
                {o.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{o.uitleg}</div>
              {actief && (
                <div className="mt-2 text-[10px] uppercase font-bold text-[#333399] tracking-wider">
                  ● Actief
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
