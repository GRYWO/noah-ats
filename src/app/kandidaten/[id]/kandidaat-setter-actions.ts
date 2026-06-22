"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// Setter slaat de intake-informatie op (hoe de intake is/wordt gedaan). Wordt
// bewaard in het notitie-veld van de kandidaat.
export async function slaIntakeNotitieOp(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const kandidaatId = String(formData.get("kandidaatId") || "").trim();
  const notitie = String(formData.get("notitie") || "");
  if (!kandidaatId) redirect("/kandidaten");

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
  if (!profile?.tenant_id) redirect("/kandidaten");

  const admin = createAdminClient();
  const { data: k } = await admin.from("kandidaten").select("id, tenant_id").eq("id", kandidaatId).maybeSingle();
  if (!k || k.tenant_id !== profile.tenant_id) redirect("/kandidaten");

  await admin.from("kandidaten").update({ intake_notitie: notitie }).eq("id", kandidaatId);

  revalidatePath(`/kandidaten/${kandidaatId}`);
  redirect(`/kandidaten/${kandidaatId}?ok=intake_opgeslagen`);
}
