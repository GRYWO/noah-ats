"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Klein rond badge-bolletje met aantal ongelezen mails.
 * Wordt op het E-mail-item in de sidebar getoond. Polled elke 30 sec
 * (en bij window focus) zodat de teller actueel blijft ook als je
 * niet op de inbox-pagina bent.
 */
export function MailBadge() {
  const [aantal, setAantal] = useState<number>(0);
  const vorigeRef = useRef<number>(0);

  useEffect(() => {
    let actief = true;

    async function fetchCount() {
      try {
        const r = await fetch("/api/mail/ongelezen-count", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (!actief) return;
        const nieuw = Number(data.totaal ?? 0);
        // Pieptoon bij meer mail dan vorige check
        if (nieuw > vorigeRef.current && vorigeRef.current > 0) {
          try {
            const audio = new Audio("/notificatie.mp3");
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch (_) {}
        }
        vorigeRef.current = nieuw;
        setAantal(nieuw);
      } catch (_) {
        /* stil falen */
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30_000); // 30 sec
    // Ook direct refreshen wanneer tab weer focus krijgt
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);

    return () => {
      actief = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (aantal <= 0) return null;

  return (
    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
      {aantal > 99 ? "99+" : aantal}
    </span>
  );
}
