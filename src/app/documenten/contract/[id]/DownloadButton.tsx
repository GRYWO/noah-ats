"use client";

import { useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { getContractSamenvattingUrl } from "./actions";

export function DownloadButton({ verzoekId }: { verzoekId: string }) {
  const [pending, start] = useTransition();
  function klik() {
    start(async () => {
      const url = await getContractSamenvattingUrl(verzoekId);
      if (url) window.open(url, "_blank");
    });
  }
  return (
    <button
      onClick={klik}
      disabled={pending}
      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-3 py-1.5 rounded-md text-xs"
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      Download samenvatting
    </button>
  );
}
