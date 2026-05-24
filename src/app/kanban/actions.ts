"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function setKanbanStap(id: string, stap: string) {
  const supabase = await createClient();

  // Auto-update status when kanban moves to a final column
  const statusMap: Record<string, string> = {
    geplaatst: "geplaatst",
    niet_geplaatst: "afgewezen",
  };
  const newStatus = statusMap[stap];

  const update: Record<string, string> = { kanban_stap: stap };
  if (newStatus) update.status = newStatus;
  if (stap !== "nieuwe_sollicitatie" && stap !== "shortlist") update.status = update.status ?? "in_proces";

  const { error } = await supabase
    .from("kandidaten")
    .update(update)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/kanban");
  revalidatePath("/kandidaten");
  return { ok: true };
}
