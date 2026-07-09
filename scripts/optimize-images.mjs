// Genera versiones WebP optimizadas y la og:image a partir de los JPEG fuente.
// Fuentes (versionadas, NO desplegadas): assets-src/fotos/*.jpg
// Salida (desplegada):                   public/fotos/*.webp  y  public/og.jpg
// Uso: npm run optimize:images
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "assets-src/fotos";
const OUT = "public/fotos";
const MAX = 1300; // lado mayor máximo (display ~560px, retina 2x holgado)
const Q = 70;

fs.mkdirSync(OUT, { recursive: true });
const kb = (n) => Math.round(fs.statSync(n).size / 1024) + "KB";

for (const f of fs.readdirSync(SRC).filter((x) => /\.jpe?g$/i.test(x))) {
  const src = path.join(SRC, f);
  const out = path.join(OUT, f.replace(/\.jpe?g$/i, ".webp"));
  await sharp(src)
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: Q, effort: 5 })
    .toFile(out);
  console.log(`${f} (${kb(src)}) -> ${path.basename(out)} (${kb(out)})`);
}

// og:image 1200x630 (JPEG por compatibilidad con scrapers)
await sharp(path.join(SRC, "mes-black-garlic-1.jpg"))
  .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile("public/og.jpg");
console.log("og.jpg 1200x630 generado");
