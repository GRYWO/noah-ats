import { headers } from "next/headers";

// Eenvoudige in-memory rate-limiter (fixed window) voor publieke acties/endpoints.
type Window = { count: number; reset: number };
const buckets = new Map<string, Window>();

function opschonen(nu: number) {
  if (buckets.size < 2000) return;
  for (const [k, w] of buckets) if (w.reset < nu) buckets.delete(k);
}

export function rateLimit(sleutel: string, max: number, perSeconden: number): boolean {
  const nu = Date.now();
  opschonen(nu);
  const w = buckets.get(sleutel);
  if (!w || w.reset < nu) {
    buckets.set(sleutel, { count: 1, reset: nu + perSeconden * 1000 });
    return true;
  }
  if (w.count >= max) return false;
  w.count++;
  return true;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const real = h.get("x-real-ip");
  if (real?.trim()) return real.trim();
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const delen = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    if (delen.length) return delen[delen.length - 1]!;
  }
  return "onbekend";
}
