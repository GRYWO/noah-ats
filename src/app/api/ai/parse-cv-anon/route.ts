import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { parseCV } from "@/utils/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// In-memory rate-limit per user.id. Strenger dan de intake-bot omdat
// CV-parsing duurder is en grotere bestanden verwerkt.
const PARSE_LIMIET = 5;
const PARSE_VENSTER_MS = 60_000;
const parseTeller: Map<string, number[]> = new Map();

function rateLimitOverschreden(userId: string): boolean {
  const nu = Date.now();
  const eerder = parseTeller.get(userId) ?? [];
  const recent = eerder.filter((t) => nu - t < PARSE_VENSTER_MS);
  if (recent.length >= PARSE_LIMIET) {
    parseTeller.set(userId, recent);
    return true;
  }
  recent.push(nu);
  parseTeller.set(userId, recent);
  return false;
}

/**
 * Parse een CV zonder dat er al een kandidaat in de DB staat.
 * Wordt gebruikt in de 'nieuwe kandidaat' wizard.
 * Lockdown: setter is read-only op /kandidaten, alleen recruiter / admin /
 * super-admin. Niet ingelogd geeft 401.
 * Accepteert PDF als multipart/form-data 'file'.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimitOverschreden(user.id)) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Wacht even en probeer opnieuw." },
      { status: 429 },
    );
  }

  // Whitelist: recruiter, admin en super-admin mogen parsen.
  // Lockdown: setter is read-only op /kandidaten, uitgesloten.
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  const toegestaneRollen = ["recruiter", "admin", "super-admin", "super_admin"];
  if (!profile || !toegestaneRollen.includes(profile.rol)) {
    return NextResponse.json({ error: "Geen toegang." }, { status: 403 });
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

  // Magic-byte controle voorkomt dat een spoofed Content-Type
  // (bv. application/pdf op een binair payload) doorglipt.
  const head = buf.subarray(0, 8);
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isJpg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isZip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04; // docx/zip
  const isWebp = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46; // RIFF
  const isPlain = file.type === "text/plain" || file.type === "text/markdown";
  if (!isPdf && !isPng && !isJpg && !isZip && !isWebp && !isPlain) {
    return NextResponse.json({ error: "Bestand komt niet overeen met een ondersteund formaat." }, { status: 415 });
  }

  try {
    const parsed = await parseCV(buf, file.name, file.type);
    return NextResponse.json({ ok: true, parsed });
  } catch (e) {
    console.error("[parse-cv-anon] verwerking mislukt:", e);
    return NextResponse.json({ error: "CV kon niet verwerkt worden. Probeer het later opnieuw." }, { status: 500 });
  }
}
