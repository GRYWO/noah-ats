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

  // 1) Zoek of maak Noah recruitment-pool tenant (vlag is_grywo_pool is legacy
  // kolomnaam, behouden voor DB-stabiliteit, betekenis is nu Noah recruitment-pool).
  let { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("is_grywo_pool", true)
    .maybeSingle();

  // Fallback: tenant met naam/handelsnaam 'Noah recruitment' (case-insensitive)
  // en upgrade naar pool.
  if (!tenant) {
    const { data: byNaam } = await admin
      .from("tenants")
      .select("id")
      .or("naam.ilike.noah recruitment,handelsnaam.ilike.noah recruitment")
      .maybeSingle();
    if (byNaam) {
      await admin.from("tenants").update({ is_grywo_pool: true }).eq("id", byNaam.id);
      tenant = byNaam;
    }
  }

  // Anders aanmaken
  if (!tenant) {
    const { data: nieuwe, error: tErr } = await admin
      .from("tenants")
      .insert({
        naam: "Noah recruitment",
        handelsnaam: "Noah recruitment",
        is_grywo_pool: true,
      })
      .select("id")
      .single();
    if (tErr) return NextResponse.json({ error: `tenants insert: ${tErr.message}` }, { status: 500 });
    tenant = nieuwe;
  }

  const tenantId = tenant!.id;

  // 2) Check huidige profile
  const { data: bestaand } = await admin
    .from("profiles")
    .select("id, rol, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!bestaand) {
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

  // 3) Profile bestaat — zorg dat rol=admin én tenant_id gekoppeld
  if (bestaand.rol !== "admin" || bestaand.tenant_id !== tenantId) {
    const { error } = await admin.from("profiles")
      .update({ rol: "admin", tenant_id: tenantId })
      .eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, actie: "profile bijgewerkt", tenant_id: tenantId });
  }

  return NextResponse.json({ ok: true, actie: "geen wijziging nodig", profile: bestaand });
}
