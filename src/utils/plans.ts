/**
 * Abonnements-plannen — DB-driven (beheerbaar via /abonnementen-beheer).
 * Server-only — voor client gebruik plans-shared.ts.
 */
import { createAdminClient } from "@/utils/supabase/admin";
import { unstable_cache } from "next/cache";
export { eur } from "./plans-shared";
export type { Plan, PlanKey } from "./plans-shared";
import type { Plan, PlanKey } from "./plans-shared";

/**
 * Haalt alle actieve plannen op uit DB, gesorteerd.
 * Gecached per (inclusiefInactief?) — wijzigt zelden, dus 5 min veilig.
 * Invalideren via revalidateTag("plans") na een save.
 */
async function _getPlans(inclusiefInactief: boolean): Promise<Plan[]> {
  const admin = createAdminClient();
  let q = admin.from("abonnements_plannen").select("*").order("sortering", { ascending: true });
  if (!inclusiefInactief) q = q.eq("actief", true);
  const { data } = await q;
  return (data ?? []).map((p) => ({
    id: p.id,
    sleutel: p.sleutel,
    label: p.label,
    prijs_per_maand_cent: p.prijs_per_maand_cent,
    max_users: p.max_users,
    features: Array.isArray(p.features) ? p.features : [],
    populair: !!p.populair,
    actief: !!p.actief,
    sortering: p.sortering ?? 0,
  }));
}

const _getPlansCached = unstable_cache(
  async (inclusiefInactief: boolean) => _getPlans(inclusiefInactief),
  ["plans"],
  { revalidate: 300, tags: ["plans"] }
);

export async function getPlans(opts?: { inclusiefInactief?: boolean }): Promise<Plan[]> {
  return _getPlansCached(!!opts?.inclusiefInactief);
}

export async function getPlan(sleutel: PlanKey): Promise<Plan | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("abonnements_plannen")
    .select("*")
    .eq("sleutel", sleutel)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    sleutel: data.sleutel,
    label: data.label,
    prijs_per_maand_cent: data.prijs_per_maand_cent,
    max_users: data.max_users,
    features: Array.isArray(data.features) ? data.features : [],
    populair: !!data.populair,
    actief: !!data.actief,
    sortering: data.sortering ?? 0,
  };
}

/**
 * Globale instellingen (key/value). Default fallback voor setup_fee_cent.
 * Gecached 5 min — wijzigt zelden, invalideren via revalidateTag("setup_fee").
 */
const _getSetupFeeCached = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("abonnements_instellingen")
      .select("waarde")
      .eq("sleutel", "setup_fee_cent")
      .single();
    if (!data?.waarde) return 49500;
    const n = parseInt(data.waarde);
    return isNaN(n) ? 49500 : n;
  },
  ["setup_fee_cent"],
  { revalidate: 300, tags: ["setup_fee"] }
);

export async function getSetupFeeCent(): Promise<number> {
  return _getSetupFeeCached();
}

export async function setSetupFeeCent(cent: number): Promise<void> {
  const admin = createAdminClient();
  await admin.from("abonnements_instellingen").upsert({
    sleutel: "setup_fee_cent",
    waarde: String(cent),
    updated_at: new Date().toISOString(),
  });
}

