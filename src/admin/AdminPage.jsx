import { useCallback, useEffect, useMemo, useState } from "react";
import { sx } from "../sx";
import { fmtEUR, EXTRAS, PANES, UPGRADES, precioDe, fusionarCarta, ID_EXTRA, ID_PAN, ID_UPGRADE } from "../menu";
import { LOCALES } from "../locales";
import LtbMark from "../LtbMark";
import LoginBox from "../LoginBox";
import { getSesion, logout, authFetch } from "../authClient";

// ─────────────────────────────────────────────────────────────────────────────
// /admin — panel de administración (solo rol admin).
// Resumen (ventas y actividad) · Historial (con export CSV) · Equipo (cuentas
// de empleados) · Ajustes (pausar pedidos online por local).
// ─────────────────────────────────────────────────────────────────────────────

const ESTADO_UI = {
  nuevo: { label: "Nuevo", color: "255 197 49" },
  aceptado: { label: "En cocina", color: "255 140 40" },
  lista: { label: "Lista", color: "120 220 130" },
  entregado: { label: "Entregado", color: "150 160 150" },
  rechazado: { label: "Rechazado", color: "255 100 80" },
  no_recogido: { label: "No recogido", color: "255 100 80" },
};

const DIA = 24 * 3600 * 1000;

// Un pedido a domicilio no está "listo" esperando en el local: está en
// reparto. El estado guardado es el mismo, cambia solo cómo se llama.
const estadoDe = (o) =>
  o.status === "lista" && o.entrega === "domicilio"
    ? { label: "En reparto", color: "255 140 90" }
    : ESTADO_UI[o.status] || ESTADO_UI.nuevo;

const RANGOS = [
  { id: "hoy", label: "Hoy" },
  { id: "ayer", label: "Ayer" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "90d", label: "90 días" },
  { id: "365d", label: "1 año" },
  { id: "fechas", label: "Fechas" },
];

const DIAS_RANGO = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };

// yyyy-mm-dd en hora local, que es lo que entiende <input type="date">.
const isoDia = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// `fechas` = { desde, hasta } en yyyy-mm-dd; solo lo usa el rango a medida.
function rangoFechas(id, fechas) {
  const hoy0 = new Date();
  hoy0.setHours(0, 0, 0, 0);
  if (id === "hoy") return { desde: hoy0, hasta: new Date() };
  if (id === "ayer") return { desde: new Date(hoy0 - DIA), hasta: hoy0 };
  if (id === "fechas") {
    return { desde: new Date(`${fechas.desde}T00:00:00`), hasta: new Date(`${fechas.hasta}T23:59:59.999`) };
  }
  return { desde: new Date(Date.now() - (DIAS_RANGO[id] || 7) * DIA), hasta: new Date() };
}

// Lo devuelto de un pedido. Si el reembolso fue total antes de que existiera la
// columna acumuladora, `reembolsado_cents` viene a 0: manda el estado del pago.
const devueltoDe = (o) =>
  o.pago_estado === "reembolsado" ? Math.max(o.reembolsado_cents || 0, o.total_cents) : o.reembolsado_cents || 0;

// Pedidos que pasaron por la pasarela (cobrados, aunque luego se devolvieran).
const COBRADOS = ["pagado", "reembolsado", "reembolso_parcial"];
const esOnline = (o) => COBRADOS.includes(o.pago_estado);

const horaDe = (iso) =>
  new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const fechaDe = (iso) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", timeZone: "Europe/Madrid" });

const card = sx("border:1px solid rgba(246,241,233,.12);border-radius:16px;background:#0d0a07;padding:20px");
const inputStyle = sx("width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(246,241,233,.18);background:#0a0806;color:#f6f1e9;font-size:14.5px;font-family:inherit;outline:none");
const labelStyle = sx("display:block;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,241,233,.55);margin:0 0 6px");
const btnAcc = sx("font-family:'Anton',sans-serif;font-size:14px;letter-spacing:.04em;padding:11px 20px;border-radius:100px;border:0;cursor:pointer;background:rgb(var(--acc));color:#0a0806");
const btnGhost = sx("font-size:12.5px;letter-spacing:.04em;text-transform:uppercase;padding:10px 16px;border-radius:100px;border:1px solid rgba(246,241,233,.22);background:transparent;color:#f6f1e9;cursor:pointer");

export default function AdminPage() {
  const [sesion, setSesion] = useState(getSesion);
  useEffect(() => { document.title = "Administración — La Terracita"; }, []);

  const salir = () => { logout(); setSesion(null); };

  if (!sesion) {
    return <LoginBox titulo="Administración" subtitulo="Acceso solo para administración." onOk={setSesion} />;
  }
  if (sesion.user?.rol !== "admin" && sesion.user?.rol !== "gerencia") {
    return (
      <div style={sx("min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center")}>
        <div>
          <p style={sx("font-size:15px;color:rgba(246,241,233,.75);margin:0 0 8px")}>Esta zona es solo para administración.</p>
          <p style={sx("font-size:13.5px;color:rgba(246,241,233,.5);margin:0 0 20px")}>Tu cuenta ({sesion.user?.email}) es de empleado. Vuelve al panel de cocina, o entra con la cuenta de administración.</p>
          <div style={sx("display:flex;gap:10px;justify-content:center;flex-wrap:wrap")}>
            <a href="/cocina" style={{ ...btnGhost, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>← Volver a cocina</a>
            <button onClick={salir} style={btnGhost}>Entrar con otra cuenta</button>
          </div>
        </div>
      </div>
    );
  }
  return <Panel user={sesion.user} salir={salir} />;
}

function Panel({ user, salir }) {
  const [tab, setTab] = useState("resumen");
  const [rango, setRango] = useState("hoy");
  // Rango a medida (botón Fechas): arranca en el último mes.
  const [fechas, setFechas] = useState(() => ({ desde: isoDia(new Date(Date.now() - 30 * DIA)), hasta: isoDia(new Date()) }));
  const [localF, setLocalF] = useState("");
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const { desde, hasta } = rangoFechas(rango, fechas);
      if (isNaN(desde) || isNaN(hasta) || desde > hasta) {
        setOrders([]);
        setError("Revisa las fechas: la de inicio tiene que ser anterior a la de fin.");
        return;
      }
      const params = new URLSearchParams({ historial: "1", desde: desde.toISOString(), hasta: hasta.toISOString() });
      if (localF) params.set("local", localF);
      const res = await authFetch(`/api/orders?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setOrders(data.orders || []);
    } catch (e) {
      setError(e.message);
      setOrders([]);
      if (e.sesionCaducada) salir();
    }
  }, [rango, fechas, localF, salir]);

  useEffect(() => { setOrders(null); cargar(); }, [cargar]);

  // La gerencia lo ve todo menos el equipo, y no puede cambiar nada: el
  // servidor lo rechazaría igual, aquí solo se le ahorran botones inútiles.
  const soloLectura = user.rol !== "admin";
  const TABS = [
    { id: "resumen", label: "Resumen" },
    { id: "historial", label: "Historial" },
    { id: "carta", label: "Carta" },
    { id: "banco", label: "Banco" },
    ...(soloLectura ? [] : [{ id: "equipo", label: "Equipo" }]),
    { id: "ajustes", label: "Ajustes" },
  ];
  const conFiltros = tab === "resumen" || tab === "historial";
  // ¿El rango elegido entra en la zona ya anonimizada por el borrado RGPD?
  // Se compara contra el inicio del día 30 -1 para que el rango "30 días" no
  // dispare el aviso por unas horas de diferencia.
  const corteRgpd = new Date();
  corteRgpd.setHours(0, 0, 0, 0);
  corteRgpd.setDate(corteRgpd.getDate() - 30);
  const desdeSel = rangoFechas(rango, fechas).desde;
  const antiguos = conFiltros && !isNaN(desdeSel) && desdeSel < corteRgpd;

  return (
    <div style={sx("min-height:100vh;padding-bottom:60px")}>
      <header style={sx("position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px clamp(14px,3vw,28px);background:rgba(10,8,6,.94);backdrop-filter:blur(8px);border-bottom:1px solid rgba(246,241,233,.1)")}>
        <div style={sx("display:flex;align-items:center;gap:12px")}>
          <LtbMark size={22} style={{ color: "#f6f1e9" }} />
          <div>
            <div style={sx("font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.06em;line-height:1")}>ADMINISTRACIÓN</div>
            <div style={sx("font-size:11px;color:rgba(246,241,233,.5)")}>{user.nombre}{soloLectura ? " · gerencia (solo consulta)" : ""}</div>
          </div>
        </div>
        <div style={sx("display:flex;align-items:center;gap:10px")}>
          {!soloLectura && <a href="/cocina" style={btnGhost}>Cocina</a>}
          <button onClick={salir} style={btnGhost}>Salir</button>
        </div>
      </header>

      <main style={sx("max-width:1200px;margin:0 auto;padding:22px clamp(14px,3vw,28px);display:flex;flex-direction:column;gap:20px")}>
        {/* Pestañas */}
        <div style={sx("display:flex;flex-wrap:wrap;gap:8px")}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={sx(`font-family:'Anton',sans-serif;font-size:14px;letter-spacing:.04em;text-transform:uppercase;padding:11px 20px;border-radius:100px;cursor:pointer;border:1px solid ${tab === t.id ? "rgb(var(--acc))" : "rgba(246,241,233,.16)"};background:${tab === t.id ? "rgb(var(--acc))" : "transparent"};color:${tab === t.id ? "#0a0806" : "#f6f1e9"}`)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtros de rango y local */}
        {conFiltros && (
          <div style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:8px")}>
            {RANGOS.map((r) => (
              <button key={r.id} onClick={() => setRango(r.id)} style={sx(`font-size:13px;font-weight:600;padding:9px 16px;border-radius:100px;cursor:pointer;border:1px solid ${rango === r.id ? "rgb(var(--acc))" : "rgba(246,241,233,.16)"};background:${rango === r.id ? "rgb(var(--acc) / .14)" : "transparent"};color:${rango === r.id ? "rgb(var(--acc))" : "rgba(246,241,233,.75)"}`)}>
                {r.label}
              </button>
            ))}
            <span style={sx("width:1px;height:22px;background:rgba(246,241,233,.15);margin:0 4px")} />
            {["", ...Object.keys(LOCALES)].map((id) => (
              <button key={id || "ambos"} onClick={() => setLocalF(id)} style={sx(`font-size:13px;font-weight:600;padding:9px 16px;border-radius:100px;cursor:pointer;border:1px solid ${localF === id ? "rgb(var(--acc))" : "rgba(246,241,233,.16)"};background:${localF === id ? "rgb(var(--acc) / .14)" : "transparent"};color:${localF === id ? "rgb(var(--acc))" : "rgba(246,241,233,.75)"}`)}>
                {id ? LOCALES[id].name : "Ambos locales"}
              </button>
            ))}
            <button onClick={cargar} title="Actualizar" style={btnGhost}>↻</button>
          </div>
        )}

        {/* Rango a medida: cualquier par de fechas, sin límite de antigüedad */}
        {conFiltros && rango === "fechas" && (
          <div style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:-10px")}>
            <label style={sx("display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(246,241,233,.65)")}>
              Desde
              <input type="date" value={fechas.desde} max={fechas.hasta} onChange={(e) => setFechas((f) => ({ ...f, desde: e.target.value }))} style={{ ...inputStyle, width: "auto", padding: "9px 12px", colorScheme: "dark" }} />
            </label>
            <label style={sx("display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(246,241,233,.65)")}>
              Hasta
              <input type="date" value={fechas.hasta} min={fechas.desde} max={isoDia(new Date())} onChange={(e) => setFechas((f) => ({ ...f, hasta: e.target.value }))} style={{ ...inputStyle, width: "auto", padding: "9px 12px", colorScheme: "dark" }} />
            </label>
          </div>
        )}

        {antiguos && (
          <p style={sx("margin:-8px 0 0;font-size:12.5px;line-height:1.5;color:rgba(246,241,233,.45)")}>
            De los pedidos de hace más de 30 días se conservan fecha, local, estado e importe; el nombre, el teléfono y el detalle pueden salir anonimizados (RGPD).
          </p>
        )}

        {error && <div role="alert" style={sx("padding:13px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.5);background:rgba(255,92,40,.1);font-size:14px")}>{error}</div>}

        {tab === "resumen" && <Resumen orders={orders} localF={localF} />}
        {tab === "historial" && <Historial orders={orders} />}
        {tab === "carta" && <Carta soloLectura={soloLectura} />}
        {tab === "banco" && <Banco />}
        {tab === "equipo" && !soloLectura && <Equipo user={user} />}
        {tab === "ajustes" && <Ajustes soloLectura={soloLectura} />}
      </main>
    </div>
  );
}

// ── Resumen ──────────────────────────────────────────────────────────────────
function Resumen({ orders, localF }) {
  if (orders === null) return <Cargando />;

  const validos = orders.filter((o) => o.status !== "rechazado" && o.status !== "no_recogido");
  // Ingresos netos: total cobrado menos lo devuelto (parcial o total).
  const ingresos = validos.reduce((s, o) => s + o.total_cents - devueltoDe(o), 0);
  const devoluciones = orders.reduce((s, o) => s + devueltoDe(o), 0);
  const ticketMedio = validos.length ? Math.round(ingresos / validos.length) : 0;
  const rechazados = orders.filter((o) => o.status === "rechazado").length;
  const noRecogidos = orders.filter((o) => o.status === "no_recogido").length;

  // Pedidos por hora (hora de Madrid)
  const porHora = new Array(24).fill(0);
  for (const o of orders) {
    const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", hour: "numeric", hour12: false }).format(new Date(o.created_at))) % 24;
    porHora[h]++;
  }
  const horas = porHora.map((n, h) => ({ h, n })).slice(11); // desde las 11:00
  const maxHora = Math.max(1, ...horas.map((x) => x.n));

  // Top productos
  const prod = new Map();
  for (const o of validos) for (const it of o.items || []) prod.set(it.name, (prod.get(it.name) || 0) + it.qty);
  const top = [...prod.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxProd = Math.max(1, ...top.map(([, n]) => n));

  // Reparto por local
  const porLocal = Object.keys(LOCALES).map((id) => ({
    id,
    n: validos.filter((o) => o.local === id).length,
    eur: validos.filter((o) => o.local === id).reduce((s, o) => s + o.total_cents - devueltoDe(o), 0),
  }));

  const kpi = (titulo, valor, extra) => (
    <div style={card}>
      <div style={sx("font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55);margin-bottom:8px")}>{titulo}</div>
      <div style={sx("font-family:'Anton',sans-serif;font-size:34px;line-height:1;color:rgb(var(--acc))")}>{valor}</div>
      {extra && <div style={sx("font-size:12px;color:rgba(246,241,233,.5);margin-top:6px")}>{extra}</div>}
    </div>
  );

  return (
    <div style={sx("display:flex;flex-direction:column;gap:16px")}>
      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:14px")}>
        {kpi("Pedidos", validos.length, rechazados || noRecogidos ? `+ ${rechazados} rechazados · ${noRecogidos} sin recoger` : "ninguno rechazado")}
        {kpi("Ingresos netos", fmtEUR(ingresos), devoluciones > 0 ? `ventas del periodo · ${fmtEUR(devoluciones)} devueltos` : "ventas del periodo, ya sin devoluciones")}
        {kpi("Ticket medio", validos.length ? fmtEUR(ticketMedio) : "—")}
        {kpi("Pendientes ahora", orders.filter((o) => o.status === "nuevo" || o.status === "aceptado" || o.status === "lista").length, "nuevos + en cocina + listas")}
      </div>

      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px")}>
        {/* Pedidos por hora */}
        <div style={card}>
          <div style={sx("font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55);margin-bottom:16px")}>Pedidos por hora</div>
          <div style={sx("display:flex;align-items:flex-end;gap:4px;height:120px")}>
            {horas.map(({ h, n }) => (
              <div key={h} title={`${h}:00 — ${n} pedido${n === 1 ? "" : "s"}`} style={sx("flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end")}>
                <span style={sx(`font-size:10px;color:rgba(246,241,233,${n ? ".8" : ".25"})`)}>{n || ""}</span>
                <div style={sx(`width:100%;border-radius:4px 4px 0 0;background:${n ? "rgb(var(--acc))" : "rgba(246,241,233,.08)"};height:${n ? Math.max(6, (n / maxHora) * 78) : 3}px`)} />
                <span style={sx("font-size:9.5px;color:rgba(246,241,233,.4)")}>{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top productos */}
        <div style={card}>
          <div style={sx("font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55);margin-bottom:16px")}>Más pedidos</div>
          {top.length === 0 && <p style={sx("margin:0;font-size:13px;color:rgba(246,241,233,.45)")}>Sin datos en este periodo.</p>}
          <div style={sx("display:flex;flex-direction:column;gap:10px")}>
            {top.map(([name, n]) => (
              <div key={name}>
                <div style={sx("display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px")}>
                  <span>{name}</span><strong style={sx("color:rgb(var(--acc))")}>{n}</strong>
                </div>
                <div style={sx("height:7px;border-radius:100px;background:rgba(246,241,233,.08);overflow:hidden")}>
                  <div style={sx(`height:100%;border-radius:100px;background:rgb(var(--acc));width:${(n / maxProd) * 100}%`)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por local */}
        {!localF && (
          <div style={card}>
            <div style={sx("font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55);margin-bottom:16px")}>Por local</div>
            <div style={sx("display:flex;flex-direction:column;gap:14px")}>
              {porLocal.map((l) => (
                <div key={l.id} style={sx("display:flex;align-items:center;justify-content:space-between;gap:10px")}>
                  <span style={{ ...sx("font-family:'Anton',sans-serif;font-size:17px;text-transform:uppercase"), color: `rgb(${LOCALES[l.id].rgb})` }}>{LOCALES[l.id].name}</span>
                  <span style={sx("font-size:13.5px;color:rgba(246,241,233,.75)")}>{l.n} pedidos · <strong style={sx("color:#f6f1e9")}>{fmtEUR(l.eur)}</strong></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Historial ────────────────────────────────────────────────────────────────
function Historial({ orders }) {
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState(null);
  const [limite, setLimite] = useState(120);

  // Al cambiar de periodo o de búsqueda se vuelve a la primera tanda.
  useEffect(() => { setLimite(120); }, [orders, busca]);

  if (orders === null) return <Cargando />;

  const q = busca.trim().toLowerCase();
  const filtrados = q
    ? orders.filter((o) => o.code.includes(q) || o.nombre.toLowerCase().includes(q) || o.telefono.includes(q))
    : orders;

  const exportCSV = () => {
    const dec = (c) => (c / 100).toFixed(2).replace(".", ",");
    // Productos − Promo + Envío = Total, para que la cuenta se pueda seguir.
    const filas = [["Fecha", "Hora", "Nº", "Local", "Cliente", "Teléfono", "Estado", "Cobro", "Productos €", "Promo web €", "Envío €", "Total €", "Devuelto €", "Neto €", "Artículos"]];
    for (const o of filtrados) {
      const productos = (o.items || []).reduce((s, it) => s + (it.lineCents || 0), 0);
      filas.push([
        fechaDe(o.created_at), horaDe(o.created_at), o.code, LOCALES[o.local]?.name || o.local,
        o.nombre, o.telefono, estadoDe(o).label,
        esOnline(o) ? "Online" : "En el local",
        dec(productos), dec(o.promo_cents || 0), dec(o.envio_cents || 0),
        dec(o.total_cents), dec(devueltoDe(o)), dec(o.total_cents - devueltoDe(o)),
        (o.items || []).map((it) => `${it.qty}x ${it.name}${it.variant ? ` ${it.variant}` : ""} (${dec(it.lineCents || 0)})`).join(" | "),
      ]);
    }
    const csv = filas.map((f) => f.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `pedidos-terracita-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={sx("display:flex;flex-direction:column;gap:12px")}>
      <Cuadre orders={orders} />

      <div style={sx("display:flex;flex-wrap:wrap;gap:10px;align-items:center")}>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nº, nombre o teléfono" style={{ ...inputStyle, maxWidth: 340 }} />
        <span style={sx("font-size:12.5px;color:rgba(246,241,233,.5)")}>{filtrados.length} pedido{filtrados.length === 1 ? "" : "s"}</span>
        <button onClick={exportCSV} disabled={filtrados.length === 0} style={{ ...btnGhost, marginLeft: "auto", opacity: filtrados.length ? 1 : 0.4 }}>Exportar CSV</button>
      </div>

      {filtrados.length === 0 && <p style={sx("margin:16px 0;font-size:13.5px;color:rgba(246,241,233,.45)")}>No hay pedidos en este periodo.</p>}

      <div style={sx("display:flex;flex-direction:column;gap:8px")}>
        {filtrados.slice(0, limite).map((o) => {
          const e = estadoDe(o);
          const open = abierto === o.id;
          return (
            <div key={o.id} style={{ ...card, padding: 0, overflow: "hidden" }}>
              <button onClick={() => setAbierto(open ? null : o.id)} style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;width:100%;padding:14px 18px;border:0;background:transparent;color:#f6f1e9;cursor:pointer;text-align:left;font-family:inherit;font-size:14px")}>
                <span style={sx("font-family:'Anton',sans-serif;font-size:20px;color:rgb(var(--acc));min-width:64px")}>#{o.code}</span>
                <span style={sx("font-size:12.5px;color:rgba(246,241,233,.6);min-width:88px")}>{fechaDe(o.created_at)} · {horaDe(o.created_at)}</span>
                <span style={{ ...sx("font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 11px;border-radius:100px"), color: `rgb(${e.color})`, border: `1px solid rgb(${e.color} / .5)`, background: `rgb(${e.color} / .1)` }}>{e.label}</span>
                <span style={{ ...sx("font-size:12px;font-weight:700;text-transform:uppercase"), color: `rgb(${LOCALES[o.local]?.rgb || "255 197 49"})` }}>{LOCALES[o.local]?.name || o.local}</span>
                <span style={sx("flex:1")}>{o.nombre}</span>
                {o.programado_para && <span title={`Programado para las ${horaDe(o.programado_para)}`} style={sx("font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 9px;border-radius:100px;border:1px solid rgb(180 165 255 / .5);color:rgb(190,178,255)")}>Programado</span>}
                {o.entrega === "domicilio" && <span style={sx("font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 9px;border-radius:100px;border:1px solid rgb(var(--emb) / .5);color:rgb(var(--emb))")}>Domicilio</span>}
                {o.pago_estado === "pagado" && <span style={sx("font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 9px;border-radius:100px;border:1px solid rgb(120 220 130 / .5);color:rgb(120,220,130)")}>Pagado</span>}
                {o.pago_estado === "reembolso_parcial" && <span title={`Devuelto ${fmtEUR(o.reembolsado_cents || 0)}`} style={sx("font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 9px;border-radius:100px;border:1px solid rgb(255 180 90 / .5);color:rgb(255,190,110)")}>Devuelto parcial</span>}
                {o.pago_estado === "reembolsado" && <span style={sx("font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 9px;border-radius:100px;border:1px solid rgba(246,241,233,.3);color:rgba(246,241,233,.7)")}>Devuelto</span>}
                <strong style={sx("font-family:'Anton',sans-serif;font-size:17px")}>{fmtEUR(o.total_cents)}</strong>
                <span style={sx("color:rgba(246,241,233,.4)")}>{open ? "▲" : "▼"}</span>
              </button>
              {open && (
                <div style={sx("padding:0 18px 16px;border-top:1px dashed rgba(246,241,233,.14)")}>
                  <div style={sx("padding-top:12px;font-size:13.5px;color:rgba(246,241,233,.75)")}>
                    Tel. <a href={`tel:${o.telefono}`} style={sx("color:#f6f1e9")}>{o.telefono}</a>
                    {o.ready_at && <> · lista ~{horaDe(o.ready_at)}</>}
                  </div>
                  {o.nota && <div style={sx("margin-top:10px;font-size:13px;color:rgb(var(--acc))")}>Nota: {o.nota}</div>}
                  <Desglose o={o} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtrados.length > limite && (
        <button onClick={() => setLimite((n) => n + 200)} style={{ ...btnGhost, alignSelf: "center" }}>
          Ver más ({filtrados.length - limite} pedido{filtrados.length - limite === 1 ? "" : "s"} más)
        </button>
      )}
    </div>
  );
}

// ── Desglose de un pedido ────────────────────────────────────────────────────
// De dónde sale el total: cada producto con lo que costó, la promo web, el
// envío y lo devuelto. Sin esto, "9,90 + 10,90 + 1,50" no daba los 17,35 € que
// se cobraron y parecía un error (era el 50 % de la segunda hamburguesa).
function Desglose({ o }) {
  const items = o.items || [];
  const productos = items.reduce((s, it) => s + (it.lineCents || 0), 0);
  const promo = o.promo_cents || 0;
  const envio = o.envio_cents || 0;
  const devuelto = devueltoDe(o);
  // Pedidos de antes de guardar la promo aparte: si no cuadra, se enseña la
  // diferencia como descuento en vez de esconderla.
  const sinExplicar = productos - promo + envio - o.total_cents;

  const fila = (etiqueta, valor, opts = {}) => (
    <div style={{ ...sx("display:flex;justify-content:space-between;gap:14px;font-size:13.5px;line-height:1.5"), color: opts.color || "rgba(246,241,233,.75)", fontWeight: opts.fuerte ? 700 : 400 }}>
      <span>{etiqueta}</span>
      <span style={sx("white-space:nowrap;font-variant-numeric:tabular-nums")}>{valor}</span>
    </div>
  );
  const sub = (txt, color) => <div style={{ ...sx("font-size:12px;padding-left:22px;line-height:1.45"), color: color || "rgba(246,241,233,.55)" }}>{txt}</div>;

  return (
    <div style={sx("margin-top:12px;max-width:520px;display:flex;flex-direction:column;gap:6px")}>
      {items.map((it, i) => (
        <div key={i}>
          <div style={sx("display:flex;justify-content:space-between;gap:14px;font-size:13.5px;line-height:1.45")}>
            <span>
              <strong>{it.qty}×</strong> {it.name}{it.variant ? ` (${it.variant})` : ""}
              {it.qty > 1 && it.unitCents ? <span style={sx("color:rgba(246,241,233,.45)")}> · {fmtEUR(it.unitCents)} c/u</span> : null}
              {it.descuento ? <span style={sx("color:rgb(var(--emb));font-weight:700")}> · oferta −{it.descuento} %</span> : null}
            </span>
            <span style={sx("white-space:nowrap;font-variant-numeric:tabular-nums")}>{fmtEUR(it.lineCents || 0)}</span>
          </div>
          {it.upgrade && sub(`+ ${it.upgrade}`)}
          {it.pan && sub(`Pan: ${it.pan}`)}
          {(it.extras || []).map((x) => <div key={x}>{sub(`+ ${x}`)}</div>)}
          {it.nota && sub(`Nota: ${it.nota}`, "rgb(var(--acc))")}
        </div>
      ))}

      <div style={sx("margin-top:4px;padding-top:8px;border-top:1px solid rgba(246,241,233,.12);display:flex;flex-direction:column;gap:3px")}>
        {(promo > 0 || envio > 0 || sinExplicar !== 0) && fila("Productos", fmtEUR(productos))}
        {promo > 0 && fila("Promo web (50 % en la 2ª hamburguesa)", `− ${fmtEUR(promo)}`, { color: "rgb(var(--emb))" })}
        {sinExplicar > 0 && fila("Descuento aplicado", `− ${fmtEUR(sinExplicar)}`, { color: "rgb(var(--emb))" })}
        {envio > 0 && fila("Envío a domicilio", `+ ${fmtEUR(envio)}`)}
        {fila(devuelto > 0 ? "Cobrado" : "Total cobrado", fmtEUR(o.total_cents), { fuerte: true, color: "#f6f1e9" })}
        {devuelto > 0 && fila("Devuelto al cliente", `− ${fmtEUR(devuelto)}`, { color: "rgb(255,140,110)" })}
        {devuelto > 0 && fila("Neto", fmtEUR(o.total_cents - devuelto), { fuerte: true, color: "#f6f1e9" })}
      </div>
    </div>
  );
}

// ── Cuadre ───────────────────────────────────────────────────────────────────
// Lo cobrado por la pasarela en el periodo, menos las devoluciones. Lo que
// acaba entrando en el banco, con sus comisiones, está en la pestaña Banco.
function Cuadre({ orders }) {
  const online = orders.filter(esOnline);
  const bruto = online.reduce((s, o) => s + o.total_cents, 0);
  const devuelto = online.reduce((s, o) => s + devueltoDe(o), 0);
  const enLocal = orders.filter((o) => !esOnline(o) && o.status !== "rechazado" && o.status !== "no_recogido");
  const enLocalCents = enLocal.reduce((s, o) => s + o.total_cents, 0);

  if (online.length === 0 && enLocal.length === 0) return null;

  const fila = (etiqueta, valor, nota, opts = {}) => (
    <div style={{ ...sx("display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:8px 0"), borderTop: opts.linea ? "1px solid rgba(246,241,233,.12)" : "none" }}>
      <span style={sx(`font-size:${opts.fuerte ? "14.5px" : "13.5px"};font-weight:${opts.fuerte ? "700" : "400"};color:${opts.fuerte ? "#f6f1e9" : "rgba(246,241,233,.8)"}`)}>
        {etiqueta}
        {nota && <span style={sx("font-size:11.5px;color:rgba(246,241,233,.4);margin-left:8px")}>{nota}</span>}
      </span>
      <strong style={{ ...sx(`font-family:'Anton',sans-serif;font-size:${opts.fuerte ? "22px" : "17px"};white-space:nowrap`), color: opts.color || "#f6f1e9" }}>{valor}</strong>
    </div>
  );

  return (
    <div style={card}>
      <div style={sx("font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55);margin-bottom:4px")}>Cuadre</div>
      {fila("Cobrado online", fmtEUR(bruto), `${online.length} cobro${online.length === 1 ? "" : "s"}`)}
      {devuelto > 0 && fila("Devoluciones", `− ${fmtEUR(devuelto)}`, null, { color: "rgb(255,140,110)" })}
      {fila("Neto cobrado", fmtEUR(bruto - devuelto), null, { linea: true, fuerte: true })}
      {enLocal.length > 0 && fila("Cobrado en el local", fmtEUR(enLocalCents), `${enLocal.length} pedido${enLocal.length === 1 ? "" : "s"}`, { linea: true, color: "rgba(246,241,233,.75)" })}
    </div>
  );
}

// ── Carta ────────────────────────────────────────────────────────────────────
// Precios, disponibilidad, ofertas y alta/baja de productos. La carta de
// src/menu.js es la base: aquí solo se guarda lo que se cambia, y cada cosa
// tiene su vuelta atrás. El servidor cobra siempre con lo que se ve aquí.
// ─────────────────────────────────────────────────────────────────────────────

// 12,90 € → 1290 céntimos. Devuelve null si lo escrito no es un precio.
function aCentimos(txt) {
  const limpio = String(txt).replace(/[^0-9.,]/g, "").replace(",", ".");
  if (!limpio) return null;
  const n = Math.round(Number(limpio) * 100);
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : null;
}
const aEuros = (cents) => (cents / 100).toFixed(2).replace(".", ",");

// Añadidos, panes y acompañamientos: solo tienen precio.
const GRUPOS_SUELTOS = [
  { id: "extras", label: "Añadidos", lista: EXTRAS, prefijo: ID_EXTRA },
  { id: "panes", label: "Panes", lista: PANES, prefijo: ID_PAN },
  { id: "upgrades", label: "Acompañamientos", lista: UPGRADES, prefijo: ID_UPGRADE },
];

function Carta({ soloLectura = false }) {
  const [precios, setPrecios] = useState(null);
  const [productos, setProductos] = useState([]);
  const [cartaLocal, setCartaLocal] = useState({});
  const [grupo, setGrupo] = useState("smash");
  const [editando, setEditando] = useState(null); // producto en edición o { nuevo: true }
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const menu = useMemo(() => fusionarCarta(productos), [productos]);
  const categorias = useMemo(() => menu.filter((c) => !c.soloCarta), [menu]);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [pr, pd, aj] = await Promise.all([
        authFetch("/api/precios").then((r) => r.json()),
        authFetch("/api/productos").then((r) => r.json()),
        fetch("/api/ajustes", { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (pr.error) setError(pr.error);
      else if (pd.error) setError(pd.error);
      setPrecios(pr.precios || {});
      setProductos(pd.productos || []);
      setCartaLocal(aj.carta || {});
    } catch (e) {
      setError(e.message);
      setPrecios({});
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const llamar = async (url, opciones, exito) => {
    setError(null);
    setAviso(null);
    try {
      const res = await authFetch(url, opciones);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `Error ${res.status}`);
      if (d.precios) setPrecios(d.precios);
      if (d.productos) setProductos(d.productos);
      if (exito) setAviso(exito);
      return d;
    } catch (e) {
      setError(e.message);
      return null;
    }
  };

  const guardarPrecio = (itemId, variantId, cents, nombre) =>
    llamar("/api/precios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, variantId, cents }),
    }, cents === null ? `${nombre}: precio de la carta restaurado.` : `${nombre}: ${aEuros(cents)} € guardado.`);

  const guardarLocal = async (local, itemId, cambios) => {
    const actual = cartaLocal[local]?.[itemId] || {};
    const cuerpo = { local, itemId, agotado: !!actual.agotado, descuento: actual.descuento || 0, ...cambios };
    const d = await llamar("/api/carta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (d) setCartaLocal((prev) => ({ ...prev, [local]: { ...(prev[local] || {}), [itemId]: { agotado: cuerpo.agotado, descuento: cuerpo.descuento } } }));
  };

  const quitarProducto = async (item) => {
    const delCodigo = !item.nuevo;
    const texto = delCodigo
      ? `¿Quitar "${item.name}" de la carta?\n\nComo viene de la carta base, se ocultará de la web. Podrás recuperarlo desde el botón "Ocultos".`
      : `¿Borrar "${item.name}"? Se creó desde aquí, así que se borra del todo.`;
    if (!window.confirm(texto)) return;
    await llamar(`/api/productos?id=${encodeURIComponent(item.id)}`, { method: "DELETE" }, `"${item.name}" ya no aparece en la carta.`);
  };

  const recuperar = (p) =>
    llamar("/api/productos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, categoria: p.categoria, nombre: p.nombre, variantes: p.variantes }),
    }, `"${p.nombre}" vuelve a la carta.`);

  if (precios === null) return <Cargando />;

  const ocultos = productos.filter((p) => p.oculto);
  const sueltos = GRUPOS_SUELTOS.find((g) => g.id === grupo);
  const categoria = categorias.find((c) => c.id === grupo);

  return (
    <div style={sx("display:flex;flex-direction:column;gap:16px")}>
      {error && <div role="alert" style={sx("padding:13px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.5);background:rgba(255,92,40,.1);font-size:14px;line-height:1.5")}>{error}</div>}
      {aviso && <div style={sx("padding:12px 16px;border-radius:12px;border:1px solid rgb(120 220 130 / .4);background:rgb(120 220 130 / .08);font-size:13.5px")}>{aviso}</div>}

      <div style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:8px")}>
        {[...categorias.map((c) => ({ id: c.id, label: c.label })), ...GRUPOS_SUELTOS.map((g) => ({ id: g.id, label: g.label }))].map((g) => (
          <button key={g.id} onClick={() => setGrupo(g.id)} style={sx(`font-size:13px;font-weight:600;padding:9px 16px;border-radius:100px;cursor:pointer;border:1px solid ${grupo === g.id ? "rgb(var(--acc))" : "rgba(246,241,233,.16)"};background:${grupo === g.id ? "rgb(var(--acc) / .14)" : "transparent"};color:${grupo === g.id ? "rgb(var(--acc))" : "rgba(246,241,233,.75)"}`)}>
            {g.label}
          </button>
        ))}
        {categoria && !soloLectura && (
          <button onClick={() => setEditando({ nuevo: true, categoria: categoria.id })} style={{ ...btnAcc, marginLeft: "auto" }}>+ Nuevo producto</button>
        )}
      </div>

      {categoria && categoria.items.map((item) => (
        <ProductoCard
          key={item.id}
          soloLectura={soloLectura}
          item={item}
          precios={precios}
          cartaLocal={cartaLocal}
          onPrecio={guardarPrecio}
          onLocal={guardarLocal}
          onEditar={() => setEditando({ item })}
          onQuitar={() => quitarProducto(item)}
        />
      ))}

      {sueltos && (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={sx("padding:16px 20px 8px;font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55)")}>{sueltos.label}</div>
          {sueltos.lista.map((x) => (
            <div key={x.id} style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:11px 20px;border-top:1px solid rgba(246,241,233,.09)")}>
              <span style={sx("flex:1;min-width:min(100%,180px);font-size:14px")}>{x.label}</span>
              {soloLectura ? (
                <PrecioFijo cents={precioDe(precios, sueltos.prefijo(x.id), "u", x.cents)} base={x.cents} />
              ) : (
                <PrecioInput
                  itemId={sueltos.prefijo(x.id)}
                  variantId="u"
                  base={x.cents}
                  precios={precios}
                  nombre={x.label}
                  onGuardar={guardarPrecio}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {ocultos.length > 0 && (
        <details style={card}>
          <summary style={sx("cursor:pointer;font-size:13px;color:rgba(246,241,233,.6)")}>Ocultos de la carta ({ocultos.length})</summary>
          <div style={sx("display:flex;flex-direction:column;gap:8px;margin-top:12px")}>
            {ocultos.map((p) => (
              <div key={p.id} style={sx("display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13.5px")}>
                <span style={sx("color:rgba(246,241,233,.7)")}>{p.nombre}</span>
                {!soloLectura && <button onClick={() => recuperar(p)} style={btnGhost}>Recuperar</button>}
              </div>
            ))}
          </div>
        </details>
      )}

      <p style={sx("margin:0;font-size:12px;line-height:1.6;color:rgba(246,241,233,.45)")}>
        {soloLectura
          ? "Modo consulta: ves los precios, ofertas y agotados vigentes, pero los cambios los hace un administrador."
          : "Todo lo que cambies aquí se ve al instante en la web y es lo que cobra el servidor. Los productos de la carta base no se borran: se ocultan, y se recuperan desde arriba."}
      </p>

      {editando && (
        <ProductoModal
          datos={editando}
          categorias={categorias}
          onCerrar={() => setEditando(null)}
          onGuardar={async (cuerpo, mensaje) => {
            const d = await llamar("/api/productos", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(cuerpo),
            }, mensaje);
            if (d) setEditando(null);
          }}
        />
      )}
    </div>
  );
}

// Tarjeta de un producto: precios por variante, disponibilidad y oferta.
// Precio en modo consulta: el vigente, y el de la carta si se cambió.
function PrecioFijo({ cents, base }) {
  return (
    <span style={sx("display:inline-flex;align-items:baseline;gap:8px;font-variant-numeric:tabular-nums")}>
      {cents !== base && <span style={sx("font-size:11px;color:rgb(var(--emb))")}>antes {aEuros(base)} €</span>}
      <strong style={sx("font-size:14px")}>{aEuros(cents)} €</strong>
    </span>
  );
}

function ProductoCard({ item, precios, cartaLocal, onPrecio, onLocal, onEditar, onQuitar, soloLectura = false }) {
  return (
    <div style={card}>
      <div style={sx("display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px;margin-bottom:10px")}>
        <div style={sx("flex:1;min-width:min(100%,220px)")}>
          <span style={sx("font-family:'Anton',sans-serif;font-size:19px;letter-spacing:.02em;text-transform:uppercase")}>{item.name}</span>
          {item.tag && <span style={sx("font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;padding:3px 9px;border-radius:100px;background:rgb(var(--emb) / .16);color:rgb(var(--emb));margin-left:9px")}>{item.tag}</span>}
          {item.nuevo && <span style={sx("font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;padding:3px 9px;border-radius:100px;border:1px solid rgb(120 220 130 / .5);color:rgb(120,220,130);margin-left:9px")}>creado aquí</span>}
          {item.desc && <div style={sx("font-size:12.5px;line-height:1.5;color:rgba(246,241,233,.55);margin-top:4px")}>{item.desc}</div>}
        </div>
        {!soloLectura && (
          <div style={sx("display:flex;gap:8px")}>
            <button onClick={onEditar} style={{ ...btnGhost, padding: "8px 14px" }}>✎ Editar</button>
            <button onClick={onQuitar} style={{ ...btnGhost, padding: "8px 14px", color: "rgb(255,140,110)", borderColor: "rgba(255,92,40,.4)" }}>Quitar</button>
          </div>
        )}
      </div>

      {(item.variants || []).map((v) => (
        <div key={v.id} style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:7px 0;border-top:1px solid rgba(246,241,233,.08)")}>
          <span style={sx("flex:1;min-width:120px;font-size:13.5px;color:rgba(246,241,233,.8)")}>{v.label || "Precio"}</span>
          {soloLectura
            ? <PrecioFijo cents={precioDe(precios, item.id, v.id, v.cents)} base={v.cents} />
            : <PrecioInput itemId={item.id} variantId={v.id} base={v.cents} precios={precios} nombre={item.name} onGuardar={onPrecio} />}
        </div>
      ))}

      <div style={sx("display:flex;flex-wrap:wrap;gap:10px 18px;margin-top:12px;padding-top:11px;border-top:1px dashed rgba(246,241,233,.14)")}>
        {Object.keys(LOCALES).map((id) => {
          const estado = cartaLocal[id]?.[item.id] || {};
          const agotado = !!estado.agotado;
          return (
            <div key={id} style={sx("display:flex;align-items:center;gap:8px")}>
              <span style={{ ...sx("font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em"), color: `rgb(${LOCALES[id].rgb})` }}>{LOCALES[id].name.split(" ")[0]}</span>
              <button
                onClick={() => onLocal(id, item.id, { agotado: !agotado })}
                disabled={soloLectura}
                style={sx(`font-size:11.5px;font-weight:700;padding:7px 12px;border-radius:100px;cursor:${soloLectura ? "default" : "pointer"};border:1px solid ${agotado ? "rgba(255,92,40,.55)" : "rgba(246,241,233,.16)"};background:${agotado ? "rgba(255,92,40,.12)" : "transparent"};color:${agotado ? "rgb(255,140,110)" : "rgba(246,241,233,.55)"}`)}
              >
                {agotado ? "✕ Agotado" : "✓ Disponible"}
              </button>
              {soloLectura
                ? estado.descuento ? <span style={sx("font-size:12.5px;font-weight:700;color:rgb(var(--emb))")}>oferta −{estado.descuento} %</span> : null
                : <DescuentoInput valor={estado.descuento || 0} onGuardar={(descuento) => onLocal(id, item.id, { descuento })} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrecioInput({ itemId, variantId, base, precios, nombre, onGuardar }) {
  const vigente = precioDe(precios, itemId, variantId, base);
  const cambiado = vigente !== base;
  const [txt, setTxt] = useState(aEuros(vigente));
  useEffect(() => { setTxt(aEuros(vigente)); }, [vigente]);

  const cents = aCentimos(txt);
  const sinGuardar = cents !== null && cents !== vigente;

  return (
    <div style={sx("display:flex;align-items:center;gap:8px")}>
      {cambiado && <span style={sx("font-size:11px;color:rgb(var(--emb))")}>antes {aEuros(base)} €</span>}
      <input
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && sinGuardar) onGuardar(itemId, variantId, cents, nombre); }}
        inputMode="decimal"
        aria-label={`Precio de ${nombre}${variantId !== "u" ? " " + variantId : ""}`}
        style={{ ...inputStyle, width: 88, padding: "8px 10px", textAlign: "right", borderColor: cents === null ? "rgba(255,92,40,.6)" : sinGuardar ? "rgb(var(--acc))" : "rgba(246,241,233,.18)" }}
      />
      <span style={sx("font-size:13px;color:rgba(246,241,233,.5)")}>€</span>
      <button
        onClick={() => onGuardar(itemId, variantId, cents, nombre)}
        disabled={!sinGuardar}
        style={{ ...btnAcc, padding: "8px 14px", fontSize: "13px", opacity: sinGuardar ? 1 : 0.35, cursor: sinGuardar ? "pointer" : "default" }}
      >
        Guardar
      </button>
      {cambiado && <button onClick={() => onGuardar(itemId, variantId, null, nombre)} style={{ ...btnGhost, padding: "8px 12px", fontSize: "12px" }}>Volver</button>}
    </div>
  );
}

// Oferta por local: % de descuento sobre el precio del producto.
function DescuentoInput({ valor, onGuardar }) {
  const [txt, setTxt] = useState(String(valor || ""));
  useEffect(() => { setTxt(valor ? String(valor) : ""); }, [valor]);
  const n = Math.min(90, Math.max(0, Math.floor(Number(txt) || 0)));
  const sinGuardar = n !== (valor || 0);
  return (
    <span style={sx("display:inline-flex;align-items:center;gap:6px")}>
      <input
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && sinGuardar) onGuardar(n); }}
        onBlur={() => sinGuardar && onGuardar(n)}
        inputMode="numeric"
        placeholder="0"
        aria-label="Descuento en por ciento"
        title="Oferta: % de descuento en este local"
        style={{ ...inputStyle, width: 54, padding: "8px 8px", textAlign: "right", borderColor: valor ? "rgb(var(--emb))" : "rgba(246,241,233,.18)" }}
      />
      <span style={sx(`font-size:12.5px;color:${valor ? "rgb(var(--emb))" : "rgba(246,241,233,.4)"}`)}>% dto.</span>
    </span>
  );
}

// Alta y edición de un producto.
function ProductoModal({ datos, categorias, onCerrar, onGuardar }) {
  const item = datos.item;
  const nuevo = !!datos.nuevo;
  const delCodigo = item && !item.nuevo;
  const [f, setF] = useState({
    nombre: item?.name || "",
    nombre_en: item?.nameEn || "",
    descripcion: item?.desc || "",
    descripcion_en: item?.descEn || "",
    etiqueta: item?.tag || "",
    categoria: datos.categoria || categorias[0]?.id,
  });
  const [variantes, setVariantes] = useState(
    nuevo ? [{ label: "", precio: "" }] : (item?.variants || []).map((v) => ({ label: v.label, precio: aEuros(v.cents) }))
  );
  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));

  const guardar = () => {
    const cuerpo = {
      ...(item ? { id: item.id } : {}),
      categoria: f.categoria,
      nombre: f.nombre.trim(),
      nombre_en: f.nombre_en.trim() || null,
      descripcion: f.descripcion.trim() || null,
      descripcion_en: f.descripcion_en.trim() || null,
      etiqueta: f.etiqueta.trim() || null,
    };
    if (nuevo) {
      cuerpo.variantes = variantes
        .filter((v) => aCentimos(v.precio) !== null)
        .map((v) => ({ id: v.label ? v.label.toLowerCase() : "u", label: v.label.trim(), cents: aCentimos(v.precio) }));
    }
    onGuardar(cuerpo, nuevo ? `"${cuerpo.nombre}" añadido a la carta.` : `"${cuerpo.nombre}" actualizado.`);
  };

  const campo = (etiqueta, k, opciones = {}) => (
    <div style={sx("margin-bottom:12px")}>
      <span style={labelStyle}>{etiqueta}</span>
      {opciones.area
        ? <textarea value={f[k]} onChange={set(k)} rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
        : <input value={f[k]} onChange={set(k)} style={inputStyle} />}
    </div>
  );

  return (
    <div onClick={onCerrar} style={sx("position:fixed;inset:0;z-index:60;background:rgba(6,4,3,.8);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto")}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: "min(100%,560px)", marginTop: "4vh" }}>
        <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px")}>
          <span style={sx("font-family:'Anton',sans-serif;font-size:20px;text-transform:uppercase")}>{nuevo ? "Nuevo producto" : "Editar producto"}</span>
          <button onClick={onCerrar} style={btnGhost}>✕</button>
        </div>

        {nuevo && (
          <div style={sx("margin-bottom:12px")}>
            <span style={labelStyle}>Categoría</span>
            <select value={f.categoria} onChange={set("categoria")} style={{ ...inputStyle, colorScheme: "dark" }}>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        )}

        {campo("Nombre", "nombre")}
        {campo("Descripción", "descripcion", { area: true })}
        {campo("Etiqueta (opcional: Nuevo, Picante…)", "etiqueta")}

        <details style={sx("margin-bottom:14px")}>
          <summary style={sx("cursor:pointer;font-size:12.5px;color:rgba(246,241,233,.55);margin-bottom:10px")}>Versión en inglés (opcional)</summary>
          {campo("Nombre en inglés", "nombre_en")}
          {campo("Descripción en inglés", "descripcion_en", { area: true })}
          <p style={sx("margin:0 0 4px;font-size:11.5px;line-height:1.5;color:rgba(246,241,233,.45)")}>Si lo dejas vacío, en la web en inglés se ve el texto en español.</p>
        </details>

        {nuevo && (
          <div style={sx("margin-bottom:14px")}>
            <span style={labelStyle}>Precios</span>
            {variantes.map((v, i) => (
              <div key={i} style={sx("display:flex;gap:8px;margin-bottom:8px")}>
                <input
                  value={v.label}
                  onChange={(e) => setVariantes((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  placeholder={variantes.length > 1 ? "Simple / Doble…" : "Sin nombre"}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  value={v.precio}
                  onChange={(e) => setVariantes((prev) => prev.map((x, j) => (j === i ? { ...x, precio: e.target.value } : x)))}
                  placeholder="0,00"
                  inputMode="decimal"
                  style={{ ...inputStyle, width: 100, textAlign: "right" }}
                />
                {variantes.length > 1 && (
                  <button onClick={() => setVariantes((prev) => prev.filter((_, j) => j !== i))} style={{ ...btnGhost, padding: "10px 12px" }}>✕</button>
                )}
              </div>
            ))}
            {variantes.length < 4 && (
              <button onClick={() => setVariantes((prev) => [...prev, { label: "", precio: "" }])} style={{ ...btnGhost, fontSize: "12px", padding: "8px 14px" }}>+ Otra opción</button>
            )}
          </div>
        )}

        {delCodigo && (
          <p style={sx("margin:0 0 14px;font-size:11.5px;line-height:1.5;color:rgba(246,241,233,.45)")}>
            Este producto viene de la carta base: aquí se le cambian los textos. Los precios se editan en su tarjeta.
          </p>
        )}

        <div style={sx("display:flex;gap:10px;justify-content:flex-end")}>
          <button onClick={onCerrar} style={btnGhost}>Cancelar</button>
          <button onClick={guardar} disabled={!f.nombre.trim()} style={{ ...btnAcc, opacity: f.nombre.trim() ? 1 : 0.4 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── Banco ────────────────────────────────────────────────────────────────────
// Liquidaciones y facturas tal como las da la API de MONEI. Por liquidación:
// neto = bruto + comisiones (negativas) + retenido (negativo) + liberado.
// En una liquidación abierta MONEI aún no ha retenido nada y trae en
// reservedAmount, en positivo, la reserva anterior que liberará al cerrarla.
const fechaCorta = (t) => (t ? new Date(t * 1000).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" }) : "—");

const ESTADO_LIQ = {
  COMPLETED: { label: "Transferida", color: "120 220 130" },
  PENDING: { label: "Pendiente", color: "255 197 49" },
  SUSPENDED: { label: "Pendiente", color: "255 197 49" },
  FAILED: { label: "Fallida", color: "255 100 80" },
};

const METODO_LIQ = { card: "Tarjeta", bizum: "Bizum" };

// Importe con signo explícito, para que las columnas se lean como una suma.
const conSigno = (c) => (c ? `${c < 0 ? "−" : "+"} ${fmtEUR(Math.abs(c))}` : "—");

function Banco() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetch("/api/liquidaciones");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `Error ${res.status}`);
      setDatos(d);
    } catch (e) {
      setError(e.message);
      setDatos({ ready: false, settlements: [], invoices: [] });
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  if (datos === null) return <Cargando />;

  const liq = datos.settlements || [];
  const facturas = datos.invoices || [];
  const cerradas = liq.filter((s) => s.status === "COMPLETED");
  const abiertas = liq.filter((s) => s.status === "PENDING" || s.status === "SUSPENDED");
  const suma = (lista, campo) => lista.reduce((a, s) => a + (s[campo] || 0), 0);

  // Liquidaciones cerradas: lo que ya ha pasado por el banco.
  const bruto = suma(cerradas, "grossVolume");
  const comisiones = suma(cerradas, "acquirerFees");
  const retenido = suma(cerradas, "reservedAmount");
  const liberado = suma(cerradas, "releasedAmount");
  const transferido = suma(cerradas, "netVolume");
  // Reserva que sigue en MONEI: la retenida menos la ya liberada. Coincide con
  // la que traen las liquidaciones abiertas.
  const enReserva = -(retenido + liberado);
  const reservaPorMetodo = abiertas.filter((s) => s.reservedAmount > 0);
  const brutoAbierto = suma(abiertas, "grossVolume");
  const facturado = facturas.reduce((a, f) => a + (f.totalAmount || 0), 0);

  // Comprobación contra los pedidos de la web.
  const web = datos.web;
  const webNeto = web ? web.cobrado - web.devuelto : null;
  const brutoMonei = bruto + brutoAbierto;
  const diferencia = webNeto == null ? null : webNeto - brutoMonei;

  const titulo = (t) => <div style={sx("font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55);margin-bottom:10px")}>{t}</div>;
  const fila = (etiqueta, valor, opts = {}) => (
    <div style={{ ...sx("display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:6px 0;font-size:13.5px"), borderTop: opts.linea ? "1px solid rgba(246,241,233,.14)" : "none", fontWeight: opts.fuerte ? 700 : 400, color: opts.fuerte ? "#f6f1e9" : "rgba(246,241,233,.78)" }}>
      <span>
        {etiqueta}
        {opts.nota && <span style={sx("font-size:11.5px;font-weight:400;color:rgba(246,241,233,.42);margin-left:8px")}>{opts.nota}</span>}
      </span>
      <span style={{ ...sx("white-space:nowrap;font-variant-numeric:tabular-nums"), color: opts.color }}>{valor}</span>
    </div>
  );

  const celda = sx("padding:10px 10px;white-space:nowrap;font-variant-numeric:tabular-nums");
  const cabecera = sx("padding:8px 10px;font-weight:600");

  return (
    <div style={sx("display:flex;flex-direction:column;gap:16px")}>
      {error && <div role="alert" style={sx("padding:13px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.5);background:rgba(255,92,40,.1);font-size:14px")}>{error}</div>}

      {!datos.ready && !error && (
        <div style={sx("padding:16px 20px;border-radius:14px;border:1px dashed rgba(246,241,233,.25);font-size:14px;line-height:1.5;color:rgba(246,241,233,.7)")}>
          Sin conexión con MONEI en este entorno (falta la clave). En producción esta pestaña enseña las liquidaciones reales.
        </div>
      )}

      {liq.length > 0 && (
        <div style={sx("display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start")}>
          {/* De lo cobrado al banco */}
          <div style={{ ...card, flex: "1 1 340px" }}>
            {titulo("De MONEI al banco")}
            {fila("Bruto liquidado", fmtEUR(bruto), { nota: `${cerradas.length} liquidaciones` })}
            {fila("Comisiones descontadas", conSigno(comisiones), { color: "rgb(255,140,110)" })}
            {fila("Reserva retenida", conSigno(retenido), { color: "rgb(255,140,110)" })}
            {fila("Reserva liberada", conSigno(liberado), { color: "rgb(140,225,150)" })}
            {fila("Transferido al banco", fmtEUR(transferido), { linea: true, fuerte: true, color: "rgb(var(--acc))" })}
            {fila("Comisiones facturadas", conSigno(-facturado), { nota: "recibo domiciliado aparte", color: "rgb(255,140,110)" })}
            {fila("Neto en cuenta", fmtEUR(transferido - facturado), { linea: true, fuerte: true })}
          </div>

          <div style={{ ...card, flex: "1 1 300px" }}>
            {titulo("Pendiente de recibir")}
            {fila("Reserva retenida ahora", fmtEUR(enReserva), { fuerte: true })}
            {reservaPorMetodo.map((s) => fila(METODO_LIQ[s.payMethod] || s.payMethod, fmtEUR(s.reservedAmount), { nota: `se libera al cerrar la liquidación del ${fechaCorta(s.scheduledAt)}` }))}
            {brutoAbierto > 0 && fila("Cobros aún sin liquidar", fmtEUR(brutoAbierto))}

            <div style={sx("margin-top:16px")}>{titulo("Comprobación")}</div>
            {web ? (
              <>
                {fila("Cobrado en la web", fmtEUR(webNeto), { nota: `${web.cobros} cobros, sin ${fmtEUR(web.devuelto)} devueltos` })}
                {fila("Volumen en MONEI", fmtEUR(brutoMonei))}
                {fila(diferencia === 0 ? "Coinciden" : "Diferencia", diferencia === 0 ? "0,00 €" : conSigno(diferencia), { linea: true, fuerte: true, color: diferencia === 0 ? "rgb(140,225,150)" : "rgb(255,140,110)" })}
              </>
            ) : (
              <p style={sx("margin:0;font-size:12.5px;color:rgba(246,241,233,.5)")}>Sin datos de pedidos para comparar.</p>
            )}
          </div>
        </div>
      )}

      {liq.length > 0 && (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 20px 10px")}>
            <div style={sx("font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55)")}>Liquidaciones</div>
            <button onClick={cargar} title="Actualizar" style={btnGhost}>Actualizar</button>
          </div>
          <div style={sx("overflow-x:auto")}>
            <table style={sx("width:100%;border-collapse:collapse;font-size:13.5px;min-width:760px")}>
              <thead>
                <tr style={sx("text-align:right;color:rgba(246,241,233,.5);font-size:11px;letter-spacing:.1em;text-transform:uppercase")}>
                  <th style={{ ...cabecera, textAlign: "left", paddingLeft: 20 }}>Fecha</th>
                  <th style={{ ...cabecera, textAlign: "left" }}>Periodo</th>
                  <th style={cabecera}>Bruto</th>
                  <th style={cabecera}>Comisiones</th>
                  <th style={cabecera}>Retenido</th>
                  <th style={cabecera}>Liberado</th>
                  <th style={{ ...cabecera, paddingRight: 20 }}>Neto</th>
                </tr>
              </thead>
              <tbody>
                {liq.map((s) => {
                  const e = ESTADO_LIQ[s.status] || { label: s.status, color: "150 160 150" };
                  const abierta = s.status !== "COMPLETED";
                  return (
                    <tr key={s.id} style={sx("border-top:1px solid rgba(246,241,233,.1);text-align:right")}>
                      <td style={{ ...celda, textAlign: "left", paddingLeft: 20 }}>
                        {fechaCorta(s.scheduledAt)}
                        <div style={sx("display:flex;align-items:center;gap:6px;margin-top:3px")}>
                          <span style={{ ...sx("font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:100px"), color: `rgb(${e.color})`, border: `1px solid rgb(${e.color} / .5)` }}>{e.label}</span>
                          <span style={sx("font-size:11px;color:rgba(246,241,233,.45)")}>{METODO_LIQ[s.payMethod] || s.payMethod}</span>
                        </div>
                      </td>
                      <td style={{ ...celda, textAlign: "left", color: "rgba(246,241,233,.6)", fontSize: "12.5px" }}>{fechaCorta(s.periodStartAt)} – {fechaCorta(s.periodEndAt)}</td>
                      <td style={celda}>{fmtEUR(s.grossVolume || 0)}</td>
                      <td style={{ ...celda, color: "rgb(255,140,110)" }}>{conSigno(s.acquirerFees)}</td>
                      <td style={{ ...celda, color: "rgb(255,140,110)" }}>{abierta ? <span style={sx("color:rgba(246,241,233,.4)")}>al cerrar</span> : conSigno(s.reservedAmount)}</td>
                      <td style={{ ...celda, color: "rgb(140,225,150)" }}>
                        {abierta ? (s.reservedAmount ? <>{conSigno(s.reservedAmount)}<div style={sx("font-size:10.5px;color:rgba(246,241,233,.4)")}>al cerrar</div></> : "—") : conSigno(s.releasedAmount)}
                      </td>
                      <td style={{ ...celda, paddingRight: 20, fontFamily: "'Anton',sans-serif", fontSize: "17px", color: abierta ? "rgba(246,241,233,.55)" : "rgb(var(--acc))" }}>
                        {(s.netVolume || 0) < 0 ? conSigno(s.netVolume) : fmtEUR(s.netVolume || 0)}
                        {abierta && <div style={sx("font-family:inherit;font-size:10.5px;letter-spacing:.04em;color:rgba(246,241,233,.4)")}>saldo provisional</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={sx("margin:0;padding:12px 20px 16px;font-size:12px;line-height:1.55;color:rgba(246,241,233,.5)")}>
            Neto = bruto − comisiones − retenido + liberado. MONEI retiene el 10 % de cada liquidación y lo libera en la siguiente del mismo método de pago. En las liquidaciones pendientes el neto es el saldo que muestra MONEI hasta ese momento.
          </p>
        </div>
      )}

      {facturas.length > 0 && (
        <div style={card}>
          {titulo(`Facturas de comisiones · ${fmtEUR(facturado)}`)}
          {facturas.map((f) => (
            <div key={f.number} style={sx("display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:8px 0;border-top:1px solid rgba(246,241,233,.08);font-size:13.5px")}>
              <span>
                {f.number}
                <span style={sx("font-size:11.5px;color:rgba(246,241,233,.45);margin-left:10px")}>{fechaCorta(f.createdAt)}</span>
              </span>
              <strong style={sx("white-space:nowrap;font-variant-numeric:tabular-nums")}>{fmtEUR(f.totalAmount || 0)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Equipo ───────────────────────────────────────────────────────────────────
// Cuentas de acceso: quién entra, con qué rol y a qué local, y desde cuándo.
// Las contraseñas no se pueden ver (Supabase las guarda cifradas): solo se
// pueden poner nuevas.

const ROL_INFO = {
  admin: { label: "Admin", tono: "255 197 49", acceso: "/admin y /cocina, todo", texto: "Todo, incluida la gestión del equipo. Solo para quien mantiene la web." },
  gerencia: { label: "Gerencia", tono: "150 190 255", acceso: "/admin, solo consulta", texto: "Ve ventas, historial, banco, carta y ajustes. No puede cambiar nada ni ver el equipo." },
  empleado: { label: "Empleado", tono: "120 220 130", acceso: "/cocina", texto: "Solo el panel de cocina. Con local asignado, solo ve ese local." },
};

// "hace 3 días", "hoy a las 21:28", "nunca"
function cuando(iso) {
  if (!iso) return "nunca";
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  if (dias < 1 && new Date().toDateString() === d.toDateString()) return `hoy a las ${hora}`;
  if (dias < 2) return `ayer a las ${hora}`;
  if (dias < 30) return `hace ${dias} días`;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
}

const fechaCuenta = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Madrid" }) : "—";

function RolChip({ rol, local }) {
  const info = ROL_INFO[rol] || { label: rol || "Sin rol", tono: "200 192 182" };
  return (
    <span style={{ ...sx("display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:100px;white-space:nowrap"), color: `rgb(${info.tono})`, border: `1px solid rgb(${info.tono} / .5)`, background: `rgb(${info.tono} / .08)` }}>
      {info.label}
      {rol === "empleado" && <span style={sx("font-weight:600;letter-spacing:.03em;opacity:.85")}>· {local ? LOCALES[local]?.name || local : "los dos locales"}</span>}
    </span>
  );
}

// Selector de rol + local, compartido por el alta y la edición.
function RolYLocal({ rol, local, onChange, bloqueado }) {
  return (
    <>
      <div>
        <span style={labelStyle}>Rol</span>
        <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px")}>
          {Object.entries(ROL_INFO).map(([id, info]) => {
            const activo = rol === id;
            return (
              <button
                key={id}
                type="button"
                disabled={bloqueado}
                onClick={() => onChange({ rol: id, local: id === "empleado" ? local : "" })}
                style={{ ...sx("text-align:left;padding:10px 12px;border-radius:12px;cursor:pointer;font-family:inherit;color:#f6f1e9"), opacity: bloqueado && !activo ? 0.4 : 1, cursor: bloqueado ? "not-allowed" : "pointer", border: `1px solid ${activo ? `rgb(${info.tono})` : "rgba(246,241,233,.16)"}`, background: activo ? `rgb(${info.tono} / .12)` : "transparent" }}
              >
                <div style={{ ...sx("font-size:13px;font-weight:800;letter-spacing:.05em;text-transform:uppercase"), color: activo ? `rgb(${info.tono})` : "#f6f1e9" }}>{info.label}</div>
                <div style={sx("font-size:11.5px;line-height:1.4;color:rgba(246,241,233,.55);margin-top:3px")}>{info.texto}</div>
              </button>
            );
          })}
        </div>
        {bloqueado && <div style={sx("font-size:11.5px;color:rgba(246,241,233,.45);margin-top:6px")}>No puedes cambiarte el rol a ti mismo.</div>}
      </div>
      {rol === "empleado" && (
        <div>
          <span style={labelStyle}>Local</span>
          <select value={local} onChange={(e) => onChange({ rol, local: e.target.value })} style={{ ...inputStyle, appearance: "auto" }}>
            <option value="">Los dos locales</option>
            {Object.values(LOCALES).map((o) => <option key={o.id} value={o.id}>Solo {o.name}</option>)}
          </select>
        </div>
      )}
    </>
  );
}

function Equipo({ user }) {
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [form, setForm] = useState({ email: "", nombre: "", password: "", rol: "empleado", local: "" });
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null); // id de la cuenta abierta

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetch("/api/usuarios");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setUsuarios(data.users || []);
    } catch (e) {
      setError(e.message);
      setUsuarios([]);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const llamar = async (opciones, exito) => {
    setError(null); setOk(null);
    try {
      const res = await authFetch("/api/usuarios" + (opciones.query || ""), {
        method: opciones.method,
        headers: { "Content-Type": "application/json" },
        body: opciones.body ? JSON.stringify(opciones.body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setOk(exito);
      await cargar();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const crear = async () => {
    if (form.rol === "admin" && !window.confirm(`¿Crear a ${form.nombre} como ADMINISTRADOR?\n\nTendrá acceso a todo: ventas, precios, devoluciones y gestión del equipo.`)) return;
    setCreando(true);
    const hecho = await llamar(
      { method: "POST", body: { ...form, local: form.local || null } },
      `Cuenta creada para ${form.nombre}. Ya puede entrar con su email y la contraseña que le has puesto.`
    );
    if (hecho) setForm({ email: "", nombre: "", password: "", rol: "empleado", local: "" });
    setCreando(false);
  };

  const guardar = async (u, cambios) => {
    if (cambios.rol === "admin" && u.rol !== "admin" && !window.confirm(`¿Dar a ${u.nombre} el rol de ADMINISTRADOR?\n\nTendrá acceso a todo: ventas, precios, devoluciones y gestión del equipo.`)) return false;
    const hecho = await llamar({ method: "PATCH", body: { id: u.id, ...cambios, local: cambios.local || null } }, `Cambios de ${cambios.nombre || u.nombre} guardados.`);
    if (hecho) setEditando(null);
    return hecho;
  };

  // Cuenta a la que se le está poniendo contraseña (abre el formulario).
  const [cambiandoPass, setCambiandoPass] = useState(null);
  const cambiarPass = (u) => setCambiandoPass(u);
  const guardarPass = async (u, password) => {
    const propia = u.id === user.id;
    const hecho = await llamar(
      { method: "PATCH", body: { id: u.id, password } },
      propia
        ? "Tu contraseña está cambiada. La próxima vez que entres, usa la nueva."
        : `Contraseña de ${u.nombre} cambiada. Díselo por un canal privado.`
    );
    if (hecho) setCambiandoPass(null);
    return hecho;
  };

  const borrar = (u) => {
    if (!window.confirm(`¿Eliminar la cuenta de ${u.nombre} (${u.email})?\n\nDejará de poder entrar al momento. No se puede deshacer.`)) return;
    llamar({ method: "DELETE", query: `?id=${encodeURIComponent(u.id)}` }, `Cuenta de ${u.nombre} eliminada.`);
  };

  if (usuarios === null) return <Cargando />;

  const nAdmins = usuarios.filter((u) => u.rol === "admin").length;
  const nGerencia = usuarios.filter((u) => u.rol === "gerencia").length;
  const nEmpleados = usuarios.filter((u) => u.rol === "empleado").length;
  const resumen = [
    { n: usuarios.length, t: usuarios.length === 1 ? "cuenta" : "cuentas" },
    { n: nAdmins, t: nAdmins === 1 ? "admin" : "admins" },
    ...(nGerencia ? [{ n: nGerencia, t: "gerencia" }] : []),
    { n: nEmpleados, t: nEmpleados === 1 ? "empleado" : "empleados" },
  ];
  const sinCocina = Object.values(LOCALES).filter((l) => !usuarios.some((u) => u.rol === "empleado" && (u.local === l.id || !u.local)));
  const puedeCrear = form.email && form.nombre.trim().length >= 2 && form.password.length >= 8 && !creando;

  return (
    <div style={sx("display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start")}>
      <div style={{ ...card, flex: "2 1 520px", minWidth: 0 }}>
        <div style={sx("display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:14px")}>
          <div style={sx("font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55)")}>Cuentas de acceso</div>
          <div style={sx("font-size:12.5px;color:rgba(246,241,233,.55)")}>
            {resumen.map((r, i) => <span key={i}>{i > 0 && " · "}<strong style={sx("color:#f6f1e9")}>{r.n}</strong> {r.t}</span>)}
          </div>
        </div>
        {error && <div role="alert" style={sx("margin:0 0 12px;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,100,80,.45);background:rgba(255,100,80,.08);font-size:13px;color:rgb(255,150,125)")}>⚠️ {error}</div>}
        {ok && <div style={sx("margin:0 0 12px;padding:10px 14px;border-radius:10px;border:1px solid rgb(120 220 130 / .4);background:rgb(120 220 130 / .07);font-size:13px;color:rgb(140,225,150)")}>✓ {ok}</div>}

        <div style={sx("display:flex;flex-direction:column;gap:10px")}>
          {usuarios.map((u) => (
            <FichaCuenta
              key={u.id}
              u={u}
              esYo={u.id === user.id}
              abierta={editando === u.id}
              onAbrir={() => setEditando(editando === u.id ? null : u.id)}
              onGuardar={(c) => guardar(u, c)}
              onPass={() => cambiarPass(u)}
              onBorrar={() => borrar(u)}
              unicoAdmin={u.rol === "admin" && nAdmins <= 1}
            />
          ))}
          {usuarios.length === 0 && !error && <p style={sx("margin:0;font-size:13px;color:rgba(246,241,233,.45)")}>Todavía no hay cuentas.</p>}
        </div>

        {sinCocina.length > 0 && (
          <p style={sx("margin:14px 0 0;font-size:12px;line-height:1.5;color:rgba(246,241,233,.5)")}>
            ℹ️ {sinCocina.map((l) => l.name).join(" y ")} no {sinCocina.length === 1 ? "tiene" : "tienen"} ninguna cuenta de cocina: hace falta una para su tablet.
          </p>
        )}
      </div>

      <div style={{ ...card, flex: "1 1 320px", minWidth: 0 }}>
        <div style={sx("font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55);margin-bottom:16px")}>Nueva cuenta</div>
        <div style={sx("display:flex;flex-direction:column;gap:12px")}>
          <div><span style={labelStyle}>Nombre</span><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Juan, Cocina Teatinos…" style={inputStyle} /></div>
          <div><span style={labelStyle}>Email (será su usuario)</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" style={inputStyle} /></div>
          <div><span style={labelStyle}>Contraseña (mín. 8 caracteres)</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" style={inputStyle} /></div>
          <RolYLocal rol={form.rol} local={form.local} onChange={(c) => setForm({ ...form, ...c })} />
          <button onClick={crear} disabled={!puedeCrear} style={{ ...btnAcc, opacity: puedeCrear ? 1 : 0.45 }}>
            {creando ? "CREANDO…" : form.rol === "admin" ? "CREAR ADMINISTRADOR" : "CREAR CUENTA"}
          </button>
        </div>

        <div style={sx("margin-top:18px;padding-top:14px;border-top:1px dashed rgba(246,241,233,.14);font-size:11.5px;line-height:1.6;color:rgba(246,241,233,.5)")}>
          <div style={sx("font-weight:700;color:rgba(246,241,233,.7);margin-bottom:4px")}>Bueno saber</div>
          · Entran en <b>/cocina</b> o <b>/admin</b> con su email y contraseña.<br />
          · Para dueños y administración, usa <b>Gerencia</b>: lo ven todo sin poder romper nada.<br />
          · Las contraseñas no se pueden ver ni recuperar: si alguien la olvida, ponle una nueva con 🔑.<br />
          · Cuando alguien deje de trabajar con vosotros, elimina su cuenta ese mismo día.<br />
          · Siempre tiene que quedar al menos un administrador.
        </div>
      </div>

      {cambiandoPass && (
        <ModalPass
          u={cambiandoPass}
          propia={cambiandoPass.id === user.id}
          unicoAdmin={cambiandoPass.rol === "admin" && nAdmins <= 1}
          onCerrar={() => setCambiandoPass(null)}
          onGuardar={(password) => guardarPass(cambiandoPass, password)}
        />
      )}
    </div>
  );
}

// Poner una contraseña nueva. Se escribe DOS veces y sin autocorrección: con el
// prompt() del navegador, una errata (o el móvil poniendo la primera letra en
// mayúscula) dejaba la cuenta con una contraseña que nadie conocía.
function ModalPass({ u, propia, unicoAdmin, onCerrar, onGuardar }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [ver, setVer] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const problema =
    p1.length > 0 && p1.length < 8 ? "Mínimo 8 caracteres."
      : p1 !== p1.trim() ? "No puede empezar ni terminar con un espacio."
      : p2.length > 0 && p1 !== p2 ? "Las dos contraseñas no coinciden."
      : null;
  const valida = p1.length >= 8 && p1 === p1.trim() && p1 === p2;

  const campo = (valor, set, etiqueta, enfocar) => (
    <div>
      <span style={labelStyle}>{etiqueta}</span>
      <input
        type={ver ? "text" : "password"}
        value={valor}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && valida && !guardando) enviar(); }}
        autoFocus={enfocar}
        autoComplete="new-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        style={inputStyle}
      />
    </div>
  );

  const enviar = async () => {
    setGuardando(true);
    await onGuardar(p1);
    setGuardando(false);
  };

  return (
    <div onClick={onCerrar} style={sx("position:fixed;inset:0;z-index:60;background:rgba(6,4,3,.8);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto")}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: "min(100%,440px)", marginTop: "8vh" }}>
        <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px")}>
          <span style={sx("font-family:'Anton',sans-serif;font-size:20px;text-transform:uppercase")}>{propia ? "Tu contraseña" : "Contraseña nueva"}</span>
          <button onClick={onCerrar} style={btnGhost}>✕</button>
        </div>
        <p style={sx("margin:0 0 16px;font-size:13px;color:rgba(246,241,233,.6)")}>{u.nombre} · {u.email}</p>

        {propia && unicoAdmin && (
          <div style={sx("margin-bottom:14px;padding:11px 14px;border-radius:11px;border:1px solid rgb(255 176 46 / .5);background:rgb(255 176 46 / .08);font-size:12.5px;line-height:1.5;color:rgb(255,205,130)")}>
            Eres el único administrador: si la olvidas, nadie puede ponerte otra desde el panel. Guárdala en un gestor de contraseñas antes de cerrar sesión.
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); if (valida && !guardando) enviar(); }} style={sx("display:flex;flex-direction:column;gap:12px")}>
          {/* El navegador asocia la contraseña a este usuario para ofrecer guardarla */}
          <input type="text" name="username" value={u.email} readOnly autoComplete="username" hidden />
          {campo(p1, setP1, "Nueva contraseña (mín. 8 caracteres)", true)}
          {campo(p2, setP2, "Repítela")}
          <label style={sx("display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(246,241,233,.7);cursor:pointer")}>
            <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />
            Mostrar lo que escribo
          </label>
          {problema && <div role="alert" style={sx("font-size:13px;color:rgb(255,140,110)")}>⚠️ {problema}</div>}
          {valida && <div style={sx("font-size:13px;color:rgb(140,225,150)")}>✓ Coinciden</div>}
          <div style={sx("display:flex;gap:10px;justify-content:flex-end;margin-top:4px")}>
            <button type="button" onClick={onCerrar} style={btnGhost}>Cancelar</button>
            <button type="submit" disabled={!valida || guardando} style={{ ...btnAcc, opacity: valida && !guardando ? 1 : 0.4 }}>
              {guardando ? "GUARDANDO…" : "CAMBIAR CONTRASEÑA"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Una cuenta: datos a la vista y, al abrirla, su edición.
function FichaCuenta({ u, esYo, abierta, onAbrir, onGuardar, onPass, onBorrar, unicoAdmin }) {
  const [f, setF] = useState({ nombre: u.nombre, rol: u.rol, local: u.local || "" });
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { if (abierta) setF({ nombre: u.nombre, rol: u.rol, local: u.local || "" }); }, [abierta, u.nombre, u.rol, u.local]);

  const cambiado = f.nombre.trim() !== u.nombre || f.rol !== u.rol || (f.local || "") !== (u.local || "");
  const herramienta = sx("font-size:12.5px;padding:8px 12px;border-radius:9px;border:1px solid rgba(246,241,233,.2);background:transparent;color:#f6f1e9;cursor:pointer;white-space:nowrap");
  const dato = (titulo, valor) => (
    <div style={sx("min-width:0")}>
      <div style={sx("font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:rgba(246,241,233,.4)")}>{titulo}</div>
      <div style={sx("font-size:13px;color:rgba(246,241,233,.85);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{valor}</div>
    </div>
  );

  return (
    <div style={{ ...sx("border-radius:14px;background:#0a0806;overflow:hidden"), border: `1px solid ${abierta ? "rgb(var(--acc) / .55)" : "rgba(246,241,233,.1)"}` }}>
      <div style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:13px 15px")}>
        <div style={{ ...sx("flex:none;display:grid;place-items:center;width:38px;height:38px;border-radius:50%;font-family:'Anton',sans-serif;font-size:16px;color:#0a0806"), background: `rgb(${(ROL_INFO[u.rol] || {}).tono || "200 192 182"})` }}>
          {(u.nombre || u.email || "?").trim().charAt(0).toUpperCase()}
        </div>
        <div style={sx("flex:1;min-width:170px")}>
          <div style={sx("font-weight:700;font-size:14.5px")}>
            {u.nombre} {esYo && <span style={sx("font-size:11px;font-weight:600;color:rgba(246,241,233,.45)")}>(tú)</span>}
          </div>
          <div style={sx("font-size:12.5px;color:rgba(246,241,233,.55)")}>{u.email}</div>
        </div>
        <RolChip rol={u.rol} local={u.local} />
        <div style={sx("display:flex;gap:6px;margin-left:auto")}>
          <button onClick={onAbrir} style={{ ...herramienta, borderColor: abierta ? "rgb(var(--acc) / .6)" : "rgba(246,241,233,.2)" }}>{abierta ? "Cerrar" : "✎ Editar"}</button>
          <button onClick={onPass} title="Poner una contraseña nueva" style={herramienta}>🔑</button>
          {!esYo && <button onClick={onBorrar} disabled={unicoAdmin} title={unicoAdmin ? "Es el único administrador" : "Eliminar cuenta"} style={{ ...herramienta, borderColor: "rgba(255,100,80,.4)", color: "rgb(255,125,100)", opacity: unicoAdmin ? 0.35 : 1, cursor: unicoAdmin ? "not-allowed" : "pointer" }}>🗑</button>}
        </div>
      </div>

      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px 16px;padding:0 15px 13px 67px")}>
        {dato("Acceso", ROL_INFO[u.rol]?.acceso || "—")}
        {dato("Último acceso", cuando(u.ultimoAcceso))}
        {dato("Cuenta creada", fechaCuenta(u.creada))}
      </div>

      {abierta && (
        <div style={sx("display:flex;flex-direction:column;gap:12px;padding:14px 15px 15px;border-top:1px dashed rgba(246,241,233,.14);background:rgba(246,241,233,.02)")}>
          <div><span style={labelStyle}>Nombre</span><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} style={inputStyle} /></div>
          <RolYLocal rol={f.rol} local={f.local} onChange={(c) => setF({ ...f, ...c })} bloqueado={esYo} />
          <div style={sx("display:flex;gap:8px;justify-content:flex-end")}>
            <button onClick={onAbrir} style={btnGhost}>Cancelar</button>
            <button
              onClick={async () => { setGuardando(true); await onGuardar({ nombre: f.nombre.trim(), rol: f.rol, local: f.local }); setGuardando(false); }}
              disabled={!cambiado || guardando || f.nombre.trim().length < 2}
              style={{ ...btnAcc, opacity: cambiado && !guardando && f.nombre.trim().length >= 2 ? 1 : 0.4 }}
            >
              {guardando ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
            </button>
          </div>
          <div style={sx("font-size:11.5px;color:rgba(246,241,233,.45)")}>El email no se puede cambiar: si cambia, crea una cuenta nueva y elimina esta.</div>
        </div>
      )}
    </div>
  );
}

// ── Ajustes ──────────────────────────────────────────────────────────────────
function Ajustes({ soloLectura = false }) {
  const [ajustes, setAjustes] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(null);

  // Sin caché: la respuesta pública lleva stale-while-revalidate y aquí hay que
  // ver el estado real (la cocina también abre y cierra desde su panel).
  useEffect(() => {
    fetch("/api/ajustes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAjustes(d.ajustes || {}))
      .catch(() => setAjustes({}));
  }, []);

  const guardar = async (local, pausado, motivo) => {
    setGuardando(local); setError(null);
    try {
      const res = await authFetch("/api/ajustes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local, pausado, motivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setAjustes(data.ajustes);
    } catch (e) { setError(e.message); }
    setGuardando(null);
  };

  if (ajustes === null) return <Cargando />;

  return (
    <div style={sx("display:flex;flex-direction:column;gap:14px")}>
      {error && <div role="alert" style={sx("padding:13px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.5);background:rgba(255,92,40,.1);font-size:14px")}>⚠️ {error}</div>}
      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px")}>
        {Object.values(LOCALES).map((o) => (
          <AjusteLocal key={o.id} loc={o} ajuste={ajustes[o.id] || { pausado: false, motivo: "" }} guardando={guardando === o.id} onSave={guardar} soloLectura={soloLectura} />
        ))}
      </div>
      <p style={sx("margin:0;font-size:12.5px;line-height:1.6;color:rgba(246,241,233,.5)")}>
        Al pausar un local, la web deja de aceptar pedidos online al instante —tampoco programados— y el cliente ve el motivo y el teléfono.
        La cocina también puede cerrar y reabrir su propio local desde <a href="/cocina" style={sx("color:rgb(var(--acc))")}>su panel</a>, sin pasar por aquí.
        Los horarios normales se editan en <code>src/locales.js</code>.
      </p>
    </div>
  );
}

function AjusteLocal({ loc, ajuste, guardando, onSave, soloLectura = false }) {
  const [pausado, setPausado] = useState(ajuste.pausado);
  const [motivo, setMotivo] = useState(ajuste.motivo || "");
  const cambio = pausado !== ajuste.pausado || motivo !== (ajuste.motivo || "");

  return (
    <div style={{ ...card, borderColor: ajuste.pausado ? "rgba(255,100,80,.5)" : "rgba(246,241,233,.12)" }}>
      <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px")}>
        <span style={{ ...sx("font-family:'Anton',sans-serif;font-size:20px;text-transform:uppercase"), color: `rgb(${loc.rgb})` }}>{loc.name}</span>
        <span style={sx(`font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 12px;border-radius:100px;border:1px solid ${ajuste.pausado ? "rgb(255 100 80 / .6)" : "rgb(120 220 130 / .5)"};color:${ajuste.pausado ? "rgb(255,120,90)" : "rgb(120,220,130)"}`)}>
          {ajuste.pausado ? "⏸ Pausado" : "● Aceptando pedidos"}
        </span>
      </div>

      {ajuste.pausado && ajuste.desde && (
        <p style={sx("margin:-6px 0 12px;font-size:12.5px;color:rgba(246,241,233,.55)")}>Cerrado desde las {horaDe(ajuste.desde)}.</p>
      )}

      {soloLectura ? (
        <p style={sx("margin:0;font-size:13px;line-height:1.5;color:rgba(246,241,233,.6)")}>
          {ajuste.pausado ? (ajuste.motivo ? `Motivo que ve el cliente: «${ajuste.motivo}»` : "Pausado sin motivo.") : "La web acepta pedidos online de este local."}
        </p>
      ) : (
      <>
      <label style={sx("display:flex;align-items:center;gap:10px;font-size:14.5px;cursor:pointer;margin-bottom:12px")}>
        <input type="checkbox" checked={pausado} onChange={(e) => setPausado(e.target.checked)} style={sx("width:18px;height:18px;accent-color:rgb(255,100,80)")} />
        Pausar pedidos online en este local
      </label>

      {pausado && (
        <div style={sx("margin-bottom:12px")}>
          <span style={labelStyle}>Motivo (lo ve el cliente)</span>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value.slice(0, 140))} placeholder="p. ej. cocina saturada, volvemos en un rato" style={inputStyle} />
        </div>
      )}

      <button onClick={() => onSave(loc.id, pausado, motivo)} disabled={!cambio || guardando} style={{ ...btnAcc, opacity: !cambio || guardando ? 0.45 : 1 }}>
        {guardando ? "GUARDANDO…" : "GUARDAR"}
      </button>
      </>
      )}
    </div>
  );
}

function Cargando() {
  return <p style={sx("margin:30px 0;font-size:13.5px;color:rgba(246,241,233,.5)")}>Cargando…</p>;
}
