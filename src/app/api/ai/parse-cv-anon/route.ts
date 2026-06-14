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
  // Bestandsvalidatie: grootte + type (anti-DoS / kostenmisbruik van de AI).
  if (file.size === 0 || file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Bestand ontbreekt of is te groot (max 15 MB)." }, { status: 413 });
  }
  const okType = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword", "text/plain", "text/markdown", "image/png", "image/jpeg", "image/webp"];
  if (file.type && !okType.includes(file.type)) {
    return NextResponse.json({ error: "Bestandstype niet ondersteund." }, { status: 415 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const parsed = await parseCV(buf, file.name, file.type);
    return NextResponse.json({ ok: true, parsed });
  } catch (e) {
    console.error("[parse-cv-anon] verwerking mislukt:", e);
    return NextResponse.json({ error: "CV kon niet verwerkt worden. Probeer het later opnieuw." }, { status: 500 });
  }
}
