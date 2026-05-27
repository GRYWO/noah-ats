/**
 * Centrale lijst van menu-items waarop super-admin (Yorith) per user
 * rechten kan toekennen via een checkbox-set in de bewerk-modal.
 */
export type MenuKey =
  | "dashboard"
  | "bureaus"
  | "kandidaten"
  | "kanban"
  | "voorstellen"
  | "agenda"
  | "opdrachtgevers"
  | "jobdigger"
  | "robin"
  | "inbox"
  | "coaching"
  | "setters"
  | "instellingen";

export const MENU_KEYS: { key: MenuKey; label: string; uitleg?: string }[] = [
  { key: "dashboard",      label: "Dashboard" },
  { key: "bureaus",        label: "Bureaus",        uitleg: "Alleen super-admin" },
  { key: "kandidaten",     label: "Kandidaten" },
  { key: "kanban",         label: "Kanban" },
  { key: "voorstellen",    label: "Voorstellen" },
  { key: "agenda",         label: "Agenda" },
  { key: "opdrachtgevers", label: "CRM (Opdrachtgevers)" },
  { key: "jobdigger",      label: "Jobdigger" },
  { key: "robin",          label: "Robin (AI)" },
  { key: "inbox",          label: "E-mail / Inbox" },
  { key: "coaching",       label: "Coaching" },
  { key: "setters",        label: "Users" },
  { key: "instellingen",   label: "Instellingen" },
];

/**
 * Bepaal of een menu-item zichtbaar moet zijn op basis van permissions.
 * - perms = null/undefined → standaard zichtbaar (rol bepaalt de rest)
 * - perms[key] = false → onzichtbaar
 * - perms[key] = true of ontbreekt in object → zichtbaar
 */
export function magMenuZien(
  perms: Record<string, boolean> | null | undefined,
  key: MenuKey,
): boolean {
  if (!perms) return true;
  // Als de key niet expliciet false is, dan zichtbaar
  return perms[key] !== false;
}
