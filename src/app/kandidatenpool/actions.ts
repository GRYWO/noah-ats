"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// "Kandidaat claimen": een setter haalt een open-sollicitant uit de talentenpool
// en koppelt 'm aan een eigen openstaande vacature. De kandidaat komt in de
// INTAKE-fase van die vacature te staan (kanban_stap 'interne_intake'), zodat de
// setter kan bellen en controleren voor 'm naar de pool gaat.
export async function claimKandidaat(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const kandidaatId = String(formData.get("kandidaatId") || "").trim();
  const vacatureId = String(formData.get("vacatureId") || "").trim();
  if (!kandidaatId || !vacatureId) {
    redirect("/kandidatenpool?error=" + encodeURIComponent("Kies eerst een vacature."));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) redirect("/kandidatenpool");

  const rol = (profile.rol ?? "").toString().toLowerCase();
  const isAdmin = rol === "admin" || rol === "super-admin" || rol === "super_admin";

  const admin = createAdminClient();

  // Vacature moet van deze setter zijn (of admin) en bestaan.
  const { data: vac } = await admin
    .from("rec_vacatures")
    .select("id, eigenaar, status")
    .eq("id", vacatureId)
    .maybeSingle();
  if (!vac) redirect("/kandidatenpool?error=" + encodeURIComponent("Vacature niet gevonden."));
  if (vac.eigenaar !== user.id && !isAdmin) {
    redirect("/kandidatenpool?error=" + encodeURIComponent("Dit is niet jouw vacature."));
  }

  // Kandidaat moet in de talentenpool van dezelfde tenant staan.
  const { data: k } = await admin
    .from("kandidaten")
    .select("id, tenant_id, kanban_stap")
    .eq("id", kandidaatId)
    .maybeSingle();
  if (!k || k.tenant_id !== profile.tenant_id || k.kanban_stap !== "talentpool") {
    redirect("/kandidatenpool?error=" + encodeURIComponent("Kandidaat niet meer beschikbaar."));
  }

  await admin
    .from("kandidaten")
    .update({
      eigenaar_id: (vac.eigenaar as string) || user.id,
      vacature_id: vacatureId,
      kanban_stap: "interne_intake",
      status: "in_proces",
    })
    .eq("id", kandidaatId);

  revalidatePath("/kandidatenpool");
  revalidatePath("/vacature-aanmaken");
  redirect(`/kandidatenpool?vacature=${vacatureId}&ok=geclaimd`);
}
