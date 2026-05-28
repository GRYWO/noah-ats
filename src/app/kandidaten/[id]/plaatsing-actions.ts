"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendPlaatsingNaarBackoffice, sendPlaatsingAfgekeurdNaarBackoffice } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";
import { logVoorstelEvent } from "@/utils/voorstel-log";
import { notifyTeam } from "@/utils/notificaties";

const TOEGESTANE_FACTOREN = new Set(["2.3", "2.4", "2.5"]);
const TOEGESTANE_PCT      = new Set(["15", "16", "17"]);
const TOEGESTANE_BETALING = new Set(["1x_7d", "50_50_7d_30d"]);

export async function meldPlaatsing(formData: FormData) {
  const kandidaatId = formData.get("kandidaat_id") as string;
  const voorstelId  = (formData.get("voorstel_id") as string)?.trim() || null;
  const basis       = (formData.get("basis") as string)?.trim();
  const tariefRaw   = (formData.get("tarief") as string)?.trim();
  const betaling    = (formData.get("betaling") as string)?.trim();
  const bedrijf     = (formData.get("bedrijf") as string)?.trim();
  const contactpersoon  = (formData.get("contactpersoon") as string)?.trim() || null;
  const contact_email   = (formData.get("contact_email") as string)?.trim() || null;
  const contact_telefoon= (formData.get("contact_telefoon") as string)?.trim() || null;
  const opmerking       = (formData.get("opmerking") as string)?.trim() || null;
  const startdatum      = (formData.get("startdatum") as string)?.trim() || null;
  const tariefBedragRaw = (formData.get("tarief_bedrag") as string)?.trim();
  const tarief_bedrag   = tariefBedragRaw ? parseFloat(tariefBedragRaw) : null;

  if (!kandidaatId) redirect("/kandidaten");
  if (!startdatum) {
    redirect(`/kandidaten/${kandidaatId}?error=Startdatum+verplicht`);
  }
  if (basis !== "uitzend" && basis !== "werving_selectie") {
    redirect(`/kandidaten/${kandidaatId}?error=Ongeldige+basis`);
  }
  if (!TOEGESTANE_BETALING.has(betaling)) {
    redirect(`/kandidaten/${kandidaatId}?error=Ongeldige+betaling`);
  }
  if (!bedrijf) {
    redirect(`/kandidaten/${kandidaatId}?error=Bedrijfsnaam+verplicht`);
  }

  let tarief_factor: number | null = null;
  let tarief_pct: number | null = null;
  if (basis === "uitzend") {
    if (!TOEGESTANE_FACTOREN.has(tariefRaw)) {
      redirect(`/kandidaten/${kandidaatId}?error=Ongeldige+factor`);
    }
    tarief_factor = parseFloat(tariefRaw);
  } else {
    if (!TOEGESTANE_PCT.has(tariefRaw)) {
      redirect(`/kandidaten/${kandidaatId}?error=Ongeldig+percentage`);
    }
    tarief_pct = parseFloat(tariefRaw);
    if (tarief_bedrag == null || isNaN(tarief_bedrag) || tarief_bedrag <= 0) {
      redirect(`/kandidaten/${kandidaatId}?error=Fee-bedrag+verplicht`);
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, voornaam, achternaam")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) redirect(`/kandidaten/${kandidaatId}?error=Geen+tenant`);

  const admin = createAdminClient();
  const { data: kandidaat } = await admin
    .from("kandidaten")
    .select("voornaam, tussenvoegsel, achternaam, email, telefoon, woonplaats")
    .eq("id", kandidaatId)
    .single();
  if (!kandidaat) redirect(`/kandidaten/${kandidaatId}?error=Kandidaat+niet+gevonden`);

  // Opslaan plaatsing
  const { data: plaatsing, error } = await admin
    .from("plaatsingen")
    .insert({
      tenant_id: profile.tenant_id,
      kandidaat_id: kandidaatId,
      voorstel_id: voorstelId,
      basis,
      tarief_factor,
      tarief_pct,
      tarief_bedrag,
      betaling,
      bedrijf,
      contactpersoon,
      contact_email,
      contact_telefoon,
      opmerking,
      startdatum,
      aangemeld_door: user.id,
    })
    .select("id")
    .single();
  if (error || !plaatsing) {
    redirect(`/kandidaten/${kandidaatId}?error=${encodeURIComponent(error?.message ?? "Opslaan mislukt")}`);
  }

  // Status kandidaat op geplaatst
  await admin.from("kandidaten").update({
    status: "geplaatst",
    kanban_stap: "geplaatst",
  }).eq("id", kandidaatId);

  // Backoffice-mail — vanuit aanmelder's mail-adres zodat from-domein klopt
  const setterFrom = await getSetterFrom(user.id);
  let mailFout: string | null = null;
  try {
    await sendPlaatsingNaarBackoffice({
      kandidaat,
      klant: { bedrijf, contactpersoon, contact_email, contact_telefoon },
      deal: { basis: basis as "uitzend" | "werving_selectie", tarief_factor, tarief_pct, tarief_bedrag, betaling: betaling as "1x_7d" | "50_50_7d_30d", startdatum, opmerking },
      aangemeldDoor: {
        voornaam: profile.voornaam ?? "",
        achternaam: profile.achternaam ?? "",
        email: user.email ?? "",
      },
      from: setterFrom,
    });
    await admin.from("plaatsingen")
      .update({ backoffice_mail_sent: new Date().toISOString() })
      .eq("id", plaatsing.id);
  } catch (e) {
    console.error("Backoffice-mail plaatsing mislukt:", e);
    mailFout = (e as Error).message;
  }

  // In-app notificatie naar admins als back-up zodat de info niet verloren gaat
  // wanneer Resend faalt of de mail in spam belandt
  try {
    await notifyTeam({
      tenantId: profile.tenant_id,
      vanUserId: user.id,
      type: "plaatsing",
      titel: `Plaatsing: ${kandidaat.voornaam} ${kandidaat.achternaam} bij ${bedrijf}`,
      bericht: `${basis === "uitzend" ? `Factor ${tarief_factor}` : `${tarief_pct}%`} · ${betaling === "1x_7d" ? "100% binnen 7 dagen" : "50/50 7d/30d"}${mailFout ? `\n\nLet op: backoffice-mail mislukte (${mailFout})` : ""}`,
      linkUrl: `/kandidaten/${kandidaatId}`,
      kandidaatId,
    });
  } catch (e) {
    console.error("Plaatsings-notificatie mislukt:", e);
  }

  await logVoorstelEvent({
    tenantId: profile.tenant_id,
    kandidaatId,
    voorstelId: voorstelId ?? undefined,
    event: "plaatsing",
    beschrijving: `Plaatsing bij ${bedrijf} (${basis === "uitzend" ? `factor ${tarief_factor}` : `${tarief_pct}%`})`,
    zichtbaarVoorKandidaat: false,
  });


  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/kandidaten");
  redirect(
    mailFout
      ? `/kandidaten/${kandidaatId}?ok=plaatsing&error=${encodeURIComponent("Plaatsing opgeslagen, maar mail naar backoffice mislukte: " + mailFout)}`
      : `/kandidaten/${kandidaatId}?ok=plaatsing`
  );
}

export async function keurAfPlaatsing(formData: FormData) {
  const plaatsingId = formData.get("plaatsing_id") as string;
  const kandidaatId = formData.get("kandidaat_id") as string;
  const reden = (formData.get("reden") as string)?.trim();
  if (!plaatsingId || !kandidaatId) redirect("/kandidaten");
  if (!reden) {
    redirect(`/kandidaten/${kandidaatId}?error=Reden+voor+afkeur+verplicht`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol, voornaam, achternaam")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) redirect(`/kandidaten/${kandidaatId}?error=Geen+tenant`);
  if (profile.rol !== "admin") {
    redirect(`/kandidaten/${kandidaatId}?error=Alleen+admin+mag+plaatsing+afkeuren`);
  }

  const admin = createAdminClient();

  // Check + ophalen voor mail
  const { data: bestaand } = await admin
    .from("plaatsingen")
    .select("tenant_id, bedrijf, aangemeld_door")
    .eq("id", plaatsingId)
    .single();
  if (!bestaand || bestaand.tenant_id !== profile.tenant_id) {
    redirect(`/kandidaten/${kandidaatId}?error=Plaatsing+niet+gevonden`);
  }

  // Markeer als afgekeurd (geen delete — behoud audit-trail)
  await admin.from("plaatsingen").update({
    afgekeurd_op:   new Date().toISOString(),
    afgekeurd_door: user.id,
    afkeur_reden:   reden,
  }).eq("id", plaatsingId);

  // Reset kandidaat-status
  await admin.from("kandidaten").update({
    status: "in_proces",
    kanban_stap: "1e_gesprek",
    plaatsing_mail_sent: null,
  }).eq("id", kandidaatId);

  // Kandidaat ophalen voor naam
  const { data: kandidaat } = await admin
    .from("kandidaten")
    .select("voornaam, tussenvoegsel, achternaam")
    .eq("id", kandidaatId)
    .single();
  const kandidaatNaam = `${kandidaat?.voornaam ?? ""} ${kandidaat?.tussenvoegsel ? kandidaat.tussenvoegsel + " " : ""}${kandidaat?.achternaam ?? ""}`.trim();

  // Oorspronkelijke aanmelder voor extra context in mail
  let oorspronkelijkeAanmelder: { voornaam: string; achternaam: string } | null = null;
  if (bestaand.aangemeld_door) {
    const { data: aanmelder } = await admin
      .from("profiles")
      .select("voornaam, achternaam")
      .eq("id", bestaand.aangemeld_door)
      .single();
    if (aanmelder) {
      oorspronkelijkeAanmelder = {
        voornaam: aanmelder.voornaam ?? "",
        achternaam: aanmelder.achternaam ?? "",
      };
    }
  }

  const setterFrom = await getSetterFrom(user.id);
  let mailFout: string | null = null;
  try {
    await sendPlaatsingAfgekeurdNaarBackoffice({
      kandidaatNaam,
      bedrijf: bestaand.bedrijf ?? "—",
      reden,
      afgekeurdDoor: {
        voornaam: profile.voornaam ?? "",
        achternaam: profile.achternaam ?? "",
        email: user.email ?? "",
      },
      oorspronkelijkeAanmelder,
      from: setterFrom,
    });
  } catch (e) {
    console.error("Mail plaatsing-afkeur mislukt:", e);
    mailFout = (e as Error).message;
  }

  // Backup: notificatie naar team
  try {
    await notifyTeam({
      tenantId: profile.tenant_id,
      vanUserId: user.id,
      type: "plaatsing",
      titel: `Plaatsing afgekeurd: ${kandidaatNaam}`,
      bericht: `Reden: ${reden}${mailFout ? `\n\nLet op: backoffice-mail mislukte (${mailFout})` : ""}`,
      linkUrl: `/kandidaten/${kandidaatId}`,
      kandidaatId,
    });
  } catch (e) {
    console.error("Afkeur-notificatie mislukt:", e);
  }

  await logVoorstelEvent({
    tenantId: profile.tenant_id,
    kandidaatId,
    event: "plaatsing_ongedaan",
    beschrijving: `Plaatsing afgekeurd door ${profile.voornaam ?? ""} ${profile.achternaam ?? ""}: ${reden}`,
    zichtbaarVoorKandidaat: false,
  });

  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/kandidaten");
  redirect(
    mailFout
      ? `/kandidaten/${kandidaatId}?ok=plaatsing_ongedaan&error=${encodeURIComponent("Afgekeurd, maar backoffice-mail mislukte: " + mailFout)}`
      : `/kandidaten/${kandidaatId}?ok=plaatsing_ongedaan`
  );
}
