import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Proxy voor de CV-upload bij de noah-recruitment intake-flow.
// De recruiter logt in op noah-ats, maar de intake-logica (CV-screen,
// match-engine, mirror naar rec_kandidaten + ats-kandidaten) draait op
// noah-recruitment. Deze proxy zorgt dat de interne medewerker geen
// CORS-issues krijgt en dat we de rol-check binnen noah-ats houden.
//
// Toegang: recruiter, admin, super_admin. Setter en bureau_admin niet.

// Toegestane MIME-types, gelijk aan de upstream-route van noah-recruitment.
// PDF, Word (doc/docx), RTF, plain text en de gangbare foto-formaten.
const TOEGESTANE_MIME = new Set<string>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/rtf",
  "text/rtf",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// Max 15 MB, conform de afspraak met noah-recruitment.
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    (profile.rol !== "recruiter" &&
      profile.rol !== "admin" &&
      profile.rol !== "super_admin")
  ) {
    return NextResponse.json({ fout: "Geen toegang." }, { status: 403 });
  }

  try {
    // FormData rechtstreeks doorzetten naar noah-recruitment.
    // fetch hergebruikt het multipart-formaat zonder her-serialisatie.
    const formData = await req.formData();

    // MIME- en grootte-check vooraf, zodat we onnodige upstream-calls
    // voorkomen. De magic-byte-controle laten we aan noah-recruitment.
    const bestand = formData.get("cv");
    if (!(bestand instanceof File)) {
      return NextResponse.json(
        { fout: "Geen bestand ontvangen." },
        { status: 400 },
      );
    }
    if (bestand.size > MAX_BYTES) {
      return NextResponse.json(
        { fout: "Bestand is groter dan 15 MB." },
        { status: 413 },
      );
    }
    const mime = bestand.type || "application/octet-stream";
    if (!TOEGESTANE_MIME.has(mime)) {
      return NextResponse.json(
        {
          fout: "Bestandstype niet toegestaan. Gebruik PDF, Word, RTF, tekst of een foto van het CV.",
        },
        { status: 415 },
      );
    }

    const upstream = await fetch(
      "https://www.noah-recruitment.nl/api/intake/cv",
      { method: "POST", body: formData },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { fout: "Verbinding met intake-service mislukte." },
      { status: 502 },
    );
  }
}
