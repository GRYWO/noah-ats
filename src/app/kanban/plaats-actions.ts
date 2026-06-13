"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  sendPlaatsingNaarBackoffice,
  sendContractControleUitnodiging,
} from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";
import { logVoorstelEvent } from "@/utils/voorstel-log";
import { notifyTeam } from "@/utils/notificaties";

const TOEGESTANE_FACTOREN = new Set(["2.3", "2.4", "2.5"]);
const TOEGESTANE_PCT = new Set(["15", "16", "17"]);

/**
 * Plaats kandidaat via de kanban-modal.
 * Setter sleept kandidaat naar "Geplaatst" → modal opent → setter vult in →
 * Deze action:
 *  1. Maakt plaatsings-record
 *  2. Verstuurt mail naar backoffice@noah-recruitment.nl met alle plaatsings-info
 *  3. Verstuurt automatisch contract-controle uitnodiging naar opdrachtgever
 *  4. Zet kandidaat-status op "geplaatst"
 */
export async function plaatsViaKanban(input: {
  kandidaatId: string;
  bedrijf: string;
  contactpersoon: string;
  contactEmail: string;
  contactTelefoon: string;
  basis: "uitzend" | "werving_selectie";
  tarief: string; // "15" / "16" / "17" voor W&S, of "2.3" / "2.4" / "2.5" voor uitzend
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  if (!input.kandidaatId) return { ok: false, error: "Geen kandidaat" };
  if (!input.bedrijf.trim()) return { ok: false, error: "Bedrijfsnaam verplicht" };
  if (!input.contactpersoon.trim()) return { ok: false, error: "Contactpersoon verplicht" };
  if (!input.contactEmail.trim()) return { ok: false, error: "E-mail verplicht" };
  if (input.basis !== "uitzend" && input.basis !== "werving_selectie") {
    return { ok: false, error: "Ongeldige basis" };
  }
  if (input.basis === "uitzend" && !TOEGESTANE_FACTOREN.has(input.tarief)) {
    return { ok: false, error: "Ongeldige factor" };
  }
  if (input.basis === "werving_selectie" && !TOEGESTANE_PCT.has(input.tarief)) {
    return { ok: false, error: "Ongeldig percentage" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, voornaam, achternaam")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return { ok: false, error: "Geen tenant" };

  const admin = createAdminClient();
  const { data: kandidaat } = await admin
    .from("kandidaten")
    .select("voornaam, tussenvoegsel, achternaam, email, telefoon, woonplaats")
    .eq("id", input.kandidaatId)
    .single();
  if (!kandidaat) return { ok: false, error: "Kandidaat niet gevonden" };

  const kandidaatNaam = `${kandidaat.voornaam}${kandidaat.tussenvoegsel ? " " + kandidaat.tussenvoegsel : ""} ${kandidaat.achternaam}`.trim();

  const tarief_factor = input.basis === "uitzend" ? parseFloat(input.tarief) : null;
  const tarief_pct = input.basis === "werving_selectie" ? parseFloat(input.tarief) : null;

  // 1) Plaatsing opslaan
  const { data: plaatsing, error: plErr } = await admin
    .from("plaatsingen")
    .insert({
      tenant_id: profile.tenant_id,
      kandidaat_id: input.kandidaatId,
      basis: input.basis,
      tarief_factor,
      tarief_pct,
      betaling: "1x_7d", // default
      bedrijf: input.bedrijf,
      contactpersoon: input.contactpersoon,
      contact_email: input.contactEmail,
      contact_telefoon: input.contactTelefoon || null,
      startdatum: new Date().toISOString().slice(0, 10),
      aangemeld_door: user.id,
    })
    .select("id")
    .single();
  if (plErr || !plaatsing) {
    return { ok: false, error: plErr?.message ?? "Plaatsing opslaan mislukt" };
  }

  // 2) Kandidaat-status updaten
  await admin
    .from("kandidaten")
    .update({ status: "geplaatst", kanban_stap: "geplaatst" })
    .eq("id", input.kandidaatId);

  // 3) Mail naar backoffice@noah-recruitment.nl
  const setterFrom = await getSetterFrom(user.id);
  let backofficeMailFout: string | null = null;
  try {
    await sendPlaatsingNaarBackoffice({
      kandidaat,
      klant: {
        bedrijf: input.bedrijf,
        contactpersoon: input.contactpersoon,
        contact_email: input.contactEmail,
        contact_telefoon: input.contactTelefoon || null,
      },
      deal: {
        basis: input.basis,
        tarief_factor,
        tarief_pct,
        tarief_bedrag: null,
        betaling: "1x_7d",
        startdatum: new Date().toISOString().slice(0, 10),
        opmerking: null,
      },
      aangemeldDoor: {
        voornaam: profile.voornaam ?? "",
        achternaam: profile.achternaam ?? "",
        email: user.email ?? "",
      },
      from: setterFrom,
    });
    await admin
      .from("plaatsingen")
      .update({ backoffice_mail_sent: new Date().toISOString() })
      .eq("id", plaatsing.id);
  } catch (e) {
    console.error("[plaats-kanban] backoffice-mail mislukt:", e);
    backofficeMailFout = (e as Error).message;
  }

  // 4) Contract-controle verzoek aanmaken + uitnodiging mailen naar opdrachtgever
  //    (alleen relevant voor werving_selectie — bij uitzend factureren we per uur)
  let contractMailFout: string | null = null;
  if (input.basis === "werving_selectie") {
    try {
      const token = randomBytes(24).toString("hex");
      await admin.from("contract_verzoeken").insert({
        plaatsing_id: plaatsing.id,
        tenant_id: profile.tenant_id,
        token,
        status: "verzonden",
        opdrachtgever_naam: input.contactpersoon || input.bedrijf,
        opdrachtgever_email: input.contactEmail,
        kandidaat_naam: kandidaatNaam,
      });
      await sendContractControleUitnodiging({
        naar: input.contactEmail,
        contactNaam: input.contactpersoon,
        kandidaatNaam,
        token,
      });
    } catch (e) {
      console.error("[plaats-kanban] contract-controle mail mislukt:", e);
      contractMailFout = (e as Error).message;
    }
  }

  // 5) In-app notificatie + audit log
  try {
    await notifyTeam({
      tenantId: profile.tenant_id,
      vanUserId: user.id,
      type: "plaatsing",
      titel: `Plaatsing: ${kandidaatNaam} bij ${input.bedrijf}`,
      bericht: `${input.basis === "uitzend" ? `Factor ${tarief_factor}` : `${tarief_pct}% W&S-fee`}`,
      linkUrl: `/kandidaten/${input.kandidaatId}`,
      kandidaatId: input.kandidaatId,
    });
    await logVoorstelEvent({
      tenantId: profile.tenant_id,
      kandidaatId: input.kandidaatId,
      event: "plaatsing",
      beschrijving: `Plaatsing bij ${input.bedrijf} via kanban (${input.basis === "uitzend" ? `factor ${tarief_factor}` : `${tarief_pct}%`}). Contract-verificatie verzoek verstuurd naar ${input.contactEmail}.`,
      zichtbaarVoorKandidaat: false,
    });
  } catch (e) {
    console.error("[plaats-kanban] notificatie mislukt:", e);
  }

  revalidatePath("/kanban");
  revalidatePath("/kandidaten");
  revalidatePath(`/kandidaten/${input.kandidaatId}`);

  const fout = [backofficeMailFout, contractMailFout].filter(Boolean).join(" · ");
  if (fout) {
    return { ok: true, error: `Plaatsing opgeslagen — mail-issue: ${fout}` };
  }
  return { ok: true };
}

/**
 * Haalt voorgestelde voorstellen voor een kandidaat op om de modal voor te vullen.
 */
export async function getVoorstellenVoorKandidaat(kandidaatId: string): Promise<
  Array<{
    id: string;
    bedrijf: string | null;
    opdrachtgever_naam: string | null;
    contactpersoon: string | null;
    contact_email: string | null;
    opdrachtgever_email: string | null;
    contact_telefoon: string | null;
    created_at: string;
  }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("voorstellen")
    .select("id, bedrijf, opdrachtgever_naam, contactpersoon, contact_email, opdrachtgever_email, contact_telefoon, created_at")
    .eq("kandidaat_id", kandidaatId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
