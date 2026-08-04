import { useCallback, useEffect, useState } from "react";
import { sx } from "../sx";
import { fmtEUR } from "../menu";
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

const RANGOS = [
  { id: "hoy", label: "Hoy" },
  { id: "ayer", label: "Ayer" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
];

function rangoFechas(id) {
  const hoy0 = new Date();
  hoy0.setHours(0, 0, 0, 0);
  const dia = 24 * 3600 * 1000;
  if (id === "hoy") return { desde: hoy0, hasta: new Date() };
  if (id === "ayer") return { desde: new Date(hoy0 - dia), hasta: hoy0 };
  if (id === "30d") return { desde: new Date(Date.now() - 30 * dia), hasta: new Date() };
  return { desde: new Date(Date.now() - 7 * dia), hasta: new Date() };
}

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
  if (sesion.user?.rol !== "admin") {
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
  const [localF, setLocalF] = useState("");
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const { desde, hasta } = rangoFechas(rango);
      const params = new URLSearchParams({ historial: "1", desde: desde.toISOString(), hasta: hasta.toISOString() });
      if (localF) params.set("local", localF);
      const res = await authFetch(`/api/orders?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setOrders(data.orders || []);
    } catch (e) {
      setError(e.message);
      setOrders([]);
      if (/sesión/i.test(e.message)) salir();
    }
  }, [rango, localF, salir]);

  useEffect(() => { setOrders(null); cargar(); }, [cargar]);

  const TABS = [
    { id: "resumen", label: "📊 Resumen" },
    { id: "historial", label: "📋 Historial" },
    { id: "equipo", label: "👥 Equipo" },
    { id: "ajustes", label: "⚙️ Ajustes" },
  ];
  const conFiltros = tab === "resumen" || tab === "historial";

  return (
    <div style={sx("min-height:100vh;padding-bottom:60px")}>
      <header style={sx("position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px clamp(14px,3vw,28px);background:rgba(10,8,6,.94);backdrop-filter:blur(8px);border-bottom:1px solid rgba(246,241,233,.1)")}>
        <div style={sx("display:flex;align-items:center;gap:12px")}>
          <LtbMark size={22} style={{ color: "#f6f1e9" }} />
          <div>
            <div style={sx("font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.06em;line-height:1")}>ADMINISTRACIÓN</div>
            <div style={sx("font-size:11px;color:rgba(246,241,233,.5)")}>{user.nombre}</div>
          </div>
        </div>
        <div style={sx("display:flex;align-items:center;gap:10px")}>
          <a href="/cocina" style={btnGhost}>🍳 Cocina</a>
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

        {error && <div role="alert" style={sx("padding:13px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.5);background:rgba(255,92,40,.1);font-size:14px")}>⚠️ {error}</div>}

        {tab === "resumen" && <Resumen orders={orders} localF={localF} />}
        {tab === "historial" && <Historial orders={orders} />}
        {tab === "equipo" && <Equipo user={user} />}
        {tab === "ajustes" && <Ajustes />}
      </main>
    </div>
  );
}

// ── Resumen ──────────────────────────────────────────────────────────────────
function Resumen({ orders, localF }) {
  if (orders === null) return <Cargando />;

  const validos = orders.filter((o) => o.status !== "rechazado" && o.status !== "no_recogido");
  // Ingresos netos: total cobrado menos lo devuelto (parcial o total).
  const ingresos = validos.reduce((s, o) => s + o.total_cents - (o.reembolsado_cents || 0), 0);
  const devoluciones = orders.reduce((s, o) => s + (o.reembolsado_cents || 0), 0);
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
    eur: validos.filter((o) => o.local === id).reduce((s, o) => s + o.total_cents - (o.reembolsado_cents || 0), 0),
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
        {kpi("Ingresos netos", fmtEUR(ingresos), devoluciones > 0 ? `cobrado online · ${fmtEUR(devoluciones)} devueltos` : "cobrado online por adelantado")}
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

  if (orders === null) return <Cargando />;

  const q = busca.trim().toLowerCase();
  const filtrados = q
    ? orders.filter((o) => o.code.includes(q) || o.nombre.toLowerCase().includes(q) || o.telefono.includes(q))
    : orders;

  const exportCSV = () => {
    const filas = [["Fecha", "Hora", "Nº", "Local", "Cliente", "Teléfono", "Estado", "Total €", "Artículos"]];
    for (const o of filtrados) {
      filas.push([
        fechaDe(o.created_at), horaDe(o.created_at), o.code, LOCALES[o.local]?.name || o.local,
        o.nombre, o.telefono, ESTADO_UI[o.status]?.label || o.status, (o.total_cents / 100).toFixed(2).replace(".", ","),
        (o.items || []).map((it) => `${it.qty}x ${it.name}${it.variant ? ` ${it.variant}` : ""}`).join(" | "),
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
      <div style={sx("display:flex;flex-wrap:wrap;gap:10px;align-items:center")}>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔍 Buscar por nº, nombre o teléfono…" style={{ ...inputStyle, maxWidth: 340 }} />
        <span style={sx("font-size:12.5px;color:rgba(246,241,233,.5)")}>{filtrados.length} pedido{filtrados.length === 1 ? "" : "s"}</span>
        <button onClick={exportCSV} disabled={filtrados.length === 0} style={{ ...btnGhost, marginLeft: "auto", opacity: filtrados.length ? 1 : 0.4 }}>⬇ Exportar CSV</button>
      </div>

      {filtrados.length === 0 && <p style={sx("margin:16px 0;font-size:13.5px;color:rgba(246,241,233,.45)")}>No hay pedidos en este periodo.</p>}

      <div style={sx("display:flex;flex-direction:column;gap:8px")}>
        {filtrados.map((o) => {
          const e = ESTADO_UI[o.status] || ESTADO_UI.nuevo;
          const open = abierto === o.id;
          return (
            <div key={o.id} style={{ ...card, padding: 0, overflow: "hidden" }}>
              <button onClick={() => setAbierto(open ? null : o.id)} style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;width:100%;padding:14px 18px;border:0;background:transparent;color:#f6f1e9;cursor:pointer;text-align:left;font-family:inherit;font-size:14px")}>
                <span style={sx("font-family:'Anton',sans-serif;font-size:20px;color:rgb(var(--acc));min-width:64px")}>#{o.code}</span>
                <span style={sx("font-size:12.5px;color:rgba(246,241,233,.6);min-width:88px")}>{fechaDe(o.created_at)} · {horaDe(o.created_at)}</span>
                <span style={{ ...sx("font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 11px;border-radius:100px"), color: `rgb(${e.color})`, border: `1px solid rgb(${e.color} / .5)`, background: `rgb(${e.color} / .1)` }}>{e.label}</span>
                <span style={{ ...sx("font-size:12px;font-weight:700;text-transform:uppercase"), color: `rgb(${LOCALES[o.local]?.rgb || "255 197 49"})` }}>{LOCALES[o.local]?.name || o.local}</span>
                <span style={sx("flex:1")}>{o.nombre}</span>
                {o.programado_para && <span title={`Programado: ${horaDe(o.programado_para)}`} style={sx("font-size:11px;font-weight:800;padding:3px 9px;border-radius:100px;border:1px solid rgb(180 165 255 / .5);color:rgb(190,178,255)")}>⏰</span>}
                {o.entrega === "domicilio" && <span title="A domicilio" style={sx("font-size:11px;padding:3px 9px;border-radius:100px;border:1px solid rgb(var(--emb) / .5);color:rgb(var(--emb))")}>🛵</span>}
                {o.pago_estado === "pagado" && <span title="Pagado online" style={sx("font-size:11px;font-weight:800;padding:3px 9px;border-radius:100px;border:1px solid rgb(120 220 130 / .5);color:rgb(120,220,130)")}>💳</span>}
                {o.pago_estado === "reembolso_parcial" && <span title={`Devuelto ${fmtEUR(o.reembolsado_cents || 0)}`} style={sx("font-size:11px;font-weight:800;padding:3px 9px;border-radius:100px;border:1px solid rgb(255 180 90 / .5);color:rgb(255,190,110)")}>↩️</span>}
                {o.pago_estado === "reembolsado" && <span title="Reembolsado" style={sx("font-size:11px;font-weight:800;padding:3px 9px;border-radius:100px;border:1px solid rgba(246,241,233,.3);color:rgba(246,241,233,.7)")}>↩️</span>}
                <strong style={sx("font-family:'Anton',sans-serif;font-size:17px")}>{fmtEUR(o.total_cents)}</strong>
                <span style={sx("color:rgba(246,241,233,.4)")}>{open ? "▲" : "▼"}</span>
              </button>
              {open && (
                <div style={sx("padding:0 18px 16px;border-top:1px dashed rgba(246,241,233,.14)")}>
                  <div style={sx("padding-top:12px;font-size:13.5px;color:rgba(246,241,233,.75)")}>
                    📞 <a href={`tel:${o.telefono}`} style={sx("color:#f6f1e9")}>{o.telefono}</a>
                    {o.ready_at && <> · lista ~{horaDe(o.ready_at)}</>}
                  </div>
                  <div style={sx("display:flex;flex-direction:column;gap:6px;margin-top:10px")}>
                    {(o.items || []).map((it, i) => (
                      <div key={i} style={sx("font-size:13.5px;line-height:1.45")}>
                        <strong>{it.qty}×</strong> {it.name}{it.variant ? ` (${it.variant})` : ""} <span style={sx("color:rgba(246,241,233,.5)")}>· {fmtEUR(it.lineCents)}</span>
                        {it.upgrade && <div style={sx("font-size:12px;color:rgba(246,241,233,.6);padding-left:18px")}>+ {it.upgrade}</div>}
                        {it.pan && <div style={sx("font-size:12px;color:rgba(246,241,233,.6);padding-left:18px")}>🍞 {it.pan}</div>}
                        {(it.extras || []).map((x) => <div key={x} style={sx("font-size:12px;color:rgba(246,241,233,.6);padding-left:18px")}>+ {x}</div>)}
                        {it.nota && <div style={sx("font-size:12px;color:rgb(var(--acc));padding-left:18px")}>✎ {it.nota}</div>}
                      </div>
                    ))}
                  </div>
                  {o.nota && <div style={sx("margin-top:10px;font-size:13px;color:rgb(var(--acc))")}>📝 {o.nota}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Equipo ───────────────────────────────────────────────────────────────────
function Equipo({ user }) {
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [form, setForm] = useState({ email: "", nombre: "", password: "", local: "" });
  const [creando, setCreando] = useState(false);

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

  const crear = async () => {
    setCreando(true); setError(null); setOk(null);
    try {
      const res = await authFetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, local: form.local || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setOk(`Cuenta creada para ${data.user.nombre}.`);
      setForm({ email: "", nombre: "", password: "", local: "" });
      cargar();
    } catch (e) { setError(e.message); }
    setCreando(false);
  };

  const borrar = async (u) => {
    if (!window.confirm(`¿Eliminar la cuenta de ${u.nombre} (${u.email})?`)) return;
    setError(null); setOk(null);
    try {
      const res = await authFetch(`/api/usuarios?id=${encodeURIComponent(u.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      cargar();
    } catch (e) { setError(e.message); }
  };

  const cambiarPass = async (u) => {
    const password = window.prompt(`Nueva contraseña para ${u.nombre} (mínimo 8 caracteres):`);
    if (!password) return;
    setError(null); setOk(null);
    try {
      const res = await authFetch("/api/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setOk(`Contraseña de ${u.nombre} actualizada.`);
    } catch (e) { setError(e.message); }
  };

  if (usuarios === null) return <Cargando />;

  return (
    <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px;align-items:start")}>
      <div style={card}>
        <div style={sx("font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55);margin-bottom:16px")}>Cuentas del equipo</div>
        {error && <p role="alert" style={sx("margin:0 0 12px;font-size:13px;color:rgb(255,120,90)")}>⚠️ {error}</p>}
        {ok && <p style={sx("margin:0 0 12px;font-size:13px;color:rgb(120,220,130)")}>✓ {ok}</p>}
        <div style={sx("display:flex;flex-direction:column;gap:10px")}>
          {usuarios.map((u) => (
            <div key={u.id} style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:12px 14px;border-radius:12px;background:#0a0806;border:1px solid rgba(246,241,233,.1)")}>
              <div style={sx("flex:1;min-width:150px")}>
                <div style={sx("font-weight:700;font-size:14px")}>{u.nombre} {u.id === user.id && <span style={sx("font-size:11px;color:rgba(246,241,233,.45)")}>(tú)</span>}</div>
                <div style={sx("font-size:12px;color:rgba(246,241,233,.55)")}>{u.email}</div>
              </div>
              <span style={sx(`font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:100px;border:1px solid ${u.rol === "admin" ? "rgb(var(--acc))" : "rgba(246,241,233,.3)"};color:${u.rol === "admin" ? "rgb(var(--acc))" : "rgba(246,241,233,.7)"}`)}>
                {u.rol === "admin" ? "Admin" : `Empleado${u.local ? ` · ${LOCALES[u.local]?.name || u.local}` : ""}`}
              </span>
              {u.id !== user.id && (
                <span style={sx("display:inline-flex;gap:6px")}>
                  <button onClick={() => cambiarPass(u)} title="Cambiar contraseña" style={sx("font-size:12px;padding:7px 10px;border-radius:9px;border:1px solid rgba(246,241,233,.2);background:transparent;color:#f6f1e9;cursor:pointer")}>🔑</button>
                  {u.rol !== "admin" && <button onClick={() => borrar(u)} title="Eliminar cuenta" style={sx("font-size:12px;padding:7px 10px;border-radius:9px;border:1px solid rgba(255,100,80,.4);background:transparent;color:rgb(255,120,90);cursor:pointer")}>🗑</button>}
                </span>
              )}
            </div>
          ))}
          {usuarios.length === 0 && !error && <p style={sx("margin:0;font-size:13px;color:rgba(246,241,233,.45)")}>Todavía no hay cuentas.</p>}
        </div>
      </div>

      <div style={card}>
        <div style={sx("font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.55);margin-bottom:16px")}>Nuevo empleado</div>
        <div style={sx("display:flex;flex-direction:column;gap:12px")}>
          <div><span style={labelStyle}>Nombre</span><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} /></div>
          <div><span style={labelStyle}>Email (su usuario)</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} /></div>
          <div><span style={labelStyle}>Contraseña (mín. 8)</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" style={inputStyle} /></div>
          <div>
            <span style={labelStyle}>Local (opcional — si se asigna, solo verá ese local)</span>
            <select value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} style={{ ...inputStyle, appearance: "auto" }}>
              <option value="">Ambos locales</option>
              {Object.values(LOCALES).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <button onClick={crear} disabled={creando || !form.email || !form.nombre || form.password.length < 8} style={{ ...btnAcc, opacity: creando || !form.email || !form.nombre || form.password.length < 8 ? 0.45 : 1 }}>
            {creando ? "CREANDO…" : "CREAR CUENTA"}
          </button>
          <p style={sx("margin:0;font-size:11.5px;line-height:1.5;color:rgba(246,241,233,.45)")}>
            Los empleados entran en /cocina con su email y contraseña. Las cuentas de administrador se crean desde el panel de Supabase (ver PEDIDOS.md).
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Ajustes ──────────────────────────────────────────────────────────────────
function Ajustes() {
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
          <AjusteLocal key={o.id} loc={o} ajuste={ajustes[o.id] || { pausado: false, motivo: "" }} guardando={guardando === o.id} onSave={guardar} />
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

function AjusteLocal({ loc, ajuste, guardando, onSave }) {
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
    </div>
  );
}

function Cargando() {
  return <p style={sx("margin:30px 0;font-size:13.5px;color:rgba(246,241,233,.5)")}>Cargando…</p>;
}
