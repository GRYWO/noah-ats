"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { maakNotificatie } from "@/utils/notificaties";
import { sendHelpVraagNaarYorith } from "@/utils/email";

const TYPES = new Set(["vraag", "probleem"] as const);

export async function verstuurHelpVraag(formData: FormData) {
  const typeRaw = (formData.get("type") as string)?.trim();
  const bericht = (formData.get("bericht") as string)?.trim();
  if (!bericht) return { error: "Bericht is leeg" };
  if (typeRaw !== "vraag" && typeRaw !== "probleem") return { error: "Ongeldig type" };
  const type = typeRaw as "vraag" | "probleem";
  if (!TYPES.has(type)) return { error: "Ongeldig type" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, voornaam, achternaam, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return { error: "Geen tenant" };

  const admin = createAdminClient();

  // Zoek Yorith via super-admin email
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL ?? "").toLowerCase();
  if (!superAdminEmail) return { error: "Super-admin niet ingesteld" };

  // listUsers is gepagineerd; voor MVP scannen we eerste 200
  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const yorith = usersData.users.find(u => u.email?.toLowerCase() === superAdminEmail);
  if (!yorith) return { error: "Kan super-admin niet vinden" };

  // Tenant-naam voor context
  const { data: tenant } = await admin
    .from("tenants")
    .select("naam, handelsnaam")
    .eq("id", profile.tenant_id)
    .single();
  const tenantNaam = tenant?.handelsnaam ?? tenant?.naam ?? "Onbekend bureau";

  const afzenderNaam = `${profile.voornaam ?? ""} ${profile.achternaam ?? ""}`.trim() || "Onbekend";
  const typeLabel = type === "vraag" ? "Vraag" : "Probleem";
  const rolLabel = profile.rol === "admin" ? "Admin" : profile.rol === "recruiter" ? "Recruiter" : "Setter";

  // In-app notificatie naar Yorith (met van_user_id zodat reageren werkt)
  try {
    await maakNotificatie({
      tenantId: profile.tenant_id,
      userId: yorith.id,
      vanUserId: user.id,
      type: type === "vraag" ? "help_vraag" : "help_probleem",
      titel: `${typeLabel} van ${afzenderNaam} (${tenantNaam})`,
      bericht,
      linkUrl: null,
      kandidaatId: null,
    });
  } catch (e) {
    console.error("Help-notificatie naar Yorith mislukt:", e);
  }

  // Mail als backup
  try {
    await sendHelpVraagNaarYorith({
      type,
      bericht,
      afzender: {
        naam: afzenderNaam,
        email: user.email ?? "",
        rol: rolLabel,
      },
      tenantNaam,
      naar: superAdminEmail,
    });
  } catch (e) {
    console.error("Help-mail naar Yorith mislukt:", e);
    // Notificatie staat al, geen blocker
  }

  return { ok: true };
}
