// ─────────────────────────────────────────────────────────────────────────────
// /api/precios — cambiar los precios de la carta desde /admin (solo admin).
//   GET → { precios: { "itemId:variantId": cents }, listo }
//   PUT → { itemId, variantId, cents }   cents = null → vuelve al de la carta
// Los precios de src/menu.js son los de partida; aquí solo se guarda lo que se
// cambia. El servidor sigue recalculando cada pedido con estos precios, así que
// nunca se cobra lo que diga el navegador.
// ─────────────────────────────────────────────────────────────────────────────
import { requireUser } from "./_auth.js";
import { getPrecios, setPrecio, borrarPrecio, preciosListos, storeReady } from "./_store.js";
import { MENU, EXTRAS, PANES, UPGRADES, ID_EXTRA, ID_PAN, ID_UPGRADE } from "../src/menu.js";

// Todo lo que se puede editar: producto+variante, extras, panes y patatas.
function editables() {
  const ids = new Set();
  for (const cat of MENU) {
    if (cat.soloCarta) continue; // los extras se editan por su propio id
    for (const it of cat.items) {
      for (const v of it.variants || []) ids.add(`${it.id}:${v.id}`);
    }
  }
  for (const e of EXTRAS) ids.add(`${ID_EXTRA(e.id)}:u`);
  for (const p of PANES) ids.add(`${ID_PAN(p.id)}:u`);
  for (const u of UPGRADES) ids.add(`${ID_UPGRADE(u.id)}:u`);
  return ids;
}

export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res, ["admin"]);
    if (!user) return;
    if (!storeReady) return res.status(503).json({ error: "Falta configurar Supabase." });

    const listo = await preciosListos();
    if (!listo) {
      return res.status(200).json({
        listo: false,
        precios: {},
        error: "Falta crear la tabla `precios` en Supabase (el SQL está en supabase/schema.sql).",
      });
    }

    if (req.method === "GET") {
      return res.status(200).json({ listo: true, precios: await getPrecios() });
    }

    if (req.method === "PUT") {
      const b = req.body || {};
      const itemId = String(b.itemId || "");
      const variantId = String(b.variantId || "u");
      if (!editables().has(`${itemId}:${variantId}`)) {
        return res.status(400).json({ error: "Ese producto no existe en la carta." });
      }
      // cents = null → se borra la fila y vuelve a mandar src/menu.js.
      if (b.cents === null || b.cents === "") {
        await borrarPrecio(itemId, variantId);
      } else {
        const cents = Math.floor(Number(b.cents));
        if (!Number.isFinite(cents) || cents < 0 || cents > 100000) {
          return res.status(400).json({ error: "Precio no válido (entre 0 y 1.000 €)." });
        }
        await setPrecio(itemId, variantId, cents);
      }
      return res.status(200).json({ ok: true, precios: await getPrecios() });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("[api/precios]", err);
    return res.status(500).json({ error: "Error interno." });
  }
}
