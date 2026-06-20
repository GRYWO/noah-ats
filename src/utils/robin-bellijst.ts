import { createAdminClient } from "@/utils/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type RobinKandidaat = { naam?: string; url?: string; telefoon?: string };

// Slaat de door Robin gevonden kandidaten op als bellijst die aan de vacature
// gekoppeld is. Gebruikt de service-role (admin) client; de aanroeper bepaalt
// tenant/vacature/eigenaar.
export async function maakRobinBellijst(
  admin: Admin,
  opts: {
    tenantId: string;
    vacatureId: string;
    functie: string;
    vacatureTitel?: string;
    setterId?: string | null;
    kandidaten: RobinKandidaat[];
  }
): Promise<{ bellijstId: string; aantal: number }> {
  const { tenantId, vacatureId, functie, vacatureTitel, setterId, kandidaten } = opts;

  const { data: bellijst, error: bErr } = await admin
    .from("bellijsten")
    .insert({
      tenant_id: tenantId,
      vacature_id: vacatureId,
      setter_id: setterId ?? null,
      naam: `Robin: ${functie || vacatureTitel || "kandidaten"}`,
      aantal_items: kandidaten.length,
      bron: "robin",
    })
    .select("id")
    .single();
  if (bErr || !bellijst) {
    throw new Error(bErr?.message ?? "Bellijst-insert mislukt");
  }

  const items = kandidaten.slice(0, 200).map((k, idx) => ({
    bellijst_id: bellijst.id,
    tenant_id: tenantId,
    naam: (k.naam ?? "").toString().trim().slice(0, 200) || null,
    telefoon: (k.telefoon ?? "").toString().trim().slice(0, 60) || null,
    website: (k.url ?? "").toString().trim().slice(0, 500) || null,
    raw_data: k,
    volgorde: idx,
  }));

  const { error: iErr } = await admin.from("bellijst_items").insert(items);
  if (iErr) throw new Error(iErr.message);

  return { bellijstId: bellijst.id, aantal: items.length };
}
