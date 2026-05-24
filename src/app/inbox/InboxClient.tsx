"use client";

import Link from "next/link";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { maakNieuweMap, verwijderMap } from "./actions";
import { mailVerwijderen, mailVerplaatsen, mailFlagToggle, mailOngelezen } from "./mail-actions";
import type { InboxBericht, MailMap, MailDetail } from "@/utils/mail";

type Toast = { id: number; van: string; onderwerp: string };

type Props = {
  userId: string;
  mapPad: string;
  uid: string | undefined;
  berichten: InboxBericht[];
  mappen: MailMap[];
  geopendeMail: (MailDetail & { body_loaded?: boolean }) | null;
  fetchError: string | null;
  huidigeMap: MailMap | undefined;
  mailAdres: string | null;
  isLeeg?: boolean;
};

export function InboxClient({
  userId,
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

  // Toast tonen + auto-verbergen
  const toonToast = (van: string, onderwerp: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, van, onderwerp }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000);
    // Browser notification (als toestemming gegeven)
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(`Nieuwe e-mail van ${van}`, { body: onderwerp, icon: "/grywo-logo.png" });
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
          // Alleen inbox-meldingen tonen (niet voor verzonden mails)
          if (nieuw.map_pad.toLowerCase().includes("sent") || nieuw.map_pad.toLowerCase().includes("verzonden")) return;
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

  // IMAP IDLE via SSE — sub-second push als nieuwe mail binnenkomt
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      eventSource = new EventSource("/api/mail/idle");

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Bij "new-mail" wordt Supabase al ververst via realtime channel
          // Geen extra actie nodig hier
          void data;
        } catch {}
      };

      eventSource.onerror = () => {
        eventSource?.close();
        // Reconnect na 3 sec
        if (!stopped) reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      stopped = true;
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const syncEnRefresh = async () => {
    setSyncBezig(true);
    try {
      await fetch("/api/mail/sync", { method: "POST" });
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
      fetch(`/api/mail/body?map=${encodeURIComponent(mapPad)}&uid=${uid}`, { method: "POST" })
        .then(() => router.refresh());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, geopendeMail?.body_loaded]);

  // Auto-sync elke 60 seconden (haalt uit IMAP)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(syncEnRefresh, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

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

    <div className="flex" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Sidebar */}
      <aside
        className="bg-white border-r border-gray-200 flex flex-col flex-shrink-0"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="p-3 border-b">
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
                + Nieuwe map
              </button>
            ) : (
              <form action={maakNieuweMap} className="space-y-2 py-2">
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
        <div className="p-3 border-t text-xs text-gray-500 truncate">{mailAdres ?? "—"}</div>
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
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer" title="Auto-refresh elke 30 sec">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-3 h-3 accent-[#333399]"
                />
                <span>Auto</span>
              </label>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            Laatst ververst: {lastRefresh.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>

        {fetchError && (
          <div className="m-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md p-3">{fetchError}</div>
        )}

        {!fetchError && berichten.length > 0 && (
          <div>
            {berichten.map(b => {
              const isActive = uid && b.uid === parseInt(uid);
              return (
                <Link
                  key={b.uid}
                  href={`/inbox?map=${encodeURIComponent(mapPad)}&uid=${b.uid}`}
                  className={`block px-5 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                    isActive ? "bg-[#333399]/10 border-l-4 border-l-[#333399]" :
                    !b.gelezen ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex justify-between items-baseline">
                    <span className={`text-sm truncate ${!b.gelezen ? "font-bold text-gray-900" : "text-gray-700"}`}>
                      {b.naam}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                      {new Date(b.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <div className={`text-sm truncate mt-0.5 ${!b.gelezen ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                    {b.onderwerp}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">{b.van}</div>
                </Link>
              );
            })}
          </div>
        )}

        {!fetchError && berichten.length === 0 && (
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
                <input type="hidden" name="gevlagd" value="false" />
                <button type="submit" title="Markeer als belangrijk" className="p-2 hover:bg-gray-100 rounded-md text-amber-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
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

              <form action={mailVerwijderen}>
                <input type="hidden" name="uid" value={geopendeMail.uid} />
                <input type="hidden" name="map_pad" value={mapPad} />
                <button type="submit" title="Verwijderen" className="p-2 hover:bg-red-50 rounded-md text-red-600">
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

              {geopendeMail.html ? (
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: geopendeMail.html }} />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{geopendeMail.tekst}</pre>
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
