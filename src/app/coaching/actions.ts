"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { maakNotificatie } from "@/utils/notificaties";

function vandaagDatumNL(): string {
  const nu = new Date();
  const tz = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = tz.formatToParts(nu).reduce<Record<string, string>>((acc, p) => { if (p.type !== "literal") acc[p.type] = p.value; return acc; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const COACH_EMAIL = "pepijn@grywo.nl";

export async function submitEodRapport(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) redirect("/coaching?error=Geen+tenant");

  const intOf = (k: string) => {
    const v = formData.get(k) as string;
    return v && v.trim() ? parseInt(v) : 0;
  };
  const focus = parseInt((formData.get("energie_focus") as string) ?? "3");

  const data = {
    tenant_id:           profile.tenant_id,
    setter_id:           user.id,
    rapport_datum:       vandaagDatumNL(),
    doel_vandaag:        ((formData.get("doel_vandaag") as string) ?? "").trim() || null,
    doel_behaald:        formData.get("doel_behaald") === "ja",
    doel_morgen:         ((formData.get("doel_morgen") as string) ?? "").trim() || null,
    aantal_calls:        intOf("aantal_calls"),
    aantal_voicemails:   intOf("aantal_voicemails"),
    aantal_voorgesteld:  intOf("aantal_voorgesteld"),
    aantal_afspraken:    intOf("aantal_afspraken"),
    aantal_plaatsingen:  intOf("aantal_plaatsingen"),
    obstakel:            ((formData.get("obstakel") as string) ?? "").trim() || null,
    afwijzings_reden:    ((formData.get("afwijzings_reden") as string) ?? "").trim() || null,
    energie_focus:       focus >= 1 && focus <= 5 ? focus : 3,
    morgen_anders:       ((formData.get("morgen_anders") as string) ?? "").trim() || null,
  };

  const admin = createAdminClient();
  // Upsert op (setter_id, rapport_datum) unique key
  const { error } = await admin.from("eod_rapporten")
    .upsert(data, { onConflict: "setter_id,rapport_datum" });

  if (error) {
    redirect(`/coaching?error=${encodeURIComponent(error.message)}`);
  }

  // Notificatie naar coach als doel niet behaald
  if (!data.doel_behaald) {
    const { data: coach } = await admin
      .from("profiles")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_coach", true)
      .maybeSingle();
    if (coach) {
      const { data: setterInfo } = await admin
        .from("profiles")
        .select("voornaam, achternaam")
        .eq("id", user.id)
        .single();
      const setterNaam = `${setterInfo?.voornaam ?? ""} ${setterInfo?.achternaam ?? ""}`.trim();
      try {
        await maakNotificatie({
          tenantId: profile.tenant_id,
          userId: coach.id,
          vanUserId: user.id,
          type: "info",
          titel: `${setterNaam} heeft dagdoel niet behaald`,
          bericht: data.obstakel ? `Obstakel: ${data.obstakel}` : null,
          linkUrl: "/coaching",
        });
      } catch (e) {
        console.error("EOD notificatie coach mislukt:", e);
      }
    }
  }

  revalidatePath("/coaching");
  redirect("/coaching?ok=eod");
}

export async function vraagCoachingMeetingAan(formData: FormData) {
  const bericht = ((formData.get("bericht") as string) ?? "").trim();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, voornaam, achternaam, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) redirect("/coaching?error=Geen+tenant");

  const admin = createAdminClient();

  // Vind Pepijn (coach) — eerst via is_coach, anders via e-mail
  let coachId: string | null = null;
  const { data: coachProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_coach", true)
    .maybeSingle();
  if (coachProfile) coachId = coachProfile.id;

  if (!coachId) {
    const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const pep = usersData.users.find(u => u.email?.toLowerCase() === COACH_EMAIL);
    if (pep) coachId = pep.id;
  }

  if (!coachId) {
    redirect(`/coaching?error=${encodeURIComponent("Coach (Pepijn) niet gevonden — laat admin pepijn@grywo.nl aanmaken")}`);
  }

  const { error } = await admin.from("coaching_aanvragen").insert({
    tenant_id: profile.tenant_id,
    setter_id: user.id,
    coach_id: coachId,
    bericht: bericht || null,
    status: "aangevraagd",
  });
  if (error) {
    redirect(`/coaching?error=${encodeURIComponent(error.message)}`);
  }

  const setterNaam = `${profile.voornaam ?? ""} ${profile.achternaam ?? ""}`.trim() || "Setter";

  try {
    await maakNotificatie({
      tenantId: profile.tenant_id,
      userId: coachId,
      vanUserId: user.id,
      type: "info",
      titel: `${setterNaam} vraagt een 1-op-1 aan`,
      bericht: bericht || null,
      linkUrl: "/coaching",
    });
  } catch (e) {
    console.error("Coaching-notificatie mislukt:", e);
  }

  revalidatePath("/coaching");
  redirect("/coaching?ok=coaching_aanvraag");
}

export async function updateDoelen(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const intOf = (k: string, fallback: number) => {
    const v = formData.get(k) as string;
    if (!v || !v.trim()) return fallback;
    const n = parseInt(v);
    return isNaN(n) || n < 0 ? fallback : n;
  };
  const numOf = (k: string, fallback: number) => {
    const v = formData.get(k) as string;
    if (!v || !v.trim()) return fallback;
    const n = parseFloat(v);
    return isNaN(n) || n < 0 ? fallback : n;
  };

  const update = {
    doel_calls_dag:         intOf("doel_calls_dag", 50),
    doel_voorgesteld_week:  intOf("doel_voorgesteld_week", 5),
    doel_afspraken_week:    intOf("doel_afspraken_week", 3),
    doel_plaatsingen_maand: intOf("doel_plaatsingen_maand", 2),
    doel_omzet_maand:       numOf("doel_omzet_maand", 0),
  };

  const admin = createAdminClient();
  await admin.from("profiles").update(update).eq("id", user.id);

  revalidatePath("/coaching");
  redirect("/coaching?ok=doelen");
}

export async function stuurSetterReactie(formData: FormData) {
  const setterId = (formData.get("setter_id") as string) ?? "";
  const bericht = ((formData.get("bericht") as string) ?? "").trim();
  const toon = ((formData.get("toon") as string) ?? "positief").trim();
  if (!setterId || !bericht) return { error: "Setter en bericht verplicht" };
  if (toon !== "positief" && toon !== "alert") return { error: "Ongeldige toon" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol, is_coach, voornaam, achternaam")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return { error: "Geen tenant" };
  if (profile.rol !== "admin" && !profile.is_coach) {
    return { error: "Alleen admin of coach mag reactie sturen" };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("tenant_id, voornaam, achternaam")
    .eq("id", setterId)
    .single();
  if (!target || target.tenant_id !== profile.tenant_id) return { error: "Setter niet in jouw tenant" };

  const afzender = `${profile.voornaam ?? ""} ${profile.achternaam ?? ""}`.trim() || "Coach";
  const titel = toon === "alert"
    ? `🔴 Aandacht van ${afzender}`
    : `🟢 Compliment van ${afzender}`;

  try {
    await maakNotificatie({
      tenantId: profile.tenant_id,
      userId: setterId,
      vanUserId: user.id,
      type: toon === "alert" ? "reactie_alert" : "reactie_positief",
      titel,
      bericht,
      linkUrl: "/coaching",
    });
  } catch (e) {
    console.error("Setter-reactie notificatie mislukt:", e);
    return { error: "Versturen mislukt" };
  }

  revalidatePath("/coaching");
  return { ok: true };
}

export async function reageerCoaching(formData: FormData) {
  const id = (formData.get("id") as string) ?? "";
  const reactie = ((formData.get("reactie") as string) ?? "").trim() || null;
  const geplandeDatum = ((formData.get("geplande_datum") as string) ?? "").trim();
  const status = ((formData.get("status") as string) ?? "gepland").trim();
  if (!id) redirect("/coaching");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol, is_coach")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) redirect("/coaching?error=Geen+tenant");
  if (profile.rol !== "admin" && !profile.is_coach) {
    redirect("/coaching?error=Alleen+admin+of+coach");
  }

  const admin = createAdminClient();
  const { data: aanvraag } = await admin
    .from("coaching_aanvragen")
    .select("setter_id, tenant_id")
    .eq("id", id)
    .single();
  if (!aanvraag || aanvraag.tenant_id !== profile.tenant_id) {
    redirect("/coaching?error=Niet+gevonden");
  }

  await admin.from("coaching_aanvragen").update({
    status,
    reactie,
    geplande_datum: geplandeDatum ? new Date(geplandeDatum).toISOString() : null,
  }).eq("id", id);

  // Notificatie naar setter
  try {
    await maakNotificatie({
      tenantId: profile.tenant_id,
      userId: aanvraag.setter_id,
      vanUserId: user.id,
      type: "info",
      titel: status === "gepland" ? "Je 1-op-1 is ingepland" : "Update over je 1-op-1",
      bericht: reactie,
      linkUrl: "/coaching",
    });
  } catch (e) {
    console.error("Coaching-reactie notificatie mislukt:", e);
  }

  revalidatePath("/coaching");
  redirect("/coaching?ok=coaching_reactie");
}
