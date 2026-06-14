"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Render een mail-handtekening exact zoals hij later in de ontvangen mail
 * verschijnt. Gebruikt een iframe met srcDoc zodat Tailwind preflight,
 * contentEditable-defaults en andere page-CSS niet de inline table-styling
 * (gradient, padding, lettertypes) wegstrijken. Auto-resize op content-hoogte.
 */
export function HandtekeningPreview({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [hoogte, setHoogte] = useState<number>(80);

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html,body{margin:0;padding:0;background:transparent;}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a2e;}
a{color:#333399;}
table{border-collapse:separate;}
img{max-width:100%;height:auto;border:0;}
</style></head><body>${html || ""}</body></html>`;

  useEffect(() => {
    const ifr = iframeRef.current;
    if (!ifr) return;

    function meet(doc: Document) {
      const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
      setHoogte(h + 8);
    }

    function setup(): (() => void) | undefined {
      const doc = ifr!.contentDocument;
      if (!doc) return;
      meet(doc);
      // Alle handtekening-links openen in een nieuw browser-tabblad in plaats
      // van binnen de iframe. Zonder dit klikt de gebruiker op de website
      // en wordt die in de mini-iframe geladen.
      doc.querySelectorAll("a").forEach((a) => {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      });
      let obs: ResizeObserver | undefined;
      if (typeof ResizeObserver !== "undefined") {
        obs = new ResizeObserver(() => meet(doc));
        obs.observe(doc.body);
      }
      return () => {
        obs?.disconnect();
      };
    }

    let cleanup: (() => void) | undefined;
    if (ifr.contentDocument?.readyState === "complete") {
      cleanup = setup();
    } else {
      const onLoad = () => {
        cleanup = setup();
      };
      ifr.addEventListener("load", onLoad, { once: true });
      return () => {
        ifr.removeEventListener("load", onLoad);
        cleanup?.();
      };
    }
    return () => cleanup?.();
  }, [html]);

  if (!html || !html.trim()) return null;

  return (
    <div className="px-4 pb-4 pt-2 border-t border-gray-100">
      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">
        Handtekening
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        title="Handtekening"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{
          width: "100%",
          border: "none",
          height: `${hoogte}px`,
          display: "block",
        }}
      />
    </div>
  );
}
