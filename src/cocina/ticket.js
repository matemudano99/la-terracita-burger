// ─────────────────────────────────────────────────────────────────────────────
// Impresión del ticket de cocina (impresora térmica de 80 mm vía RawBT).
//
// Se imprime en un IFRAME AISLADO cuyo documento contiene SOLO el ticket. Así:
//  - Es imposible que se cuele el resto de la página (el bug de "imprime la
//    página entera" con window.print() + @media print en Chrome de Android).
//  - Los estilos van embebidos: no dependen del CSS de la app.
//  - Funciona aunque window.print() sea no bloqueante en Android (limpieza con
//    onafterprint y una red de seguridad por tiempo).
// Sin emojis: muchas impresoras térmicas no los renderizan.
//
// Pensado para leerse de un vistazo en cocina: cantidad en un cuadro negro,
// producto en grande, cada extra en su línea y las notas en un recuadro. Los
// precios van pequeños a la derecha: a cocina no le hacen falta.
// ─────────────────────────────────────────────────────────────────────────────
import { fmtEUR } from "../menu";

// Ancho del rollo de papel en mm. 80 mm es el estándar de las térmicas de
// cocina (72 mm imprimibles). Si usáis una portátil de 58 mm, poned 58.
export const ANCHO_PAPEL_MM = 80;
const MARGEN_MM = ANCHO_PAPEL_MM === 80 ? 4 : 2; // zona que la impresora no imprime

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const hm = (iso) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

// Un producto del pedido: cantidad + nombre en grande y debajo sus cambios.
function itemHTML(it) {
  const nombre = esc(it.name) + (it.variant ? " " + esc(it.variant) : "");
  let s = `<div class="item">
    <div class="main"><span class="qty">${it.qty}</span><span class="name">${nombre}</span><span class="price">${esc(fmtEUR(it.lineCents))}</span></div>`;
  // El pan sin gluten es una alergia: va destacado en negro para que no se pase.
  if (it.pan) {
    s += /sin gluten/i.test(it.pan)
      ? `<div class="alerta">PAN SIN GLUTEN</div>`
      : `<div class="mod">PAN: ${esc(it.pan)}</div>`;
  }
  if (it.upgrade) s += `<div class="mod">&gt; ${esc(it.upgrade)}</div>`;
  for (const x of it.extras || []) s += `<div class="mod">+ ${esc(x)}</div>`;
  if (it.nota) s += `<div class="nota">${esc(it.nota)}</div>`;
  return s + "</div>";
}

export function ticketHTML(o, localName) {
  const hora = new Date(o.created_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  const ready = o.ready_at ? hm(o.ready_at) : null;
  const pagado = ["pagado", "reembolso_parcial"].includes(o.pago_estado);
  const devuelto = o.reembolsado_cents || 0;
  const items = o.items || [];
  const unidades = items.reduce((n, it) => n + (Number(it.qty) || 0), 0);

  const tipo = o.entrega === "domicilio" ? "A DOMICILIO" : "RECOGIDA";
  const cuando = o.programado_para
    ? `<div class="band lg">PARA LAS ${hm(o.programado_para)}</div>`
    : ready ? `<div class="center fuerte">Lista ~${ready}</div>` : "";
  const direccion = o.entrega === "domicilio" && o.direccion
    ? `<div class="direccion">${esc(o.direccion)}</div>`
    : "";
  const pagoBand = o.pago_estado === "reembolsado"
    ? `<div class="band">DEVUELTO ${esc(fmtEUR(o.total_cents))}</div>`
    : pagado
      ? `<div class="band">PAGADO ONLINE - NO COBRAR${devuelto > 0 ? " (devuelto " + esc(fmtEUR(devuelto)) + ")" : ""}</div>`
      : `<div class="band">PENDIENTE DE PAGO</div>`;
  const ordernote = o.nota ? `<div class="ordernote"><div class="tit">NOTA DEL PEDIDO</div>${esc(o.nota)}</div>` : "";
  // Sin estas líneas los productos no suman el total.
  const promo = o.promo_cents > 0
    ? `<div class="linea"><span>Promo web</span><span>-${esc(fmtEUR(o.promo_cents))}</span></div>`
    : "";
  const envio = o.envio_cents > 0
    ? `<div class="linea"><span>Envio</span><span>${esc(fmtEUR(o.envio_cents))}</span></div>`
    : "";

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ticket ${esc(o.code)}</title><style>
    @page { size: ${ANCHO_PAPEL_MM}mm 297mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { width: ${ANCHO_PAPEL_MM}mm; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.3; }
    body { padding: 3mm ${MARGEN_MM}mm 8mm; }
    .center { text-align: center; }
    .fuerte { font-weight: 800; font-size: 15px; }
    .brand { text-align: center; font-size: 15px; font-weight: 800; letter-spacing: 1px; }
    .subbrand { text-align: center; font-size: 12px; margin-bottom: 4px; }
    .sep { border-top: 2px dashed #000; margin: 8px 0; }
    .code { background: #000; color: #fff; text-align: center; font-size: 46px; font-weight: 800; line-height: 1.1; padding: 4px 0; margin: 4px 0; }
    .tipo { border: 3px solid #000; text-align: center; font-size: 24px; font-weight: 800; padding: 3px 0; margin: 4px 0; letter-spacing: 1px; }
    .band { background: #000; color: #fff; text-align: center; font-size: 17px; font-weight: 800; padding: 5px 4px; margin: 5px 0; line-height: 1.2; }
    .band.lg { font-size: 22px; }
    .direccion { font-size: 16px; font-weight: 800; text-align: center; margin: 4px 0; }
    .unidades { text-align: center; font-size: 13px; font-weight: 700; letter-spacing: .5px; }
    .item { padding: 7px 0; border-bottom: 1px solid #000; }
    .main { display: flex; align-items: flex-start; gap: 8px; }
    .qty { flex: none; min-width: 34px; background: #000; color: #fff; text-align: center; font-size: 22px; font-weight: 800; line-height: 1.25; padding: 0 4px; }
    .name { flex: 1; font-size: 20px; font-weight: 800; line-height: 1.15; text-transform: uppercase; padding-top: 2px; }
    .price { flex: none; font-size: 12px; padding-top: 5px; }
    .mod { padding-left: 42px; font-size: 16px; font-weight: 700; line-height: 1.35; }
    .alerta { margin: 3px 0 2px 42px; background: #000; color: #fff; font-size: 16px; font-weight: 800; padding: 2px 6px; display: inline-block; }
    .nota { margin: 4px 0 0 42px; border: 2px solid #000; padding: 3px 6px; font-size: 16px; font-weight: 800; }
    .nota::before { content: "NOTA: "; }
    .ordernote { border: 3px solid #000; padding: 5px 7px; margin: 8px 0; font-size: 16px; font-weight: 800; }
    .ordernote .tit { font-size: 12px; letter-spacing: 1px; margin-bottom: 2px; }
    .who { font-size: 16px; font-weight: 800; }
    .linea { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; font-weight: 700; }
    .total { display: flex; justify-content: space-between; gap: 8px; font-size: 20px; font-weight: 800; margin-top: 4px; }
    .foot { text-align: center; font-size: 12px; margin-top: 6px; }
  </style></head><body>
    <div class="brand">LA TERRACITA BURGER</div>
    <div class="subbrand">${esc(localName)} - Pedido web - ${esc(hora)}</div>
    <div class="code">#${esc(o.code)}</div>
    <div class="tipo">${tipo}</div>
    ${cuando}
    <div class="sep"></div>
    <div class="unidades">${unidades} ${unidades === 1 ? "PRODUCTO" : "PRODUCTOS"}</div>
    ${items.map(itemHTML).join("")}
    ${ordernote}
    <div class="sep"></div>
    <div class="who">${esc(o.nombre)}</div>
    <div>Tel: ${esc(o.telefono)}</div>
    ${direccion}
    <div class="sep"></div>
    ${promo}
    ${envio}
    <div class="total"><span>TOTAL</span><span>${esc(fmtEUR(o.total_cents))}</span></div>
    ${pagoBand}
    <div class="foot">Gracias!</div>
  </body></html>`;
}

// Imprime el ticket de un pedido. Aísla el contenido en un iframe temporal.
export function imprimirTicket(o, localName) {
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    let limpio = false;
    const limpiar = () => { if (limpio) return; limpio = true; try { iframe.remove(); } catch { /* ya retirado */ } };
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(ticketHTML(o, localName));
    doc.close();
    const win = iframe.contentWindow;
    win.onafterprint = () => setTimeout(limpiar, 300);
    // Pequeño margen para que el iframe renderice antes de imprimir.
    setTimeout(() => {
      // Alto de página = alto real del ticket, para que la impresora no saque
      // un A4 entero en blanco. 96 px = 25,4 mm (1 pulgada).
      try {
        const altoMm = Math.ceil((doc.body.scrollHeight * 25.4) / 96) + 2;
        const st = doc.createElement("style");
        st.textContent = `@page { size: ${ANCHO_PAPEL_MM}mm ${altoMm}mm; margin: 0; }`;
        doc.head.appendChild(st);
      } catch { /* se queda el tamaño por defecto */ }
      try { win.focus(); win.print(); } catch { /* impresión no disponible */ }
      // Red de seguridad: en Android onafterprint puede no dispararse.
      setTimeout(limpiar, 8000);
    }, 200);
  } catch { /* entorno sin impresión */ }
}
