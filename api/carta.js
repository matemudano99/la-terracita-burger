// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/carta — gestión de la carta por local desde /cocina (empleados y
// admin): marcar productos agotados y ponerles descuento (%).
//   { local, itemId, agotado, descuento }
// El estado se lee públicamente vía GET /api/ajustes (lo usa /pedir).
// ─────────────────────────────────────────────────────────────────────────────
import { requireUser } from "./_auth.js";
import { getCarta, setCartaItem, getProductos, productosListos, storeReady } from "./_store.js";
import { LOCALES } from "../src/locales.js";
import { fusionarCarta } from "../src/menu.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "PUT") {
      res.setHeader("Allow", "PUT");
      return res.status(405).json({ error: "Método no permitido" });
    }
    const user = await requireUser(req, res);
    if (!user) return;
    if (!storeReady) return res.status(503).json({ error: "Falta configurar Supabase." });

    const b = req.body || {};
    if (!LOCALES[b.local]) return res.status(400).json({ error: "Local no válido." });
    if (user.rol === "empleado" && user.local && user.local !== b.local) {
      return res.status(403).json({ error: `Tu cuenta solo gestiona ${LOCALES[user.local]?.name || user.local}.` });
    }
    const menu = fusionarCarta((await productosListos()) ? await getProductos().catch(() => []) : []);
    const existe = menu.some((c) => !c.soloCarta && c.items.some((i) => i.id === b.itemId));
    if (!existe) return res.status(400).json({ error: "Producto no válido." });

    const descuento = Math.min(90, Math.max(0, Math.floor(Number(b.descuento) || 0)));
    await setCartaItem(b.local, b.itemId, { agotado: !!b.agotado, descuento });
    return res.status(200).json({ ok: true, carta: await getCarta(b.local) });
  } catch (err) {
    console.error("[api/carta]", err);
    return res.status(500).json({ error: "Error interno." });
  }
}
