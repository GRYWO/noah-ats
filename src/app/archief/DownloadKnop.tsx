"use client";

import { useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { getSignedDocumentUrl } from "@/app/documenten/actions";

export function DownloadKnop({ envelopeId }: { envelopeId: string }) {
  const [pending, start] = useTransition();

  function download() {
    start(async () => {
      const url = await getSignedDocumentUrl(envelopeId, "voltooid");
      if (url) window.open(url, "_blank");
    });
  }

  return (
    <button
      onClick={download}
      disabled={pending}
      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-3 py-2 rounded-md text-xs"
    >
      {pending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Download size={12} />
      )}
      PDF
    </button>
  );
}
