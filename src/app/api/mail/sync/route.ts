import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { syncMailsVoorUser } from "@/utils/mail-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMailsVoorUser(user.id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  // Voor cron-jobs of handmatige aanroep (alleen via secret)
  return POST();
}
