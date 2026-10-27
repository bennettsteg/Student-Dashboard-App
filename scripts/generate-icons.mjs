/**
 * Generates the PWA icon set from the StudyDesk cap logo: a white graduation cap (lucide's
 * `graduation-cap` glyph, the same one the sidebar brand mark uses) on the oxblood
 * primary (#810505) tile seen in the design mockups.
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs (committed; re-run only when the logo changes):
 *   public/icons/icon-192.png, icon-512.png            "any" icons, rounded tile
 *   public/icons/icon-maskable-192.png, -512.png        full-bleed, cap inside the safe zone
 *   public/icons/apple-touch-icon.png                   180x180, opaque full-bleed (iOS rounds it)
 *   public/icons/icon.svg                               scalable "any" icon (favicon)
 *   src/app/favicon.ico                                 16/32/48 PNG-in-ICO
 *
 * Requires `sharp`, which ships with Next as an optional dependency.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = path.join(root, "public", "icons");

const PRIMARY = "#810505";
const CAP_COLOR = "#ffffff";

// lucide graduation-cap, 24x24 viewBox, stroke-based.
const CAP_PATHS = [
  "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",
  "M22 10v6",
  "M6 12.5V16a6 3 0 0 0 12 0v-3.5",
];

/**
 * Square SVG of `size` px. `capSize` is the cap's width as a fraction of the canvas,
 * `radius` the tile's corner radius as a fraction (0 = full bleed).
 */
function logoSvg({ size, capSize, radius, strokeWidth = 2 }) {
  const scale = (size * capSize) / 20; // the glyph spans ~20 of its 24 units
  const offset = (size - 24 * scale) / 2;
  const rx = size * radius;
  const paths = CAP_PATHS.map((d) => `<path d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" rx="${rx}" fill="${PRIMARY}"/>
<g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="${CAP_COLOR}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
</svg>`;
}

// The SVG's width/height are in px; a high density keeps curves crisp, then we resize to exact size.
const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();

/** Packs PNG buffers into an .ico (PNG-compressed entries, supported by every modern browser). */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dirs = entries.map(({ size, data }) => {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size === 256 ? 0 : size, 0);
    dir.writeUInt8(size === 256 ? 0 : size, 1);
    dir.writeUInt16LE(1, 4); // colour planes
    dir.writeUInt16LE(32, 6); // bits per pixel
    dir.writeUInt32LE(data.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += data.length;
    return dir;
  });
  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.data)]);
}

await mkdir(iconsDir, { recursive: true });

const any = (size) => logoSvg({ size, capSize: 0.56, radius: 0.22 });
const maskable = (size) => logoSvg({ size, capSize: 0.46, radius: 0 });

for (const size of [192, 512]) {
  await writeFile(path.join(iconsDir, `icon-${size}.png`), await png(any(size), size));
  await writeFile(path.join(iconsDir, `icon-maskable-${size}.png`), await png(maskable(size), size));
}

await writeFile(
  path.join(iconsDir, "apple-touch-icon.png"),
  await png(logoSvg({ size: 180, capSize: 0.56, radius: 0 }), 180),
);

await writeFile(path.join(iconsDir, "icon.svg"), any(512) + "\n");

const favicons = [];
for (const size of [16, 32, 48]) {
  favicons.push({
    size,
    data: await png(logoSvg({ size, capSize: 0.62, radius: 0.22, strokeWidth: 2.4 }), size),
  });
}
await writeFile(path.join(root, "src", "app", "favicon.ico"), ico(favicons));

console.log("Icons written to public/icons and src/app/favicon.ico");
