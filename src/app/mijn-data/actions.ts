"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendMijnDataLink } from "@/utils/email";

type Result = { ok?: boolean; error?: string };

/**
 * Stap 1: kandidaat vult e-mail in → magic-link naar zijn/haar inbox.
 * We sturen ALTIJD een succes-bericht (ook als email niet bestaat),
 * om enumeration-attacks te voorkomen.
 */
export async function vraagInzageLink(formData: FormData): Promise<Result> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Vul een geldig e-mailadres in" };

  const admin = createAdminClient();

  // Zoek kandidaat met dit e-mailadres (mag meerdere zijn — dan pakken we de meest recente)
  const { data: kand } = await admin
    .from("kandidaten")
    .select("id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Token aanmaken — ook als er geen kandidaat is, om timing-attacks te dempen
  const token = randomBytes(24).toString("hex");
  const verlooptOp = new Date(Date.now() + 60 * 60 * 1000); // 1 uur geldig

  await admin.from("mijn_data_tokens").insert({
    token,
    email,
    kandidaat_id: kand?.id ?? null,
    verloopt_op: verlooptOp.toISOString(),
  });

  // Mail alleen versturen als kandidaat bestaat — maar reactie blijft uniform
  if (kand) {
    try {
      await sendMijnDataLink({ naar: email, token });
    } catch (e) {
      console.error("Magic-link mail mislukt:", e);
    }
  }

  return { ok: true };
}

/**
 * Stap 2: kandidaat klikt magic-link → wij valideren token (1× gebruik).
 * Server-component op /mijn-data/[token] gebruikt deze helper.
 */
export async function valideerToken(token: string) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("mijn_data_tokens")
    .select("*")
    .eq("token", token)
    .single();
  if (!row) return { error: "Onbekende link" };
  if (row.gebruikt_op) return { error: "Deze link is al gebruikt. Vraag een nieuwe aan." };
  if (new Date(row.verloopt_op) < new Date()) return { error: "Link is verlopen, vraag een nieuwe aan" };
  if (!row.kandidaat_id) return { error: "Geen gegevens gevonden voor dit e-mailadres" };
  return { row };
}

/**
 * Stap 3: kandidaat klikt 'Verwijder mij' → kandidaat-rij wordt verwijderd.
 * Audit-trail via voorstel_logs.
 */
export async function verwijderMij(formData: FormData) {
  const token = (formData.get("token") as string)?.trim();
  if (!token) redirect("/mijn-data");

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("mijn_data_tokens")
    .select("*")
    .eq("token", token)
    .single();
  if (!row || row.gebruikt_op || new Date(row.verloopt_op) < new Date() || !row.kandidaat_id) {
    redirect("/mijn-data");
  }

  // Audit info opslaan
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent") || null;

  // Token DIRECT als gebruikt markeren (eenmalig) — voorkomt herhaald gebruik.
  await admin.from("mijn_data_tokens")
    .update({ gebruikt_op: new Date().toISOString(), ip_adres: ip, user_agent: userAgent })
    .eq("id", row.id);

  // AVG art. 17: verwijder ALLE kandidaat-records met dit e-mailadres, niet
  // alleen de nieuwste — anders blijven dubbele inschrijvingen achter.
  const { data: kandidaten } = await admin
    .from("kandidaten")
    .select("id, tenant_id, email, cv_url")
    .eq("email", row.email);

  for (const k of kandidaten ?? []) {
    // Log audit-trail vóór de delete (kandidaat wordt verwijderd)
    if (k.tenant_id) {
      await admin.from("voorstel_logs").insert({
        tenant_id: k.tenant_id,
        kandidaat_id: k.id,
        event_type: "afwijzing",
        beschrijving: `Kandidaat heeft zelf verwijderverzoek ingediend via /mijn-data (AVG art. 17). IP: ${ip ?? "?"}`,
        zichtbaar_voor_kandidaat: false,
      });
    }
    // Ook het CV-bestand uit storage verwijderen (niet alleen de DB-rij).
    if (k.cv_url && !/^https?:\/\//i.test(k.cv_url)) {
      await admin.storage.from("cvs").remove([k.cv_url]).catch(() => {});
    }
    await admin.from("kandidaten").delete().eq("id", k.id);
  }

  revalidatePath("/kandidaten");
  redirect(`/mijn-data/${token}/verwijderd`);
}
