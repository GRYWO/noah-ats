"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { herstartTour } from "@/components/OnboardingTour";

export function TourHerstartKnop() {
  const [bezig, setBezig] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setBezig(true);
        await herstartTour();
        // Navigeer naar dashboard waar de tour kan starten
        window.location.href = "/dashboard";
      }}
      disabled={bezig}
      className="text-sm text-[#333399] hover:underline font-semibold inline-flex items-center gap-1.5"
    >
      <PlayCircle size={14} />
      {bezig ? "Bezig..." : "Tour opnieuw bekijken"}
    </button>
  );
}
