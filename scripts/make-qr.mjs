// Genera el QR (y un cartel imprimible) que enlazan a la carta digital /carta.
// Salidas:
//   public/carta-qr.svg      → solo el código QR (para usarlo donde quieras)
//   public/carta-poster.svg  → cartel A-ish listo para imprimir y poner en mesa
// Regenerar con: npm run make:qr
import { writeFileSync } from "node:fs";
import QRCode from "qrcode";

const URL = "https://laterracitaburger.com/carta";

const qr = QRCode.create(URL, { errorCorrectionLevel: "M" });
const n = qr.modules.size;
const bits = qr.modules.data;

// Path SVG con los módulos oscuros. `quiet` añade la zona de silencio (blanco)
// alrededor, imprescindible para que el lector reconozca el código.
function qrPath(quiet) {
  let d = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (bits[r * n + c]) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
  return d;
}

// 1) QR plano (negro sobre blanco, con zona de silencio de 4 módulos).
const quiet = 4;
const dim = n + quiet * 2;
writeFileSync(
  "public/carta-qr.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="1000" height="1000" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="#fff"/><path d="${qrPath(quiet)}" fill="#000"/></svg>\n`
);

// 2) Cartel imprimible (600x820). El QR ya incluye su zona de silencio.
const W = 600, H = 820;
const qrSize = 380;
const scale = qrSize / dim;
const qrX = (W - qrSize) / 2, qrY = 246;
const poster = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, Helvetica, sans-serif">
  <rect width="${W}" height="${H}" rx="28" fill="#0a0806"/>
  <rect width="${W}" height="10" fill="#ffc531"/>
  <text x="${W / 2}" y="98" text-anchor="middle" fill="#f6f1e9" font-size="38" font-weight="900" letter-spacing="1.5">LA TERRACITA BURGER</text>
  <text x="${W / 2}" y="132" text-anchor="middle" fill="#ffc531" font-size="16" letter-spacing="6">SMASH BURGERS · MÁLAGA</text>
  <text x="${W / 2}" y="202" text-anchor="middle" fill="#f6f1e9" font-size="30" font-weight="800">Escanea nuestra carta</text>
  <rect x="${qrX - 14}" y="${qrY - 14}" width="${qrSize + 28}" height="${qrSize + 28}" rx="20" fill="#ffffff"/>
  <g transform="translate(${qrX} ${qrY}) scale(${scale})" shape-rendering="crispEdges"><path d="${qrPath(quiet)}" fill="#000"/></g>
  <text x="${W / 2}" y="${qrY + qrSize + 84}" text-anchor="middle" fill="#f6f1e9" font-size="22" font-weight="700">Apunta con la cámara del móvil</text>
  <text x="${W / 2}" y="${qrY + qrSize + 118}" text-anchor="middle" fill="#f6f1e9" fill-opacity="0.6" font-size="17">laterracitaburger.com/carta</text>
</svg>\n`;
writeFileSync("public/carta-poster.svg", poster);

console.log(`QR generado (${n}x${n} módulos) → public/carta-qr.svg y public/carta-poster.svg · apunta a ${URL}`);
