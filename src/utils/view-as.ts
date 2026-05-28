import { cookies } from "next/headers";

export type DemoRol = "admin" | "recruiter" | "setter";

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
  if (waarde === "admin" || waarde === "recruiter" || waarde === "setter") {
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
