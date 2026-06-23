import { createAdminClient } from "@/utils/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

// De 'klant-sleutel' van een vacature. Vacatures uit Noah Launch hebben als
// eigenaar het bedrijfsaccount (geen ATS-profiel) → groeperen op dat account.
// Handmatig in de ATS aangemaakte vacatures groeperen we op bedrijfsnaam.
export async function klantKey(
  admin: AdminClient,
  vac: { eigenaar: string | null; bedrijfsnaam: string | null },
): Promise<string | null> {
  if (vac.eigenaar) {
    const { data: prof } = await admin
      .from("profiles")
      .select("id")
      .eq("id", vac.eigenaar)
      .maybeSingle();
    // Geen ATS-profiel → het is een Launch-bedrijfsaccount.
    if (!prof) return `acct:${vac.eigenaar}`;
  }
  if (vac.bedrijfsnaam && norm(vac.bedrijfsnaam)) return `naam:${norm(vac.bedrijfsnaam)}`;
  return null;
}

// Zet de klant op naam van deze setter en trekt alle open, nog onbeheerde
// vacatures van diezelfde klant automatisch mee naar die setter.
export async function claimKlant(
  admin: AdminClient,
  key: string,
  setterId: string,
  tenantId: string | null,
): Promise<void> {
  await admin
    .from("rec_klant_eigenaar")
    .upsert({ klant_key: key, setter_id: setterId, tenant_id: tenantId }, { onConflict: "klant_key" });

  if (key.startsWith("acct:")) {
    const eigenaar = key.slice("acct:".length);
    await admin
      .from("rec_vacatures")
      .update({ setter_id: setterId })
      .eq("eigenaar", eigenaar)
      .is("setter_id", null)
      .eq("status", "open");
  } else if (key.startsWith("naam:")) {
    // Bedrijfsnaam-normalisatie kan niet in SQL: open onbeheerde vacatures
    // ophalen en op genormaliseerde naam filteren.
    const doel = key.slice("naam:".length);
    const { data } = await admin
      .from("rec_vacatures")
      .select("id, bedrijfsnaam")
      .is("setter_id", null)
      .eq("status", "open");
    const ids = (data ?? [])
      .filter((r) => r.bedrijfsnaam && norm(r.bedrijfsnaam as string) === doel)
      .map((r) => r.id as string);
    if (ids.length) await admin.from("rec_vacatures").update({ setter_id: setterId }).in("id", ids);
  }
}

// Eigenaar (setter) van een klant opzoeken; null als nog vrij.
export async function eigenaarVanKlant(admin: AdminClient, key: string): Promise<string | null> {
  const { data } = await admin
    .from("rec_klant_eigenaar")
    .select("setter_id")
    .eq("klant_key", key)
    .maybeSingle();
  return (data?.setter_id as string | null) ?? null;
}
