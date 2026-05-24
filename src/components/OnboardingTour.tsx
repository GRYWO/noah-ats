"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Step } from "react-joyride";

type CallBackData = {
  status: string;
  action: string;
  type: string;
};

// react-joyride exporteert ReactJoyride als default; bij dynamic moeten we 'm casten
// naar een geldige ComponentType voor next/dynamic.
const Joyride = dynamic(
  () => import("react-joyride") as unknown as Promise<{
    default: React.ComponentType<Record<string, unknown>>;
  }>,
  { ssr: false }
);

type Rol = "admin" | "recruiter" | "setter" | "super_admin";

const STAPPEN_BASIS: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Welkom bij Noah",
    content:
      "We laten je in 15 stappen de belangrijkste plekken zien. Klik 'Volgende' om door te lopen, of 'Sla over' om later zelf te ontdekken.",
  },
  {
    target: 'a[href="/dashboard"]',
    title: "Dashboard",
    content:
      "Hier zie je live cijfers van het bureau: pipeline, voorstellen, en performance per setter.",
  },
  {
    target: 'a[href="/kandidaten"]',
    title: "Kandidaten",
    content:
      "Het hart van Noah. Hier staan al je kandidaten. Klik op een naam om de volledige info te zien.",
  },
  {
    target: 'a[href="/kanban"]',
    title: "Kanban",
    content:
      "Versleep kandidaten tussen pipeline-fases: van shortlist tot geplaatst.",
  },
];

const STAPPEN_VOORSTELLEN: Step[] = [
  {
    target: 'a[href="/voorstellen"]',
    title: "Voorstellen",
    content:
      "Alle lopende voorstellen op één plek met filter op status (wachten / akkoord / afgewezen / verlopen).",
  },
  {
    target: 'a[href="/opdrachtgevers"]',
    title: "CRM",
    content:
      "Je relaties: leads, prospects, klanten en partners. Klik door voor contactpersonen + bellijst-historie.",
  },
];

const STAPPEN_TOOLS: Step[] = [
  {
    target: 'a[href="/robin"]',
    title: "Robin (Recruit Robin)",
    content:
      "Direct vanuit Noah toegang tot Recruit Robin via de Noah-extensie. Geen wisselen meer tussen tabs.",
  },
  {
    target: 'a[href="/jobdigger"]',
    title: "Jobdigger",
    content:
      "Bellijsten maken in Jobdigger. Downloads worden automatisch in Noah geïmporteerd voor de actieve kandidaat.",
  },
  {
    target: 'a[href="/inbox"]',
    title: "E-mail (inbox)",
    content:
      "Je Hostnet-inbox direct in Noah. Realtime push, meerdere mailboxen ondersteund.",
  },
];

const STAPPEN_BEHEER_ADMIN: Step[] = [
  {
    target: 'a[href="/setters"]',
    title: "Setters & users",
    content:
      "Hier voeg je nieuwe setters, recruiters en admins toe. Ze krijgen automatisch een welkomstmail met inloggegevens.",
  },
];

const STAPPEN_BEHEER_SUPER: Step[] = [
  {
    target: 'a[href="/bureaus"]',
    title: "Bureaus (super-admin)",
    content:
      "Nieuwe bureaus toevoegen die Noah gaan gebruiken. De contactpersoon krijgt automatisch een admin-account.",
  },
];

const STAPPEN_INSTELLINGEN: Step[] = [
  {
    target: 'a[href="/instellingen"]',
    title: "Instellingen",
    content:
      "Persoonlijke gegevens, mailboxen koppelen (Hostnet IMAP), en — voor super-admin — alle mail-templates aanpassen.",
  },
];

const STAPPEN_KANDIDAAT_FLOW: Step[] = [
  {
    target: 'body',
    placement: "center",
    title: "Kandidaat aanmaken — de korte versie",
    content:
      "Klik straks op 'Kandidaten' → '+ Nieuwe kandidaat'. Je sleept een CV erop, AI leest het, en stelt alleen vragen over wat ontbreekt. Geen CV bij de hand? Voeg toe aan de wachtlijst — je hebt 7 dagen om het CV alsnog te uploaden.",
  },
  {
    target: 'body',
    placement: "center",
    title: "AI doet veel werk voor je",
    content:
      "Claude leest CV's, geeft een score (0-100), markeert rode vlaggen (jobhopper, geen rijbewijs, gaten in CV) en schrijft een profielschets in de 3e persoon. Jij beslist: goedkeuren of afkeuren.",
  },
  {
    target: 'body',
    placement: "center",
    title: "Voorstel naar opdrachtgever",
    content:
      "Een voorstel verstuur je vanaf de kandidaat-pagina. De opdrachtgever ziet alleen voornaam (geen contactgegevens), klikt groen of rood, en plant kennismakingen. Reminders gaan vanzelf op werkdagen.",
  },
];

const STAPPEN_AFSLUIT: Step[] = [
  {
    target: 'aside button[title*="klap"]',
    title: "Sidebar in-/uitklappen",
    content:
      "Onderaan zit een pijltje om de sidebar breder te maken (met tekstlabels) of compact (alleen iconen).",
  },
  {
    target: "body",
    placement: "center",
    title: "Klaar — succes!",
    content:
      "Je kunt deze tour later opnieuw starten via Instellingen → 'Tour opnieuw bekijken'. Veel succes met Noah.",
  },
];

function stappenVoorRol(rol: Rol): Step[] {
  const isSuper = rol === "super_admin";
  const isAdmin = rol === "admin" || isSuper;

  const stappen: Step[] = [
    ...STAPPEN_BASIS,
    ...STAPPEN_VOORSTELLEN,
    ...STAPPEN_TOOLS,
  ];
  if (isAdmin) stappen.push(...STAPPEN_BEHEER_ADMIN);
  if (isSuper) stappen.push(...STAPPEN_BEHEER_SUPER);
  stappen.push(...STAPPEN_INSTELLINGEN);
  stappen.push(...STAPPEN_KANDIDAAT_FLOW);
  stappen.push(...STAPPEN_AFSLUIT);
  return stappen;
}

export function OnboardingTour({
  rol,
  autoStart,
}: {
  rol: Rol;
  autoStart: boolean;
}) {
  const [actief, setActief] = useState(false);
  const [stappen, setStappen] = useState<Step[]>([]);

  useEffect(() => {
    if (autoStart) {
      // Korte vertraging zodat de pagina kan renderen
      const t = setTimeout(() => {
        setStappen(stappenVoorRol(rol));
        setActief(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [autoStart, rol]);

  // Listen for global event to start the tour manually
  useEffect(() => {
    function handler() {
      setStappen(stappenVoorRol(rol));
      setActief(true);
    }
    window.addEventListener("noah:start-tour", handler);
    return () => window.removeEventListener("noah:start-tour", handler);
  }, [rol]);

  async function markVoltooid() {
    try {
      await fetch("/api/profile/onboarding-voltooid", { method: "POST" });
    } catch {}
  }

  function onChange(data: CallBackData) {
    const eindStatussen: string[] = ["finished", "skipped", "closed"];
    if (eindStatussen.includes(data.status)) {
      setActief(false);
      markVoltooid();
    }
  }

  if (!actief || stappen.length === 0) return null;

  return (
    <Joyride
      steps={stappen}
      run={actief}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      callback={onChange}
      locale={{
        back: "Terug",
        close: "Sluiten",
        last: "Klaar",
        next: "Volgende",
        skip: "Sla over",
        open: "Open",
      }}
      styles={{
        options: {
          primaryColor: "#333399",
          zIndex: 10000,
          arrowColor: "#fff",
          backgroundColor: "#fff",
          textColor: "#1a1a2e",
          width: 360,
        },
        tooltipTitle: { fontSize: 16, fontWeight: 700 },
        tooltipContent: { fontSize: 14, lineHeight: 1.5, padding: "8px 0" },
        buttonNext: { fontWeight: 600 },
        buttonBack: { color: "#666" },
      }}
    />
  );
}

// Helper voor de "Start tour opnieuw" knop in instellingen
export async function herstartTour() {
  await fetch("/api/profile/onboarding-voltooid", { method: "DELETE" });
  window.dispatchEvent(new Event("noah:start-tour"));
}
