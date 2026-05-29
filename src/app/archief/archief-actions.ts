"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { revalidatePath } from "next/cache";

/**
 * Voeg een al getekend / extern document toe aan het archief.
 * Wordt direct als "voltooid" opgeslagen — geen signing-flow.
 */
export async function voegArchiefDocumentToe(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return { ok: false, error: "Geen toegang" };
  }

  const titel = (formData.get("titel") as string)?.trim();
  const beschrijving = (formData.get("beschrijving") as string)?.trim() || null;
  const getekendOpRaw = (formData.get("getekend_op") as string)?.trim();
  const ondertekenaarsRaw = (formData.get("ondertekenaars") as string)?.trim() || "";
  const bestand = formData.get("pdf") as File | null;

  if (!titel) return { ok: false, error: "Titel verplicht" };
  if (!bestand || bestand.size === 0) return { ok: false, error: "PDF verplicht" };
  if (bestand.type !== "application/pdf") return { ok: false, error: "Alleen PDF" };
  if (bestand.size > 20 * 1024 * 1024) return { ok: false, error: "Max 20 MB" };

  const admin = createAdminClient();

  // 1) Envelope aanmaken met status voltooid
  const getekendOp = getekendOpRaw ? new Date(getekendOpRaw).toISOString() : new Date().toISOString();
  const { data: env, error: envErr } = await admin
    .from("document_envelopes")
    .insert({
      titel,
      beschrijving,
      pdf_pad: "(archief)",
      aangemaakt_door: user.id,
      status: "voltooid",
      voltooid_op: getekendOp,
    })
    .select("id")
    .single();
  if (envErr || !env) return { ok: false, error: envErr?.message ?? "Aanmaken mislukt" };

  // 2) PDF uploaden naar voltooid_pdf_pad (en pdf_pad)
  const bytes = new Uint8Array(await bestand.arrayBuffer());
  const pad = `${env.id}/archief-${Date.now()}.pdf`;
  const up = await admin.storage.from("documenten").upload(pad, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (up.error) {
    await admin.from("document_envelopes").delete().eq("id", env.id);
    return { ok: false, error: "Upload mislukt: " + up.error.message };
  }

  await admin.from("document_envelopes").update({
    pdf_pad: pad,
    voltooid_pdf_pad: pad,
  }).eq("id", env.id);

  // 3) Ondertekenaars (optioneel) — formaat: "Voornaam Achternaam <email>; ..."
  if (ondertekenaarsRaw) {
    const lijnen = ondertekenaarsRaw.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean);
    const rows: Array<{
      envelope_id: string;
      voornaam: string;
      achternaam: string;
      email: string;
      token: string;
      volgorde: number;
      status: string;
      getekend_op: string;
    }> = [];
    let idx = 0;
    for (const lijn of lijnen) {
      // Probeer "Naam <email>" of "Naam email" te parsen
      const match = lijn.match(/^(.+?)\s*[<(]?\s*([^\s<>()]+@[^\s<>()]+)\s*[>)]?\s*$/);
      let naam = lijn;
      let email = "";
      if (match) {
        naam = match[1].trim();
        email = match[2].trim();
      }
      const naamDelen = naam.split(/\s+/);
      const voornaam = naamDelen[0] ?? naam;
      const achternaam = naamDelen.slice(1).join(" ") || "—";
      rows.push({
        envelope_id: env.id,
        voornaam,
        achternaam,
        email: email || "—",
        token: `archief-${env.id}-${idx}`,
        volgorde: idx,
        status: "getekend",
        getekend_op: getekendOp,
      });
      idx++;
    }
    if (rows.length > 0) {
      await admin.from("document_ondertekenaars").insert(rows);
    }
  }

  revalidatePath("/archief");
  return { ok: true, id: env.id };
}
