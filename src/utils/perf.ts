import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Performance-tracking helpers.
 *
 * Doel: latency van Server Component pageloads + zware queries meten en
 * loggen naar perf_metrics. Het super-admin dashboard leest die tabel om
 * langzame routes en breakdowns te tonen.
 *
 * Belangrijke design-keuzes:
 *  - Fire-and-forget logging: nooit await — de pageload mag er niet op wachten.
 *  - Alleen loggen vanaf 10ms — sub-10ms is ruis.
 *  - Buffering kan later; voor nu houden we het simpel.
 */

type Type = "page" | "api" | "query" | "rsc";

export type PerfRecord = {
  pad: string;
  type: Type;
  duur_ms: number;
  user_id?: string | null;
  tenant_id?: string | null;
  status?: number | null;
  extra?: Record<string, unknown> | null;
};

/**
 * Log fire-and-forget naar perf_metrics. Faalt nooit hardop.
 */
export function logPerf(record: PerfRecord) {
  if (record.duur_ms < 10) return; // ruis filteren
  try {
    const admin = createAdminClient();
    admin
      .from("perf_metrics")
      .insert({
        pad: record.pad.slice(0, 200),
        type: record.type,
        duur_ms: Math.round(record.duur_ms),
        user_id: record.user_id ?? null,
        tenant_id: record.tenant_id ?? null,
        status: record.status ?? null,
        extra: record.extra ?? null,
      })
      .then(({ error }) => {
        if (error) console.warn("[perf] insert mislukt:", error.message);
      });
  } catch (e) {
    console.warn("[perf] init mislukt:", e);
  }
}

/**
 * Wrap een async functie zodat de duur automatisch wordt geregistreerd.
 *
 * @example
 *   const data = await meetLatency("/dashboard", "page", async () => {
 *     return await loadDashboardData();
 *   });
 */
export async function meetLatency<T>(
  pad: string,
  type: Type,
  fn: () => Promise<T>,
  extra?: Record<string, unknown>
): Promise<T> {
  const t0 = performance.now();
  try {
    const result = await fn();
    logPerf({ pad, type, duur_ms: performance.now() - t0, extra });
    return result;
  } catch (e) {
    logPerf({
      pad,
      type,
      duur_ms: performance.now() - t0,
      extra: { ...extra, error: true },
    });
    throw e;
  }
}

/**
 * Synchroon timer-handle voor handmatig stoppen. Gebruik wanneer je
 * meerdere segmenten apart wil meten binnen één page.
 */
export function startTimer() {
  const t0 = performance.now();
  return () => performance.now() - t0;
}
