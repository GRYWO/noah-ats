// Noah ATS icon generator — vol blauw vlak met witte "n" + gele dot
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const PAARS = "#333399";
const WIT = "#ffffff";
const GEEL = "#ffd84d";

function svg(size, { rounded } = { rounded: true }) {
  // Schaling: de "n" vult het vlak goed, dot rechtsonder
  const r = rounded ? Math.round(size * 0.18) : 0;
  const fontSize = Math.round(size * 0.78);
  // baseline ongeveer 78% omlaag zodat "n" gecentreerd staat
  const baselineY = Math.round(size * 0.78);
  const nX = Math.round(size * 0.20);
  const dotR = Math.round(size * 0.085);
  const dotCX = Math.round(size * 0.76);
  const dotCY = Math.round(size * 0.72);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${PAARS}"/>
  <text x="${nX}" y="${baselineY}"
        font-family="Helvetica, Arial, sans-serif"
        font-weight="900"
        font-size="${fontSize}"
        fill="${WIT}"
        letter-spacing="-${Math.round(size * 0.03)}">n</text>
  <circle cx="${dotCX}" cy="${dotCY}" r="${dotR}" fill="${GEEL}"/>
</svg>`;
}

async function maakPng(size, pad, rounded = true) {
  const buffer = await sharp(Buffer.from(svg(size, { rounded })))
    .png()
    .toBuffer();
  await writeFile(pad, buffer);
  console.log("→", pad, `(${size}x${size})`);
}

await maakPng(192, "src/app/icon.png");
await maakPng(512, "src/app/apple-icon.png");
await maakPng(192, "public/icon-192.png");
await maakPng(512, "public/icon-512.png");
// favicon vierkant, geen ronding (oude browsers tonen vol vlak)
await maakPng(32, "public/favicon-32.png", false);

console.log("Klaar.");
