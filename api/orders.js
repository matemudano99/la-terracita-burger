// ─────────────────────────────────────────────────────────────────────────────
// API de pedidos (Vercel Serverless Function).
//   POST  /api/orders                     → crear pedido (público)
//   GET   /api/orders?id=…&code=…         → estado de un pedido (público)
//   GET   /api/orders?panel=1&local=…     → listado para el panel de cocina*
//   PATCH /api/orders                     → aceptar/rechazar/actualizar*
//   (*) requieren la cabecera x-panel-token = PANEL_TOKEN
// Los precios SIEMPRE se recalculan aquí contra src/menu.js — nunca se confía
// en los importes que envía el navegador.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "node:crypto";
import { priceLine, fmtEUR } from "../src/menu.js";
import { LOCALES, estadoLocal } from "../src/locales.js";
import { insertOrder, getOrder, listOrders, listRecientes, listHistorial, getAjustes, countNoShows, updateOrder, storeReady, usingSupabase } from "./_store.js";
import { requireUser } from "./_auth.js";

const ESTADOS = ["nuevo", "aceptado", "lista", "entregado", "rechazado", "no_recogido"];
// Ventana y umbrales anti pedidos fantasma (pedidos que nadie recoge):
// con 1 sin recoger se avisa a cocina; con 2 el teléfono queda bloqueado.
// 30 días para ser coherentes con la retención de datos de la política
// de privacidad (pasado ese plazo los pedidos se anonimizan).
const NO_SHOW_DIAS = 30;
const NO_SHOW_BLOQUEO = 2;

const publicView = (o) => ({
  id: o.id,
  code: o.code,
  local: o.local,
  status: o.status,
  ready_at: o.ready_at,
  total_cents: o.total_cents,
  created_at: o.created_at,
});

export default async function handler(req, res) {
  try {
    if (!storeReady) {
      return res.status(503).json({ error: "Los pedidos online no están configurados todavía (falta Supabase). Llámanos por teléfono 🙏" });
    }

    if (req.method === "POST") return await crear(req, res);
    if (req.method === "GET") return await consultar(req, res);
    if (req.method === "PATCH") return await actualizar(req, res);
    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("[api/orders]", err);
    return res.status(500).json({ error: "Error interno. Inténtalo de nuevo o llámanos por teléfono." });
  }
}

async function crear(req, res) {
  const b = req.body || {};

  // Honeypot: campo invisible para humanos; si viene relleno es un bot.
  if (b.web) return res.status(400).json({ error: "No se pudo enviar el pedido." });

  const loc = LOCALES[b.local];
  if (!loc) return res.status(400).json({ error: "Elige un local válido." });

  const estado = estadoLocal(b.local);
  if (!estado.abierto) return res.status(409).json({ error: `${estado.mensaje} — ${estado.detalle}` });

  // ¿Pedidos pausados desde el panel de administración? Si la consulta falla
  // (p. ej. tabla aún no creada), se asume "sin pausa": nunca bloquea pedidos.
  const ajustes = await getAjustes().catch(() => ({}));
  if (ajustes[b.local]?.pausado) {
    const motivo = ajustes[b.local].motivo;
    return res.status(409).json({ error: `Pedidos online pausados temporalmente${motivo ? ` (${motivo})` : ""}. Llámanos y te atendemos: ${loc.phone}.` });
  }

  const nombre = String(b.nombre || "").trim().slice(0, 60);
  const telefono = String(b.telefono || "").replace(/[\s.-]/g, "");
  if (nombre.length < 2) return res.status(400).json({ error: "Dinos tu nombre para el pedido." });
  if (!/^\+?\d{9,15}$/.test(telefono)) return res.status(400).json({ error: "Necesitamos un teléfono válido por si hay dudas con el pedido." });

  // Antiabuso: un solo pedido pendiente por teléfono, y límite de frecuencia
  // por teléfono e IP en las últimas 2 horas.
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "";
  const recientes = await listRecientes(new Date(Date.now() - 2 * 3600 * 1000).toISOString());
  const delTelefono = recientes.filter((o) => o.telefono === telefono);
  const deLaIp = ip ? recientes.filter((o) => o.ip === ip) : [];
  if (delTelefono.some((o) => o.status === "nuevo")) {
    return res.status(429).json({ error: "Ya tienes un pedido pendiente de confirmar. Espera a que el local lo acepte o llámanos para cambiarlo." });
  }
  if (delTelefono.length >= 3 || deLaIp.length >= 5) {
    return res.status(429).json({ error: "Has llegado al límite de pedidos online por ahora. Si necesitas algo más, llámanos por teléfono 🙏" });
  }

  // Pedidos fantasma: si este teléfono ya dejó pedidos sin recoger, se escala.
  const noShows = await countNoShows(telefono, new Date(Date.now() - NO_SHOW_DIAS * 24 * 3600 * 1000).toISOString()).catch(() => 0);
  if (noShows >= NO_SHOW_BLOQUEO) {
    return res.status(403).json({ error: `Este teléfono tiene pedidos anteriores sin recoger, así que no podemos aceptar más pedidos online. Llámanos y te atendemos encantados: ${loc.phone}.` });
  }

  if (!Array.isArray(b.lineas) || b.lineas.length < 1 || b.lineas.length > 30) {
    return res.status(400).json({ error: "El carrito está vacío." });
  }
  const items = [];
  let total = 0;
  for (const l of b.lineas) {
    const priced = priceLine({ itemId: l.itemId, variantId: l.variantId, upgradeId: l.upgradeId, extraIds: l.extraIds, panId: l.panId, qty: l.qty });
    if (!priced) return res.status(400).json({ error: "Hay un producto no válido en el carrito. Recarga la página e inténtalo de nuevo." });
    priced.nota = String(l.nota || "").trim().slice(0, 140) || null;
    items.push(priced);
    total += priced.lineCents;
  }
  if (total > 50000) return res.status(400).json({ error: "Para pedidos tan grandes, llámanos por teléfono y te lo preparamos 😉" });

  const order = {
    id: randomUUID(),
    code: String(Math.floor(100 + Math.random() * 900)),
    local: b.local,
    nombre,
    telefono,
    items,
    nota: String(b.nota || "").trim().slice(0, 300) || null,
    ip: ip || null,
    alerta: noShows === 1 ? "Este teléfono dejó 1 pedido sin recoger — confirma por teléfono antes de cocinar" : null,
    total_cents: total,
    status: "nuevo",
    ready_at: null,
    created_at: new Date().toISOString(),
  };
  const saved = await insertOrder(order);
  return res.status(201).json({ ...publicView(saved), total_label: fmtEUR(saved.total_cents) });
}

async function consultar(req, res) {
  const q = req.query || {};

  // Panel de cocina — listado del día (empleados y admin)
  if (q.panel) {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!LOCALES[q.local]) return res.status(400).json({ error: "Local no válido" });
    if (user.rol === "empleado" && user.local && user.local !== q.local) {
      return res.status(403).json({ error: `Tu cuenta solo tiene acceso al local ${LOCALES[user.local]?.name || user.local}.` });
    }
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const rows = await listOrders(q.local, since);
    return res.status(200).json({ orders: rows, supabase: usingSupabase });
  }

  // Historial para administración (rango de fechas, filtro por local)
  if (q.historial) {
    const user = await requireUser(req, res, ["admin"]);
    if (!user) return;
    const hasta = q.hasta ? new Date(q.hasta) : new Date();
    const desde = q.desde ? new Date(q.desde) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
    if (isNaN(desde) || isNaN(hasta)) return res.status(400).json({ error: "Fechas no válidas" });
    if (q.local && !LOCALES[q.local]) return res.status(400).json({ error: "Local no válido" });
    const rows = await listHistorial({ desde: desde.toISOString(), hasta: hasta.toISOString(), local: q.local || null });
    return res.status(200).json({ orders: rows, supabase: usingSupabase });
  }

  // Cliente — estado de su pedido (id UUID no adivinable + code)
  if (q.id && q.code) {
    const o = await getOrder(String(q.id));
    if (!o || o.code !== String(q.code)) return res.status(404).json({ error: "Pedido no encontrado" });
    return res.status(200).json(publicView(o));
  }
  return res.status(400).json({ error: "Parámetros no válidos" });
}

async function actualizar(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const b = req.body || {};
  if (!b.id) return res.status(400).json({ error: "Falta id" });
  if (!ESTADOS.includes(b.status)) return res.status(400).json({ error: "Estado no válido" });

  if (user.rol === "empleado" && user.local) {
    const existente = await getOrder(String(b.id));
    if (existente && existente.local !== user.local) {
      return res.status(403).json({ error: `Tu cuenta solo tiene acceso al local ${LOCALES[user.local]?.name || user.local}.` });
    }
  }

  const patch = { status: b.status };
  if (b.status === "aceptado") {
    const mins = Math.min(120, Math.max(5, Number(b.ready_minutes) || 25));
    patch.ready_at = new Date(Date.now() + mins * 60000).toISOString();
  }
  const updated = await updateOrder(String(b.id), patch);
  if (!updated) return res.status(404).json({ error: "Pedido no encontrado" });
  return res.status(200).json({ ok: true, order: updated });
}
