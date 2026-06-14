import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Geeft alle setters + recruiters in dezelfde tenant terug.
 * Wordt gebruikt door de "Handmatig doorzetten" dropdown in de
 * kandidaat-wizard zodat de admin een specifieke user kan kiezen.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ users: [] }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return NextResponse.json({ users: [] });
  // Alleen admins/recruiters mogen de userlijst (voor de "doorzetten"-dropdown).
  if (!["admin", "recruiter"].includes(String(profile.rol))) {
    return NextResponse.json({ users: [] }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: users } = await admin
    .from("profiles")
    .select("id, voornaam, achternaam, rol")
    .eq("tenant_id", profile.tenant_id)
    .in("rol", ["setter", "recruiter"])
    .order("voornaam");

  return NextResponse.json({ users: users ?? [] });
}
