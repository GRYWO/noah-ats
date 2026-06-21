"use client";

import { useFormStatus } from "react-dom";

// Submit-knop die zichtbaar indrukt (active:scale) én "Bezig…" toont +
// uitgeschakeld wordt zolang de server-actie loopt. Gebruiken binnen een <form>.
export function SubmitKnop({
  children,
  className = "",
  bezigTekst = "Bezig…",
}: {
  children: React.ReactNode;
  className?: string;
  bezigTekst?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} transition active:scale-95 disabled:cursor-wait disabled:opacity-70`}
    >
      {pending ? bezigTekst : children}
    </button>
  );
}
