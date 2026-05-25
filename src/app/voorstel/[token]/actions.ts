"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendKandidaatBevestiging, sendKandidaatAfwijzing } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";
import { logVoorstelEvent } from "@/utils/voorstel-log";
import { maakNotificatie, notifyTeam } from "@/utils/notificaties";

export async function uitnodigen(formData: FormData) {
  const token = formData.get("token") as string;
  const bedrijf         = (formData.get("bedrijf") as string)?.trim();
  const contactpersoon  = (formData.get("contactpersoon") as string)?.trim();
  const contact_telefoon = (formData.get("contact_telefoon") as string)?.trim();
  const contact_email   = (formData.get("contact_email") as string)?.trim();
  const locatie_url     = (formData.get("locatie_url") as string)?.trim();
  const datum_1         = formData.get("datum_1") as string;
  const datum_2         = formData.get("datum_2") as string;
  const datum_3         = formData.get("datum_3") as string;
  const opmerking       = (formData.get("opmerking") as string)?.trim() || null;

  const admin = createAdminClient();

  const datum_1_iso = datum_1 ? new Date(datum_1).toISOString() : null;
  const datum_2_iso = datum_2 ? new Date(datum_2).toISOString() : null;
  const datum_3_iso = datum_3 ? new Date(datum_3).toISOString() : null;

  // Eerste datum = voorlopige kennismakings-datum (setter kan later aanpassen)
  const kennismakingOp = datum_1_iso ?? datum_2_iso ?? datum_3_iso;

  const { error } = await admin.from("voorstellen").update({
    status: "uitnodigen",
    reactie_op: new Date().toISOString(),
    bedrijf,
    contactpersoon,
    contact_telefoon,
    contact_email,
    locatie_url,
    datum_1: datum_1_iso,
    datum_2: datum_2_iso,
    datum_3: datum_3_iso,
    kennismaking_op: kennismakingOp,
    opmerking,
  }).eq("token", token);

  if (error) {
    redirect(`/voorstel/${token}?error=${encodeURIComponent(error.message)}`);
  }

  // Voorstel ophalen voor tenant_id + kandidaat
  const { data: voorstel } = await admin
    .from("voorstellen")
    .select("*, kandidaat:kandidaten(voornaam, email)")
    .eq("token", token)
    .single();

  // Auto-koppel naar CRM: maak/update relatie + contactpersoon
  if (voorstel?.tenant_id && bedrijf) {
    try {
      // Bestaat de relatie al? (op naam binnen tenant)
      const { data: bestaand } = await admin
        .from("opdrachtgevers")
        .select("id, status")
        .eq("tenant_id", voorstel.tenant_id)
        .ilike("naam", bedrijf)
        .maybeSingle();

      let relatieId: string;
      if (bestaand) {
        relatieId = bestaand.id;
        // Status upgraden: lead → prospect → klant (laat klant en partner met rust)
        if (bestaand.status === "lead" || bestaand.status === "ex_klant") {
          await admin.from("opdrachtgevers").update({
            status: "prospect",
            laatste_contact: new Date().toISOString(),
          }).eq("id", relatieId);
        } else {
          await admin.from("opdrachtgevers").update({
            laatste_contact: new Date().toISOString(),
          }).eq("id", relatieId);
        }
      } else {
        // Nieuwe relatie aanmaken
        const { data: nieuw } = await admin.from("opdrachtgevers").insert({
          tenant_id: voorstel.tenant_id,
          naam: bedrijf,
          status: "prospect",
          laatste_contact: new Date().toISOString(),
          eigenaar_id: voorstel.setter_id,
        }).select("id").single();
        if (nieuw) relatieId = nieuw.id;
        else relatieId = "";
      }

      // Contactpersoon: check op email + opdrachtgever_id
      if (relatieId && contactpersoon) {
        const naamDelen = contactpersoon.split(" ");
        const voornaam = naamDelen[0];
        const achternaam = naamDelen.slice(1).join(" ") || "?";

        // Bestaat contact al?
        const { data: bestaandContact } = await admin
          .from("contactpersonen")
          .select("id")
          .eq("opdrachtgever_id", relatieId)
          .eq("email", contact_email)
          .maybeSingle();

        if (!bestaandContact) {
          await admin.from("contactpersonen").insert({
            opdrachtgever_id: relatieId,
            tenant_id: voorstel.tenant_id,
            voornaam,
            achternaam,
            email: contact_email,
            telefoon: contact_telefoon,
            primair: true,
          });
        }
      }
    } catch (e) {
      console.error("CRM-koppeling mislukt:", e);
    }
  }

  // Log: groen
  if (voorstel?.tenant_id && voorstel.kandidaat_id) {
    await logVoorstelEvent({
      tenantId: voorstel.tenant_id,
      voorstelId: voorstel.id,
      kandidaatId: voorstel.kandidaat_id,
      event: "voorstel_groen",
      beschrijving: `Opdrachtgever ${bedrijf} wil kennismaken`,
      zichtbaarVoorKandidaat: true,
      metadata: { bedrijf, contactpersoon, datum_1: datum_1_iso, datum_2: datum_2_iso, datum_3: datum_3_iso },
    });
    if (kennismakingOp) {
      await logVoorstelEvent({
        tenantId: voorstel.tenant_id,
        voorstelId: voorstel.id,
        kandidaatId: voorstel.kandidaat_id,
        event: "kennismaking_gepland",
        beschrijving: `Kennismaking gepland: ${new Date(kennismakingOp).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}`,
        zichtbaarVoorKandidaat: true,
      });
    }

    // Notificatie naar setter + team
    const titel = `🟢 ${bedrijf} wil kennismaken`;
    const bericht = `Voorstel groen — kennismaking ${kennismakingOp ? `op ${new Date(kennismakingOp).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}` : "gepland"}.`;
    const link = `/kandidaten/${voorstel.kandidaat_id}`;
    if (voorstel.setter_id) {
      await maakNotificatie({
        tenantId: voorstel.tenant_id,
        userId: voorstel.setter_id,
        type: "voorstel_groen",
        titel, bericht, linkUrl: link, kandidaatId: voorstel.kandidaat_id,
      });
    }
    await notifyTeam({
      tenantId: voorstel.tenant_id,
      vanUserId: voorstel.setter_id,
      type: "voorstel_groen",
      titel, bericht, linkUrl: link, kandidaatId: voorstel.kandidaat_id,
    });
  }

  // Mail naar kandidaat sturen — vanaf de setter
  const setterFrom = await getSetterFrom(voorstel?.setter_id);
  if (voorstel?.kandidaat?.email) {
    try {
      await sendKandidaatBevestiging({
        naar: voorstel.kandidaat.email,
        kandidaatVoornaam: voorstel.kandidaat.voornaam,
        bedrijf,
        contactpersoon,
        contact_telefoon,
        contact_email,
        locatie_url,
        datum_1: datum_1_iso,
        datum_2: datum_2_iso,
        datum_3: datum_3_iso,
        opmerking,
        from: setterFrom,
      });
      await admin.from("voorstellen")
        .update({ kandidaat_uitnodigen_sent: new Date().toISOString() })
        .eq("id", voorstel.id);
    } catch (e) {
      console.error("Bevestiging naar kandidaat mislukt:", e);
    }
  }

  revalidatePath(`/voorstel/${token}`);
  revalidatePath("/opdrachtgevers");
  redirect(`/voorstel/${token}/bedankt`);
}

export async function afwijzen(formData: FormData) {
  const token = formData.get("token") as string;
  const reden = (formData.get("reden") as string)?.trim() || null;

  const admin = createAdminClient();
  const { error } = await admin.from("voorstellen").update({
    status: "niet_uitnodigen",
    reactie_op: new Date().toISOString(),
    opmerking: reden,
  }).eq("token", token);

  if (error) {
    redirect(`/voorstel/${token}?error=${encodeURIComponent(error.message)}`);
  }

  // Voorstel + kandidaat ophalen voor log + mail
  const { data: voorstel } = await admin
    .from("voorstellen")
    .select("id, tenant_id, kandidaat_id, setter_id, kandidaat:kandidaten(voornaam, email)")
    .eq("token", token)
    .single();

  if (voorstel?.tenant_id && voorstel.kandidaat_id) {
    await logVoorstelEvent({
      tenantId: voorstel.tenant_id,
      voorstelId: voorstel.id,
      kandidaatId: voorstel.kandidaat_id,
      event: "voorstel_rood",
      beschrijving: "Opdrachtgever heeft het voorstel afgewezen",
      zichtbaarVoorKandidaat: true,
      metadata: { reden },
    });

    // Notificatie naar setter + team
    const titel = `🔴 Voorstel afgewezen`;
    const bericht = reden ? `Reden: ${reden}` : "Opdrachtgever wil niet verder met de kandidaat.";
    const link = `/kandidaten/${voorstel.kandidaat_id}`;
    if (voorstel.setter_id) {
      await maakNotificatie({
        tenantId: voorstel.tenant_id,
        userId: voorstel.setter_id,
        type: "voorstel_rood",
        titel, bericht, linkUrl: link, kandidaatId: voorstel.kandidaat_id,
      });
    }
    await notifyTeam({
      tenantId: voorstel.tenant_id,
      vanUserId: voorstel.setter_id,
      type: "voorstel_rood",
      titel, bericht, linkUrl: link, kandidaatId: voorstel.kandidaat_id,
    });
  }

  const kandidaat = voorstel?.kandidaat as unknown as { voornaam: string; email: string | null } | null;
  const afwSetterFrom = await getSetterFrom(voorstel?.setter_id);
  if (kandidaat?.email) {
    try {
      await sendKandidaatAfwijzing({
        naar: kandidaat.email,
        kandidaatVoornaam: kandidaat.voornaam,
        from: afwSetterFrom,
      });
      await admin.from("voorstellen")
        .update({ kandidaat_afwijzing_sent: new Date().toISOString() })
        .eq("id", voorstel!.id);
    } catch (e) {
      console.error("Afwijzingsmail naar kandidaat mislukt:", e);
    }
  }

  revalidatePath(`/voorstel/${token}`);
  redirect(`/voorstel/${token}/bedankt`);
}
