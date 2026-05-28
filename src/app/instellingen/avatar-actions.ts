"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Geen bestand" };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Max 2MB" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: false, cacheControl: "3600" });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);

  // Profile updaten
  const { error: dbErr } = await supabase
    .from("profiles")
    .update({ avatar_url: pub.publicUrl })
    .eq("id", user.id);
  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/instellingen");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function verwijderAvatar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  // Oude bestanden in de eigen folder weggooien
  const { data: list } = await supabase.storage.from("avatars").list(user.id);
  if (list && list.length > 0) {
    const paths = list.map((f) => `${user.id}/${f.name}`);
    await supabase.storage.from("avatars").remove(paths);
  }

  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  revalidatePath("/instellingen");
  revalidatePath("/dashboard");
  return { ok: true };
}
