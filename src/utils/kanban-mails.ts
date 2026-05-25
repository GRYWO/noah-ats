import { createAdminClient } from "@/utils/supabase/admin";
import { getSetterFrom } from "@/utils/email-helpers";
import {
  sendKandidaatVoorgesteld,
  sendGesprek1Bevestiging,
  sendGesprek2Succes,
  sendInProcesGestart,
} from "@/utils/email";
import { logVoorstelEvent } from "@/utils/voorstel-log";

/**
 * Bij overgang naar bepaalde kanban-stappen wordt automatisch een mail naar
 * de kandidaat gestuurd. Voorkomt dubbele mails via mail_sent timestamps.
 *
 * - voorgesteld_opdrachtgever -> mail "we hebben je voorgesteld" (zonder bedrijfsnaam)
 * - 1e_gesprek                 -> afspraakbevestiging met gespreks-details
 * - 2e_gesprek                 -> succes-mail
 *
 * Mails voor "intake afgerond", "geplaatst" en "afgewezen" worden via aparte
 * flows verstuurd (intake-actions, plaatsing-actions, updateKandidaat).
 */
export async function triggerKanbanMails(opts: {
  kandidaatId: string;
  oudeStap: string | null;
  nieuweStap: string;
  vanUserId: string | null;
}) {
  if (opts.oudeStap === opts.nieuweStap) return;

  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select("voornaam, email, tenant_id, voorgesteld_mail_sent, gesprek1_mail_sent, gesprek2_mail_sent, in_proces_mail_sent")
    .eq("id", opts.kandidaatId)
    .single();
  if (!k?.email || !k.tenant_id) return;

  const setterFrom = await getSetterFrom(opts.vanUserId);

  if (opts.nieuweStap === "in_proces" && !k.in_proces_mail_sent) {
    try {
      await sendInProcesGestart({
        naar: k.email,
        kandidaatVoornaam: k.voornaam ?? "",
        from: setterFrom,
      });
      await admin.from("kandidaten")
        .update({ in_proces_mail_sent: new Date().toISOString() })
        .eq("id", opts.kandidaatId);
      await logVoorstelEvent({
        tenantId: k.tenant_id,
        kandidaatId: opts.kandidaatId,
        event: "voorstel_verstuurd",
        beschrijving: "Setter is gestart met zoeken (mail naar kandidaat verstuurd)",
        zichtbaarVoorKandidaat: true,
      });
    } catch (e) {
      console.error("Mail in_proces mislukt:", e);
    }
  }

  if (opts.nieuweStap === "voorgesteld_opdrachtgever" && !k.voorgesteld_mail_sent) {
    try {
      await sendKandidaatVoorgesteld({
        naar: k.email,
        kandidaatVoornaam: k.voornaam ?? "",
        from: setterFrom,
      });
      await admin.from("kandidaten")
        .update({ voorgesteld_mail_sent: new Date().toISOString() })
        .eq("id", opts.kandidaatId);
      await logVoorstelEvent({
        tenantId: k.tenant_id,
        kandidaatId: opts.kandidaatId,
        event: "voorstel_verstuurd",
        beschrijving: "Kandidaat geïnformeerd over voorstelling (kanban)",
        zichtbaarVoorKandidaat: true,
      });
    } catch (e) {
      console.error("Mail voorgesteld_opdrachtgever mislukt:", e);
    }
  }

  if (opts.nieuweStap === "1e_gesprek" && !k.gesprek1_mail_sent) {
    // Haal afspraak-details uit recentste uitnodig-voorstel
    const { data: voorstel } = await admin
      .from("voorstellen")
      .select("bedrijf, opdrachtgever_naam, kennismaking_op, contactpersoon, contact_telefoon, locatie_url")
      .eq("kandidaat_id", opts.kandidaatId)
      .eq("status", "uitnodigen")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    try {
      await sendGesprek1Bevestiging({
        naar: k.email,
        kandidaatVoornaam: k.voornaam ?? "",
        bedrijf: voorstel?.bedrijf ?? voorstel?.opdrachtgever_naam ?? null,
        kennismaking_op: voorstel?.kennismaking_op ?? null,
        contactpersoon: voorstel?.contactpersoon ?? null,
        contact_telefoon: voorstel?.contact_telefoon ?? null,
        locatie_url: voorstel?.locatie_url ?? null,
        from: setterFrom,
      });
      await admin.from("kandidaten")
        .update({ gesprek1_mail_sent: new Date().toISOString() })
        .eq("id", opts.kandidaatId);
      await logVoorstelEvent({
        tenantId: k.tenant_id,
        kandidaatId: opts.kandidaatId,
        event: "kennismaking_gepland",
        beschrijving: "Bevestiging 1e gesprek verstuurd",
        zichtbaarVoorKandidaat: true,
      });
    } catch (e) {
      console.error("Mail 1e_gesprek mislukt:", e);
    }
  }

  if (opts.nieuweStap === "2e_gesprek" && !k.gesprek2_mail_sent) {
    const { data: voorstel } = await admin
      .from("voorstellen")
      .select("bedrijf, opdrachtgever_naam")
      .eq("kandidaat_id", opts.kandidaatId)
      .eq("status", "uitnodigen")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    try {
      await sendGesprek2Succes({
        naar: k.email,
        kandidaatVoornaam: k.voornaam ?? "",
        bedrijf: voorstel?.bedrijf ?? voorstel?.opdrachtgever_naam ?? null,
        from: setterFrom,
      });
      await admin.from("kandidaten")
        .update({ gesprek2_mail_sent: new Date().toISOString() })
        .eq("id", opts.kandidaatId);
    } catch (e) {
      console.error("Mail 2e_gesprek mislukt:", e);
    }
  }
}
