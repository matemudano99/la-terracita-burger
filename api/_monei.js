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
// El REST solo cubre pagos; las liquidaciones y las facturas de comisiones
// viven en la API GraphQL, con la misma clave.
const GRAPHQL = "https://graphql.monei.com";

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

// Consulta a la API GraphQL de MONEI (liquidaciones, facturas, saldos).
async function graphql(query) {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: { Authorization: MONEI_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`MONEI GraphQL → ${res.status}`);
  if (data.errors) throw new Error(`MONEI GraphQL: ${(data.errors[0]?.message || "").slice(0, 200)}`);
  return data.data;
}

// Liquidaciones (lo que MONEI transfiere al banco) y facturas de comisiones
// (que se cobran aparte, por recibo domiciliado). Importes en céntimos.
export async function liquidaciones() {
  const d = await graphql(`{
    accountSettlements {
      items {
        id status payMethod currency
        grossVolume acquirerFees netVolume reservedAmount releasedAmount
        periodStartAt periodEndAt scheduledAt
      }
    }
    accountInvoices {
      items { number createdAt status amount tax totalAmount }
    }
  }`);
  return {
    settlements: d.accountSettlements?.items || [],
    invoices: d.accountInvoices?.items || [],
  };
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

// Reembolso de un pago (total o parcial). `amountCents` es el importe a
// devolver en esta operación; MONEI admite varios reembolsos parciales
// mientras la suma no supere el cobro.
export async function reembolsar(pagoId, amountCents) {
  if (devPagos) return { simulado: true };
  return monei(`/payments/${encodeURIComponent(pagoId)}/refund`, {
    method: "POST",
    body: { amount: amountCents, refundReason: "requested_by_customer" },
  });
}
