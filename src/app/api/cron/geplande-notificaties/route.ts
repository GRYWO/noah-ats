import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { runCron } from "@/utils/cron-log";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Elke minuut: zet verlopen geplande_notificaties om naar echte
 * notificaties zodat de popup verschijnt (via realtime in NotificatieBel).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await runCron("geplande-notificaties", async () => {
    const admin = createAdminClient();
    const nu = new Date().toISOString();
    const resultaat = { verwerkt: 0, fouten: [] as string[] };

    const { data: gepland } = await admin
      .from("geplande_notificaties")
      .select("id, tenant_id, voor_user_id, gepland_door, titel, bericht, geplande_tijd")
      .eq("status", "open")
      .lt("geplande_tijd", nu)
      .limit(100);

    for (const g of gepland ?? []) {
      try {
        const { error: insErr } = await admin.from("notificaties").insert({
          tenant_id: g.tenant_id,
          user_id: g.voor_user_id,
          van_user_id: g.gepland_door,
          type: "herinnering",
          titel: g.titel,
          bericht: g.bericht,
        });
        if (insErr) {
          resultaat.fouten.push(`${g.id}: ${insErr.message}`);
          continue;
        }
        await admin
          .from("geplande_notificaties")
          .update({ status: "verstuurd", verstuurd_op: nu })
          .eq("id", g.id);
        resultaat.verwerkt++;
      } catch (e) {
        resultaat.fouten.push(`${g.id}: ${e instanceof Error ? e.message : "onbekend"}`);
      }
    }

    return resultaat;
  });

  return NextResponse.json({ ok: run.ok, ...(run.resultaat ?? {}), fout: run.fout });
}
