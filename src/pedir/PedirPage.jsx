import { useEffect, useMemo, useRef, useState } from "react";
import { sx } from "../sx";
import { MENU, UPGRADES, EXTRAS, PANES, fmtEUR, priceLine } from "../menu";
import { LOCALES, estadoLocal, horarioTexto } from "../locales";
import LtbMark from "../LtbMark";
import PedirSplash, { debeMostrarSplash } from "./PedirSplash";

// ─────────────────────────────────────────────────────────────────────────────
// /pedir — pedidos online para recoger en el local. Pago al recoger.
// El pedido se envía a /api/orders y aparece en el panel /cocina del local.
// ─────────────────────────────────────────────────────────────────────────────

const LS_LOCAL = "ltb_pedir_local";
const LS_PEDIDO = "ltb_pedido_actual";
const FINALES = ["entregado", "rechazado", "no_recogido"];

const btnPill = (active, rgb) =>
  sx(`font-family:'Anton',sans-serif;font-size:clamp(15px,2vw,19px);letter-spacing:.04em;text-transform:uppercase;padding:12px 26px;border-radius:100px;cursor:pointer;transition:all .25s;border:2px solid ${active ? "transparent" : "rgba(246,241,233,.2)"};background:${active ? `rgb(${rgb})` : "transparent"};color:${active ? "#0a0806" : "#f6f1e9"}`);

const inputStyle = sx("width:100%;padding:13px 16px;border-radius:12px;border:1px solid rgba(246,241,233,.18);background:#0a0806;color:#f6f1e9;font-size:15px;font-family:inherit;outline:none");
const labelStyle = sx("display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,241,233,.6);margin:0 0 6px");

function lineKey(l) {
  return [l.itemId, l.variantId, l.upgradeId || "no", l.panId || "patata", (l.extraIds || []).slice().sort().join(","), l.nota || ""].join("|");
}

function pricedOf(l) {
  return priceLine({ itemId: l.itemId, variantId: l.variantId, upgradeId: l.upgradeId, extraIds: l.extraIds, panId: l.panId, qty: l.qty });
}

export default function PedirPage() {
  const [loc, setLoc] = useState(() => {
    const saved = localStorage.getItem(LS_LOCAL);
    return LOCALES[saved] ? saved : null;
  });
  const [cat, setCat] = useState(MENU[0].id);
  const [cart, setCart] = useState([]);
  const [modalItem, setModalItem] = useState(null); // {catId, item}
  const [drawer, setDrawer] = useState(false);
  const [pedido, setPedido] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_PEDIDO) || "null");
      if (p && Date.now() - p.ts < 3 * 3600 * 1000) return p;
    } catch { /* ignorar */ }
    return null;
  });

  // Enlace universal de seguimiento: /pedir?p=<id>.<code> (el que se comparte
  // por WhatsApp). Si viene en la URL, se carga ese pedido y se guarda aquí.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("p");
    if (!p) return;
    window.history.replaceState(null, "", "/pedir");
    const punto = p.lastIndexOf(".");
    if (punto < 1) return;
    const id = p.slice(0, punto);
    const code = p.slice(punto + 1);
    fetch(`/api/orders?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const seguimiento = { id: data.id, code: data.code, local: data.local, total_cents: data.total_cents, ts: Date.now() };
        localStorage.setItem(LS_PEDIDO, JSON.stringify(seguimiento));
        setPedido(seguimiento);
      })
      .catch(() => {});
  }, []);

  // Splash de entrada (una vez por sesión y solo sobre el menú, no sobre el
  // seguimiento de un pedido ya enviado).
  const [splash, setSplash] = useState(() => debeMostrarSplash());

  const L = loc ? LOCALES[loc] : null;
  const rgb = L ? L.rgb : "255 197 49";

  // El estado abierto/cerrado se recalcula cada minuto por si la página queda abierta.
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setAhora(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);
  const estadoHorario = useMemo(() => (loc ? estadoLocal(loc, ahora) : null), [loc, ahora]);

  // Pausa desde el panel de administración (el "cerrar tienda" de las apps).
  // Se refresca con cada tick de `ahora` para que una pausa/reanudación
  // aparezca sin recargar la página.
  const [ajustes, setAjustes] = useState({});
  useEffect(() => {
    fetch("/api/ajustes")
      .then((r) => (r.ok ? r.json() : { ajustes: {} }))
      .then((d) => setAjustes(d.ajustes || {}))
      .catch(() => {});
  }, [ahora]);

  const pausa = loc ? ajustes[loc] : null;
  const estado = useMemo(() => {
    if (!estadoHorario) return null;
    if (estadoHorario.abierto && pausa?.pausado) {
      return { abierto: false, mensaje: "Pedidos pausados un momento", detalle: pausa.motivo || "La cocina está a tope — llámanos y te atendemos." };
    }
    return estadoHorario;
  }, [estadoHorario, pausa]);

  const totalCents = cart.reduce((s, l) => s + (pricedOf(l)?.lineCents || 0), 0);
  const totalQty = cart.reduce((s, l) => s + l.qty, 0);

  const addLine = (line) => {
    setCart((prev) => {
      const key = lineKey(line);
      const i = prev.findIndex((l) => lineKey(l) === key);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: Math.min(20, next[i].qty + line.qty) };
        return next;
      }
      return [...prev, line];
    });
    setModalItem(null);
  };

  const setQty = (idx, qty) => {
    setCart((prev) =>
      qty <= 0 ? prev.filter((_, i) => i !== idx) : prev.map((l, i) => (i === idx ? { ...l, qty: Math.min(20, qty) } : l))
    );
  };

  useEffect(() => {
    if (loc) localStorage.setItem(LS_LOCAL, loc);
  }, [loc]);

  useEffect(() => {
    document.title = "Pedir online — La Terracita Burger";
  }, []);

  if (pedido) {
    return <Seguimiento pedido={pedido} onNuevo={() => { localStorage.removeItem(LS_PEDIDO); setPedido(null); setCart([]); }} />;
  }


  // Las categorías "solo carta" (p. ej. Extras) no se muestran en /pedir:
  // sus conceptos se eligen dentro de cada producto.
  const CATS_PEDIR = MENU.filter((c) => !c.soloCarta);
  const categoria = CATS_PEDIR.find((c) => c.id === cat) || CATS_PEDIR[0];

  return (
    <div style={sx("min-height:100vh;padding-bottom:110px")}>
      {/* Cortina de entrada — al deslizarse revela la página */}
      {splash && <PedirSplash onDone={() => setSplash(false)} />}

      {/* Barra superior */}
      <nav style={sx("position:fixed;top:0;left:0;right:0;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px clamp(16px,4vw,34px);background:rgba(10,8,6,.88);backdrop-filter:blur(10px);border-bottom:1px solid rgba(246,241,233,.08)")}>
        <a href="/" style={sx("display:inline-flex;align-items:center;gap:10px;color:#f6f1e9;text-decoration:none")}>
          <LtbMark size={22} style={{ color: "#f6f1e9" }} />
          <span style={sx("font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.08em")}>LA TERRACITA</span>
        </a>
        <button onClick={() => totalQty > 0 && setDrawer(true)} aria-label="Ver carrito" style={{ ...sx("display:inline-flex;align-items:center;gap:10px;font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.05em;padding:11px 22px;border-radius:100px;border:0;cursor:pointer;transition:all .25s"), background: totalQty > 0 ? `rgb(${rgb})` : "rgba(246,241,233,.12)", color: totalQty > 0 ? "#0a0806" : "rgba(246,241,233,.55)" }}>
          🛒 {totalQty > 0 ? `${totalQty} · ${fmtEUR(totalCents)}` : "Carrito vacío"}
        </button>
      </nav>

      <main style={sx("max-width:1100px;margin:0 auto;padding:110px 5vw 0")}>
        <div style={sx("font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:var(--acc-lt);margin-bottom:10px;animation:ltb-rise .55s both")}>Pedidos online — recogida en local</div>
        <h1 style={sx("margin:0 0 6px;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(38px,7vw,80px);line-height:.9;text-transform:uppercase;animation:ltb-rise .6s .08s both")}>Pide y <span style={{ ...sx("text-shadow:0 0 30px rgb(var(--acc) / .5)"), color: `rgb(${rgb})` }}>recoge</span></h1>
        <p style={sx("margin:0 0 26px;font-size:15px;line-height:1.55;color:rgba(246,241,233,.62);max-width:560px;animation:ltb-rise .6s .16s both")}>Sin comisiones, directo a nuestra cocina. Pagas al recoger, en efectivo o con tarjeta.</p>

        {/* Selector de local */}
        <div style={sx("display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;animation:ltb-rise .6s .24s both")}>
          {Object.values(LOCALES).map((o) => (
            <button key={o.id} onClick={() => setLoc(o.id)} aria-pressed={loc === o.id} style={btnPill(loc === o.id, o.rgb)}>
              {o.name}
            </button>
          ))}
        </div>

        {!loc && (
          <div style={sx("margin:30px 0;padding:22px;border-radius:16px;border:1px dashed rgba(246,241,233,.25);color:rgba(246,241,233,.72);font-size:15px")}>
            👆 Elige primero el local donde quieres recoger tu pedido.
          </div>
        )}

        {loc && (
          <>
            <div style={{ ...sx("display:flex;flex-wrap:wrap;align-items:center;gap:14px 22px;padding:16px 20px;border-radius:16px;margin-bottom:30px;background:#0d0a07"), border: `1px solid ${estado.abierto ? `rgb(${rgb} / .5)` : "rgba(246,241,233,.15)"}` }}>
              <div style={sx("display:flex;align-items:center;gap:11px;min-width:min(100%,230px)")}>
                <span style={{ ...sx("flex:none;width:12px;height:12px;border-radius:50%"), background: estado.abierto ? `rgb(${rgb})` : "rgba(246,241,233,.3)", boxShadow: estado.abierto ? `0 0 14px rgb(${rgb})` : "none", animation: estado.abierto ? "ltb-pulse 1.6s infinite" : "none" }} />
                <div>
                  <div style={{ ...sx("font-family:'Anton',sans-serif;font-size:19px;letter-spacing:.04em;text-transform:uppercase;line-height:1.1"), color: estado.abierto ? `rgb(${rgb})` : "#f6f1e9" }}>{estado.mensaje}</div>
                  <div style={sx("font-size:13.5px;color:rgba(246,241,233,.75);margin-top:3px")}>{estado.detalle}</div>
                </div>
              </div>
              <div style={sx("font-size:12.5px;line-height:1.6;color:rgba(246,241,233,.55);border-left:1px solid rgba(246,241,233,.14);padding-left:22px")}>
                🕒 Mediodía y noche: <strong style={sx("color:rgba(246,241,233,.85)")}>{horarioTexto()}</strong>
                <br />📅 {L.diasTexto}
              </div>
            </div>

            {/* Categorías */}
            <div style={sx("display:flex;flex-wrap:wrap;gap:10px;margin:0 0 26px")}>
              {CATS_PEDIR.map((c) => {
                const active = c.id === cat;
                return (
                  <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={active} style={sx(`font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.03em;text-transform:uppercase;padding:10px 20px;border-radius:100px;cursor:pointer;transition:all .25s;border:1px solid ${active ? `rgb(${rgb})` : "rgba(246,241,233,.16)"};background:${active ? `rgb(${rgb})` : "transparent"};color:${active ? "#0a0806" : "#f6f1e9"}`)}>
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Productos */}
            {categoria.nota && <p style={sx("margin:-10px 0 18px;font-size:13px;line-height:1.5;color:rgba(246,241,233,.6)")}>{categoria.nota}</p>}
            <div key={cat} style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:14px")}>
              {categoria.items.map((item, i) => {
                const desde = item.orderable === false ? null : Math.min(...item.variants.map((v) => v.cents));
                return (
                  <div key={item.id} style={{ ...sx("position:relative;background:#100c08;border:1px solid rgba(246,241,233,.1);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:8px;animation:ltb-rise .4s both"), animationDelay: `${i * 0.03}s` }}>
                    <div style={sx("display:flex;align-items:flex-start;justify-content:space-between;gap:10px")}>
                      <h3 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:21px;text-transform:uppercase;line-height:1")}>{item.name}</h3>
                      {item.tag && <span style={sx("flex:none;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;padding:4px 9px;border-radius:100px;background:rgb(var(--emb) / .16);color:rgb(var(--emb));border:1px solid rgb(var(--emb) / .35)")}>{item.tag}</span>}
                    </div>
                    <p style={sx("margin:0;font-size:13px;line-height:1.5;color:rgba(246,241,233,.68);flex:1")}>{item.desc}</p>
                    <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px")}>
                      <span style={{ ...sx("font-family:'Anton',sans-serif;font-size:19px"), color: `rgb(${rgb})` }}>
                        {item.orderable === false ? item.priceLabel : (item.variants.length > 1 ? `desde ${fmtEUR(desde)}` : fmtEUR(desde))}
                      </span>
                      {item.orderable === false ? (
                        <a href={`tel:${L.tel}`} style={sx("font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:9px 16px;border-radius:100px;border:1px solid rgba(246,241,233,.25);color:#f6f1e9;text-decoration:none")}>Llámanos</a>
                      ) : item.soloLocal ? (
                        <span style={sx("font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:9px 16px;border-radius:100px;border:1px dashed rgba(246,241,233,.25);color:rgba(246,241,233,.55)")}>Solo en el local</span>
                      ) : (
                        <button onClick={() => setModalItem({ catId: categoria.id, item })} style={{ ...sx("font-family:'Anton',sans-serif;font-size:14px;letter-spacing:.05em;padding:9px 20px;border-radius:100px;border:0;cursor:pointer"), background: `rgb(${rgb})`, color: "#0a0806" }}>
                          Añadir +
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={sx("margin:26px 0 0;font-size:12.5px;color:rgba(246,241,233,.6)")}>Toda modificación en hamburguesas y camperos se cobra como extra. ¿Alergias o dudas? Indícalo en las notas o llámanos: {L.phone}.</p>
          </>
        )}
      </main>

      {/* Barra inferior del carrito (móvil y escritorio) */}
      {totalQty > 0 && !drawer && (
        <div style={sx("position:fixed;left:0;right:0;bottom:0;z-index:40;padding:14px clamp(16px,4vw,34px);background:rgba(10,8,6,.92);backdrop-filter:blur(10px);border-top:1px solid rgba(246,241,233,.1)")}>
          <button onClick={() => setDrawer(true)} style={{ ...sx("display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;max-width:560px;margin:0 auto;font-family:'Anton',sans-serif;font-size:17px;letter-spacing:.05em;padding:16px 26px;border-radius:100px;border:0;cursor:pointer"), background: `rgb(${rgb})`, color: "#0a0806" }}>
            <span>VER PEDIDO ({totalQty})</span>
            <span>{fmtEUR(totalCents)} →</span>
          </button>
        </div>
      )}

      {modalItem && <OpcionesModal {...modalItem} rgb={rgb} onClose={() => setModalItem(null)} onAdd={addLine} />}
      {drawer && <CartDrawer cart={cart} setQty={setQty} loc={loc} rgb={rgb} estado={estado} totalCents={totalCents} onClose={() => setDrawer(false)} onDone={(p) => { setPedido(p); localStorage.setItem(LS_PEDIDO, JSON.stringify(p)); setDrawer(false); }} />}
    </div>
  );
}

// ── Modal de opciones (tamaño, acompañamiento, extras, pan, cantidad, nota) ──
function OpcionesModal({ catId, item, rgb, onClose, onAdd }) {
  const categoria = MENU.find((c) => c.id === catId);
  const [variantId, setVariantId] = useState(item.variants[0].id);
  const [upgradeId, setUpgradeId] = useState("no");
  const [extraIds, setExtraIds] = useState([]);
  const [panId, setPanId] = useState("patata");
  const [qty, setQtyN] = useState(1);
  const [nota, setNota] = useState("");

  const toggleExtra = (id) =>
    setExtraIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 10 ? [...prev, id] : prev));

  const priced = pricedOf({ itemId: item.id, variantId, upgradeId, extraIds, panId, qty });

  const radio = (checked) =>
    sx(`display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-radius:12px;cursor:pointer;font-size:14.5px;border:1px solid ${checked ? `rgb(${rgb})` : "rgba(246,241,233,.15)"};background:${checked ? `rgb(${rgb} / .1)` : "transparent"};color:#f6f1e9`);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Opciones de ${item.name}`} onClick={onClose} style={sx("position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,4,3,.72);backdrop-filter:blur(4px)")}>
      <div onClick={(e) => e.stopPropagation()} style={sx("width:min(560px,100%);max-height:88vh;overflow:auto;background:#120e0a;border:1px solid rgba(246,241,233,.14);border-radius:22px 22px 0 0;padding:26px;animation:ltb-rise .3s both")}>
        <div style={sx("display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:4px")}>
          <h3 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:26px;text-transform:uppercase")}>{item.name}</h3>
          <button onClick={onClose} aria-label="Cerrar" style={sx("width:38px;height:38px;border-radius:50%;border:1px solid rgba(246,241,233,.2);background:transparent;color:#f6f1e9;font-size:17px;cursor:pointer")}>✕</button>
        </div>
        <p style={sx("margin:0 0 18px;font-size:13.5px;line-height:1.5;color:rgba(246,241,233,.68)")}>{item.desc}</p>

        {item.variants.length > 1 && (
          <div style={sx("margin-bottom:18px")}>
            <span style={labelStyle}>Elige</span>
            <div style={sx("display:flex;flex-direction:column;gap:8px")}>
              {item.variants.map((v) => (
                <label key={v.id} style={radio(variantId === v.id)}>
                  <span style={sx("display:inline-flex;align-items:center;gap:10px")}>
                    <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                    {v.label}
                  </span>
                  <strong style={{ color: `rgb(${rgb})` }}>{fmtEUR(v.cents)}</strong>
                </label>
              ))}
            </div>
          </div>
        )}

        {categoria?.upgrades && (
          <div style={sx("margin-bottom:18px")}>
            <span style={labelStyle}>Elige tu acompañamiento</span>
            <div style={sx("display:flex;flex-direction:column;gap:8px")}>
              {UPGRADES.map((u) => (
                <label key={u.id} style={radio(upgradeId === u.id)}>
                  <span style={sx("display:inline-flex;align-items:center;gap:10px")}>
                    <input type="radio" name="upgrade" checked={upgradeId === u.id} onChange={() => setUpgradeId(u.id)} />
                    {u.label}
                  </span>
                  <strong style={{ color: `rgb(${rgb})` }}>{u.cents ? `+${fmtEUR(u.cents)}` : ""}</strong>
                </label>
              ))}
            </div>
          </div>
        )}

        {categoria?.panes && (
          <div style={sx("margin-bottom:18px")}>
            <span style={labelStyle}>Elige tu pan</span>
            <div style={sx("display:flex;flex-direction:column;gap:8px")}>
              {PANES.map((p) => (
                <label key={p.id} style={radio(panId === p.id)}>
                  <span style={sx("display:inline-flex;align-items:center;gap:10px")}>
                    <input type="radio" name="pan" checked={panId === p.id} onChange={() => setPanId(p.id)} />
                    {p.label}
                  </span>
                  <strong style={{ color: `rgb(${rgb})` }}>{p.cents ? `+${fmtEUR(p.cents)}` : ""}</strong>
                </label>
              ))}
            </div>
          </div>
        )}

        {categoria?.extras && (
          <div style={sx("margin-bottom:18px")}>
            <span style={labelStyle}>Extras {extraIds.length > 0 ? `(${extraIds.length})` : "(opcional)"}</span>
            <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,225px),1fr));gap:8px")}>
              {EXTRAS.map((e) => {
                const on = extraIds.includes(e.id);
                return (
                  <label key={e.id} style={{ ...radio(on), padding: "9px 12px", fontSize: "13px" }}>
                    <span style={sx("display:inline-flex;align-items:center;gap:8px")}>
                      <input type="checkbox" checked={on} onChange={() => toggleExtra(e.id)} />
                      {e.label}
                    </span>
                    <strong style={{ color: `rgb(${rgb})`, whiteSpace: "nowrap" }}>+{fmtEUR(e.cents)}</strong>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div style={sx("margin-bottom:18px")}>
          <span style={labelStyle}>Notas (sin cebolla, punto de la carne…)</span>
          <input value={nota} onChange={(e) => setNota(e.target.value.slice(0, 140))} placeholder={item.notaHint || categoria?.notaHint || "Opcional"} style={inputStyle} />
        </div>

        <div style={sx("display:flex;align-items:center;gap:14px")}>
          <div style={sx("display:inline-flex;align-items:center;gap:0;border:1px solid rgba(246,241,233,.2);border-radius:100px;overflow:hidden")}>
            <button onClick={() => setQtyN((q) => Math.max(1, q - 1))} aria-label="Menos" style={sx("width:44px;height:44px;border:0;background:transparent;color:#f6f1e9;font-size:20px;cursor:pointer")}>−</button>
            <span style={sx("min-width:34px;text-align:center;font-family:'Anton',sans-serif;font-size:18px")}>{qty}</span>
            <button onClick={() => setQtyN((q) => Math.min(20, q + 1))} aria-label="Más" style={sx("width:44px;height:44px;border:0;background:transparent;color:#f6f1e9;font-size:20px;cursor:pointer")}>+</button>
          </div>
          <button
            onClick={() => onAdd({ itemId: item.id, variantId, upgradeId, extraIds, panId, qty, nota: nota.trim() })}
            style={{ ...sx("flex:1;font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.05em;padding:15px 20px;border-radius:100px;border:0;cursor:pointer"), background: `rgb(${rgb})`, color: "#0a0806" }}
          >
            AÑADIR · {priced ? fmtEUR(priced.lineCents) : "—"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Carrito + checkout ───────────────────────────────────────────────────────
function CartDrawer({ cart, setQty, loc, rgb, estado, totalCents, onClose, onDone }) {
  const [nombre, setNombre] = useState(localStorage.getItem("ltb_nombre") || "");
  const [telefono, setTelefono] = useState(localStorage.getItem("ltb_telefono") || "");
  const [nota, setNota] = useState("");
  const [web, setWeb] = useState(""); // honeypot antibots — un humano nunca lo ve
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const L = LOCALES[loc];

  const enviar = async () => {
    setError(null);
    if (nombre.trim().length < 2) return setError("Dinos tu nombre para el pedido.");
    if (!/^\+?[\d\s.-]{9,17}$/.test(telefono.trim())) return setError("Escribe un teléfono válido (9 dígitos).");
    setSending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          local: loc,
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          nota: nota.trim(),
          web, // honeypot: siempre vacío en humanos
          lineas: cart.map((l) => ({ itemId: l.itemId, variantId: l.variantId, upgradeId: l.upgradeId, extraIds: l.extraIds, panId: l.panId, qty: l.qty, nota: l.nota })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el pedido.");
      localStorage.setItem("ltb_nombre", nombre.trim());
      localStorage.setItem("ltb_telefono", telefono.trim());
      onDone({ id: data.id, code: data.code, local: loc, total_cents: data.total_cents, ts: Date.now() });
    } catch (e) {
      setError(e.message);
      setSending(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Tu pedido" onClick={onClose} style={sx("position:fixed;inset:0;z-index:60;display:flex;justify-content:flex-end;background:rgba(5,4,3,.72);backdrop-filter:blur(4px)")}>
      <div onClick={(e) => e.stopPropagation()} style={sx("width:min(480px,100%);height:100%;overflow:auto;background:#120e0a;border-left:1px solid rgba(246,241,233,.14);padding:26px;display:flex;flex-direction:column;gap:18px")}>
        <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:12px")}>
          <h3 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:26px;text-transform:uppercase")}>Tu pedido</h3>
          <button onClick={onClose} aria-label="Cerrar" style={sx("width:38px;height:38px;border-radius:50%;border:1px solid rgba(246,241,233,.2);background:transparent;color:#f6f1e9;font-size:17px;cursor:pointer")}>✕</button>
        </div>

        <div style={sx("font-size:13px;color:rgba(246,241,233,.65)")}>
          📍 Recogida en <strong style={{ color: `rgb(${rgb})` }}>{L.name}</strong> — {L.address}<br />💶 Pago al recoger (efectivo o tarjeta)
        </div>

        <div style={sx("display:flex;flex-direction:column;gap:12px")}>
          {cart.map((l, i) => {
            const p = pricedOf(l);
            if (!p) return null;
            return (
              <div key={lineKey(l) + i} style={sx("display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:14px;background:#0a0806;border:1px solid rgba(246,241,233,.1)")}>
                <div style={sx("flex:1;min-width:0")}>
                  <div style={sx("font-weight:700;font-size:14.5px")}>{p.name}{p.variant ? ` · ${p.variant}` : ""}</div>
                  {p.upgrade && <div style={sx("font-size:12.5px;color:rgba(246,241,233,.6)")}>+ {p.upgrade}</div>}
                  {p.pan && <div style={sx("font-size:12.5px;color:rgba(246,241,233,.6)")}>🍞 {p.pan}</div>}
                  {p.extras.map((x) => <div key={x} style={sx("font-size:12.5px;color:rgba(246,241,233,.6)")}>+ {x}</div>)}
                  {l.nota && <div style={sx("font-size:12.5px;color:rgba(246,241,233,.6)")}>✎ {l.nota}</div>}
                  <div style={{ ...sx("font-family:'Anton',sans-serif;font-size:16px;margin-top:4px"), color: `rgb(${rgb})` }}>{fmtEUR(p.lineCents)}</div>
                </div>
                <div style={sx("display:inline-flex;align-items:center;border:1px solid rgba(246,241,233,.18);border-radius:100px")}>
                  <button onClick={() => setQty(i, l.qty - 1)} aria-label="Menos" style={sx("width:34px;height:34px;border:0;background:transparent;color:#f6f1e9;font-size:17px;cursor:pointer")}>−</button>
                  <span style={sx("min-width:26px;text-align:center;font-size:14px;font-weight:700")}>{l.qty}</span>
                  <button onClick={() => setQty(i, l.qty + 1)} aria-label="Más" style={sx("width:34px;height:34px;border:0;background:transparent;color:#f6f1e9;font-size:17px;cursor:pointer")}>+</button>
                </div>
              </div>
            );
          })}
          {cart.length === 0 && <div style={sx("color:rgba(246,241,233,.55);font-size:14px")}>El carrito está vacío.</div>}
        </div>

        <div style={sx("border-top:1px dashed rgba(246,241,233,.18);padding-top:14px;display:flex;justify-content:space-between;font-family:'Anton',sans-serif;font-size:22px")}>
          <span>TOTAL</span>
          <span style={{ color: `rgb(${rgb})` }}>{fmtEUR(totalCents)}</span>
        </div>

        <div>
          <span style={labelStyle}>Tu nombre *</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" style={inputStyle} />
        </div>
        <div>
          <span style={labelStyle}>Teléfono * (te llamamos si hay dudas)</span>
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" autoComplete="tel" style={inputStyle} />
        </div>
        <div>
          <span style={labelStyle}>Notas para el local</span>
          <input value={nota} onChange={(e) => setNota(e.target.value.slice(0, 300))} placeholder="Opcional" style={inputStyle} />
        </div>

        {/* Honeypot: invisible y fuera del orden de tabulación; los bots lo rellenan */}
        <div aria-hidden="true" style={sx("position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden")}>
          <label>
            Deja este campo vacío
            <input type="text" name="web" tabIndex={-1} autoComplete="off" value={web} onChange={(e) => setWeb(e.target.value)} />
          </label>
        </div>

        {!estado?.abierto && (
          <div style={sx("padding:13px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.4);background:rgba(255,92,40,.08);color:#f6f1e9;font-size:14px")}>
            {estado?.mensaje} — {estado?.detalle}. Horario: {horarioTexto()}.
          </div>
        )}
        {error && (
          <div role="alert" style={sx("padding:13px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.5);background:rgba(255,92,40,.1);color:#f6f1e9;font-size:14px")}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={enviar}
          disabled={sending || cart.length === 0 || !estado?.abierto}
          style={{ ...sx("font-family:'Anton',sans-serif;font-size:17px;letter-spacing:.05em;padding:17px 20px;border-radius:100px;border:0;cursor:pointer;transition:opacity .2s"), background: `rgb(${rgb})`, color: "#0a0806", opacity: sending || cart.length === 0 || !estado?.abierto ? 0.45 : 1 }}
        >
          {sending ? "ENVIANDO…" : `ENVIAR PEDIDO · ${fmtEUR(totalCents)}`}
        </button>
        <p style={sx("margin:0;font-size:11.5px;line-height:1.5;color:rgba(246,241,233,.5)")}>
          🤝 Sin pago por adelantado: al enviar el pedido te comprometes a recogerlo. Los pedidos que quedan
          sin recoger bloquean el teléfono para futuros pedidos online.
        </p>
        <p style={sx("margin:0;font-size:11.5px;line-height:1.5;color:rgba(246,241,233,.5)")}>
          Usamos tu nombre y teléfono solo para gestionar este pedido. Más info en <a href="/privacidad" style={sx("color:rgba(246,241,233,.7)")}>privacidad</a>.
        </p>
      </div>
    </div>
  );
}

// ── Seguimiento del pedido enviado ───────────────────────────────────────────
function Seguimiento({ pedido, onNuevo }) {
  const [info, setInfo] = useState(null);
  const [caido, setCaido] = useState(false);
  const timer = useRef(null);
  const L = LOCALES[pedido.local];
  const rgb = L?.rgb || "255 197 49";

  useEffect(() => {
    let vivo = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders?id=${encodeURIComponent(pedido.id)}&code=${encodeURIComponent(pedido.code)}`);
        if (res.ok) {
          const data = await res.json();
          if (!vivo) return;
          setInfo(data);
          setCaido(false);
          if (FINALES.includes(data.status)) return; // dejar de sondear
        } else if (res.status === 404) {
          if (vivo) setCaido(true);
        }
      } catch { if (vivo) setCaido(true); }
      timer.current = setTimeout(tick, 8000);
    };
    tick();
    return () => { vivo = false; clearTimeout(timer.current); };
  }, [pedido.id, pedido.code]);

  const status = info?.status || "nuevo";
  const readyLabel = info?.ready_at
    ? new Date(info.ready_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
    : null;

  const PASOS = {
    nuevo: { emoji: "📨", titulo: "Pedido enviado", texto: "El local lo está revisando. En un momento te confirmamos por aquí." },
    aceptado: { emoji: "🔥", titulo: "¡Confirmado! Ya está en plancha", texto: readyLabel ? `Estará listo sobre las ${readyLabel}.` : "Te avisamos aquí cuando esté listo." },
    lista: { emoji: "✅", titulo: "¡Listo para recoger!", texto: "Pásate por el local, te esperamos." },
    entregado: { emoji: "🍔", titulo: "Entregado", texto: "¡Que aproveche! Nos vemos pronto." },
    rechazado: { emoji: "😔", titulo: "No hemos podido aceptarlo", texto: `Lo sentimos — llámanos al ${L?.phone} y lo resolvemos.` },
    no_recogido: { emoji: "📦", titulo: "Quedó sin recoger", texto: `Este pedido no llegó a recogerse. Si hubo un problema, llámanos al ${L?.phone}.` },
  };
  const paso = PASOS[status] || PASOS.nuevo;

  // Enlace universal de seguimiento — se comparte por WhatsApp para reabrirlo
  // desde cualquier dispositivo aunque se cierre el navegador.
  const urlSeguimiento = `${window.location.origin}/pedir?p=${pedido.id}.${pedido.code}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(`Mi pedido en La Terracita Burger 🍔 nº ${pedido.code} — seguimiento: ${urlSeguimiento}`)}`;

  return (
    <div style={sx("min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 5vw;text-align:center")}>
      <a href="/" style={sx("display:inline-flex;align-items:center;gap:10px;color:#f6f1e9;text-decoration:none;margin-bottom:34px")}>
        <LtbMark size={26} style={{ color: "#f6f1e9" }} />
        <span style={sx("font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.08em")}>LA TERRACITA</span>
      </a>

      <div style={{ ...sx("width:min(560px,100%);border-radius:24px;border:1px solid rgba(246,241,233,.12);background:#0d0a07;padding:clamp(28px,5vw,46px);animation:ltb-rise .5s both;position:relative;overflow:hidden") }}>
        <div style={{ ...sx("position:absolute;top:0;left:0;right:0;height:4px"), background: `rgb(${rgb})` }} />
        <div style={sx("font-size:52px;margin-bottom:8px")}>{paso.emoji}</div>
        <h1 style={sx("margin:0 0 10px;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(28px,5vw,42px);line-height:1;text-transform:uppercase")}>{paso.titulo}</h1>
        <p style={sx("margin:0 0 22px;font-size:15px;line-height:1.55;color:rgba(246,241,233,.7)")}>{paso.texto}</p>

        <div style={sx("display:inline-flex;flex-direction:column;gap:4px;padding:16px 30px;border-radius:16px;border:1px dashed rgba(246,241,233,.25);margin-bottom:16px")}>
          <span style={sx("font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:rgba(246,241,233,.55)")}>Tu número de pedido</span>
          <span style={{ ...sx("font-family:'Anton',sans-serif;font-size:44px;line-height:1"), color: `rgb(${rgb})` }}>{pedido.code}</span>
        </div>

        {!FINALES.includes(status) && (
          <div style={sx("margin-bottom:22px")}>
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              style={sx("display:inline-flex;align-items:center;gap:9px;font-size:14px;font-weight:700;padding:12px 22px;border-radius:100px;background:#25d366;color:#0a0806;text-decoration:none")}
            >
              💬 Guardar seguimiento en WhatsApp
            </a>
            <div style={sx("margin-top:8px;font-size:11.5px;color:rgba(246,241,233,.45)")}>
              Envíatelo a ti mismo y podrás abrir este seguimiento desde donde quieras.
            </div>
          </div>
        )}

        <div style={sx("font-size:14px;line-height:1.6;color:rgba(246,241,233,.7)")}>
          📍 {L?.name} — {L?.address}<br />
          📞 <a href={`tel:${L?.tel}`} style={{ color: `rgb(${rgb})`, textDecoration: "none", fontWeight: 700 }}>{L?.phone}</a>
          {info?.total_cents != null && <><br />💶 Total al recoger: <strong style={sx("color:#f6f1e9")}>{fmtEUR(info.total_cents)}</strong></>}
        </div>

        {caido && <p style={sx("margin:18px 0 0;font-size:12.5px;color:rgba(246,241,233,.5)")}>No podemos actualizar el estado ahora mismo — tu pedido sigue en marcha. Si tienes dudas, llámanos.</p>}
        {!FINALES.includes(status) && !caido && (
          <p style={sx("margin:18px 0 0;font-size:12px;color:rgba(246,241,233,.45)")}>
            <span style={{ ...sx("display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px"), background: `rgb(${rgb})`, animation: "ltb-pulse 1.6s infinite" }} />
            Esta página se actualiza sola — no hace falta recargar.
          </p>
        )}
      </div>

      <button onClick={onNuevo} style={sx("margin-top:26px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;padding:12px 24px;border-radius:100px;border:1px solid rgba(246,241,233,.25);background:transparent;color:#f6f1e9;cursor:pointer")}>
        Hacer otro pedido
      </button>
    </div>
  );
}
