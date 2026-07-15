// ─────────────────────────────────────────────────────────────────────────────
// Sesión del equipo (cocina y admin) en el navegador.
// Guarda { token, refresh, user } en localStorage y renueva el token de forma
// transparente cuando caduca (authFetch reintenta una vez tras refrescar).
// ─────────────────────────────────────────────────────────────────────────────

const LS_SESION = "ltb_sesion";

export function getSesion() {
  try {
    return JSON.parse(localStorage.getItem(LS_SESION) || "null");
  } catch {
    return null;
  }
}

function guardar(sesion) {
  localStorage.setItem(LS_SESION, JSON.stringify(sesion));
  return sesion;
}

export function logout() {
  localStorage.removeItem(LS_SESION);
}

export async function login(usuario, password) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", usuario, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "No se pudo iniciar sesión.");
  return guardar({ token: data.token, refresh: data.refresh, user: data.user });
}

async function refrescar() {
  const s = getSesion();
  if (!s?.refresh) return null;
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "refresh", refresh: s.refresh }),
  });
  if (!res.ok) {
    logout();
    return null;
  }
  const data = await res.json();
  return guardar({ token: data.token, refresh: data.refresh, user: data.user });
}

// fetch con Authorization; si el token ha caducado (401), refresca y reintenta.
export async function authFetch(url, opts = {}) {
  const call = (token) =>
    fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` } });

  let s = getSesion();
  if (!s) throw new Error("Sesión no válida o caducada. Vuelve a iniciar sesión.");
  let res = await call(s.token);
  if (res.status === 401) {
    s = await refrescar();
    if (!s) throw new Error("Sesión no válida o caducada. Vuelve a iniciar sesión.");
    res = await call(s.token);
  }
  return res;
}
