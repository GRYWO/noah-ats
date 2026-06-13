import fs from "fs";
import path from "path";

const cache: Record<string, string> = {};

function leesPubliek(bestand: string): string {
  if (cache[bestand]) return cache[bestand];
  try {
    const p = path.join(process.cwd(), "public", bestand);
    if (!fs.existsSync(p)) return "";
    cache[bestand] = fs.readFileSync(p).toString("base64");
    return cache[bestand];
  } catch {
    return "";
  }
}

/** Paarse Noah recruitment-wordmark als base64 (voor witte achtergrond). */
export function getGrywoLogoBase64(): string {
  return leesPubliek("grywo-logo.png");
}

/** Witte Noah recruitment-wordmark als base64 (voor paarse e-mail header). */
export function getGrywoLogoWitBase64(): string {
  return leesPubliek("grywo-logo-wit.png");
}

/** Paarse versie als data URI — direct te gebruiken in <img src="..."> */
export function getGrywoLogoDataUri(): string {
  const b64 = getGrywoLogoBase64();
  return b64 ? `data:image/png;base64,${b64}` : "";
}

/** Witte versie als data URI — voor e-mail header op paarse achtergrond */
export function getGrywoLogoWitDataUri(): string {
  const b64 = getGrywoLogoWitBase64();
  return b64 ? `data:image/png;base64,${b64}` : "";
}
