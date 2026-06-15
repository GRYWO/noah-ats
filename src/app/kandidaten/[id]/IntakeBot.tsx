"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, Send, Check } from "lucide-react";
import { setKanbanStap } from "@/app/kanban/actions";

type Bericht = { role: "user" | "assistant"; content: string };
type Profiel = Record<string, string>;
type Voorstel = {
  naam?: string; woonplaats?: string; profielschets?: string;
  werkervaring?: string; opleidingen?: string; rijbewijzen?: string;
  vervoer?: string; talen?: string; vaardigheden?: string;
} | null;

function lijst(t?: string): string[] {
  if (!t) return [];
  return (t.includes("\n") ? t.split("\n") : t.split(/[;•]/)).map(s => s.replace(/^[-•\s]+/, "").trim()).filter(Boolean);
}

export function IntakeBot({ kandidaatId, cvContext, autoStart = false, rolIsSetter = false }: { kandidaatId: string; cvContext?: string; autoStart?: boolean; rolIsSetter?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(autoStart);
  const [messages, setMessages] = useState<Bericht[]>([]);
  const [input, setInput] = useState("");
  const [bezig, setBezig] = useState(false);
  const [profiel, setProfiel] = useState<Profiel | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [voorstel, setVoorstel] = useState<Voorstel>(null);
  const [keuze, setKeuze] = useState<"" | "bezig" | "wachtrij" | "wachten">("");
  const gestart = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || gestart.current) return;
    gestart.current = true;
    (async () => {
      setBezig(true);
      const r = await fetch(`/api/kandidaten/${kandidaatId}/intake-bot`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [], cvContext }),
      });
      const s = await r.json();
      setMessages([{ role: "assistant", content: s.bericht }]);
      setBezig(false);
    })();
  }, [open, kandidaatId, cvContext]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, bezig]);

  useEffect(() => {
    if (profiel && !voorstel && !finishing) {
      (async () => {
        setFinishing(true);
        const r = await fetch(`/api/kandidaten/${kandidaatId}/intake-bot/finish`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profiel }),
        });
        const d = await r.json();
        setVoorstel(d.voorstel ?? {});
        setFinishing(false);
        // /kandidaten/intaken toont geen lijst die ververst moet worden;
        // een refresh daar veroorzaakt alleen onnodige roundtrip en flicker.
        if (typeof window !== "undefined" && !window.location.pathname.includes("/kandidaten/intaken")) {
          router.refresh();
        }
      })();
    }
  }, [profiel, voorstel, finishing, kandidaatId, router]);

  async function verstuur() {
    const tekst = input.trim();
    if (!tekst || bezig) return;
    const nieuw: Bericht[] = [...messages, { role: "user", content: tekst }];
    setMessages(nieuw); setInput(""); setBezig(true);
    const r = await fetch(`/api/kandidaten/${kandidaatId}/intake-bot`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: nieuw, cvContext }),
    });
    const s = await r.json();
    setMessages((m) => [...m, { role: "assistant", content: s.bericht }]);
    if (s.klaar && s.profiel) setProfiel(s.profiel);
    setBezig(false);
  }

  async function kies(stap: "in_wachtrij" | "in_afwachting_cv", label: "wachtrij" | "wachten") {
    setKeuze("bezig");
    await setKanbanStap(kandidaatId, stap);
    setKeuze(label);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#333399]/10 text-[#333399] flex items-center justify-center"><Bot size={20} /></span>
            <div>
              <h2 className="font-bold text-gray-800">Intake via de bot</h2>
              <p className="text-xs text-gray-500 mt-0.5">Noah stelt de intakevragen. Daarna zie je het volledige profiel en kies je wachtrij of wachten.</p>
            </div>
          </div>
          <button onClick={() => setOpen(true)} className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm">
            Start intake-bot
          </button>
        </div>
      </div>
    );
  }

  // Resultaat: volledig profiel + keuze
  if (voorstel) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><Check size={16} /></span>
          <h2 className="font-bold text-gray-800">Profiel klaar, controleer en kies</h2>
        </div>

        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-br from-[#333399] to-[#4a4abf] text-white px-5 py-3 text-sm font-bold">Kandidaatprofiel</div>
          <div className="p-5 space-y-4 text-sm">
            {voorstel.profielschets && <p className="text-gray-800 leading-relaxed">{voorstel.profielschets}</p>}
            {lijst(voorstel.werkervaring).length > 0 && <Sectie titel="Werkervaring" items={lijst(voorstel.werkervaring)} />}
            {lijst(voorstel.opleidingen).length > 0 && <Sectie titel="Opleidingen & diploma's" items={lijst(voorstel.opleidingen)} />}
            <div className="grid grid-cols-2 gap-4">
              {voorstel.talen && <Veld titel="Talen" w={voorstel.talen} />}
              {voorstel.vaardigheden && <Veld titel="Vaardigheden" w={voorstel.vaardigheden} />}
              {voorstel.rijbewijzen && <Veld titel="Rijbewijzen" w={voorstel.rijbewijzen} />}
              {voorstel.vervoer && <Veld titel="Eigen vervoer" w={voorstel.vervoer} />}
            </div>
          </div>
        </div>

        {rolIsSetter ? (
          <p className="text-sm font-semibold text-emerald-700 inline-flex items-center gap-2"><Check size={14} /> Kandidaat staat klaar in de wachtrij. Een recruiter pakt de kandidaat verder op.</p>
        ) : keuze === "wachtrij" || keuze === "wachten" ? (
          <p className="text-sm font-semibold text-emerald-700 inline-flex items-center gap-2"><Check size={14} /> Kandidaat {keuze === "wachtrij" ? "naar de wachtrij gezet" : "op wachten gezet"}.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button onClick={() => kies("in_wachtrij", "wachtrij")} disabled={keuze === "bezig"} className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm disabled:opacity-50 inline-flex items-center gap-2">
              {keuze === "bezig" && <Loader2 size={14} className="animate-spin" />} Naar wachtrij
            </button>
            <button onClick={() => kies("in_afwachting_cv", "wachten")} disabled={keuze === "bezig"} className="border border-gray-300 hover:border-[#333399] text-gray-700 font-semibold px-5 py-2 rounded-md text-sm disabled:opacity-50">
              Wachten
            </button>
          </div>
        )}
      </div>
    );
  }

  // Chat
  return (
    <div className="bg-white rounded-xl shadow-sm flex flex-col" style={{ minHeight: 420 }}>
      <div className="border-b border-gray-100 px-5 py-3 flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-[#333399]/10 text-[#333399] flex items-center justify-center"><Bot size={16} /></span>
        <div><div className="text-sm font-bold text-gray-800">Intake-bot</div><div className="text-xs text-gray-500">Noah stelt de vragen</div></div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3" style={{ maxHeight: 420 }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-[#333399] text-white" : "bg-gray-100 text-gray-800"}`}>{m.content}</div>
          </div>
        ))}
        {bezig && <div className="text-xs text-gray-400">Noah typt...</div>}
        {finishing && <div className="text-xs text-gray-400">Noah maakt het profiel op...</div>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); verstuur(); }} className="flex gap-2 border-t border-gray-100 p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={!!profiel} placeholder={profiel ? "Intake compleet" : "Typ het antwoord..."} className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50" />
        <button type="submit" disabled={bezig || !!profiel} className="bg-[#333399] hover:bg-[#2a2a80] text-white px-4 rounded-md text-sm disabled:opacity-50 inline-flex items-center"><Send size={16} /></button>
      </form>
    </div>
  );
}

function Sectie({ titel, items }: { titel: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-[#333399] mb-1">{titel}</h4>
      <ul className="space-y-1">{items.map((r, i) => <li key={i} className="text-gray-800">{r}</li>)}</ul>
    </div>
  );
}
function Veld({ titel, w }: { titel: string; w: string }) {
  return <div><h4 className="text-xs font-bold uppercase tracking-wide text-[#333399] mb-1">{titel}</h4><p className="text-gray-800">{w}</p></div>;
}
