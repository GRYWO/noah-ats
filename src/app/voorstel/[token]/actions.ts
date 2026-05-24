"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendKandidaatBevestiging } from "@/utils/email";

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
    opmerking,
  }).eq("token", token);

  if (error) {
    redirect(`/voorstel/${token}?error=${encodeURIComponent(error.message)}`);
  }

  // Mail naar kandidaat sturen
  const { data: voorstel } = await admin
    .from("voorstellen")
    .select("*, kandidaat:kandidaten(voornaam, email)")
    .eq("token", token)
    .single();

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
      });
    } catch (e) {
      console.error("Bevestiging naar kandidaat mislukt:", e);
    }
  }

  revalidatePath(`/voorstel/${token}`);
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

  revalidatePath(`/voorstel/${token}`);
  redirect(`/voorstel/${token}/bedankt`);
}
