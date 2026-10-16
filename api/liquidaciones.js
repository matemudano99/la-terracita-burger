// ─────────────────────────────────────────────────────────────────────────────
// /api/liquidaciones — lo que MONEI transfiere de verdad al banco (solo admin).
//   GET → { settlements: [...], invoices: [...], ready }
// Los importes NO se estiman: salen de la API GraphQL de MONEI, que da el bruto,
// las comisiones de adquirencia, la reserva retenida y el neto transferido.
// La clave de MONEI vive solo en el servidor y nunca sale de aquí.
// ─────────────────────────────────────────────────────────────────────────────
import { requireUser } from "./_auth.js";
import { moneiReady, liquidaciones } from "./_monei.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido" });
  }
  const user = await requireUser(req, res, ["admin", "gerencia"]);
  if (!user) return;

  // En desarrollo sin clave de MONEI no hay nada que consultar: el panel lo
  // dice en vez de romperse.
  if (!moneiReady) {
    return res.status(200).json({ ready: false, settlements: [], invoices: [] });
  }
  try {
    const { settlements, invoices } = await liquidaciones();
    return res.status(200).json({ ready: true, settlements, invoices });
  } catch (err) {
    console.error("[api/liquidaciones]", err);
    return res.status(502).json({ error: "No hemos podido consultar las liquidaciones de MONEI. Inténtalo en un momento." });
  }
}
