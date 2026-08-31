// ─────────────────────────────────────────────────────────────────────────────
// /api/productos — crear, editar y quitar productos de la carta (solo admin).
//   GET    → { productos: [...], listo }
//   PUT    → alta o edición: { id?, categoria, nombre, nombre_en?, descripcion?,
//            descripcion_en?, etiqueta?, variantes: [{id,label,cents}] }
//   DELETE → ?id=…  quita el producto: si venía de src/menu.js se oculta
//            (no se puede borrar del código), si se creó aquí se borra.
// La carta de src/menu.js es la base; esta tabla es una capa encima.
// ─────────────────────────────────────────────────────────────────────────────
import { requireUser } from "./_auth.js";
import { getProductos, setProducto, borrarProducto, productosListos, storeReady } from "./_store.js";
import { MENU } from "../src/menu.js";

const CATEGORIAS = new Set(MENU.filter((c) => !c.soloCarta).map((c) => c.id));
const esDelCodigo = (id) => MENU.some((c) => c.items.some((i) => i.id === id));

// "Burger de la abuela" → "burger-de-la-abuela"
const aSlug = (txt) =>
  String(txt).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const texto = (v, max) => (v == null ? null : String(v).trim().slice(0, max) || null);

// Valida y normaliza las variantes que llegan del panel.
function limpiarVariantes(lista) {
  if (!Array.isArray(lista) || lista.length === 0 || lista.length > 6) return null;
  const out = [];
  const ids = new Set();
  for (const v of lista) {
    const cents = Math.floor(Number(v?.cents));
    if (!Number.isFinite(cents) || cents < 0 || cents > 100000) return null;
    const label = texto(v?.label, 24) || "";
    const id = aSlug(v?.id || label) || "u";
    if (ids.has(id)) return null;
    ids.add(id);
    out.push({ id, label, cents });
  }
  return out;
}

export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res, ["admin"]);
    if (!user) return;
    if (!storeReady) return res.status(503).json({ error: "Falta configurar Supabase." });

    if (!(await productosListos())) {
      return res.status(200).json({
        listo: false,
        productos: [],
        error: "Falta crear la tabla `productos` en Supabase (el SQL está en supabase/schema.sql).",
      });
    }

    if (req.method === "GET") {
      return res.status(200).json({ listo: true, productos: await getProductos() });
    }

    if (req.method === "PUT") {
      const b = req.body || {};
      const nombre = texto(b.nombre, 60);
      if (!nombre) return res.status(400).json({ error: "El producto necesita un nombre." });

      const id = b.id ? String(b.id) : aSlug(nombre);
      if (!id) return res.status(400).json({ error: "Nombre no válido." });

      // Un producto del código conserva su categoría y sus variantes: aquí solo
      // se le cambian los textos.
      const delCodigo = esDelCodigo(id);
      const categoria = delCodigo ? (b.categoria || "") : String(b.categoria || "");
      if (!delCodigo && !CATEGORIAS.has(categoria)) {
        return res.status(400).json({ error: "Elige una categoría válida." });
      }
      if (!b.id) {
        const existentes = await getProductos();
        if (esDelCodigo(id) || existentes.some((p) => p.id === id)) {
          return res.status(409).json({ error: "Ya hay un producto con ese nombre — cámbialo un poco." });
        }
      }

      let variantes = [];
      if (!delCodigo) {
        variantes = limpiarVariantes(b.variantes);
        if (!variantes) return res.status(400).json({ error: "Revisa los precios: cada opción necesita un importe válido." });
      } else if (Array.isArray(b.variantes) && b.variantes.length) {
        variantes = limpiarVariantes(b.variantes) || [];
      }

      await setProducto({
        id,
        categoria: delCodigo ? (MENU.find((c) => c.items.some((i) => i.id === id))?.id || "smash") : categoria,
        nombre,
        nombre_en: texto(b.nombre_en, 60),
        descripcion: texto(b.descripcion, 300),
        descripcion_en: texto(b.descripcion_en, 300),
        etiqueta: texto(b.etiqueta, 20),
        variantes,
        oculto: false,
      });
      return res.status(200).json({ ok: true, productos: await getProductos() });
    }

    if (req.method === "DELETE") {
      const id = String(req.query?.id || "");
      if (!id) return res.status(400).json({ error: "Falta el producto." });
      if (esDelCodigo(id)) {
        // Está en el código: no se puede borrar, se oculta de la carta.
        const base = MENU.find((c) => c.items.some((i) => i.id === id));
        const item = base?.items.find((i) => i.id === id);
        await setProducto({
          id,
          categoria: base?.id || "smash",
          nombre: item?.name || id,
          variantes: [],
          oculto: true,
        });
        return res.status(200).json({ ok: true, oculto: true, productos: await getProductos() });
      }
      await borrarProducto(id);
      return res.status(200).json({ ok: true, oculto: false, productos: await getProductos() });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("[api/productos]", err);
    return res.status(500).json({ error: "Error interno." });
  }
}
