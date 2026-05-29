import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";

export type DemoRol = "admin" | "bureau_admin" | "recruiter" | "setter";

export const COOKIE_NAAM = "noah-view-as";

/**
 * Leest de "view-as" override uit cookies. Geeft null terug als geen override.
 *
 * GEBRUIK ALLEEN voor super-admin (Yorith) — andere users mogen dit niet
 * triggeren. De check op super-admin gebeurt in de actions die de cookie
 * zetten, niet hier (deze helper is alleen voor lezen).
 */
export async function leesViewAs(): Promise<DemoRol | null> {
  const c = await cookies();
  const waarde = c.get(COOKIE_NAAM)?.value;
  if (waarde === "admin" || waarde === "bureau_admin" || waarde === "recruiter" || waarde === "setter") {
    return waarde;
  }
  return null;
}

/**
 * Bepaalt de effectieve rol voor UI-rendering en menu-permissions.
 * Voor super-admin met view-as actief: gebruik de override.
 * Voor iedereen anders: gebruik de echte rol.
 */
export function effectieveRol(
  echteRol: string | null | undefined,
  isSuperAdmin: boolean,
  viewAs: DemoRol | null,
): { rol: string; demoActief: boolean } {
  if (isSuperAdmin && viewAs) {
    return { rol: viewAs, demoActief: true };
  }
  return { rol: echteRol ?? "setter", demoActief: false };
}

/**
 * All-in-one helper voor server-pages: haalt user, profile, en respecteert
 * demo-modus cookie. Gebruik dit in plaats van handmatige checks zodat de
 * UI overal de juiste rol-view toont voor super-admin in demo-modus.
 *
 * BELANGRIJK: dit is alleen voor UI-rendering. Voor data-security
 * (server actions die schrijven) moet je nog steeds de echte profile.rol
 * en isSuperAdminEmail() gebruiken.
 */
export async function getViewerRol(): Promise<{
  rol: string;
  isSetter: boolean;
  isRecruiter: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  demoActief: boolean;
  echteIsSuperAdmin: boolean;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      rol: "setter",
      isSetter: true,
      isRecruiter: false,
      isAdmin: false,
      isSuperAdmin: false,
      demoActief: false,
      echteIsSuperAdmin: false,
    };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  const echteIsSuperAdmin = isSuperAdminEmail(user.email);
  const viewAs = await leesViewAs();
  const { rol, demoActief } = effectieveRol(profile?.rol, echteIsSuperAdmin, viewAs);

  // bureau_admin telt voor UI/permissions als "admin", maar krijgt simpel dashboard
  const isBureauAdminDemo = rol === "bureau_admin";

  return {
    rol: isBureauAdminDemo ? "admin" : rol,
    isSetter: rol === "setter",
    isRecruiter: rol === "recruiter",
    isAdmin: rol === "admin" || rol === "bureau_admin",
    isBureauAdminDemo,
    isSuperAdmin: echteIsSuperAdmin && !demoActief,
    demoActief,
    echteIsSuperAdmin,
  };
}
