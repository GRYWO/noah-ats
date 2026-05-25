"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { autoWijsKandidaatToe } from "@/utils/setter-assign";
import { sendKandidaatPlaatsing, sendKandidaatStatusAfwijzing } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";
import { logVoorstelEvent } from "@/utils/voorstel-log";

// Stages waarbij de intake klaar is en de kandidaat naar een setter moet
const INTAKE_KLAAR_STAGES = ["interne_intake_voltooid", "voorgesteld_opdrachtgever"];

export async function updateKandidaat(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const update = {
    voornaam:      (formData.get("voornaam") as string)?.trim(),
    tussenvoegsel: (formData.get("tussenvoegsel") as string)?.trim() || null,
    achternaam:    (formData.get("achternaam") as string)?.trim(),
    email:         (formData.get("email") as string)?.trim() || null,
    telefoon:      (formData.get("telefoon") as string)?.trim() || null,
    geslacht:      (formData.get("geslacht") as string)?.trim() || null,
    leeftijd:      formData.get("leeftijd") ? parseInt(formData.get("leeftijd") as string) : null,
    woonplaats:    (formData.get("woonplaats") as string)?.trim() || null,
    opleiding:     (formData.get("opleiding") as string)?.trim() || null,
    open_voor:     (formData.get("open_voor") as string)?.trim() || null,
    tarief_ws:     (formData.get("tarief_ws") as string)?.trim() || null,
    rijbewijs:     (formData.get("rijbewijs") as string)?.trim() || null,
    eigen_vervoer: formData.get("eigen_vervoer") === "on",
    status:        (formData.get("status") as string)?.trim() || "nieuw",
    kanban_stap:   (formData.get("kanban_stap") as string)?.trim() || "nieuwe_sollicitatie",
    score:         formData.get("score") ? parseInt(formData.get("score") as string) : null,
    notitie:       (formData.get("notitie") as string)?.trim() || null,
  };

  // Huidige status ophalen om wijziging te detecteren
  const { data: huidig } = await supabase
    .from("kandidaten")
    .select("status, tenant_id, plaatsing_mail_sent, afwijzing_mail_sent, email, voornaam")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("kandidaten")
    .update(update)
    .eq("id", id);

  if (error) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent(error.message)}`);
  }

  // Auto-toewijzen aan setter als intake klaar is en nog geen eigenaar
  if (INTAKE_KLAAR_STAGES.includes(update.kanban_stap)) {
    await autoWijsKandidaatToe(id);
  }

  // Plaatsing/afwijzing detecteren (alleen bij eerste keer)
  const admin = createAdminClient();
  const setterFrom = await getSetterFrom(user?.id);
  if (
    huidig?.tenant_id &&
    huidig.email &&
    update.status === "geplaatst" &&
    huidig.status !== "geplaatst" &&
    !huidig.plaatsing_mail_sent
  ) {
    try {
      await sendKandidaatPlaatsing({ naar: huidig.email, kandidaatVoornaam: huidig.voornaam ?? "", from: setterFrom });
      await admin.from("kandidaten").update({ plaatsing_mail_sent: new Date().toISOString() }).eq("id", id);
      await logVoorstelEvent({
        tenantId: huidig.tenant_id,
        kandidaatId: id,
        event: "plaatsing",
        beschrijving: "Kandidaat is geplaatst",
        zichtbaarVoorKandidaat: true,
      });
    } catch (e) {
      console.error("Plaatsings-mail mislukt:", e);
    }
  }

  if (
    huidig?.tenant_id &&
    huidig.email &&
    update.status === "afgewezen" &&
    huidig.status !== "afgewezen" &&
    !huidig.afwijzing_mail_sent
  ) {
    try {
      await sendKandidaatStatusAfwijzing({ naar: huidig.email, kandidaatVoornaam: huidig.voornaam ?? "", from: setterFrom });
      await admin.from("kandidaten").update({ afwijzing_mail_sent: new Date().toISOString() }).eq("id", id);
      await logVoorstelEvent({
        tenantId: huidig.tenant_id,
        kandidaatId: id,
        event: "afwijzing",
        beschrijving: "Kandidaat is afgewezen",
        zichtbaarVoorKandidaat: true,
      });
    } catch (e) {
      console.error("Afwijzings-mail mislukt:", e);
    }
  }

  // Bij overgang naar "geplaatst": open de plaatsing-modal automatisch
  // zodat setter direct de deal-details invult voor backoffice.
  const wordtGeplaatst = update.status === "geplaatst" && huidig?.status !== "geplaatst";
  let bestaandePlaatsing = false;
  if (wordtGeplaatst) {
    const { count } = await admin
      .from("plaatsingen")
      .select("id", { count: "exact", head: true })
      .eq("kandidaat_id", id);
    bestaandePlaatsing = (count ?? 0) > 0;
  }

  revalidatePath(`/kandidaten/${id}`);
  revalidatePath(`/kandidaten`);
  redirect(
    wordtGeplaatst && !bestaandePlaatsing
      ? `/kandidaten/${id}?ok=1&plaatsing=open`
      : `/kandidaten/${id}?ok=1`
  );
}

export async function deleteKandidaat(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from("kandidaten")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/kandidaten");
  redirect("/kandidaten");
}
