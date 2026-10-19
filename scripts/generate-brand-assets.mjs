// Generates PWA icons, the Apple touch icon and the default OpenGraph image.
//   node scripts/generate-brand-assets.mjs
import sharp from "sharp";
import fs from "node:fs";

const NAVY = "#0b1830";
const WINE = "#7d1a35";
const GOLD = "#c8a35a";

function iconSvg(size, { padding = 0.18, rounded = true } = {}) {
  const r = rounded ? size * 0.22 : 0;
  const d = size * (1 - padding * 2) * 0.62; // diamond side
  const c = size / 2;
  const ring = d * 1.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><radialGradient id="g" cx="75%" cy="20%" r="80%"><stop offset="0" stop-color="${WINE}" stop-opacity=".55"/><stop offset="1" stop-color="${NAVY}" stop-opacity="0"/></radialGradient></defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="${NAVY}"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  <rect x="${c - ring / 2}" y="${c - ring / 2}" width="${ring}" height="${ring}" fill="none" stroke="${GOLD}" stroke-opacity=".6" stroke-width="${size * 0.018}" transform="rotate(45 ${c} ${c})"/>
  <rect x="${c - d / 2}" y="${c - d / 2}" width="${d}" height="${d}" fill="${WINE}" transform="rotate(45 ${c} ${c})"/>
</svg>`;
}

async function png(svg, file) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
  console.log("✔", file);
}

await png(iconSvg(192), "public/icons/icon-192.png");
await png(iconSvg(512), "public/icons/icon-512.png");
await png(iconSvg(512, { padding: 0.28, rounded: false }), "public/icons/maskable-512.png");
await png(iconSvg(180, { rounded: false }), "src/app/apple-icon.png");

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="80%" cy="35%" r="60%"><stop offset="0" stop-color="${WINE}" stop-opacity=".55"/><stop offset="1" stop-color="${NAVY}" stop-opacity="0"/></radialGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NAVY}"/><stop offset="1" stop-color="#10223f"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="930" y="160" width="300" height="300" fill="none" stroke="${GOLD}" stroke-opacity=".35" stroke-width="2" transform="rotate(45 1080 310)"/>
  <rect x="1000" y="230" width="160" height="160" fill="${WINE}" opacity=".9" transform="rotate(45 1080 310)"/>
  <g transform="translate(96 150)">
    <rect x="0" y="0" width="26" height="26" fill="${WINE}" transform="rotate(45 13 13)"/>
    <text x="52" y="24" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="700" fill="#fff">Nur Karim</text>
  </g>
  <line x1="96" y1="262" x2="150" y2="262" stroke="${GOLD}" stroke-width="2"/>
  <text x="166" y="268" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="5" fill="${GOLD}">КІТАП ДҮКЕНІ</text>
  <text x="96" y="350" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="52" fill="#fff">Діни, тарихи және танымдық</text>
  <text x="96" y="416" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="52" fill="#fff">кітаптар</text>
  <text x="96" y="500" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#ffffff" fill-opacity=".7">Қағаз және электронды кітаптар · Қазақстан бойынша жеткізу · Досыңа сыйла</text>
</svg>`;
await png(og, "src/app/opengraph-image.png");
fs.writeFileSync("src/app/opengraph-image.alt.txt", "Nur Karim — діни, тарихи және танымдық кітаптар дүкені");
console.log("✔ src/app/opengraph-image.alt.txt");
