"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type StartResult =
  | { ok: true; kandidaatId: string; cvContext: string; geparseerd: Record<string, unknown> }
  | { ok: false; fout: string };

// Veilig casten van onbekende AI-output naar string.
// Voorkomt runtime-crashes als de parser een nummer of null teruggeeft.
function veiligString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

// Maakt een nieuwe kandidaat aan op basis van het geparseerde CV uit
// /api/ai/parse-cv-anon. Zet eigenaar_id = ingelogde user, upload de PDF
// naar bucket 'cvs' op pad tenant_id/kandidaatId/cv.pdf en retourneert een
// korte cvContext-string voor de intake-bot.
//
// Lockdown: setter is read-only op /kandidaten en mag dus GEEN intake starten.
export async function startIntake(formData: FormData): Promise<StartResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, fout: "Niet ingelogd." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return { ok: false, fout: "Geen tenant gekoppeld." };
  if (profile.rol === "setter") {
    return { ok: false, fout: "Setters kunnen geen intake starten." };
  }

  const cvFile = formData.get("cv_file") as File | null;
  const geparseerdJson = formData.get("geparseerd") as string | null;
  if (!cvFile || cvFile.size === 0) return { ok: false, fout: "Geen CV ontvangen." };
  if (cvFile.size > 10 * 1024 * 1024) return { ok: false, fout: "CV is te groot (max 10 MB)." };
  // Strikte MIME-check: browser moet expliciet 'application/pdf' meegeven.
  if (cvFile.type !== "application/pdf") {
    return { ok: false, fout: "Alleen PDF toegestaan." };
  }

  // Magic-byte check: eerste 4 bytes moeten %PDF zijn (0x25 0x50 0x44 0x46).
  // Beschermt tegen MIME-spoofing waarbij iemand een ander bestand .pdf noemt.
  const arrayBuf = await cvFile.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf, 0, 4);
  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    return { ok: false, fout: "Geen geldig PDF-bestand." };
  }

  let geparseerd: Record<string, unknown> = {};
  if (geparseerdJson) {
    try { geparseerd = JSON.parse(geparseerdJson) ?? {}; } catch {}
  }

  const voornaam = veiligString(geparseerd.voornaam) || "Onbekend";
  const achternaam = veiligString(geparseerd.achternaam) || "kandidaat";
  const email = veiligString(geparseerd.email) || null;
  const telefoon = veiligString(geparseerd.telefoon) || null;
  const woonplaats = veiligString(geparseerd.woonplaats) || null;
  const openVoor = veiligString(geparseerd.open_voor) || null;
  const rijbewijs = veiligString(geparseerd.rijbewijs) || null;
  const eigenVervoer = geparseerd.eigen_vervoer === true;
  const tussenvoegsel = veiligString(geparseerd.tussenvoegsel) || null;

  const admin = createAdminClient();

  const insert: Record<string, unknown> = {
    tenant_id: profile.tenant_id,
    eigenaar_id: user.id,
    aangemaakt_door: user.id,
    voornaam,
    tussenvoegsel,
    achternaam,
    email,
    telefoon,
    woonplaats,
    open_voor: openVoor,
    rijbewijs,
    eigen_vervoer: eigenVervoer,
    status: "nieuw",
    kanban_stap: "interne_intake",
    cv_geparseerd: geparseerd,
  };

  const { data: nieuw, error } = await admin
    .from("kandidaten")
    .insert(insert)
    .select("id")
    .single();

  if (error || !nieuw) {
    return { ok: false, fout: error?.message || "Aanmaken mislukt." };
  }

  // CV-PDF naar storage. Filename-sanitisatie: alleen veilige ext en vast pad.
  const ext = (cvFile.name.split(".").pop() ?? "pdf")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase() || "pdf";
  const path = `${profile.tenant_id}/${nieuw.id}/cv.${ext}`;
  try {
    // arrayBuf is hierboven al uitgelezen voor de magic-byte check; hergebruiken
    // bespaart een tweede stream-read van het File-object.
    const { error: upErr } = await admin.storage
      .from("cvs")
      .upload(path, new Uint8Array(arrayBuf), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (!upErr) {
      await admin.from("kandidaten").update({ cv_url: path }).eq("id", nieuw.id);
    }
  } catch {
    // upload-fout is niet fataal; intake kan door.
  }

  // Bouw beknopte cvContext zodat de intake-bot weet wat al bekend is
  // en geen dubbele vragen stelt.
  const context = [
    voornaam && `Naam: ${voornaam}${tussenvoegsel ? " " + tussenvoegsel : ""} ${achternaam}`,
    email && `E-mail: ${email}`,
    telefoon && `Telefoon: ${telefoon}`,
    woonplaats && `Woonplaats: ${woonplaats}`,
    geparseerd.opleiding && `Opleiding: ${geparseerd.opleiding}`,
    geparseerd.werkervaring && `Werkervaring: ${geparseerd.werkervaring}`,
    geparseerd.talen && `Talen: ${geparseerd.talen}`,
    geparseerd.vaardigheden && `Vaardigheden: ${geparseerd.vaardigheden}`,
    rijbewijs && `Rijbewijs: ${rijbewijs}`,
    eigenVervoer && "Heeft eigen vervoer",
    openVoor && `Open voor: ${openVoor}`,
  ].filter(Boolean).join("\n");

  return { ok: true, kandidaatId: nieuw.id, cvContext: context, geparseerd };
}
