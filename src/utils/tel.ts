/**
 * URL voor klik-to-call. Standaard 'bubble' (RedCactus Bubble365).
 * Wijzig via env var NEXT_PUBLIC_TEL_SCHEME als de extensie een ander schema gebruikt.
 *
 * Bekende waardes:
 *   'tel'        → macOS opent FaceTime
 *   'bubble'     → RedCactus Bubble365 (Voys)
 *   'redcactus'  → oudere RedCactus build
 *   'callto'     → Skype / oude integraties
 *   'sip'        → directe SIP-clients
 */
const SCHEME = process.env.NEXT_PUBLIC_TEL_SCHEME ?? "bubble";

/**
 * Normaliseer een nummer: alleen + en cijfers behouden.
 */
function normaliseer(nummer: string): string {
  return nummer.replace(/[^\d+]/g, "");
}

/**
 * Bouw een klik-to-call URL.
 */
export function telLink(nummer: string | null | undefined): string {
  if (!nummer) return "#";
  const n = normaliseer(nummer);
  return `${SCHEME}:${n}`;
}
