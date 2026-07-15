// ─────────────────────────────────────────────────────────────────────────────
// /api/usuarios — gestión del equipo (solo admin).
//   GET              → lista de cuentas
//   POST             → crear empleado { email, nombre, password, local? }
//   PATCH            → cambiar contraseña { id, password }
//   DELETE ?id=...   → eliminar cuenta (no permite borrar admins)
// Las cuentas viven en Supabase Auth. Los admins se crean desde el panel de
// Supabase (ver PEDIDOS.md) para que nadie pueda auto-ascenderse desde la web.
// ─────────────────────────────────────────────────────────────────────────────
import { requireUser, supaAdmin, toUser, devAuth } from "./_auth.js";
import { LOCALES } from "../src/locales.js";

export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res, ["admin"]);
    if (!user) return;

    if (devAuth) {
      return res.status(503).json({ error: "La gestión de equipo necesita Supabase (no disponible en modo desarrollo)." });
    }

    if (req.method === "GET") {
      const data = await supaAdmin("admin/users?per_page=100");
      const users = (data?.users || data || []).map(toUser);
      return res.status(200).json({ users });
    }

    if (req.method === "POST") {
      const b = req.body || {};
      const email = String(b.email || "").trim().toLowerCase();
      const nombre = String(b.nombre || "").trim().slice(0, 60);
      const password = String(b.password || "");
      const local = b.local ? String(b.local) : null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Escribe un email válido." });
      if (nombre.length < 2) return res.status(400).json({ error: "Escribe el nombre del empleado." });
      if (password.length < 8) return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
      if (local && !LOCALES[local]) return res.status(400).json({ error: "Local no válido." });

      const creado = await supaAdmin("admin/users", {
        method: "POST",
        body: {
          email,
          password,
          email_confirm: true,
          user_metadata: { nombre },
          app_metadata: { rol: "empleado", local },
        },
      });
      return res.status(201).json({ user: toUser(creado) });
    }

    if (req.method === "PATCH") {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: "Falta id." });
      const password = String(b.password || "");
      if (password.length < 8) return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
      await supaAdmin(`admin/users/${encodeURIComponent(b.id)}`, { method: "PUT", body: { password } });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const id = String(req.query?.id || "");
      if (!id) return res.status(400).json({ error: "Falta id." });
      if (id === user.id) return res.status(400).json({ error: "No puedes eliminar tu propia cuenta." });
      const existente = await supaAdmin(`admin/users/${encodeURIComponent(id)}`);
      if (toUser(existente).rol === "admin") return res.status(400).json({ error: "Los admins se gestionan desde el panel de Supabase." });
      await supaAdmin(`admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("[api/usuarios]", err);
    return res.status(500).json({ error: err.message || "Error interno." });
  }
}
