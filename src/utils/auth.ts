/**
 * Check of een email-adres super-admin is.
 * Super-admins kunnen alle bureaus (tenants) zien en beheren.
 *
 * Allowlist bevat BEIDE domeinvarianten (grywo.nl + noah-recruitment.nl)
 * tijdens en na de domein-migratie zodat niemand uit zijn rechten valt.
 * De env-var SUPER_ADMIN_EMAIL blijft als extra fallback geldig.
 */
const SUPER_ADMIN_EMAILS: ReadonlySet<string> = new Set([
  "yorith@grywo.nl",
  "yorith@noah-recruitment.nl",
  "yorith@grywo.com",
  "pepijn@grywo.nl",
  "pepijn@noah-recruitment.nl",
  "wouter@grywo.nl",
  "wouter@noah-recruitment.nl",
]);

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (SUPER_ADMIN_EMAILS.has(lower)) return true;
  // Fallback voor backwards-compat: env-var SUPER_ADMIN_EMAIL
  const envEmail = (process.env.SUPER_ADMIN_EMAIL ?? "").toLowerCase();
  return envEmail !== "" && lower === envEmail;
}
