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

    // Als we niet op de eerste pagina staan, navigeer ernaartoe
    if (window.location.pathname !== RONDLEIDING_PADEN[0]) {
      window.location.assign(RONDLEIDING_PADEN[0]);
    }
    // Als we wel op /dashboard staan: PaginaTour daar pakt het op via de
    // RONDLEIDING_KEY in localStorage en start automatisch.
  }, [autoStart]);

  return null;
}
