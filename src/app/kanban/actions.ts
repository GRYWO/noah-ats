"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { triggerKanbanMails } from "@/utils/kanban-mails";

export async function setKanbanStap(id: string, stap: string) {
  // "geplaatst" wordt NIET via deze action gezet — die loopt via de PlaatsingModal
  // (plaatsViaKanban) die ook de mail-trigger en plaatsings-record afhandelt.
  if (stap === "geplaatst") {
    return { error: "Gebruik de plaatsings-dialoog (sleep naar Geplaatst opent een formulier)." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Status-mapping voor eindkolommen
  const statusMap: Record<string, string> = {
    afgewezen: "afgewezen",
  };
  const newStatus = statusMap[stap];

  // Huidige stap ophalen voor mail-trigger
  const { data: huidig } = await supabase
    .from("kandidaten")
    .select("kanban_stap")
    .eq("id", id)
    .single();

  const update: Record<string, string> = { kanban_stap: stap };
  if (newStatus) update.status = newStatus;
  else if (stap !== "interne_intake") update.status = "in_proces";

  const { error } = await supabase
    .from("kandidaten")
    .update(update)
    .eq("id", id);

  if (error) return { error: error.message };

  await triggerKanbanMails({
    kandidaatId: id,
    oudeStap: huidig?.kanban_stap ?? null,
    nieuweStap: stap,
    vanUserId: user?.id ?? null,
  });

  revalidatePath("/kanban");
  revalidatePath("/kandidaten");
  return { ok: true };
}

// Nieuwe 7-fase-pijplijn op de kanban: Intake > Pool > Voorgesteld > Gezien >
// Op gesprek > Afgewezen > Geplaatst. Zet kanban_stap + voorstel_status.
const FASE_NAAR_STATUS: Record<string, { kanban_stap: string; voorstel_status: string | null; status: string }> = {
  Intake: { kanban_stap: "interne_intake", voorstel_status: null, status: "in_proces" },
  Pool: { kanban_stap: "kandidatenpool", voorstel_status: null, status: "in_proces" },
  Voorgesteld: { kanban_stap: "in_proces", voorstel_status: "voorgesteld", status: "in_proces" },
  Gezien: { kanban_stap: "in_proces", voorstel_status: "gezien", status: "in_proces" },
  "Op gesprek": { kanban_stap: "in_proces", voorstel_status: "op_gesprek", status: "in_proces" },
  Afgewezen: { kanban_stap: "in_proces", voorstel_status: "afgewezen", status: "afgewezen" },
};

export async function setKanbanFase(id: string, fase: string) {
  // "Geplaatst" loopt via de plaatsings-dialoog (PlaatsingModal).
  if (fase === "Geplaatst") {
    return { error: "Gebruik de plaatsings-dialoog (sleep naar Geplaatst opent een formulier)." };
  }
  const doel = FASE_NAAR_STATUS[fase];
  if (!doel) return { error: "Onbekende fase" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("kandidaten")
    .update({ kanban_stap: doel.kanban_stap, voorstel_status: doel.voorstel_status, status: doel.status })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/kanban");
  revalidatePath("/kandidaten");
  revalidatePath("/vacature-aanmaken");
  return { ok: true };
}
