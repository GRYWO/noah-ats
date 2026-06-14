"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { revalidatePath, revalidateTag } from "next/cache";

async function eisSuper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) return null;
  return user;
}

export async function saveSetupFee(formData: FormData) {
  if (!(await eisSuper())) return { ok: false };
  const eur = parseFloat((formData.get("setup_fee_eur") as string).replace(",", "."));
  if (isNaN(eur) || eur < 0) return { ok: false };
  const admin = createAdminClient();
  await admin.from("abonnements_instellingen").upsert({
    sleutel: "setup_fee_cent",
    waarde: String(Math.round(eur * 100)),
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/abonnementen-beheer");
  revalidateTag("plans", "max");
  revalidateTag("setup_fee", "max");
  return { ok: true };
}

export async function savePlan(formData: FormData) {
  if (!(await eisSuper())) return { ok: false };
  const id = formData.get("id") as string | null;
  const sleutel = (formData.get("sleutel") as string)?.trim();
  const label = (formData.get("label") as string)?.trim();
  const prijs = parseFloat((formData.get("prijs_eur") as string).replace(",", "."));
  const maxUsersRaw = (formData.get("max_users") as string)?.trim();
  const max_users = maxUsersRaw === "" || maxUsersRaw === "0" ? null : parseInt(maxUsersRaw);
  const features = (formData.get("features") as string)
    .split("\n").map(s => s.trim()).filter(Boolean);
  const populair = formData.get("populair") === "on";
  const actief = formData.get("actief") === "on";
  const sortering = parseInt(formData.get("sortering") as string ?? "0") || 0;

  if (!sleutel || !label || isNaN(prijs)) return { ok: false };

  // De abonnementen-tabel accepteert alleen deze plan-sleutels (DB CHECK).
  // Een ander plan aanbieden zou bij afrekenen crashen, dus weigeren we het hier.
  const TOEGESTANE_SLEUTELS = ["starter", "pro", "enterprise"];
  if (!TOEGESTANE_SLEUTELS.includes(sleutel)) {
    return { ok: false, error: "Ongeldige plan-sleutel. Gebruik: starter, pro of enterprise." };
  }

  const admin = createAdminClient();
  const data = {
    sleutel,
    label,
    prijs_per_maand_cent: Math.round(prijs * 100),
    max_users,
    features,
    populair,
    actief,
    sortering,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    await admin.from("abonnements_plannen").update(data).eq("id", id);
  } else {
    await admin.from("abonnements_plannen").insert(data);
  }
  revalidatePath("/abonnementen-beheer");
  revalidateTag("plans", "max");
  revalidateTag("setup_fee", "max");
  return { ok: true };
}

export async function deletePlan(id: string) {
  if (!(await eisSuper())) return { ok: false };
  const admin = createAdminClient();
  // Check of er actieve abonnementen zijn met dit plan
  const { data: plan } = await admin
    .from("abonnements_plannen")
    .select("sleutel")
    .eq("id", id)
    .single();
  if (plan) {
    const { count } = await admin
      .from("abonnementen")
      .select("*", { count: "exact", head: true })
      .eq("plan", plan.sleutel)
      .in("status", ["actief", "achterstallig", "read_only"]);
    if ((count ?? 0) > 0) {
      return { ok: false, error: `${count} actieve abonnementen gebruiken dit plan. Zet eerst op inactief.` };
    }
  }
  await admin.from("abonnements_plannen").delete().eq("id", id);
  revalidatePath("/abonnementen-beheer");
  revalidateTag("plans", "max");
  revalidateTag("setup_fee", "max");
  return { ok: true };
}

export async function togglePopulair(id: string) {
  if (!(await eisSuper())) return { ok: false };
  const admin = createAdminClient();
  // Zet alle anderen op false, deze op true
  await admin.from("abonnements_plannen").update({ populair: false }).neq("id", id);
  const { data } = await admin.from("abonnements_plannen").select("populair").eq("id", id).single();
  await admin.from("abonnements_plannen")
    .update({ populair: !(data?.populair ?? false), updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/abonnementen-beheer");
  revalidateTag("plans", "max");
  revalidateTag("setup_fee", "max");
  return { ok: true };
}
