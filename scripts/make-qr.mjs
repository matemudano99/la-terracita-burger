// Genera, para cada local, el QR (y un cartel imprimible) que enlaza a su
// carta digital: /carta/teatinos y /carta/rincon.
// Salidas (una por local):
//   public/carta-qr-<local>.svg      → QR sobre fondo negro con "MENU" en amarillo
//   public/carta-poster-<local>.svg  → cartel completo para mesa / escaparate
// Los textos usan Anton (la tipografía de la web) CONVERTIDA A TRAZOS, así el
// SVG se imprime igual en cualquier sitio aunque no tenga la fuente instalada.
// Regenerar con: npm run make:qr
import { writeFileSync, readFileSync } from "node:fs";
import QRCode from "qrcode";
import sharp from "sharp";
import opentype from "opentype.js";
import { LOCALES } from "../src/locales.js";

const WEB = "https://laterracitaburger.com";
const AMARILLO = "#ffc531"; // rgb(255 197 49) — acento de la marca
const NEGRO = "#0a0806"; // fondo de la web
const CREMA = "#f6f1e9";

const font = opentype.parse(readFileSync("scripts/fonts/Anton-Regular.ttf").buffer);

// Texto centrado en `cx` como trazos, con espaciado entre letras opcional.
function texto(txt, cx, y, size, fill, tracking = 0) {
  const chars = [...txt];
  const anchos = chars.map((c) => font.getAdvanceWidth(c, size));
  const total = anchos.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let x = cx - total / 2;
  let d = "";
  chars.forEach((c, i) => {
    d += font.getPath(c, x, y, size).toPathData(2);
    x += anchos[i] + tracking;
  });
  return `<path d="${d}" fill="${fill}"/>`;
}

const QUIET = 4; // zona de silencio: imprescindible para que el lector lo lea

for (const L of Object.values(LOCALES)) {
  const ruta = `/carta/${L.id}`;
  const qr = QRCode.create(WEB + ruta, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const bits = qr.modules.data;
  const dim = n + QUIET * 2;

  const qrPath = () => {
    let d = "";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) if (bits[r * n + c]) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
    return d;
  };

  // El QR va SIEMPRE en negro sobre blanco (contraste que exige el lector);
  // el fondo negro y el texto amarillo envuelven esa caja.
  const bloqueQR = (x, y, lado) =>
    `<rect x="${x}" y="${y}" width="${lado}" height="${lado}" rx="14" fill="#ffffff"/>` +
    `<g transform="translate(${x} ${y}) scale(${lado / dim})" shape-rendering="crispEdges">` +
    `<path d="${qrPath()}" fill="#000000"/></g>`;

  // ── 1) QR con "MENU" debajo ──────────────────────────────────────────────────
  {
    const W = 560, PAD = 40, LADO = W - PAD * 2;
    const yQR = PAD;
    const yTexto = yQR + LADO + 124; // línea base de "MENU"
    const H = yTexto + 40;
    writeFileSync(
      `public/carta-qr-${L.id}.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" rx="28" fill="${NEGRO}"/>
    ${bloqueQR(PAD, yQR, LADO)}
    ${texto("MENU", W / 2, yTexto, 108, AMARILLO, 6)}
  </svg>\n`
    );
  }

  // ── 2) Cartel para mesa / escaparate ─────────────────────────────────────────
  {
    const W = 600, H = 860, LADO = 380;
    const xQR = (W - LADO) / 2, yQR = 232;
    writeFileSync(
      `public/carta-poster-${L.id}.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" rx="28" fill="${NEGRO}"/>
    <rect width="${W}" height="10" fill="${AMARILLO}"/>
    ${texto("LA TERRACITA BURGER", W / 2, 104, 40, CREMA, 1)}
    ${texto(L.name.toUpperCase(), W / 2, 140, 16, AMARILLO, 4)}
    ${bloqueQR(xQR, yQR, LADO)}
    ${texto("MENU", W / 2, yQR + LADO + 112, 104, AMARILLO, 6)}
    ${texto("ESCANEA CON TU MÓVIL · SCAN WITH YOUR PHONE", W / 2, yQR + LADO + 152, 15, CREMA, 1)}
    <text x="${W / 2}" y="${yQR + LADO + 182}" text-anchor="middle" fill="${CREMA}" fill-opacity="0.55"
          font-family="Arial, Helvetica, sans-serif" font-size="15">laterracitaburger.com${ruta}</text>
  </svg>\n`
    );
  }

  // PNG a 1200px por si hace falta para imprenta o redes.
  for (const f of [`carta-qr-${L.id}`, `carta-poster-${L.id}`]) {
    await sharp(Buffer.from(readFileSync(`public/${f}.svg`)), { density: 300 }).resize(1200).png().toFile(`public/${f}.png`);
  }

  console.log(`${L.name}: QR (${n}x${n} módulos) → public/carta-qr-${L.id}.svg|png y public/carta-poster-${L.id}.svg|png · ${WEB}${ruta}`);
}
