"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { RONDLEIDING_PADEN, RONDLEIDING_KEY, TOUR_GEZIEN_KEY } from "@/utils/rondleiding";

// react-joyride v3 — named export "Joyride"
const Joyride = dynamic(
  async () => {
    const mod = await import("react-joyride");
    return mod.Joyride as unknown as React.ComponentType<Record<string, unknown>>;
  },
  { ssr: false, loading: () => null }
);

export type TourStap = {
  target: string;             // CSS selector OF "body" voor center-popup
  title: string;
  content: string;
  placement?: "auto" | "center" | "top" | "right" | "bottom" | "left";
  disableBeacon?: boolean;
};

type Props = {
  pad: string;          // unieke key per pagina, bv. "/kanban"
  naam: string;         // label voor de tour, bv. "Kanban"
  stappen: TourStap[];
};

/**
 * Per-pagina onboarding-tour.
 * - Bij actieve rondleiding: 1x automatisch starten op deze pagina, en bij
 *   'finished' doornavigeren naar de volgende pagina.
 * - Bij 'skip' / 'close': stoppen we de hele rondleiding (en zetten 'gezien').
 * - Anders: alleen starten via de 'Uitleg' knop rechtsonder.
 */
export function PaginaTour({ pad, naam, stappen }: Props) {
  const [actief, setActief] = useState(false);
  const router = useRouter();
  const gestart = useRef(false);

  // Auto-start tijdens een actieve globale rondleiding — maar maximaal 1x per mount
  useEffect(() => {
    function checkEnStart() {
      if (gestart.current) return;
      try {
        const aan = typeof window !== "undefined" && localStorage.getItem(RONDLEIDING_KEY) === "1";
        if (aan && RONDLEIDING_PADEN.includes(pad)) {
          gestart.current = true;
          setActief(true);
        }
      } catch {}
    }
    const t = setTimeout(checkEnStart, 900);
    window.addEventListener("noah-rondleiding-start", checkEnStart);
    return () => {
      clearTimeout(t);
      window.removeEventListener("noah-rondleiding-start", checkEnStart);
    };
  }, [pad]);

  function herstart() {
    gestart.current = true;
    setActief(false);
    setTimeout(() => setActief(true), 100);
  }

  function stopRondleidingHelemaal() {
    try {
      localStorage.removeItem(RONDLEIDING_KEY);
      localStorage.setItem(TOUR_GEZIEN_KEY, "1");
      fetch("/api/profile/onboarding-voltooid", { method: "POST" }).catch(() => {});
    } catch {}
  }

  function onCallback(data: {
    status?: string;
    action?: string;
    type?: string;
    step?: { target?: string };
  }) {
    // Target in beeld scrollen — handelt horizontale parents (zoals kanban) apart af
    if (typeof data.step?.target === "string" && data.step.target !== "body") {
      try {
        const el = document.querySelector(data.step.target) as HTMLElement | null;
        if (el) {
          // Vind de eerste horizontale-scroll ouder en center de kolom
          let parent: HTMLElement | null = el.parentElement;
          while (parent && parent !== document.body) {
            const cs = getComputedStyle(parent);
            if (parent.scrollWidth > parent.clientWidth &&
                (cs.overflowX === "auto" || cs.overflowX === "scroll")) {
              const parentRect = parent.getBoundingClientRect();
              const elRect = el.getBoundingClientRect();
              const offsetLeft = elRect.left - parentRect.left + parent.scrollLeft;
              const doel = offsetLeft - (parentRect.width / 2) + (elRect.width / 2);
              parent.scrollTo({ left: doel, behavior: "smooth" });
              break;
            }
            parent = parent.parentElement;
          }
          // Verticaal in beeld (binnen window)
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }
      } catch {}
    }

    // Klik op X (close) of "Sla over" stopt de HELE rondleiding
    if (data.action === "close" || data.status === "skipped") {
      setActief(false);
      stopRondleidingHelemaal();
      return;
    }

    // Pagina-tour klaar (alle stappen doorlopen): door naar volgende pagina
    if (data.status === "finished") {
      setActief(false);
      try {
        const rondleidingAan = typeof window !== "undefined" && localStorage.getItem(RONDLEIDING_KEY) === "1";
        if (!rondleidingAan) return; // standalone gebruik van de knop — geen vervolg

        const idx = RONDLEIDING_PADEN.indexOf(pad);
        if (idx !== -1 && idx < RONDLEIDING_PADEN.length - 1) {
          setTimeout(() => router.push(RONDLEIDING_PADEN[idx + 1]), 400);
        } else {
          // Laatste pagina: rondleiding voltooid
          stopRondleidingHelemaal();
        }
      } catch {}
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={herstart}
        title={`Uitleg over ${naam} opnieuw bekijken`}
        className="fixed bottom-20 right-4 z-30 inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-[#333399] hover:bg-[#333399]/5 px-3 py-2 rounded-full border border-[#333399]/20 shadow-sm"
      >
        <HelpCircle size={13} /> Uitleg
      </button>
      {actief && (
        <Joyride
          steps={stappen}
          run={actief}
          continuous
          showProgress
          showSkipButton
          scrollToFirstStep
          disableScrolling={false}
          callback={onCallback}
          locale={{ back: "Vorige", close: "Sluit", last: "Klaar", next: "Volgende", skip: "Sla over" }}
          styles={{
            options: {
              primaryColor: "#333399",
              zIndex: 10000,
              arrowColor: "#ffffff",
              backgroundColor: "#ffffff",
              textColor: "#1a1a2e",
            },
          }}
        />
      )}
    </>
  );
}
