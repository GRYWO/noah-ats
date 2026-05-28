import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Wrapper voor cron-endpoints die automatisch de run logt in cron_runs.
 *
 * Gebruik:
 *   return await runCron("cleanup-avg", async () => {
 *     // ... werk ...
 *     return { verwijderd: 5 };
 *   });
 */
export async function runCron<T extends object>(
  naam: string,
  fn: () => Promise<T>,
): Promise<{ ok: boolean; resultaat?: T; fout?: string }> {
  const start = Date.now();
  const gestart_op = new Date().toISOString();
  const admin = createAdminClient();
  try {
    const resultaat = await fn();
    const duur_ms = Date.now() - start;
    const heeftFouten = Array.isArray((resultaat as { fouten?: unknown[] }).fouten) &&
      (resultaat as { fouten: unknown[] }).fouten.length > 0;
    const status = heeftFouten ? "gedeeltelijk" : "succes";

    await admin.from("cron_runs").insert({
      cron_naam: naam,
      status,
      duur_ms,
      resultaat: resultaat as never,
      gestart_op,
      geeindigd_op: new Date().toISOString(),
    });
    return { ok: true, resultaat };
  } catch (e) {
    const duur_ms = Date.now() - start;
    const fout = (e as Error).message ?? String(e);
    await admin.from("cron_runs").insert({
      cron_naam: naam,
      status: "fout",
      duur_ms,
      fout_melding: fout,
      gestart_op,
      geeindigd_op: new Date().toISOString(),
    });
    return { ok: false, fout };
  }
}
