/**
 * Voys / VoIPGRID API integratie.
 *
 * ClickToDial-flow:
 *   1. POST /api/clicktodial/ met { phonenumber, b_number }
 *   2. VoIPGRID belt eerst de phonenumber (jouw toestel)
 *   3. Zodra je opneemt, belt VoIPGRID het b_number
 *   4. Beide kanten verbonden
 */

const VOIPGRID_API = "https://partner.voipgrid.nl/api/clicktodial/";

function authHeader(): string {
  const token = process.env.VOYS_API_TOKEN;
  if (!token) throw new Error("VOYS_API_TOKEN niet geconfigureerd");
  return `Token ${token}`;
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
