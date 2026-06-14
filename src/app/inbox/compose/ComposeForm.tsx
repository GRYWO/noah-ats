"use client";

import { useState, useRef, useTransition } from "react";
import { stuurMail } from "./actions";

type Toon = "professioneel" | "vriendelijk" | "kort";
const TOON_OPTIES: Array<{ value: Toon; label: string; uitleg: string }> = [
  { value: "professioneel", label: "Professioneel", uitleg: "Zakelijk en duidelijk" },
  { value: "vriendelijk", label: "Vriendelijk", uitleg: "Warm en menselijk" },
  { value: "kort", label: "Kort", uitleg: "Alleen het hoognodige" },
];

export function ComposeForm({
  defaultNaar,
  defaultOnderwerp,
}: {
  defaultNaar: string;
  defaultOnderwerp: string;
}) {
  const [naar, setNaar] = useState(defaultNaar);
  const [onderwerp, setOnderwerp] = useState(defaultOnderwerp);
  const [body, setBody] = useState("");
  const [toon, setToon] = useState<Toon>("professioneel");
  const [toonOpen, setToonOpen] = useState(false);

  const [ai, startAi] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);
  const vorigeRef = useRef<string | null>(null);

  function verbeterMetAi() {
    setAiError(null);
    if (!body.trim() || body.trim().length < 5) {
      setAiError("Typ eerst je bericht — de AI verbetert wat je hebt");
      return;
    }
    vorigeRef.current = body;
    startAi(async () => {
      try {
        const res = await fetch("/api/inbox/verbeter-tekst", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tekst: body, onderwerp, naar, toon }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAiError(data.error ?? "AI gaf een fout");
          return;
        }
        setBody(data.tekst);
      } catch (e) {
        setAiError((e as Error).message);
      }
    });
  }

  function herstelOrigineel() {
    if (vorigeRef.current !== null) {
      setBody(vorigeRef.current);
      vorigeRef.current = null;
    }
  }

  const huidigeToon = TOON_OPTIES.find((t) => t.value === toon)!;

  return (
    <form action={stuurMail} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Aan *</label>
        <input
          name="naar"
          type="email"
          required
          value={naar}
          onChange={(e) => setNaar(e.target.value)}
          placeholder="ontvanger@bedrijf.nl"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Onderwerp *</label>
        <input
          name="onderwerp"
          required
          value={onderwerp}
          onChange={(e) => setOnderwerp(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-gray-600">Bericht *</label>

          <div className="flex items-center gap-2">
            {vorigeRef.current !== null && !ai && (
              <button
                type="button"
                onClick={herstelOrigineel}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition"
                title="Herstel originele tekst"
              >
                Origineel herstellen
              </button>
            )}

            {/* Toon-selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setToonOpen((o) => !o)}
                className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition border border-gray-200"
                title="Kies toon"
              >
                Toon: {huidigeToon.label}
              </button>
              {toonOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[180px]">
                  {TOON_OPTIES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setToon(opt.value);
                        setToonOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition ${
                        opt.value === toon ? "bg-[#333399]/5" : ""
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{opt.label}</div>
                      <div className="text-gray-500">{opt.uitleg}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Verbeter met AI knop */}
            <button
              type="button"
              onClick={verbeterMetAi}
              disabled={ai || body.trim().length < 5}
              className="text-xs font-semibold text-white bg-gradient-to-r from-[#333399] to-[#5a5acc] hover:from-[#252573] hover:to-[#4040a5] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-md shadow-sm transition"
            >
              {ai ? "AI schrijft..." : "Verbeter met AI"}
            </button>
          </div>
        </div>

        <textarea
          name="body"
          required
          rows={14}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-sans"
          placeholder="Hi, ..."
        />

        {aiError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
            {aiError}
          </div>
        )}

        <small className="text-gray-400 text-xs block mt-1">
          Je handtekening wordt automatisch toegevoegd.
        </small>
      </div>

      <button
        type="submit"
        disabled={ai}
        className="bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-50 text-white font-semibold px-8 py-2 rounded-md text-sm"
      >
        Verzenden
      </button>
    </form>
  );
}
