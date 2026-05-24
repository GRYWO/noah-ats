import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TOUR_VERSIE } from "@/components/OnboardingTour";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  await admin.from("profiles")
    .update({ onboarding_voltooid: true, onboarding_versie: TOUR_VERSIE })
    .eq("id", user.id);

  return NextResponse.json({ ok: true, versie: TOUR_VERSIE });
}

export async function DELETE() {
  // Reset zodat user de tour opnieuw kan starten
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  await admin.from("profiles")
    .update({ onboarding_voltooid: false, onboarding_versie: 0 })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
