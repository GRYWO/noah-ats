"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendIntakeAfgerond } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";
import { logVoorstelEvent } from "@/utils/voorstel-log";
import { autoWijsKandidaatToe } from "@/utils/setter-assign";

export async function rondIntakeAf(formData: FormData) {
  const kandidaatId = formData.get("kandidaat_id") as string;
  if (!kandidaatId) redirect("/kandidaten");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (profile?.rol !== "admin" && profile?.rol !== "recruiter") {
    redirect(`/kandidaten/${kandidaatId}?error=Geen+rechten`);
  }

  const admin = createAdminClient();
  const { data: k } = await admin
    .from("kandidaten")
    .select("voornaam, email, cv_url, tenant_id, intake_afgerond_mail_sent")
    .eq("id", kandidaatId)
    .single();
  if (!k) redirect(`/kandidaten/${kandidaatId}?error=Niet+gevonden`);

  const nieuweStap = k.cv_url ? "in_wachtrij" : "in_afwachting_cv";

  await admin.from("kandidaten").update({
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
      beschrijving: `Interne intake afgerond — ${nieuweStap === "in_wachtrij" ? "in wachtrij" : "in afwachting van CV"}`,
      zichtbaarVoorKandidaat: true,
    });
  }

  revalidatePath(`/kandidaten/${kandidaatId}`);
  revalidatePath("/kandidaten");
  redirect(`/kandidaten/${kandidaatId}?ok=intake_afgerond`);
}

export async function updateIntakeFilters(formData: FormData) {
  const id = formData.get("id") as string;
  const open_voor = (formData.get("open_voor") as string)?.trim() || null;
  const woonplaats = (formData.get("woonplaats") as string)?.trim() || null;
  const reisStr = (formData.get("max_reisafstand_km") as string)?.trim();
  const max_reisafstand_km = reisStr ? parseInt(reisStr) : null;
  const blacklist_bedrijven = (formData.get("blacklist_bedrijven") as string)?.trim() || null;
  const voltooid = formData.get("voltooid") === "1";

  const supabase = await createClient();
  const update: Record<string, unknown> = {
    open_voor,
    woonplaats,
    max_reisafstand_km,
    blacklist_bedrijven,
  };
  if (voltooid) update.intake_zoekfilters_voltooid = true;

  await supabase.from("kandidaten").update(update).eq("id", id);

  revalidatePath(`/kandidaten/${id}`);
}

export async function verbergIntakeFilters(formData: FormData) {
  // Markeer NIET als voltooid; alleen UI-side dismiss. Hier doen we niets bijzonders
  // (de banner verbergt zich client-side); we revalideren wel zodat de pagina vers blijft.
  const id = formData.get("id") as string;
  revalidatePath(`/kandidaten/${id}`);
}
