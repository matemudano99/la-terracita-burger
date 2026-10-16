// ─────────────────────────────────────────────────────────────────────────────
// /api/usuarios — gestión del equipo (solo admin).
//   GET              → lista de cuentas, con alta y último acceso
//   POST             → crear cuenta { email, nombre, password, rol, local? }
//   PATCH            → editar { id, nombre?, rol?, local?, password? }
//   DELETE ?id=...   → eliminar cuenta
// Las cuentas viven en Supabase Auth; el rol va en app_metadata, que solo se
// puede tocar con la clave del servidor, nunca desde el navegador.
//
// Solo un admin puede dar o quitar el rol de admin. Protecciones:
//   · nadie puede cambiarse el rol ni borrarse a sí mismo (evita dejarse fuera);
//   · siempre queda al menos un admin.
// ─────────────────────────────────────────────────────────────────────────────
import { requireUser, supaAdmin, toUser, devAuth } from "./_auth.js";
import { LOCALES } from "../src/locales.js";

const ROLES = ["admin", "gerencia", "empleado"];

// Lo que el panel necesita de cada cuenta, además de lo de toUser().
const ficha = (u) => ({
  ...toUser(u),
  creada: u.created_at || null,
  ultimoAcceso: u.last_sign_in_at || null,
});

async function listar() {
  const data = await supaAdmin("admin/users?per_page=200");
  return data?.users || data || [];
}

const contarAdmins = (cuentas) => cuentas.filter((u) => toUser(u).rol === "admin").length;

export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res, ["admin"]);
    if (!user) return;

    if (devAuth) {
      return res.status(503).json({ error: "La gestión de equipo necesita Supabase (no disponible en modo desarrollo)." });
    }

    if (req.method === "GET") {
      const users = (await listar())
        .map(ficha)
        .sort((a, b) => (a.rol === b.rol ? a.nombre.localeCompare(b.nombre) : a.rol === "admin" ? -1 : 1));
      return res.status(200).json({ users });
    }

    if (req.method === "POST") {
      const b = req.body || {};
      const email = String(b.email || "").trim().toLowerCase();
      const nombre = String(b.nombre || "").trim().slice(0, 60);
      const password = String(b.password || "");
      const rol = ROLES.includes(b.rol) ? b.rol : "empleado";
      // Un admin ve los dos locales: no tiene sentido atarlo a uno.
      const local = rol === "empleado" && b.local ? String(b.local) : null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Escribe un email válido." });
      if (nombre.length < 2) return res.status(400).json({ error: "Escribe el nombre de la persona." });
      if (password.length < 8) return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
      if (local && !LOCALES[local]) return res.status(400).json({ error: "Local no válido." });

      const creado = await supaAdmin("admin/users", {
        method: "POST",
        body: {
          email,
          password,
          email_confirm: true,
          user_metadata: { nombre },
          app_metadata: { rol, local },
        },
      });
      return res.status(201).json({ user: ficha(creado) });
    }

    if (req.method === "PATCH") {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: "Falta la cuenta." });
      const id = String(b.id);
      const actual = await supaAdmin(`admin/users/${encodeURIComponent(id)}`);
      const antes = toUser(actual);

      const cambios = {};
      if (b.password != null && b.password !== "") {
        const password = String(b.password);
        if (password.length < 8) return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
        cambios.password = password;
      }
      if (b.nombre != null) {
        const nombre = String(b.nombre).trim().slice(0, 60);
        if (nombre.length < 2) return res.status(400).json({ error: "Escribe el nombre de la persona." });
        cambios.user_metadata = { ...(actual.user_metadata || {}), nombre };
      }
      if (b.rol != null || b.local !== undefined) {
        const rol = b.rol != null ? String(b.rol) : antes.rol;
        if (!ROLES.includes(rol)) return res.status(400).json({ error: "Rol no válido." });
        if (id === user.id && rol !== antes.rol) {
          return res.status(400).json({ error: "No puedes cambiarte el rol a ti mismo: pídeselo a otro administrador." });
        }
        if (antes.rol === "admin" && rol !== "admin" && contarAdmins(await listar()) <= 1) {
          return res.status(400).json({ error: "Es el único administrador: nombra antes a otro." });
        }
        const localPedido = b.local !== undefined ? b.local : antes.local;
        const local = rol === "empleado" && localPedido ? String(localPedido) : null;
        if (local && !LOCALES[local]) return res.status(400).json({ error: "Local no válido." });
        cambios.app_metadata = { ...(actual.app_metadata || {}), rol, local };
      }
      if (Object.keys(cambios).length === 0) return res.status(400).json({ error: "No hay nada que cambiar." });

      const actualizado = await supaAdmin(`admin/users/${encodeURIComponent(id)}`, { method: "PUT", body: cambios });
      return res.status(200).json({ ok: true, user: ficha(actualizado) });
    }

    if (req.method === "DELETE") {
      const id = String(req.query?.id || "");
      if (!id) return res.status(400).json({ error: "Falta la cuenta." });
      if (id === user.id) return res.status(400).json({ error: "No puedes eliminar tu propia cuenta." });
      const existente = await supaAdmin(`admin/users/${encodeURIComponent(id)}`);
      if (toUser(existente).rol === "admin" && contarAdmins(await listar()) <= 1) {
        return res.status(400).json({ error: "Es el único administrador: no se puede eliminar." });
      }
      await supaAdmin(`admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("[api/usuarios]", err);
    // Supabase devuelve este texto cuando el email ya tiene cuenta.
    if (/already (been )?registered|already exists/i.test(err.message)) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
    }
    return res.status(500).json({ error: err.message || "Error interno." });
  }
}
