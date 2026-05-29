"use client";

import { useState, useTransition } from "react";
import { Send, X, Download, Loader2 } from "lucide-react";
import { stuurReminder, trekIn, getSignedDocumentUrl } from "../actions";

export function ReminderKnop({ envelopeId }: { envelopeId: string }) {
  const [pending, start] = useTransition();
  const [melding, setMelding] = useState<string | null>(null);

  function klik() {
    start(async () => {
      const r = await stuurReminder(envelopeId);
      setMelding(r.ok ? "Reminders verstuurd ✓" : "Fout: " + (r.error ?? ""));
      setTimeout(() => setMelding(null), 3000);
    });
  }

  return (
    <button
      onClick={klik}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#333399] bg-[#333399]/10 hover:bg-[#333399]/20 rounded-md disabled:opacity-50"
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
      {melding ?? "Stuur reminder"}
    </button>
  );
}

export function TrekInKnop({ envelopeId }: { envelopeId: string }) {
  const [pending, start] = useTransition();

  function klik() {
    if (!confirm("Weet je zeker dat je dit document wil intrekken? Ondertekenaars kunnen niet meer tekenen.")) return;
    start(async () => {
      await trekIn(envelopeId);
    });
  }

  return (
    <button
      onClick={klik}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-md disabled:opacity-50"
    >
      <X size={12} />
      Intrekken
    </button>
  );
}

export function DownloadKnoppen({
  envelopeId,
  hasVoltooid,
}: {
  envelopeId: string;
  hasVoltooid: boolean;
}) {
  const [pending, start] = useTransition();

  async function download(type: "origineel" | "voltooid") {
    start(async () => {
      const url = await getSignedDocumentUrl(envelopeId, type);
      if (url) window.open(url, "_blank");
    });
  }

  return (
    <>
      <button
        onClick={() => download("origineel")}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
      >
        <Download size={12} />
        Origineel
      </button>
      {hasVoltooid && (
        <button
          onClick={() => download("voltooid")}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md"
        >
          <Download size={12} />
          Getekend (met audit-trail)
        </button>
      )}
    </>
  );
}
