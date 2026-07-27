// ─────────────────────────────────────────────────────────────────────────────
// Impresión del ticket de cocina (térmica 58 mm vía RawBT).
//
// Se imprime en un IFRAME AISLADO cuyo documento contiene SOLO el ticket. Así:
//  - Es imposible que se cuele el resto de la página (el bug de "imprime la
//    página entera" con window.print() + @media print en Chrome de Android).
//  - Los estilos van embebidos: no dependen del CSS de la app.
//  - Funciona aunque window.print() sea no bloqueante en Android (limpieza con
//    onafterprint y una red de seguridad por tiempo).
// Sin emojis: muchas impresoras térmicas no los renderizan.
// ─────────────────────────────────────────────────────────────────────────────
import { fmtEUR } from "../menu";

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const hm = (iso) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

function ticketHTML(o, localName) {
  const hora = new Date(o.created_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  const ready = o.ready_at ? hm(o.ready_at) : null;
  const pagado = ["pagado", "reembolso_parcial"].includes(o.pago_estado);
  const devuelto = o.reembolsado_cents || 0;

  const items = (o.items || []).map((it) => {
    let s = `<div class="item"><div class="main"><span>${it.qty}x ${esc(it.name)}${it.variant ? " " + esc(it.variant) : ""}</span><span>${esc(fmtEUR(it.lineCents))}</span></div>`;
    if (it.upgrade) s += `<div class="sub">+ ${esc(it.upgrade)}</div>`;
    if (it.pan) s += `<div class="sub">+ ${esc(it.pan)}</div>`;
    for (const x of it.extras || []) s += `<div class="sub">+ ${esc(x)}</div>`;
    if (it.nota) s += `<div class="note">&gt;&gt; ${esc(it.nota)}</div>`;
    return s + "</div>";
  }).join("");

  const cuando = o.programado_para ? `<div class="band lg">PARA LAS ${hm(o.programado_para)}</div>` : "";
  const entrega = o.entrega === "domicilio"
    ? `<div class="band">A DOMICILIO<br>${esc(o.direccion)}</div>`
    : `<div class="center">RECOGIDA${ready ? " - lista ~" + ready : ""}</div>`;
  const pagoBand = o.pago_estado === "reembolsado"
    ? `<div class="band">DEVUELTO ${esc(fmtEUR(o.total_cents))}</div>`
    : pagado
      ? `<div class="band">PAGADO ONLINE - NO COBRAR${devuelto > 0 ? " (devuelto " + esc(fmtEUR(devuelto)) + ")" : ""}</div>`
      : `<div class="band">PENDIENTE DE PAGO</div>`;
  const ordernote = o.nota ? `<div class="ordernote">&gt;&gt; NOTA: ${esc(o.nota)}</div>` : "";

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ticket ${esc(o.code)}</title><style>
    @page { size: 58mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { width: 58mm; background: #fff; font-family: "Arial Narrow", Arial, sans-serif; font-size: 12px; line-height: 1.3; }
    body { padding: 2mm 1.5mm 6mm; }
    .center { text-align: center; }
    .brand { text-align: center; font-size: 16px; font-weight: 800; letter-spacing: .5px; }
    .subbrand { text-align: center; font-size: 11px; margin-bottom: 3px; }
    .sep { border-top: 1px dashed #000; margin: 5px 0; }
    .code { background: #000; color: #fff; text-align: center; font-size: 40px; font-weight: 800; line-height: 1.15; padding: 3px 0; margin: 3px 0; }
    .band { background: #000; color: #fff; text-align: center; font-size: 15px; font-weight: 800; padding: 4px 3px; margin: 4px 0; line-height: 1.2; }
    .band.lg { font-size: 18px; }
    .who { font-size: 14px; font-weight: 700; }
    .item { margin: 5px 0; }
    .item .main { display: flex; justify-content: space-between; gap: 8px; font-size: 15px; font-weight: 800; line-height: 1.15; }
    .sub { padding-left: 10px; font-size: 12px; }
    .note { padding-left: 10px; font-size: 13px; font-weight: 800; }
    .ordernote { border: 2px solid #000; padding: 3px 5px; margin: 5px 0; font-size: 13px; font-weight: 800; }
    .total { display: flex; justify-content: space-between; gap: 8px; font-size: 18px; font-weight: 800; margin-top: 4px; }
    .foot { text-align: center; font-size: 11px; margin-top: 5px; }
  </style></head><body>
    <div class="brand">LA TERRACITA BURGER</div>
    <div class="subbrand">${esc(localName)} - Pedido web</div>
    <div class="code">#${esc(o.code)}</div>
    ${cuando}
    ${entrega}
    <div class="center">Pedido: ${esc(hora)}</div>
    <div class="sep"></div>
    <div class="who">${esc(o.nombre)}</div>
    <div>Tel: ${esc(o.telefono)}</div>
    <div class="sep"></div>
    ${items}
    ${ordernote}
    <div class="sep"></div>
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
      try { win.focus(); win.print(); } catch { /* impresión no disponible */ }
      // Red de seguridad: en Android onafterprint puede no dispararse.
      setTimeout(limpiar, 8000);
    }, 200);
  } catch { /* entorno sin impresión */ }
}
