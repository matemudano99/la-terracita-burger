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
import { priceLine, fmtEUR, itemName, fusionarCarta, promoDescuento, PEDIDO_MINIMO_CENTS } from "../src/menu.js";
import { LOCALES, estadoLocal, estadoReparto, validarProgramado, distanciaKm } from "../src/locales.js";
import { insertOrder, getOrder, listOrders, listRecientes, listHistorial, getAjustes, getCarta, getPrecios, preciosListos, getProductos, productosListos, pagosListos, tieneColumna, updateOrder, storeReady, usingSupabase } from "./_store.js";
import { requireUser } from "./_auth.js";
import { pagosDisponibles, crearPago, reembolsar } from "./_monei.js";
import { geocodificar, GeoNoDisponible, mismoMunicipio } from "./_geo.js";

const ESTADOS = ["nuevo", "aceptado", "lista", "entregado", "rechazado", "no_recogido"];

const publicView = (o) => ({
  id: o.id,
  code: o.code,
  local: o.local,
  status: o.status,
  ready_at: o.ready_at,
  total_cents: o.total_cents,
  created_at: o.created_at,
  pago_metodo: o.pago_metodo || "local",
  pago_estado: o.pago_estado || null,
  entrega: o.entrega || "recogida",
  direccion: o.direccion || null,
  envio_cents: o.envio_cents || 0,
  programado_para: o.programado_para || null,
  reembolsado_cents: o.reembolsado_cents || 0,
  promo_cents: o.promo_cents || 0,
});

// Origen público de la petición (para las URLs de retorno y webhook del pago).
function origenDe(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "laterracitaburger.com";
  const proto = req.headers["x-forwarded-proto"] || (String(host).startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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

  const ahora = new Date();
  const aDomicilio = b.entrega === "domicilio";

  // Pedido programado (para más tarde o cuando está cerrado). Si es válido, se
  // salta la comprobación de "abierto ahora". A domicilio, la franja además
  // tiene que caer dentro del horario de reparto, más corto que el del local.
  let programadoISO = null;
  if (b.programado_para) {
    if (!(await tieneColumna("programado_para"))) {
      return res.status(400).json({ error: "Los pedidos programados no están disponibles todavía." });
    }
    const v = validarProgramado(b.local, b.programado_para, ahora, aDomicilio);
    if (!v.ok) return res.status(400).json({ error: v.error });
    programadoISO = v.iso;
  }

  const estado = estadoLocal(b.local, ahora);
  if (!programadoISO && !estado.abierto) {
    return res.status(409).json({ error: `${estado.mensaje} — ${estado.detalle}. Puedes dejar tu pedido programado.` });
  }

  // El reparto tiene su propio horario dentro del horario del local.
  if (aDomicilio && !programadoISO) {
    const reparto = estadoReparto(b.local, ahora);
    if (!reparto.disponible) {
      return res.status(409).json({ error: `${reparto.mensaje} — ${reparto.detalle}. Puedes recoger en el local, programarlo o pedirnos por Glovo o Uber Eats.` });
    }
  }

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

  // Antiabuso: límite de frecuencia por teléfono e IP en las últimas 2 horas.
  // Los pagos sin completar (pendiente_pago) no cuentan, para no penalizar
  // reintentos de pago. Con prepago no hay pedidos fantasma que bloquear.
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "";
  const recientes = await listRecientes(new Date(Date.now() - 2 * 3600 * 1000).toISOString());
  const reales = recientes.filter((o) => o.status !== "pendiente_pago");
  const delTelefono = reales.filter((o) => o.telefono === telefono);
  const deLaIp = ip ? reales.filter((o) => o.ip === ip) : [];
  if (delTelefono.length >= 4 || deLaIp.length >= 6) {
    return res.status(429).json({ error: "Has llegado al límite de pedidos online por ahora. Si necesitas algo más, llámanos por teléfono 🙏" });
  }

  if (!Array.isArray(b.lineas) || b.lineas.length < 1 || b.lineas.length > 30) {
    return res.status(400).json({ error: "El carrito está vacío." });
  }
  // Estado de la carta del local (agotados y descuentos, desde /cocina) y
  // precios vigentes (los editados desde /admin mandan sobre src/menu.js).
  const carta = await getCarta(b.local).catch(() => ({}));
  const precios = (await preciosListos()) ? await getPrecios().catch(() => ({})) : {};
  // Carta efectiva: la de src/menu.js con lo editado desde /admin.
  const menu = fusionarCarta((await productosListos()) ? await getProductos().catch(() => []) : []);

  const items = [];
  let total = 0;
  for (const l of b.lineas) {
    if (carta[l.itemId]?.agotado) {
      return res.status(409).json({ error: `"${itemName(l.itemId, menu)}" se nos ha agotado hoy 😔 — quítalo del carrito y elige otra cosa.` });
    }
    const priced = priceLine({ itemId: l.itemId, variantId: l.variantId, upgradeId: l.upgradeId, extraIds: l.extraIds, panId: l.panId, qty: l.qty, carta, precios, menu });
    if (!priced) return res.status(400).json({ error: "Hay un producto no válido en el carrito. Recarga la página e inténtalo de nuevo." });
    priced.nota = String(l.nota || "").trim().slice(0, 140) || null;
    items.push(priced);
    total += priced.lineCents;
  }
  // Promoción web: la calcula SIEMPRE el servidor sobre las líneas ya
  // valoradas; el navegador solo la enseña.
  const promoCents = promoDescuento(items, menu);
  total -= promoCents;

  if (total > 50000) return res.status(400).json({ error: "Para pedidos tan grandes, llámanos por teléfono y te lo preparamos 😉" });

  // Modalidad de entrega. El reparto propio está oculto tras el flag
  // delivery.activo del local (src/locales.js).
  const domicilio = b.entrega === "domicilio";
  if (domicilio && !loc.delivery?.activo) {
    return res.status(400).json({ error: "El reparto a domicilio no está disponible — elige recogida en el local." });
  }
  let direccion = null;
  let envioCents = 0;
  if (domicilio) {
    const calle = String(b.direccion || "").trim().slice(0, 160);
    const piso = String(b.piso || "").trim().slice(0, 60);
    if (calle.length < 6) return res.status(400).json({ error: "Escribe la calle y el número de entrega." });

    // Control de zona: geocodifica la dirección y comprueba la distancia al local.
    if (loc.delivery.radioKm && loc.lat != null) {
      let punto;
      try {
        punto = await geocodificar(`${calle}, ${loc.name}, Málaga, España`);
      } catch (err) {
        // El geocodificador está caído: no podemos garantizar la zona, así que
        // no aceptamos el reparto a ciegas — pero se dice lo que pasa.
        if (err instanceof GeoNoDisponible) {
          console.error("[geo]", err.message);
          return res.status(503).json({ error: `No hemos podido comprobar tu dirección ahora mismo. Elige recogida en el local o llámanos y te lo llevamos: ${loc.phone}.` });
        }
        throw err;
      }
      if (!punto) {
        return res.status(400).json({ error: "No hemos encontrado esa dirección. Revisa la calle y el número, o llámanos y te ayudamos." });
      }
      // El municipio manda sobre el radio: en línea recta hay pueblos vecinos
      // más cerca que barrios propios, y ahí no repartimos.
      const municipio = loc.delivery.municipio;
      if (municipio && !mismoMunicipio(punto.municipio, municipio)) {
        return res.status(400).json({ error: `Solo repartimos en ${municipio}${punto.municipio ? ` y esa dirección está en ${punto.municipio}` : ""}. Puedes elegir recogida en el local.` });
      }
      const km = distanciaKm(loc.lat, loc.lon, punto.lat, punto.lon);
      if (km > loc.delivery.radioKm) {
        return res.status(400).json({ error: `Tu dirección está a ${km.toFixed(1)} km del local — fuera de nuestra zona de reparto (máx. ${loc.delivery.radioKm} km). Puedes elegir recogida.` });
      }
    }
    direccion = piso ? `${calle} (${piso})` : calle;
    envioCents = loc.delivery.gastosCents || 0;
  }

  // Pedido mínimo (sobre los productos ya con la promo, sin gastos de envío).
  const minimo = domicilio ? (loc.delivery.minimoCents || PEDIDO_MINIMO_CENTS) : PEDIDO_MINIMO_CENTS;
  if (total < minimo) {
    return res.status(400).json({ error: `El pedido mínimo ${domicilio ? "a domicilio" : "online"} es de ${fmtEUR(minimo)} — te faltan ${fmtEUR(minimo - total)}.` });
  }
  total += envioCents;

  // Todo prepagado: el pedido nace invisible ("pendiente_pago") y solo el
  // webhook de MONEI, tras confirmar el cobro, lo pasa a cocina.
  if (!(pagosDisponibles && (await pagosListos()))) {
    return res.status(503).json({ error: `Los pedidos online no están disponibles ahora mismo. Llámanos y te atendemos: ${loc.phone}.` });
  }

  const order = {
    id: randomUUID(),
    code: String(Math.floor(100 + Math.random() * 900)),
    local: b.local,
    nombre,
    telefono,
    items,
    nota: String(b.nota || "").trim().slice(0, 300) || null,
    ip: ip || null,
    total_cents: total,
    status: "pendiente_pago",
    ready_at: null,
    created_at: new Date().toISOString(),
    pago_metodo: "online",
    pago_estado: "pendiente",
    pago_id: null,
    // Campos opcionales solo si se usan (requieren su columna en Supabase).
    ...(domicilio ? { entrega: "domicilio", direccion, envio_cents: envioCents } : {}),
    ...(programadoISO ? { programado_para: programadoISO } : {}),
    ...(promoCents > 0 && (await tieneColumna("promo_cents")) ? { promo_cents: promoCents } : {}),
  };
  const saved = await insertOrder(order);

  try {
    const pago = await crearPago({ amountCents: total, orderId: saved.id, code: saved.code, origin: origenDe(req) });
    await updateOrder(saved.id, { pago_id: pago.id });
    return res.status(201).json({ ...publicView(saved), total_label: fmtEUR(total), pago: { redirectUrl: pago.redirectUrl } });
  } catch (err) {
    console.error("[api/orders] crearPago", err);
    return res.status(502).json({ error: "No se pudo iniciar el pago online. Inténtalo de nuevo o llámanos por teléfono." });
  }
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
    // Los pagos online sin completar no existen para la cocina.
    return res.status(200).json({ orders: rows.filter((o) => o.status !== "pendiente_pago"), supabase: usingSupabase });
  }

  // Historial para administración (rango de fechas, filtro por local)
  if (q.historial) {
    const user = await requireUser(req, res, ["admin", "gerencia"]);
    if (!user) return;
    const hasta = q.hasta ? new Date(q.hasta) : new Date();
    const desde = q.desde ? new Date(q.desde) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
    if (isNaN(desde) || isNaN(hasta)) return res.status(400).json({ error: "Fechas no válidas" });
    if (q.local && !LOCALES[q.local]) return res.status(400).json({ error: "Local no válido" });
    const rows = await listHistorial({ desde: desde.toISOString(), hasta: hasta.toISOString(), local: q.local || null });
    return res.status(200).json({ orders: rows.filter((o) => o.status !== "pendiente_pago"), supabase: usingSupabase });
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

  const existente = await getOrder(String(b.id));
  if (!existente) return res.status(404).json({ error: "Pedido no encontrado" });
  if (existente.status === "pendiente_pago") {
    return res.status(409).json({ error: "Este pedido aún no ha completado el pago." });
  }
  if (user.rol === "empleado" && user.local && existente.local !== user.local) {
    return res.status(403).json({ error: `Tu cuenta solo tiene acceso al local ${LOCALES[user.local]?.name || user.local}.` });
  }

  // Devolución manual (total o parcial) SIN cambiar el estado del pedido
  // (p. ej. una reclamación después de entregarlo, o devolver solo un producto).
  if (b.accion === "reembolsar") {
    if (!(existente.pago_id && ["pagado", "reembolso_parcial"].includes(existente.pago_estado))) {
      return res.status(409).json({ error: "Este pedido no tiene un cobro online que se pueda devolver." });
    }
    // Las devoluciones parciales necesitan la columna acumuladora. Si aún no
    // existe (SQL sin ejecutar), solo se admite la devolución total.
    const parcialOk = await tieneColumna("reembolsado_cents");
    const yaDevuelto = existente.reembolsado_cents || 0;
    const disponible = existente.total_cents - yaDevuelto;
    let importe = b.importe_cents == null ? disponible : Math.floor(Number(b.importe_cents));
    if (!parcialOk) importe = disponible; // sin columna: siempre total
    if (!Number.isFinite(importe) || importe <= 0) return res.status(400).json({ error: "Importe a devolver no válido." });
    if (importe > disponible) return res.status(400).json({ error: `Solo quedan ${fmtEUR(disponible)} por devolver de este pedido.` });
    try {
      await reembolsar(existente.pago_id, importe);
    } catch (err) {
      console.error("[api/orders] reembolso manual", err);
      return res.status(502).json({ error: "No se pudo hacer la devolución — reintenta en unos segundos o gestiónala desde el panel de MONEI." });
    }
    const totalDevuelto = yaDevuelto + importe;
    const patch = { pago_estado: totalDevuelto >= existente.total_cents ? "reembolsado" : "reembolso_parcial" };
    if (parcialOk) patch.reembolsado_cents = totalDevuelto;
    const updated = await updateOrder(String(b.id), patch);
    return res.status(200).json({ ok: true, order: updated });
  }

  if (!ESTADOS.includes(b.status)) return res.status(400).json({ error: "Estado no válido" });

  const patch = { status: b.status };
  if (b.status === "aceptado") {
    const mins = Math.min(120, Math.max(5, Number(b.ready_minutes) || 25));
    patch.ready_at = new Date(Date.now() + mins * 60000).toISOString();
  }

  // Rechazar un pedido cobrado → reembolso automático de lo que quede. Si el
  // reembolso falla, NO se rechaza: el dinero manda, que el personal reintente.
  if (b.status === "rechazado" && existente.pago_id && ["pagado", "reembolso_parcial"].includes(existente.pago_estado)) {
    const disponible = existente.total_cents - (existente.reembolsado_cents || 0);
    if (disponible > 0) {
      try {
        await reembolsar(existente.pago_id, disponible);
        patch.pago_estado = "reembolsado";
        if (await tieneColumna("reembolsado_cents")) patch.reembolsado_cents = existente.total_cents;
      } catch (err) {
        console.error("[api/orders] reembolso", err);
        return res.status(502).json({ error: "No se pudo hacer el reembolso — reintenta en unos segundos o gestiónalo desde el panel de MONEI antes de rechazar." });
      }
    }
  }

  const updated = await updateOrder(String(b.id), patch);
  if (!updated) return res.status(404).json({ error: "Pedido no encontrado" });
  return res.status(200).json({ ok: true, order: updated });
}
