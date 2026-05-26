import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";

/**
 * Herstelt het super-admin profile als die ontbreekt of verkeerde rol heeft.
 * Alleen aanroepbaar door de super-admin zelf (via SUPER_ADMIN_EMAIL).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Alleen super-admin" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Zoek GRYWO-tenant
  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("is_grywo_pool", true)
    .maybeSingle();
  const tenantId = tenant?.id ?? null;

  // Check huidige profile
  const { data: bestaand } = await admin
    .from("profiles")
    .select("id, rol, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!bestaand) {
    // Maak profile aan
    const naamUitEmail = user.email!.split("@")[0];
    const { error } = await admin.from("profiles").insert({
      id: user.id,
      tenant_id: tenantId,
      voornaam: naamUitEmail.charAt(0).toUpperCase() + naamUitEmail.slice(1),
      achternaam: "",
      rol: "admin",
      is_active: true,
      is_coach: false,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, actie: "profile aangemaakt", tenant_id: tenantId });
  }

  // Profile bestaat — zorg dat rol=admin
  if (bestaand.rol !== "admin" || (tenantId && bestaand.tenant_id !== tenantId)) {
    const { error } = await admin.from("profiles")
      .update({
        rol: "admin",
        ...(tenantId ? { tenant_id: tenantId } : {}),
      })
      .eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, actie: "profile bijgewerkt naar admin", tenant_id: tenantId });
  }

  return NextResponse.json({ ok: true, actie: "geen wijziging nodig", profile: bestaand });
}
