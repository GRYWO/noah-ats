"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Toont een vaste "Installeer Noah"-knop rechts-onder op mobiele schermen,
 * mits de browser het beforeinstallprompt-event gestuurd heeft.
 * Op desktop en in al-geinstalleerde PWA's blijft de knop verborgen.
 */
export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const standaloneMql = window.matchMedia("(display-mode: standalone)");
    const checkStandalone = () => setIsStandalone(standaloneMql.matches);
    checkStandalone();
    standaloneMql.addEventListener?.("change", checkStandalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("resize", checkMobile);
      standaloneMql.removeEventListener?.("change", checkStandalone);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferredPrompt || !isMobile || isStandalone) return null;

  const installeer = async () => {
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch (_) {
      // stil falen
    } finally {
      setDeferredPrompt(null);
    }
  };

  return (
    <button
      type="button"
      onClick={installeer}
      className="fixed bottom-4 right-4 z-50 px-5 py-3 rounded-full text-white text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity"
      style={{ backgroundColor: "#333399" }}
    >
      Installeer Noah
    </button>
  );
}
