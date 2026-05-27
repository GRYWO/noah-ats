"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { Loader2, CheckCircle2, Type, PenTool, AlertCircle } from "lucide-react";
import { tekenDpa } from "./actions";

type Props = {
  token: string;
  defaultNaam?: string;
  defaultEmail?: string;
};

export function TekenForm({ token, defaultNaam = "", defaultEmail = "" }: Props) {
  const [tab, setTab] = useState<"typed" | "drawn">("typed");
  const [naam, setNaam] = useState(defaultNaam);
  const [functie, setFunctie] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [akkoord, setAkkoord] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [, startTransition] = useTransition();

  // Canvas voor handgetekende handtekening
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Init canvas-stijl
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // High-DPI scaling
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [tab]);

  function posFromEvent(e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const cy = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    return { x: cx - r.left, y: cy - r.top };
  }
  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true;
    lastPos.current = posFromEvent(e);
  }
  function moveDraw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    const pos = posFromEvent(e);
    if (!ctx || !lastPos.current) return;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawn(true);
  }
  function endDraw() {
    drawing.current = false;
    lastPos.current = null;
  }
  function clearCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);

    // Valideer
    if (!naam || naam.length < 2) { setFout("Vul je volledige naam in"); return; }
    if (!functie) { setFout("Vul je functie in"); return; }
    if (!email || !email.includes("@")) { setFout("Vul een geldig e-mailadres in"); return; }
    if (!akkoord) { setFout("Bevestig akkoord met de overeenkomst"); return; }

    let handtekeningData = "";
    if (tab === "typed") {
      handtekeningData = naam;
    } else {
      if (!hasDrawn) { setFout("Teken eerst een handtekening of typ je naam"); return; }
      handtekeningData = canvasRef.current!.toDataURL("image/png");
    }

    setBezig(true);
    const fd = new FormData();
    fd.set("token", token);
    fd.set("naam", naam);
    fd.set("functie", functie);
    fd.set("email", email);
    fd.set("handtekening_type", tab);
    fd.set("handtekening_data", handtekeningData);
    fd.set("akkoord", "on");

    startTransition(async () => {
      const r = await tekenDpa(fd);
      setBezig(false);
      if (r?.error) setFout(r.error);
      // Bij succes redirect de server-action zelf naar /bedankt
    });
  }

  return (
    <form onSubmit={onSubmit}>
      {/* Tabbladen */}
      <div className="inline-flex border-b border-[#d4d7f5] mb-0">
        <button
          type="button"
          onClick={() => setTab("typed")}
          className={`px-5 py-2 text-sm font-bold inline-flex items-center gap-2 ${
            tab === "typed"
              ? "bg-white border border-[#d4d7f5] border-b-0 rounded-t-lg text-[#333399]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Type size={14} /> Typ je naam
        </button>
        <button
          type="button"
          onClick={() => setTab("drawn")}
          className={`px-5 py-2 text-sm font-bold inline-flex items-center gap-2 ${
            tab === "drawn"
              ? "bg-white border border-[#d4d7f5] border-b-0 rounded-t-lg text-[#333399]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <PenTool size={14} /> Teken handmatig
        </button>
      </div>

      <div className="bg-white border border-[#d4d7f5] rounded-r-lg rounded-bl-lg p-5">
        <div className="mb-3">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">Voor- en achternaam *</label>
          <input
            type="text"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            required
            placeholder="bv. Jan Jansen"
            className={
              tab === "typed"
                ? "w-full px-4 py-3 border border-[#333399] rounded-md bg-[#fafaff] text-2xl text-gray-900"
                : "w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            }
            style={tab === "typed" ? { fontFamily: "'Dancing Script', 'Brush Script MT', cursive" } : undefined}
          />
        </div>

        {tab === "drawn" && (
          <div className="mb-3">
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">Handtekening *</label>
            <div className="border-2 border-dashed border-[#333399] rounded-md bg-[#fafaff] relative" style={{ touchAction: "none" }}>
              <canvas
                ref={canvasRef}
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={moveDraw}
                onTouchEnd={endDraw}
                className="w-full block cursor-crosshair"
                style={{ height: "120px" }}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-sm text-gray-400">
                  Teken hier met je muis of vinger
                </div>
              )}
            </div>
            <button type="button" onClick={clearCanvas} className="mt-1 text-xs text-gray-500 hover:text-[#333399]">
              Wissen
            </button>
          </div>
        )}

        <div className="mb-3">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">Je functie *</label>
          <input
            type="text"
            value={functie}
            onChange={(e) => setFunctie(e.target.value)}
            required
            placeholder="bv. Directeur, Eigenaar, HR-manager"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">E-mailadres *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="jouw@bedrijf.nl"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <small className="text-gray-400 text-xs">Een kopie van de getekende DPA wordt naar dit adres gestuurd</small>
        </div>

        <label className="flex items-start gap-2 text-xs text-gray-700 py-3">
          <input
            type="checkbox"
            checked={akkoord}
            onChange={(e) => setAkkoord(e.target.checked)}
            className="mt-0.5 accent-[#333399]"
          />
          <span>
            Ik ga akkoord met de bovenstaande verwerkersovereenkomst en bevestig dat ik bevoegd ben om namens mijn bureau te tekenen.
          </span>
        </label>

        {fout && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 inline-flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{fout}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="bg-[#333399] hover:bg-[#2a2a80] text-white font-bold px-6 py-3 rounded-lg text-sm inline-flex items-center gap-2 shadow-sm mt-2 disabled:opacity-60"
        >
          {bezig ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Onderteken &amp; verstuur
        </button>
      </div>
    </form>
  );
}
