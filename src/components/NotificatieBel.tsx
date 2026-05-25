"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type Notificatie = {
  id: string;
  type: string;
  titel: string;
  bericht: string | null;
  link_url: string | null;
  gelezen: boolean;
  created_at: string;
};

export function NotificatieBel({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notificatie[]>([]);
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );

  async function laad() {
    const { data } = await supabase
      .from("notificaties")
      .select("id, type, titel, bericht, link_url, gelezen, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data ?? []);
  }

  useEffect(() => {
    laad();
    // Realtime subscription op insert
    const ch = supabase
      .channel("notif-" + userId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaties", filter: `user_id=eq.${userId}` },
        () => { laad(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function markeerAlsGelezen(id: string) {
    await supabase.from("notificaties").update({ gelezen: true }).eq("id", id);
    setItems((p) => p.map(n => n.id === id ? { ...n, gelezen: true } : n));
  }

  async function markeerAlleAlsGelezen() {
    await supabase.from("notificaties").update({ gelezen: true }).eq("user_id", userId).eq("gelezen", false);
    setItems((p) => p.map(n => ({ ...n, gelezen: true })));
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
          <div className="absolute left-full ml-2 bottom-0 w-80 max-h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 z-40 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="font-bold text-sm text-gray-800">Notificaties</span>
              <div className="flex items-center gap-2">
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
              ) : items.map(n => (
                <Link
                  key={n.id}
                  href={n.link_url ?? "#"}
                  onClick={() => { setOpen(false); if (!n.gelezen) markeerAlsGelezen(n.id); }}
                  className={`block px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                    n.gelezen ? "" : "bg-blue-50/50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.gelezen && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800">{n.titel}</div>
                      {n.bericht && <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.bericht}</div>}
                      <div className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
