import * as XLSX from "xlsx";

export type BellijstRow = {
  functie?: string;
  bedrijf?: string;
  plaats?: string;
  postcode?: string;
  telefoon?: string;
  website?: string;
  branche?: string;
  raw_data?: Record<string, unknown>;
};

/**
 * Fuzzy match een kolomheader naar onze veldnaam.
 */
function matchKolom(header: string): keyof BellijstRow | null {
  const h = header.toLowerCase().trim();
  if (/(functie|titel|vacature|baan|job\s*title)/.test(h)) return "functie";
  if (/(bedrijf|company|organisatie|werkgever)/.test(h)) return "bedrijf";
  if (/(plaats|stad|city|woonplaats|vestiging)/.test(h)) return "plaats";
  if (/(postcode|zip|postal)/.test(h)) return "postcode";
  if (/(telefoon|tel\b|phone|nummer|mobiel)/.test(h)) return "telefoon";
  if (/(website|url|domain|site|domein)/.test(h)) return "website";
  if (/(branche|sector|industry)/.test(h)) return "branche";
  return null;
}

/**
 * Parse een Excel-buffer naar bellijst-rows.
 * Pakt de eerste sheet, gebruikt eerste rij als headers.
 */
export function parseJobdiggerExcel(buf: ArrayBuffer): {
  naam: string;
  rows: BellijstRow[];
  headers: string[];
  totaal_rijen: number;
} {
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (json.length === 0) return { naam: sheetName || "Bellijst", rows: [], headers: [], totaal_rijen: 0 };

  // Map kolommen
  const headerKeys = Object.keys(json[0]);
  const kolomMap = new Map<string, keyof BellijstRow>();
  for (const k of headerKeys) {
    const m = matchKolom(k);
    if (m) kolomMap.set(k, m);
  }

  const rows: BellijstRow[] = json.map((r) => {
    const out: BellijstRow = { raw_data: {} };
    for (const [orig, veld] of kolomMap.entries()) {
      const val = String(r[orig] ?? "").trim();
      if (val) (out as Record<string, unknown>)[veld] = val;
    }
    // Stop alles wat we niet hebben gemapt in raw_data
    for (const k of headerKeys) {
      if (!kolomMap.has(k)) {
        out.raw_data![k] = r[k];
      }
    }
    return out;
  }).filter((r) => r.bedrijf || r.telefoon); // skip lege rijen

  return { naam: sheetName || "Bellijst", rows, headers: headerKeys, totaal_rijen: json.length };
}
