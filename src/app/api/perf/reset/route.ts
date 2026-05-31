import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export const dynamic = "force-dynamic";

/**
 * Wist alle perf_metrics records — handig na een optimalisatie om vanaf nul
 * te meten. Alleen super-admin.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Niet toegestaan" }, { status: 403 });
  }
  const admin = createAdminClient();
  // Truncate via delete-all — gen_random_uuid sequence resetten niet nodig
  await admin.from("perf_metrics").delete().neq("id", -1);
  return NextResponse.json({ ok: true });
}
