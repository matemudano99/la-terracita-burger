import { useCallback, useEffect, useRef, useState } from "react";
import { sx } from "../sx";
import { MENU, fmtEUR } from "../menu";
import { LOCALES } from "../locales";
import LtbMark from "../LtbMark";
import LoginBox from "../LoginBox";
import { getSesion, logout, authFetch } from "../authClient";
import { imprimirTicket } from "./ticket";

// ─────────────────────────────────────────────────────────────────────────────
// /cocina — panel para el local. Abre esta página en el móvil/tablet del
// local (Chrome), inicia sesión con tu cuenta de empleado y déjala abierta:
// suena una alarma con cada pedido nuevo y desde aquí se acepta, se marca
// lista y se imprime el ticket (diálogo de impresión → térmica vía RawBT).
// Las cuentas se crean desde /admin (pestaña Equipo).
// ─────────────────────────────────────────────────────────────────────────────

const LS_LOCAL = "ltb_panel_local";
const LS_SILENCIO = "ltb_panel_silencio"; // "1" = alarma silenciada a mano
const POLL_MS = 2000;

// Colores de cada estado en los tickets (RGB para poder usar opacidades).
const TONO = {
  nuevo: "255 90 70",
  cocina: "255 176 46",
  tarde: "255 90 70",
  lista: "120 220 130",
  programado: "180 165 255",
  cerrado: "120 112 104",
};

// "ahora" / "3 min" / "1 h 05" — edad del pedido, clave en cocina.
function haceCuanto(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

// Minutos que se ofrecen al aceptar. A domicilio la hora que ve el cliente es
// la de llegada, no la de "listo": incluye el viaje.
const minutosDe = (o) => (o.entrega === "domicilio" ? [30, 60, 90] : [15, 25, 40]);

const btn = (bg, color = "#0a0806") =>
  sx(`font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.04em;padding:12px 18px;border-radius:12px;border:0;cursor:pointer;background:${bg};color:${color}`);

const inputStyle = sx("width:100%;padding:12px 15px;border-radius:12px;border:1px solid rgba(246,241,233,.18);background:#0a0806;color:#f6f1e9;font-size:15px;font-family:inherit;outline:none");
const labelStyle = sx("display:block;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,241,233,.6);margin:0 0 6px");

// Hora legible de un instante ISO (Madrid).
const horaMadrid = (iso) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export default function CocinaPage() {
  const [sesion, setSesion] = useState(getSesion);
  const [local, setLocal] = useState(() => {
    const asignado = getSesion()?.user?.local;
    return LOCALES[asignado] ? asignado : localStorage.getItem(LS_LOCAL) || "";
  });
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  // Alarma activada por defecto: solo queda en silencio si alguien la apagó a
  // mano en esta tablet (y se recuerda al recargar).
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(LS_SILENCIO) === "1"; } catch { return false; }
  });
  const [sonidoBloqueado, setSonidoBloqueado] = useState(false); // ¿el navegador no deja sonar todavía?
  const [filtro, setFiltro] = useState("todos"); // qué tickets se ven
  const [ahora, setAhora] = useState(() => Date.now()); // reloj para cronómetros y hora
  const [vista, setVista] = useState("pedidos"); // "pedidos" | "carta"
  const [refundParcial, setRefundParcial] = useState(false); // ¿existe la columna acumuladora?
  const [pantallaOn, setPantallaOn] = useState(false); // ¿wake lock activo?
  const [pausa, setPausa] = useState(null); // { pausado, motivo, desde } de este local
  const [cerrando, setCerrando] = useState(false); // ¿modal de cierre abierto?
  const [guardandoPausa, setGuardandoPausa] = useState(false);
  const audioCtx = useRef(null);

  // Ajustes: si el local está cerrado a mano y si hay devolución parcial.
  // Se refresca cada 20 s para reflejar los cambios hechos desde /admin.
  // Sin caché: la respuesta pública lleva stale-while-revalidate y el panel no
  // puede enseñar "abierto" cuando el local está cerrado.
  const cargarAjustes = useCallback(async () => {
    try {
      const d = await fetch("/api/ajustes", { cache: "no-store" }).then((r) => r.json());
      setRefundParcial(!!d.refundParcial);
      if (local) setPausa(d.ajustes?.[local] || { pausado: false, motivo: "" });
    } catch { /* sin conexión: se reintenta en el siguiente ciclo */ }
  }, [local]);

  useEffect(() => {
    cargarAjustes();
    const iv = setInterval(cargarAjustes, 20000);
    return () => clearInterval(iv);
  }, [cargarAjustes]);

  const L = LOCALES[local];
  const salir = useCallback(() => { logout(); setSesion(null); setOrders([]); }, []);

  // Alarma — tres tonos; se repite mientras haya pedidos "nuevo" sin atender.
  const beep = useCallback(() => {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      if (ctx.state === "suspended") ctx.resume();
      [0, 0.22, 0.44].forEach((t, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.value = i === 2 ? 1320 : 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.18);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.2);
      });
    } catch { /* sin audio */ }
  }, []);

  // Chrome no deja sonar nada hasta que alguien toca la página. Si la tablet
  // recarga sola, la alarma se quedaría muda sin avisar: aquí se desbloquea con
  // el primer toque en cualquier parte, y mientras tanto se avisa en pantalla.
  useEffect(() => {
    if (!sesion || !L) return;
    let ctx;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      ctx = audioCtx.current;
    } catch { return; }
    const revisar = () => setSonidoBloqueado(ctx.state !== "running");
    const desbloquear = () => { if (ctx.state !== "running") ctx.resume().then(revisar).catch(() => {}); };
    revisar();
    ctx.addEventListener?.("statechange", revisar);
    const eventos = ["pointerdown", "touchstart", "keydown"];
    eventos.forEach((ev) => document.addEventListener(ev, desbloquear, { passive: true }));
    return () => {
      ctx.removeEventListener?.("statechange", revisar);
      eventos.forEach((ev) => document.removeEventListener(ev, desbloquear));
    };
  }, [sesion, L]);

  const cambiarSilencio = () => {
    setMuted((m) => {
      const nuevo = !m;
      try { localStorage.setItem(LS_SILENCIO, nuevo ? "1" : "0"); } catch { /* modo privado */ }
      return nuevo;
    });
    beep();
  };

  // Reloj: mantiene vivos los cronómetros de los tickets aunque no llegue nada.
  useEffect(() => {
    const iv = setInterval(() => setAhora(Date.now()), 10000);
    return () => clearInterval(iv);
  }, []);

  // ── Respuesta inmediata al tocar un botón ──────────────────────────────────
  // El cambio se pinta al instante (optimista) y se guarda en `pendientes`
  // hasta que el servidor lo confirma. Una consulta que salió ANTES de esa
  // confirmación trae el estado viejo y haría saltar la tarjeta hacia atrás:
  // por eso se descarta (`marcaMutacion`).
  const pendientes = useRef(new Map()); // id → cambios aún sin confirmar
  const marcaMutacion = useRef(0);

  // Avisos de las acciones (no se pudo aceptar, devolver, cerrar…). Van aparte
  // del error de conexión de la cabecera, que el siguiente sondeo borra: estos
  // se quedan a la vista unos segundos o hasta que se tocan.
  const [aviso, setAviso] = useState(null);
  const avisar = useCallback((texto) => setAviso({ texto, id: Date.now() }), []);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 9000);
    return () => clearTimeout(t);
  }, [aviso]);

  const conPendientes = (lista) =>
    lista.map((o) => (pendientes.current.has(o.id) ? { ...o, ...pendientes.current.get(o.id), _guardando: true } : o));

  const cargar = useCallback(async () => {
    if (!sesion || !L) return;
    const inicio = Date.now();
    try {
      const res = await authFetch(`/api/orders?panel=1&local=${encodeURIComponent(local)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      if (inicio < marcaMutacion.current) return; // respuesta anterior a un cambio: vieja
      setOrders(conPendientes(data.orders || []));
      setError(null);
      setAhora(Date.now());
      localStorage.setItem(LS_LOCAL, local);
    } catch (e) {
      setError(e.message);
      if (e.sesionCaducada) salir();
    }
  }, [sesion, local, L, salir]);

  // Sondeo continuo, de una en una: la siguiente consulta no sale hasta que
  // vuelve la anterior (con WiFi lenta se solapaban y llegaban desordenadas).
  // Al volver a la pestaña (tablet que se despierta) se consulta al momento.
  useEffect(() => {
    if (!sesion || !L) return;
    let vivo = true;
    let t;
    const ciclo = async () => {
      await cargar();
      if (vivo) t = setTimeout(ciclo, POLL_MS);
    };
    ciclo();
    const alVolver = () => { if (document.visibilityState === "visible") cargar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vivo = false;
      clearTimeout(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [sesion, L, cargar]);

  // Mantener la PANTALLA ENCENDIDA mientras el panel está abierto (Screen Wake
  // Lock API — estándar web, sin necesidad de crear una APK). El sistema la
  // libera al minimizar o bloquear, así que se vuelve a pedir al reaparecer.
  // Requiere HTTPS; en producción (laterracitaburger.com) funciona.
  useEffect(() => {
    if (!sesion || !L || !("wakeLock" in navigator)) return;
    let lock = null;
    let vivo = true;
    const pedir = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        setPantallaOn(true);
        lock.addEventListener("release", () => { setPantallaOn(false); lock = null; });
      } catch { setPantallaOn(false); } // p. ej. batería baja o ahorro de energía
    };
    const onVisible = () => { if (document.visibilityState === "visible" && vivo && !lock) pedir(); };
    pedir();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", onVisible);
      if (lock) lock.release().catch(() => {});
    };
  }, [sesion, L]);

  // Un pedido programado con más de 30 min por delante no es "para ya": va a la
  // columna Programados y no dispara alarma. Cuando faltan ≤30 min, pasa solo a
  // Nuevos (el sondeo de 2 s recalcula esto sin necesidad de cron).
  const esProgramadoLejano = (o) => o.programado_para && new Date(o.programado_para).getTime() - Date.now() > 30 * 60000;

  // Repetir alarma mientras haya pedidos nuevos "para ya".
  const hayNuevos = orders.some((o) => o.status === "nuevo" && !esProgramadoLejano(o));
  useEffect(() => {
    if (!hayNuevos || muted) return;
    beep();
    const iv = setInterval(beep, 6000);
    return () => clearInterval(iv);
  }, [hayNuevos, muted, beep]);

  useEffect(() => { document.title = hayNuevos ? "🔴 PEDIDO NUEVO — Cocina LTB" : "Cocina — La Terracita"; }, [hayNuevos]);

  const patch = async (id, status, ready_minutes) => {
    if (pendientes.current.has(id)) return; // ya hay un cambio en vuelo: evita el doble toque
    // 1) Al instante: la tarjeta cambia de estado sin esperar al servidor.
    const optimista = { status };
    if (status === "aceptado") optimista.ready_at = new Date(Date.now() + (ready_minutes || 25) * 60000).toISOString();
    pendientes.current.set(id, optimista);
    setOrders((prev) => conPendientes(prev));
    try {
      const res = await authFetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, ready_minutes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      // 2) Confirmado: manda lo que dice el servidor.
      pendientes.current.delete(id);
      marcaMutacion.current = Date.now();
      setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
      if (status === "aceptado") imprimirTicket(data.order, L.name); // ticket automático
      cargar();
    } catch (e) {
      // 3) Falló: se deshace el cambio, se vuelve a pedir el estado real y se
      //    avisa en grande (un aviso de la cabecera lo borraría el sondeo).
      pendientes.current.delete(id);
      marcaMutacion.current = Date.now();
      cargar();
      avisar(e.message);
      if (e.sesionCaducada) salir();
    }
  };

  // Menú "⋯" de cada tarjeta: cancelar (con reembolso automático si estaba
  // pagado) y devolución manual del cobro sin tocar el estado del pedido.
  const cancelarPedido = (o) => {
    const pagado = ["pagado", "reembolso_parcial"].includes(o.pago_estado);
    const conReembolso = pagado ? "\n\nEstá pagado online: se le devolverá el importe pendiente automáticamente." : "";
    if (window.confirm(`¿Cancelar el pedido ${o.code} de ${o.nombre}?${conReembolso}`)) {
      patch(o.id, "rechazado");
    }
  };

  // Devolución. Con la columna acumuladora → modal (total o por productos);
  // sin ella (SQL sin ejecutar) → devolución total con confirmación simple.
  const [devolucion, setDevolucion] = useState(null);
  const abrirDevolucion = (o) => {
    if (refundParcial) { setDevolucion(o); return; }
    const queda = o.total_cents - (o.reembolsado_cents || 0);
    if (!window.confirm(`¿Devolver ${fmtEUR(queda)} a ${o.nombre} (pedido ${o.code})?`)) return;
    hacerDevolucion(o, queda).catch((e) => { avisar(e.message); if (e.sesionCaducada) salir(); });
  };
  const hacerDevolucion = async (o, importe_cents) => {
    const res = await authFetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: o.id, accion: "reembolsar", importe_cents }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    marcaMutacion.current = Date.now();
    setOrders((prev) => prev.map((x) => (x.id === o.id ? data.order : x)));
    return data.order;
  };

  // Cerrar / reabrir el local a mano (freidora rota, saturación, imprevistos).
  // Mientras está cerrado, la web no acepta ningún pedido de este local —ni
  // programado— y el cliente ve el motivo junto al teléfono.
  const cambiarPausa = async (pausado, motivo = "") => {
    setGuardandoPausa(true);
    try {
      const res = await authFetch("/api/ajustes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local, pausado, motivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setPausa(data.ajustes?.[local] || { pausado, motivo, desde: new Date().toISOString() });
      setCerrando(false);
    } catch (e) {
      avisar(e.message);
      if (e.sesionCaducada) salir();
    } finally {
      setGuardandoPausa(false);
    }
  };

  // ── Puerta de entrada: inicio de sesión y elección de local ────────────────
  if (!sesion) {
    return (
      <LoginBox
        titulo="Panel de cocina"
        subtitulo="Inicia sesión con tu cuenta de empleado."
        onOk={(s) => {
          setSesion(s);
          if (LOCALES[s.user?.local]) setLocal(s.user.local);
        }}
      />
    );
  }

  if (!L) {
    return (
      <div style={sx("min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px")}>
        <div style={sx("width:min(420px,100%);border:1px solid rgba(246,241,233,.14);border-radius:20px;background:#0d0a07;padding:32px;text-align:center;animation:ltb-rise .5s both")}>
          <LtbMark size={30} style={{ color: "#f6f1e9" }} />
          <h1 style={sx("margin:14px 0 4px;font-family:'Anton',sans-serif;font-weight:400;font-size:28px;text-transform:uppercase")}>Hola, {sesion.user?.nombre?.split(" ")[0]} 👋</h1>
          <p style={sx("margin:0 0 22px;font-size:13.5px;color:rgba(246,241,233,.6)")}>¿En qué local estás hoy?</p>
          <div style={sx("display:flex;gap:10px;justify-content:center;flex-wrap:wrap")}>
            {Object.values(LOCALES).map((o) => (
              <button key={o.id} onClick={() => setLocal(o.id)} style={sx(`font-family:'Anton',sans-serif;font-size:15px;padding:12px 22px;border-radius:100px;cursor:pointer;border:2px solid rgb(${o.rgb});background:transparent;color:#f6f1e9;text-transform:uppercase`)}>
                {o.name}
              </button>
            ))}
          </div>
          <button onClick={salir} style={sx("margin-top:20px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;padding:10px 16px;border-radius:12px;border:1px solid rgba(246,241,233,.2);background:transparent;color:rgba(246,241,233,.6);cursor:pointer")}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Panel ──────────────────────────────────────────────────────────────────
  const cerradoManual = !!pausa?.pausado;
  const porHora = (campo) => (a, b) => ((a[campo] || a.created_at) < (b[campo] || b.created_at) ? -1 : 1);
  const programados = orders.filter((o) => o.status === "nuevo" && esProgramadoLejano(o)).sort(porHora("programado_para"));
  const nuevos = orders.filter((o) => o.status === "nuevo" && !esProgramadoLejano(o)).sort(porHora("created_at"));
  // En cocina va primero lo que antes tiene que estar listo.
  const enCocina = orders.filter((o) => o.status === "aceptado").sort(porHora("ready_at"));
  const listas = orders.filter((o) => o.status === "lista").sort(porHora("created_at"));
  const reparteAlgo = Boolean(L?.delivery?.activo) || listas.some(esDomicilio);
  const cerrados = orders.filter((o) => ["entregado", "rechazado", "no_recogido"].includes(o.status));

  // Filtros de la barra. "Todos" enseña lo activo por orden de urgencia:
  // nuevos → en cocina → listas → programados.
  const GRUPOS = [
    { id: "nuevo", label: "Nuevos", tono: TONO.nuevo, lista: nuevos },
    { id: "cocina", label: "En cocina", tono: TONO.cocina, lista: enCocina },
    { id: "lista", label: reparteAlgo ? "Listas/Reparto" : "Listas", tono: TONO.lista, lista: listas },
    { id: "programado", label: "Programados", tono: TONO.programado, lista: programados },
  ];
  const activos = [...nuevos, ...enCocina, ...listas, ...programados];
  const visibles = filtro === "todos" ? activos : GRUPOS.find((g) => g.id === filtro)?.lista || activos;
  const estadoDe = (o) =>
    o.status === "nuevo" ? (esProgramadoLejano(o) ? "programado" : "nuevo")
      : o.status === "aceptado" ? "cocina"
      : o.status === "lista" ? "lista"
      : "cerrado";

  // Botón principal de cada ticket según su estado.
  const accionesDe = (o) => {
    const e = estadoDe(o);
    if (e === "nuevo" || e === "programado") {
      return (
        <>
          <div style={sx("display:grid;grid-template-columns:repeat(3,1fr);gap:7px")}>
            {minutosDe(o).map((m) => (
              <button key={m} onClick={() => patch(o.id, "aceptado", m)} style={botonAccion(TONO[e])}>✓ {m}′</button>
            ))}
          </div>
          <button onClick={() => window.confirm(`¿Rechazar el pedido ${o.code} de ${o.nombre}?`) && patch(o.id, "rechazado")} style={botonSecundario}>
            ✕ Rechazar
          </button>
        </>
      );
    }
    if (e === "cocina") {
      return (
        <button onClick={() => patch(o.id, "lista")} style={botonAccion(TONO.lista)}>
          {esDomicilio(o) ? "🛵 Sale a reparto" : "✓ Lista para recoger"}
        </button>
      );
    }
    if (e === "lista") {
      return (
        <div style={sx("display:grid;grid-template-columns:1fr auto;gap:7px")}>
          <button onClick={() => patch(o.id, "entregado")} style={botonAccion(TONO.lista)}>✓ Entregada</button>
          <button
            onClick={() => window.confirm(`¿Marcar el pedido ${o.code} de ${o.nombre} como NO ${esDomicilio(o) ? "entregado" : "recogido"}?\n\nCon 1 aviso la web pedirá confirmar sus próximos pedidos; con 2, su teléfono queda bloqueado para pedir online.`) && patch(o.id, "no_recogido")}
            style={{ ...botonSecundario, width: "auto" }}
          >
            {esDomicilio(o) ? "Nadie abrió" : "Nadie vino"}
          </button>
        </div>
      );
    }
    return null;
  };

  const botonIcono = (activo = false) =>
    sx(`display:inline-flex;align-items:center;justify-content:center;font-size:18px;width:44px;height:44px;border-radius:12px;cursor:pointer;text-decoration:none;border:1px solid ${activo ? `rgb(${L.rgb})` : "rgba(246,241,233,.2)"};background:${activo ? `rgb(${L.rgb})` : "transparent"};color:#f6f1e9`);

  return (
    <div style={sx("min-height:100vh;display:flex;flex-direction:column")}>
      <header style={{ ...sx("position:sticky;top:0;z-index:30;display:flex;align-items:center;flex-wrap:wrap;gap:10px 16px;padding:10px clamp(12px,2vw,22px);background:rgba(10,8,6,.96);backdrop-filter:blur(8px);border-bottom:1px solid rgba(246,241,233,.1)"), boxShadow: hayNuevos ? `0 4px 30px rgb(${TONO.nuevo} / .35)` : "none" }}>
        {/* Marca y local */}
        <div style={sx("display:flex;align-items:center;gap:11px;min-width:0")}>
          <LtbMark size={22} style={{ color: "#f6f1e9" }} />
          <div style={sx("min-width:0")}>
            <div style={sx("font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.06em;line-height:1;white-space:nowrap")}>
              COCINA · <span style={{ color: `rgb(${L.rgb})` }}>{L.name.split(" ")[0].toUpperCase()}</span>
            </div>
            <div style={{ ...sx("font-size:11px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px"), color: error ? "rgb(255,150,120)" : "rgba(246,241,233,.5)" }}>
              {error ? `⚠️ ${error}` : `${sesion.user?.nombre} · en directo${pantallaOn ? " · 🔆" : ""}`}
            </div>
          </div>
        </div>

        {/* Filtros por estado */}
        {vista === "pedidos" && (
          <nav aria-label="Filtrar pedidos" style={sx("display:flex;flex-wrap:wrap;gap:6px;flex:1;justify-content:center")}>
            <Chip activo={filtro === "todos"} onClick={() => setFiltro("todos")} n={activos.length} tono="246 241 233">Todos</Chip>
            {GRUPOS.filter((g) => g.id !== "programado" || g.lista.length > 0).map((g) => (
              <Chip
                key={g.id}
                activo={filtro === g.id}
                onClick={() => setFiltro(filtro === g.id ? "todos" : g.id)}
                n={g.lista.length}
                tono={g.tono}
                pulso={g.id === "nuevo" && g.lista.length > 0}
              >
                {g.label}
              </Chip>
            ))}
          </nav>
        )}

        {/* Controles */}
        <div style={sx("display:flex;align-items:center;gap:7px;margin-left:auto")}>
          <button
            onClick={() => (cerradoManual ? cambiarPausa(false) : setCerrando(true))}
            disabled={guardandoPausa || pausa === null}
            title={cerradoManual ? "Volver a aceptar pedidos online" : "Dejar de aceptar pedidos online"}
            style={sx(`display:inline-flex;align-items:center;gap:7px;height:44px;font-family:'Anton',sans-serif;font-size:13px;letter-spacing:.05em;text-transform:uppercase;padding:0 14px;border-radius:12px;cursor:pointer;border:1px solid ${cerradoManual ? "rgb(255 100 80)" : "rgb(120 220 130 / .55)"};background:${cerradoManual ? "rgb(255 100 80)" : "transparent"};color:${cerradoManual ? "#0a0806" : "rgb(120,220,130)"}`)}
          >
            {cerradoManual ? "⏸ Cerrado" : "● Abierto"}
          </button>
          <button onClick={() => setVista((v) => (v === "pedidos" ? "carta" : "pedidos"))} title={vista === "carta" ? "Volver a pedidos" : "Marcar agotados en la carta"} style={botonIcono(vista === "carta")}>
            {vista === "carta" ? "📦" : "🍔"}
          </button>
          <a href="/admin" title="Panel de administración" style={botonIcono()}>🛠</a>
          <button onClick={cambiarSilencio} aria-label={muted ? "Activar alarma" : "Silenciar alarma"} title={muted ? "Alarma silenciada — tocar para activarla" : "Alarma activada — tocar para silenciarla"} style={{ ...botonIcono(), borderColor: muted ? "rgb(255 100 80 / .6)" : "rgba(246,241,233,.2)" }}>
            {muted ? "🔕" : "🔔"}
          </button>
          <span title="Hora" style={sx("font-family:'Anton',sans-serif;font-size:21px;letter-spacing:.03em;padding:0 4px;color:rgba(246,241,233,.85)")}>
            {horaMadrid(new Date(ahora).toISOString())}
          </span>
          <button onClick={salir} title="Cerrar sesión" style={botonIcono()}>🚪</button>
        </div>
      </header>

      {/* El navegador no deja sonar hasta que alguien toca la pantalla */}
      {!muted && sonidoBloqueado && vista === "pedidos" && (
        <button
          onClick={() => {
            const ctx = audioCtx.current;
            if (!ctx) return;
            ctx.resume().then(() => { setSonidoBloqueado(ctx.state !== "running"); beep(); }).catch(() => {});
          }}
          style={sx("display:flex;align-items:center;justify-content:center;gap:12px;width:100%;padding:14px 18px;border:0;background:rgb(255 176 46);color:#0a0806;font-family:'Anton',sans-serif;font-size:17px;letter-spacing:.04em;text-transform:uppercase;cursor:pointer")}
        >
          🔈 Toca aquí para activar el sonido de los pedidos
        </button>
      )}

      {/* Mientras está cerrado, que no se olvide de reabrir */}
      {cerradoManual && (
        <div style={sx("padding:14px clamp(12px,2vw,22px) 0")}>
          <div style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:14px 18px;border-radius:14px;background:rgb(255 100 80 / .12);border:1px solid rgb(255 100 80 / .5)")}>
            <span style={sx("font-size:20px;line-height:1")}>⏸</span>
            <div style={sx("flex:1;min-width:200px")}>
              <div style={sx("font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.04em;text-transform:uppercase;color:rgb(255,140,115)")}>
                Pedidos online cerrados
              </div>
              <div style={sx("font-size:12.5px;color:rgba(246,241,233,.7);margin-top:2px")}>
                {pausa?.motivo ? `${pausa.motivo} · ` : ""}
                {pausa?.desde ? `desde las ${horaMadrid(pausa.desde)}` : "la web no acepta pedidos de este local"}
              </div>
            </div>
            <button onClick={() => cambiarPausa(false)} disabled={guardandoPausa} style={btn("rgb(120 220 130)")}>
              {guardandoPausa ? "…" : "▶ Reabrir"}
            </button>
          </div>
        </div>
      )}

      {cerrando && <ModalCierre onCerrar={(motivo) => cambiarPausa(true, motivo)} onCancelar={() => setCerrando(false)} guardando={guardandoPausa} />}

      {vista === "carta" ? (
        <GestionCarta local={local} rgb={L.rgb} />
      ) : (
        <main style={sx("flex:1;padding:16px clamp(12px,2vw,22px) 40px")}>
          {visibles.length === 0 ? (
            <div style={sx("min-height:55vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;color:rgba(246,241,233,.45)")}>
              <div style={sx("font-size:46px;line-height:1;color:rgb(120,220,130)")}>✓</div>
              <div style={sx("font-family:'Anton',sans-serif;font-size:26px;letter-spacing:.04em;text-transform:uppercase;color:rgba(246,241,233,.75)")}>
                {filtro === "todos" ? "Todo al día" : `Nada en «${GRUPOS.find((g) => g.id === filtro)?.label}»`}
              </div>
              <div style={sx("font-size:13.5px")}>
                {filtro === "todos" ? "Los pedidos nuevos aparecerán aquí con alarma." : "Toca «Todos» para ver el resto."}
              </div>
            </div>
          ) : (
            <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,272px),1fr));gap:14px")}>
              {visibles.map((o) => (
                <Ticket key={o.id} o={o} estado={estadoDe(o)} ahora={ahora} rgb={L.rgb} onPrint={() => imprimirTicket(o, L.name)} onCancelar={cancelarPedido} onReembolsar={abrirDevolucion}>
                  {accionesDe(o)}
                </Ticket>
              ))}
            </div>
          )}

          {cerrados.length > 0 && (
            <details style={sx("margin-top:26px")}>
              <summary style={sx("cursor:pointer;font-size:13px;letter-spacing:.04em;color:rgba(246,241,233,.5)")}>Cerrados hoy ({cerrados.length})</summary>
              <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,272px),1fr));gap:14px;margin-top:12px;opacity:.6")}>
                {cerrados.map((o) => (
                  <Ticket key={o.id} o={o} estado="cerrado" ahora={ahora} rgb={L.rgb} onPrint={() => imprimirTicket(o, L.name)} onReembolsar={abrirDevolucion} />
                ))}
              </div>
            </details>
          )}
        </main>
      )}

      {devolucion && (
        <DevolucionModal
          o={devolucion}
          rgb={L.rgb}
          onClose={() => setDevolucion(null)}
          onConfirm={hacerDevolucion}
        />
      )}

      {/* Una acción que no se pudo hacer: se queda a la vista hasta tocarla */}
      {aviso && (
        <div
          key={aviso.id}
          role="alert"
          onClick={() => setAviso(null)}
          style={sx("position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:80;width:max-content;max-width:min(560px,92vw);display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:14px;background:#2a120c;border:1px solid rgb(255 100 80 / .75);box-shadow:0 18px 50px -12px rgba(0,0,0,.85);font-size:14.5px;font-weight:700;line-height:1.4;color:#ffd9cf;cursor:pointer;animation:ltb-menu-in .2s")}
        >
          <span style={sx("font-size:20px;line-height:1")}>⚠️</span>
          <span style={sx("flex:1")}>{aviso.texto}</span>
          <span style={sx("opacity:.6;font-size:13px")}>✕</span>
        </div>
      )}
    </div>
  );
}

// A domicilio el pedido no espera en el mostrador: sale a reparto. El estado
// interno es el mismo ("lista"), lo que cambia es cómo se llama en el panel.
const esDomicilio = (o) => o.entrega === "domicilio";

const ETIQUETA_CERRADO = { entregado: "Entregado", rechazado: "Rechazado", no_recogido: "No recogido" };

const botonAccion = (tono) =>
  sx(`width:100%;min-height:50px;font-family:'Anton',sans-serif;font-size:17px;letter-spacing:.04em;padding:10px 12px;border-radius:12px;border:0;cursor:pointer;background:rgb(${tono});color:#0a0806`);
const botonSecundario = sx("width:100%;min-height:38px;font-size:13px;font-weight:700;letter-spacing:.03em;padding:6px 14px;border-radius:11px;border:1px solid rgba(255,120,90,.35);background:transparent;color:rgb(255,140,110);cursor:pointer");

// Cuánto falta para la hora de listo, o cuánto se ha pasado.
function cuentaAtras(readyIso, ahora) {
  const min = Math.round((new Date(readyIso).getTime() - ahora) / 60000);
  if (min > 0) return { texto: `faltan ${min}′`, tarde: false };
  if (min === 0) return { texto: "¡ya!", tarde: false };
  return { texto: `+${-min}′ tarde`, tarde: true };
}

// Filtro de la barra superior, con su contador.
function Chip({ activo, onClick, n, tono, pulso, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      style={{
        ...sx("display:inline-flex;align-items:center;gap:7px;height:40px;font-family:'Anton',sans-serif;font-size:13px;letter-spacing:.04em;text-transform:uppercase;padding:0 7px 0 13px;border-radius:100px;cursor:pointer;white-space:nowrap"),
        border: `1px solid rgb(${tono} / ${activo ? 1 : 0.35})`,
        background: activo ? `rgb(${tono})` : `rgb(${tono} / .08)`,
        color: activo ? "#0a0806" : "#f6f1e9",
        animation: pulso && !activo ? "ltb-pulse 1.6s infinite" : "none",
      }}
    >
      {children}
      <span style={{ ...sx("min-width:26px;padding:4px 8px;border-radius:100px;font-size:13px;line-height:1;text-align:center"), background: activo ? "rgba(10,8,6,.85)" : `rgb(${tono})`, color: activo ? `rgb(${tono})` : "#0a0806" }}>
        {n}
      </span>
    </button>
  );
}

// Aviso compacto dentro de un ticket (domicilio, pagado, alerta…).
function Aviso({ tono, children }) {
  return (
    <div style={{ ...sx("font-size:12.5px;font-weight:700;line-height:1.4;padding:6px 10px;border-radius:9px"), border: `1px solid rgb(${tono} / .5)`, background: `rgb(${tono} / .1)`, color: `rgb(${tono})` }}>
      {children}
    </div>
  );
}

// Ticket de cocina: cabecera de color con el estado y el cronómetro, lo que hay
// que preparar en grande, y la acción principal siempre abajo.
function Ticket({ o, estado, ahora, rgb, onPrint, onCancelar, onReembolsar, children }) {
  const [menu, setMenu] = useState(false);
  const cuenta = estado === "cocina" && o.ready_at ? cuentaAtras(o.ready_at, ahora) : null;
  const tono = cuenta?.tarde ? TONO.tarde : TONO[estado];
  const edad = haceCuanto(o.created_at);
  const etiqueta =
    estado === "nuevo" ? "Nuevo"
      : estado === "cocina" ? "En cocina"
      : estado === "lista" ? (esDomicilio(o) ? "En reparto" : "Lista")
      : estado === "programado" ? "Programado"
      : ETIQUETA_CERRADO[o.status] || o.status;
  const reloj =
    estado === "programado" ? `para las ${horaMadrid(o.programado_para)}`
      : cuenta ? cuenta.texto
      : estado === "cerrado" ? horaMadrid(o.created_at)
      : edad === "ahora" ? "ahora" : `hace ${edad}`;
  const cancelable = onCancelar && ["nuevo", "aceptado", "lista"].includes(o.status);
  const devolvible = onReembolsar && ["pagado", "reembolso_parcial"].includes(o.pago_estado);
  const itemMenu = sx("display:block;width:100%;text-align:left;font-size:13.5px;font-weight:600;padding:11px 14px;border:0;background:transparent;color:#f6f1e9;cursor:pointer;border-radius:9px");
  const herramienta = sx("display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 12px;font-size:13px;border-radius:10px;border:1px solid rgba(246,241,233,.2);background:transparent;color:#f6f1e9;cursor:pointer");

  return (
    <article
      style={{
        ...sx("position:relative;display:flex;flex-direction:column;border-radius:16px;background:#15110c;animation:ltb-menu-in .3s"),
        zIndex: menu ? 20 : "auto",
        boxShadow: estado === "nuevo" ? `0 0 0 2px rgb(${tono}), 0 14px 40px -16px rgb(${tono} / .7)` : "0 0 0 1px rgba(246,241,233,.08)",
      }}
    >
      {/* Cabecera: estado, cronómetro y número */}
      <header style={{ ...sx("border-radius:16px 16px 0 0;padding:9px 14px 10px;color:#0a0806"), background: `rgb(${tono})` }}>
        <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:8px;font-family:'Anton',sans-serif;font-size:13px;letter-spacing:.08em;text-transform:uppercase")}>
          <span>{etiqueta}</span>
          <span style={sx("font-size:14px")}>⏱ {reloj}</span>
        </div>
        <div style={sx("display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:2px")}>
          <span style={sx("font-family:'Anton',sans-serif;font-size:34px;line-height:1")}>#{o.code}</span>
          <span style={sx("font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;text-align:right")}>
            {esDomicilio(o) ? "🛵 Domicilio" : "🥡 Recoger"}
            {o.ready_at && estado !== "cerrado" ? ` · ${horaMadrid(o.ready_at)}` : ""}
          </span>
        </div>
      </header>

      <div style={sx("display:flex;flex-direction:column;gap:8px;padding:12px 14px")}>
        {/* Avisos */}
        {esDomicilio(o) && o.direccion && <Aviso tono="255 140 80">📍 {o.direccion}</Aviso>}
        {o.programado_para && estado !== "programado" && <Aviso tono={TONO.programado}>⏰ Para las {horaMadrid(o.programado_para)}</Aviso>}
        {o.pago_estado === "pagado" && <Aviso tono={TONO.lista}>💳 Pagado online — no cobrar</Aviso>}
        {o.pago_estado === "reembolso_parcial" && <Aviso tono="255 190 110">↩️ Devuelto {fmtEUR(o.reembolsado_cents || 0)} de {fmtEUR(o.total_cents)}</Aviso>}
        {o.pago_estado === "reembolsado" && <Aviso tono="200 192 182">↩️ Importe reembolsado al cliente</Aviso>}
        {o.alerta && <Aviso tono="255 170 90">⚠️ {o.alerta}</Aviso>}

        {/* Lo que hay que preparar */}
        <div style={sx("display:flex;flex-direction:column;gap:8px;padding-top:2px")}>
          {(o.items || []).map((it, i) => {
            const extras = it.extras || [];
            const tieneDetalle = it.upgrade || it.pan || extras.length > 0 || it.nota;
            return (
              <div key={i}>
                <div style={sx("display:flex;gap:9px;align-items:center;font-size:16px;font-weight:800;line-height:1.25")}>
                  <span style={{ ...sx("flex:none;display:inline-grid;place-items:center;min-width:26px;height:26px;padding:0 5px;border-radius:8px;font-family:'Anton',sans-serif;font-size:16px;line-height:1;color:#0a0806"), background: `rgb(${rgb})` }}>{it.qty}</span>
                  <span>
                    {it.name}
                    {it.variant ? <span style={sx("font-weight:600;color:rgba(246,241,233,.6)")}> · {it.variant}</span> : null}
                  </span>
                </div>
                {tieneDetalle && (
                  <div style={sx("padding-left:35px;margin-top:2px;display:flex;flex-direction:column;gap:1px;font-size:13px;line-height:1.35;color:rgba(246,241,233,.68)")}>
                    {it.upgrade && <span>+ {it.upgrade}</span>}
                    {it.pan && <span>🍞 {it.pan}</span>}
                    {extras.map((x) => <span key={x}>+ {x}</span>)}
                    {it.nota && <span style={{ fontWeight: 800, color: `rgb(${TONO.cocina})` }}>✎ {it.nota}</span>}
                  </div>
                )}
              </div>
            );
          })}
          {o.nota && (
            <div style={{ ...sx("font-size:13.5px;font-weight:800;line-height:1.4;padding:7px 10px;border-radius:9px;background:rgba(255,176,46,.1)"), color: `rgb(${TONO.cocina})` }}>
              📝 {o.nota}
            </div>
          )}
        </div>

        {/* Cliente, total y herramientas (ticket impreso y menú ⋯) en una línea */}
        <div style={sx("display:flex;align-items:center;gap:8px;padding-top:8px;border-top:1px dashed rgba(246,241,233,.14);font-size:13px;color:rgba(246,241,233,.7)")}>
          <span style={sx("flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25")}>
            <strong style={sx("color:#f6f1e9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{o.nombre}</strong>
            <a href={`tel:${o.telefono}`} style={sx("color:inherit;font-size:12px;white-space:nowrap")}>📞 {o.telefono}</a>
          </span>
          <span style={sx("font-family:'Anton',sans-serif;font-size:16px;color:#f6f1e9;white-space:nowrap")}>{fmtEUR(o.total_cents)}</span>
          <button onClick={onPrint} title="Imprimir ticket" aria-label="Imprimir ticket" style={{ ...herramienta, width: 36, padding: 0, fontSize: 15 }}>🖨</button>
          {(cancelable || devolvible) && (
            <span style={sx("position:relative;display:inline-flex")}>
              <button onClick={() => setMenu((m) => !m)} aria-label="Más opciones" aria-expanded={menu} style={{ ...herramienta, width: 36, padding: 0, fontSize: 17, background: menu ? "rgba(246,241,233,.1)" : "transparent" }}>⋯</button>
              {menu && (
                <>
                  {/* fondo invisible: cierra el menú al tocar fuera */}
                  <span onClick={() => setMenu(false)} style={sx("position:fixed;inset:0;z-index:1")} />
                  <span style={sx("position:absolute;right:0;bottom:calc(100% + 6px);z-index:2;min-width:240px;padding:6px;border-radius:14px;border:1px solid rgba(246,241,233,.18);background:#1d1610;box-shadow:0 14px 40px -10px rgba(0,0,0,.7);display:flex;flex-direction:column;gap:2px")}>
                    {cancelable && (
                      <button onClick={() => { setMenu(false); onCancelar(o); }} style={{ ...itemMenu, color: "rgb(255,120,90)" }}>
                        ✕ Cancelar pedido{o.pago_estado === "pagado" ? " (devuelve el dinero)" : ""}
                      </button>
                    )}
                    {devolvible && (
                      <button onClick={() => { setMenu(false); onReembolsar(o); }} style={itemMenu}>
                        ↩️ Devolver dinero (total o por productos)
                      </button>
                    )}
                  </span>
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Pie: la acción principal, siempre abajo y alineada entre tickets */}
      {children && (
        <footer style={sx("margin-top:auto;display:flex;flex-direction:column;gap:7px;padding:0 12px 12px")}>
          <div style={{ ...sx("display:flex;flex-direction:column;gap:7px;transition:opacity .2s"), opacity: o._guardando ? 0.45 : 1, pointerEvents: o._guardando ? "none" : "auto" }}>
            {children}
          </div>
          {o._guardando && <div style={sx("font-size:11.5px;text-align:center;color:rgba(246,241,233,.55)")}>Guardando…</div>}
        </footer>
      )}
    </article>
  );
}

// ── Gestión de la carta del local: agotados y descuentos ─────────────────────
// Lo que se marque aquí se refleja en /pedir en menos de un minuto.
function GestionCarta({ local, rgb }) {
  const [carta, setCarta] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(null);
  const [cat, setCat] = useState(MENU[0].id);

  useEffect(() => {
    fetch("/api/ajustes")
      .then((r) => r.json())
      .then((d) => setCarta(d.carta?.[local] || {}))
      .catch(() => setCarta({}));
  }, [local]);

  const set = async (itemId, patch) => {
    setGuardando(itemId);
    setError(null);
    const actual = carta[itemId] || { agotado: false, descuento: 0 };
    try {
      const res = await authFetch("/api/carta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local, itemId, ...actual, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setCarta(data.carta);
    } catch (e) {
      setError(e.message);
    }
    setGuardando(null);
  };

  const CATS = MENU.filter((c) => !c.soloCarta);
  const categoria = CATS.find((c) => c.id === cat) || CATS[0];

  if (carta === null) return <p style={sx("padding:30px;text-align:center;color:rgba(246,241,233,.5)")}>Cargando carta…</p>;

  const agotadosTotal = Object.values(carta).filter((e) => e.agotado).length;

  return (
    <main style={sx("max-width:1100px;margin:0 auto;padding:22px clamp(14px,3vw,28px);display:flex;flex-direction:column;gap:18px")}>
      <div>
        <h2 style={sx("margin:0 0 4px;font-family:'Anton',sans-serif;font-weight:400;font-size:26px;letter-spacing:.03em;text-transform:uppercase")}>Gestión de la carta</h2>
        <p style={sx("margin:0;font-size:13px;color:rgba(246,241,233,.6)")}>
          Marca lo que se ha agotado — los clientes lo ven al momento en la web.
          {agotadosTotal > 0 && <strong style={sx("color:rgb(255,140,90)")}> Ahora mismo: {agotadosTotal} agotado{agotadosTotal === 1 ? "" : "s"}.</strong>}
        </p>
      </div>

      {error && <div role="alert" style={sx("padding:12px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.5);background:rgba(255,92,40,.1);font-size:14px")}>⚠️ {error}</div>}

      <div style={sx("display:flex;flex-wrap:wrap;gap:8px")}>
        {CATS.map((c) => {
          const activa = c.id === cat;
          const nAgotados = c.items.filter((i) => carta[i.id]?.agotado).length;
          return (
            <button key={c.id} onClick={() => setCat(c.id)} style={sx(`font-family:'Anton',sans-serif;font-size:14px;letter-spacing:.03em;text-transform:uppercase;padding:10px 18px;border-radius:100px;cursor:pointer;border:1px solid ${activa ? `rgb(${rgb})` : "rgba(246,241,233,.16)"};background:${activa ? `rgb(${rgb})` : "transparent"};color:${activa ? "#0a0806" : "#f6f1e9"}`)}>
              {c.label}{nAgotados > 0 ? ` · ${nAgotados}⛔` : ""}
            </button>
          );
        })}
      </div>

      <div style={sx("display:flex;flex-direction:column;gap:8px")}>
        {categoria.items.map((item) => {
          const e = carta[item.id] || { agotado: false, descuento: 0 };
          const noVendible = item.orderable === false || item.soloLocal;
          const desde = item.orderable === false ? null : Math.min(...item.variants.map((v) => v.cents));
          return (
            <div key={item.id} style={{ ...sx("display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:13px 17px;border-radius:14px;background:#100c08"), border: e.agotado ? "1px solid rgba(255,100,80,.5)" : "1px solid rgba(246,241,233,.1)", opacity: noVendible ? 0.45 : 1 }}>
              <div style={sx("flex:1;min-width:170px")}>
                <div style={sx(`font-weight:700;font-size:15px;${e.agotado ? "text-decoration:line-through;color:rgba(246,241,233,.6)" : ""}`)}>{item.name}</div>
                <div style={sx("font-size:12px;color:rgba(246,241,233,.5)")}>
                  {noVendible ? (item.soloLocal ? "Solo en el local — no se pide online" : "Sin precio online") : <>desde {fmtEUR(desde)}</>}
                </div>
              </div>
              {!noVendible && (
                <button
                  onClick={() => set(item.id, { agotado: !e.agotado })}
                  disabled={guardando === item.id}
                  style={sx(`font-family:'Anton',sans-serif;font-size:13px;letter-spacing:.05em;padding:11px 18px;border-radius:100px;cursor:pointer;min-width:130px;border:1px solid ${e.agotado ? "rgb(255 100 80 / .7)" : "rgb(120 220 130 / .45)"};background:${e.agotado ? "rgba(255,100,80,.14)" : "transparent"};color:${e.agotado ? "rgb(255,120,90)" : "rgb(120,220,130)"};opacity:${guardando === item.id ? 0.5 : 1}`)}
                >
                  {e.agotado ? "⛔ AGOTADO" : "✓ En venta"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

// ── Modal de devolución (total o por productos) ──────────────────────────────
// Cerrar el local a mano. El motivo lo lee el cliente en /pedir, así que se
// ofrecen los cuatro de siempre para no tener que escribir con las manos
// llenas — y un campo libre para lo demás.
const MOTIVOS = ["Vamos saturados", "Problema técnico", "Nos hemos quedado sin producto", "Cerramos por hoy"];

function ModalCierre({ onCerrar, onCancelar, guardando }) {
  const [motivo, setMotivo] = useState("");

  return (
    <div role="dialog" aria-modal="true" aria-label="Cerrar pedidos online" onClick={onCancelar} style={sx("position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,4,3,.75);backdrop-filter:blur(4px)")}>
      <div onClick={(e) => e.stopPropagation()} style={sx("width:min(440px,100%);max-height:88vh;overflow:auto;background:#120e0a;border:1px solid rgba(246,241,233,.14);border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:14px;animation:ltb-rise .3s both")}>
        <div>
          <h3 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:22px;text-transform:uppercase")}>Cerrar pedidos online</h3>
          <p style={sx("margin:5px 0 0;font-size:13px;line-height:1.5;color:rgba(246,241,233,.6)")}>
            La web dejará de aceptar pedidos de este local al instante. Los que ya tienes en marcha no se tocan.
          </p>
        </div>

        <div>
          <span style={labelStyle}>¿Por qué? (lo verá el cliente)</span>
          <div style={sx("display:flex;flex-wrap:wrap;gap:7px;margin-bottom:9px")}>
            {MOTIVOS.map((m) => (
              <button key={m} onClick={() => setMotivo(m)} style={sx(`font-size:12.5px;font-weight:600;padding:9px 14px;border-radius:100px;cursor:pointer;border:1px solid ${motivo === m ? "rgb(255 100 80)" : "rgba(246,241,233,.2)"};background:${motivo === m ? "rgb(255 100 80 / .16)" : "transparent"};color:${motivo === m ? "rgb(255,140,115)" : "rgba(246,241,233,.8)"}`)}>
                {m}
              </button>
            ))}
          </div>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value.slice(0, 140))} placeholder="O escríbelo tú (opcional)" style={inputStyle} />
        </div>

        <div style={sx("display:flex;gap:10px")}>
          <button onClick={onCancelar} style={sx("flex:1;font-size:13px;letter-spacing:.05em;text-transform:uppercase;padding:14px;border-radius:100px;border:1px solid rgba(246,241,233,.25);background:transparent;color:#f6f1e9;cursor:pointer")}>
            Cancelar
          </button>
          <button onClick={() => onCerrar(motivo.trim())} disabled={guardando} style={{ ...sx("flex:1;font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.04em;padding:14px;border-radius:100px;border:0;cursor:pointer;background:rgb(255 100 80);color:#0a0806"), opacity: guardando ? 0.5 : 1 }}>
            {guardando ? "CERRANDO…" : "⏸ CERRAR"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DevolucionModal({ o, rgb, onClose, onConfirm }) {
  const [sel, setSel] = useState(() => new Set());
  const [custom, setCustom] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState(null);
  const items = o.items || [];
  const yaDevuelto = o.reembolsado_cents || 0;
  const disponible = o.total_cents - yaDevuelto;

  const toggle = (i) => setSel((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const sumaSel = [...sel].reduce((s, i) => s + (items[i]?.lineCents || 0), 0);
  const customCents = custom.trim() ? Math.round(parseFloat(custom.replace(",", ".")) * 100) : 0;
  const importe = customCents > 0 ? customCents : sumaSel;
  const valido = importe > 0 && importe <= disponible;

  const confirmar = async () => {
    if (!valido) { setErr(`El importe debe estar entre 0,01 € y ${fmtEUR(disponible)}.`); return; }
    if (!window.confirm(`¿Devolver ${fmtEUR(importe)} a ${o.nombre}?`)) return;
    setEnviando(true); setErr(null);
    try {
      await onConfirm(o, importe);
      onClose();
    } catch (e) {
      setErr(e.message);
      setEnviando(false);
    }
  };

  const linea = sx("display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:11px;cursor:pointer;font-size:14px;border:1px solid rgba(246,241,233,.14);background:#0a0806");

  return (
    <div role="dialog" aria-modal="true" aria-label="Devolver dinero" onClick={onClose} style={sx("position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,4,3,.75);backdrop-filter:blur(4px)")}>
      <div onClick={(e) => e.stopPropagation()} style={sx("width:min(460px,100%);max-height:88vh;overflow:auto;background:#120e0a;border:1px solid rgba(246,241,233,.14);border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:14px;animation:ltb-rise .3s both")}>
        <div style={sx("display:flex;align-items:flex-start;justify-content:space-between;gap:12px")}>
          <div>
            <h3 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:22px;text-transform:uppercase")}>Devolver dinero</h3>
            <p style={sx("margin:4px 0 0;font-size:13px;color:rgba(246,241,233,.6)")}>Pedido #{o.code} · {o.nombre} · pagó {fmtEUR(o.total_cents)}{yaDevuelto > 0 ? ` · ya devuelto ${fmtEUR(yaDevuelto)}` : ""}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={sx("width:36px;height:36px;flex:none;border-radius:50%;border:1px solid rgba(246,241,233,.2);background:transparent;color:#f6f1e9;font-size:16px;cursor:pointer")}>✕</button>
        </div>

        <div style={sx("font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(246,241,233,.55)")}>Marca los productos a devolver</div>
        <div style={sx("display:flex;flex-direction:column;gap:7px")}>
          {items.map((it, i) => (
            <label key={i} style={{ ...linea, borderColor: sel.has(i) ? `rgb(${rgb})` : "rgba(246,241,233,.14)" }}>
              <input type="checkbox" checked={sel.has(i)} disabled={!!custom.trim()} onChange={() => toggle(i)} />
              <span style={sx("flex:1")}>{it.qty}× {it.name}{it.variant ? ` (${it.variant})` : ""}</span>
              <strong>{fmtEUR(it.lineCents)}</strong>
            </label>
          ))}
          {o.envio_cents > 0 && <div style={sx("font-size:12px;color:rgba(246,241,233,.5);padding-left:2px")}>+ envío {fmtEUR(o.envio_cents)} (no listado — usa «otra cantidad» para incluirlo)</div>}
        </div>

        <div>
          <span style={labelStyle}>…o devuelve otra cantidad (€)</span>
          <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="p. ej. 3,50" style={inputStyle} />
        </div>

        <div style={sx("display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px dashed rgba(246,241,233,.18)")}>
          <button onClick={() => { setCustom(""); setSel(new Set()); setCustom((disponible / 100).toFixed(2)); }} style={sx("font-size:12.5px;font-weight:700;padding:9px 14px;border-radius:100px;border:1px solid rgba(246,241,233,.25);background:transparent;color:#f6f1e9;cursor:pointer")}>
            Toda la cuenta ({fmtEUR(disponible)})
          </button>
          <span style={sx("font-family:'Anton',sans-serif;font-size:22px")}>{fmtEUR(importe)}</span>
        </div>

        {err && <div role="alert" style={sx("font-size:13px;color:rgb(255,120,90)")}>⚠️ {err}</div>}

        <button onClick={confirmar} disabled={!valido || enviando} style={{ ...sx("font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.04em;padding:15px 20px;border-radius:100px;border:0;cursor:pointer"), background: `rgb(${rgb})`, color: "#0a0806", opacity: !valido || enviando ? 0.45 : 1 }}>
          {enviando ? "DEVOLVIENDO…" : `↩️ DEVOLVER ${fmtEUR(importe)}`}
        </button>
      </div>
    </div>
  );
}

