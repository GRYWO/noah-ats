import crypto from "crypto";

// Timing-safe cron-auth. Faalt HARD als CRON_SECRET ontbreekt (endpoint nooit open).
// Accepteert zowel de Authorization-header (Vercel Cron) als ?secret= (legacy),
// maar vergelijkt altijd constant-time.
export function cronGeautoriseerd(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const verwacht = `Bearer ${secret}`;
  const header = req.headers.get("authorization") || "";
  if (header.length === verwacht.length) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(header), Buffer.from(verwacht))) return true;
    } catch {
      /* val door naar query-check */
    }
  }
  // Legacy fallback: ?secret= (constant-time).
  const q = new URL(req.url).searchParams.get("secret") || "";
  if (q.length === secret.length) {
    try {
      return crypto.timingSafeEqual(Buffer.from(q), Buffer.from(secret));
    } catch {
      return false;
    }
  }
  return false;
}
