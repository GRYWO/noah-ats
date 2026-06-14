/**
 * Check of een email-adres super-admin is.
 * Super-admins zien alle bureaus, beheren tenants, krijgen admin-tools.
 *
 * Alleen Yorith is super-admin. Wouter/Pepijn zijn 'admin' op tenant-niveau
 * (via profiles.rol = 'admin') — die zien hun bureau wel volledig maar geen
 * cross-tenant beheer.
 *
 * Beide domeinvarianten worden geaccepteerd zodat de cutover van @grywo.nl
 * naar @noah-recruitment.nl geen lockout veroorzaakt.
 */
const SUPER_ADMIN_EMAILS: ReadonlySet<string> = new Set([
  "yorith@grywo.nl",
  "yorith@noah-recruitment.nl",
  "yorith@grywo.com",
]);

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (SUPER_ADMIN_EMAILS.has(lower)) return true;
  // Fallback voor backwards-compat met env-var SUPER_ADMIN_EMAIL
  const envEmail = (process.env.SUPER_ADMIN_EMAIL ?? "").toLowerCase();
  return envEmail !== "" && lower === envEmail;
}
