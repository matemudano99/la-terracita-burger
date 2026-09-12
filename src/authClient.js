// ─────────────────────────────────────────────────────────────────────────────
// Sesión del equipo (cocina y admin) en el navegador.
// Guarda { token, refresh, user } en localStorage y renueva el token de forma
// transparente cuando caduca (authFetch reintenta una vez tras refrescar).
//
// La sesión la comparten TODAS las pestañas del dispositivo, así que cerrarla
// por las bravas deja fuera también a las demás. Por eso:
//   · solo se cierra cuando el servidor dice que el token ya no vale (401);
//     un bache de red o un error pasajero NO cierra la sesión, se reintenta;
//   · solo se renueva una vez a la vez, aunque haya varias consultas en vuelo
//     (el panel de cocina consulta cada 2 s y con WiFi lenta se solapan);
//   · antes de cerrar se relee lo guardado: si otra pestaña ya renovó, se usa
//     su sesión en vez de borrarla.
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

// Hay que volver a iniciar sesión: los paneles lo detectan por `sesionCaducada`.
function errorSesion() {
  const e = new Error("Sesión no válida o caducada. Vuelve a iniciar sesión.");
  e.sesionCaducada = true;
  return e;
}

// Fallo pasajero (sin red, servidor caído un momento): la sesión sigue viva y
// la siguiente consulta lo reintenta. El texto evita la palabra "sesión" para
// que no se confunda con el caso de arriba.
function errorTemporal() {
  return new Error("Sin conexión con el servidor — reintentando…");
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

let refrescoEnCurso = null;

// Renueva la sesión. `tokenUsado` es el refresh con el que falló la consulta:
// si lo guardado ya es otro, alguien renovó por nosotros y no hay nada que hacer.
async function refrescar(tokenUsado) {
  const actual = getSesion();
  if (actual?.refresh && actual.refresh !== tokenUsado) return actual;
  if (!refrescoEnCurso) {
    refrescoEnCurso = pedirRenovacion().finally(() => { refrescoEnCurso = null; });
  }
  return refrescoEnCurso;
}

async function pedirRenovacion() {
  const s = getSesion();
  if (!s?.refresh) throw errorSesion();

  let res;
  try {
    res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh", refresh: s.refresh }),
    });
  } catch {
    throw errorTemporal(); // sin red: la sesión no tiene por qué estar mal
  }

  if (res.status === 401) {
    // El token ya no vale. Si otra pestaña renovó mientras tanto, nos quedamos
    // con la suya en vez de borrarle la sesión buena.
    const ahora = getSesion();
    if (ahora?.refresh && ahora.refresh !== s.refresh) return ahora;
    logout();
    throw errorSesion();
  }
  if (!res.ok) throw errorTemporal(); // 5xx, 503…: se reintenta

  const data = await res.json().catch(() => null);
  if (!data?.token) throw errorTemporal();
  return guardar({ token: data.token, refresh: data.refresh, user: data.user });
}

// fetch con Authorization; si el token ha caducado (401), refresca y reintenta.
export async function authFetch(url, opts = {}) {
  const call = (token) =>
    fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` } });

  const s = getSesion();
  if (!s) throw errorSesion();
  const res = await call(s.token);
  if (res.status !== 401) return res;

  const nueva = await refrescar(s.refresh);
  if (!nueva?.token) throw errorSesion();
  return call(nueva.token);
}
