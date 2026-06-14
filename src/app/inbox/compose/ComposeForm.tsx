"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { stuurMail } from "./actions";
import { SnippetPicker } from "@/components/SnippetPicker";
import { RichTextEditor, RichTextToolbar } from "@/components/RichTextEditor";
import { HandtekeningPreview } from "@/components/HandtekeningPreview";
import { stripLegacyHandtekening } from "@/utils/handtekening-html";

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

/**
 * Strip HTML naar plain text. Gebruikt een onzichtbare <div> in de DOM
 * zodat de browser zelf entiteiten decodeert en blok-elementen netjes
 * vertaalt naar regeleinden. Dit is de plain-text fallback voor mail-
 * clients die geen HTML renderen.
 */
function htmlNaarPlainText(html: string): string {
  if (typeof document === "undefined") return "";
  const wrap = document.createElement("div");
  wrap.innerHTML = html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n");
  return (wrap.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Escape voor execCommand('insertHTML'): tekstuele snippets mogen geen
 * HTML uit gaan ademen die de styling van de mail kan breken.
 */
function htmlEscape(tekst: string): string {
  return tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

export function ComposeForm({
  defaultNaar,
  defaultOnderwerp,
  defaultHandtekeningHtml,
  error,
}: {
  defaultNaar: string;
  defaultOnderwerp: string;
  defaultHandtekeningHtml: string;
  error?: string;
}) {
  const [naar, setNaar] = useState(defaultNaar);
  const [onderwerp, setOnderwerp] = useState(defaultOnderwerp);
  // Body is een HTML-string voor alleen de bewerkbare hoofdtekst.
  // De handtekening leeft als aparte read-only iframe onder de editor en
  // wordt door de server-action onder de body geplakt bij verzenden.
  const initieelBody = "";
  const [body, setBody] = useState(initieelBody);
  const [toon, setToon] = useState<Toon>("professioneel");
  const [toonOpen, setToonOpen] = useState(false);

  const [ai, startAi] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);
  const vorigeRef = useRef<string | null>(null);

  // Optimistic verzend-status. Zodra de gebruiker op "Verzenden" klikt,
  // verbergen we het formulier en tonen we een korte bevestiging, terwijl
  // de server-action op de achtergrond afhandelt en uiteindelijk redirect.
  const [bezig, setBezig] = useState(false);
  const verzendBezigRef = useRef(false);

  // Auto-save concept
  const [conceptId, setConceptId] = useState<string | null>(null);
  const [laatstOpgeslagen, setLaatstOpgeslagen] = useState<string | null>(null);
  const vorigSaveRef = useRef<string>("");
  const conceptIdRef = useRef<string | null>(null);
  const naarRef = useRef(naar);
  const onderwerpRef = useRef(onderwerp);
  const bodyRef = useRef(body);
  const bezigRef = useRef(false);

  useEffect(() => { naarRef.current = naar; }, [naar]);
  useEffect(() => { onderwerpRef.current = onderwerp; }, [onderwerp]);
  useEffect(() => { bodyRef.current = body; }, [body]);
  useEffect(() => { conceptIdRef.current = conceptId; }, [conceptId]);

  // Server-action faalde en redirectte naar /inbox/compose?error=... De page
  // wordt soft-genavigeerd, dezelfde ComposeForm blijft gemount maar krijgt
  // een nieuwe error-prop. Reset bezig zodat het formulier weer zichtbaar
  // wordt en de gebruiker kan corrigeren.
  useEffect(() => {
    if (error && error.length > 0) {
      setBezig(false);
      verzendBezigRef.current = false;
    }
  }, [error]);

  // Editor-ref voor snippet-invoegen en toolbar-commando's.
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Plain-text representatie van de HTML, voor de hidden "body"-input.
  const [bodyPlain, setBodyPlain] = useState("");
  useEffect(() => {
    setBodyPlain(htmlNaarPlainText(body));
  }, [body]);

  // Concept herstellen.
  useEffect(() => {
    const heeftQuerystring =
      defaultNaar.length > 0 || defaultOnderwerp.length > 0;
    if (heeftQuerystring) return;
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
        if (bodyRef.current !== initieelBody) return;
        if (naarRef.current.length > 0 || onderwerpRef.current.length > 0) return;
        setNaar(c.naar ?? "");
        setOnderwerp(c.onderwerp ?? "");
        const ruwe = (c.tekst ?? "") as string;
        const lijktOpHtml = /<[a-z][\s\S]*?>/i.test(ruwe);
        const alsHtml = lijktOpHtml
          ? ruwe
          : ruwe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        // Knip eventuele legacy handtekening (uit eerdere compose-versies) eraf
        // zodat we hem niet dubbel zien naast de iframe-preview.
        const schoon = stripLegacyHandtekening(alsHtml);
        setBody(schoon);
        setConceptId(c.id ?? null);
      } catch {
        // stil falen
      }
    })();
    return () => {
      geannuleerd = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function verbeterMetAi() {
    setAiError(null);
    const ruwePlain = htmlNaarPlainText(body);
    if (!ruwePlain.trim() || ruwePlain.trim().length < 5) {
      setAiError("Typ eerst je bericht, de AI verbetert wat je hebt");
      return;
    }
    vorigeRef.current = body;
    startAi(async () => {
      try {
        const res = await fetch("/api/inbox/verbeter-tekst", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tekst_html: body, onderwerp, naar, toon }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAiError(data.error ?? "AI gaf een fout");
          return;
        }
        // Backend levert nieuwe volledige HTML inclusief handtekening-wrapper.
        const nieuw = data.tekst_html ?? data.tekst ?? "";
        if (nieuw) setBody(nieuw);
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
    const el = editorRef.current;
    if (!el) {
      // Geen editor in beeld: gewoon achteraan plakken.
      setBody((b) => b + htmlEscape(tekst));
      return;
    }
    el.focus();
    // execCommand insertHTML respecteert de huidige cursorpositie.
    document.execCommand("insertHTML", false, htmlEscape(tekst));
    // execCommand vuurt niet altijd 'input', dus handmatig synct:
    setBody(el.innerHTML);
  }

  // Auto-save: elke 10s.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (bezigRef.current) return;
      // Niet meer opslaan zodra de gebruiker op "Verzenden" heeft geklikt:
      // anders vuurt er nog een laatste PUT terwijl de server-action al bezig
      // is met versturen en de redirect klaarzet.
      if (verzendBezigRef.current) return;

      const n = naarRef.current;
      const o = onderwerpRef.current;
      const b = bodyRef.current;
      const combined = `${n}${o}${b}`;

      if (combined === vorigSaveRef.current) return;
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
        // stil
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
      if (combined === vorigSaveRef.current) return;
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
    <>
      {bezig && (
        <div className="bg-white rounded-t-xl shadow-md max-w-3xl mx-auto p-8 text-center text-sm text-gray-500">
          Mail verstuurd
        </div>
      )}
    <form
      action={stuurMail}
      onSubmit={() => {
        verzendBezigRef.current = true;
        setBezig(true);
      }}
      className={`bg-white rounded-t-xl shadow-md max-w-3xl mx-auto overflow-hidden ${bezig ? "hidden" : ""}`}
    >
      {/* Concept-id en hidden body-velden voor de server-action. */}
      <input type="hidden" name="concept_id" value={conceptId ?? ""} />
      <input type="hidden" name="body_html" value={body} />
      <input type="hidden" name="body" value={bodyPlain} />
      <input type="hidden" name="handtekening_html" value={defaultHandtekeningHtml ?? ""} />

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-[#f6f8fb]">
        <h2 className="text-sm font-semibold text-gray-700">Nieuwe mail</h2>
      </div>

      {/* Aan */}
      <div className="border-b border-gray-200">
        <input
          name="naar"
          type="email"
          required
          value={naar}
          onChange={(e) => setNaar(e.target.value)}
          placeholder="Aan"
          className="w-full px-4 py-3 text-sm outline-none border-none bg-transparent"
        />
      </div>

      {/* Onderwerp */}
      <div className="border-b border-gray-200">
        <input
          name="onderwerp"
          required
          value={onderwerp}
          onChange={(e) => setOnderwerp(e.target.value)}
          placeholder="Onderwerp"
          className="w-full px-4 py-3 text-sm outline-none border-none bg-transparent"
        />
      </div>

      {/* Bericht */}
      <div>
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder="Hi, ..."
          editorRef={editorRef}
        />
        {aiError && (
          <div className="mx-4 mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
            {aiError}
          </div>
        )}
        <HandtekeningPreview html={defaultHandtekeningHtml} />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-[#fafbfc] px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Verzenden */}
          <button
            type="submit"
            disabled={ai || bezig}
            className="bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-full text-sm"
          >
            Verzenden
          </button>

          {/* Toolbar rich-text knoppen */}
          <div className="pl-2 ml-1 border-l border-gray-200">
            <RichTextToolbar editorRef={editorRef} />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Snippet / Toon / AI rechts */}
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

            <SnippetPicker onInvoegen={voegSnippetIn} />

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
                <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[180px]">
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

            <button
              type="button"
              onClick={verbeterMetAi}
              disabled={ai || htmlNaarPlainText(body).trim().length < 5}
              className="text-xs font-semibold text-white bg-gradient-to-r from-[#333399] to-[#5a5acc] hover:from-[#252573] hover:to-[#4040a5] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-md shadow-sm transition"
            >
              {ai ? "AI schrijft..." : "Verbeter met AI"}
            </button>

            {laatstOpgeslagen && (
              <span className="text-xs text-gray-400 pl-2">
                Concept opgeslagen om {laatstOpgeslagen}
              </span>
            )}
          </div>
        </div>
      </div>
    </form>
    </>
  );
}
