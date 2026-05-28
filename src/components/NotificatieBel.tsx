"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X, Reply, Send, Loader2, Volume2, VolumeX } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { reageerOpNotificatie } from "@/app/kandidaten/[id]/contact-actions";

type Notificatie = {
  id: string;
  type: string;
  titel: string;
  bericht: string | null;
  link_url: string | null;
  gelezen: boolean;
  created_at: string;
  van_user_id: string | null;
};

const PING_MUTE_KEY = "noah-notif-mute";

export function NotificatieBel({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notificatie[]>([]);
  const [reageerOp, setReageerOp] = useState<string | null>(null);
  const [reactie, setReactie] = useState("");
  const [verzenden, setVerzenden] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const eersteLaadRef = useRef(true);
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );

  async function laad() {
    const { data } = await supabase
      .from("notificaties")
      .select("id, type, titel, bericht, link_url, gelezen, created_at, van_user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data ?? []);
  }

  function pingAfspelen() {
    if (muted) return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current!;
      if (ctx.state === "suspended") ctx.resume();
      const nu = ctx.currentTime;
      // Twee korte toontjes — kort, vriendelijk
      [880, 1175].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = nu + i * 0.13;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.13);
      });
    } catch {}
  }

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(PING_MUTE_KEY) === "1");
    } catch {}

    let huidigeIds = new Set<string>();
    async function laadMetPing() {
      const { data } = await supabase
        .from("notificaties")
        .select("id, type, titel, bericht, link_url, gelezen, created_at, van_user_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      const lijst = data ?? [];
      if (!eersteLaadRef.current) {
        const nieuwe = lijst.filter(n => !huidigeIds.has(n.id));
        if (nieuwe.length > 0) {
          pingAfspelen();
          // Desktop-notificatie (als gebruiker dat aan heeft staan)
          try {
            if (
              localStorage.getItem("noah-desktop-notif") !== "0" &&
              typeof Notification !== "undefined" &&
              Notification.permission === "granted" &&
              document.visibilityState !== "visible"
            ) {
              const eerste = nieuwe[0];
              const notif = new Notification(eerste.titel, {
                body: eerste.bericht ?? "Nieuwe melding in Noah",
                icon: "/grywo-icoon.jpg",
                tag: "noah-" + eerste.id,
              });
              if (eerste.link_url) {
                notif.onclick = () => {
                  window.focus();
                  window.location.href = eerste.link_url!;
                };
              }
            }
          } catch {}
        }
      }
      huidigeIds = new Set(lijst.map(n => n.id));
      setItems(lijst);
      eersteLaadRef.current = false;
    }

    laadMetPing();

    // Realtime — primaire kanaal
    const ch = supabase
      .channel("notif-" + userId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaties", filter: `user_id=eq.${userId}` },
        () => { laadMetPing(); },
      )
      .subscribe((status) => {
        console.log("[Noah Notif] realtime status:", status);
      });

    // Polling-fallback: elke 10s opnieuw laden — overlapt realtime maar vangt missers op
    const poll = setInterval(() => { laadMetPing(); }, 10000);

    // Tab weer zichtbaar → meteen verversen
    const onVisible = () => { if (document.visibilityState === "visible") laadMetPing(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function toggleMute() {
    const nieuw = !muted;
    setMuted(nieuw);
    try { localStorage.setItem(PING_MUTE_KEY, nieuw ? "1" : "0"); } catch {}
  }

  async function markeerAlsGelezen(id: string) {
    await supabase.from("notificaties").update({ gelezen: true }).eq("id", id);
    setItems((p) => p.map(n => n.id === id ? { ...n, gelezen: true } : n));
  }

  async function markeerAlleAlsGelezen() {
    await supabase.from("notificaties").update({ gelezen: true }).eq("user_id", userId).eq("gelezen", false);
    setItems((p) => p.map(n => ({ ...n, gelezen: true })));
  }

  async function versturen(notificatieId: string) {
    if (!reactie.trim()) return;
    setVerzenden(true);
    const fd = new FormData();
    fd.append("notificatie_id", notificatieId);
    fd.append("bericht", reactie);
    const r = await reageerOpNotificatie(fd);
    setVerzenden(false);
    if (r?.ok) {
      setReactie("");
      setReageerOp(null);
      markeerAlsGelezen(notificatieId);
    }
  }

  const ongelezen = items.filter(n => !n.gelezen).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Notificaties"
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-800"
      >
        <Bell size={20} strokeWidth={1.8} />
        {ongelezen > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full inline-flex items-center justify-center">
            {ongelezen > 9 ? "9+" : ongelezen}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-full ml-2 bottom-0 w-96 max-h-[560px] bg-white rounded-xl shadow-2xl border border-gray-200 z-40 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="font-bold text-sm text-gray-800">Notificaties</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  title={muted ? "Geluid aan" : "Geluid uit"}
                  className="text-gray-400 hover:text-gray-700"
                >
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                {ongelezen > 0 && (
                  <button onClick={markeerAlleAlsGelezen} className="text-xs text-[#333399] hover:underline">
                    Alles gelezen
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {items.length === 0 ? (
                <p className="text-sm text-gray-500 p-6 text-center">Nog geen notificaties.</p>
              ) : items.map(n => {
                const kanReageren = !!n.van_user_id;
                const isOpen = reageerOp === n.id;
                const isAlert = n.type === "reactie_alert";
                const isPositief = n.type === "reactie_positief";
                const achtergrond = n.gelezen
                  ? (isAlert ? "bg-red-50/40" : isPositief ? "bg-emerald-50/40" : "")
                  : (isAlert ? "bg-red-50" : isPositief ? "bg-emerald-50" : "bg-blue-50/50");
                const accentRand = isAlert
                  ? "border-l-4 border-l-red-500"
                  : isPositief
                  ? "border-l-4 border-l-emerald-500"
                  : "";
                return (
                  <div
                    key={n.id}
                    className={`border-b border-gray-100 ${accentRand} ${achtergrond}`}
                  >
                    <div className="px-4 py-3 flex items-start gap-2">
                      {!n.gelezen && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={n.link_url ?? "#"}
                          onClick={() => { if (!n.gelezen) markeerAlsGelezen(n.id); }}
                          className="block"
                        >
                          <div className="font-semibold text-sm text-gray-800">{n.titel}</div>
                          {n.bericht && <div className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{n.bericht}</div>}
                          <div className="text-[10px] text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </Link>
                        {kanReageren && !isOpen && (
                          <button
                            onClick={() => { setReageerOp(n.id); setReactie(""); }}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#333399] hover:underline"
                          >
                            <Reply size={11} /> Reageer
                          </button>
                        )}
                        {isOpen && (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={reactie}
                              onChange={(e) => setReactie(e.target.value)}
                              rows={2}
                              autoFocus
                              placeholder="Schrijf een antwoord..."
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setReageerOp(null); setReactie(""); }}
                                disabled={verzenden}
                                className="text-xs text-gray-600 hover:underline px-2 py-1"
                              >
                                Annuleer
                              </button>
                              <button
                                onClick={() => versturen(n.id)}
                                disabled={verzenden || !reactie.trim()}
                                className="inline-flex items-center gap-1 bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-3 py-1 rounded-md text-xs disabled:opacity-50"
                              >
                                {verzenden ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                Verstuur
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
