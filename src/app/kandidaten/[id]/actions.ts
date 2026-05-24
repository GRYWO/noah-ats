"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function updateKandidaat(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

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

  const { error } = await supabase
    .from("kandidaten")
    .update(update)
    .eq("id", id);

  if (error) {
    redirect(`/kandidaten/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/kandidaten/${id}`);
  revalidatePath(`/kandidaten`);
  redirect(`/kandidaten/${id}?ok=1`);
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
