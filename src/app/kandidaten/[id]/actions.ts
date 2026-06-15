"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { autoWijsKandidaatToe } from "@/utils/setter-assign";
import { sendKandidaatPlaatsing, sendKandidaatStatusAfwijzing } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";
import { logVoorstelEvent } from "@/utils/voorstel-log";
import { triggerKanbanMails } from "@/utils/kanban-mails";

// Stages waarbij de intake klaar is en de kandidaat naar een setter moet
const INTAKE_KLAAR_STAGES = ["in_wachtrij", "bij_setter", "voorgesteld_opdrachtgever"];

export async function updateKandidaat(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Lockdown: setter is read-only op /kandidaten, geen veld-wijzigingen.
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user!.id)
    .single();
  if (viewerProfile?.rol === "setter") {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent("Setters kunnen kandidaten niet bewerken")}`);
  }

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
    uren_per_week: formData.get("uren_per_week") ? parseInt(formData.get("uren_per_week") as string) : null,
    werkvergunning: formData.get("werkvergunning") === "on",
    nederlands_voldoende: formData.get("nederlands_voldoende") === "on",
    status:        (formData.get("status") as string)?.trim() || "nieuw",
    kanban_stap:   (formData.get("kanban_stap") as string)?.trim() || "interne_intake",
    notitie:       (formData.get("notitie") as string)?.trim() || null,
  };

  // Huidige status + kanban_stap ophalen om wijziging te detecteren
  const { data: huidig } = await supabase
    .from("kandidaten")
    .select("status, kanban_stap, tenant_id, plaatsing_mail_sent, afwijzing_mail_sent, email, voornaam")
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

  // Trigger automatische kandidaat-mails bij kanban-stap-wijziging
  await triggerKanbanMails({
    kandidaatId: id,
    oudeStap: huidig?.kanban_stap ?? null,
    nieuweStap: update.kanban_stap,
    vanUserId: user?.id ?? null,
  });

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

  // Check wie er ingelogd is en welk tenant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent("Niet ingelogd")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user!.id)
    .single();

  if (!profile?.tenant_id) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent("Geen tenant gekoppeld")}`);
  }

  // Gebruik admin-client + expliciete tenant-check.
  // (kandidaten-tabel mist DELETE RLS-policy, dus anon delete faalt stilletjes.)
  const admin = createAdminClient();
  const { data: kandidaat } = await admin
    .from("kandidaten")
    .select("tenant_id, eigenaar_id")
    .eq("id", id)
    .single();

  if (!kandidaat) {
    redirect(`/kandidaten?error=${encodeURIComponent("Kandidaat niet gevonden")}`);
  }

  // Setter mag alleen eigen kandidaten verwijderen; admin alle kandidaten in z'n tenant
  if (kandidaat!.tenant_id !== profile!.tenant_id) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent("Geen rechten, andere tenant")}`);
  }
  if (profile!.rol === "setter" && kandidaat!.eigenaar_id !== user!.id) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent("Geen rechten, niet jouw kandidaat")}`);
  }

  const { error } = await admin.from("kandidaten").delete().eq("id", id);
  if (error) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/kandidaten");
  redirect("/kandidaten?ok=verwijderd");
}

/**
 * Wijzig de eigenaar van een kandidaat.
 * Alleen recruiter / admin / super-admin mogen dit.
 * Setters mogen het NIET, hun rol is uitgesloten in de UI én hier.
 */
export async function wijzigEigenaar(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const kandidaatId = formData.get("kandidaat_id") as string;
  const nieuweEigenaarId = (formData.get("eigenaar_id") as string)?.trim() || null;

  if (!kandidaatId) return { error: "Kandidaat ontbreekt" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const admin = createAdminClient();

  // Lees rol van degene die de actie uitvoert
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();

  if (!viewerProfile) return { error: "Profiel niet gevonden" };
  if (viewerProfile.rol === "setter") {
    return { error: "Setters mogen de eigenaar niet wijzigen" };
  }

  // Kandidaat moet in dezelfde tenant zitten
  const { data: kandidaat } = await admin
    .from("kandidaten")
    .select("tenant_id, kanban_stap")
    .eq("id", kandidaatId)
    .single();
  if (!kandidaat) return { error: "Kandidaat niet gevonden" };
  if (kandidaat.tenant_id !== viewerProfile.tenant_id) {
    return { error: "Geen rechten, andere tenant" };
  }

  // Nieuwe eigenaar moet in dezelfde tenant zitten + setter-zijn vereist voor schuiven
  let doelRol: string | null = null;
  if (nieuweEigenaarId) {
    const { data: doel } = await admin
      .from("profiles")
      .select("tenant_id, rol")
      .eq("id", nieuweEigenaarId)
      .single();
    if (!doel) return { error: "Doel-user niet gevonden" };
    if (doel.tenant_id !== viewerProfile.tenant_id) {
      return { error: "Doel-user zit niet in dit bureau" };
    }
    doelRol = doel.rol;
  }

  // Bij toewijzen aan setter: kanban-stap doorzetten naar 'bij_setter'
  // als kandidaat nog in een eerdere stap (wachtrij / afwachting cv) zit.
  // Bij ontkoppelen (null): kanban-stap terug naar 'in_wachtrij'.
  const update: Record<string, unknown> = { eigenaar_id: nieuweEigenaarId };
  if (nieuweEigenaarId && doelRol === "setter") {
    if (
      kandidaat.kanban_stap === "in_wachtrij" ||
      kandidaat.kanban_stap === "in_afwachting_cv"
    ) {
      update.kanban_stap = "bij_setter";
    }
  } else if (!nieuweEigenaarId) {
    if (kandidaat.kanban_stap === "bij_setter") {
      update.kanban_stap = "in_wachtrij";
    }
  }

  const { error } = await admin
    .from("kandidaten")
    .update(update)
    .eq("id", kandidaatId);
  if (error) return { error: error.message };

  revalidatePath(`/kandidaten/${kandidaatId}`);
  return { ok: true };
}
