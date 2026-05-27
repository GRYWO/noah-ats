"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function maakKandidaatVanWizard(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    redirect("/kandidaten?error=Geen+tenant");
  }
  if (profile.rol === "setter") {
    redirect("/kandidaten?error=Setters+kunnen+geen+kandidaten+aanmaken");
  }

  // Velden uit form
  const data: Record<string, unknown> = {
    tenant_id: profile.tenant_id,
    voornaam:       (formData.get("voornaam") as string)?.trim() || null,
    tussenvoegsel:  (formData.get("tussenvoegsel") as string)?.trim() || null,
    achternaam:     (formData.get("achternaam") as string)?.trim() || null,
    email:          (formData.get("email") as string)?.trim() || null,
    telefoon:       (formData.get("telefoon") as string)?.trim() || null,
    geslacht:       (formData.get("geslacht") as string)?.trim() || null,
    woonplaats:     (formData.get("woonplaats") as string)?.trim() || null,
    opleiding:      (formData.get("opleiding") as string)?.trim() || null,
    open_voor:      (formData.get("open_voor") as string)?.trim() || null,
    rijbewijs:      (formData.get("rijbewijs") as string)?.trim() || null,
    eigen_vervoer:  formData.get("eigen_vervoer") === "true",
    max_reisafstand_km: formData.get("max_reisafstand_km")
      ? parseInt(formData.get("max_reisafstand_km") as string) : null,
    soort_dienstverband:  (formData.get("soort_dienstverband") as string)?.trim() || null,
    werving_of_uitzend:   (formData.get("werving_of_uitzend") as string)?.trim() || null,
    salaris_indicatie:    (formData.get("salaris_indicatie") as string)?.trim() || null,
    blacklist_bedrijven:  (formData.get("blacklist_bedrijven") as string)?.trim() || null,
    bijzonderheden:       (formData.get("bijzonderheden") as string)?.trim() || null,
    tarief_ws:            (formData.get("tarief_ws") as string)?.trim() || null,
    status: "nieuw",
    kanban_stap: "interne_intake",
  };

  const leeftijdStr = formData.get("leeftijd") as string;
  if (leeftijdStr) {
    const n = parseInt(leeftijdStr);
    if (!isNaN(n)) data.leeftijd = n;
  }

  // CV-data uit AI parse
  const cvGeparseerdJson = formData.get("cv_geparseerd") as string;
  if (cvGeparseerdJson) {
    try {
      data.cv_geparseerd = JSON.parse(cvGeparseerdJson);
      data.cv_controle_status = "in_controle";
    } catch {}
  }

  if (!data.voornaam || !data.achternaam) {
    redirect("/kandidaten/nieuw?error=Voornaam+en+achternaam+verplicht");
  }

  const admin = createAdminClient();
  const { data: nieuw, error } = await admin
    .from("kandidaten")
    .insert(data)
    .select("id")
    .single();

  if (error || !nieuw) {
    redirect(`/kandidaten/nieuw?error=${encodeURIComponent(error?.message ?? "Aanmaken mislukt")}`);
  }

  // CV PDF naar storage uploaden (apart, want client moet 'm via FormData hebben gestuurd)
  const cvFile = formData.get("cv_file") as File | null;
  if (cvFile && cvFile.size > 0) {
    const ext = cvFile.name.split(".").pop() ?? "pdf";
    const path = `kandidaten/${nieuw.id}/cv.${ext}`;
    const arrayBuf = await cvFile.arrayBuffer();
    const { error: upErr } = await admin.storage
      .from("cvs")
      .upload(path, new Uint8Array(arrayBuf), {
        contentType: cvFile.type || "application/pdf",
        upsert: true,
      });
    if (!upErr) {
      const { data: urlData } = admin.storage.from("cvs").getPublicUrl(path);
      await admin.from("kandidaten").update({ cv_url: urlData.publicUrl }).eq("id", nieuw.id);
    }
  }

  revalidatePath("/kandidaten");
  // Direct door naar de intake-wizard zodat de recruiter de hele intake
  // in één lange flow doorloopt — geen losse pagina's meer.
  redirect(`/kandidaten/${nieuw.id}/intake`);
}
