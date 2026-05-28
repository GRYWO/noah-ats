"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Thema = "light" | "dark" | "system";

export function ThemaSectie() {
  const [thema, setThema] = useState<Thema>("light");

  // Init vanaf localStorage
  useEffect(() => {
    const saved = (localStorage.getItem("noah-theme") as Thema | null) ?? "light";
    setThema(saved);
    pasToe(saved);
  }, []);

  function pasToe(t: Thema) {
    const html = document.documentElement;
    if (t === "dark") {
      html.classList.add("dark");
    } else if (t === "light") {
      html.classList.remove("dark");
    } else {
      // system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) html.classList.add("dark");
      else html.classList.remove("dark");
    }
  }

  function kies(t: Thema) {
    setThema(t);
    localStorage.setItem("noah-theme", t);
    pasToe(t);
  }

  const opties: { id: Thema; label: string; icoon: React.ReactNode; uitleg: string }[] = [
    {
      id: "light",
      label: "Licht",
      icoon: <Sun size={18} />,
      uitleg: "Witte achtergrond met donkere tekst",
    },
    {
      id: "dark",
      label: "Donker",
      icoon: <Moon size={18} />,
      uitleg: "Donkere achtergrond, prettig 's avonds",
    },
    {
      id: "system",
      label: "Systeem",
      icoon: <Monitor size={18} />,
      uitleg: "Volgt instelling van je apparaat",
    },
  ];

  return (
    <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Weergave</h2>
      <p className="text-sm text-gray-500 mb-4">
        Kies hoe Noah er voor jou uitziet. Geldt alleen voor dit apparaat.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {opties.map((o) => {
          const actief = thema === o.id;
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
