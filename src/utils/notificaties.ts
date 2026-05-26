import { createAdminClient } from "@/utils/supabase/admin";

export type NotificatieType =
  | "voorstel_groen"
  | "voorstel_rood"
  | "kennismaking_gepland"
  | "plaatsing"
  | "plaatsing_aangemeld"
  | "contact_recruiter"
  | "contact_setter"
  | "cv_goedgekeurd"
  | "help_vraag"
  | "help_probleem"
  | "reactie_positief"
  | "reactie_alert"
  | "info";

export async function maakNotificatie(opts: {
  tenantId: string;
  userId: string;            // ontvanger
  vanUserId?: string | null; // afzender
  type: NotificatieType;
  titel: string;
  bericht?: string | null;
  linkUrl?: string | null;
  kandidaatId?: string | null;
  parentNotificatieId?: string | null;
}) {
  const admin = createAdminClient();
  await admin.from("notificaties").insert({
    tenant_id: opts.tenantId,
    user_id: opts.userId,
    van_user_id: opts.vanUserId ?? null,
    type: opts.type,
    titel: opts.titel,
    bericht: opts.bericht ?? null,
    link_url: opts.linkUrl ?? null,
    kandidaat_id: opts.kandidaatId ?? null,
    parent_notificatie_id: opts.parentNotificatieId ?? null,
  });
}

/**
 * Stuur een notificatie aan alle admins + recruiters van een tenant.
 */
export async function notifyTeam(opts: {
  tenantId: string;
  vanUserId?: string | null;
  type: NotificatieType;
  titel: string;
  bericht?: string | null;
  linkUrl?: string | null;
  kandidaatId?: string | null;
}) {
  const admin = createAdminClient();
  const { data: ontvangers } = await admin
    .from("profiles")
    .select("id")
    .eq("tenant_id", opts.tenantId)
    .in("rol", ["admin", "recruiter"]);

  for (const p of ontvangers ?? []) {
    if (p.id === opts.vanUserId) continue; // jezelf niet
    await maakNotificatie({
      tenantId: opts.tenantId,
      userId: p.id,
      vanUserId: opts.vanUserId,
      type: opts.type,
      titel: opts.titel,
      bericht: opts.bericht,
      linkUrl: opts.linkUrl,
      kandidaatId: opts.kandidaatId,
    });
  }
}
