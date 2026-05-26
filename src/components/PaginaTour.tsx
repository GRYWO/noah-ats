"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { RONDLEIDING_PADEN, RONDLEIDING_KEY } from "@/utils/rondleiding";

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
 * Per-pagina onboarding-tour. Start NIET automatisch — alleen via de
 * "Uitleg" knop rechtsonder. De globale welkom-rondleiding op dashboard
 * blijft wel automatisch starten bij eerste login.
 */
export function PaginaTour({ pad, naam, stappen }: Props) {
  const [actief, setActief] = useState(false);
  const router = useRouter();

  // Auto-start tijdens een actieve globale rondleiding
  useEffect(() => {
    function checkEnStart() {
      try {
        const aan = typeof window !== "undefined" && localStorage.getItem(RONDLEIDING_KEY) === "1";
        if (aan && RONDLEIDING_PADEN.includes(pad)) {
          setActief(true);
        }
      } catch {}
    }
    // Eerst bij mount checken (voor navigatie binnen rondleiding)
    const t = setTimeout(checkEnStart, 900);
    // Plus luisteren naar event vanaf RondleidingStarter (voor /dashboard race)
    window.addEventListener("noah-rondleiding-start", checkEnStart);
    return () => {
      clearTimeout(t);
      window.removeEventListener("noah-rondleiding-start", checkEnStart);
    };
  }, [pad]);

  function herstart() {
    setActief(false);
    setTimeout(() => setActief(true), 100);
  }

  function onCallback(data: { status?: string; action?: string; type?: string }) {
    if (data.status === "finished" || data.status === "skipped") {
      setActief(false);
      // Tijdens actieve rondleiding: navigeer door naar de volgende pagina
      try {
        if (typeof window !== "undefined" && localStorage.getItem(RONDLEIDING_KEY) === "1") {
          const idx = RONDLEIDING_PADEN.indexOf(pad);
          if (idx !== -1 && idx < RONDLEIDING_PADEN.length - 1) {
            // Wachten zodat de tour-overlay weg is voor we navigeren
            setTimeout(() => router.push(RONDLEIDING_PADEN[idx + 1]), 400);
          } else {
            // Rondleiding voltooid
            localStorage.removeItem(RONDLEIDING_KEY);
            localStorage.setItem("noah-tour-gezien", "1");
            // Voltooid in DB markeren (zelfde endpoint als de bestaande tour)
            fetch("/api/profile/onboarding-voltooid", { method: "POST" }).catch(() => {});
          }
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
