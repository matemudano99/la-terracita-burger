// Genera el logo simplificado con solo las siglas "LTB" (sin el texto inferior),
// blanco sobre transparente, para navbar/footer/splash.
// Salida: public/logo-ltb-white.png
import sharp from "sharp";

const SRC = "public/logo-white.png"; // badge completo, LTB blanco sobre transparente
const OUT = "public/logo-ltb-white.png";
const SIZE = 256;

// Detectar el bounding box de las letras "LTB": píxeles blancos dentro del disco
// central (excluye los aros del borde) y por encima del texto pequeño inferior.
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const cx = W / 2, cy = H / 2;
const maxDist2 = (0.41 * W) ** 2; // recorta las intrusiones laterales del aro
const yMin = 0.29 * H; // por debajo de las motas del aro superior
const yMax = 0.585 * H; // por encima del texto "LA TERRACITA BURGER"
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = Math.floor(yMin); y < yMax; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    if (data[i + 3] > 128 && (data[i] + data[i + 1] + data[i + 2]) / 3 > 170) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy < maxDist2) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
}
const bw = maxX - minX, bh = maxY - minY;
console.log(`LTB bbox: x ${minX}-${maxX} (${bw}), y ${minY}-${maxY} (${bh})`);

const pad = Math.round(Math.max(bw, bh) * 0.06);
const letters = await sharp(SRC)
  .extract({
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(W, bw + pad * 2),
    height: Math.min(H, bh + pad * 2),
  })
  .resize({ width: Math.round(SIZE * 0.7), fit: "inside" })
  .toBuffer();

await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: letters, gravity: "centre" }])
  .png()
  .toFile(OUT);
console.log(`logo-ltb-white.png ${SIZE}x${SIZE} generado`);
