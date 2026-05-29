import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

/**
 * Sales-admin = super-admin OR user met flag kan_abonnementen_beheren.
 * Mag bureaus aanmaken + abonnementen activeren.
 * Mag GEEN plannen/tarieven aanpassen (alleen super-admin).
 */
export async function isSalesAdmin(user: { id: string; email?: string | null } | null): Promise<boolean> {
  if (!user) return false;
  if (isSuperAdminEmail(user.email)) return true;

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("kan_abonnementen_beheren")
    .eq("id", user.id)
    .single();
  return !!data?.kan_abonnementen_beheren;
}
