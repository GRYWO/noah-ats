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
