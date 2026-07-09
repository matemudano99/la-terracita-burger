// Genera un favicon simple con solo las letras "LTB" (recortadas del logo)
// sobre un cuadrado oscuro redondeado. Salida: public/favicon.png
import sharp from "sharp";

const SRC = "public/logo-white.png"; // LTB blanco sobre transparente
const OUT = "public/favicon.png";
const SIZE = 192; // múltiplo de 48 (requisito de Google)

// 1) Detectar el bounding box de las letras "LTB" (zona central-superior),
//    evitando los aros del borde y el texto pequeño inferior.
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const x0 = Math.floor(W * 0.24), x1 = Math.ceil(W * 0.76);
const y0 = Math.floor(H * 0.30), y1 = Math.ceil(H * 0.56);
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = y0; y < y1; y++) {
  for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * C;
    const a = data[i + 3];
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (a > 128 && lum > 170) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
}
const bw = maxX - minX, bh = maxY - minY;
console.log(`LTB bbox: x ${minX}-${maxX} (${bw}), y ${minY}-${maxY} (${bh})`);

// 2) Recortar las letras (con un poco de aire)
const pad = Math.round(Math.max(bw, bh) * 0.06);
const cropLeft = Math.max(0, minX - pad);
const cropTop = Math.max(0, minY - pad);
const cropW = Math.min(W - cropLeft, bw + pad * 2);
const cropH = Math.min(H - cropTop, bh + pad * 2);
const letters = await sharp(SRC)
  .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
  .resize({ width: Math.round(SIZE * 0.74), height: Math.round(SIZE * 0.74), fit: "inside" })
  .toBuffer();

// 3) Fondo cuadrado oscuro redondeado
const r = Math.round(SIZE * 0.22);
const bg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="${r}" ry="${r}" fill="#0a0806"/></svg>`
);

await sharp(bg)
  .composite([{ input: letters, gravity: "centre" }])
  .png()
  .toFile(OUT);
console.log(`favicon.png ${SIZE}x${SIZE} generado`);
