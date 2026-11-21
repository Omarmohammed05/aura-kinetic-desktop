'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const OUT_PATH = path.join(__dirname, '..', 'build', 'icon.png');

const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="halo" cx="50%" cy="50%" r="48%">
      <stop offset="0%" stop-color="#D9F99D" stop-opacity="0.32" />
      <stop offset="100%" stop-color="#0B0B0F" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect x="32" y="32" width="960" height="960" rx="224" fill="#0B0B0F" />
  <rect x="44" y="44" width="936" height="936" rx="212" fill="none" stroke="#27272A" stroke-width="16" />
  <circle cx="512" cy="512" r="340" fill="url(#halo)" />
  <circle cx="512" cy="512" r="168" fill="#D9F99D" />
</svg>
`.trim();

async function main() {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  await sharp(Buffer.from(ICON_SVG))
    .resize(1024, 1024)
    .png({ compressionLevel: 9 })
    .toFile(OUT_PATH);
  const stat = fs.statSync(OUT_PATH);
  console.log(`Generated placeholder icon: ${OUT_PATH} (${stat.size} bytes, 1024x1024 PNG)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
