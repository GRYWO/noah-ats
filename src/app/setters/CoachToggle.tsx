"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { setCoachStatus } from "./coach-actions";

export function CoachToggle({
  userId,
  isCoach,
  disabled = false,
}: {
  userId: string;
  isCoach: boolean;
  disabled?: boolean;
}) {
  const [aan, setAan] = useState(isCoach);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (disabled || pending) return;
    const nieuw = !aan;
    setAan(nieuw);
    const fd = new FormData();
    fd.append("user_id", userId);
    fd.append("is_coach", nieuw ? "true" : "false");
    startTransition(async () => {
      const r = await setCoachStatus(fd);
      if (r?.error) {
        setAan(!nieuw);
        alert(r.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || pending}
      title={aan ? "Coach (klik om uit te zetten)" : "Geen coach (klik om aan te zetten)"}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition disabled:opacity-50 ${
        aan
          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {pending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
      {aan ? "Coach" : "Geen coach"}
    </button>
  );
}
