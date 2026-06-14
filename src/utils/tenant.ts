import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";

export type Profiel = {
  id: string;
  tenant_id: string | null;
  rol: string | null;
  email: string | null;
  isSuper: boolean;
};

// Huidige ingelogde gebruiker + diens profiel (tenant_id, rol). null = niet ingelogd.
// Gebruik dit in server actions/routes om tenant-isolatie en rollen af te dwingen.
export async function huidigProfiel(): Promise<Profiel | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();
  return {
    id: user.id,
    tenant_id: (data?.tenant_id as string) ?? null,
    rol: (data?.rol as string) ?? null,
    email: user.email ?? null,
    isSuper: isSuperAdminEmail(user.email),
  };
}
