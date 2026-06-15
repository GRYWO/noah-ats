"use client";

import Link from "next/link";
import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { maakNieuweMap, verwijderMap } from "./actions";
import { mailVerwijderen, mailVerplaatsen, mailFlagToggle, mailOngelezen, mailenBulkVerwijderen } from "./mail-actions";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { SearchBar } from "./SearchBar";
import type { InboxBericht, MailMap, MailDetail } from "@/utils/mail";

type Toast = { id: number; van: string; onderwerp: string };
type MailAccount = { id: string; mail_adres: string; display_naam: string | null; is_primary: boolean };

type Props = {
  userId: string;
  accountId: string;
  accounts: MailAccount[];
  mapPad: string;
  uid: string | undefined;
  berichten: (InboxBericht & { threadCount?: number })[];
  mappen: MailMap[];
  geopendeMail: (MailDetail & { body_loaded?: boolean }) | null;
  fetchError: string | null;
  huidigeMap: MailMap | undefined;
  mailAdres: string | null;
  isLeeg?: boolean;
};

export function InboxClient({
  userId,
  accountId,
  accounts,
  mapPad,
  uid,
  berichten,
  mappen,
  geopendeMail,
  fetchError,
  huidigeMap,
  mailAdres,
  isLeeg,
}: Props) {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [listWidth, setListWidth] = useState(384);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [syncBezig, setSyncBezig] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [geselecteerd, setGeselecteerd] = useState<Set<number>>(new Set());
  // Foutmelding-banner zichtbaar maken op basis van ?error=... en met
  // sluit-knop wegklikbaar. Zo verdwijnt een fout niet 'stilletjes' in
  // de URL en weet de gebruiker zeker dat er iets mis ging (bv. map
  // aanmaken zonder mail-config).
  const [foutZichtbaar, setFoutZichtbaar] = useState<string | null>(fetchError);

  // Bij nieuwe ?error=... in de URL banner weer tonen (router.refresh
  // levert nieuwe fetchError-prop, maar de close-knop heeft 'm misschien
  // al verborgen voor een vorige fout).
  useEffect(() => {
    setFoutZichtbaar(fetchError);
  }, [fetchError]);

  const sluitFoutmelding = () => {
    setFoutZichtbaar(null);
    // Strip ?error=... uit de URL zodat een refresh de banner niet
    // opnieuw oppopt.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("error")) {
        url.searchParams.delete("error");
        window.history.replaceState({}, "", url.toString());
      }
    }
  };
  // IDLE-status: true zodra de SSE-verbinding 'connected' meldt. Gebruikt
  // voor het visuele bolletje naast de Auto-checkbox.
  const [idleVerbonden, setIdleVerbonden] = useState(false);

  // Dedup-set: per browser-sessie 1x prefetchen per uid+map. Ref ipv state
  // omdat we geen re-render willen op mutate.
  const prefetchedRef = useRef<Set<string>>(new Set());
  // Hover-timer: prefetch alleen vuren als > 300ms gehoverd is, anders
  // krijgen we bij elke scroll een berg requests.
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPrefetch = (mailUid: number) => {
    const key = `${accountId}:${mapPad}:${mailUid}`;
    if (prefetchedRef.current.has(key)) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      // Markeer direct als prefetched zodat een snelle mouseleave/-enter
      // tussen 300ms en de fetch-respons niet alsnog dubbel triggert.
      prefetchedRef.current.add(key);
      fetch(
        `/api/mail/prefetch-body?account=${accountId}&map=${encodeURIComponent(mapPad)}&uid=${mailUid}`,
        { method: "POST" },
      ).catch(() => {
        // Best-effort: bij fout de key weghalen zodat een nieuwe hover later
        // gewoon opnieuw probeert.
        prefetchedRef.current.delete(key);
      });
    }, 300);
  };

  const cancelPrefetch = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  // Reset dedup als account/map wisselt: andere mailbox = andere uids,
  // maar de Set is gekoppeld aan account+map dus eigenlijk overbodig. Toch
  // legen om geheugen vrij te geven bij veel mapwissels.
  useEffect(() => {
    prefetchedRef.current = new Set();
  }, [accountId, mapPad]);

  // Optimistic UI: mails die de gebruiker net heeft verwijderd verbergen we
  // direct uit de lijst, voordat de server-action klaar is. Voorkomt de
  // 1-2 sec "freeze" waarin de IMAP-call moet voltooien + revalidate.
  const [hiddenUids, setHiddenUids] = useState<Set<number>>(new Set());
  // Idem voor "markeer als gelezen": als de gebruiker een ongelezen mail
  // opent renderen we 'm meteen als gelezen, zonder te wachten op de
  // server-roundtrip.
  const [optimischGelezen, setOptimischGelezen] = useState<Set<number>>(new Set());

  // Reset selectie + optimistic state als map wisselt: verse server-data
  // is dan de waarheid.
  useEffect(() => {
    setGeselecteerd(new Set());
    setHiddenUids(new Set());
    setOptimischGelezen(new Set());
  }, [mapPad]);

  // Als de server-data ververst is, optimistische staat opschonen voor mails
  // die er echt uit zijn / al echt gelezen zijn. Anders blijven uids voor
  // eeuwig in de set staan (memory leak + verwarring bij undo).
  useEffect(() => {
    const aanwezig = new Set(berichten.map(b => b.uid));
    setHiddenUids(prev => {
      let veranderd = false;
      const next = new Set<number>();
      prev.forEach(uid => {
        if (aanwezig.has(uid)) next.add(uid); // server zegt: bestaat nog → hou verborgen
        else veranderd = true;                // server zegt: weg → mag uit set
      });
      return veranderd ? next : prev;
    });
    setOptimischGelezen(prev => {
      let veranderd = false;
      const next = new Set<number>();
      prev.forEach(uid => {
        const b = berichten.find(x => x.uid === uid);
        if (b && !b.gelezen) next.add(uid); // server nog ongelezen → blijf optimistisch markeren
        else veranderd = true;
      });
      return veranderd ? next : prev;
    });
  }, [berichten]);

  // Zichtbare berichten = server-lijst minus optimistisch verwijderd
  const zichtbareBerichten = berichten.filter(b => !hiddenUids.has(b.uid));

  // Optimistisch verbergen, gebruikt door delete-handler (single + bulk)
  function verbergUids(uids: number[]) {
    setHiddenUids(prev => {
      const next = new Set(prev);
      uids.forEach(u => next.add(u));
      return next;
    });
  }
  // Optimistisch als gelezen markeren, gebruikt bij klik op ongelezen mail
  function markeerOptimischGelezen(targetUid: number) {
    setOptimischGelezen(prev => {
      if (prev.has(targetUid)) return prev;
      const next = new Set(prev);
      next.add(targetUid);
      return next;
    });
  }

  function toggleSelect(uid: number) {
    setGeselecteerd(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }
  function selecteerAlles() {
    setGeselecteerd(new Set(zichtbareBerichten.map(b => b.uid)));
  }
  function selectieWissen() {
    setGeselecteerd(new Set());
  }
  const allesGeselecteerd = zichtbareBerichten.length > 0 && geselecteerd.size === zichtbareBerichten.length;

  // Kort chime-geluidje afspelen
  const playChime = () => {
    try {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new Ctx();
      const tones = [880, 1100]; // 2 tonen: A5 → C#6
      tones.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
      setTimeout(() => ctx.close(), 700);
    } catch {
      // Audio context kan geblokkeerd zijn, negeer
    }
  };

  // Toast tonen + auto-verbergen + geluidje
  // Dedup: dezelfde van+onderwerp maximaal 1× per uur tonen. Voorkomt
  // dat een mail die om wat voor reden dan ook herhaaldelijk als INSERT
  // binnenkomt (server-side re-sync, IDLE-reconnect, cache-flush) elke
  // keer opnieuw als 'Nieuwe e-mail' wordt getoond.
  const toonToast = (van: string, onderwerp: string) => {
    try {
      const key = `noah-toast-${van}|${onderwerp}`;
      const laatst = parseInt(sessionStorage.getItem(key) ?? "0", 10);
      const nu = Date.now();
      if (laatst && nu - laatst < 60 * 60 * 1000) return; // < 1 uur geleden al getoond
      sessionStorage.setItem(key, String(nu));
    } catch {
      // sessionStorage kan in private mode falen, negeer en toon toch
    }
    const id = Date.now();
    setToasts(t => [...t, { id, van, onderwerp }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000);
    playChime();
    // Browser notification (als toestemming gegeven).
    // tag = identifier zodat de browser zelf duplicates samenvoegt.
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(`Nieuwe e-mail van ${van}`, {
        body: onderwerp,
        icon: "/noah-logo.png",
        tag: `noah-mail-${van}-${onderwerp}`.slice(0, 100),
      });
    }
  };

  // Vraag notificatie-permissie 1x
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Supabase Realtime: luister naar nieuwe mails voor deze user
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("mail-inserts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mail_berichten",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const nieuw = payload.new as { van: string; naam: string; onderwerp: string; map_pad: string };
          // Alleen meldingen tonen voor mails die in de INBOX terechtkomen.
          // Sent/Trash/Drafts/Spam/Junk filteren we eruit, anders krijg je
          // een "nieuwe mail" toast bij elke sync nadat je net iets hebt
          // verwijderd of verstuurd.
          const map = (nieuw.map_pad ?? "").toLowerCase();
          const isInbox = map === "inbox" || map.endsWith("/inbox") || map === "postvak in";
          if (!isInbox) return;
          toonToast(nieuw.naam ?? nieuw.van ?? "?", nieuw.onderwerp ?? "(geen onderwerp)");
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);


  const syncEnRefresh = async () => {
    setSyncBezig(true);
    try {
      const res = await fetch("/api/mail/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      // Als sync nieuwe mails ophaalde → toast voor laatste
      if (data?.nieuw && data.nieuw > 0) {
        const last = await fetch(`/api/mail/laatste?map=${encodeURIComponent("INBOX")}`);
        const lastData = await last.json().catch(() => null);
        if (lastData?.naam && lastData?.onderwerp) {
          toonToast(lastData.naam, lastData.onderwerp);
        }
      }
    } catch {
      // ignore
    } finally {
      setSyncBezig(false);
      startTransition(() => {
        router.refresh();
        setLastRefresh(new Date());
      });
    }
  };

  const refresh = () => {
    startTransition(() => {
      router.refresh();
      setLastRefresh(new Date());
    });
  };

  // Bij eerste page load: als helemaal leeg, doe initiele sync
  useEffect(() => {
    if (isLeeg) {
      syncEnRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Body lazy laden als mail geopend is maar nog niet
  useEffect(() => {
    if (uid && geopendeMail && !geopendeMail.body_loaded) {
      fetch(`/api/mail/body?account=${accountId}&map=${encodeURIComponent(mapPad)}&uid=${uid}`, { method: "POST" })
        .then(() => router.refresh());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, geopendeMail?.body_loaded]);

  // Pre-fetch top 3 mails in background zodat klikken instant voelt
  useEffect(() => {
    const top = berichten.slice(0, 3);
    top.forEach((b, i) => {
      setTimeout(() => {
        fetch(`/api/mail/body?account=${accountId}&map=${encodeURIComponent(mapPad)}&uid=${b.uid}`, { method: "POST" }).catch(() => {});
      }, i * 600); // gespreid om IMAP niet te overbelasten
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapPad, accountId]);

  // Auto-sync elke 15 seconden (haalt uit IMAP). Fallback voor het geval
  // de IDLE-SSE-verbinding niet werkt of dichtgevallen is.
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(syncEnRefresh, 15_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  // IMAP IDLE via SSE: push i.p.v. poll. Endpoint sluit zichzelf na ~5 min
  // (Vercel limiet), dus auto-reconnect bij onclose. EventSource doet dat
  // standaard al, maar we resetten de idleVerbonden-state zodat het bolletje
  // grijs wordt tot de nieuwe verbinding 'connected' meldt.
  useEffect(() => {
    if (!autoRefresh) {
      setIdleVerbonden(false);
      return;
    }
    let es: EventSource | null = null;
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (stopped) return;
      es = new EventSource("/api/mail/idle");

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as { type: string };
          if (data.type === "connected") {
            setIdleVerbonden(true);
          } else if (data.type === "new-mail") {
            // Push i.p.v. poll: server zegt "er is nieuwe mail" → direct
            // de UI revalideren zodat lijst meteen update.
            startTransition(() => {
              router.refresh();
              setLastRefresh(new Date());
            });
          } else if (data.type === "error") {
            setIdleVerbonden(false);
          }
        } catch {
          // ping of niet-JSON, negeren
        }
      };

      es.onerror = () => {
        setIdleVerbonden(false);
        es?.close();
        if (!stopped) {
          // Reconnect na 3s (route sluit zichzelf na 280s, of bij netwerkhik)
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
      setIdleVerbonden(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  // Sync direct als tab weer focus krijgt (= je komt terug op Noah)
  useEffect(() => {
    const onFocus = () => syncEnRefresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncEnRefresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize sidebar
  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(160, Math.min(400, startW + (ev.clientX - startX)));
      setSidebarWidth(w);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startListResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = listWidth;
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(280, Math.min(600, startW + (ev.clientX - startX)));
      setListWidth(w);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Load saved widths
  useEffect(() => {
    const saved = localStorage.getItem("noah-mail-layout");
    if (saved) {
      try {
        const { sidebar, list } = JSON.parse(saved);
        if (sidebar) setSidebarWidth(sidebar);
        if (list) setListWidth(list);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("noah-mail-layout", JSON.stringify({ sidebar: sidebarWidth, list: listWidth }));
  }, [sidebarWidth, listWidth]);

  return (
    <>
    <KeyboardShortcuts />
    {/* Toast notifications */}
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className="bg-white border border-gray-200 shadow-xl rounded-lg p-4 flex gap-3 animate-in slide-in-from-right cursor-pointer hover:shadow-2xl"
          onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
        >
          <div className="w-10 h-10 rounded-full bg-[#333399] text-white font-bold flex items-center justify-center flex-shrink-0">
            {t.van.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 mb-0.5">Nieuwe e-mail</div>
            <div className="text-sm font-bold text-gray-800 truncate">{t.van}</div>
            <div className="text-sm text-gray-600 truncate">{t.onderwerp}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Prominente foutmelding-banner: zichtbaar bovenaan met sluit-knop.
        Vervangt de oude kleine 1-regel-rood banner die makkelijk gemist
        werd na bv. een mislukte map-creatie. */}
    {foutZichtbaar && (
      <div
        role="alert"
        className="bg-red-50 border-b-2 border-red-300 text-red-800 px-5 py-3 flex items-start gap-3"
      >
        <div className="flex-1 text-sm">
          <strong className="font-semibold">Er ging iets mis.</strong>{" "}
          <span>{foutZichtbaar}</span>
        </div>
        <button
          type="button"
          onClick={sluitFoutmelding}
          aria-label="Sluit melding"
          className="text-red-700 hover:text-red-900 text-lg leading-none font-bold px-2"
        >
          ×
        </button>
      </div>
    )}

    <div className="flex" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Sidebar */}
      <aside
        className="bg-white border-r border-gray-200 flex flex-col flex-shrink-0"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="p-3 border-b space-y-2">
          {accounts.length > 1 && (
            <select
              value={accountId}
              onChange={(e) => router.push(`/inbox?account=${e.target.value}`)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.mail_adres}{a.is_primary ? " (primair)" : ""}
                </option>
              ))}
            </select>
          )}
          <Link href="/inbox/compose" className="block bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-2.5 rounded-md text-sm text-center">
            Nieuwe e-mail
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {mappen.length === 0 && fetchError && (
            <div className="px-4 py-2 text-xs text-red-600">Kan mappen niet laden</div>
          )}
          {mappen.map(m => {
            const isActive = m.pad === mapPad || (mapPad === "INBOX" && m.type === "inbox");
            const isSysteem = m.type !== "ander";
            return (
              <div
                key={m.pad}
                className={`group flex items-center text-sm transition border-l-4 ${
                  isActive
                    ? "bg-[#333399]/10 text-[#333399] border-[#333399] font-semibold"
                    : "border-transparent text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Link
                  href={`/inbox?map=${encodeURIComponent(m.pad)}`}
                  className="flex-1 flex justify-between items-center px-4 py-2 min-w-0"
                >
                  <span className="truncate">{m.label}</span>
                  {m.ongelezen > 0 && (
                    <span className="bg-[#333399] text-white text-xs font-semibold px-2 py-0.5 rounded-full ml-1">
                      {m.ongelezen}
                    </span>
                  )}
                </Link>
                {!isSysteem && (
                  <form
                    action={verwijderMap}
                    onSubmit={(e) => {
                      if (!confirm(`Map "${m.label}" verwijderen?`)) e.preventDefault();
                    }}
                    className="pr-2 opacity-0 group-hover:opacity-100"
                  >
                    <input type="hidden" name="map_pad" value={m.pad} />
                    <input type="hidden" name="account_id" value={accountId} />
                    <button
                      type="submit"
                      title="Map verwijderen"
                      className="text-gray-400 hover:text-red-600 text-xs p-1"
                    >
                      ✕
                    </button>
                  </form>
                )}
              </div>
            );
          })}

          <div className="px-3 mt-3">
            {!newFolderOpen ? (
              <button
                type="button"
                onClick={() => setNewFolderOpen(true)}
                className="w-full text-left text-xs text-gray-500 hover:text-[#333399] py-2 px-1"
              >
                Nieuwe map
              </button>
            ) : (
              <form action={maakNieuweMap} className="space-y-2 py-2">
                <input type="hidden" name="account_id" value={accountId} />
                <input
                  name="map_naam"
                  autoFocus
                  required
                  placeholder="Mapnaam"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-[#333399] hover:bg-[#2a2a80] text-white text-xs py-1.5 rounded-md">
                    Aanmaken
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFolderOpen(false)}
                    className="px-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Annuleer
                  </button>
                </div>
              </form>
            )}
          </div>
        </nav>
        <div className="p-3 border-t text-xs text-gray-500 truncate">{mailAdres ?? "geen"}</div>
      </aside>

      {/* Resize handle 1 */}
      <div
        onMouseDown={startSidebarResize}
        className="w-1 cursor-col-resize bg-transparent hover:bg-[#333399]/30 transition-colors"
        title="Sleep om te schalen"
      />

      {/* Berichten lijst */}
      <section
        className="bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0"
        style={{ width: `${listWidth}px` }}
      >
        <div className="px-5 py-3 border-b sticky top-0 bg-white z-10">
          <div className="mb-2"><SearchBar /></div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-base font-bold text-gray-800">{huidigeMap?.label ?? "Postvak IN"}</h1>
              <div className="text-xs text-gray-500 mt-0.5">
                {huidigeMap?.aantal ?? 0} berichten · {huidigeMap?.ongelezen ?? 0} ongelezen
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={syncEnRefresh}
                disabled={isPending || syncBezig}
                title="Sync nu met server"
                className="p-1.5 rounded-md hover:bg-gray-100 transition disabled:opacity-50"
              >
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-gray-600 ${(isPending || syncBezig) ? "animate-spin" : ""}`}
                >
                  <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/>
                  <path d="M21 3v5h-5"/>
                </svg>
              </button>
              <label
                className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"
                title={
                  autoRefresh
                    ? idleVerbonden
                      ? "IDLE-verbinding actief, nieuwe mail wordt direct gepusht"
                      : "Auto-refresh elke 15 sec (IDLE-verbinding niet actief)"
                    : "Auto-refresh uit"
                }
              >
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-3 h-3 accent-[#333399]"
                />
                <span>Auto</span>
                <span
                  aria-hidden="true"
                  className={`inline-block w-2 h-2 rounded-full ${
                    autoRefresh && idleVerbonden
                      ? "bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                      : "bg-gray-300"
                  }`}
                />
              </label>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            Laatst ververst: {lastRefresh.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>

        {/* De prominente foutmelding-banner staat nu bovenaan; hier geen
            duplicaat tonen. */}

        {/* Selectie-/bulk-actie balk */}
        {!fetchError && zichtbareBerichten.length > 0 && (
          <div className="px-5 py-2 border-b bg-gray-50 flex items-center gap-3 sticky top-[81px] z-[5]">
            <input
              type="checkbox"
              checked={allesGeselecteerd}
              onChange={() => allesGeselecteerd ? selectieWissen() : selecteerAlles()}
              className="w-4 h-4 accent-[#333399] cursor-pointer"
              title={allesGeselecteerd ? "Selectie wissen" : "Alles selecteren"}
            />
            {geselecteerd.size > 0 ? (
              <>
                <span className="text-xs font-semibold text-gray-700">
                  {geselecteerd.size} geselecteerd
                </span>
                <form
                  action={mailenBulkVerwijderen}
                  onSubmit={(e) => {
                    if (!confirm(`${geselecteerd.size} mail(s) verwijderen?`)) {
                      e.preventDefault();
                      return;
                    }
                    // Optimistisch: verberg meteen + clear selectie. startTransition
                    // wrapt zodat React weet dat er nog async werk loopt en de
                    // disabled-states correct meeschakelen.
                    const tegelijk = Array.from(geselecteerd);
                    startTransition(() => {
                      verbergUids(tegelijk);
                      selectieWissen();
                    });
                  }}
                  className="ml-auto"
                >
                  <input type="hidden" name="uids" value={Array.from(geselecteerd).join(",")} />
                  <input type="hidden" name="map_pad" value={mapPad} />
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                    </svg>
                    Verwijder {geselecteerd.size}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={selectieWissen}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Wis selectie
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-500">Klik om mails te selecteren voor bulk-acties</span>
            )}
          </div>
        )}

        {!fetchError && zichtbareBerichten.length > 0 && (
          <div>
            {zichtbareBerichten.map(b => {
              const isActive = uid && b.uid === parseInt(uid);
              const isSelected = geselecteerd.has(b.uid);
              // "Effectief gelezen" = server zegt gelezen OF wij hebben 'm
              // optimistisch al als gelezen gemarkeerd na klik.
              const effGelezen = b.gelezen || optimischGelezen.has(b.uid);
              return (
                <div
                  key={b.uid}
                  data-uid={b.uid}
                  onMouseEnter={() => startPrefetch(b.uid)}
                  onMouseLeave={cancelPrefetch}
                  className={`group relative border-b border-gray-100 hover:bg-gray-50 ${
                    isActive ? "bg-[#333399]/10 border-l-4 border-l-[#333399]" :
                    isSelected ? "bg-[#333399]/5" :
                    !effGelezen ? "bg-blue-50/50" : ""
                  }`}
                >
                  {/* Checkbox links, pakt klik los van de Link */}
                  <label
                    className="absolute top-3 left-1.5 z-10 p-1 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(b.uid)}
                      className="w-4 h-4 accent-[#333399] cursor-pointer"
                    />
                  </label>

                  {/* Hover verwijder-knop rechts */}
                  <form
                    action={mailVerwijderen}
                    onSubmit={(e) => {
                      if (!confirm("Mail verwijderen?")) {
                        e.preventDefault();
                        return;
                      }
                      // Optimistisch verbergen vóór de server-action draait.
                      // startTransition zodat React deze state-update als
                      // niet-urgent markeert en isPending true wordt, geeft
                      // visuele freeze-bescherming op andere knoppen.
                      startTransition(() => {
                        verbergUids([b.uid]);
                      });
                    }}
                    className="absolute top-2.5 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input type="hidden" name="uid" value={b.uid} />
                    <input type="hidden" name="map_pad" value={mapPad} />
                    <button
                      type="submit"
                      title="Verwijder mail"
                      className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-gray-500 shadow-sm transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                      </svg>
                    </button>
                  </form>

                  <Link
                    href={`/inbox?map=${encodeURIComponent(mapPad)}&uid=${b.uid}`}
                    onClick={() => {
                      // Optimistisch markeren als gelezen zodra je klikt.
                      // De server-revalidate werkt de echte gelezen-state bij;
                      // tot die tijd zien we al meteen het visuele "is gelezen"
                      // effect (geen bold, geen blauwe achtergrond).
                      if (!b.gelezen) markeerOptimischGelezen(b.uid);
                    }}
                    className="block pl-10 pr-12 py-3"
                  >
                    <div className="flex justify-between items-baseline">
                      <span className={`text-sm truncate ${!effGelezen ? "font-bold text-gray-900" : "text-gray-700"}`}>
                        {b.naam}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {new Date(b.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div className={`text-sm truncate mt-0.5 ${!effGelezen ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {b.onderwerp}
                      {b.threadCount && b.threadCount > 1 ? (
                        <span className="ml-2 text-xs text-gray-400 font-normal">({b.threadCount} berichten)</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">{b.van}</div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {!fetchError && zichtbareBerichten.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">Leeg.</div>
        )}
      </section>

      {/* Resize handle 2 */}
      <div
        onMouseDown={startListResize}
        className="w-1 cursor-col-resize bg-transparent hover:bg-[#333399]/30 transition-colors"
        title="Sleep om te schalen"
      />

      {/* Detail panel */}
      <section className="flex-1 overflow-y-auto bg-white min-w-0">
        {geopendeMail ? (
          <div>
            {/* Toolbar */}
            <div className="sticky top-0 bg-white border-b z-10 px-6 py-3 flex items-center gap-1">
              <Link
                href={`/inbox/compose?reply_to=${encodeURIComponent(geopendeMail.van)}&subject=${encodeURIComponent("Re: " + geopendeMail.onderwerp)}`}
                title="Beantwoorden"
                className="p-2 hover:bg-gray-100 rounded-md text-gray-700"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
              </Link>

              <Link
                href={`/inbox/compose?subject=${encodeURIComponent("Fwd: " + geopendeMail.onderwerp)}&body=${encodeURIComponent(`\n\n---------- Doorgestuurd bericht ----------\nVan: ${geopendeMail.van}\nDatum: ${new Date(geopendeMail.datum).toLocaleString("nl-NL")}\nOnderwerp: ${geopendeMail.onderwerp}\n\n${geopendeMail.tekst ?? ""}`)}`}
                title="Doorsturen"
                className="p-2 hover:bg-gray-100 rounded-md text-gray-700"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>
              </Link>

              <div className="w-px h-6 bg-gray-200 mx-1"></div>

              <form action={mailFlagToggle}>
                <input type="hidden" name="uid" value={geopendeMail.uid} />
                <input type="hidden" name="map_pad" value={mapPad} />
                <input type="hidden" name="gevlagd" value={geopendeMail.gevlagd ? "true" : "false"} />
                <button
                  type="submit"
                  title={geopendeMail.gevlagd ? "Vlag verwijderen" : "Markeer als belangrijk"}
                  className={`p-2 hover:bg-gray-100 rounded-md ${geopendeMail.gevlagd ? "text-amber-500" : "text-gray-400 hover:text-amber-500"}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={geopendeMail.gevlagd ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                </button>
              </form>

              <form action={mailOngelezen}>
                <input type="hidden" name="uid" value={geopendeMail.uid} />
                <input type="hidden" name="map_pad" value={mapPad} />
                <button type="submit" title="Markeer als ongelezen" className="p-2 hover:bg-gray-100 rounded-md text-gray-700">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </button>
              </form>

              {/* Verplaatsen */}
              <details className="relative">
                <summary className="list-none p-2 hover:bg-gray-100 rounded-md text-gray-700 cursor-pointer" title="Verplaatsen naar map">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </summary>
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-20 min-w-[180px] py-1">
                  {mappen.filter(m => m.pad !== mapPad).map(m => (
                    <form key={m.pad} action={mailVerplaatsen}>
                      <input type="hidden" name="uid" value={geopendeMail.uid} />
                      <input type="hidden" name="van_map" value={mapPad} />
                      <input type="hidden" name="naar_map" value={m.pad} />
                      <button type="submit" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        {m.label}
                      </button>
                    </form>
                  ))}
                </div>
              </details>

              <div className="w-px h-6 bg-gray-200 mx-1"></div>

              <form
                action={mailVerwijderen}
                onSubmit={() => {
                  // Optimistisch verbergen vanuit de detail-toolbar. De
                  // server redirect straks, maar tot die tijd zien we al
                  // dat de mail uit de lijst is.
                  startTransition(() => {
                    verbergUids([geopendeMail.uid]);
                  });
                }}
              >
                <input type="hidden" name="uid" value={geopendeMail.uid} />
                <input type="hidden" name="map_pad" value={mapPad} />
                <button
                  type="submit"
                  title="Verwijderen"
                  data-mail-action="delete"
                  className="p-2 hover:bg-red-50 rounded-md text-red-600"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
              </form>
            </div>

            <div className="p-8 max-w-4xl">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">{geopendeMail.onderwerp}</h1>
              <div className="text-sm text-gray-500 mb-6 pb-4 border-b">
                <div><b>Van:</b> {geopendeMail.van}</div>
                <div><b>Aan:</b> {geopendeMail.naar}</div>
                <div><b>Datum:</b> {new Date(geopendeMail.datum).toLocaleString("nl-NL")}</div>
              </div>

              {geopendeMail.body_loaded ? (
                geopendeMail.html ? (
                  // Mailinhoud is niet-vertrouwd → in een sandboxed iframe tonen zodat
                  // scripts NIET draaien (voorkomt stored XSS). Links mogen wel openen.
                  <iframe
                    title="E-mailinhoud"
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    srcDoc={geopendeMail.html}
                    className="w-full min-h-[500px] border-0 bg-white"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{geopendeMail.tekst}</pre>
                )
              ) : (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-100 rounded w-4/5"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                  <p className="text-xs text-gray-400 mt-4">Bericht wordt geladen via IMAP...</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Selecteer een e-mail om te lezen
          </div>
        )}
      </section>
    </div>
    </>
  );
}
