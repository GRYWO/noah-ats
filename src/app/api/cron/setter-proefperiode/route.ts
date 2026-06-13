import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";
import { runCron } from "@/utils/cron-log";
import { startSetterAbonnement } from "@/app/users/setter-stripe-actions";

const resend = new Resend(process.env.RESEND_API_KEY);

export const dynamic = "force-dynamic";

/**
 * Dagelijkse check op verlopen setter-proefperiodes.
 * - Setter krijgt 5 werkdagen gratis bij aanmaak (status = "proefperiode").
 * - Zodra proefperiode_eindigt_op verlopen is:
 *   1. status → "wachtend_betaling" (middleware blokkeert vanaf nu)
 *   2. Stripe-checkout-mail wordt gestuurd via startSetterAbonnement()
 *   3. proefperiode_mail_verstuurd = true (voorkomt dubbele mails)
 * - Bij betaling: Stripe-webhook zet status → "actief" → toegang herstelt.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await runCron("setter-proefperiode", async () => {
    const admin = createAdminClient();
    const nu = new Date().toISOString();
    const resultaat = {
      verlopen: 0,
      mail_verstuurd: 0,
      fouten: [] as string[],
    };

    // Setters waarvan de proefperiode is verlopen en die nog geen mail kregen
    const { data: setters } = await admin
      .from("profiles")
      .select("id, voornaam, mail_adres, proefperiode_eindigt_op")
      .eq("rol", "setter")
      .eq("abonnement_status", "proefperiode")
      .eq("proefperiode_mail_verstuurd", false)
      .lt("proefperiode_eindigt_op", nu);

    for (const setter of setters ?? []) {
      resultaat.verlopen++;
      try {
        const r = await startSetterAbonnement(setter.id);
        if (r.ok) {
          await admin
            .from("profiles")
            .update({ proefperiode_mail_verstuurd: true })
            .eq("id", setter.id);
          resultaat.mail_verstuurd++;
        } else {
          resultaat.fouten.push(`${setter.voornaam ?? setter.id}: ${r.error ?? "onbekend"}`);
        }
      } catch (e) {
        resultaat.fouten.push(
          `${setter.voornaam ?? setter.id}: ${e instanceof Error ? e.message : "onbekend"}`
        );
      }
    }

    // Stuur interne waarschuwing naar info@noah-recruitment.nl als er fouten zijn,
    // zodat Yorith/Pepijn direct kan ingrijpen voordat een setter blijft hangen.
    if (resultaat.fouten.length > 0) {
      try {
        await resend.emails.send({
          from: "Noah ATS <noreply@noah-recruitment.nl>",
          to: "info@noah-recruitment.nl",
          subject: `⚠ Setter-proefperiode cron: ${resultaat.fouten.length} fout(en)`,
          html: `<p>De dagelijkse cron heeft <b>${resultaat.fouten.length}</b> setter(s) niet kunnen verwerken:</p>
<ul>${resultaat.fouten.map((f) => `<li>${f}</li>`).join("")}</ul>
<p>Cron probeert morgen opnieuw. Voor handmatige actie: open /users, klik op de mail-knop bij de setter om de Stripe-link opnieuw te versturen.</p>`,
        });
      } catch (e) {
        console.error("[setter-proefperiode] interne waarschuwing mislukt:", e);
      }
    }

    return resultaat;
  });

  return NextResponse.json({ ok: run.ok, ...(run.resultaat ?? {}), fout: run.fout });
}
