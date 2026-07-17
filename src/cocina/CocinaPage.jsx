import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sx } from "../sx";
import { MENU, fmtEUR } from "../menu";
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
const POLL_MS = 2000;

// "ahora" / "3 min" / "1 h 05" — edad del pedido, clave en cocina.
function haceCuanto(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

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
  const [vista, setVista] = useState("pedidos"); // "pedidos" | "carta"
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
          <button
            onClick={() => setVista((v) => (v === "pedidos" ? "carta" : "pedidos"))}
            style={sx(`font-family:'Anton',sans-serif;font-size:13px;letter-spacing:.05em;text-transform:uppercase;padding:12px 18px;border-radius:12px;cursor:pointer;border:1px solid ${vista === "carta" ? `rgb(${L.rgb})` : "rgba(246,241,233,.2)"};background:${vista === "carta" ? `rgb(${L.rgb})` : "transparent"};color:${vista === "carta" ? "#0a0806" : "#f6f1e9"}`)}
          >
            {vista === "carta" ? "📦 Volver a pedidos" : "🍔 Carta"}
          </button>
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

      {vista === "carta" ? (
        <GestionCarta local={local} rgb={L.rgb} />
      ) : (
      <main style={sx("max-width:1380px;margin:0 auto;padding:22px clamp(14px,3vw,28px);display:flex;flex-direction:column;gap:26px")}>
        <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:18px;align-items:start")}>
          <Columna icono="🔴" titulo="Nuevos" n={nuevos.length} tono="255 90 70" pulso={nuevos.length > 0} vacio="Sin pedidos nuevos — todo al día.">
            {nuevos.map((o) => (
              <Card key={o.id} o={o} rgb={L.rgb} destacado onPrint={() => setPrintOrder(o)}>
                <div style={sx("display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px")}>
                  {[15, 25, 40].map((m) => (
                    <button key={m} onClick={() => patch(o.id, "aceptado", m)} style={btn(`rgb(${L.rgb})`)}>✓ {m}′</button>
                  ))}
                </div>
                <button onClick={() => window.confirm(`¿Rechazar el pedido ${o.code} de ${o.nombre}?`) && patch(o.id, "rechazado")} style={{ ...btn("transparent", "rgb(255,120,90)"), border: "1px solid rgba(255,100,80,.35)" }}>✕ Rechazar</button>
              </Card>
            ))}
          </Columna>

          <Columna icono="🔥" titulo="En cocina" n={enCocina.length} tono={L.rgb} vacio="Nada en plancha ahora mismo.">
            {enCocina.map((o) => (
              <Card key={o.id} o={o} rgb={L.rgb} onPrint={() => setPrintOrder(o)}>
                <button onClick={() => patch(o.id, "lista")} style={btn(`rgb(${L.rgb})`)}>✓ Lista para recoger</button>
              </Card>
            ))}
          </Columna>

          <Columna icono="✅" titulo="Listas" n={listas.length} tono="120 220 130" vacio="Ninguna esperando recogida.">
            {listas.map((o) => (
              <Card key={o.id} o={o} rgb={L.rgb} onPrint={() => setPrintOrder(o)}>
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
                <Card key={o.id} o={o} rgb={L.rgb} onPrint={() => setPrintOrder(o)} />
              ))}
            </div>
          </details>
        )}
      </main>
      )}

      {printOrder && <Ticket o={printOrder} localName={L.name} />}
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

function Card({ o, rgb, destacado, onPrint, children }) {
  const hora = new Date(o.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  const ready = o.ready_at ? new Date(o.ready_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : null;
  const edad = haceCuanto(o.created_at);
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
