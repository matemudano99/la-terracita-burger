// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth — inicio y renovación de sesión del equipo.
//   { action: "login",   usuario, password }  → { token, refresh, user }
//   { action: "refresh", refresh }            → { token, refresh, user }
// Delega en Supabase Auth (bcrypt + limitación de intentos incluidos).
// En desarrollo sin Supabase: dev / dev (rol admin).
// ─────────────────────────────────────────────────────────────────────────────
import { authReady, devAuth, toUser, DEV_USERS } from "./_auth.js";

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Método no permitido" });
    }
    const b = req.body || {};

    if (devAuth) {
      // admin/admin y cocina/cocina (dev/dev = alias de admin)
      let token = null;
      if (b.action === "refresh") token = DEV_USERS[b.refresh] ? b.refresh : null;
      else if ((b.usuario === "admin" || b.usuario === "dev") && b.password === b.usuario) token = "dev-admin";
      else if (b.usuario === "cocina" && b.password === "cocina") token = "dev-cocina";
      if (token) {
        return res.status(200).json({ token, refresh: token, user: DEV_USERS[token] });
      }
      return res.status(401).json({ error: "Usuario o contraseña incorrectos. (En desarrollo: admin/admin o cocina/cocina)" });
    }
    if (!authReady) {
      return res.status(503).json({ error: "El acceso del equipo no está configurado todavía (falta Supabase)." });
    }

    let grant, payload;
    if (b.action === "refresh") {
      if (!b.refresh) return res.status(400).json({ error: "Falta el token de renovación." });
      grant = "refresh_token";
      payload = { refresh_token: String(b.refresh) };
    } else {
      const email = String(b.usuario || "").trim().toLowerCase();
      const password = String(b.password || "");
      if (!email || !password) return res.status(400).json({ error: "Escribe tu usuario y contraseña." });
      grant = "password";
      payload = { email, password };
    }

    const supa = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=${grant}`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await supa.json().catch(() => ({}));
    if (!supa.ok) {
      const msg = grant === "password" ? "Usuario o contraseña incorrectos." : "La sesión ha caducado. Vuelve a iniciar sesión.";
      return res.status(401).json({ error: msg });
    }

    const user = toUser(data.user || {});
    if (user.rol !== "admin" && user.rol !== "empleado") {
      return res.status(403).json({ error: "Esta cuenta no tiene acceso al panel. Habla con el administrador." });
    }
    return res.status(200).json({ token: data.access_token, refresh: data.refresh_token, user });
  } catch (err) {
    console.error("[api/auth]", err);
    return res.status(500).json({ error: "Error interno al iniciar sesión." });
  }
}
