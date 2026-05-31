import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";

/**
 * Performance snapshot voor super-admin dashboard.
 * Geeft p50/p95/p99 + count per pad over de laatste 24u terug,
 * plus de top-10 langzaamste hits.
 *
 * Output: ~1-3KB JSON, hooguit 50ms query-tijd dankzij idx_perf_time.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Niet toegestaan" }, { status: 403 });
  }

  // Periode: ?u=1 (1 uur) | ?u=24 (default, 24 uur) | ?u=168 (1 week)
  const url = new URL(req.url);
  const uren = Math.max(1, Math.min(168, parseInt(url.searchParams.get("u") ?? "24")));

  const admin = createAdminClient();
  const since = new Date(Date.now() - uren * 60 * 60 * 1000).toISOString();

  // Alle samples van afgelopen 24u — kappen op 20k anders te traag
  const { data: samples } = await admin
    .from("perf_metrics")
    .select("pad, type, duur_ms")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(20000);

  type Row = { pad: string; type: string; duur_ms: number };
  const rijen: Row[] = samples ?? [];

  // Groepeer per pad+type
  const buckets = new Map<string, { type: string; samples: number[] }>();
  for (const r of rijen) {
    const key = `${r.type}::${r.pad}`;
    if (!buckets.has(key)) buckets.set(key, { type: r.type, samples: [] });
    buckets.get(key)!.samples.push(r.duur_ms);
  }

  function percentiel(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx];
  }

  const breakdown = Array.from(buckets.entries()).map(([key, b]) => {
    const pad = key.split("::").slice(1).join("::");
    const samples = b.samples;
    const totaal = samples.reduce((s, n) => s + n, 0);
    return {
      pad,
      type: b.type,
      aantal: samples.length,
      p50: percentiel(samples, 50),
      p95: percentiel(samples, 95),
      p99: percentiel(samples, 99),
      gem: Math.round(totaal / samples.length),
      max: Math.max(...samples),
    };
  });

  // Sorteer op p95 desc — bovenste = traagste
  breakdown.sort((a, b) => b.p95 - a.p95);

  // Top-10 langzaamste individuele hits
  const top10 = [...rijen].sort((a, b) => b.duur_ms - a.duur_ms).slice(0, 10);

  // Globale telemetrie
  const totaal = rijen.length;
  const traag = rijen.filter((r) => r.duur_ms >= 200).length;
  const heelTraag = rijen.filter((r) => r.duur_ms >= 1000).length;

  return NextResponse.json({
    sinds: since,
    totaal,
    traag_200ms: traag,
    traag_1s: heelTraag,
    breakdown: breakdown.slice(0, 25), // top 25 langzaamste paden
    top10,
  });
}
