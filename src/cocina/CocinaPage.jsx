import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sx } from "../sx";
import { fmtEUR } from "../menu";
import { LOCALES } from "../locales";
import LtbMark from "../LtbMark";
import LoginBox from "../LoginBox";
import { getSesion, logout, authFetch } from "../authClient";

// ─────────────────────────────────────────────────────────────────────────────
// /cocina — panel para el local. Abre esta página en el móvil/tablet del
// local (Chrome), inicia sesión con tu cuenta de empleado y déjala abierta:
// suena una alarma con cada pedido nuevo y desde aquí se acepta, se marca
// lista y se imprime el ticket (diálogo de impresión → térmica vía RawBT).
// Las cuentas se crean desde /admin (pestaña Equipo).
// ─────────────────────────────────────────────────────────────────────────────

const LS_LOCAL = "ltb_panel_local";
const POLL_MS = 8000;

const btn = (bg, color = "#0a0806") =>
  sx(`font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.04em;padding:12px 18px;border-radius:12px;border:0;cursor:pointer;background:${bg};color:${color}`);

export default function CocinaPage() {
  const [sesion, setSesion] = useState(getSesion);
  const [local, setLocal] = useState(() => {
    const asignado = getSesion()?.user?.local;
    return LOCALES[asignado] ? asignado : localStorage.getItem(LS_LOCAL) || "";
  });
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [muted, setMuted] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);
  const audioCtx = useRef(null);

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

  // Repetir alarma mientras haya pedidos nuevos
  const hayNuevos = orders.some((o) => o.status === "nuevo");
  useEffect(() => {
    if (!hayNuevos || muted) return;
    beep();
    const iv = setInterval(beep, 6000);
    return () => clearInterval(iv);
  }, [hayNuevos, muted, beep]);

  useEffect(() => { document.title = hayNuevos ? "🔴 PEDIDO NUEVO — Cocina LTB" : "Cocina — La Terracita"; }, [hayNuevos]);

  // Impresión: al fijar printOrder se pinta el ticket y se abre el diálogo.
  useEffect(() => {
    if (!printOrder) return;
    document.body.classList.add("ltb-printing");
    const t = setTimeout(() => window.print(), 120);
    const after = () => setPrintOrder(null);
    window.addEventListener("afterprint", after);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", after);
      document.body.classList.remove("ltb-printing");
    };
  }, [printOrder]);

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
      if (status === "aceptado") setPrintOrder(data.order); // ticket automático
    } catch (e) {
      setError(e.message);
      if (/sesión/i.test(e.message)) salir();
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
  const nuevos = orders.filter((o) => o.status === "nuevo");
  const enCocina = orders.filter((o) => o.status === "aceptado");
  const listas = orders.filter((o) => o.status === "lista");
  const cerrados = orders.filter((o) => o.status === "entregado" || o.status === "rechazado" || o.status === "no_recogido");

  return (
    <div style={sx("min-height:100vh;padding:0 0 60px")}>
      <header style={{ ...sx("position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px clamp(14px,3vw,28px);background:rgba(10,8,6,.94);border-bottom:1px solid rgba(246,241,233,.1)"), boxShadow: hayNuevos ? `0 4px 30px rgb(${L.rgb} / .35)` : "none" }}>
        <div style={sx("display:flex;align-items:center;gap:12px")}>
          <LtbMark size={22} style={{ color: "#f6f1e9" }} />
          <div>
            <div style={sx("font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.06em;line-height:1")}>COCINA · <span style={{ color: `rgb(${L.rgb})` }}>{L.name.toUpperCase()}</span></div>
            <div style={sx("font-size:11px;color:rgba(246,241,233,.5)")}>{error ? `⚠️ ${error}` : `${sesion.user?.nombre} · actualiza cada ${POLL_MS / 1000}s`}</div>
          </div>
        </div>
        <div style={sx("display:flex;align-items:center;gap:10px")}>
          {sesion.user?.rol === "admin" && (
            <a href="/admin" style={sx("font-size:12px;letter-spacing:.06em;text-transform:uppercase;padding:12px 16px;border-radius:12px;border:1px solid rgba(246,241,233,.2);color:rgba(246,241,233,.7);text-decoration:none")}>
              Admin
            </a>
          )}
          <button onClick={() => { setMuted((m) => !m); beep(); }} aria-label="Silenciar alarma" style={sx("font-size:19px;width:44px;height:44px;border-radius:12px;border:1px solid rgba(246,241,233,.2);background:transparent;cursor:pointer")}>
            {muted ? "🔕" : "🔔"}
          </button>
          <button onClick={salir} style={sx("font-size:12px;letter-spacing:.06em;text-transform:uppercase;padding:12px 16px;border-radius:12px;border:1px solid rgba(246,241,233,.2);background:transparent;color:rgba(246,241,233,.7);cursor:pointer")}>
            Salir
          </button>
        </div>
      </header>

      <main style={sx("max-width:1200px;margin:0 auto;padding:22px clamp(14px,3vw,28px);display:flex;flex-direction:column;gap:30px")}>
        <Seccion titulo={`🔴 Nuevos (${nuevos.length})`} vacio="Sin pedidos nuevos — todo al día.">
          {nuevos.map((o) => (
            <Card key={o.id} o={o} rgb={L.rgb} destacado onPrint={() => setPrintOrder(o)}>
              <div style={sx("display:flex;flex-wrap:wrap;gap:8px")}>
                {[15, 25, 40].map((m) => (
                  <button key={m} onClick={() => patch(o.id, "aceptado", m)} style={btn(`rgb(${L.rgb})`)}>✓ {m} min</button>
                ))}
                <button onClick={() => window.confirm(`¿Rechazar el pedido ${o.code} de ${o.nombre}?`) && patch(o.id, "rechazado")} style={btn("transparent", "rgb(255,120,90)")}>✕ Rechazar</button>
              </div>
            </Card>
          ))}
        </Seccion>

        <Seccion titulo={`🔥 En cocina (${enCocina.length})`} vacio="Nada en plancha ahora mismo.">
          {enCocina.map((o) => (
            <Card key={o.id} o={o} rgb={L.rgb} onPrint={() => setPrintOrder(o)}>
              <button onClick={() => patch(o.id, "lista")} style={btn(`rgb(${L.rgb})`)}>✓ Lista para recoger</button>
            </Card>
          ))}
        </Seccion>

        <Seccion titulo={`✅ Listas (${listas.length})`} vacio="Ninguna esperando recogida.">
          {listas.map((o) => (
            <Card key={o.id} o={o} rgb={L.rgb} onPrint={() => setPrintOrder(o)}>
              <div style={sx("display:flex;flex-wrap:wrap;gap:8px")}>
                <button onClick={() => patch(o.id, "entregado")} style={btn("rgba(246,241,233,.16)", "#f6f1e9")}>Entregada</button>
                <button onClick={() => window.confirm(`¿Marcar el pedido ${o.code} de ${o.nombre} como NO recogido?\n\nCon 1 aviso la web pedirá confirmar sus próximos pedidos; con 2, su teléfono queda bloqueado para pedir online.`) && patch(o.id, "no_recogido")} style={btn("transparent", "rgb(255,120,90)")}>
                  Nadie la recogió
                </button>
              </div>
            </Card>
          ))}
        </Seccion>

        {cerrados.length > 0 && (
          <details>
            <summary style={sx("cursor:pointer;font-size:13px;color:rgba(246,241,233,.55)")}>Cerrados hoy ({cerrados.length})</summary>
            <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:12px;margin-top:12px;opacity:.55")}>
              {cerrados.map((o) => (
                <Card key={o.id} o={o} rgb={L.rgb} onPrint={() => setPrintOrder(o)} />
              ))}
            </div>
          </details>
        )}
      </main>

      {printOrder && <Ticket o={printOrder} localName={L.name} />}
    </div>
  );
}

function Seccion({ titulo, vacio, children }) {
  const hijos = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <section>
      <h2 style={sx("margin:0 0 12px;font-family:'Anton',sans-serif;font-weight:400;font-size:20px;letter-spacing:.04em;text-transform:uppercase")}>{titulo}</h2>
      {hijos.length === 0 ? (
        <p style={sx("margin:0;font-size:13.5px;color:rgba(246,241,233,.45)")}>{vacio}</p>
      ) : (
        <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:12px")}>{hijos}</div>
      )}
    </section>
  );
}

function Card({ o, rgb, destacado, onPrint, children }) {
  const hora = new Date(o.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  const ready = o.ready_at ? new Date(o.ready_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : null;
  return (
    <div style={{ ...sx("border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;background:#100c08"), border: destacado ? `2px solid rgb(${rgb})` : "1px solid rgba(246,241,233,.12)", boxShadow: destacado ? `0 10px 40px -12px rgb(${rgb} / .5)` : "none" }}>
      <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:10px")}>
        <span style={{ ...sx("font-family:'Anton',sans-serif;font-size:30px;line-height:1"), color: `rgb(${rgb})` }}>#{o.code}</span>
        <div style={sx("text-align:right;font-size:12px;color:rgba(246,241,233,.6)")}>
          {hora}{ready && <><br />lista ~{ready}</>}
        </div>
      </div>
      <div style={sx("font-size:14px")}>
        <strong>{o.nombre}</strong> · <a href={`tel:${o.telefono}`} style={sx("color:rgba(246,241,233,.8)")}>{o.telefono}</a>
      </div>
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
        <button onClick={onPrint} style={sx("font-size:13px;padding:9px 14px;border-radius:10px;border:1px solid rgba(246,241,233,.25);background:transparent;color:#f6f1e9;cursor:pointer")}>🖨 Ticket</button>
      </div>
      {children}
    </div>
  );
}

// Ticket 58mm — solo visible al imprimir (ver @media print en ltb.css).
// Se monta con un portal en <body>, fuera de #root, que queda oculto al imprimir.
function Ticket({ o, localName }) {
  const hora = new Date(o.created_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  const ready = o.ready_at ? new Date(o.ready_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : null;
  return createPortal(
    <div className="ltb-ticket">
      <div className="tk-center tk-big">LA TERRACITA BURGER</div>
      <div className="tk-center">{localName} — Pedido web</div>
      <div className="tk-sep" />
      <div className="tk-center tk-huge">#{o.code}</div>
      <div className="tk-center">{hora}{ready ? ` · lista ~${ready}` : ""}</div>
      <div className="tk-sep" />
      <div><b>{o.nombre}</b></div>
      <div>Tel: {o.telefono}</div>
      <div className="tk-sep" />
      {(o.items || []).map((it, i) => (
        <div key={i} className="tk-line">
          <div className="tk-row">
            <span>{it.qty}x {it.name}{it.variant ? ` ${it.variant}` : ""}</span>
            <span>{fmtEUR(it.lineCents)}</span>
          </div>
          {it.upgrade && <div className="tk-sub">+ {it.upgrade}</div>}
          {it.pan && <div className="tk-sub">+ {it.pan}</div>}
          {(it.extras || []).map((x) => <div key={x} className="tk-sub">+ {x}</div>)}
          {it.nota && <div className="tk-sub">** {it.nota}</div>}
        </div>
      ))}
      {o.nota && <div className="tk-line">** NOTA: {o.nota}</div>}
      <div className="tk-sep" />
      <div className="tk-row tk-big"><span>TOTAL</span><span>{fmtEUR(o.total_cents)}</span></div>
      <div className="tk-center">PAGO AL RECOGER</div>
      <div className="tk-center">¡Gracias! 🍔</div>
    </div>,
    document.body
  );
}
