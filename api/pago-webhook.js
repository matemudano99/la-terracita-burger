// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pago-webhook — notificación de MONEI cuando un pago cambia de
// estado. Es el ÚNICO camino por el que un pedido "pendiente_pago" pasa a
// cocina. Seguridad e idempotencia:
//   - Del cuerpo del webhook solo tomamos el id del pago; el estado real se
//     consulta a la API de MONEI con nuestra clave (imposible de falsificar).
//   - Se comprueba que el importe cobrado coincide con el del pedido.
//   - Un webhook repetido no tiene efecto (solo actúa sobre "pendiente_pago").
// En desarrollo sin clave MONEI, /pago-simulado envía { simulada: true }.
// ─────────────────────────────────────────────────────────────────────────────
import { getOrder, updateOrder, storeReady } from "./_store.js";
import { devPagos, moneiReady, obtenerPago } from "./_monei.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Método no permitido" });
    }
    if (!storeReady) return res.status(503).json({ error: "No configurado" });
    const b = req.body || {};

    let pagoId, estadoPago, orderId, amount;
    if (b.simulada) {
      if (!devPagos) return res.status(403).json({ error: "La simulación solo existe en desarrollo." });
      orderId = String(b.orderId || "");
      pagoId = `sim_${orderId}`;
      estadoPago = b.resultado === "ok" ? "SUCCEEDED" : "CANCELED";
      amount = null; // en simulación no se comprueba el importe
    } else {
      if (!moneiReady) return res.status(503).json({ error: "Pagos no configurados" });
      pagoId = String(b.id || "");
      if (!pagoId) return res.status(400).json({ error: "Falta id" });
      const pago = await obtenerPago(pagoId);
      estadoPago = pago.status;
      orderId = String(pago.orderId || "");
      amount = pago.amount;
    }

    const order = await getOrder(orderId);
    // Pedido desconocido o ya procesado: respondemos 200 para que MONEI no reintente.
    if (!order || order.status !== "pendiente_pago") {
      return res.status(200).json({ ok: true, idempotente: true });
    }
    if (amount != null && amount !== order.total_cents) {
      console.error(`[pago-webhook] importe no coincide: pago ${amount} vs pedido ${order.total_cents} (${orderId})`);
      return res.status(200).json({ ok: true, ignorado: true });
    }

    if (estadoPago === "SUCCEEDED") {
      await updateOrder(orderId, { status: "nuevo", pago_estado: "pagado", pago_id: pagoId });
    } else if (["FAILED", "CANCELED", "EXPIRED"].includes(estadoPago)) {
      await updateOrder(orderId, { pago_estado: "fallido" });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[api/pago-webhook]", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
