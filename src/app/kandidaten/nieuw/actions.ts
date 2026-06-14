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

  // Handmatige eigenaar (optioneel) — wanneer admin "Doorzetten naar..." kiest
  const handmatigeEigenaar = (formData.get("handmatige_eigenaar_id") as string)?.trim();
  if (handmatigeEigenaar) {
    // Verifieer dat deze user in dezelfde tenant zit
    const adminCheck = createAdminClient();
    const { data: doel } = await adminCheck
      .from("profiles")
      .select("tenant_id, rol")
      .eq("id", handmatigeEigenaar)
      .single();
    if (doel && doel.tenant_id === profile.tenant_id && (doel.rol === "setter" || doel.rol === "recruiter")) {
      data.eigenaar_id = handmatigeEigenaar;
    }
  }

  const leeftijdStr = formData.get("leeftijd") as string;
  if (leeftijdStr) {
    const n = parseInt(leeftijdStr);
    if (!isNaN(n)) data.leeftijd = n;
  }

  // CV-data uit AI parse
  const cvGeparseerdJson = formData.get("cv_geparseerd") as string;
  if (cvGeparseerdJson) {
    try {
      const parsed = JSON.parse(cvGeparseerdJson);
      data.cv_geparseerd = parsed;
      data.cv_controle_status = "in_controle";

      // Score direct herberekenen: AI-score min aftrek voor 'niet logisch' vlaggen.
      // Zo zie je in de detailpagina meteen het juiste cijfer, zonder dat de
      // recruiter eerst de hele intake-wizard hoeft te doorlopen.
      const aiScore = typeof parsed.ai_score === "number" ? parsed.ai_score : null;
      if (aiScore != null) {
        type Vlag = { punten?: number; logisch?: boolean };
        const aftrek = ((parsed.rode_vlaggen ?? []) as Vlag[])
          .filter((v) => v.logisch === false)
          .reduce((s, v) => s + Math.abs(v.punten ?? 0), 0);
        data.score = Math.max(0, aiScore - aftrek);
      }
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
    const ext = (cvFile.name.split(".").pop() ?? "pdf").replace(/[^a-z0-9]/gi, "").toLowerCase() || "pdf";
    // Pad MOET met tenant_id beginnen (storage-RLS) en we slaan het PAD op (geen
    // publieke URL); CV's worden privé geserveerd via createSignedUrl. Voorheen
    // stond het CV buiten de tenant-isolatie en als publieke URL = PII-lek.
    const path = `${profile.tenant_id}/${nieuw.id}/cv.${ext}`;
    const arrayBuf = await cvFile.arrayBuffer();
    const { error: upErr } = await admin.storage
      .from("cvs")
      .upload(path, new Uint8Array(arrayBuf), {
        contentType: cvFile.type || "application/pdf",
        upsert: true,
      });
    if (!upErr) {
      await admin.from("kandidaten").update({ cv_url: path }).eq("id", nieuw.id);
    }
  }

  revalidatePath("/kandidaten");
  // Direct door naar de intake-wizard zodat de recruiter de hele intake
  // in één lange flow doorloopt — geen losse pagina's meer.
  redirect(`/kandidaten/${nieuw.id}/intake`);
}
