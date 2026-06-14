"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Gmail-style keyboard shortcuts voor de inbox.
 *
 * Shortcuts:
 *  - j : volgende mail in de lijst
 *  - k : vorige mail in de lijst
 *  - e of # : huidige mail verwijderen
 *  - u : escape geopende mail (terug naar lijst)
 *  - c : nieuwe mail (compose)
 *  - / : focus zoekbalk
 *  - ? : help-modal openen/sluiten
 *  - Escape : help-modal sluiten
 *
 * Navigatie werkt door het element met data-uid="<n>" te zoeken
 * en daar programmatisch op te klikken. Zo blijft KeyboardShortcuts
 * losgekoppeld van de InboxClient-state — die rendert al een <Link>
 * per mail-item en wij triggeren simpelweg dezelfde route-change.
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [helpOpen, setHelpOpen] = useState(false);

  // Lijst van alle mail-items in lees-volgorde ophalen via data-uid.
  const getMailItems = useCallback((): HTMLElement[] => {
    return Array.from(
      document.querySelectorAll<HTMLElement>("[data-uid]")
    );
  }, []);

  // Index van de huidige geopende mail in die lijst. -1 als niets open is.
  const getActiveIndex = useCallback((items: HTMLElement[]): number => {
    const huidigeUid = searchParams?.get("uid");
    if (!huidigeUid) return -1;
    return items.findIndex((el) => el.dataset.uid === huidigeUid);
  }, [searchParams]);

  // Klik op het item met index `i` — Next.js' Link in het item handelt
  // de route-change verder af.
  const klikOpItem = useCallback((items: HTMLElement[], i: number) => {
    const target = items[i];
    if (!target) return;
    // Scroll in beeld (smooth voelt overdreven voor j/k) en klik.
    target.scrollIntoView({ block: "nearest" });
    // We klikken op de <a> binnen het item als die er is, anders het item zelf.
    const link = target.querySelector<HTMLAnchorElement>("a[href]");
    if (link) {
      link.click();
    } else {
      target.click();
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Negeer als modifier-toetsen meedoen — die zijn voor browser-shortcuts.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Negeer als focus in een tekstveld zit (input/textarea/contenteditable).
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (t.isContentEditable) return;
      }

      // Help-modal sluiten met Escape vangen we eerst af.
      if (e.key === "Escape" && helpOpen) {
        e.preventDefault();
        setHelpOpen(false);
        return;
      }

      switch (e.key) {
        case "j": {
          e.preventDefault();
          const items = getMailItems();
          if (items.length === 0) return;
          const idx = getActiveIndex(items);
          const next = idx < 0 ? 0 : Math.min(items.length - 1, idx + 1);
          klikOpItem(items, next);
          break;
        }
        case "k": {
          e.preventDefault();
          const items = getMailItems();
          if (items.length === 0) return;
          const idx = getActiveIndex(items);
          const prev = idx <= 0 ? 0 : idx - 1;
          klikOpItem(items, prev);
          break;
        }
        case "e":
        case "#": {
          // Verwijder de huidige mail. We zoeken de delete-knop binnen het
          // detail-paneel (data-mail-action="delete") en klikken die.
          const btn = document.querySelector<HTMLButtonElement>(
            'button[data-mail-action="delete"]'
          );
          if (btn) {
            e.preventDefault();
            btn.click();
          }
          break;
        }
        case "u": {
          // Terug naar lijst — strip ?uid uit de huidige URL.
          if (!searchParams?.get("uid")) return;
          e.preventDefault();
          const params = new URLSearchParams(searchParams.toString());
          params.delete("uid");
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : (pathname ?? "/inbox"));
          break;
        }
        case "c": {
          e.preventDefault();
          router.push("/inbox/compose");
          break;
        }
        case "/": {
          // Focus zoekbalk als die in de DOM staat.
          const search = document.querySelector<HTMLInputElement>(
            'input[data-search="inbox"], input[type="search"]'
          );
          if (search) {
            e.preventDefault();
            search.focus();
            search.select();
          }
          break;
        }
        case "?": {
          e.preventDefault();
          setHelpOpen((v) => !v);
          break;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    helpOpen,
    getMailItems,
    getActiveIndex,
    klikOpItem,
    router,
    pathname,
    searchParams,
  ]);

  if (!helpOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onClick={() => setHelpOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Sneltoetsen"
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Sneltoetsen</h2>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Sluiten"
          >
            ×
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          {[
            { keys: ["j"], beschrijving: "Volgende mail" },
            { keys: ["k"], beschrijving: "Vorige mail" },
            { keys: ["e"], beschrijving: "Huidige mail verwijderen" },
            { keys: ["#"], beschrijving: "Huidige mail verwijderen" },
            { keys: ["u"], beschrijving: "Terug naar lijst" },
            { keys: ["c"], beschrijving: "Nieuwe mail" },
            { keys: ["/"], beschrijving: "Zoekbalk focussen" },
            { keys: ["?"], beschrijving: "Deze help tonen" },
            { keys: ["Esc"], beschrijving: "Sluit dit venster" },
          ].map((rij) => (
            <div key={rij.keys.join("+") + rij.beschrijving} className="flex justify-between items-center">
              <dt className="text-gray-700">{rij.beschrijving}</dt>
              <dd className="flex gap-1">
                {rij.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-800 min-w-[1.5rem] text-center"
                  >
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-gray-400 mt-4 pt-3 border-t">
          Sneltoetsen werken niet als de focus in een invoerveld zit.
        </p>
      </div>
    </div>
  );
}
