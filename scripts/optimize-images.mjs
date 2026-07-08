// Regenera versiones WebP optimizadas de las fotos de public/fotos y la og:image.
// Uso: node scripts/optimize-images.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const FOTOS = "public/fotos";
const MAX = 1300; // lado mayor máximo (display ~560px, retina 2x holgado)
const Q = 70;

const jpgs = fs.readdirSync(FOTOS).filter((f) => /\.jpe?g$/i.test(f));

for (const f of jpgs) {
  const src = path.join(FOTOS, f);
  const out = path.join(FOTOS, f.replace(/\.jpe?g$/i, ".webp"));
  await sharp(src)
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: Q, effort: 5 })
    .toFile(out);
  const kb = (n) => Math.round(fs.statSync(n).size / 1024) + "KB";
  console.log(`${f} (${kb(src)}) -> ${path.basename(out)} (${kb(out)})`);
}

// og:image 1200x630 (JPEG por compatibilidad con scrapers)
await sharp(path.join(FOTOS, "mes-black-garlic-1.jpg"))
  .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile("public/og.jpg");
console.log("og.jpg 1200x630 generado");
