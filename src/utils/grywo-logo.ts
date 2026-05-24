import fs from "fs";
import path from "path";

let cachedBase64: string | null = null;

/**
 * Lees het GRYWO logo van public/ en geef de base64 versie terug.
 * Voor gebruik in HTML emails (inline data URI).
 */
export function getGrywoLogoBase64(): string {
  if (cachedBase64) return cachedBase64;
  try {
    // PNG eerst (beter ondersteund door mail clients), webp als fallback
    const pngPath = path.join(process.cwd(), "public", "grywo-logo.png");
    if (fs.existsSync(pngPath)) {
      cachedBase64 = fs.readFileSync(pngPath).toString("base64");
      return cachedBase64;
    }
    const webpPath = path.join(process.cwd(), "public", "grywo-logo.webp");
    cachedBase64 = fs.readFileSync(webpPath).toString("base64");
    return cachedBase64;
  } catch {
    return "";
  }
}

export function getGrywoLogoDataUri(): string {
  const b64 = getGrywoLogoBase64();
  if (!b64) return "";
  try {
    const pngPath = path.join(process.cwd(), "public", "grywo-logo.png");
    if (fs.existsSync(pngPath)) return `data:image/png;base64,${b64}`;
  } catch {}
  return `data:image/webp;base64,${b64}`;
}
