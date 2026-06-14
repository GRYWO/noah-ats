import { NextResponse } from "next/server";
import { cronGeautoriseerd } from "@/utils/cron-auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { runCron } from "@/utils/cron-log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * AVG-bewaartermijnen afdwingen (draait dagelijks).
 *
 * 1. Afgewezen kandidaten (status='afgewezen') > 4 weken oud → verwijderen
 *    (DPA-belofte aan bureaus, AVG-principe van data-minimalisatie)
 * 2. Verlopen mijn_data_tokens > 24 uur oud → verwijderen
 *    (privacy-by-default: oude magic-links opruimen)
 * 3. Verlopen DPA / akkoord uitnodigingen (status='wachtend') > 30 dagen → markeren als ingetrokken
 *    (geen actieve veiligheidsrisico's met oude tokens)
 *
 * Authenticatie via CRON_SECRET header — Vercel Cron stuurt automatisch
 * 'Authorization: Bearer <CRON_SECRET>'.
 */
export async function GET(req: Request) {
  if (!cronGeautoriseerd(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await runCron("cleanup-avg", async () => {
  const admin = createAdminClient();
  const nu = new Date();
  const vierWekenGeleden = new Date(nu.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const dertigDagenGeleden = new Date(nu.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const eenDagGeleden = new Date(nu.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const resultaat = {
    afgewezen_verwijderd: 0,
    mijn_data_tokens_opgeruimd: 0,
    oude_uitnodigingen_ingetrokken: 0,
    contract_originelen_verwijderd: 0,
    cron_runs_opgeruimd: 0,
    perf_metrics_opgeruimd: 0,
    fouten: [] as string[],
  };

  // 0) Oude cron_runs ouder dan 30 dagen verwijderen
  try {
    const dertigDagen = new Date(nu.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("cron_runs")
      .delete({ count: "exact" })
      .lt("gestart_op", dertigDagen);
    resultaat.cron_runs_opgeruimd = count ?? 0;
  } catch (e) {
    resultaat.fouten.push(`cron-runs-cleanup: ${(e as Error).message}`);
  }

  // 0b) Oude perf_metrics ouder dan 30 dagen verwijderen
  try {
    const dertigDagen = new Date(nu.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("perf_metrics")
      .delete({ count: "exact" })
      .lt("occurred_at", dertigDagen);
    resultaat.perf_metrics_opgeruimd = count ?? 0;
  } catch (e) {
    resultaat.fouten.push(`perf-metrics-cleanup: ${(e as Error).message}`);
  }

  // 1) Afgewezen kandidaten ouder dan 4 weken → verwijderen
  try {
    const { data: oudeKandidaten } = await admin
      .from("kandidaten")
      .select("id, tenant_id")
      .eq("status", "afgewezen")
      .lt("updated_at", vierWekenGeleden);

    if (oudeKandidaten && oudeKandidaten.length > 0) {
      // Audit-log voor elke verwijdering
      for (const k of oudeKandidaten) {
        // Kolom heet 'event_type' (niet 'event'); foutieve kolomnaam liet de
        // hele AVG-cleanup crashen. Audit-fout mag de verwijdering niet blokkeren.
        const { error: logErr } = await admin.from("voorstel_logs").insert({
          tenant_id: k.tenant_id,
          kandidaat_id: k.id,
          event_type: "afwijzing",
          beschrijving: `Automatische verwijdering — bewaartermijn van 4 weken voor afgewezen kandidaten overschreden (AVG art. 5).`,
          zichtbaar_voor_kandidaat: false,
        });
        if (logErr) resultaat.fouten.push(`audit ${k.id}: ${logErr.message}`);
      }
      const { error } = await admin
        .from("kandidaten")
        .delete()
        .in("id", oudeKandidaten.map(k => k.id));
      if (error) resultaat.fouten.push(`afgewezen-delete: ${error.message}`);
      else resultaat.afgewezen_verwijderd = oudeKandidaten.length;
    }
  } catch (e) {
    resultaat.fouten.push(`afgewezen-cleanup: ${(e as Error).message}`);
  }

  // 2) Oude mijn_data_tokens opruimen
  try {
    const { count } = await admin
      .from("mijn_data_tokens")
      .delete({ count: "exact" })
      .lt("verloopt_op", eenDagGeleden);
    resultaat.mijn_data_tokens_opgeruimd = count ?? 0;
  } catch (e) {
    resultaat.fouten.push(`tokens-cleanup: ${(e as Error).message}`);
  }

  // 3) Hangende DPA/akkoord-uitnodigingen ouder dan 30 dagen → ingetrokken
  try {
    const { count: dpaCount } = await admin
      .from("dpa_signatures")
      .update({ status: "ingetrokken" }, { count: "exact" })
      .eq("status", "wachtend")
      .lt("verzonden_op", dertigDagenGeleden);
    const { count: uaCount } = await admin
      .from("user_agreements")
      .update({ status: "ingetrokken" }, { count: "exact" })
      .eq("status", "wachtend")
      .lt("verzonden_op", dertigDagenGeleden);
    resultaat.oude_uitnodigingen_ingetrokken = (dpaCount ?? 0) + (uaCount ?? 0);
  } catch (e) {
    resultaat.fouten.push(`uitnodigingen-cleanup: ${(e as Error).message}`);
  }

  // 4) Contract-originelen ouder dan 24 uur verwijderen (AVG dataminimalisatie)
  //    De geredacteerde versie + samenvatting blijven bewaard (fiscaal 7j).
  try {
    const { data: oudeContracten } = await admin
      .from("contract_verzoeken")
      .select("id, origineel_pad")
      .not("origineel_pad", "is", null)
      .lt("afgerond_op", eenDagGeleden);

    if (oudeContracten && oudeContracten.length > 0) {
      const paden = oudeContracten
        .map((c) => c.origineel_pad)
        .filter((p): p is string => !!p);
      if (paden.length > 0) {
        await admin.storage.from("contracten").remove(paden);
        await admin
          .from("contract_verzoeken")
          .update({ origineel_pad: null })
          .in("id", oudeContracten.map((c) => c.id));
        resultaat.contract_originelen_verwijderd = paden.length;
      }
    }
  } catch (e) {
    resultaat.fouten.push(`contract-cleanup: ${(e as Error).message}`);
  }

  return { tijdstip: nu.toISOString(), ...resultaat };
  });
  return NextResponse.json({ ok: run.ok, ...(run.resultaat ?? {}), fout: run.fout });
}
