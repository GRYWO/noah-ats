"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Knop om Web Push notificaties aan/uit te zetten.
 * Werkt alleen als VAPID public key in env staat én de browser ondersteunt push.
 */
export function PushAanmeldKnop() {
  const [supported, setSupported] = useState<boolean>(false);
  const [aan, setAan] = useState<boolean>(false);
  const [bezig, setBezig] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setAan(!!sub))
      .catch(() => {});
  }, []);

  async function aanzetten() {
    setBezig(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        alert("Toestemming voor notificaties geweigerd. Pas dit aan in je browserinstellingen.");
        return;
      }
      const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
      if (!pubKey) {
        alert("Push niet geconfigureerd. Neem contact op met Noah-support.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey) as BufferSource,
      });
      const r = await fetch("/api/push/aanmelden", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!r.ok) throw new Error(await r.text());
      setAan(true);
    } catch (e) {
      console.error(e);
      alert("Aanmelden mislukt — probeer opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  async function uitzetten() {
    setBezig(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/aanmelden", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setAan(false);
    } finally {
      setBezig(false);
    }
  }

  if (!supported) {
    return (
      <div className="text-xs text-gray-500 flex items-center gap-1.5">
        <BellOff size={14} /> Push niet ondersteund in deze browser
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={aan ? uitzetten : aanzetten}
      disabled={bezig}
      className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-md transition-colors ${
        aan
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "bg-[#333399] text-white hover:bg-[#2a2a80]"
      } disabled:opacity-50`}
    >
      {bezig ? <Loader2 size={14} className="animate-spin" /> : aan ? <Bell size={14} /> : <Bell size={14} />}
      {aan ? "Notificaties aan — uitzetten" : "Zet desktop-notificaties aan"}
    </button>
  );
}
