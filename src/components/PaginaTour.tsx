"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { HelpCircle } from "lucide-react";

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

  function herstart() {
    setActief(false);
    setTimeout(() => setActief(true), 100);
  }

  function onCallback(data: { status?: string; action?: string; type?: string }) {
    if (data.status === "finished" || data.status === "skipped") {
      setActief(false);
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
