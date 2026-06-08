// Migadu Admin API — mailboxen automatisch aanmaken op @grywo.nl
// Env vereist: MIGADU_API_USER, MIGADU_API_KEY (zie noah-web setup)

const BASE = "https://api.migadu.com/v1";
const DOMEIN = "grywo.nl";

export function migaduGeconfigureerd(): boolean {
  return Boolean(process.env.MIGADU_API_USER && process.env.MIGADU_API_KEY);
}

function authHeader(): string {
  const u = process.env.MIGADU_API_USER ?? "";
  const k = process.env.MIGADU_API_KEY ?? "";
  return "Basic " + Buffer.from(`${u}:${k}`).toString("base64");
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/**
 * Voornaam → local-part voor mailbox.
 * Lowercase, accenten weg, alleen a-z0-9.
 */
export function maakLocalPart(voornaam: string): string {
  return voornaam
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Maakt voornaam@grywo.nl aan bij Migadu. Idempotent — als hij al bestaat,
 * krijg je {ok:false, alBestaat:true} terug.
 */
export async function maakNoahMailbox(opts: {
  voornaam: string;
  achternaam: string;
  wachtwoord: string;
}): Promise<{ ok: boolean; email: string; alBestaat?: boolean; error?: string }> {
  const localPart = maakLocalPart(opts.voornaam);
  const email = `${localPart}@${DOMEIN}`;

  if (!localPart) return { ok: false, email, error: "Lege voornaam" };
  if (!migaduGeconfigureerd()) {
    return { ok: false, email, error: "Migadu niet geconfigureerd (MIGADU_API_USER/KEY)" };
  }

  const bestaat = await call(`/domains/${DOMEIN}/mailboxes/${localPart}`);
  if (bestaat.ok) return { ok: false, email, alBestaat: true };

  const r = await call(`/domains/${DOMEIN}/mailboxes`, {
    method: "POST",
    body: JSON.stringify({
      local_part: localPart,
      name: `${opts.voornaam} ${opts.achternaam}`.trim(),
      password: opts.wachtwoord,
    }),
  });

  if (r.ok) return { ok: true, email };
  const msg = (r.data && (r.data.error || r.data.message)) || `Migadu fout ${r.status}`;
  return { ok: false, email, error: typeof msg === "string" ? msg : JSON.stringify(msg) };
}

/**
 * Verwijdert voornaam@grywo.nl uit Migadu.
 */
export async function verwijderNoahMailbox(voornaam: string): Promise<{ ok: boolean; error?: string }> {
  const localPart = maakLocalPart(voornaam);
  if (!localPart) return { ok: false, error: "Lege voornaam" };
  if (!migaduGeconfigureerd()) {
    return { ok: false, error: "Migadu niet geconfigureerd" };
  }
  const r = await call(`/domains/${DOMEIN}/mailboxes/${localPart}`, { method: "DELETE" });
  if (r.ok || r.status === 404) return { ok: true };
  const msg = (r.data && (r.data.error || r.data.message)) || `Migadu fout ${r.status}`;
  return { ok: false, error: typeof msg === "string" ? msg : JSON.stringify(msg) };
}
