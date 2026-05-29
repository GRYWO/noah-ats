"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export async function getContractSamenvattingUrl(verzoekId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) return null;
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("contract_verzoeken")
    .select("samenvatting_pad")
    .eq("id", verzoekId)
    .single();
  if (!c?.samenvatting_pad) return null;
  const { data } = await admin.storage.from("contracten").createSignedUrl(c.samenvatting_pad, 60 * 60);
  return data?.signedUrl ?? null;
}
