"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

type Result = { ok?: boolean; error?: string };

async function checkSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return { error: "Alleen super-admin mag dit", user: null };
  }
  return { error: null, user };
}

export async function plaatsSysteemMelding(formData: FormData): Promise<Result> {
  const check = await checkSuperAdmin();
  if (check.error || !check.user) return { error: check.error ?? "Niet ingelogd" };

  const type = formData.get("type") as string;
  const titel = (formData.get("titel") as string)?.trim();
  const bericht = (formData.get("bericht") as string)?.trim();

  if (!type || !["let_op", "update", "storing"].includes(type)) {
    return { error: "Kies een type" };
  }
  if (!titel || titel.length < 2) return { error: "Vul een titel in" };
  if (!bericht || bericht.length < 2) return { error: "Vul een bericht in" };

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

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deactiveerSysteemMelding(formData: FormData): Promise<Result> {
  const check = await checkSuperAdmin();
  if (check.error) return { error: check.error };

  const id = formData.get("id") as string;
  if (!id) return { error: "Geen ID" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("systeem_meldingen")
    .update({ actief: false, gedeactiveerd_op: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
