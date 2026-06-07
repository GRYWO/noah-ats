// Maakt een favicon.ico (multi-size: 16/32/48) met witte 'n' + gele dot
// op paarse achtergrond. Geplaatst in src/app/favicon.ico zodat Next.js
// hem als primaire favicon serveert (overschrijft de gegenereerde PNG-versie
// in Chrome's adresbalk cache).
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const PAARS = "#333399";
const WIT = "#ffffff";
const GEEL = "#ffd84d";

function svg(size) {
  const fontSize = Math.round(size * 0.78);
  const baselineY = Math.round(size * 0.78);
  const nX = Math.round(size * 0.20);
  const dotR = Math.round(size * 0.085);
  const dotCX = Math.round(size * 0.76);
  const dotCY = Math.round(size * 0.72);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${PAARS}"/>
  <text x="${nX}" y="${baselineY}"
        font-family="Helvetica, Arial, sans-serif"
        font-weight="900"
        font-size="${fontSize}"
        fill="${WIT}"
        letter-spacing="-${Math.round(size * 0.03)}">n</text>
  <circle cx="${dotCX}" cy="${dotCY}" r="${dotR}" fill="${GEEL}"/>
</svg>`;
}

// Genereer PNG voor 32x32 — als basis voor de .ico
const png32 = await sharp(Buffer.from(svg(32))).png().toBuffer();
const png16 = await sharp(Buffer.from(svg(16))).png().toBuffer();
const png48 = await sharp(Buffer.from(svg(48))).png().toBuffer();

// Multi-size .ico bouwen (handgeschreven minimal ICO container)
// Header: 6 bytes — 0,0 / 1 (icon) / count
// Per entry: 16 bytes — w,h,palette,reserved,planes,bpp,size,offset
function maakIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, png } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

const ico = maakIco([
  { size: 16, png: png16 },
  { size: 32, png: png32 },
  { size: 48, png: png48 },
]);

await writeFile("src/app/favicon.ico", ico);
await writeFile("public/favicon.ico", ico);
console.log("→ src/app/favicon.ico (multi-size 16/32/48)");
console.log("→ public/favicon.ico (fallback)");
