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
  /** true = logisch antwoord, false = niet logisch → punten tellen mee */
  logisch?: boolean;
};

type Result = { ok?: boolean; error?: string };

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
    return { user: null, profile: null, err: "Geen rechten" };
  }
  return { user, profile, err: null };
}

/** Stap 1: alle intake-velden + rode vlag-antwoorden opslaan. */
export async function wizardOpslaanIntake(formData: FormData): Promise<Result> {
  const kandidaatId = formData.get("id") as string;
  if (!kandidaatId) return { error: "Kandidaat ontbreekt" };

  const { user, err } = await vereisRecruiterOfAdmin(kandidaatId);
  if (err || !user) return { error: err ?? "Geen rechten" };

  const admin = createAdminClient();

  const intStr = (k: string) => {
    const v = formData.get(k) as string;
    return v && v.trim() ? parseInt(v) : null;
  };

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
    max_reisafstand_km: intStr("max_reisafstand_km"),
    soort_dienstverband: (formData.get("soort_dienstverband") as string)?.trim() || null,
    werving_of_uitzend:  (formData.get("werving_of_uitzend") as string)?.trim() || null,
    salaris_indicatie:   (formData.get("salaris_indicatie") as string)?.trim() || null,
    tarief_ws:           (formData.get("tarief_ws") as string)?.trim() || null,
    bijzonderheden:      (formData.get("bijzonderheden") as string)?.trim() || null,
    blacklist_bedrijven: (formData.get("blacklist_bedrijven") as string)?.trim() || null,
    notitie:             (formData.get("notitie") as string)?.trim() || null,
  };

  const werkervaring = (formData.get("werkervaring") as string)?.trim() || null;
  const vaardigheden = (formData.get("vaardigheden") as string)?.trim() || null;
  const talen        = (formData.get("talen") as string)?.trim() || null;

  const { data: huidig } = await admin
    .from("kandidaten")
    .select("cv_geparseerd")
    .eq("id", kandidaatId)
    .single();
  const cvVeld = (huidig?.cv_geparseerd ?? {}) as Record<string, unknown>;

  // Rode vlaggen: lees toelichting + logisch (true/false) per vlag
  const vlaggenRaw = (cvVeld.rode_vlaggen ?? []) as (RodeVlag | string)[];
  const vlaggen: RodeVlag[] = vlaggenRaw.map(v =>
    typeof v === "string" ? { code: "overig", beschrijving: v, punten: -5 } : v
  );
  const verwerkteVlaggen = vlaggen.map(v => ({
    ...v,
    toelichting: ((formData.get(`vlag_toelichting_${v.code}`) as string) ?? "").trim(),
    logisch: formData.get(`vlag_logisch_${v.code}`) === "ja",
  }));

  update.cv_geparseerd = {
    ...cvVeld,
    werkervaring,
    vaardigheden,
    talen,
    rode_vlaggen: verwerkteVlaggen,
  };
  update.intake_zoekfilters_voltooid = true;

  const { error: updErr } = await admin.from("kandidaten").update(update).eq("id", kandidaatId);
  if (updErr) return { error: updErr.message };

  revalidatePath(`/kandidaten/${kandidaatId}`);
  return { ok: true };
}

/** Stap 3: profielschets genereren (of regenereren). */
export async function wizardGenereerSchets(kandidaatId: string): Promise<Result & { schets?: string }> {
  const { user, err } = await vereisRecruiterOfAdmin(kandidaatId);
  if (err || !user) return { error: err ?? "Geen rechten" };

  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select("voornaam, achternaam, leeftijd, woonplaats, opleiding, open_voor, notitie, max_reisafstand_km, cv_geparseerd")
    .eq("id", kandidaatId)
    .single();
  if (!k) return { error: "Kandidaat niet gevonden" };

  const cv = (k.cv_geparseerd ?? {}) as Record<string, unknown>;
  try {
    const schets = await genereerProfielschets({
      voornaam: k.voornaam,
      achternaam: k.achternaam,
      leeftijd: k.leeftijd,
      woonplaats: k.woonplaats,
      opleiding: k.opleiding,
      open_voor: k.open_voor,
      werkervaring: cv.werkervaring as string | null,
      vaardigheden: cv.vaardigheden as string | null,
      notitie: k.notitie,
      max_reisafstand_km: k.max_reisafstand_km,
    });
    await admin.from("kandidaten").update({ profielschets: schets }).eq("id", kandidaatId);
    return { ok: true, schets };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI-fout" };
  }
}

/** Stap 3: alleen profielschets opslaan (na editen). */
export async function wizardOpslaanSchets(formData: FormData): Promise<Result> {
  const kandidaatId = formData.get("id") as string;
  const schets = ((formData.get("profielschets") as string) ?? "").trim();
  if (!kandidaatId) return { error: "Kandidaat ontbreekt" };
  if (!schets) return { error: "Profielschets is leeg" };

  const { user, err } = await vereisRecruiterOfAdmin(kandidaatId);
  if (err || !user) return { error: err ?? "Geen rechten" };

  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("kandidaten")
    .update({ profielschets: schets })
    .eq("id", kandidaatId);
  if (updErr) return { error: updErr.message };

  revalidatePath(`/kandidaten/${kandidaatId}`);
  return { ok: true };
}

/** Stap 4: kandidaat goedkeuren → wachtrij + mail + auto-assign. */
export async function wizardNaarWachtrij(kandidaatId: string): Promise<Result> {
  const { user, profile, err } = await vereisRecruiterOfAdmin(kandidaatId);
  if (err || !user || !profile) return { error: err ?? "Geen rechten" };

  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select("voornaam, email, cv_url, tenant_id, profielschets, intake_afgerond_mail_sent")
    .eq("id", kandidaatId)
    .single();

  if (!k?.profielschets || !k.profielschets.trim()) {
    return { error: "Geen profielschets — kan kandidaat niet doorzetten" };
  }

  const nieuweStap = k.cv_url ? "in_wachtrij" : "in_afwachting_cv";

  await admin.from("kandidaten").update({
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

  if (k.email && !k.intake_afgerond_mail_sent) {
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

  if (k.tenant_id) {
    await logVoorstelEvent({
      tenantId: k.tenant_id,
      kandidaatId,
      event: "voorstel_verstuurd",
      beschrijving: `Intake afgerond door ${profile.voornaam ?? ""} ${profile.achternaam ?? ""}`,
      zichtbaarVoorKandidaat: true,
    });
  }

  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/kandidaten");
  return { ok: true };
}

/** Stap 2: afkeuren met reden. */
export async function wizardAfkeuren(formData: FormData): Promise<Result> {
  const kandidaatId = formData.get("id") as string;
  const reden = ((formData.get("afkeur_reden") as string) ?? "").trim();
  if (!kandidaatId) return { error: "Kandidaat ontbreekt" };
  if (!reden) return { error: "Reden afkeur verplicht" };

  const { user, profile, err } = await vereisRecruiterOfAdmin(kandidaatId);
  if (err || !user || !profile) return { error: err ?? "Geen rechten" };

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
  return { ok: true };
}
