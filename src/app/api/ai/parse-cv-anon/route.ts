import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { parseCV } from "@/utils/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Parse een CV zonder dat er al een kandidaat in de DB staat.
 * Wordt gebruikt in de 'nieuwe kandidaat' wizard.
 * Accepteert PDF als multipart/form-data 'file'.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol === "setter") {
    return NextResponse.json({ error: "Alleen recruiters/admins" }, { status: 403 });
  }

  const fd = await request.formData();
  const file = fd.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Geen bestand" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const parsed = await parseCV(buf);
    return NextResponse.json({ ok: true, parsed });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
