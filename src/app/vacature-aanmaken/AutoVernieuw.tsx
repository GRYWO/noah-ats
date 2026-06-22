"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Ververst de pagina automatisch op de achtergrond (server-componenten opnieuw
// ophalen) zodat nieuwe zoekresultaten vanzelf verschijnen — zonder dat de
// gebruiker handmatig hoeft te verversen. Tijdens een lopende zoekopdracht
// sneller, anders rustiger om de server te ontzien. Ingevoerde tekst in
// formulieren blijft behouden (router.refresh is een 'soft' refresh).
export function AutoVernieuw({ snel = false }: { snel?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const interval = snel ? 3000 : 10000;
    const id = setInterval(() => router.refresh(), interval);
    return () => clearInterval(id);
  }, [router, snel]);
  return null;
}
