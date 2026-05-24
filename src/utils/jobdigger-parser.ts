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
  if (!h) return null;
  if (/(functie|titel|vacature|baan|job\s*title)/.test(h)) return "functie";
  if (/(bedrijf|company|organisatie|werkgever|naam$|^naam)/.test(h)) return "bedrijf";
  if (/(plaats|stad|city|woonplaats|vestiging|locatie|gemeente)/.test(h)) return "plaats";
  if (/(postcode|zip|postal)/.test(h)) return "postcode";
  if (/(telefoon|tel\b|phone|nummer|mobiel|tel\.|telnr)/.test(h)) return "telefoon";
  if (/(website|url|domain|site|domein|web)/.test(h)) return "website";
  if (/(branche|sector|industry|categorie|industrie)/.test(h)) return "branche";
  return null;
}

/**
 * Parse een Excel-buffer naar bellijst-rows.
 * Detecteert dynamisch de header-rij (Jobdigger heeft soms een lege/titel rij bovenaan).
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

  // Lees als 2D array zodat we kunnen kiezen welke rij headers zijn
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  if (aoa.length === 0) {
    return { naam: sheetName || "Bellijst", rows: [], headers: [], totaal_rijen: 0 };
  }

  // Zoek de header-rij: eerste rij waarvan ≥2 cellen niet-leeg zijn EN minstens 1 cel matcht
  // op een bekende kolomnaam (bedrijf, telefoon, plaats, etc.)
  let headerRowIdx = -1;
  const maxZoek = Math.min(aoa.length, 15);
  for (let i = 0; i < maxZoek; i++) {
    const row = aoa[i] as unknown[];
    const cellen = row.map(c => String(c ?? "").trim());
    const nietLeeg = cellen.filter(Boolean).length;
    if (nietLeeg < 2) continue;
    const heeftMatch = cellen.some(c => matchKolom(c));
    if (heeftMatch) {
      headerRowIdx = i;
      break;
    }
  }

  // Geen herkenbare header gevonden — probeer rij 0 als laatste poging
  if (headerRowIdx === -1) {
    return {
      naam: sheetName || "Bellijst",
      rows: [],
      headers: (aoa[0] as unknown[] | undefined)?.map(c => String(c ?? "")) ?? [],
      totaal_rijen: aoa.length,
    };
  }

  const headers = (aoa[headerRowIdx] as unknown[]).map(h => String(h ?? "").trim());
  const dataRows = aoa.slice(headerRowIdx + 1) as unknown[][];

  // Map kolom-index naar veld
  const kolomMap = new Map<number, keyof BellijstRow>();
  for (let i = 0; i < headers.length; i++) {
    const m = matchKolom(headers[i]);
    if (m) kolomMap.set(i, m);
  }

  const rows: BellijstRow[] = dataRows.map((row) => {
    const out: BellijstRow = { raw_data: {} };
    for (const [idx, veld] of kolomMap.entries()) {
      const val = String(row[idx] ?? "").trim();
      if (val) (out as Record<string, unknown>)[veld] = val;
    }
    for (let i = 0; i < headers.length; i++) {
      if (!kolomMap.has(i) && headers[i]) {
        out.raw_data![headers[i]] = row[i];
      }
    }
    return out;
  }).filter((r) => r.bedrijf || r.telefoon);

  return {
    naam: sheetName || "Bellijst",
    rows,
    headers,
    totaal_rijen: aoa.length,
  };
}
