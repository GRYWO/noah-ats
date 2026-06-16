/**
 * Check of een email-adres super-admin is.
 * Super-admins zien alle bureaus, beheren tenants, krijgen admin-tools.
 *
 * Alleen Yorith is super-admin. Wouter/Pepijn zijn 'admin' op tenant-niveau
 * (via profiles.rol = 'admin'). Die zien hun bureau wel volledig maar geen
 * cross-tenant beheer.
 *
 * Extra adressen kunnen worden meegegeven via env-var SUPER_ADMIN_EMAIL
 * (komma-gescheiden lijst toegestaan).
 */
const SUPER_ADMIN_EMAILS: ReadonlySet<string> = new Set([
  "yorith@noah-recruitment.nl",
  // Backwards-compat: oude mailadressen blijven super-admin zodat een
  // accidentele login met legacy-adres niet de access verliest.
  "yorith@grywo.nl",
  "yorithh93@gmail.com",
]);

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (SUPER_ADMIN_EMAILS.has(lower)) return true;
  // Fallback voor backwards-compat met env-var SUPER_ADMIN_EMAIL.
  // Ondersteunt zowel "single@adres.nl" als "a@x.nl,b@y.nl".
  const envRaw = (process.env.SUPER_ADMIN_EMAIL ?? "").toLowerCase();
  if (!envRaw) return false;
  return envRaw.split(",").map((s) => s.trim()).includes(lower);
}
