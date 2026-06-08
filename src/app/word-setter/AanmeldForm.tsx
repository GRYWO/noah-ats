"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Loader2, CheckCircle2, Type, PenTool } from "lucide-react";
import { tekenSetterAanmelding } from "./teken-actions";

export function AanmeldForm() {
  const [tab, setTab] = useState<"typed" | "drawn">("typed");
  const [voornaam, setVoornaam] = useState("");
  const [achternaam, setAchternaam] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [akkoord, setAkkoord] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [klaar, setKlaar] = useState(false);
  const [, startTransition] = useTransition();
  const [bezig, setBezig] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (tab !== "drawn") return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
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
    if (voornaam.length < 2) return setFout("Vul je voornaam in");
    if (achternaam.length < 2) return setFout("Vul je achternaam in");
    if (!email.includes("@")) return setFout("Vul een geldig e-mailadres in");
    if (!akkoord) return setFout("Bevestig dat je akkoord gaat");

    let handtekeningData = "";
    if (tab === "typed") {
      handtekeningData = `${voornaam} ${achternaam}`;
    } else {
      if (!hasDrawn) return setFout("Plaats een handtekening of typ je naam");
      handtekeningData = canvasRef.current!.toDataURL("image/png");
    }

    setBezig(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("voornaam", voornaam);
      fd.append("achternaam", achternaam);
      fd.append("email", email);
      fd.append("telefoon", telefoon);
      fd.append("handtekening_type", tab);
      fd.append("handtekening_data", handtekeningData);
      fd.append("akkoord", akkoord ? "on" : "");
      const r = await tekenSetterAanmelding(fd);
      setBezig(false);
      if (r.ok) {
        setKlaar(true);
      } else {
        setFout(r.error ?? "Opslaan mislukt");
      }
    });
  }

  if (klaar) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 md:p-12 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-5">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-2xl md:text-3xl font-black mb-3 text-emerald-900">Aanmelding ontvangen</h3>
        <p className="text-emerald-800 max-w-md mx-auto leading-relaxed mb-4">
          Bedankt {voornaam}! Pepijn heeft je gegevens binnen en neemt zo snel mogelijk
          persoonlijk contact op via whatsapp of bellen.
        </p>
        <p className="text-emerald-700 text-sm">
          Een bevestigingsmail is verstuurd naar <b>{email}</b>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-7 md:p-10 space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Voornaam *</label>
          <input
            type="text"
            value={voornaam}
            onChange={(e) => setVoornaam(e.target.value)}
            placeholder="Pepijn"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#333399]"
            style={{ colorScheme: "light", color: "#111827", backgroundColor: "#fff" }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Achternaam *</label>
          <input
            type="text"
            value={achternaam}
            onChange={(e) => setAchternaam(e.target.value)}
            placeholder="Zwartenberg"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#333399]"
            style={{ colorScheme: "light", color: "#111827", backgroundColor: "#fff" }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jij@gmail.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#333399]"
            style={{ colorScheme: "light", color: "#111827", backgroundColor: "#fff" }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon (mobiel)</label>
          <input
            type="tel"
            value={telefoon}
            onChange={(e) => setTelefoon(e.target.value)}
            placeholder="06 12345678"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#333399]"
            style={{ colorScheme: "light", color: "#111827", backgroundColor: "#fff" }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">Handtekening *</label>
        <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-3">
          <button
            type="button"
            onClick={() => setTab("typed")}
            className={`px-4 py-2 rounded-md text-sm font-semibold inline-flex items-center gap-2 ${
              tab === "typed" ? "bg-white text-[#333399] shadow-sm" : "text-gray-600"
            }`}
          >
            <Type size={14} /> Typen
          </button>
          <button
            type="button"
            onClick={() => setTab("drawn")}
            className={`px-4 py-2 rounded-md text-sm font-semibold inline-flex items-center gap-2 ${
              tab === "drawn" ? "bg-white text-[#333399] shadow-sm" : "text-gray-600"
            }`}
          >
            <PenTool size={14} /> Tekenen
          </button>
        </div>
        {tab === "typed" ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div className="text-3xl text-[#333399]" style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive" }}>
              {voornaam || achternaam ? `${voornaam} ${achternaam}`.trim() : <span className="text-gray-300">Vul je naam in →</span>}
            </div>
          </div>
        ) : (
          <div>
            <canvas
              ref={canvasRef}
              onMouseDown={startDraw}
              onMouseMove={moveDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={moveDraw}
              onTouchEnd={endDraw}
              className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg bg-white cursor-crosshair touch-none"
            />
            <button
              type="button"
              onClick={clearCanvas}
              className="text-xs text-gray-500 hover:text-gray-700 mt-2"
            >
              Wissen
            </button>
          </div>
        )}
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={akkoord}
          onChange={(e) => setAkkoord(e.target.checked)}
          className="mt-1"
        />
        <span className="text-sm text-gray-700">
          Ik heb het contract hierboven gelezen en ga akkoord met alle voorwaarden. Ik geef
          toestemming voor het opslaan van mijn handtekening met tijdstempel, IP-adres en
          user-agent als bewijs (eIDAS Simple Electronic Signature).
        </span>
      </label>

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {fout}
        </div>
      )}

      <button
        type="submit"
        disabled={bezig}
        className="w-full bg-[#333399] hover:bg-[#1f1f5c] disabled:opacity-60 text-white font-bold py-4 rounded-xl shadow-xl transition-all hover:-translate-y-0.5 inline-flex items-center justify-center gap-2"
      >
        {bezig ? <Loader2 size={18} className="animate-spin" /> : null}
        Onderteken &amp; meld me aan
      </button>

      <p className="text-xs text-gray-500 text-center">
        Door te ondertekenen ga je akkoord met het opslaan van je gegevens. Pepijn neemt
        binnen 24 uur contact op om de 7-daagse trial te plannen.
      </p>
    </form>
  );
}
