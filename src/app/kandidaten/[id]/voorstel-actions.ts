"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendVoorstelMail, sendKandidaatVoorgesteld } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";
import { logVoorstelEvent } from "@/utils/voorstel-log";

export async function updateTweedeGesprek(formData: FormData) {
  const voorstelId = formData.get("voorstel_id") as string;
  const kandidaatId = formData.get("kandidaat_id") as string;
  const datumLocal = (formData.get("tweede_gesprek_op") as string)?.trim();

  if (!voorstelId || !kandidaatId) {
    redirect(`/kandidaten/${kandidaatId}?error=Ongeldige+invoer`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) redirect(`/kandidaten/${kandidaatId}?error=Geen+tenant`);
  if (profile.rol !== "admin" && profile.rol !== "recruiter" && profile.rol !== "setter") {
    redirect(`/kandidaten/${kandidaatId}?error=Geen+rechten`);
  }

  const iso = datumLocal ? new Date(datumLocal).toISOString() : null;

  const { data: bestaand } = await supabase
    .from("voorstellen")
    .select("tenant_id")
    .eq("id", voorstelId)
    .single();
  if (!bestaand || bestaand.tenant_id !== profile.tenant_id) {
    redirect(`/kandidaten/${kandidaatId}?error=Voorstel+niet+gevonden`);
  }

  await supabase
    .from("voorstellen")
    .update({ tweede_gesprek_op: iso, reminder_2e_gesprek_sent: null })
    .eq("id", voorstelId);

  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/agenda");
  redirect(`/kandidaten/${kandidaatId}?ok=tweede_gesprek`);
}

export async function updateKennismakingDatum(formData: FormData) {
  const voorstelId = formData.get("voorstel_id") as string;
  const kandidaatId = formData.get("kandidaat_id") as string;
  const datumLocal = (formData.get("kennismaking_op") as string)?.trim();

  if (!voorstelId || !kandidaatId) {
    redirect(`/kandidaten/${kandidaatId}?error=Ongeldige+invoer`);
  }

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

  if (profile.rol !== "setter" && profile.rol !== "admin") {
    redirect(`/kandidaten/${kandidaatId}?error=Geen+rechten`);
  }

  const iso = datumLocal ? new Date(datumLocal).toISOString() : null;

  const { data: bestaand } = await supabase
    .from("voorstellen")
    .select("tenant_id, kennismaking_op")
    .eq("id", voorstelId)
    .single();

  if (!bestaand || bestaand.tenant_id !== profile.tenant_id) {
    redirect(`/kandidaten/${kandidaatId}?error=Voorstel+niet+gevonden`);
  }

  const { error } = await supabase
    .from("voorstellen")
    .update({ kennismaking_op: iso })
    .eq("id", voorstelId);

  if (error) {
    redirect(`/kandidaten/${kandidaatId}?error=${encodeURIComponent(error.message)}`);
  }

  await logVoorstelEvent({
    tenantId: profile.tenant_id,
    voorstelId,
    kandidaatId,
    event: "kennismaking_gepland",
    beschrijving: iso
      ? `Kennismaking ingepland op ${new Date(iso).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}`
      : "Kennismaking-datum verwijderd",
    zichtbaarVoorKandidaat: false,
  });

  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/voorstellen");
  redirect(`/kandidaten/${kandidaatId}?ok=kennismaking`);
}

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
  }).select("id, token").single();

  if (error || !nieuw) {
    redirect(`/kandidaten/${kandidaatId}?error=${encodeURIComponent(error?.message ?? "Aanmaken mislukt")}`);
  }

  // Kandidaat ophalen voor mail
  const { data: kandidaat } = await supabase
    .from("kandidaten")
    .select("voornaam, tussenvoegsel, achternaam, leeftijd, woonplaats, opleiding, open_voor, tarief_ws, score, email, voorstelprofiel_token")
    .eq("id", kandidaatId)
    .single();

  // Setter mail-adres ophalen voor From-veld
  const setterFrom = await getSetterFrom(user.id);

  // Mail naar opdrachtgever
  if (kandidaat) {
    try {
      await sendVoorstelMail({
        naar: opdrachtgeverEmail,
        opdrachtgeverNaam,
        kandidaat,
        bericht,
        token: nieuw.token,
        voorstelprofielToken: kandidaat.voorstelprofiel_token,
        from: setterFrom,
      });
    } catch (e) {
      console.error("Mail naar opdrachtgever mislukt:", e);
      redirect(`/kandidaten/${kandidaatId}?error=${encodeURIComponent("Voorstel opgeslagen maar mail mislukt: " + (e as Error).message)}`);
    }
  }

  // Log: voorstel verstuurd
  await logVoorstelEvent({
    tenantId: profile.tenant_id,
    voorstelId: nieuw.id,
    kandidaatId,
    event: "voorstel_verstuurd",
    beschrijving: "Voorstel verstuurd naar opdrachtgever",
    zichtbaarVoorKandidaat: true,
  });

  // Mail naar kandidaat — zonder opdrachtgever-naam
  if (kandidaat?.email) {
    try {
      await sendKandidaatVoorgesteld({
        naar: kandidaat.email,
        kandidaatVoornaam: kandidaat.voornaam,
        from: setterFrom,
      });
      const admin = createAdminClient();
      await admin.from("voorstellen")
        .update({ kandidaat_voorgesteld_sent: new Date().toISOString() })
        .eq("id", nieuw.id);
    } catch (e) {
      console.error("Kandidaat-mail mislukt:", e);
    }
  }

  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/voorstellen");
  redirect(`/kandidaten/${kandidaatId}?ok=voorstel`);
}
