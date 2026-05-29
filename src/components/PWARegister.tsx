"use client";

import { useEffect } from "react";

/**
 * Registreert de service worker zodra de page geladen is.
 * Wordt geladen in de root layout.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Registreer zodra browser idle is — geen impact op page load
    const reg = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((e) => console.warn("[PWA] SW registratie mislukt:", e));
    };

    if (document.readyState === "complete") reg();
    else window.addEventListener("load", reg, { once: true });
  }, []);

  return null;
}
