"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { logVoorstelEvent } from "@/utils/voorstel-log";
import { triggerKanbanMails } from "@/utils/kanban-mails";

/**
 * Wouter zet een website-intake door naar de wachtrij.
 * Alleen admin en recruiter mogen dit, setters niet.
 *
 * Effect:
 *  - kanban_stap = 'in_wachtrij'
 *  - status      = 'in_proces'   (was 'nieuw' op moment van website-binnenkomst)
 *  - log-event 'website_doorgezet' op de tijdlijn
 *  - bestaande kanban-mail-trigger pakt eventuele kandidaat-mail op
 */
export async function zetWebsiteIntakeDoorNaarWachtrij(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) redirect("/kandidaten");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();

  if (!viewer || viewer.rol === "setter") {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent("Geen rechten om door te zetten")}`);
  }

  const admin = createAdminClient();

  const { data: huidig } = await admin
    .from("kandidaten")
    .select("tenant_id, kanban_stap, status")
    .eq("id", id)
    .single();

  if (!huidig) {
    redirect(`/kandidaten?error=${encodeURIComponent("Kandidaat niet gevonden")}`);
  }
  if (huidig!.tenant_id !== viewer.tenant_id) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent("Geen rechten, andere tenant")}`);
  }

  const { error } = await admin
    .from("kandidaten")
    .update({
      kanban_stap: "in_wachtrij",
      status: "in_proces",
    })
    .eq("id", id);

  if (error) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent(error.message)}`);
  }

  // Tijdlijn-event
  try {
    await logVoorstelEvent({
      tenantId: huidig!.tenant_id,
      kandidaatId: id,
      event: "website_doorgezet",
      beschrijving: "Website-intake doorgezet naar wachtrij",
      zichtbaarVoorKandidaat: false,
    });
  } catch (e) {
    console.error("Log website_doorgezet mislukt:", e);
  }

  // Kanban-mails (geen vereiste, maar gelijktrekken met updateKandidaat-flow).
  try {
    await triggerKanbanMails({
      kandidaatId: id,
      oudeStap: huidig!.kanban_stap ?? null,
      nieuweStap: "in_wachtrij",
      vanUserId: user.id,
    });
  } catch (e) {
    console.error("triggerKanbanMails mislukt:", e);
  }

  revalidatePath(`/kandidaten/${id}`);
  revalidatePath("/kandidaten");
  redirect(`/kandidaten/${id}?ok=website_doorgezet`);
}

/**
 * Wouter keurt een website-intake af.
 * Alleen admin en recruiter mogen dit, setters niet.
 *
 * Effect:
 *  - kanban_stap = 'afgewezen'
 *  - status      = 'afgewezen'
 *  - log-event 'website_afgekeurd' op de tijdlijn
 *  - de bestaande afwijzings-mail wordt door updateKandidaat-pad niet
 *    automatisch verstuurd vanaf deze actie. Dat is bewust: de website
 *    laat zelf al een neutrale boodschap zien, en Wouter mailt vaak
 *    persoonlijk. Wil je later een mail, dan koppelt triggerKanbanMails
 *    die alsnog op stap 'afgewezen'.
 */
export async function keurWebsiteIntakeAf(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) redirect("/kandidaten");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();

  if (!viewer || viewer.rol === "setter") {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent("Geen rechten om af te keuren")}`);
  }

  const admin = createAdminClient();

  const { data: huidig } = await admin
    .from("kandidaten")
    .select("tenant_id, kanban_stap, status")
    .eq("id", id)
    .single();

  if (!huidig) {
    redirect(`/kandidaten?error=${encodeURIComponent("Kandidaat niet gevonden")}`);
  }
  if (huidig!.tenant_id !== viewer.tenant_id) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent("Geen rechten, andere tenant")}`);
  }

  const { error } = await admin
    .from("kandidaten")
    .update({
      kanban_stap: "afgewezen",
      status: "afgewezen",
    })
    .eq("id", id);

  if (error) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent(error.message)}`);
  }

  try {
    await logVoorstelEvent({
      tenantId: huidig!.tenant_id,
      kandidaatId: id,
      event: "website_afgekeurd",
      beschrijving: "Website-intake afgekeurd",
      zichtbaarVoorKandidaat: false,
    });
  } catch (e) {
    console.error("Log website_afgekeurd mislukt:", e);
  }

  try {
    await triggerKanbanMails({
      kandidaatId: id,
      oudeStap: huidig!.kanban_stap ?? null,
      nieuweStap: "afgewezen",
      vanUserId: user.id,
    });
  } catch (e) {
    console.error("triggerKanbanMails mislukt:", e);
  }

  revalidatePath(`/kandidaten/${id}`);
  revalidatePath("/kandidaten");
  redirect(`/kandidaten/${id}?ok=website_afgekeurd`);
}

/**
 * Wouter plaatst een website-intake direct in de kandidatenpool (talentpool).
 * De kandidaat doorloopt niet de normale wachtrij-flow, maar blijft beschikbaar
 * voor latere matches.
 *
 * Alleen admin en recruiter mogen dit, setters niet.
 *
 * Effect:
 *  - kanban_stap = 'kandidatenpool'
 *  - status      = 'talentpool'
 *  - log-event 'naar_kandidatenpool' op de tijdlijn
 */
export async function zetWebsiteIntakeInPool(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) redirect("/kandidaten");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();

  if (!viewer || viewer.rol === "setter") {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent("Geen rechten om in de pool te plaatsen")}`);
  }

  const admin = createAdminClient();

  const { data: huidig } = await admin
    .from("kandidaten")
    .select("tenant_id, kanban_stap, status")
    .eq("id", id)
    .single();

  if (!huidig) {
    redirect(`/kandidaten?error=${encodeURIComponent("Kandidaat niet gevonden")}`);
  }
  if (huidig!.tenant_id !== viewer.tenant_id) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent("Geen rechten, andere tenant")}`);
  }

  const { error } = await admin
    .from("kandidaten")
    .update({
      kanban_stap: "kandidatenpool",
      status: "talentpool",
    })
    .eq("id", id);

  if (error) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent(error.message)}`);
  }

  try {
    await logVoorstelEvent({
      tenantId: huidig!.tenant_id,
      kandidaatId: id,
      event: "naar_kandidatenpool",
      beschrijving: "Kandidaat in de kandidatenpool geplaatst (talentpool)",
      zichtbaarVoorKandidaat: false,
    });
  } catch (e) {
    console.error("Log naar_kandidatenpool mislukt:", e);
  }

  revalidatePath(`/kandidaten/${id}`);
  revalidatePath("/kandidaten");
  revalidatePath("/kandidatenpool");
  redirect(`/kandidaten/${id}?ok=in_pool`);
}

/**
 * Verwijder een kandidaat uit de pool en zet hem terug naar 'website'-stap
 * zodat de beslis-balk weer verschijnt en hij opnieuw beoordeeld kan worden.
 */
export async function haalKandidaatUitPool(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) redirect("/kandidatenpool");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();

  if (!viewer || viewer.rol === "setter") {
    redirect(`/kandidatenpool?error=${encodeURIComponent("Geen rechten")}`);
  }

  const admin = createAdminClient();

  const { data: huidig } = await admin
    .from("kandidaten")
    .select("tenant_id, kanban_stap")
    .eq("id", id)
    .single();

  if (!huidig) {
    redirect(`/kandidatenpool?error=${encodeURIComponent("Kandidaat niet gevonden")}`);
  }
  if (huidig!.tenant_id !== viewer.tenant_id) {
    redirect(`/kandidatenpool?error=${encodeURIComponent("Geen rechten, andere tenant")}`);
  }

  const { error } = await admin
    .from("kandidaten")
    .update({
      kanban_stap: "website",
      status: "nieuw",
    })
    .eq("id", id);

  if (error) {
    redirect(`/kandidatenpool?error=${encodeURIComponent(error.message)}`);
  }

  try {
    await logVoorstelEvent({
      tenantId: huidig!.tenant_id,
      kandidaatId: id,
      event: "uit_kandidatenpool",
      beschrijving: "Kandidaat uit de pool gehaald, terug naar beoordeling",
      zichtbaarVoorKandidaat: false,
    });
  } catch (e) {
    console.error("Log uit_kandidatenpool mislukt:", e);
  }

  revalidatePath(`/kandidaten/${id}`);
  revalidatePath("/kandidatenpool");
  revalidatePath("/kandidaten");
  redirect(`/kandidatenpool?ok=uit_pool`);
}

/**
 * Vanuit de pool: kandidaat doorzetten naar de normale wachtrij.
 * Hergebruikt de logica van zetWebsiteIntakeDoorNaarWachtrij maar zonder
 * AI-oordeel-check, en zonder kanban-mail-trigger (pool kandidaten zijn al
 * eerder beoordeeld).
 */
export async function zetPoolKandidaatNaarWachtrij(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) redirect("/kandidatenpool");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();

  if (!viewer || viewer.rol === "setter") {
    redirect(`/kandidatenpool?error=${encodeURIComponent("Geen rechten")}`);
  }

  const admin = createAdminClient();

  const { data: huidig } = await admin
    .from("kandidaten")
    .select("tenant_id, kanban_stap")
    .eq("id", id)
    .single();

  if (!huidig) {
    redirect(`/kandidatenpool?error=${encodeURIComponent("Kandidaat niet gevonden")}`);
  }
  if (huidig!.tenant_id !== viewer.tenant_id) {
    redirect(`/kandidatenpool?error=${encodeURIComponent("Geen rechten, andere tenant")}`);
  }

  const { error } = await admin
    .from("kandidaten")
    .update({
      kanban_stap: "in_wachtrij",
      status: "in_proces",
    })
    .eq("id", id);

  if (error) {
    redirect(`/kandidatenpool?error=${encodeURIComponent(error.message)}`);
  }

  try {
    await logVoorstelEvent({
      tenantId: huidig!.tenant_id,
      kandidaatId: id,
      event: "pool_naar_wachtrij",
      beschrijving: "Vanuit de kandidatenpool doorgezet naar de wachtrij",
      zichtbaarVoorKandidaat: false,
    });
  } catch (e) {
    console.error("Log pool_naar_wachtrij mislukt:", e);
  }

  try {
    await triggerKanbanMails({
      kandidaatId: id,
      oudeStap: "kandidatenpool",
      nieuweStap: "in_wachtrij",
      vanUserId: user.id,
    });
  } catch (e) {
    console.error("triggerKanbanMails mislukt:", e);
  }

  revalidatePath(`/kandidaten/${id}`);
  revalidatePath("/kandidatenpool");
  revalidatePath("/kandidaten");
  redirect(`/kandidatenpool?ok=naar_wachtrij`);
}
