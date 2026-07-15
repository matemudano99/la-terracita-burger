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
  if (res.status === 204) return null;
  return res.json();
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

// Historial para el panel de administración (rango de fechas, opcional local).
export async function listHistorial({ desde, hasta, local }) {
  if (usingSupabase) {
    let q = `${TABLE}?created_at=gte.${encodeURIComponent(desde)}&created_at=lte.${encodeURIComponent(hasta)}&order=created_at.desc&limit=1000`;
    if (local) q += `&local=eq.${encodeURIComponent(local)}`;
    return supa(q);
  }
  return [...mem.values()]
    .filter((o) => o.created_at >= desde && o.created_at <= hasta && (!local || o.local === local))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// ── Ajustes por local (p. ej. pausar pedidos online) ─────────────────────────
const memAjustes = new Map();

export async function getAjustes() {
  if (usingSupabase) {
    const rows = await supa("ajustes?select=local,pausado,motivo");
    return Object.fromEntries(rows.map((r) => [r.local, { pausado: !!r.pausado, motivo: r.motivo || "" }]));
  }
  return Object.fromEntries(memAjustes);
}

export async function setAjuste(local, { pausado, motivo }) {
  if (usingSupabase) {
    await supa("ajustes", {
      method: "POST",
      body: { local, pausado, motivo, updated_at: new Date().toISOString() },
      headers: { Prefer: "resolution=merge-duplicates" },
    });
    return;
  }
  memAjustes.set(local, { pausado, motivo });
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
