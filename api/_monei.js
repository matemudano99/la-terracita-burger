// ─────────────────────────────────────────────────────────────────────────────
// Integración con MONEI (pagos online): crear pago, consultarlo y reembolsar.
// - Producción: MONEI_API_KEY en Vercel (la de test primero, luego la live).
// - Desarrollo sin clave: modo simulado — /pedir redirige a una página local
//   que finge ser la pasarela y dispara el mismo webhook.
// Seguridad: NUNCA nos fiamos del cuerpo del webhook; al recibirlo se consulta
// el pago directamente a la API de MONEI y se compara importe y pedido.
// ─────────────────────────────────────────────────────────────────────────────

const MONEI_KEY = process.env.MONEI_API_KEY;
const API = "https://api.monei.com/v1";

export const moneiReady = Boolean(MONEI_KEY);
export const devPagos = !moneiReady && !process.env.VERCEL;
// ¿Se ofrece "pagar ahora" en el checkout?
export const pagosDisponibles = moneiReady || devPagos;

async function monei(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: MONEI_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`MONEI ${method} ${path} → ${res.status}: ${(data.message || "").slice(0, 200)}`);
  }
  return data;
}

// Crea el pago y devuelve la URL de la página de pago alojada de MONEI.
export async function crearPago({ amountCents, orderId, code, origin }) {
  const volver = `${origin}/pedir?p=${orderId}.${code}`;
  if (devPagos) {
    return { id: `sim_${orderId}`, redirectUrl: `${origin}/pago-simulado?p=${orderId}.${code}&total=${amountCents}` };
  }
  const p = await monei("/payments", {
    method: "POST",
    body: {
      amount: amountCents,
      currency: "EUR",
      orderId,
      description: `Pedido #${code} — La Terracita Burger`,
      completeUrl: volver,
      cancelUrl: volver,
      failUrl: volver,
      callbackUrl: `${origin}/api/pago-webhook`,
    },
  });
  const redirectUrl = p.nextAction?.redirectUrl || p.redirectUrl;
  if (!redirectUrl) throw new Error("MONEI no devolvió la URL de pago");
  return { id: p.id, redirectUrl };
}

// Estado real de un pago, consultado a MONEI (la fuente de verdad del webhook).
export async function obtenerPago(pagoId) {
  return monei(`/payments/${encodeURIComponent(pagoId)}`);
}

// Reembolso total de un pago (al rechazar un pedido ya cobrado).
export async function reembolsar(pagoId, amountCents) {
  if (devPagos) return { simulado: true };
  return monei(`/payments/${encodeURIComponent(pagoId)}/refund`, {
    method: "POST",
    body: { amount: amountCents, refundReason: "requested_by_customer" },
  });
}
