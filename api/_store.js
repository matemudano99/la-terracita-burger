// ─────────────────────────────────────────────────────────────────────────────
// Almacenamiento de pedidos.
// - Producción: Supabase (tabla `pedidos`) vía su API REST, con la clave
//   service_role. Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel.
// - Desarrollo local sin Supabase: memoria del proceso (se pierde al reiniciar).
//   En Vercel NUNCA se usa memoria: cada invocación es un proceso distinto.
// ─────────────────────────────────────────────────────────────────────────────

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = "pedidos";

export const usingSupabase = Boolean(SUPA_URL && SUPA_KEY);
export const storeReady = usingSupabase || !process.env.VERCEL;

async function supa(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  // Los upserts sin return=representation responden 201 con cuerpo vacío:
  // no intentes parsear JSON de una respuesta vacía.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Memoria (solo desarrollo) ────────────────────────────────────────────────
const mem = new Map();

export async function insertOrder(order) {
  if (usingSupabase) {
    const rows = await supa(TABLE, {
      method: "POST",
      body: order,
      headers: { Prefer: "return=representation" },
    });
    return rows[0];
  }
  mem.set(order.id, order);
  if (mem.size > 300) mem.delete(mem.keys().next().value);
  return order;
}

export async function getOrder(id) {
  if (usingSupabase) {
    const rows = await supa(`${TABLE}?id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] || null;
  }
  return mem.get(id) || null;
}

// Nº de pedidos que este teléfono dejó sin recoger desde una fecha.
export async function countNoShows(telefono, sinceISO) {
  if (usingSupabase) {
    const rows = await supa(
      `${TABLE}?telefono=eq.${encodeURIComponent(telefono)}&status=eq.no_recogido&created_at=gte.${encodeURIComponent(sinceISO)}&select=id&limit=10`
    );
    return rows.length;
  }
  return [...mem.values()].filter((o) => o.telefono === telefono && o.status === "no_recogido" && o.created_at >= sinceISO).length;
}

// Pedidos recientes de todos los locales (solo campos antiabuso).
export async function listRecientes(sinceISO) {
  if (usingSupabase) {
    return supa(
      `${TABLE}?created_at=gte.${encodeURIComponent(sinceISO)}&select=telefono,ip,status,created_at&limit=300`
    );
  }
  return [...mem.values()].filter((o) => o.created_at >= sinceISO);
}

export async function listOrders(local, sinceISO) {
  if (usingSupabase) {
    return supa(
      `${TABLE}?local=eq.${encodeURIComponent(local)}&created_at=gte.${encodeURIComponent(sinceISO)}&order=created_at.desc&limit=100`
    );
  }
  return [...mem.values()]
    .filter((o) => o.local === local && o.created_at >= sinceISO)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

const HISTORIAL_PAGINA = 1000;
const HISTORIAL_MAX = 20000;

// Historial para el panel de administración (rango de fechas, opcional local).
export async function listHistorial({ desde, hasta, local }) {
  if (usingSupabase) {
    let base = `${TABLE}?created_at=gte.${encodeURIComponent(desde)}&created_at=lte.${encodeURIComponent(hasta)}&order=created_at.desc`;
    if (local) base += `&local=eq.${encodeURIComponent(local)}`;
    // Supabase pagina las respuestas: un rango largo (meses, un año) necesita
    // varias vueltas o el panel enseñaría solo los 1000 pedidos más recientes.
    const out = [];
    while (out.length < HISTORIAL_MAX) {
      const rows = await supa(`${base}&limit=${HISTORIAL_PAGINA}&offset=${out.length}`);
      if (!rows?.length) break;
      out.push(...rows);
      if (rows.length < HISTORIAL_PAGINA) break;
    }
    return out;
  }
  return [...mem.values()]
    .filter((o) => o.created_at >= desde && o.created_at <= hasta && (!local || o.local === local))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// ¿Existe ya una columna en la tabla `pedidos`? Permite desplegar código que
// usa columnas nuevas ANTES de ejecutar su SQL (el deploy es seguro en
// cualquier orden). Solo se cachea el sí; el no se re-comprueba cada vez.
const cacheColumnas = new Set();
export async function tieneColumna(col) {
  if (!usingSupabase) return true;
  if (cacheColumnas.has(col)) return true;
  try {
    await supa(`${TABLE}?select=${encodeURIComponent(col)}&limit=1`);
    cacheColumnas.add(col);
  } catch {
    return false;
  }
  return true;
}

// ¿Están las columnas de pago? (compatibilidad con el nombre anterior)
export const pagosListos = () => tieneColumna("pago_metodo");

// ── Estado de la carta por local: agotados y descuentos ──────────────────────
const memCarta = new Map(); // clave `${local}|${itemId}`

export async function getCarta(local) {
  if (usingSupabase) {
    const rows = await supa(`carta?local=eq.${encodeURIComponent(local)}&select=item_id,agotado,descuento`);
    return Object.fromEntries(rows.map((r) => [r.item_id, { agotado: !!r.agotado, descuento: r.descuento || 0 }]));
  }
  const out = {};
  for (const [k, v] of memCarta) {
    const [l, item] = k.split("|");
    if (l === local) out[item] = v;
  }
  return out;
}

// Estado de la carta de TODOS los locales en una sola consulta (lo usa
// /api/ajustes, que sirve a todos los visitantes de /pedir).
export async function getCartaTodos() {
  if (usingSupabase) {
    const rows = await supa("carta?select=local,item_id,agotado,descuento");
    const out = {};
    for (const r of rows) {
      (out[r.local] ||= {})[r.item_id] = { agotado: !!r.agotado, descuento: r.descuento || 0 };
    }
    return out;
  }
  const out = {};
  for (const [k, v] of memCarta) {
    const [l, item] = k.split("|");
    (out[l] ||= {})[item] = v;
  }
  return out;
}

export async function setCartaItem(local, itemId, estado) {
  if (usingSupabase) {
    await supa("carta", {
      method: "POST",
      body: { local, item_id: itemId, agotado: estado.agotado, descuento: estado.descuento, updated_at: new Date().toISOString() },
      headers: { Prefer: "resolution=merge-duplicates" },
    });
    return;
  }
  memCarta.set(`${local}|${itemId}`, estado);
}

// ── Ajustes por local (p. ej. pausar pedidos online) ─────────────────────────
const memAjustes = new Map();

export async function getAjustes() {
  if (usingSupabase) {
    // `desde` = cuándo se hizo el último cambio; el panel lo usa para decir
    // "cerrado desde las 21:14".
    const rows = await supa("ajustes?select=local,pausado,motivo,updated_at");
    return Object.fromEntries(rows.map((r) => [r.local, { pausado: !!r.pausado, motivo: r.motivo || "", desde: r.updated_at || null }]));
  }
  return Object.fromEntries(memAjustes);
}

export async function setAjuste(local, { pausado, motivo }) {
  const desde = new Date().toISOString();
  if (usingSupabase) {
    await supa("ajustes", {
      method: "POST",
      body: { local, pausado, motivo, updated_at: desde },
      headers: { Prefer: "resolution=merge-duplicates" },
    });
    return;
  }
  memAjustes.set(local, { pausado, motivo, desde });
}

export async function updateOrder(id, patch) {
  if (usingSupabase) {
    const rows = await supa(`${TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: patch,
      headers: { Prefer: "return=representation" },
    });
    return rows[0] || null;
  }
  const o = mem.get(id);
  if (!o) return null;
  Object.assign(o, patch);
  return o;
}
