"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const KEY = "noah-auto-refresh-sec";

/**
 * Onzichtbare component die periodiek router.refresh() aanroept
 * volgens de gebruikersvoorkeur uit /instellingen.
 */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function start() {
      stop();
      const sec = parseInt(localStorage.getItem(KEY) ?? "0");
      if (!sec || sec < 10) return;
      timer = setInterval(() => {
        // Niet refreshen als tab onzichtbaar is — bandbreedte sparen
        if (document.visibilityState === "visible") {
          router.refresh();
        }
      }, sec * 1000);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    start();
    function onChange() {
      start();
    }
    window.addEventListener("noah-refresh-change", onChange);
    return () => {
      stop();
      window.removeEventListener("noah-refresh-change", onChange);
    };
  }, [router]);

  return null;
}
