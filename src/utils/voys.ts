/**
 * Voys / VoIPGRID API integratie.
 *
 * ClickToDial-flow:
 *   1. POST /api/clicktodial/ met { phonenumber, b_number }
 *   2. VoIPGRID belt eerst de phonenumber (jouw toestel)
 *   3. Zodra je opneemt, belt VoIPGRID het b_number
 *   4. Beide kanten verbonden
 */

const VOYS_API = "https://api.voys.nl/api/v2";
const VOIPGRID_API = `${VOYS_API}/clicktodial/`;

function authHeader(prefix: "Bearer" | "Token" = "Bearer"): string {
  const token = process.env.VOYS_API_TOKEN;
  if (!token) throw new Error("VOYS_API_TOKEN niet geconfigureerd");
  return `${prefix} ${token}`;
}

/**
 * Normaliseer een NL nummer naar +31xxxxxxxxx formaat.
 */
function normaliseerNummer(nummer: string): string {
  const cijfers = nummer.replace(/[^\d+]/g, "");
  if (cijfers.startsWith("+")) return cijfers;
  if (cijfers.startsWith("00")) return "+" + cijfers.slice(2);
  if (cijfers.startsWith("0")) return "+31" + cijfers.slice(1);
  return cijfers;
}

/**
 * Haal alle users op binnen jouw Voys client.
 * Geeft email + nummer terug zodat we per setter kunnen matchen.
 */
export async function voysListUsers(): Promise<{
  ok: boolean;
  status: number;
  users: Array<{ email: string | null; first_name: string | null; last_name: string | null; mobile_nr: string | null; internal_number: string | null; raw: Record<string, unknown> }>;
  raw?: unknown;
  pogingen?: Array<{ url: string; auth: string; status: number }>;
}> {
  const clientUuid = process.env.VOYS_CLIENT_UUID;

  // Probeer meerdere endpoint/auth-combinaties — Voys gebruikt verschillende
  // varianten afhankelijk van API en token-type.
  const endpoints = [
    `${VOYS_API}/users/`,
    `${VOYS_API}/users/?client__uuid=${clientUuid}`,
    `${VOYS_API}/clients/${clientUuid}/users/`,
  ];
  const authTypes: Array<"Bearer" | "Token"> = ["Bearer", "Token"];

  const pogingen: Array<{ url: string; auth: string; status: number }> = [];

  for (const url of endpoints) {
    for (const auth of authTypes) {
      const res = await fetch(url, {
        headers: {
          Authorization: authHeader(auth),
          Accept: "application/json",
        },
      });
      pogingen.push({ url, auth, status: res.status });
      if (!res.ok) continue;
      const tekst = await res.text();
      let data: unknown;
      try { data = JSON.parse(tekst); } catch { continue; }

      // Voys/VoIPGRID heeft soms { results: [...] } of direct een array
      const arr = (data as { results?: unknown[] })?.results
        ?? (Array.isArray(data) ? data : null);
      if (!arr) continue;

      const users = arr.map((u) => {
        const obj = u as Record<string, unknown>;
        return {
          email: (obj.email as string) ?? null,
          first_name: (obj.first_name as string) ?? null,
          last_name: (obj.last_name as string) ?? null,
          mobile_nr: (obj.mobile_nr as string) ?? (obj.mobile as string) ?? null,
          internal_number: (obj.internal_number as string) ?? (obj.extension as string) ?? null,
          raw: obj,
        };
      });

      return { ok: true, status: res.status, users, raw: data, pogingen };
    }
  }

  return { ok: false, status: 0, users: [], pogingen };
}

/**
 * Start een Click-to-Dial gesprek.
 * @param eigenNummer Jouw toestel — gaat eerst over. Bv. +31612345678.
 * @param doelNummer Het nummer dat gebeld moet worden zodra jij opneemt.
 */
export async function voysClickToDial(eigenNummer: string, doelNummer: string) {
  const phonenumber = normaliseerNummer(eigenNummer);
  const b_number = normaliseerNummer(doelNummer);

  const res = await fetch(VOIPGRID_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({ phonenumber, b_number }),
  });

  const tekst = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(tekst); } catch { data = tekst; }

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
}
