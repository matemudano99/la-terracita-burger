// ─────────────────────────────────────────────────────────────────────────────
// /api/ajustes — pausar/reanudar pedidos online por local (el "cerrar tienda"
// de las plataformas de delivery).
//   GET          → público: { teatinos: {pausado, motivo}, rincon: {...} }
//                  (lo usa /pedir para avisar al cliente)
//   PUT (admin)  → { local, pausado, motivo? }
// ─────────────────────────────────────────────────────────────────────────────
import { requireUser } from "./_auth.js";
import { getAjustes, setAjuste, getCarta, pagosListos, tieneColumna, storeReady } from "./_store.js";
import { LOCALES } from "../src/locales.js";
import { pagosDisponibles } from "./_monei.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const ajustes = storeReady ? await getAjustes().catch(() => ({})) : {};
      // Estado de la carta (agotados/descuentos) por local — público, lo usa /pedir.
      const carta = {};
      if (storeReady) {
        for (const id of Object.keys(LOCALES)) carta[id] = await getCarta(id).catch(() => ({}));
      }
      const pagos = pagosDisponibles && (await pagosListos());
      const programar = storeReady && (await tieneColumna("programado_para"));
      const refundParcial = storeReady && (await tieneColumna("reembolsado_cents"));
      return res.status(200).json({ ajustes, carta, pagos, programar, refundParcial });
    }

    if (req.method === "PUT") {
      const user = await requireUser(req, res, ["admin"]);
      if (!user) return;
      if (!storeReady) return res.status(503).json({ error: "Falta configurar Supabase." });
      const b = req.body || {};
      if (!LOCALES[b.local]) return res.status(400).json({ error: "Local no válido." });
      await setAjuste(b.local, {
        pausado: !!b.pausado,
        motivo: String(b.motivo || "").trim().slice(0, 140),
      });
      return res.status(200).json({ ok: true, ajustes: await getAjustes() });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("[api/ajustes]", err);
    return res.status(500).json({ error: "Error interno." });
  }
}
