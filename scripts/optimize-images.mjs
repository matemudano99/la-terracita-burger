// Genera versiones WebP optimizadas y la og:image a partir de los JPEG fuente.
// Fuentes (versionadas, NO desplegadas): assets-src/fotos/*.jpg
// Salida (desplegada):                   public/fotos/*.webp  y  public/og.jpg
//
// Fotos de los platos (la burbuja que sale al pasar el ratón o tocar un plato):
//   assets-src/fotos/carta/<id-del-producto>.jpg → public/fotos/carta/<id>.webp
// El id es el de src/menu.js (p. ej. yankee.jpg, nachos-chili.jpg). Van en
// pequeño (≈20–30 KB) porque la burbuja mide unos 300 px, y la web solo las
// descarga cuando alguien las pide. El script escribe también
// src/fotosCarta.js, la lista que lee la web: no hay que tocar código.
//
// Uso: npm run optimize:images
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { BURGER_DEL_MES } from "../src/mesData.js";

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

// og:image 1200x630 (JPEG por compatibilidad con scrapers), con la foto del mes
await sharp(path.join(SRC, path.basename(BURGER_DEL_MES.img).replace(/\.webp$/, ".jpg")))
  .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile("public/og.jpg");
console.log("og.jpg 1200x630 generado");

// ── Fotos de los platos ──────────────────────────────────────────────────────
const SRC_CARTA = path.join(SRC, "carta");
const OUT_CARTA = path.join(OUT, "carta");
const LADO_CARTA = 600; // burbuja de ~300 px a 2x
const Q_CARTA = 66;

// Platos que reutilizan una foto que ya está en assets-src/fotos (así no se
// guarda dos veces). La Burger Especial usa siempre la foto del mes.
const fotoDelMes = path.basename(BURGER_DEL_MES.img || "").replace(/\.webp$/, ".jpg");
const ALIAS = {
  "la-terracita": "burger-laterracita.jpg",
  ...(fotoDelMes ? { "burger-especial": fotoDelMes } : {}),
};

const fuentes = new Map(); // id → ruta del JPEG
for (const [id, f] of Object.entries(ALIAS)) {
  if (fs.existsSync(path.join(SRC, f))) fuentes.set(id, path.join(SRC, f));
}
if (fs.existsSync(SRC_CARTA)) {
  for (const f of fs.readdirSync(SRC_CARTA).filter((x) => /\.jpe?g$/i.test(x))) {
    fuentes.set(f.replace(/\.jpe?g$/i, ""), path.join(SRC_CARTA, f)); // la de carta/ manda
  }
}

fs.rmSync(OUT_CARTA, { recursive: true, force: true }); // fuera las de platos quitados
fs.mkdirSync(OUT_CARTA, { recursive: true });
const fotos = {};
for (const [id, src] of [...fuentes].sort(([a], [b]) => a.localeCompare(b))) {
  const out = path.join(OUT_CARTA, `${id}.webp`);
  const info = await sharp(src)
    .rotate() // respeta la orientación de las fotos del móvil
    .resize({ width: LADO_CARTA, height: LADO_CARTA, fit: "inside", withoutEnlargement: true })
    .webp({ quality: Q_CARTA, effort: 6 })
    .toFile(out);
  // ?v= cambia si cambia la foto: la caché de /fotos dura una semana.
  const v = createHash("sha1").update(fs.readFileSync(out)).digest("hex").slice(0, 8);
  fotos[id] = { src: `/fotos/carta/${id}.webp?v=${v}`, w: info.width, h: info.height };
  console.log(`carta: ${path.basename(src)} -> carta/${id}.webp (${kb(out)})`);
}

fs.writeFileSync(
  "src/fotosCarta.js",
  `// GENERADO por scripts/optimize-images.mjs — no editar a mano.
// Fotos de los platos para la burbuja de la carta (id del producto → foto).
// Para añadir una: assets-src/fotos/carta/<id>.jpg y npm run optimize:images.
export const FOTOS_CARTA = ${JSON.stringify(fotos, null, 2)};

export const fotoDe = (id) => FOTOS_CARTA[id] || null;
`
);
console.log(`src/fotosCarta.js: ${Object.keys(fotos).length} platos con foto`);
