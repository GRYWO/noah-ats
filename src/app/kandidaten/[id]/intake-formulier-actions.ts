"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { genereerProfielschets } from "@/utils/ai";
import { sendIntakeAfgerond, sendKandidaatStatusAfwijzing } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";
import { logVoorstelEvent } from "@/utils/voorstel-log";
import { autoWijsKandidaatToe } from "@/utils/setter-assign";

type RodeVlag = {
  code: string;
  beschrijving: string;
  punten: number;
  vraag_aan_recruiter?: string;
  toelichting?: string;
};

async function vereisRecruiterOfAdmin(kandidaatId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, tenant_id, voornaam, achternaam")
    .eq("id", user.id)
    .single();
  if (profile?.rol !== "admin" && profile?.rol !== "recruiter") {
    redirect(`/kandidaten/${kandidaatId}?error=Geen+rechten`);
  }
  return { user, profile, supabase };
}

export async function verzendIntake(formData: FormData) {
  const kandidaatId = formData.get("id") as string;
  if (!kandidaatId) redirect("/kandidaten");

  const { user } = await vereisRecruiterOfAdmin(kandidaatId);
  const admin = createAdminClient();

  // Alle velden uitlezen
  const intStr = (k: string) => {
    const v = formData.get(k) as string;
    return v && v.trim() ? parseInt(v) : null;
  };
  const reisStr = formData.get("max_reisafstand_km") as string;

  const update: Record<string, unknown> = {
    voornaam:      (formData.get("voornaam") as string)?.trim(),
    tussenvoegsel: (formData.get("tussenvoegsel") as string)?.trim() || null,
    achternaam:    (formData.get("achternaam") as string)?.trim(),
    email:         (formData.get("email") as string)?.trim() || null,
    telefoon:      (formData.get("telefoon") as string)?.trim() || null,
    geslacht:      (formData.get("geslacht") as string)?.trim() || null,
    leeftijd:      intStr("leeftijd"),
    woonplaats:    (formData.get("woonplaats") as string)?.trim() || null,
    opleiding:     (formData.get("opleiding") as string)?.trim() || null,
    open_voor:     (formData.get("open_voor") as string)?.trim() || null,
    rijbewijs:     (formData.get("rijbewijs") as string)?.trim() || null,
    eigen_vervoer: formData.get("eigen_vervoer") === "on",
    max_reisafstand_km: reisStr && reisStr.trim() ? parseInt(reisStr) : null,
    soort_dienstverband: (formData.get("soort_dienstverband") as string)?.trim() || null,
    werving_of_uitzend:  (formData.get("werving_of_uitzend") as string)?.trim() || null,
    salaris_indicatie:   (formData.get("salaris_indicatie") as string)?.trim() || null,
    tarief_ws:           (formData.get("tarief_ws") as string)?.trim() || null,
    bijzonderheden:      (formData.get("bijzonderheden") as string)?.trim() || null,
    blacklist_bedrijven: (formData.get("blacklist_bedrijven") as string)?.trim() || null,
    notitie:             (formData.get("notitie") as string)?.trim() || null,
  };

  // CV-velden in cv_geparseerd JSON: werkervaring, vaardigheden, talen
  const werkervaring = (formData.get("werkervaring") as string)?.trim() || null;
  const vaardigheden = (formData.get("vaardigheden") as string)?.trim() || null;
  const talen        = (formData.get("talen") as string)?.trim() || null;

  const { data: huidig } = await admin
    .from("kandidaten")
    .select("cv_geparseerd")
    .eq("id", kandidaatId)
    .single();
  const cvVeld = (huidig?.cv_geparseerd ?? {}) as Record<string, unknown>;

  // Rode vlaggen: lees toelichting per vlag uit form
  const vlaggenRaw = (cvVeld.rode_vlaggen ?? []) as (RodeVlag | string)[];
  const vlaggen: RodeVlag[] = vlaggenRaw.map(v =>
    typeof v === "string" ? { code: "overig", beschrijving: v, punten: -5 } : v
  );
  const ontbrekendeToelichtingen: string[] = [];
  const verwerkteVlaggen = vlaggen.map(v => {
    const toelichting = ((formData.get(`vlag_toelichting_${v.code}`) as string) ?? "").trim();
    if (!toelichting) ontbrekendeToelichtingen.push(v.code);
    return { ...v, toelichting };
  });

  if (ontbrekendeToelichtingen.length > 0) {
    redirect(`/kandidaten/${kandidaatId}?error=${encodeURIComponent(
      `Geef een toelichting bij elke rode vlag (${ontbrekendeToelichtingen.length} ontbreken). Klopt het niet? Gebruik 'Kandidaat afkeuren' onderaan.`
    )}`);
  }

  update.cv_geparseerd = {
    ...cvVeld,
    werkervaring,
    vaardigheden,
    talen,
    rode_vlaggen: verwerkteVlaggen,
  };
  update.intake_zoekfilters_voltooid = true;

  const { error: updErr } = await admin.from("kandidaten").update(update).eq("id", kandidaatId);
  if (updErr) {
    redirect(`/kandidaten/${kandidaatId}?error=${encodeURIComponent(updErr.message)}`);
  }

  // Genereer profielschets (overschrijft alleen als nog leeg of recruiter dat aangeeft)
  const forceerNieuw = formData.get("forceer_nieuwe_schets") === "1";
  const { data: kandidaat } = await admin
    .from("kandidaten")
    .select("voornaam, achternaam, leeftijd, woonplaats, opleiding, open_voor, notitie, max_reisafstand_km, profielschets")
    .eq("id", kandidaatId)
    .single();

  if (kandidaat && (forceerNieuw || !kandidaat.profielschets)) {
    try {
      const schets = await genereerProfielschets({
        voornaam: kandidaat.voornaam,
        achternaam: kandidaat.achternaam,
        leeftijd: kandidaat.leeftijd,
        woonplaats: kandidaat.woonplaats,
        opleiding: kandidaat.opleiding,
        open_voor: kandidaat.open_voor,
        werkervaring,
        vaardigheden,
        notitie: kandidaat.notitie,
        max_reisafstand_km: kandidaat.max_reisafstand_km,
      });
      await admin.from("kandidaten").update({ profielschets: schets }).eq("id", kandidaatId);
    } catch (e) {
      console.error("Profielschets genereren mislukt:", e);
    }
  }

  void user;
  revalidatePath(`/kandidaten/${kandidaatId}`);
  redirect(`/kandidaten/${kandidaatId}?intake_stap=schets&ok=intake_opgeslagen`);
}

export async function keurProfielschetsGoed(formData: FormData) {
  const kandidaatId = formData.get("id") as string;
  if (!kandidaatId) redirect("/kandidaten");
  const profielschets = ((formData.get("profielschets") as string) ?? "").trim();
  if (!profielschets) {
    redirect(`/kandidaten/${kandidaatId}?intake_stap=schets&error=Profielschets+is+leeg`);
  }

  const { user, profile } = await vereisRecruiterOfAdmin(kandidaatId);
  const admin = createAdminClient();

  const { data: k } = await admin
    .from("kandidaten")
    .select("voornaam, email, cv_url, tenant_id, intake_afgerond_mail_sent")
    .eq("id", kandidaatId)
    .single();

  const nieuweStap = k?.cv_url ? "in_wachtrij" : "in_afwachting_cv";

  await admin.from("kandidaten").update({
    profielschets,
    cv_controle_status: "goedgekeurd",
    cv_controle_op: new Date().toISOString(),
    cv_controle_door: user.id,
    kanban_stap: nieuweStap,
    status: "in_proces",
    intake_voltooid: true,
  }).eq("id", kandidaatId);

  if (nieuweStap === "in_wachtrij") {
    await autoWijsKandidaatToe(kandidaatId);
  }

  // Mail naar kandidaat (eenmalig)
  if (k?.email && !k.intake_afgerond_mail_sent) {
    try {
      const setterFrom = await getSetterFrom(user.id);
      await sendIntakeAfgerond({
        naar: k.email,
        kandidaatVoornaam: k.voornaam ?? "",
        from: setterFrom,
      });
      await admin.from("kandidaten")
        .update({ intake_afgerond_mail_sent: new Date().toISOString() })
        .eq("id", kandidaatId);
    } catch (e) {
      console.error("Mail intake-afgerond mislukt:", e);
    }
  }

  if (k?.tenant_id) {
    await logVoorstelEvent({
      tenantId: k.tenant_id,
      kandidaatId,
      event: "voorstel_verstuurd",
      beschrijving: `Intake afgerond door ${profile.voornaam ?? ""} ${profile.achternaam ?? ""} (profielschets goedgekeurd)`,
      zichtbaarVoorKandidaat: true,
    });
  }

  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/kandidaten");
  redirect(`/kandidaten/${kandidaatId}?ok=intake_afgerond`);
}

export async function keurIntakeAf(formData: FormData) {
  const kandidaatId = formData.get("id") as string;
  if (!kandidaatId) redirect("/kandidaten");
  const reden = ((formData.get("afkeur_reden") as string) ?? "").trim();
  if (!reden) {
    redirect(`/kandidaten/${kandidaatId}?error=Reden+afkeur+verplicht`);
  }

  const { user, profile } = await vereisRecruiterOfAdmin(kandidaatId);
  const admin = createAdminClient();

  const { data: k } = await admin
    .from("kandidaten")
    .select("voornaam, email, tenant_id, notitie")
    .eq("id", kandidaatId)
    .single();

  const intakeReden = `[Intake afgekeurd door ${profile.voornaam ?? ""} ${profile.achternaam ?? ""}]: ${reden}`;
  const samengevoegdeNotitie = k?.notitie ? `${k.notitie}\n\n${intakeReden}` : intakeReden;

  await admin.from("kandidaten").update({
    cv_controle_status: "afgekeurd",
    cv_controle_op: new Date().toISOString(),
    cv_controle_door: user.id,
    status: "afgewezen",
    kanban_stap: "afgewezen",
    notitie: samengevoegdeNotitie,
  }).eq("id", kandidaatId);

  if (k?.email) {
    try {
      const setterFrom = await getSetterFrom(user.id);
      await sendKandidaatStatusAfwijzing({
        naar: k.email,
        kandidaatVoornaam: k.voornaam ?? "",
        from: setterFrom,
      });
      await admin.from("kandidaten")
        .update({ afwijzing_mail_sent: new Date().toISOString() })
        .eq("id", kandidaatId);
    } catch (e) {
      console.error("Mail afwijzing mislukt:", e);
    }
  }

  if (k?.tenant_id) {
    await logVoorstelEvent({
      tenantId: k.tenant_id,
      kandidaatId,
      event: "afwijzing",
      beschrijving: intakeReden,
      zichtbaarVoorKandidaat: true,
    });
  }

  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/kandidaten");
  redirect(`/kandidaten/${kandidaatId}?ok=intake_afgewezen`);
}
