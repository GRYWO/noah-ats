/**
 * Check of een email-adres super-admin is.
 * Super-admins kunnen alle bureaus (tenants) zien en beheren.
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === (process.env.SUPER_ADMIN_EMAIL ?? "").toLowerCase();
}
