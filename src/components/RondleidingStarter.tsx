"use client";

import { useEffect } from "react";
import { RONDLEIDING_KEY, RONDLEIDING_PADEN, TOUR_GEZIEN_KEY } from "@/utils/rondleiding";

/**
 * Zet de globale rondleiding aan bij eerste login of via ?rondleiding=1.
 * Wordt alleen op /dashboard gerenderd. De PaginaTour-componenten op elke
 * pagina lezen de localStorage-vlag en starten dan automatisch.
 */
export function RondleidingStarter({ autoStart }: { autoStart: boolean }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const forceer = url.searchParams.get("rondleiding") === "1";

    let lokaalGezien = false;
    try { lokaalGezien = localStorage.getItem(TOUR_GEZIEN_KEY) === "1"; } catch {}

    const moetStarten = forceer || (autoStart && !lokaalGezien);
    if (!moetStarten) return;

    try {
      localStorage.setItem(RONDLEIDING_KEY, "1");
    } catch {}

    // ?rondleiding=1 weghalen zodat refresh hem niet opnieuw triggert
    if (forceer) {
      url.searchParams.delete("rondleiding");
      window.history.replaceState({}, "", url.toString());
    }

    // Niet op de eerste pagina? Navigeer ernaartoe — die mount triggert PaginaTour
    if (window.location.pathname !== RONDLEIDING_PADEN[0]) {
      window.location.assign(RONDLEIDING_PADEN[0]);
      return;
    }

    // Wel op /dashboard: PaginaTour staat al gemount maar heeft de localStorage
    // check al gedaan. We dispatchen een event waar 'ie naar luistert.
    setTimeout(() => {
      window.dispatchEvent(new Event("noah-rondleiding-start"));
    }, 300);
  }, [autoStart]);

  return null;
}
