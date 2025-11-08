// scripts/build-favicon.mjs
import fs from 'node:fs/promises';
import sharp from 'sharp';
import toIco from 'to-ico';

const SRC_SVG = 'public/favicon.svg';
const OUT_ICO = 'public/favicon.ico';

// Render PNGs at multiple sizes, then pack into a single .ico
const sizes = [16, 32, 48];

const svg = await fs.readFile(SRC_SVG, 'utf8');

const pngBuffers = await Promise.all(
  sizes.map((s) =>
    sharp(Buffer.from(svg))
      .resize(s, s, { fit: 'contain' })
      .png({ compressionLevel: 9 })
      .toBuffer()
  )
);

const ico = await toIco(pngBuffers);
await fs.writeFile(OUT_ICO, ico);

console.log(`Created ${OUT_ICO} with sizes: ${sizes.join(', ')}px`);
