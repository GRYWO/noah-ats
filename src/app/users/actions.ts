"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { encrypt } from "@/utils/crypto";
import { herverdeelKandidaten, verwerkWachtrij } from "@/utils/setter-assign";
import { sendAkkoordTerOndertekening } from "@/utils/email";
import { randomBytes } from "crypto";
import { bouwHandtekening } from "@/utils/email-signature";
import { isSuperAdminEmail } from "@/utils/auth";
import { MENU_KEYS } from "@/utils/menu-permissions";

export async function nieuweSetter(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check of huidige user admin is + haal tenant_id op
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();

  if (!myProfile || myProfile.rol !== "admin") {
    redirect("/users?error=Alleen+admins+kunnen+users+toevoegen");
  }

  const email           = (formData.get("email") as string)?.trim().toLowerCase();
  // Tijdelijk wachtwoord — wordt toch overschreven na ondertekening NDA/voorwaarden.
  const wachtwoord      = randomBytes(12).toString("base64").replace(/[+/=]/g, "").slice(0, 14) + "1!";
  const voornaam        = (formData.get("voornaam") as string)?.trim();
  const achternaam      = (formData.get("achternaam") as string)?.trim();
  const telefoon        = (formData.get("telefoon") as string)?.trim() || null;
  const voysNummer      = (formData.get("voys_nummer") as string)?.trim() || null;
  let rol               = (formData.get("rol") as string)?.trim() || "setter";
  const mailAdres       = (formData.get("mail_adres") as string)?.trim().toLowerCase() || email;
  const mailWachtwoord  = (formData.get("mail_wachtwoord") as string)?.trim() || null;

  // Bureau-admin (geen super-admin/sales-admin) mag alleen recruiters aanmaken.
  // Super-admin (Yorith) en sales-admin (Pepijn) mogen alle rollen kiezen.
  const isSuperAdmin = isSuperAdminEmail(user.email);
  const { isSalesAdmin } = await import("@/utils/sales-admin");
  const isSales = await isSalesAdmin(user);
  if (!isSuperAdmin && !isSales && rol !== "recruiter") {
    rol = "recruiter";
  }

  if (!email) {
    redirect(`/users?error=${encodeURIComponent("E-mail verplicht")}`);
  }

  const admin = createAdminClient();

  // 1. Maak auth user aan
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: wachtwoord,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    redirect(`/users?error=${encodeURIComponent(createErr?.message ?? "Aanmaken mislukt")}`);
  }

  // Auto handtekening bouwen via centrale helper
  // NB: telefoon (privé/mobiel) is puur administratief en komt NIET in de handtekening.
  // Het Voys-nummer is wel het zakelijke nummer dat onder de mail mag.
  const handtekening = bouwHandtekening({
    voornaam,
    achternaam,
    rol: rol as "admin" | "recruiter" | "setter",
    voysNummer,
    mailAdres,
    functieTitel: null,
  });

  // Menu-rechten — alleen super-admin mag dit zetten bij aanmaken.
  // Lees de checkboxes uit het form (name="menu_perm_<key>").
  let menuPermissions: Record<string, boolean> | null = null;
  if (isSuperAdmin) {
    const perms: Record<string, boolean> = {};
    let heeftEntries = false;
    for (const m of MENU_KEYS) {
      // Een unchecked checkbox stuurt geen waarde — dus afwezig = false.
      const aangevinkt = formData.get(`menu_perm_${m.key}`) === "on";
      perms[m.key] = aangevinkt;
      heeftEntries = true;
    }
    if (heeftEntries) menuPermissions = perms;
  }

  // Setter krijgt automatisch 14 werkdagen proefperiode (geen abonnement nodig).
  // Daarna stuurt cron de Stripe-betalingsmail + middleware blokkeert.
  let proefperiodeEinde: string | null = null;
  let setterAbonnementStatus = "geen";
  if (rol === "setter") {
    const { werkdagenLater } = await import("@/utils/voorstel-log");
    proefperiodeEinde = werkdagenLater(14);
    setterAbonnementStatus = "proefperiode";
  }

  // 2. Maak profile aan (gekoppeld aan zelfde tenant)
  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    tenant_id: myProfile.tenant_id,
    voornaam,
    achternaam,
    rol,
    telefoon,
    voys_nummer: voysNummer,
    mail_adres: mailAdres,
    mail_wachtwoord: mailWachtwoord ? encrypt(mailWachtwoord) : null,
    handtekening_html: handtekening,
    mail_status: mailWachtwoord ? "actief" : "niet_geconfigureerd",
    menu_permissions: menuPermissions,
    proefperiode_eindigt_op: proefperiodeEinde,
    abonnement_status: rol === "setter" ? setterAbonnementStatus : null,
  });

  if (profileErr) {
    // Cleanup user als profile mislukt
    await admin.auth.admin.deleteUser(created.user.id);
    redirect(`/users?error=${encodeURIComponent(profileErr.message)}`);
  }

  // Nieuwe setter? → verwerk wachtrij (kandidaten zonder eigenaar)
  if (rol === "setter") {
    await verwerkWachtrij(myProfile.tenant_id);
  }

  // Nieuwe recruiter? → check of bureau-abonnement automatisch moet upgraden.
  // 1 recruiter = Starter, 2 = Pro, 3+ = Enterprise. Stripe past prorata toe.
  // Fire-and-forget zodat user-aanmaak niet vertraagt door Stripe-call.
  if (rol === "recruiter") {
    import("@/utils/abonnement-auto-upgrade")
      .then(({ checkEnPasAbonnementAan }) => checkEnPasAbonnementAan(myProfile.tenant_id))
      .then((r) => {
        if (r.gewijzigd) {
          console.log(`[auto-upgrade] ${myProfile.tenant_id}: ${r.vorigPlan} → ${r.nieuwPlan} (${r.aantalRecruiters} recruiters)`);
        }
      })
      .catch((e) => console.error("[auto-upgrade]", e));
  }

  // Stuur NIET direct welkomstmail. Eerst NDA / gebruiksvoorwaarden tekenen.
  // Pas na ondertekening krijgt de user de inloggegevens (zie
  // /tekenen/[token]/actions.ts → tekenAkkoord).
  try {
    const { data: tenant } = await admin.from("tenants")
      .select("naam, handelsnaam")
      .eq("id", myProfile.tenant_id)
      .single();
    const bedrijf = tenant?.handelsnaam ?? tenant?.naam ?? null;

    const type = rol === "setter" ? "nda_setter" : "gebruiksvoorwaarden";
    const token = randomBytes(16).toString("hex");

    await admin.from("user_agreements").insert({
      user_id: created.user.id,
      tenant_id: myProfile.tenant_id,
      token,
      type,
      status: "wachtend",
      verzonden_aan_email: mailAdres,
      verzonden_aan_naam: `${voornaam} ${achternaam}`.trim(),
      verzonden_door: user.id,
      user_voornaam: voornaam,
      user_achternaam: achternaam,
      user_rol: rol,
      bureau_naam: bedrijf,
    });

    await sendAkkoordTerOndertekening({
      naar: mailAdres,
      naam: `${voornaam} ${achternaam}`.trim(),
      type,
      token,
    });
  } catch (e) {
    console.error("Akkoord-uitnodiging bij aanmaak mislukt:", e);
  }

  // wachtwoord is opgeslagen in Supabase Auth; user logt pas in nadat hij
  // de akkoord heeft getekend en de welkomstmail met inloggegevens ontvangt.
  void wachtwoord;

  revalidatePath("/users");
  revalidatePath("/kandidaten");
  redirect("/users?ok=1");
}

export async function bewerkUser(formData: FormData) {
  const id            = formData.get("id") as string;
  const voornaam      = (formData.get("voornaam") as string)?.trim();
  const achternaam    = (formData.get("achternaam") as string)?.trim();
  const telefoon      = (formData.get("telefoon") as string)?.trim() || null;
  const voys_nummer   = (formData.get("voys_nummer") as string)?.trim() || null;
  const mail_adres    = (formData.get("mail_adres") as string)?.trim().toLowerCase() || null;
  const functie_titel = (formData.get("functie_titel") as string)?.trim() || null;
  const nieuweRol     = (formData.get("rol") as string)?.trim() || null;
  const permsRaw      = (formData.get("menu_permissions") as string)?.trim() || null;

  if (!id || !voornaam || !achternaam) {
    return { error: "Voornaam + achternaam verplicht" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = isSuperAdminEmail(user.email);
  const { isSalesAdmin: checkSalesAdmin } = await import("@/utils/sales-admin");
  const isSales = await checkSalesAdmin(user);
  if (!isSuperAdmin && !isSales && myProfile?.rol !== "admin") {
    return { error: "Alleen admins kunnen users bewerken" };
  }

  const admin = createAdminClient();

  const update: Record<string, unknown> = {
    voornaam,
    achternaam,
    telefoon,
    voys_nummer,
    mail_adres,
    functie_titel,
  };
  // Super-admin (Yorith) en sales-admin (Pepijn) mogen rol wijzigen
  if ((isSuperAdmin || isSales) && nieuweRol && ["admin", "recruiter", "setter"].includes(nieuweRol)) {
    update.rol = nieuweRol;
  }
  // Alleen super-admin mag menu-rechten zetten
  if (isSuperAdmin && permsRaw) {
    try {
      const parsed = JSON.parse(permsRaw);
      if (parsed && typeof parsed === "object") {
        update.menu_permissions = parsed;
      }
    } catch {
      return { error: "Ongeldige menu-rechten JSON" };
    }
  }

  // Bureau-admin mag alleen users in eigen tenant bewerken
  let q = admin.from("profiles").update(update).eq("id", id);
  if (!isSuperAdmin && myProfile?.tenant_id) {
    q = q.eq("tenant_id", myProfile.tenant_id);
  }
  const { error } = await q;
  if (error) return { error: error.message };

  revalidatePath("/users");
  return { ok: true };
}

export async function updateSetterVoysNummer(formData: FormData) {
  const id = formData.get("id") as string;
  const voys_nummer = (formData.get("voys_nummer") as string)?.trim() || null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .single();

  if (!myProfile || myProfile.rol !== "admin") return;

  const admin = createAdminClient();
  await admin.from("profiles")
    .update({ voys_nummer })
    .eq("id", id)
    .eq("tenant_id", myProfile.tenant_id);

  revalidatePath("/users");
}

export async function verwijderSetter(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === id) {
    redirect("/users?error=Je+kunt+jezelf+niet+verwijderen");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (myProfile?.rol !== "admin") {
    redirect("/users?error=Alleen+admins");
  }

  const admin = createAdminClient();

  // Haal tenant + rol van verwijderde user op vóór delete
  const { data: teVerwijderen } = await admin
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", id)
    .single();

  // Herverdeel actieve kandidaten naar andere setters of wachtrij
  if (teVerwijderen?.tenant_id) {
    await herverdeelKandidaten(id, teVerwijderen.tenant_id);
  }

  await admin.from("profiles").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id);

  // Was het een recruiter? → check downgrade van bureau-abonnement
  if (teVerwijderen?.rol === "recruiter" && teVerwijderen.tenant_id) {
    import("@/utils/abonnement-auto-upgrade")
      .then(({ checkEnPasAbonnementAan }) => checkEnPasAbonnementAan(teVerwijderen.tenant_id!))
      .then((r) => {
        if (r.gewijzigd) {
          console.log(`[auto-downgrade] ${teVerwijderen.tenant_id}: ${r.vorigPlan} → ${r.nieuwPlan} (${r.aantalRecruiters} recruiters)`);
        }
      })
      .catch((e) => console.error("[auto-downgrade]", e));
  }

  revalidatePath("/users");
  revalidatePath("/kandidaten");
  redirect("/users?ok=verwijderd");
}
