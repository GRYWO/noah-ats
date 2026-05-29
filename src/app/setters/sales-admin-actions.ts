"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { revalidatePath } from "next/cache";

export async function toggleSalesAdmin(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return { ok: false, error: "Alleen super-admin" };
  }
  const admin = createAdminClient();
  const { data: huidig } = await admin
    .from("profiles")
    .select("kan_abonnementen_beheren")
    .eq("id", userId)
    .single();
  await admin
    .from("profiles")
    .update({ kan_abonnementen_beheren: !huidig?.kan_abonnementen_beheren })
    .eq("id", userId);
  revalidatePath("/setters");
  return { ok: true };
}
