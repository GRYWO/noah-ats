"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function updateIntakeFilters(formData: FormData) {
  const id = formData.get("id") as string;
  const open_voor = (formData.get("open_voor") as string)?.trim() || null;
  const woonplaats = (formData.get("woonplaats") as string)?.trim() || null;
  const reisStr = (formData.get("max_reisafstand_km") as string)?.trim();
  const max_reisafstand_km = reisStr ? parseInt(reisStr) : null;
  const blacklist_bedrijven = (formData.get("blacklist_bedrijven") as string)?.trim() || null;
  const voltooid = formData.get("voltooid") === "1";

  const supabase = await createClient();
  const update: Record<string, unknown> = {
    open_voor,
    woonplaats,
    max_reisafstand_km,
    blacklist_bedrijven,
  };
  if (voltooid) update.intake_zoekfilters_voltooid = true;

  await supabase.from("kandidaten").update(update).eq("id", id);

  revalidatePath(`/kandidaten/${id}`);
}

export async function verbergIntakeFilters(formData: FormData) {
  // Markeer NIET als voltooid; alleen UI-side dismiss. Hier doen we niets bijzonders
  // (de banner verbergt zich client-side); we revalideren wel zodat de pagina vers blijft.
  const id = formData.get("id") as string;
  revalidatePath(`/kandidaten/${id}`);
}
