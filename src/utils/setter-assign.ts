import { createAdminClient } from "./supabase/admin";

/**
 * Vind de GRYWO-pool tenant (centraal bureau dat setters levert aan alle
 * andere bureaus). Markering: tenants.is_grywo_pool = true.
 * Fallback: tenant met naam 'GRYWO'.
 */
export async function getGrywoPoolTenantId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("id")
    .eq("is_grywo_pool", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (data?.id) return data.id;

  // Fallback voor systemen waar de flag nog niet gezet is
  const { data: gFallback } = await admin
    .from("tenants")
    .select("id")
    .ilike("naam", "grywo")
    .limit(1)
    .maybeSingle();
  return gFallback?.id ?? null;
}

/**
 * Vind een beschikbare setter (0 actieve kandidaten) uit de GRYWO-pool.
 * Setters zijn cross-tenant — ze bedienen kandidaten van ALLE bureaus.
 * Fallback: setters uit de eigen tenant als er geen GRYWO-pool is.
 */
export async function vindBeschikbareSetter(tenantId: string): Promise<string | null> {
  const admin = createAdminClient();

  // 1. Bepaal uit welke tenant de setters komen: GRYWO-pool indien beschikbaar
  const poolTenantId = await getGrywoPoolTenantId();
  const setterTenantId = poolTenantId ?? tenantId;

  // 2. Alle setters in de pool-tenant
  const { data: setters } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, created_at")
    .eq("tenant_id", setterTenantId)
    .eq("rol", "setter")
    .eq("is_active", true);

  if (!setters || setters.length === 0) return null;

  // 3. Aantal actieve kandidaten per setter — CROSS-TENANT, want één setter
  //    kan kandidaten uit meerdere bureaus hebben
  const setterIds = setters.map(s => s.id);
  const { data: actieveKandidaten } = await admin
    .from("kandidaten")
    .select("eigenaar_id")
    .in("eigenaar_id", setterIds)
    .not("status", "in", '("geplaatst","afgewezen")');

  const counts = new Map<string, number>();
  (actieveKandidaten ?? []).forEach(k => {
    if (k.eigenaar_id) counts.set(k.eigenaar_id, (counts.get(k.eigenaar_id) ?? 0) + 1);
  });

  // 4. Setters met 0 kandidaten — kies wie 't langst geleden voor 't laatst is toegewezen
  const beschikbaar = setters
    .filter(s => (counts.get(s.id) ?? 0) === 0)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return beschikbaar[0]?.id ?? null;
}

/**
 * Probeer kandidaat automatisch toe te wijzen aan een setter met 0 kandidaten.
 * Als geen beschikbaar → blijft in wachtrij (eigenaar_id = null).
 */
export async function autoWijsKandidaatToe(kandidaatId: string): Promise<{ toegewezen: string | null }> {
  const admin = createAdminClient();

  const { data: kandidaat } = await admin
    .from("kandidaten")
    .select("tenant_id, eigenaar_id, kanban_stap")
    .eq("id", kandidaatId)
    .single();

  if (!kandidaat) return { toegewezen: null };

  // Al toegewezen? Niet overschrijven
  if (kandidaat.eigenaar_id) return { toegewezen: kandidaat.eigenaar_id };

  const setterId = await vindBeschikbareSetter(kandidaat.tenant_id);
  if (!setterId) return { toegewezen: null };

  // Bij toewijzing: schuif kanban-stap door naar "bij_setter" als nog in wachtrij/afwachting cv
  const update: Record<string, unknown> = { eigenaar_id: setterId };
  if (kandidaat.kanban_stap === "in_wachtrij" || kandidaat.kanban_stap === "in_afwachting_cv") {
    update.kanban_stap = "bij_setter";
  }
  await admin.from("kandidaten").update(update).eq("id", kandidaatId);

  return { toegewezen: setterId };
}

/**
 * Bij verwijderen van een setter: herverdeel alle actieve kandidaten.
 * Voor elke kandidaat zoekt 't een nieuwe setter met 0 kandidaten.
 * Geen beschikbaar? → eigenaar_id = null (wachtrij, wacht op nieuwe setter).
 */
export async function herverdeelKandidaten(verwijderdeSetterId: string, tenantId: string) {
  const admin = createAdminClient();

  const { data: kandidaten } = await admin
    .from("kandidaten")
    .select("id")
    .eq("eigenaar_id", verwijderdeSetterId)
    .not("status", "in", '("geplaatst","afgewezen")');

  if (!kandidaten || kandidaten.length === 0) return { herverdeeld: 0, wachtrij: 0 };

  let herverdeeld = 0;
  let wachtrij = 0;

  for (const k of kandidaten) {
    const nieuweSetterId = await vindBeschikbareSetter(tenantId);
    if (nieuweSetterId) {
      await admin.from("kandidaten").update({ eigenaar_id: nieuweSetterId }).eq("id", k.id);
      herverdeeld++;
    } else {
      await admin.from("kandidaten").update({ eigenaar_id: null }).eq("id", k.id);
      wachtrij++;
    }
  }

  return { herverdeeld, wachtrij };
}

/**
 * Verwerk wachtrij: als er kandidaten zijn zonder eigenaar EN er is een vrije
 * setter, wijs ze toe. Wordt aangeroepen als een setter wordt toegevoegd of
 * vrijkomt. Cross-tenant: pakt wachtrij-kandidaten van ALLE bureaus.
 */
export async function verwerkWachtrij(tenantId: string) {
  const admin = createAdminClient();

  // Setter zit in de GRYWO-pool tenant, maar de wachtende kandidaten zitten in
  // andere bureau-tenants. Pak de wachtrij over alle non-pool tenants.
  const poolTenantId = await getGrywoPoolTenantId();

  let query = admin
    .from("kandidaten")
    .select("id, tenant_id")
    .is("eigenaar_id", null)
    .not("status", "in", '("geplaatst","afgewezen")')
    .order("created_at", { ascending: true });

  // Als deze tenant DE pool is, pakken we cross-tenant wachtrijen. Anders alleen
  // die specifieke tenant.
  if (poolTenantId && poolTenantId === tenantId) {
    query = query.neq("tenant_id", poolTenantId);
  } else {
    query = query.eq("tenant_id", tenantId);
  }

  const { data: wachtrij } = await query;
  if (!wachtrij || wachtrij.length === 0) return { toegewezen: 0 };

  let toegewezen = 0;
  for (const k of wachtrij) {
    const setterId = await vindBeschikbareSetter(k.tenant_id);
    if (!setterId) break;
    const update: Record<string, unknown> = { eigenaar_id: setterId };
    // Bij toewijzing: schuif kanban-stap door naar 'bij_setter' indien nog vroeg
    const { data: huidig } = await admin
      .from("kandidaten")
      .select("kanban_stap")
      .eq("id", k.id)
      .single();
    if (huidig?.kanban_stap === "in_wachtrij" || huidig?.kanban_stap === "in_afwachting_cv") {
      update.kanban_stap = "bij_setter";
    }
    await admin.from("kandidaten").update(update).eq("id", k.id);
    toegewezen++;
  }

  return { toegewezen };
}
