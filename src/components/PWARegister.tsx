"use client";

import { useEffect } from "react";

/**
 * Registreert de service worker zodra de page geladen is.
 * Wordt geladen in de root layout.
 *
 * Auto-update strategie:
 * - Bij elke pageload checkt de SW of er een nieuwere versie is.
 * - Zodra die geactiveerd is (skipWaiting in sw.js) detecteren we dat
 *   en doen we 1× window.location.reload() — gebruiker ziet meteen het
 *   nieuwe icoon/de nieuwe assets zonder handmatige cache-leeg.
 * - We bewaken een sessionStorage-vlag om reload-loops te voorkomen.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const reg = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Force update-check bij elke pageload (Chrome doet dit standaard 1×/24u)
        registration.update().catch(() => {});

        // Als er een nieuwe SW klaar staat → reload zodra hij actief is
        registration.addEventListener("updatefound", () => {
          const nieuwe = registration.installing;
          if (!nieuwe) return;
          nieuwe.addEventListener("statechange", () => {
            if (nieuwe.state === "activated" && navigator.serviceWorker.controller) {
              if (!sessionStorage.getItem("noah-sw-reloaded")) {
                sessionStorage.setItem("noah-sw-reloaded", "1");
                window.location.reload();
              }
            }
          });
        });
      } catch (e) {
        console.warn("[PWA] SW registratie mislukt:", e);
      }
    };

    if (document.readyState === "complete") reg();
    else window.addEventListener("load", reg, { once: true });
  }, []);

  return null;
}
