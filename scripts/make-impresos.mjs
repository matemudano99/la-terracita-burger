// Genera los impresos de los locales, listos para imprimir:
//   impresos/qr-mesa-<local>-a4.pdf → 4 tarjetas de mesa con el QR de la carta del local
//   impresos/qr-mesa-<local>-a6.pdf → la misma tarjeta, una por página (imprenta)
//   impresos/flyer-web-a4.pdf       → 4 flyers para publicitar los pedidos web
//   impresos/flyer-web-a6.pdf       → el mismo flyer, uno por página (imprenta)
// El flyer es de los pedidos web, así que solo vale para los locales que los
// tienen (hoy, Rincón de la Victoria).
// Se maquetan en HTML con la tipografía de la marca y Chrome los convierte a
// PDF, así que el resultado es vectorial: el QR y los textos salen nítidos a
// cualquier tamaño. Regenerar con: npm run make:impresos
//
// Los QR llevan una marca de origen (?origen=…) para saber, el día que se
// mida, de qué impreso viene cada visita. La web hoy la ignora sin problema.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import QRCode from "qrcode";
import sharp from "sharp";
import { LOCALES, LOCALES_WEB } from "../src/locales.js";

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SALIDA = "impresos";
const WEB = "https://laterracitaburger.com";
const urlCarta = (local) => `${WEB}/carta/${local}?origen=qr-mesa`;
const LOCAL_FLYER = LOCALES_WEB[0];
const URL_PEDIR = `${WEB}/pedir?local=${LOCAL_FLYER.id}&origen=flyer`;

const AMARILLO = "#ffc531";
const NEGRO = "#0a0806";
const CREMA = "#f6f1e9";

mkdirSync(SALIDA, { recursive: true });

// Fuente y foto incrustadas: el HTML no depende de nada externo.
const anton = readFileSync("scripts/fonts/Anton-Regular.ttf").toString("base64");
const foto = (
  await sharp("public/fotos/burger-laterracita.webp").resize({ width: 1240 }).jpeg({ quality: 88 }).toBuffer()
).toString("base64");

const qr = (url) =>
  QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: NEGRO, light: "#ffffff" } });
const qrPedir = await qr(URL_PEDIR);

const estilosBase = `
  @font-face { font-family: "Anton"; src: url(data:font/ttf;base64,${anton}) format("truetype"); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, Helvetica, sans-serif; color: ${CREMA}; }
  .anton { font-family: "Anton", Impact, sans-serif; font-weight: 400; }
  .qr { background: #fff; border-radius: 3.5mm; }
  .qr svg { display: block; width: 100%; height: 100%; }
`;

// Hoja A4 con 4 piezas y guías de corte; o A6 con una pieza por página.
function documento(titulo, pieza, formato) {
  const a4 = formato === "a4";
  const ancho = a4 ? 99 : 105;
  const alto = a4 ? 142.5 : 148;
  const piezas = Array.from({ length: a4 ? 4 : 1 }, () => `<div class="corte">${pieza}</div>`).join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title><style>
    ${estilosBase}
    @page { size: ${a4 ? "210mm 297mm" : "105mm 148mm"}; margin: 0; }
    .hoja { width: ${a4 ? 210 : 105}mm; height: ${a4 ? 297 : 148}mm; display: grid;
      grid-template-columns: repeat(${a4 ? 2 : 1}, ${ancho}mm); grid-auto-rows: ${alto}mm;
      justify-content: center; align-content: center; }
    /* Guía de corte: una línea fina gris alrededor de cada pieza */
    .corte { outline: ${a4 ? "0.2mm dashed #9a9a9a" : "none"}; outline-offset: 0; }
    .pieza { width: ${ancho}mm; height: ${alto}mm; }
  </style></head><body><div class="hoja">${piezas}</div></body></html>`;
}

// ── Tarjeta de mesa: QR de la carta del local ───────────────────────────────
// Abajo, cómo pedir para llevar: por la web donde se puede; si no, por teléfono.
const tarjetaCarta = (L, qrCarta) => `
<div class="pieza" style="position:relative;background:${NEGRO};display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 9mm">
  <div style="position:absolute;left:0;right:0;top:0;height:2.6mm;background:${AMARILLO}"></div>
  <div class="anton" style="margin-top:11mm;font-size:21pt;letter-spacing:.03em;line-height:1">LA TERRACITA BURGER</div>
  <div style="margin-top:2.4mm;font-size:6.6pt;font-weight:700;letter-spacing:.32em;color:${AMARILLO}">${L.name.toUpperCase()}</div>
  <div class="qr" style="margin-top:8mm;width:60mm;height:60mm;padding:4.5mm">${qrCarta}</div>
  <div class="anton" style="margin-top:6mm;font-size:46pt;line-height:.9;letter-spacing:.04em;color:${AMARILLO}">MENU</div>
  <div style="margin-top:3.4mm;font-size:7.4pt;font-weight:700;letter-spacing:.06em">ESCANEA CON TU MÓVIL · SCAN WITH YOUR PHONE</div>
  <div style="margin-top:auto;margin-bottom:7mm;width:100%;padding-top:3.4mm;border-top:0.25mm solid rgba(246,241,233,.22);font-size:7pt;line-height:1.45;color:rgba(246,241,233,.7)">
    ${L.pedidosWeb
      ? `¿Para llevar o a domicilio? Pide en<br><b style="color:${CREMA};font-size:8pt">laterracitaburger.com</b>`
      : `¿Para llevar? Llámanos<br><b style="color:${CREMA};font-size:8pt">${L.phone}</b>`}
  </div>
</div>`;

// ── Flyer: pedidos por la web ───────────────────────────────────────────────
const punto = `<span style="display:inline-block;width:1.6mm;height:1.6mm;border-radius:50%;background:${AMARILLO};margin-right:2mm;vertical-align:middle"></span>`;
const flyerWeb = `
<div class="pieza" style="position:relative;background:${NEGRO};display:flex;flex-direction:column;overflow:hidden">
  <div style="position:relative;height:68mm;background:url(data:image/jpeg;base64,${foto}) center 42%/cover">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,8,6,.0) 35%,rgba(10,8,6,.92) 100%)"></div>
    <div style="position:absolute;left:0;right:0;top:0;height:2.6mm;background:${AMARILLO}"></div>
    <div style="position:absolute;left:7mm;top:6.5mm;font-size:6.4pt;font-weight:700;letter-spacing:.28em;color:${CREMA};text-shadow:0 0 3mm rgba(0,0,0,.6)">LA TERRACITA BURGER · ${LOCAL_FLYER.name.toUpperCase()}</div>
    <div class="anton" style="position:absolute;left:7mm;right:7mm;bottom:3mm;font-size:37pt;line-height:.92;letter-spacing:.02em">PIDE<br>ONLINE</div>
  </div>
  <div style="padding:4.5mm 7mm 0">
    <div class="anton" style="display:inline-block;padding:2.4mm 4mm 2mm;border-radius:2mm;background:${AMARILLO};color:${NEGRO};font-size:17pt;line-height:1;letter-spacing:.02em">50% EN LA 2ª HAMBURGUESA</div>
    <div style="margin-top:2mm;font-size:8pt;font-weight:700;letter-spacing:.04em;color:${AMARILLO}">SOLO PIDIENDO EN LA WEB</div>
  </div>
  <div style="display:flex;align-items:center;gap:5mm;padding:5mm 7mm 0">
    <div class="qr" style="flex:none;width:35mm;height:35mm;padding:2.8mm">${qrPedir}</div>
    <div style="font-size:8.6pt;line-height:1.65">
      <div style="font-weight:700;font-size:8.6pt;line-height:1.3">Escanea y pide<br>en un minuto</div>
      <div style="margin:1.6mm 0 1.8mm;font-weight:700;font-size:9pt;color:${AMARILLO}">laterracitaburger.com</div>
      <div>${punto}Recógelo en el local</div>
      <div>${punto}O te lo llevamos a casa</div>
      <div>${punto}Pago online seguro</div>
    </div>
  </div>
  <div style="margin-top:auto;padding:0 7mm 5.5mm;font-size:5.6pt;line-height:1.45;color:rgba(246,241,233,.5)">
    Pedidos web en ${LOCAL_FLYER.name}. Promoción válida en pedidos hechos en la web; condiciones en laterracitaburger.com.
  </div>
</div>`;

// ── A PDF con Chrome sin interfaz ───────────────────────────────────────────
function aPdf(nombre, html) {
  // El HTML es solo un paso intermedio: va a la carpeta temporal del sistema.
  const htmlPath = resolve(tmpdir(), `ltb-impreso-${nombre}.html`);
  const pdfPath = resolve(SALIDA, `${nombre}.pdf`);
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
    `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href,
  ], { stdio: "ignore" });
  console.log(`✓ ${SALIDA}/${nombre}.pdf`);
}

for (const L of Object.values(LOCALES)) {
  const pieza = tarjetaCarta(L, await qr(urlCarta(L.id)));
  aPdf(`qr-mesa-${L.id}-a4`, documento(`QR de mesa — La Terracita ${L.name}`, pieza, "a4"));
  aPdf(`qr-mesa-${L.id}-a6`, documento(`QR de mesa — La Terracita ${L.name}`, pieza, "a6"));
}
aPdf("flyer-web-a4", documento("Flyer pedidos web — La Terracita", flyerWeb, "a4"));
aPdf("flyer-web-a6", documento("Flyer pedidos web — La Terracita", flyerWeb, "a6"));
