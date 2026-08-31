// ─────────────────────────────────────────────────────────────────────────────
// /api/ajustes — pausar/reanudar pedidos online por local (el "cerrar tienda"
// de las plataformas de delivery).
//   GET   → público: { teatinos: {pausado, motivo, desde}, rincon: {...} }
//           (lo usa /pedir para avisar al cliente)
//   PUT   → { local, pausado, motivo? }. Lo puede hacer el admin (cualquier
//           local) y también la cocina desde su panel: si se rompe la freidora
//           o van saturados, cierran ellos mismos sin esperar a nadie.
// ─────────────────────────────────────────────────────────────────────────────
import { requireUser } from "./_auth.js";
import { getAjustes, setAjuste, getCartaTodos, getPrecios, preciosListos, getProductos, productosListos, pagosListos, tieneColumna, storeReady } from "./_store.js";
import { LOCALES } from "../src/locales.js";
import { pagosDisponibles } from "./_monei.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const ajustes = storeReady ? await getAjustes().catch(() => ({})) : {};
      // Estado de la carta (agotados/descuentos) de todos los locales en una
      // sola consulta — público, lo usa /pedir.
      const carta = storeReady ? await getCartaTodos().catch(() => ({})) : {};
      // Precios cambiados desde /admin (sin fila, manda src/menu.js).
      const precios = storeReady && (await preciosListos()) ? await getPrecios().catch(() => ({})) : {};
      // Productos añadidos, renombrados u ocultados desde /admin.
      const productos = storeReady && (await productosListos()) ? await getProductos().catch(() => []) : [];
      const pagos = pagosDisponibles && (await pagosListos());
      const programar = storeReady && (await tieneColumna("programado_para"));
      const refundParcial = storeReady && (await tieneColumna("reembolsado_cents"));
      // Datos poco cambiantes y no personalizados: la red de Vercel puede
      // cachearlos unos segundos y ahorrar invocaciones bajo carga. Como mucho,
      // un cambio (pausa/agotado) tarda ~10 s en verse (antes /pedir ya sondeaba
      // cada 60 s, así que es más fresco que antes).
      res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
      return res.status(200).json({ ajustes, carta, precios, productos, pagos, programar, refundParcial });
    }

    if (req.method === "PUT") {
      const user = await requireUser(req, res, ["admin", "empleado"]);
      if (!user) return;
      if (!storeReady) return res.status(503).json({ error: "Falta configurar Supabase." });
      const b = req.body || {};
      if (!LOCALES[b.local]) return res.status(400).json({ error: "Local no válido." });
      // Un empleado con local asignado solo puede cerrar el suyo.
      if (user.rol === "empleado" && user.local && user.local !== b.local) {
        return res.status(403).json({ error: "Solo puedes abrir o cerrar el local en el que trabajas." });
      }
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
