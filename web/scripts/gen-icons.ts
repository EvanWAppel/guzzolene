/**
 * Generate PWA icons (192px + 512px) from an inline SVG.
 * Run once when the design changes: `npx tsx scripts/gen-icons.ts`
 */

import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#E91E63"/>
  <text x="50%" y="56%" font-size="380" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" font-weight="900"
        text-anchor="middle" dominant-baseline="central" fill="white">G</text>
</svg>`;

async function main() {
  const out = resolve(__dirname, "../public/icons");
  mkdirSync(out, { recursive: true });

  for (const size of [192, 512]) {
    const path = resolve(out, `icon-${size}.png`);
    await sharp(Buffer.from(SVG))
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(path);
    console.log(`Wrote ${path}`);
  }

  writeFileSync(resolve(out, "source.svg"), SVG);
  console.log(`Wrote ${resolve(out, "source.svg")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
