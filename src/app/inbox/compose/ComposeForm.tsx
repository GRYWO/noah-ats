"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { stuurMail } from "./actions";
import { SnippetPicker } from "@/components/SnippetPicker";

type Toon = "professioneel" | "vriendelijk" | "kort";
const TOON_OPTIES: Array<{ value: Toon; label: string; uitleg: string }> = [
  { value: "professioneel", label: "Professioneel", uitleg: "Zakelijk en duidelijk" },
  { value: "vriendelijk", label: "Vriendelijk", uitleg: "Warm en menselijk" },
  { value: "kort", label: "Kort", uitleg: "Alleen het hoognodige" },
];

function tijdHHMM(d: Date): string {
  const uu = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${uu}:${mm}`;
}

export function ComposeForm({
  defaultNaar,
  defaultOnderwerp,
  defaultHandtekening,
}: {
  defaultNaar: string;
  defaultOnderwerp: string;
  defaultHandtekening: string;
}) {
  const [naar, setNaar] = useState(defaultNaar);
  const [onderwerp, setOnderwerp] = useState(defaultOnderwerp);
  // Body start met 3 lege regels gevolgd door de handtekening, zodat de user
  // bovenaan kan typen en zijn handtekening al onderaan ziet staan.
  const initieelBody = defaultHandtekening
    ? `\n\n\n${defaultHandtekening}`
    : "";
  const [body, setBody] = useState(initieelBody);
  const [toon, setToon] = useState<Toon>("professioneel");
  const [toonOpen, setToonOpen] = useState(false);

  const [ai, startAi] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);
  const vorigeRef = useRef<string | null>(null);

  // Auto-save concept
  const [conceptId, setConceptId] = useState<string | null>(null);
  const [laatstOpgeslagen, setLaatstOpgeslagen] = useState<string | null>(null);
  const vorigSaveRef = useRef<string>("");
  const conceptIdRef = useRef<string | null>(null);
  const naarRef = useRef(naar);
  const onderwerpRef = useRef(onderwerp);
  const bodyRef = useRef(body);
  // Bezig-vlag voorkomt dat tegelijkertijd twee saves naar de server vertrekken
  // (race condition tussen interval-tick en beforeunload-flush).
  const bezigRef = useRef(false);

  // Refs synchroniseren zodat interval en beforeunload de laatste waardes lezen.
  useEffect(() => { naarRef.current = naar; }, [naar]);
  useEffect(() => { onderwerpRef.current = onderwerp; }, [onderwerp]);
  useEffect(() => { bodyRef.current = body; }, [body]);
  useEffect(() => { conceptIdRef.current = conceptId; }, [conceptId]);

  // Textarea ref voor cursor-positie bij snippet-invoegen
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Concept herstellen: bij mount kijken of er een laatst-opgeslagen concept
  // staat en dat invullen, MAAR alleen als de form nog leeg is en er geen
  // querystring-context is meegegeven (reply_to/subject).
  useEffect(() => {
    const heeftQuerystring =
      defaultNaar.length > 0 || defaultOnderwerp.length > 0;
    if (heeftQuerystring) return;
    // Body is bij mount alleen de (lege of handtekening-)init; als er al iets
    // anders staat, niet overschrijven.
    if (bodyRef.current !== initieelBody) return;

    let geannuleerd = false;
    (async () => {
      try {
        const res = await fetch("/api/mail/concept/laatste", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (geannuleerd) return;
        const c = data?.concept;
        if (!c) return;
        // Nog een keer checken dat de user intussen niet is gaan typen.
        if (bodyRef.current !== initieelBody) return;
        if (naarRef.current.length > 0 || onderwerpRef.current.length > 0) return;
        setNaar(c.naar ?? "");
        setOnderwerp(c.onderwerp ?? "");
        setBody(c.tekst ?? "");
        setConceptId(c.id ?? null);
      } catch {
        // stil falen, bij volgende save komt het concept opnieuw terecht.
      }
    })();
    return () => {
      geannuleerd = true;
    };
    // initieelBody is afgeleid van defaultHandtekening en stabiel binnen 1 mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function verbeterMetAi() {
    setAiError(null);
    if (!body.trim() || body.trim().length < 5) {
      setAiError("Typ eerst je bericht, de AI verbetert wat je hebt");
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

  function voegSnippetIn(tekst: string) {
    const el = textareaRef.current;
    if (!el) {
      setBody((b) => b + (b.endsWith("\n") || b.length === 0 ? "" : "\n") + tekst);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const eind = el.selectionEnd ?? body.length;
    const nieuw = body.slice(0, start) + tekst + body.slice(eind);
    setBody(nieuw);
    // Plaats cursor na ingevoegde tekst.
    requestAnimationFrame(() => {
      const pos = start + tekst.length;
      el.focus();
      try { el.setSelectionRange(pos, pos); } catch { /* no-op */ }
    });
  }

  // Auto-save: elke 10s als er iets veranderd is.
  useEffect(() => {
    const interval = setInterval(async () => {
      // Skip als er nog een save loopt; voorkomt race tussen interval en flush.
      if (bezigRef.current) return;

      const n = naarRef.current;
      const o = onderwerpRef.current;
      const b = bodyRef.current;
      const combined = `${n}${o}${b}`;

      if (combined === vorigSaveRef.current) return;
      // Skip lege concepten
      if (b.length < 5 && o.length < 3) return;

      bezigRef.current = true;
      try {
        const res = await fetch("/api/mail/concept", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: conceptIdRef.current,
            naar: n,
            onderwerp: o,
            tekst: b,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.id) {
          conceptIdRef.current = data.id;
          setConceptId(data.id);
        }
        vorigSaveRef.current = combined;
        setLaatstOpgeslagen(tijdHHMM(new Date()));
      } catch {
        // Stilte: volgende tick proberen we weer.
      } finally {
        bezigRef.current = false;
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Flush bij sluiten van tab.
  useEffect(() => {
    function flush() {
      const n = naarRef.current;
      const o = onderwerpRef.current;
      const b = bodyRef.current;
      if (b.length < 5 && o.length < 3) return;
      const combined = `${n}${o}${b}`;
      // Niets nieuws: skip.
      if (combined === vorigSaveRef.current) return;
      // Er loopt al een save: skip (anders dubbele insert).
      if (bezigRef.current) return;
      try {
        fetch("/api/mail/concept", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: conceptIdRef.current,
            naar: n,
            onderwerp: o,
            tekst: b,
          }),
          keepalive: true,
        });
      } catch {
        // niets
      }
    }
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  const huidigeToon = TOON_OPTIES.find((t) => t.value === toon)!;

  return (
    <form action={stuurMail} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      {/* Concept-id meesturen, zodat de server-action het concept kan verwijderen na verzenden. */}
      <input type="hidden" name="concept_id" value={conceptId ?? ""} />

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

            {/* Snippet-picker */}
            <SnippetPicker onInvoegen={voegSnippetIn} />

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
          ref={textareaRef}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-sans"
          placeholder="Hi, ..."
        />

        {aiError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
            {aiError}
          </div>
        )}

        <small className="text-gray-400 text-xs block mt-1">
          Handtekening staat hieronder, je kunt boven typen.
        </small>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={ai}
          className="bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-50 text-white font-semibold px-8 py-2 rounded-md text-sm"
        >
          Verzenden
        </button>
        {laatstOpgeslagen && (
          <span className="text-xs text-gray-400">
            Concept opgeslagen om {laatstOpgeslagen}
          </span>
        )}
      </div>
    </form>
  );
}
