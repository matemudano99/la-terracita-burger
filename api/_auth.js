// ─────────────────────────────────────────────────────────────────────────────
// Autenticación del equipo (empleados/admin) con Supabase Auth.
// - Las contraseñas las gestiona Supabase (bcrypt); aquí nunca se almacenan.
// - Cada petición del panel llega con "Authorization: Bearer <jwt>" y se
//   verifica contra Supabase (también detecta sesiones revocadas).
// - El rol vive en app_metadata (solo modificable con la clave service_role,
//   nunca por el propio usuario): { rol: "admin" | "gerencia" | "empleado", local?: "..." }
//     · admin    → todo, incluida la gestión del equipo.
//     · gerencia → ve ventas, historial, banco, carta y ajustes, pero no puede
//                  cambiar nada (dueños, administración).
//     · empleado → solo el panel de cocina (y, si tiene local, solo ese).
// - En desarrollo sin Supabase: usuario "dev" / contraseña "dev" (rol admin).
// ─────────────────────────────────────────────────────────────────────────────

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const authReady = Boolean(SUPA_URL && SUPA_KEY);

// Roles que pueden entrar a algún panel. Cada endpoint dice cuáles acepta y,
// si no lo dice, solo admin y empleado (la gerencia nunca escribe nada).
export const ROLES_EQUIPO = ["admin", "gerencia", "empleado"];
export const devAuth = !authReady && !process.env.VERCEL;

// Cuentas de prueba SOLO en desarrollo local (sin Supabase, nunca en Vercel).
export const DEV_USERS = {
  "dev-admin": { id: "dev-admin", email: "admin@dev", nombre: "Admin (dev)", rol: "admin", local: null },
  "dev-cocina": { id: "dev-cocina", email: "cocina@dev", nombre: "Cocina (dev)", rol: "empleado", local: null },
  "dev-gerencia": { id: "dev-gerencia", email: "gerencia@dev", nombre: "Gerencia (dev)", rol: "gerencia", local: null },
};

export function toUser(u) {
  return {
    id: u.id,
    email: u.email,
    nombre: u.user_metadata?.nombre || u.email,
    rol: u.app_metadata?.rol || null,
    local: u.app_metadata?.local || null,
  };
}

// Devuelve el usuario autenticado o null. Solo roles del equipo.
export async function getUser(req) {
  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  if (devAuth) {
    return DEV_USERS[token] || null;
  }
  if (!authReady) return null;

  try {
    const res = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = toUser(await res.json());
    return ROLES_EQUIPO.includes(user.rol) ? user : null;
  } catch {
    return null;
  }
}

// Exige un usuario con uno de los roles dados; responde 401/403 si no.
export async function requireUser(req, res, roles = ["admin", "empleado"]) {
  const user = await getUser(req);
  if (!user) {
    res.status(401).json({ error: "Sesión no válida o caducada. Vuelve a iniciar sesión." });
    return null;
  }
  if (!roles.includes(user.rol)) {
    res.status(403).json({ error: "No tienes permisos para esto." });
    return null;
  }
  return user;
}

// Peticiones a la API de administración de usuarios de Supabase (GoTrue).
export async function supaAdmin(path, { method = "GET", body } = {}) {
  const res = await fetch(`${SUPA_URL}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.msg || data?.message || data?.error_description || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
