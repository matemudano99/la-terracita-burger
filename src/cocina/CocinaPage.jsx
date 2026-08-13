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
const POLL_MS = 2000;

// "ahora" / "3 min" / "1 h 05" — edad del pedido, clave en cocina.
function haceCuanto(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

// Minutos que se ofrecen al aceptar. A domicilio la hora que ve el cliente es
// la de llegada, no la de "listo": incluye el viaje.
const minutosDe = (o) => (o.entrega === "domicilio" ? [30, 45, 60] : [15, 25, 40]);

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
  const [muted, setMuted] = useState(false);
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

  const cargar = useCallback(async () => {
    if (!sesion || !L) return;
    try {
      const res = await authFetch(`/api/orders?panel=1&local=${encodeURIComponent(local)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setOrders(data.orders || []);
      setError(null);
      localStorage.setItem(LS_LOCAL, local);
    } catch (e) {
      setError(e.message);
      if (/sesión/i.test(e.message)) salir();
    }
  }, [sesion, local, L, salir]);

  // Sondeo continuo
  useEffect(() => {
    if (!sesion || !L) return;
    cargar();
    const iv = setInterval(cargar, POLL_MS);
    return () => clearInterval(iv);
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
    try {
      const res = await authFetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, ready_minutes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
      if (status === "aceptado") imprimirTicket(data.order, L.name); // ticket automático
    } catch (e) {
      setError(e.message);
      if (/sesión/i.test(e.message)) salir();
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
    hacerDevolucion(o, queda).catch((e) => { setError(e.message); if (/sesión/i.test(e.message)) salir(); });
  };
  const hacerDevolucion = async (o, importe_cents) => {
    const res = await authFetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: o.id, accion: "reembolsar", importe_cents }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
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
      setError(null);
    } catch (e) {
      setError(e.message);
      if (/sesión/i.test(e.message)) salir();
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
  const programados = orders
    .filter((o) => o.status === "nuevo" && esProgramadoLejano(o))
    .sort((a, b) => (a.programado_para < b.programado_para ? -1 : 1));
  const nuevos = orders.filter((o) => o.status === "nuevo" && !esProgramadoLejano(o));
  const enCocina = orders.filter((o) => o.status === "aceptado");
  const listas = orders.filter((o) => o.status === "lista");
  const cerrados = orders.filter((o) => o.status === "entregado" || o.status === "rechazado" || o.status === "no_recogido");

  return (
    <div style={sx("min-height:100vh;padding:0 0 60px")}>
      <header style={{ ...sx("position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px 12px;padding:12px clamp(14px,3vw,28px);background:rgba(10,8,6,.94);border-bottom:1px solid rgba(246,241,233,.1)"), boxShadow: hayNuevos ? `0 4px 30px rgb(${L.rgb} / .35)` : "none" }}>
        <div style={sx("display:flex;align-items:center;gap:12px")}>
          <LtbMark size={22} style={{ color: "#f6f1e9" }} />
          <div>
            <div style={sx("font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.06em;line-height:1")}>COCINA · <span style={{ color: `rgb(${L.rgb})` }}>{L.name.toUpperCase()}</span></div>
            <div style={sx("font-size:11px;color:rgba(246,241,233,.5)")}>{error ? `⚠️ ${error}` : `${sesion.user?.nombre} · actualiza cada ${POLL_MS / 1000}s${pantallaOn ? " · 🔆 pantalla activa" : ""}`}</div>
          </div>
        </div>
        <div style={sx("display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:8px")}>
          {/* Cerrar / reabrir el local a mano */}
          <button
            onClick={() => (cerradoManual ? cambiarPausa(false) : setCerrando(true))}
            disabled={guardandoPausa || pausa === null}
            title={cerradoManual ? "Volver a aceptar pedidos online" : "Dejar de aceptar pedidos online"}
            style={sx(`display:inline-flex;align-items:center;gap:7px;font-family:'Anton',sans-serif;font-size:13px;letter-spacing:.05em;text-transform:uppercase;padding:12px 16px;border-radius:12px;cursor:pointer;border:1px solid ${cerradoManual ? "rgb(255 100 80)" : "rgb(120 220 130 / .55)"};background:${cerradoManual ? "rgb(255 100 80)" : "transparent"};color:${cerradoManual ? "#0a0806" : "rgb(120,220,130)"}`)}
          >
            {cerradoManual ? "⏸ Cerrado" : "● Abierto"}
          </button>
          <button
            className="ltb-solo-icono"
            onClick={() => setVista((v) => (v === "pedidos" ? "carta" : "pedidos"))}
            title={vista === "carta" ? "Volver a pedidos" : "Marcar agotados en la carta"}
            style={sx(`font-family:'Anton',sans-serif;font-size:13px;letter-spacing:.05em;text-transform:uppercase;padding:12px 18px;border-radius:12px;cursor:pointer;border:1px solid ${vista === "carta" ? `rgb(${L.rgb})` : "rgba(246,241,233,.2)"};background:${vista === "carta" ? `rgb(${L.rgb})` : "transparent"};color:${vista === "carta" ? "#0a0806" : "#f6f1e9"}`)}
          >
            {vista === "carta" ? <>📦 <span className="rotulo">Volver a pedidos</span></> : <>🍔 <span className="rotulo">Carta</span></>}
          </button>
          <a href="/admin" className="ltb-solo-icono" title="Panel de administración" style={sx("display:inline-flex;align-items:center;gap:7px;font-family:'Anton',sans-serif;font-size:13px;letter-spacing:.05em;text-transform:uppercase;padding:12px 16px;border-radius:12px;border:1px solid rgba(246,241,233,.2);color:#f6f1e9;text-decoration:none")}>
            🛠 <span className="rotulo">Admin</span>
          </a>
          <button onClick={() => { setMuted((m) => !m); beep(); }} aria-label="Silenciar alarma" style={sx("font-size:19px;width:44px;height:44px;border-radius:12px;border:1px solid rgba(246,241,233,.2);background:transparent;cursor:pointer")}>
            {muted ? "🔕" : "🔔"}
          </button>
          <button onClick={salir} className="ltb-solo-icono" title="Cerrar sesión" style={sx("font-size:12px;letter-spacing:.06em;text-transform:uppercase;padding:12px 16px;border-radius:12px;border:1px solid rgba(246,241,233,.2);background:transparent;color:rgba(246,241,233,.7);cursor:pointer")}>
            🚪 <span className="rotulo">Salir</span>
          </button>
        </div>
      </header>

      {/* Mientras está cerrado, que no se olvide de reabrir */}
      {cerradoManual && (
        <div style={sx("max-width:1380px;margin:0 auto;padding:16px clamp(14px,3vw,28px) 0")}>
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
      <main style={sx("max-width:1380px;margin:0 auto;padding:22px clamp(14px,3vw,28px);display:flex;flex-direction:column;gap:26px")}>
        {programados.length > 0 && (
          <section>
            <div style={sx("display:flex;align-items:center;gap:11px;padding:13px 17px;border-radius:14px;margin-bottom:12px;background:rgb(150 130 255 / .1);border:1px solid rgb(150 130 255 / .4)")}>
              <span style={sx("font-size:19px;line-height:1")}>⏰</span>
              <h2 style={sx("margin:0;flex:1;font-family:'Anton',sans-serif;font-weight:400;font-size:18px;letter-spacing:.05em;text-transform:uppercase")}>Programados</h2>
              <span style={sx("font-family:'Anton',sans-serif;font-size:16px;line-height:1;padding:5px 13px;border-radius:100px;background:rgb(180 165 255);color:#0a0806")}>{programados.length}</span>
            </div>
            <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr));gap:12px")}>
              {programados.map((o) => (
                <Card key={o.id} o={o} rgb={L.rgb} onPrint={() => imprimirTicket(o, L.name)} onCancelar={cancelarPedido} onReembolsar={abrirDevolucion}>
                  <div style={sx("display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px")}>
                    {minutosDe(o).map((m) => (
                      <button key={m} onClick={() => patch(o.id, "aceptado", m)} style={btn(`rgb(${L.rgb})`)}>✓ {m}′</button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
        <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:18px;align-items:start")}>
          <Columna icono="🔴" titulo="Nuevos" n={nuevos.length} tono="255 90 70" pulso={nuevos.length > 0} vacio="Sin pedidos nuevos — todo al día.">
            {nuevos.map((o) => (
              <Card key={o.id} o={o} rgb={L.rgb} destacado onPrint={() => imprimirTicket(o, L.name)} onCancelar={cancelarPedido} onReembolsar={abrirDevolucion}>
                <div style={sx("display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px")}>
                  {minutosDe(o).map((m) => (
                    <button key={m} onClick={() => patch(o.id, "aceptado", m)} style={btn(`rgb(${L.rgb})`)}>✓ {m}′</button>
                  ))}
                </div>
                <button onClick={() => window.confirm(`¿Rechazar el pedido ${o.code} de ${o.nombre}?`) && patch(o.id, "rechazado")} style={{ ...btn("transparent", "rgb(255,120,90)"), border: "1px solid rgba(255,100,80,.35)" }}>✕ Rechazar</button>
              </Card>
            ))}
          </Columna>

          <Columna icono="🔥" titulo="En cocina" n={enCocina.length} tono={L.rgb} vacio="Nada en plancha ahora mismo.">
            {enCocina.map((o) => (
              <Card key={o.id} o={o} rgb={L.rgb} onPrint={() => imprimirTicket(o, L.name)} onCancelar={cancelarPedido} onReembolsar={abrirDevolucion}>
                <button onClick={() => patch(o.id, "lista")} style={btn(`rgb(${L.rgb})`)}>✓ Lista para recoger</button>
              </Card>
            ))}
          </Columna>

          <Columna icono="✅" titulo="Listas" n={listas.length} tono="120 220 130" vacio="Ninguna esperando recogida.">
            {listas.map((o) => (
              <Card key={o.id} o={o} rgb={L.rgb} onPrint={() => imprimirTicket(o, L.name)} onCancelar={cancelarPedido} onReembolsar={abrirDevolucion}>
                <div style={sx("display:flex;flex-wrap:wrap;gap:8px")}>
                  <button onClick={() => patch(o.id, "entregado")} style={{ ...btn("rgb(120 220 130 / .9)"), flex: 1 }}>✓ Entregada</button>
                  <button onClick={() => window.confirm(`¿Marcar el pedido ${o.code} de ${o.nombre} como NO recogido?\n\nCon 1 aviso la web pedirá confirmar sus próximos pedidos; con 2, su teléfono queda bloqueado para pedir online.`) && patch(o.id, "no_recogido")} style={btn("transparent", "rgb(255,120,90)")}>
                    Nadie vino
                  </button>
                </div>
              </Card>
            ))}
          </Columna>
        </div>

        {cerrados.length > 0 && (
          <details>
            <summary style={sx("cursor:pointer;font-size:13px;color:rgba(246,241,233,.55)")}>Cerrados hoy ({cerrados.length})</summary>
            <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr));gap:12px;margin-top:12px;opacity:.55")}>
              {cerrados.map((o) => (
                <Card key={o.id} o={o} rgb={L.rgb} onPrint={() => imprimirTicket(o, L.name)} onReembolsar={abrirDevolucion} />
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
    </div>
  );
}

// Columna kanban: Nuevos → En cocina → Listas.
function Columna({ icono, titulo, n, tono, pulso, vacio, children }) {
  return (
    <section style={sx("display:flex;flex-direction:column;gap:12px;min-width:0")}>
      <header style={{ ...sx("display:flex;align-items:center;gap:11px;padding:13px 17px;border-radius:14px"), background: `rgb(${tono} / .1)`, border: `1px solid rgb(${tono} / .4)`, animation: pulso ? "ltb-pulse 1.6s infinite" : "none" }}>
        <span style={sx("font-size:19px;line-height:1")}>{icono}</span>
        <h2 style={sx("margin:0;flex:1;font-family:'Anton',sans-serif;font-weight:400;font-size:18px;letter-spacing:.05em;text-transform:uppercase")}>{titulo}</h2>
        <span style={{ ...sx("font-family:'Anton',sans-serif;font-size:16px;line-height:1;padding:5px 13px;border-radius:100px"), background: `rgb(${tono})`, color: "#0a0806" }}>{n}</span>
      </header>
      {n === 0 ? <p style={sx("margin:2px 4px;font-size:13px;color:rgba(246,241,233,.4)")}>{vacio}</p> : children}
    </section>
  );
}

function Card({ o, rgb, destacado, onPrint, onCancelar, onReembolsar, children }) {
  const [menu, setMenu] = useState(false);
  const hora = new Date(o.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  const ready = o.ready_at ? new Date(o.ready_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : null;
  const edad = haceCuanto(o.created_at);
  const cancelable = onCancelar && ["nuevo", "aceptado", "lista"].includes(o.status);
  const devolvible = onReembolsar && ["pagado", "reembolso_parcial"].includes(o.pago_estado);
  const itemMenu = sx("display:block;width:100%;text-align:left;font-size:13.5px;font-weight:600;padding:11px 14px;border:0;background:transparent;color:#f6f1e9;cursor:pointer;border-radius:9px");
  return (
    <div style={{ ...sx("border-radius:18px;padding:17px;display:flex;flex-direction:column;gap:10px;background:#100c08;animation:ltb-rise .35s both"), border: destacado ? `2px solid rgb(${rgb})` : "1px solid rgba(246,241,233,.12)", boxShadow: destacado ? `0 10px 40px -12px rgb(${rgb} / .5)` : "none" }}>
      <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:10px")}>
        <span style={{ ...sx("font-family:'Anton',sans-serif;font-size:32px;line-height:1"), color: `rgb(${rgb})` }}>#{o.code}</span>
        <div style={sx("display:flex;flex-direction:column;align-items:flex-end;gap:4px")}>
          <span style={sx(`font-size:11px;font-weight:800;letter-spacing:.05em;padding:4px 11px;border-radius:100px;background:rgba(246,241,233,.09);color:rgba(246,241,233,${edad === "ahora" ? ".95" : ".7"})`)}>
            ⏱ {edad === "ahora" ? "AHORA" : `hace ${edad}`}
          </span>
          <span style={sx("font-size:11.5px;color:rgba(246,241,233,.5)")}>{hora}{ready ? ` · lista ~${ready}` : ""}</span>
        </div>
      </div>
      <div style={sx("font-size:14px")}>
        <strong>{o.nombre}</strong> · <a href={`tel:${o.telefono}`} style={sx("color:rgba(246,241,233,.8)")}>{o.telefono}</a>
      </div>
      {o.programado_para && (
        <div style={sx("font-size:14px;font-weight:800;letter-spacing:.03em;text-align:center;padding:9px 12px;border-radius:10px;border:1px solid rgb(180 165 255 / .6);background:rgb(180 165 255 / .12);color:rgb(190,178,255)")}>
          ⏰ PARA LAS {horaMadrid(o.programado_para)}
        </div>
      )}
      {o.entrega === "domicilio" && (
        <div style={sx("font-size:13px;font-weight:700;line-height:1.45;padding:9px 12px;border-radius:10px;border:1px solid rgb(var(--emb) / .55);background:rgb(var(--emb) / .1);color:rgb(var(--emb))")}>
          🛵 A DOMICILIO — {o.direccion}
        </div>
      )}
      {o.pago_estado === "pagado" && (
        <div style={sx("font-size:13px;font-weight:800;letter-spacing:.05em;text-align:center;padding:9px 12px;border-radius:10px;border:1px solid rgb(120 220 130 / .6);background:rgb(120 220 130 / .12);color:rgb(120,220,130)")}>
          💳 PAGADO ONLINE — NO COBRAR
        </div>
      )}
      {o.pago_estado === "reembolso_parcial" && (
        <div style={sx("font-size:12.5px;font-weight:800;text-align:center;padding:8px 12px;border-radius:10px;border:1px solid rgb(255 180 90 / .55);background:rgb(255 180 90 / .1);color:rgb(255,190,110)")}>
          ↩️ Devuelto {fmtEUR(o.reembolsado_cents || 0)} de {fmtEUR(o.total_cents)}
        </div>
      )}
      {o.pago_estado === "reembolsado" && (
        <div style={sx("font-size:12.5px;font-weight:700;text-align:center;padding:8px 12px;border-radius:10px;border:1px solid rgba(246,241,233,.25);color:rgba(246,241,233,.7)")}>
          ↩️ Importe reembolsado al cliente
        </div>
      )}
      {o.alerta && (
        <div style={sx("font-size:12.5px;font-weight:700;line-height:1.45;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,140,40,.55);background:rgba(255,140,40,.1);color:rgb(255,170,90)")}>
          ⚠️ {o.alerta}
        </div>
      )}
      <div style={sx("display:flex;flex-direction:column;gap:6px;border-top:1px dashed rgba(246,241,233,.15);padding-top:8px")}>
        {(o.items || []).map((it, i) => (
          <div key={i} style={sx("font-size:14px;line-height:1.4")}>
            <strong>{it.qty}×</strong> {it.name}{it.variant ? ` (${it.variant})` : ""}
            {it.upgrade && <div style={sx("font-size:12.5px;color:rgba(246,241,233,.65);padding-left:20px")}>+ {it.upgrade}</div>}
            {it.pan && <div style={sx("font-size:12.5px;color:rgba(246,241,233,.65);padding-left:20px")}>🍞 {it.pan}</div>}
            {(it.extras || []).map((x) => <div key={x} style={sx("font-size:12.5px;color:rgba(246,241,233,.65);padding-left:20px")}>+ {x}</div>)}
            {it.nota && <div style={{ ...sx("font-size:12.5px;padding-left:20px;font-weight:700"), color: `rgb(${rgb})` }}>✎ {it.nota}</div>}
          </div>
        ))}
        {o.nota && <div style={{ ...sx("font-size:13px;font-weight:700;margin-top:2px"), color: `rgb(${rgb})` }}>📝 {o.nota}</div>}
      </div>
      <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:10px")}>
        <span style={sx("font-family:'Anton',sans-serif;font-size:19px")}>{fmtEUR(o.total_cents)}</span>
        <span style={sx("display:inline-flex;gap:8px;align-items:center")}>
          <button onClick={onPrint} style={sx("font-size:13px;padding:9px 14px;border-radius:10px;border:1px solid rgba(246,241,233,.25);background:transparent;color:#f6f1e9;cursor:pointer")}>🖨 Ticket</button>
          {(cancelable || devolvible) && (
            <span style={{ ...sx("position:relative;display:inline-flex"), zIndex: menu ? 30 : "auto" }}>
              <button onClick={() => setMenu((m) => !m)} aria-label="Más opciones" aria-expanded={menu} style={sx(`font-size:17px;line-height:1;width:38px;height:38px;border-radius:10px;border:1px solid ${menu ? "rgb(246 241 233 / .5)" : "rgba(246,241,233,.25)"};background:${menu ? "rgba(246,241,233,.1)" : "transparent"};color:#f6f1e9;cursor:pointer`)}>⋯</button>
              {menu && (
                <>
                  {/* fondo invisible: cierra el menú al tocar fuera */}
                  <span onClick={() => setMenu(false)} style={sx("position:fixed;inset:0;z-index:1")} />
                  <span style={sx("position:absolute;right:0;bottom:calc(100% + 6px);z-index:2;min-width:230px;padding:6px;border-radius:14px;border:1px solid rgba(246,241,233,.18);background:#1a140e;box-shadow:0 14px 40px -10px rgba(0,0,0,.7);display:flex;flex-direction:column;gap:2px")}>
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
        </span>
      </div>
      {children}
    </div>
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

