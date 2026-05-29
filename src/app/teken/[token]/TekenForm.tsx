"use client";

import { useState, useRef, useEffect } from "react";
import { Pen, Type, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { tekenDocument } from "@/app/documenten/actions";

type Methode = "getypt" | "getekend";

export function TekenForm({
  token,
  voornaam,
  achternaam,
}: {
  token: string;
  voornaam: string;
  achternaam: string;
}) {
  const router = useRouter();
  const [methode, setMethode] = useState<Methode>("getypt");
  const [naam, setNaam] = useState(`${voornaam} ${achternaam}`);
  const [akkoord, setAkkoord] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tekening, setTekening] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [heeftGetekend, setHeeftGetekend] = useState(false);

  // Canvas setup
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Achtergrond transparant blijft
  }, [methode]);

  function getCoords(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    setTekening(true);
    lastPos.current = getCoords(e);
  }
  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!tekening) return;
    e.preventDefault();
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const cur = getCoords(e);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();
    }
    lastPos.current = cur;
    setHeeftGetekend(true);
  }
  function einde() {
    setTekening(false);
    lastPos.current = null;
  }

  function wisCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setHeeftGetekend(false);
  }

  async function verstuur() {
    setFout(null);
    setBezig(true);
    let data: string | undefined;
    if (methode === "getekend") {
      const c = canvasRef.current;
      if (!c || !heeftGetekend) {
        setFout("Plaats eerst je handtekening");
        setBezig(false);
        return;
      }
      data = c.toDataURL("image/png");
    }
    const r = await tekenDocument({
      token,
      type: methode,
      naam: methode === "getypt" ? naam.trim() : undefined,
      data,
    });
    setBezig(false);
    if (!r.ok) {
      setFout(r.error ?? "Ondertekenen mislukt");
      return;
    }
    router.refresh();
  }

  const compleet =
    akkoord &&
    ((methode === "getypt" && naam.trim().length >= 3) ||
      (methode === "getekend" && heeftGetekend));

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-1">Onderteken het document</h2>
      <p className="text-white/60 text-sm mb-5">Kies een methode hieronder.</p>

      {/* Methode kiezer */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMethode("getypt")}
          className={`p-3 rounded-lg border-2 transition-all inline-flex items-center justify-center gap-2 ${
            methode === "getypt"
              ? "border-[#ffd84d] bg-[#ffd84d]/10 text-[#ffd84d]"
              : "border-white/15 text-white/60 hover:border-white/30"
          }`}
        >
          <Type size={16} />
          <span className="text-sm font-semibold">Getypt</span>
        </button>
        <button
          type="button"
          onClick={() => setMethode("getekend")}
          className={`p-3 rounded-lg border-2 transition-all inline-flex items-center justify-center gap-2 ${
            methode === "getekend"
              ? "border-[#ffd84d] bg-[#ffd84d]/10 text-[#ffd84d]"
              : "border-white/15 text-white/60 hover:border-white/30"
          }`}
        >
          <Pen size={16} />
          <span className="text-sm font-semibold">Met de hand</span>
        </button>
      </div>

      {/* Methode-specifiek */}
      {methode === "getypt" ? (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">
            Typ je volledige naam
          </label>
          <input
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Voornaam Achternaam"
            className="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 rounded-lg focus:outline-none focus:border-[#ffd84d] text-2xl"
            style={{ fontFamily: "cursive" }}
          />
          {naam.trim().length > 0 && (
            <p className="text-[11px] text-white/40 mt-1">
              Dit wordt als handtekening opgenomen in het document.
            </p>
          )}
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
              Teken hieronder
            </label>
            <button
              type="button"
              onClick={wisCanvas}
              className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1"
            >
              <RotateCcw size={11} /> Wissen
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={600}
            height={180}
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={einde}
            onMouseLeave={einde}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={einde}
            className="w-full bg-white/5 border-2 border-dashed border-white/20 rounded-lg cursor-crosshair touch-none"
            style={{ height: "180px" }}
          />
        </div>
      )}

      {/* Akkoord */}
      <label className="flex items-start gap-2 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={akkoord}
          onChange={(e) => setAkkoord(e.target.checked)}
          className="mt-1 accent-[#ffd84d]"
        />
        <span className="text-xs text-white/70">
          Ik heb het document gelezen en ga akkoord met de inhoud. Ik bevestig dat
          mijn ondertekening rechtsgeldig is (eIDAS SES).
        </span>
      </label>

      {fout && (
        <div className="bg-red-500/10 border border-red-400/40 text-red-200 text-sm rounded-lg p-3 mb-3">
          {fout}
        </div>
      )}

      <button
        type="button"
        onClick={verstuur}
        disabled={!compleet || bezig}
        className="w-full bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#333399] font-bold py-4 rounded-lg shadow-lg flex items-center justify-center gap-2"
      >
        {bezig ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Ondertekenen…
          </>
        ) : (
          <>Ondertekenen</>
        )}
      </button>
    </div>
  );
}
