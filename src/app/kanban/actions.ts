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
