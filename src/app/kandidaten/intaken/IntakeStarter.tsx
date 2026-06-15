"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { IntakeBot } from "@/app/kandidaten/[id]/IntakeBot";
import { startIntake } from "./actions";

type Fase = "cv" | "parsen" | "chat";

type Geparseerd = {
  voornaam?: string;
  tussenvoegsel?: string;
  achternaam?: string;
  email?: string;
  woonplaats?: string;
  [k: string]: unknown;
};

export function IntakeStarter({ rolIsSetter }: { rolIsSetter: boolean }) {
  const [fase, setFase] = useState<Fase>("cv");
  const [file, setFile] = useState<File | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Resultaat van fase 'cv' -> 'chat'
  const [kandidaatId, setKandidaatId] = useState<string | null>(null);
  const [cvContext, setCvContext] = useState<string>("");
  const [geparseerd, setGeparseerd] = useState<Geparseerd | null>(null);

  async function uploadEnStart(f: File) {
    setFout(null);
    if (f.type && f.type !== "application/pdf") {
      setFout("Alleen PDF-bestanden zijn toegestaan.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setFout("Het CV is groter dan 10 MB.");
      return;
    }
    setFile(f);
    setFase("parsen");

    // Stap 1: parse CV via bestaande anon-endpoint
    let parsed: Geparseerd = {};
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/ai/parse-cv-anon", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) {
        // Soft-fail: doorgaan met lege parsed zodat de gebruiker niet vastloopt
        // op een tijdelijke AI-uitval. De intake-bot vraagt dan alles na.
        console.warn("[intaken] parse-cv-anon mislukte:", data?.error);
        parsed = {};
      } else {
        parsed = data.parsed ?? {};
      }
    } catch (e) {
      console.warn("[intaken] parse-cv-anon netwerkfout:", e);
      parsed = {};
    }

    // Stap 2: kandidaat aanmaken + CV uploaden via server-action
    startTransition(async () => {
      const fd = new FormData();
      fd.append("cv_file", f);
      fd.append("geparseerd", JSON.stringify(parsed));
      const res = await startIntake(fd);
      if (!res.ok) {
        setFout(res.fout);
        setFase("cv");
        setFile(null);
        return;
      }
      setKandidaatId(res.kandidaatId);
      setCvContext(res.cvContext);
      setGeparseerd(res.geparseerd as Geparseerd);
      setFase("chat");
    });
  }

  if (fase === "cv") {
    return (
      <div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) uploadEnStart(f);
          }}
          className={`bg-white rounded-2xl shadow-sm border-2 border-dashed p-16 text-center transition-colors cursor-pointer ${
            dragging ? "border-[#333399] bg-[#eef0ff]" : "border-gray-300 hover:border-[#333399]"
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#eef0ff] items-center justify-center mb-4">
            <span className="text-[#333399] text-2xl font-bold">PDF</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Sleep het CV hierop</h2>
          <p className="text-sm text-gray-500">Alleen PDF, maximaal 10 MB. Noah leest het CV en start direct de intake.</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadEnStart(f); }}
          />
        </div>

        {fout && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{fout}</div>
        )}

        <p className="mt-4 text-xs text-gray-500">
          Liever handmatig invoeren? <Link href="/kandidaten/nieuw" className="text-[#333399] hover:underline font-semibold">Nieuwe kandidaat via wizard</Link>.
        </p>
      </div>
    );
  }

  if (fase === "parsen") {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
        <div className="inline-flex w-12 h-12 rounded-full border-4 border-[#333399]/20 border-t-[#333399] animate-spin mb-4" />
        <p className="text-sm text-gray-700 font-semibold">Noah leest het CV...</p>
        {file && <p className="text-xs text-gray-500 mt-1">{file.name}</p>}
        {pending && <p className="text-xs text-gray-500 mt-1">Kandidaat aanmaken en CV opslaan...</p>}
        {fout && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-left">{fout}</div>
        )}
      </div>
    );
  }

  // fase === "chat"
  if (!kandidaatId) return null;
  const naam = [geparseerd?.voornaam, geparseerd?.tussenvoegsel, geparseerd?.achternaam].filter(Boolean).join(" ").trim();
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">CV verwerkt</div>
          <div className="text-base font-semibold text-gray-800">{naam || "Nieuwe kandidaat"}</div>
          {geparseerd?.woonplaats && <div className="text-xs text-gray-500">{String(geparseerd.woonplaats)}</div>}
        </div>
        <Link
          href={`/kandidaten/${kandidaatId}`}
          className="text-sm text-[#333399] hover:underline font-semibold"
        >
          Open kandidaat-detailpagina
        </Link>
      </div>

      <IntakeBot
        kandidaatId={kandidaatId}
        cvContext={cvContext}
        autoStart
        rolIsSetter={rolIsSetter}
      />
    </div>
  );
}
