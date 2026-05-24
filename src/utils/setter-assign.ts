import { createAdminClient } from "./supabase/admin";

/**
 * Vind een beschikbare setter (0 actieve kandidaten) in een tenant.
 * Retourneert null als alle setters bezet zijn.
 */
export async function vindBeschikbareSetter(tenantId: string): Promise<string | null> {
  const admin = createAdminClient();

  // 1. Alle setters in deze tenant
  const { data: setters } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, created_at")
    .eq("tenant_id", tenantId)
    .eq("rol", "setter")
    .eq("is_active", true);

  if (!setters || setters.length === 0) return null;

  // 2. Aantal actieve kandidaten per setter (niet geplaatst/afgewezen)
  const { data: actieveKandidaten } = await admin
    .from("kandidaten")
    .select("eigenaar_id")
    .eq("tenant_id", tenantId)
    .not("status", "in", '("geplaatst","afgewezen")');

  const counts = new Map<string, number>();
  (actieveKandidaten ?? []).forEach(k => {
    if (k.eigenaar_id) counts.set(k.eigenaar_id, (counts.get(k.eigenaar_id) ?? 0) + 1);
  });

  // 3. Setters met 0 kandidaten — kies wie 't langst zonder zat (langst geleden last assigned)
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
    .select("tenant_id, eigenaar_id")
    .eq("id", kandidaatId)
    .single();

  if (!kandidaat) return { toegewezen: null };

  // Al toegewezen? Niet overschrijven
  if (kandidaat.eigenaar_id) return { toegewezen: kandidaat.eigenaar_id };

  const setterId = await vindBeschikbareSetter(kandidaat.tenant_id);
  if (!setterId) return { toegewezen: null };

  await admin.from("kandidaten").update({ eigenaar_id: setterId }).eq("id", kandidaatId);

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
 * Verwerk wachtrij: als er kandidaten zijn zonder eigenaar EN er is een vrije setter,
 * wijs ze toe. Wordt aangeroepen als een setter wordt toegevoegd of vrij komt.
 */
export async function verwerkWachtrij(tenantId: string) {
  const admin = createAdminClient();

  const { data: wachtrij } = await admin
    .from("kandidaten")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("eigenaar_id", null)
    .not("status", "in", '("geplaatst","afgewezen")')
    .order("created_at", { ascending: true });

  if (!wachtrij || wachtrij.length === 0) return { toegewezen: 0 };

  let toegewezen = 0;
  for (const k of wachtrij) {
    const setterId = await vindBeschikbareSetter(tenantId);
    if (!setterId) break; // Geen vrije setters meer
    await admin.from("kandidaten").update({ eigenaar_id: setterId }).eq("id", k.id);
    toegewezen++;
  }

  return { toegewezen };
}
