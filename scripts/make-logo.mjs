// Genera el logo simplificado con solo las siglas "LTB" (sin el texto inferior),
// blanco sobre transparente, para navbar/footer/splash.
// Salida: public/logo-ltb-white.png
import sharp from "sharp";

const SRC = "public/logo-white.png"; // badge completo, LTB blanco sobre transparente
const OUT = "public/logo-ltb-white.png";
const SIZE = 256;

// Detectar el bounding box de las letras "LTB" (zona central-superior).
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const x0 = Math.floor(W * 0.24), x1 = Math.ceil(W * 0.76);
const y0 = Math.floor(H * 0.30), y1 = Math.ceil(H * 0.56);
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = y0; y < y1; y++) {
  for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * C;
    if (data[i + 3] > 128 && (data[i] + data[i + 1] + data[i + 2]) / 3 > 170) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
}
const bw = maxX - minX, bh = maxY - minY;
console.log(`LTB bbox: ${bw}x${bh}`);

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
