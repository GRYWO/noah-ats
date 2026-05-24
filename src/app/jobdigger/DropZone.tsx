"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Check, AlertCircle, X } from "lucide-react";

export function DropZone({
  kandidaatId,
  kandidaatNaam,
}: {
  kandidaatId: string;
  kandidaatNaam: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resultaat, setResultaat] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [verborgen, setVerborgen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  if (verborgen) {
    return (
      <button
        type="button"
        onClick={() => setVerborgen(false)}
        className="mb-3 text-xs text-[#333399] hover:underline"
      >
        Toon upload-zone weer
      </button>
    );
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setResultaat(null);
    const fd = new FormData();
    fd.append("kandidaat_id", kandidaatId);
    fd.append("file", file);
    fd.append("naam", file.name.replace(/\.(xlsx?|csv)$/i, ""));

    try {
      const res = await fetch("/api/bellijst/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setResultaat({ ok: false, tekst: data.error ?? "Upload mislukt" });
      } else {
        setResultaat({ ok: true, tekst: `${data.aantal} rijen toegevoegd aan ${kandidaatNaam}` });
        router.refresh();
      }
    } catch (e) {
      setResultaat({ ok: false, tekst: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`mb-3 rounded-lg border-2 border-dashed p-4 transition-colors relative ${
        dragging ? "border-[#333399] bg-[#eef0ff]" : "border-gray-300 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => setVerborgen(true)}
        title="Verberg"
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 p-1"
      >
        <X size={14} />
      </button>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-[#eef0ff] flex items-center justify-center shrink-0">
          {uploading ? (
            <div className="w-5 h-5 border-2 border-[#333399] border-t-transparent rounded-full animate-spin" />
          ) : resultaat?.ok ? (
            <Check size={20} className="text-emerald-600" />
          ) : resultaat ? (
            <AlertCircle size={20} className="text-red-600" />
          ) : (
            <Upload size={20} className="text-[#333399]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-800">
            Bezig voor: <span className="text-[#333399]">{kandidaatNaam}</span>
          </div>
          {resultaat ? (
            <p className={`text-xs mt-0.5 ${resultaat.ok ? "text-emerald-700" : "text-red-700"}`}>
              {resultaat.tekst}
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              Sleep je Jobdigger-download (.xlsx) hierop, of <button type="button" onClick={() => inputRef.current?.click()} className="text-[#333399] hover:underline font-semibold">klik om te kiezen</button>.
            </p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
      />
    </div>
  );
}
