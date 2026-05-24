"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { sendVoorstelMail } from "@/utils/email";

export async function stuurVoorstel(formData: FormData) {
  const kandidaatId = formData.get("kandidaat_id") as string;
  const opdrachtgeverEmail = (formData.get("opdrachtgever_email") as string)?.trim().toLowerCase();
  const opdrachtgeverNaam = (formData.get("opdrachtgever_naam") as string)?.trim() || null;
  const bericht = (formData.get("bericht") as string)?.trim() || null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    redirect(`/kandidaten/${kandidaatId}?error=Geen+tenant`);
  }

  if (profile.rol === "recruiter") {
    redirect(`/kandidaten/${kandidaatId}?error=Recruiters+kunnen+geen+voorstel+versturen`);
  }

  // Voorstel aanmaken
  const { data: nieuw, error } = await supabase.from("voorstellen").insert({
    tenant_id: profile.tenant_id,
    kandidaat_id: kandidaatId,
    setter_id: user.id,
    opdrachtgever_email: opdrachtgeverEmail,
    opdrachtgever_naam: opdrachtgeverNaam,
    bericht,
  }).select("token").single();

  if (error || !nieuw) {
    redirect(`/kandidaten/${kandidaatId}?error=${encodeURIComponent(error?.message ?? "Aanmaken mislukt")}`);
  }

  // Kandidaat ophalen voor mail
  const { data: kandidaat } = await supabase
    .from("kandidaten")
    .select("voornaam, tussenvoegsel, achternaam, leeftijd, woonplaats, opleiding, open_voor, tarief_ws, score")
    .eq("id", kandidaatId)
    .single();

  if (kandidaat) {
    try {
      await sendVoorstelMail({
        naar: opdrachtgeverEmail,
        opdrachtgeverNaam,
        kandidaat,
        bericht,
        token: nieuw.token,
      });
    } catch (e) {
      console.error("Mail versturen mislukt:", e);
      // Voorstel staat al in DB, gebruiker krijgt waarschuwing
      redirect(`/kandidaten/${kandidaatId}?error=${encodeURIComponent("Voorstel opgeslagen maar mail mislukt: " + (e as Error).message)}`);
    }
  }

  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/voorstellen");
  redirect(`/kandidaten/${kandidaatId}?ok=voorstel`);
}
