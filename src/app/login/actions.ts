"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { data: authData, error } = await supabase.auth.signInWithPassword(data);

  if (error || !authData?.user) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Login mislukt")}`);
  }

  // Single-device-policy: genereer nieuw apparaat-token, zet cookie + DB.
  // Hierdoor wordt elke andere actieve sessie op een ander apparaat
  // bij de volgende request gedwongen uit te loggen.
  const deviceToken = randomBytes(24).toString("hex");
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      actieve_device_token: deviceToken,
      laatst_actief_op: new Date().toISOString(),
    })
    .eq("id", authData.user.id);

  const cookieStore = await cookies();
  cookieStore.set("noah_device", deviceToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dagen
  });

  revalidatePath("/", "layout");
  redirect("/vacature-aanmaken");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Cookie wissen — laat profile.actieve_device_token staan zodat
  // andere apparaten van deze user gewoon doorwerken.
  const cookieStore = await cookies();
  cookieStore.delete("noah_device");

  revalidatePath("/", "layout");
  redirect("/login");
}
