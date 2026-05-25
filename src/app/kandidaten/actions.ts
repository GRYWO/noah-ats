"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function nieuweKandidaat(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    redirect("/kandidaten?error=Geen+tenant+gekoppeld+aan+je+profile");
  }

  if (profile.rol === "setter") {
    redirect("/kandidaten?error=Setters+kunnen+geen+kandidaten+toevoegen");
  }

  const insert = {
    tenant_id: profile.tenant_id,
    eigenaar_id: user.id,
    voornaam:     (formData.get("voornaam") as string)?.trim(),
    achternaam:   (formData.get("achternaam") as string)?.trim(),
    email:        (formData.get("email") as string)?.trim() || null,
    telefoon:     (formData.get("telefoon") as string)?.trim() || null,
    woonplaats:   (formData.get("woonplaats") as string)?.trim() || null,
    leeftijd:     formData.get("leeftijd") ? parseInt(formData.get("leeftijd") as string) : null,
    open_voor:    (formData.get("open_voor") as string)?.trim() || null,
    status: "nieuw",
    kanban_stap: "interne_intake",
  };

  const { error } = await supabase.from("kandidaten").insert(insert);

  if (error) {
    redirect(`/kandidaten?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/kandidaten");
  redirect("/kandidaten");
}
