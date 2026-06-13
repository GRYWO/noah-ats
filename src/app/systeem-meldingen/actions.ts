"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

async function checkSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return { ok: false, user: null };
  }
  return { ok: true, user };
}

export async function plaatsSysteemMelding(formData: FormData): Promise<void> {
  const check = await checkSuperAdmin();
  if (!check.ok || !check.user) {
    console.error("[systeem-meldingen] niet geautoriseerd");
    return;
  }

  const type = formData.get("type") as string;
  const titel = (formData.get("titel") as string)?.trim();
  const bericht = (formData.get("bericht") as string)?.trim();

  if (!type || !["let_op", "update", "storing"].includes(type)) return;
  if (!titel || titel.length < 2) return;
  if (!bericht || bericht.length < 2) return;

  const admin = createAdminClient();

  // Eerst alle bestaande actieve meldingen deactiveren (1 banner tegelijk)
  await admin
    .from("systeem_meldingen")
    .update({ actief: false, gedeactiveerd_op: new Date().toISOString() })
    .eq("actief", true);

  const { error } = await admin.from("systeem_meldingen").insert({
    type,
    titel,
    bericht,
    actief: true,
    aangemaakt_door: check.user.id,
  });

  if (error) console.error("[systeem-meldingen] insert mislukt:", error.message);

  revalidatePath("/", "layout");
}

/**
 * Markeer voor de huidige user dat deze melding is weggeklikt.
 * Persistent in DB zodat hij ook op andere apparaten / browsers
 * niet meer verschijnt voor deze user.
 */
export async function dismissSysteemMeldingVoorUser(meldingId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !meldingId) return;

  const admin = createAdminClient();
  await admin
    .from("dismissed_systeem_meldingen")
    .upsert(
      { user_id: user.id, melding_id: meldingId },
      { onConflict: "user_id,melding_id" }
    );

  revalidatePath("/", "layout");
}

export async function deactiveerSysteemMelding(formData: FormData): Promise<void> {
  const check = await checkSuperAdmin();
  if (!check.ok) return;

  const id = formData.get("id") as string;
  if (!id) return;

  const admin = createAdminClient();
  await admin
    .from("systeem_meldingen")
    .update({ actief: false, gedeactiveerd_op: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/", "layout");
}
