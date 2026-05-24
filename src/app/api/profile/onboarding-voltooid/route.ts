import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  await admin.from("profiles")
    .update({ onboarding_voltooid: true })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  // Reset zodat user de tour opnieuw kan starten
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  await admin.from("profiles")
    .update({ onboarding_voltooid: false })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
