import { useEffect, useMemo, useRef, useState } from "react";
import { sx } from "../sx";
import { MENU, UPGRADES, EXTRAS, PANES, fmtEUR, priceLine, itemName, conDescuento, precioDe, fusionarCarta, cartaDeLocal, ID_EXTRA, ID_PAN, ID_UPGRADE, PROMO, promoDescuento, PEDIDO_MINIMO_CENTS } from "../menu";
import { LOCALES, estadoLocal, estadoReparto, repartoResumen, horarioTexto, franjasProgramables, programadoTexto } from "../locales";
import { useI18n } from "../i18n";
import { menuPedir, tEtiqueta, precioEn, nombreItem } from "../menuI18n";
import LangSwitcher from "../LangSwitcher";
import LtbMark from "../LtbMark";
import PedirSplash, { debeMostrarSplash } from "./PedirSplash";
import { PLATAFORMAS } from "../plataformas";
import { fotoDe } from "../fotosCarta";
import BurbujaFoto, { BotonFoto } from "../BurbujaFoto";
import { useBurbujaFoto } from "../useBurbujaFoto";

// ─────────────────────────────────────────────────────────────────────────────
// /pedir — pedidos online con pago seguro por adelantado. El cliente recoge en
// el local (o recibe a domicilio si está activo). Puede pedir "lo antes posible"
// o programar para más tarde. El pedido se envía a /api/orders y, tras el cobro,
// aparece en el panel /cocina del local.
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

function pricedOf(l, carta, precios, menu) {
  return priceLine({ itemId: l.itemId, variantId: l.variantId, upgradeId: l.upgradeId, extraIds: l.extraIds, panId: l.panId, qty: l.qty, carta, precios, menu });
}

export default function PedirPage() {
  const { t, idioma } = useI18n();
  const fmtP = (c) => (idioma === "en" ? precioEn(fmtEUR(c)) : fmtEUR(c)); // precio en el formato del idioma
  const [loc, setLoc] = useState(() => {
    const deUrl = new URLSearchParams(window.location.search).get("local");
    if (LOCALES[deUrl]) return deUrl;
    let saved = null;
    try { saved = localStorage.getItem(LS_LOCAL); } catch { /* sin almacenamiento */ }
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
  const estadoHorario = useMemo(() => (loc ? estadoLocal(loc, ahora, idioma) : null), [loc, ahora, idioma]);

  // Pausa (el "cerrar tienda" de las apps) y estado de la carta del local
  // (agotados/descuentos desde /cocina). Se refresca con cada tick de `ahora`
  // para que los cambios aparezcan sin recargar la página.
  const [ajustes, setAjustes] = useState({});
  const [cartaEstado, setCartaEstado] = useState({});
  const [precios, setPrecios] = useState({}); // precios cambiados desde /admin
  const [productos, setProductos] = useState([]); // altas y cambios de /admin
  const menuEfectivo = useMemo(() => fusionarCarta(productos), [productos]);
  // Solo los productos que hay en el local elegido.
  const menuLocal = useMemo(() => cartaDeLocal(menuEfectivo, loc), [menuEfectivo, loc]);
  const burbuja = useBurbujaFoto();
  const [pagos, setPagos] = useState(true); // ¿pago online disponible?
  const [programar, setProgramar] = useState(false); // ¿se pueden programar pedidos?
  useEffect(() => {
    fetch("/api/ajustes")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        setAjustes(d.ajustes || {});
        setCartaEstado(d.carta || {});
        setPrecios(d.precios || {});
        setProductos(d.productos || []);
        setPagos(d.pagos !== false);
        setProgramar(!!d.programar);
      })
      .catch(() => {});
  }, [ahora]);
  const carta = loc ? cartaEstado[loc] || {} : {};

  const pausa = loc ? ajustes[loc] : null;
  // Un cierre manual (desde cocina o /admin) manda sobre el horario: mientras
  // dure no se acepta nada, tampoco programado — el servidor lo rechazaría.
  const estado = useMemo(() => {
    if (!estadoHorario) return null;
    if (pausa?.pausado) {
      return { abierto: false, pausado: true, mensaje: t("pedir.pausa"), detalle: pausa.motivo || t("pedir.pausaSub") };
    }
    return estadoHorario;
  }, [estadoHorario, pausa, t]);

  // Reparto propio del local elegido (Teatinos no tiene: solo plataformas).
  const reparto = L?.delivery?.activo ? L.delivery : null;
  // Un local sin pedidos web (Teatinos) no enseña la carta para pedir ni el
  // carrito: enseña el teléfono y las apps.
  const conPedidoWeb = !L || L.pedidosWeb === true;

  // Carta efectiva (la del código + lo editado en /admin): la usan el catálogo,
  // los precios del carrito y la promoción.
  const lineasPrecio = cart.map((l) => pricedOf(l, carta, precios, menuLocal)).filter(Boolean);
  const brutoCents = lineasPrecio.reduce((s, p) => s + p.lineCents, 0);
  const promoCents = promoDescuento(lineasPrecio, menuLocal);
  const totalCents = brutoCents - promoCents;
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
    document.title = idioma === "en" ? "Order online — La Terracita Burger" : "Pedir online — La Terracita Burger";
  }, [idioma]);

  // Las categorías "solo carta" (p. ej. Extras) no se muestran en /pedir:
  // sus conceptos se eligen dentro de cada producto.
  // (Antes del return del seguimiento: un hook después de un return rompe la
  // página al pulsar "Hacer otro pedido".)
  const CATS_PEDIR = useMemo(() => menuPedir(idioma, menuLocal).filter((c) => !c.soloCarta), [idioma, menuLocal]);
  const categoria = CATS_PEDIR.find((c) => c.id === cat) || CATS_PEDIR[0];

  if (pedido) {
    return <Seguimiento pedido={pedido} onNuevo={() => { localStorage.removeItem(LS_PEDIDO); setPedido(null); setCart([]); }} />;
  }

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
        <div style={sx("display:flex;align-items:center;gap:10px")}>
        <LangSwitcher size="sm" />
        {conPedidoWeb && <button onClick={() => totalQty > 0 && setDrawer(true)} aria-label={t("pedir.verCarrito")} style={{ ...sx("display:inline-flex;align-items:center;gap:10px;font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.05em;padding:11px 22px;border-radius:100px;border:0;cursor:pointer;transition:all .25s"), background: totalQty > 0 ? `rgb(${rgb})` : "rgba(246,241,233,.12)", color: totalQty > 0 ? "#0a0806" : "rgba(246,241,233,.55)" }}>
          🛒 {totalQty > 0 ? `${totalQty} · ${fmtP(totalCents)}` : t("pedir.carritoVacio")}
        </button>}
        </div>
      </nav>

      <main style={sx("max-width:1100px;margin:0 auto;padding:110px 5vw 0")}>
        <div style={sx("font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:var(--acc-lt);margin-bottom:10px;animation:ltb-rise .55s both")}>{t(reparto ? "pedir.kickerDom" : "pedir.kicker")}</div>
        <h1 style={sx("margin:0 0 6px;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(38px,7vw,80px);line-height:.9;text-transform:uppercase;animation:ltb-rise .6s .08s both")}>{t("pedir.h1a")} <span style={{ ...sx("text-shadow:0 0 30px rgb(var(--acc) / .5)"), color: `rgb(${rgb})` }}>{t("pedir.h1b")}</span></h1>
        {/* El claim habla del pago online: no vale para un local sin pedidos web. */}
        <p style={{ ...sx("margin:0 0 26px;font-size:15px;line-height:1.55;color:rgba(246,241,233,.62);max-width:560px;animation:ltb-rise .6s .16s both"), visibility: conPedidoWeb ? "visible" : "hidden" }}>{t(reparto ? "pedir.claimDom" : "pedir.claim")}</p>

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
            {t("pedir.eligeLocal")}
          </div>
        )}

        {loc && !conPedidoWeb && <SinPedidoWeb L={L} />}

        {loc && conPedidoWeb && (
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
                {t("pedir.horario")} <strong style={sx("color:rgba(246,241,233,.85)")}>{horarioTexto(idioma)}</strong>
                <br />📅 {t(L.diasKey)}
              </div>
              {reparto && (
                <div style={sx("font-size:12.5px;line-height:1.6;color:rgba(246,241,233,.55);border-left:1px solid rgba(246,241,233,.14);padding-left:22px")}>
                  🛵 <strong style={{ color: `rgb(${rgb})` }}>{t("pedir.repartoTitulo")}</strong>
                  <br />
                  {t("pedir.repartoDetalle", {
                    zona: t("pedir.zonaRadio", { km: reparto.radioKm }),
                    envio: fmtP(reparto.gastosCents),
                    min: fmtP(reparto.minimoCents),
                  })}
                  <br />🕒 {repartoResumen(idioma)}
                </div>
              )}
            </div>

            {PROMO.activa && (
              <div style={{ ...sx("display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:14px 20px;border-radius:16px;margin:0 0 26px;background:rgb(var(--emb) / .1)"), border: "1px solid rgb(var(--emb) / .45)" }}>
                <span style={sx("font-family:'Anton',sans-serif;font-size:17px;letter-spacing:.04em;text-transform:uppercase;color:rgb(var(--emb))")}>
                  🔥 {idioma === "en" ? PROMO.nombreEn : PROMO.nombre}
                </span>
                <span style={sx("font-size:13px;line-height:1.5;color:rgba(246,241,233,.7)")}>{t("pedir.promo.detalle")}</span>
              </div>
            )}

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
                const estadoItem = carta[item.id];
                const agotado = !!estadoItem?.agotado;
                const descuento = estadoItem?.descuento || 0;
                const desdeBase = item.orderable === false ? null : Math.min(...item.variants.map((v) => precioDe(precios, item.id, v.id, v.cents)));
                const desde = desdeBase != null ? conDescuento(desdeBase, descuento) : null;
                const foto = fotoDe(item.id);
                return (
                  <div key={item.id} {...burbuja.fila(item.id, foto, item.name)} style={{ ...sx(`position:relative;background:#100c08;border:1px solid ${descuento && !agotado ? "rgb(var(--emb) / .5)" : "rgba(246,241,233,.1)"};border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:8px;animation:ltb-rise .4s both;transition:transform .25s,border-color .25s`), animationDelay: `${i * 0.03}s`, opacity: agotado ? 0.5 : 1 }}>
                    <div style={sx("display:flex;align-items:flex-start;justify-content:space-between;gap:10px")}>
                      <h3 style={sx(`margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:21px;text-transform:uppercase;line-height:1;${agotado ? "text-decoration:line-through;color:rgba(246,241,233,.6)" : ""}`)}>{item.name}</h3>
                      <span style={sx("flex:none;display:inline-flex;gap:6px")}>
                        {descuento > 0 && !agotado && <span style={sx("font-size:11px;letter-spacing:.08em;font-weight:800;padding:4px 10px;border-radius:100px;background:rgb(var(--emb));color:#0a0806")}>−{descuento}%</span>}
                        {item.tag && <span style={sx("font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;padding:4px 9px;border-radius:100px;background:rgb(var(--emb) / .16);color:rgb(var(--emb));border:1px solid rgb(var(--emb) / .35)")}>{item.tag}</span>}
                        {foto && <BotonFoto {...burbuja.boton(item.id, foto, item.name, t("foto.ver", { name: item.name }))} />}
                      </span>
                    </div>
                    <p style={sx("margin:0;font-size:13px;line-height:1.5;color:rgba(246,241,233,.68);flex:1")}>{item.desc}</p>
                    <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px")}>
                      <span style={{ ...sx("font-family:'Anton',sans-serif;font-size:19px;display:inline-flex;align-items:baseline;gap:8px"), color: `rgb(${rgb})` }}>
                        {item.orderable === false ? item.priceLabel : (
                          <>
                            {descuento > 0 && !agotado && <s style={sx("font-size:14px;color:rgba(246,241,233,.4)")}>{fmtP(desdeBase)}</s>}
                            {item.variants.length > 1 ? t("pedir.desde", { p: fmtP(desde) }) : fmtP(desde)}
                          </>
                        )}
                      </span>
                      {agotado ? (
                        <span style={sx("font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:9px 16px;border-radius:100px;border:1px solid rgba(255,100,80,.5);color:rgb(255,120,90)")}>{t("pedir.agotado")}</span>
                      ) : item.orderable === false ? (
                        <a href={`tel:${L.tel}`} style={sx("font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:9px 16px;border-radius:100px;border:1px solid rgba(246,241,233,.25);color:#f6f1e9;text-decoration:none")}>{t("pedir.llamanos")}</a>
                      ) : item.soloLocal ? (
                        <span style={sx("font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:9px 16px;border-radius:100px;border:1px dashed rgba(246,241,233,.25);color:rgba(246,241,233,.55)")}>{t("pedir.soloLocal")}</span>
                      ) : (
                        <button onClick={() => setModalItem({ catId: categoria.id, item })} style={{ ...sx("font-family:'Anton',sans-serif;font-size:14px;letter-spacing:.05em;padding:9px 20px;border-radius:100px;border:0;cursor:pointer"), background: `rgb(${rgb})`, color: "#0a0806" }}>
                          {t("pedir.anadir")}
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
      {totalQty > 0 && !drawer && conPedidoWeb && (
        <div style={sx("position:fixed;left:0;right:0;bottom:0;z-index:40;padding:14px clamp(16px,4vw,34px);background:rgba(10,8,6,.92);backdrop-filter:blur(10px);border-top:1px solid rgba(246,241,233,.1)")}>
          <button onClick={() => setDrawer(true)} style={{ ...sx("display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;max-width:560px;margin:0 auto;font-family:'Anton',sans-serif;font-size:17px;letter-spacing:.05em;padding:16px 26px;border-radius:100px;border:0;cursor:pointer"), background: `rgb(${rgb})`, color: "#0a0806" }}>
            <span>{t("pedir.verPedido", { n: totalQty })}</span>
            <span>{fmtP(totalCents)} →</span>
          </button>
        </div>
      )}

      {burbuja.abierta && <BurbujaFoto key={burbuja.abierta.clave} {...burbuja.abierta} onCerrar={burbuja.cerrar} />}
      {modalItem && <OpcionesModal {...modalItem} carta={carta} precios={precios} menu={menuLocal} rgb={rgb} onClose={() => setModalItem(null)} onAdd={addLine} />}
      {drawer && conPedidoWeb && <CartDrawer cart={cart} setQty={setQty} loc={loc} carta={carta} precios={precios} menu={menuLocal} rgb={rgb} estado={estado} pagos={pagos} programar={programar} ahora={ahora} totalCents={totalCents} promoCents={promoCents} onClose={() => setDrawer(false)} onDone={(p) => { setPedido(p); localStorage.setItem(LS_PEDIDO, JSON.stringify(p)); setDrawer(false); }} />}
    </div>
  );
}

// ── Local sin pedidos web: teléfono (lo primero) y apps de reparto ───────────
function SinPedidoWeb({ L }) {
  const { t, idioma } = useI18n();
  return (
    <div style={{ ...sx("position:relative;overflow:hidden;margin:16px 0 30px;padding:clamp(22px,4vw,34px);border-radius:20px;background:#0d0a07;animation:ltb-rise .45s both"), border: `1px solid rgb(${L.rgb} / .45)` }}>
      <div style={{ ...sx("position:absolute;top:0;left:0;right:0;height:4px"), background: `rgb(${L.rgb})` }} />
      <h2 style={{ ...sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(26px,4.6vw,40px);line-height:1;text-transform:uppercase"), color: `rgb(${L.rgb})` }}>
        {t("pedir.sinWeb.titulo", { local: L.name })}
      </h2>
      <p style={sx("margin:10px 0 22px;max-width:560px;font-size:14.5px;line-height:1.55;color:rgba(246,241,233,.7)")}>{t("pedir.sinWeb.texto")}</p>

      <a
        href={`tel:${L.tel}`}
        className="ltb-deliv ltb-deliv--tel"
        style={{
          ...sx("display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 20px;padding:20px 24px;border-radius:16px;text-decoration:none;color:#0a0806;font-family:'Anton',sans-serif;letter-spacing:.04em;text-transform:uppercase"),
          background: `rgb(${L.rgb})`,
          ["--brand"]: `rgb(${L.rgb})`,
        }}
      >
        <span style={sx("font-size:20px")}>{t("pedir.sinWeb.llamar")}</span>
        <span style={sx("font-size:clamp(24px,4vw,32px)")}>{L.phone}</span>
      </a>

      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px;margin-top:12px")}>
        {PLATAFORMAS.map((p) => (
          <a
            key={p.key}
            href={L.apps[p.key]}
            target="_blank"
            rel="noreferrer"
            className={`ltb-deliv ${p.cls}`}
            style={{ ...sx("display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:#100c08;border:1px solid rgba(246,241,233,.12);text-decoration:none;color:#f6f1e9"), ["--brand"]: p.brand }}
          >
            <span style={{ ...sx("flex:none;display:grid;place-items:center;width:38px;height:38px;border-radius:11px;font-family:'Anton',sans-serif;font-size:19px;line-height:1"), background: p.brand, color: "#0a0806" }}>{p.name[0]}</span>
            <span style={{ ...sx("font-weight:700;font-size:15px"), color: p.brand }}>{p.name}</span>
          </a>
        ))}
      </div>

      <div style={sx("display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 20px;margin-top:20px;font-size:13px;line-height:1.6;color:rgba(246,241,233,.6)")}>
        <span>{t("pedir.horario")} <strong style={sx("color:rgba(246,241,233,.85)")}>{horarioTexto(idioma)}</strong> · {t(L.diasKey)}</span>
        <a href={`/carta/${L.id}`} style={{ ...sx("font-weight:700;text-decoration:none"), color: `rgb(${L.rgb})` }}>{t("pedir.sinWeb.carta", { local: L.name })} →</a>
      </div>
    </div>
  );
}

// ── Modal de opciones (tamaño, acompañamiento, extras, pan, cantidad, nota) ──
function OpcionesModal({ catId, item, carta, precios, menu, rgb, onClose, onAdd }) {
  const { t, idioma } = useI18n();
  const fmtP = (c) => (idioma === "en" ? precioEn(fmtEUR(c)) : fmtEUR(c)); // precio en el formato del idioma
  const categoria = menuPedir(idioma, menu).find((c) => c.id === catId);
  const descuentoItem = carta?.[item.id]?.descuento || 0;
  const [variantId, setVariantId] = useState(item.variants[0].id);
  const [upgradeId, setUpgradeId] = useState("no");
  const [extraIds, setExtraIds] = useState([]);
  const [panId, setPanId] = useState("patata");
  const [qty, setQtyN] = useState(1);
  const [nota, setNota] = useState("");

  const toggleExtra = (id) =>
    setExtraIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 10 ? [...prev, id] : prev));

  const priced = pricedOf({ itemId: item.id, variantId, upgradeId, extraIds, panId, qty }, carta, precios, menu);

  const radio = (checked) =>
    sx(`display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-radius:12px;cursor:pointer;font-size:14.5px;border:1px solid ${checked ? `rgb(${rgb})` : "rgba(246,241,233,.15)"};background:${checked ? `rgb(${rgb} / .1)` : "transparent"};color:#f6f1e9`);

  return (
    <div role="dialog" aria-modal="true" aria-label={t("pedir.opcionesDe", { name: item.name })} onClick={onClose} style={sx("position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,4,3,.72);backdrop-filter:blur(4px)")}>
      <div onClick={(e) => e.stopPropagation()} style={sx("width:min(560px,100%);max-height:88vh;overflow:auto;background:#120e0a;border:1px solid rgba(246,241,233,.14);border-radius:22px 22px 0 0;padding:26px;animation:ltb-rise .3s both")}>
        <div style={sx("display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:4px")}>
          <h3 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:26px;text-transform:uppercase")}>{item.name}</h3>
          <button onClick={onClose} aria-label={t("pedir.cerrar")} style={sx("width:38px;height:38px;border-radius:50%;border:1px solid rgba(246,241,233,.2);background:transparent;color:#f6f1e9;font-size:17px;cursor:pointer")}>✕</button>
        </div>
        <p style={sx("margin:0 0 18px;font-size:13.5px;line-height:1.5;color:rgba(246,241,233,.68)")}>{item.desc}</p>

        {item.variants.length > 1 && (
          <div style={sx("margin-bottom:18px")}>
            <span style={labelStyle}>{t("pedir.elige")}</span>
            <div style={sx("display:flex;flex-direction:column;gap:8px")}>
              {item.variants.map((v) => (
                <label key={v.id} style={radio(variantId === v.id)}>
                  <span style={sx("display:inline-flex;align-items:center;gap:10px")}>
                    <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                    {tEtiqueta(v.label, idioma)}
                  </span>
                  <strong style={{ ...sx("display:inline-flex;align-items:baseline;gap:7px"), color: `rgb(${rgb})` }}>
                    {descuentoItem > 0 && <s style={sx("font-size:12px;color:rgba(246,241,233,.4)")}>{fmtP(precioDe(precios, item.id, v.id, v.cents))}</s>}
                    {fmtP(conDescuento(precioDe(precios, item.id, v.id, v.cents), descuentoItem))}
                  </strong>
                </label>
              ))}
            </div>
          </div>
        )}

        {categoria?.upgrades && (
          <div style={sx("margin-bottom:18px")}>
            <span style={labelStyle}>{t("pedir.acompanamiento")}</span>
            <div style={sx("display:flex;flex-direction:column;gap:8px")}>
              {UPGRADES.map((u) => (
                <label key={u.id} style={radio(upgradeId === u.id)}>
                  <span style={sx("display:inline-flex;align-items:center;gap:10px")}>
                    <input type="radio" name="upgrade" checked={upgradeId === u.id} onChange={() => setUpgradeId(u.id)} />
                    {tEtiqueta(u.label, idioma)}
                  </span>
                  <strong style={{ color: `rgb(${rgb})` }}>{precioDe(precios, ID_UPGRADE(u.id), "u", u.cents) ? `+${fmtP(precioDe(precios, ID_UPGRADE(u.id), "u", u.cents))}` : ""}</strong>
                </label>
              ))}
            </div>
          </div>
        )}

        {categoria?.panes && (
          <div style={sx("margin-bottom:18px")}>
            <span style={labelStyle}>{t("pedir.pan")}</span>
            <div style={sx("display:flex;flex-direction:column;gap:8px")}>
              {PANES.map((p) => (
                <label key={p.id} style={radio(panId === p.id)}>
                  <span style={sx("display:inline-flex;align-items:center;gap:10px")}>
                    <input type="radio" name="pan" checked={panId === p.id} onChange={() => setPanId(p.id)} />
                    {tEtiqueta(p.label, idioma)}
                  </span>
                  <strong style={{ color: `rgb(${rgb})` }}>{precioDe(precios, ID_PAN(p.id), "u", p.cents) ? `+${fmtP(precioDe(precios, ID_PAN(p.id), "u", p.cents))}` : ""}</strong>
                </label>
              ))}
            </div>
          </div>
        )}

        {categoria?.extras && (
          <div style={sx("margin-bottom:18px")}>
            <span style={labelStyle}>{t("pedir.extras")} {extraIds.length > 0 ? `(${extraIds.length})` : t("pedir.opcionalParen")}</span>
            <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,225px),1fr));gap:8px")}>
              {EXTRAS.map((e) => {
                const on = extraIds.includes(e.id);
                return (
                  <label key={e.id} style={{ ...radio(on), padding: "9px 12px", fontSize: "13px" }}>
                    <span style={sx("display:inline-flex;align-items:center;gap:8px")}>
                      <input type="checkbox" checked={on} onChange={() => toggleExtra(e.id)} />
                      {tEtiqueta(e.label, idioma)}
                    </span>
                    <strong style={{ color: `rgb(${rgb})`, whiteSpace: "nowrap" }}>+{fmtP(precioDe(precios, ID_EXTRA(e.id), "u", e.cents))}</strong>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div style={sx("margin-bottom:18px")}>
          <span style={labelStyle}>{t("pedir.notasItem")}</span>
          <input value={nota} onChange={(e) => setNota(e.target.value.slice(0, 140))} placeholder={item.notaHint || categoria?.notaHint || t("pedir.opcional")} style={inputStyle} />
        </div>

        <div style={sx("display:flex;align-items:center;gap:14px")}>
          <div style={sx("display:inline-flex;align-items:center;gap:0;border:1px solid rgba(246,241,233,.2);border-radius:100px;overflow:hidden")}>
            <button onClick={() => setQtyN((q) => Math.max(1, q - 1))} aria-label={t("pedir.menos")} style={sx("width:44px;height:44px;border:0;background:transparent;color:#f6f1e9;font-size:20px;cursor:pointer")}>−</button>
            <span style={sx("min-width:34px;text-align:center;font-family:'Anton',sans-serif;font-size:18px")}>{qty}</span>
            <button onClick={() => setQtyN((q) => Math.min(20, q + 1))} aria-label={t("pedir.mas")} style={sx("width:44px;height:44px;border:0;background:transparent;color:#f6f1e9;font-size:20px;cursor:pointer")}>+</button>
          </div>
          <button
            onClick={() => onAdd({ itemId: item.id, variantId, upgradeId, extraIds, panId, qty, nota: nota.trim() })}
            style={{ ...sx("flex:1;font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.05em;padding:15px 20px;border-radius:100px;border:0;cursor:pointer"), background: `rgb(${rgb})`, color: "#0a0806" }}
          >
            {t("pedir.anadirPrecio", { p: priced ? fmtP(priced.lineCents) : "—" })}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Carrito + checkout ───────────────────────────────────────────────────────
function CartDrawer({ cart, setQty, loc, carta, precios, menu, rgb, estado, pagos, programar, ahora, totalCents, promoCents, onClose, onDone }) {
  const { t, idioma } = useI18n();
  const fmtP = (c) => (idioma === "en" ? precioEn(fmtEUR(c)) : fmtEUR(c)); // precio en el formato del idioma
  const [nombre, setNombre] = useState(localStorage.getItem("ltb_nombre") || "");
  const [telefono, setTelefono] = useState(localStorage.getItem("ltb_telefono") || "");
  const [nota, setNota] = useState("");
  const [entrega, setEntrega] = useState("recogida"); // "recogida" | "domicilio"
  const [calle, setCalle] = useState(localStorage.getItem("ltb_calle") || "");
  const [piso, setPiso] = useState(localStorage.getItem("ltb_piso") || "");
  const [cuando, setCuando] = useState("asap"); // "asap" | "programado"
  const [slotIso, setSlotIso] = useState("");
  const [web, setWeb] = useState(""); // honeypot antibots — un humano nunca lo ve
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const L = LOCALES[loc];

  // Reparto propio: oculto hasta activar delivery.activo en src/locales.js.
  const deliveryConf = L.delivery?.activo ? L.delivery : null;
  const esDomicilio = entrega === "domicilio" && deliveryConf;
  const envioCents = esDomicilio ? deliveryConf.gastosCents : 0;
  const minimoCents = esDomicilio ? deliveryConf.minimoCents : PEDIDO_MINIMO_CENTS;
  const totalFinal = totalCents + envioCents;
  const faltaMinimo = cart.length > 0 && totalCents < minimoCents;

  // El reparto tiene su propio horario (noches; V-S-D también al mediodía), así
  // que "cerrado" no significa lo mismo según cómo quieras recibir el pedido.
  const reparto = useMemo(() => estadoReparto(loc, ahora, idioma), [loc, ahora, idioma]);
  const sinRepartoAhora = esDomicilio && !reparto.disponible;

  // Programación: franjas disponibles (hoy y mañana), limitadas al horario de
  // reparto si el pedido es a domicilio. Si está cerrado y se puede programar,
  // se fuerza esta opción.
  const franjas = useMemo(
    () => (programar ? franjasProgramables(loc, ahora, idioma, !!esDomicilio) : []),
    [programar, loc, ahora, idioma, esDomicilio]
  );
  const hayFranjas = franjas.some((d) => d.horas.length > 0);
  const cerrado = !estado?.abierto || sinRepartoAhora;
  const pausado = !!estado?.pausado; // cierre manual: ni siquiera se programa
  const debeProgramar = cerrado && !pausado && programar && hayFranjas;
  const modo = pausado ? "asap" : debeProgramar ? "programado" : cuando;
  const programado = modo === "programado";

  // Mantiene una franja válida seleccionada: si no hay ninguna elegida (o la
  // elegida ha caducado con el paso del tiempo), coge la primera disponible.
  useEffect(() => {
    if (!programado) return;
    const existe = franjas.some((d) => d.horas.some((h) => h.iso === slotIso));
    if (!existe) setSlotIso(franjas.find((d) => d.horas.length > 0)?.horas[0]?.iso || "");
  }, [programado, slotIso, franjas]);

  // Día que contiene la franja elegida (para resaltar la pestaña y sus horas).
  const diaSel = franjas.find((d) => d.horas.some((h) => h.iso === slotIso)) || franjas.find((d) => d.horas.length > 0);

  // ¿Se puede enviar? Pago disponible y: abierto (asap) o franja válida elegida.
  const puedeEnviar = pagos && !pausado && (programado ? !!slotIso : !cerrado);

  const enviar = async () => {
    setError(null);
    if (nombre.trim().length < 2) return setError(t("pedir.err.nombre"));
    if (!/^\+?[\d\s.-]{9,17}$/.test(telefono.trim())) return setError(t("pedir.err.telefono"));
    if (esDomicilio && calle.trim().length < 6) return setError(t("pedir.err.direccion"));
    if (programado && !slotIso) return setError(t("pedir.err.hora"));
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
          entrega: esDomicilio ? "domicilio" : "recogida",
          direccion: esDomicilio ? calle.trim() : undefined,
          piso: esDomicilio ? piso.trim() : undefined,
          programado_para: programado ? slotIso : undefined,
          web, // honeypot: siempre vacío en humanos
          lineas: cart.map((l) => ({ itemId: l.itemId, variantId: l.variantId, upgradeId: l.upgradeId, extraIds: l.extraIds, panId: l.panId, qty: l.qty, nota: l.nota })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pedir.err.generico"));
      localStorage.setItem("ltb_nombre", nombre.trim());
      localStorage.setItem("ltb_telefono", telefono.trim());
      if (esDomicilio) { localStorage.setItem("ltb_calle", calle.trim()); localStorage.setItem("ltb_piso", piso.trim()); }
      const seguimiento = { id: data.id, code: data.code, local: loc, total_cents: data.total_cents, ts: Date.now() };
      if (data.pago?.redirectUrl) {
        // Pago online: guardamos el seguimiento y saltamos a la pasarela.
        localStorage.setItem(LS_PEDIDO, JSON.stringify(seguimiento));
        window.location.href = data.pago.redirectUrl;
        return;
      }
      onDone(seguimiento);
    } catch (e) {
      setError(e.message);
      setSending(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={t("pedir.tuPedido")} onClick={onClose} style={sx("position:fixed;inset:0;z-index:60;display:flex;justify-content:flex-end;background:rgba(5,4,3,.72);backdrop-filter:blur(4px)")}>
      <div onClick={(e) => e.stopPropagation()} style={sx("width:min(480px,100%);height:100%;overflow:auto;background:#120e0a;border-left:1px solid rgba(246,241,233,.14);padding:26px;display:flex;flex-direction:column;gap:18px")}>
        <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:12px")}>
          <h3 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:26px;text-transform:uppercase")}>{t("pedir.tuPedido")}</h3>
          <button onClick={onClose} aria-label={t("pedir.cerrar")} style={sx("width:38px;height:38px;border-radius:50%;border:1px solid rgba(246,241,233,.2);background:transparent;color:#f6f1e9;font-size:17px;cursor:pointer")}>✕</button>
        </div>

        {deliveryConf && (
          <div style={sx("display:flex;gap:8px")}>
            {[{ id: "recogida", label: t("pedir.recogida") }, { id: "domicilio", label: t("pedir.domicilio") }].map((m) => (
              <button key={m.id} onClick={() => setEntrega(m.id)} style={sx(`flex:1;font-family:'Anton',sans-serif;font-size:14px;letter-spacing:.03em;padding:12px 10px;border-radius:100px;cursor:pointer;border:1px solid ${entrega === m.id ? `rgb(${rgb})` : "rgba(246,241,233,.18)"};background:${entrega === m.id ? `rgb(${rgb})` : "transparent"};color:${entrega === m.id ? "#0a0806" : "#f6f1e9"}`)}>
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div style={sx("font-size:13px;color:rgba(246,241,233,.65)")}>
          {esDomicilio ? (
            <>{t("pedir.entregaZona")} <strong style={{ color: `rgb(${rgb})` }}>{t("pedir.zonaRadio", { km: deliveryConf.radioKm })}</strong><br />{t("pedir.gastosEnvio")} {fmtP(deliveryConf.gastosCents)} · {t("pedir.minimoDom", { min: fmtP(deliveryConf.minimoCents) })}<br />🕒 {repartoResumen(idioma)}</>
          ) : (
            <>{t("pedir.recogidaEn")} <strong style={{ color: `rgb(${rgb})` }}>{L.name}</strong> — {L.address}<br />{t("pedir.pagoSeguroLinea")}</>
          )}
        </div>

        {esDomicilio && (
          <div style={sx("display:flex;flex-direction:column;gap:10px")}>
            <div>
              <span style={labelStyle}>{t("pedir.calle")}</span>
              <input value={calle} onChange={(e) => setCalle(e.target.value.slice(0, 160))} placeholder="Av. del Mediterráneo 139" autoComplete="street-address" style={inputStyle} />
            </div>
            <div>
              <span style={labelStyle}>{t("pedir.piso")}</span>
              <input value={piso} onChange={(e) => setPiso(e.target.value.slice(0, 60))} placeholder="3ºB, portal 2…" style={inputStyle} />
            </div>
          </div>
        )}

        {/* ¿Cuándo? Lo antes posible o programado (pestañas de día + chips de hora).
            Con el local cerrado a mano no se ofrece: no se acepta nada. */}
        {programar && hayFranjas && !pausado && (
          <div style={sx("border:1px solid rgba(246,241,233,.14);border-radius:16px;padding:16px;background:#0d0a07")}>
            <span style={labelStyle}>{t("pedir.cuando")}</span>
            {!debeProgramar ? (
              <div style={sx("display:flex;gap:8px")}>
                {[{ id: "asap", label: t("pedir.asap") }, { id: "programado", label: t("pedir.programar") }].map((m) => (
                  <button key={m.id} onClick={() => setCuando(m.id)} disabled={m.id === "asap" && cerrado} style={sx(`flex:1;font-family:'Anton',sans-serif;font-size:14px;letter-spacing:.03em;padding:13px 8px;border-radius:12px;cursor:pointer;transition:all .2s;border:1px solid ${modo === m.id ? `rgb(${rgb})` : "rgba(246,241,233,.18)"};background:${modo === m.id ? `rgb(${rgb})` : "transparent"};color:${modo === m.id ? "#0a0806" : "#f6f1e9"};opacity:${m.id === "asap" && cerrado ? 0.4 : 1}`)}>
                    {m.label}
                  </button>
                ))}
              </div>
            ) : (
              <p style={sx("margin:0 0 4px;font-size:13px;line-height:1.5;color:rgba(246,241,233,.7)")}>{t("pedir.cerradoProgramar")}</p>
            )}

            {programado && diaSel && (
              <div style={sx("margin-top:14px")}>
                {/* Pestañas de día (Hoy / Mañana) */}
                {franjas.filter((d) => d.horas.length > 0).length > 1 && (
                  <div style={sx("display:flex;gap:8px;margin-bottom:12px")}>
                    {franjas.filter((d) => d.horas.length > 0).map((d) => {
                      const activo = d.off === diaSel.off;
                      return (
                        <button key={d.off} onClick={() => setSlotIso(d.horas[0].iso)} style={sx(`flex:1;font-size:13px;font-weight:700;letter-spacing:.02em;padding:10px 8px;border-radius:10px;cursor:pointer;transition:all .2s;border:1px solid ${activo ? `rgb(${rgb})` : "rgba(246,241,233,.16)"};background:${activo ? `rgb(${rgb} / .14)` : "transparent"};color:${activo ? `rgb(${rgb})` : "rgba(246,241,233,.7)"}`)}>
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Chips de hora del día seleccionado */}
                <div style={sx("display:flex;flex-wrap:wrap;gap:8px;max-height:168px;overflow:auto")}>
                  {diaSel.horas.map((h) => {
                    const activo = h.iso === slotIso;
                    return (
                      <button key={h.iso} onClick={() => setSlotIso(h.iso)} style={sx(`font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.02em;padding:9px 16px;border-radius:100px;cursor:pointer;transition:all .15s;border:1px solid ${activo ? "transparent" : "rgba(246,241,233,.18)"};background:${activo ? `rgb(${rgb})` : "transparent"};color:${activo ? "#0a0806" : "#f6f1e9"};box-shadow:${activo ? `0 6px 18px -6px rgb(${rgb})` : "none"}`)}>
                        {h.hm}
                      </button>
                    );
                  })}
                </div>
                {slotIso && (
                  <p style={sx("margin:12px 0 0;font-size:13.5px;color:rgba(246,241,233,.75)")}>{t("pedir.listoA")} <strong style={{ color: `rgb(${rgb})` }}>{programadoTexto(slotIso, ahora, idioma)}</strong></p>
                )}
              </div>
            )}
          </div>
        )}

        <div style={sx("display:flex;flex-direction:column;gap:12px")}>
          {cart.map((l, i) => {
            const p = pricedOf(l, carta, precios, menu);
            if (!p) {
              // El producto se ha agotado (o dejó de ser válido) con el carrito ya hecho.
              return (
                <div key={lineKey(l) + i} style={sx("display:flex;align-items:center;gap:12px;padding:14px;border-radius:14px;background:#0a0806;border:1px solid rgba(255,100,80,.4)")}>
                  <div style={sx("flex:1;font-size:13.5px;color:rgba(246,241,233,.7)")}>
                    <s>{nombreItem(l.itemId, idioma, itemName(l.itemId))}</s> {t("pedir.agotadoQuitar")}
                  </div>
                  <button onClick={() => setQty(i, 0)} style={sx("font-size:12px;font-weight:700;padding:8px 14px;border-radius:100px;border:1px solid rgba(255,100,80,.5);background:transparent;color:rgb(255,120,90);cursor:pointer")}>{t("pedir.quitar")}</button>
                </div>
              );
            }
            return (
              <div key={lineKey(l) + i} style={sx("display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:14px;background:#0a0806;border:1px solid rgba(246,241,233,.1)")}>
                <div style={sx("flex:1;min-width:0")}>
                  <div style={sx("font-weight:700;font-size:14.5px")}>{nombreItem(l.itemId, idioma, p.name)}{p.variant ? ` · ${tEtiqueta(p.variant, idioma)}` : ""}</div>
                  {p.upgrade && <div style={sx("font-size:12.5px;color:rgba(246,241,233,.6)")}>+ {tEtiqueta(p.upgrade, idioma)}</div>}
                  {p.pan && <div style={sx("font-size:12.5px;color:rgba(246,241,233,.6)")}>🍞 {tEtiqueta(p.pan, idioma)}</div>}
                  {p.extras.map((x) => <div key={x} style={sx("font-size:12.5px;color:rgba(246,241,233,.6)")}>+ {tEtiqueta(x, idioma)}</div>)}
                  {p.descuento && <div style={sx("font-size:12.5px;font-weight:700;color:rgb(var(--emb))")}>🏷 −{p.descuento}% aplicado</div>}
                  {l.nota && <div style={sx("font-size:12.5px;color:rgba(246,241,233,.6)")}>✎ {l.nota}</div>}
                  <div style={{ ...sx("font-family:'Anton',sans-serif;font-size:16px;margin-top:4px"), color: `rgb(${rgb})` }}>{fmtP(p.lineCents)}</div>
                </div>
                <div style={sx("display:inline-flex;align-items:center;border:1px solid rgba(246,241,233,.18);border-radius:100px")}>
                  <button onClick={() => setQty(i, l.qty - 1)} aria-label={t("pedir.menos")} style={sx("width:34px;height:34px;border:0;background:transparent;color:#f6f1e9;font-size:17px;cursor:pointer")}>−</button>
                  <span style={sx("min-width:26px;text-align:center;font-size:14px;font-weight:700")}>{l.qty}</span>
                  <button onClick={() => setQty(i, l.qty + 1)} aria-label={t("pedir.mas")} style={sx("width:34px;height:34px;border:0;background:transparent;color:#f6f1e9;font-size:17px;cursor:pointer")}>+</button>
                </div>
              </div>
            );
          })}
          {cart.length === 0 && <div style={sx("color:rgba(246,241,233,.55);font-size:14px")}>{t("pedir.vacio")}</div>}
        </div>

        <div style={sx("border-top:1px dashed rgba(246,241,233,.18);padding-top:14px;display:flex;flex-direction:column;gap:6px")}>
          {promoCents > 0 && (
            <div style={sx("display:flex;justify-content:space-between;gap:12px;font-size:14px;color:rgb(var(--emb))")}>
              <span>🔥 {idioma === "en" ? PROMO.cortoEn : PROMO.corto}</span>
              <span style={sx("white-space:nowrap")}>− {fmtP(promoCents)}</span>
            </div>
          )}
          {envioCents > 0 && (
            <div style={sx("display:flex;justify-content:space-between;font-size:14px;color:rgba(246,241,233,.72)")}>
              <span>{t("pedir.envio")}</span><span>{fmtP(envioCents)}</span>
            </div>
          )}
          <div style={sx("display:flex;justify-content:space-between;font-family:'Anton',sans-serif;font-size:22px")}>
            <span>{t("pedir.total")}</span>
            <span style={{ color: `rgb(${rgb})` }}>{fmtP(totalFinal)}</span>
          </div>
        </div>

        {faltaMinimo && (
          <div style={sx("padding:12px 16px;border-radius:12px;border:1px solid rgb(var(--acc) / .5);background:rgb(var(--acc) / .08);font-size:13.5px;color:#f6f1e9")}>
            {t("pedir.minimo", { tipo: esDomicilio ? t("pedir.tipoDomicilio") : t("pedir.tipoOnline"), min: fmtP(minimoCents), falta: fmtP(minimoCents - totalCents) })}
          </div>
        )}

        <div>
          <span style={labelStyle}>{t("pedir.nombre")}</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" style={inputStyle} />
        </div>
        <div>
          <span style={labelStyle}>{t("pedir.telefono")}</span>
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" autoComplete="tel" style={inputStyle} />
        </div>
        <div>
          <span style={labelStyle}>{t("pedir.notasLocal")}</span>
          <input value={nota} onChange={(e) => setNota(e.target.value.slice(0, 300))} placeholder={t("pedir.opcional")} style={inputStyle} />
        </div>

        {/* Honeypot: invisible y fuera del orden de tabulación; los bots lo rellenan */}
        <div aria-hidden="true" style={sx("position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden")}>
          <label>
            {/* honeypot */}
            <input type="text" name="web" tabIndex={-1} autoComplete="off" value={web} onChange={(e) => setWeb(e.target.value)} />
          </label>
        </div>

        {!pagos && (
          <div style={sx("padding:13px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.4);background:rgba(255,92,40,.08);color:#f6f1e9;font-size:14px")}>
            {t("pedir.noDisponible", { phone: L.phone })}
          </div>
        )}
        {/* Fuera del horario de reparto: se puede programar para la noche, pero
            si lo quiere ya, se le manda a las plataformas en vez de dejarlo
            colgado. Se muestra aunque esté programando. */}
        {pagos && sinRepartoAhora && !pausado && (
          <div style={sx("padding:13px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.4);background:rgba(255,92,40,.08);color:#f6f1e9;font-size:14px")}>
            🛵 {reparto.mensaje} — {reparto.detalle}.{" "}
            {hayFranjas ? t("pedir.puedesProgramar") : t("pedir.oRecoge")}
            <div style={sx("margin-top:10px;display:flex;flex-wrap:wrap;align-items:center;gap:8px")}>
              <span style={sx("font-size:13px;color:rgba(246,241,233,.7)")}>{t("pedir.oPideApps")}</span>
              {[["glovo", "Glovo", "#ffc244"], ["ubereats", "Uber Eats", "#06c167"]].map(([k, nombre, color]) => (
                <a key={k} href={L.apps?.[k]} target="_blank" rel="noreferrer"
                  style={{ ...sx("font-size:12.5px;font-weight:700;padding:8px 14px;border-radius:100px;text-decoration:none"), border: `1px solid ${color}`, color }}>
                  🛵 {nombre} →
                </a>
              ))}
            </div>
          </div>
        )}
        {pagos && cerrado && !programado && !sinRepartoAhora && (
          <div style={sx("padding:13px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.4);background:rgba(255,92,40,.08);color:#f6f1e9;font-size:14px")}>
            {estado?.mensaje} — {estado?.detalle}.{" "}
            {pausado
              ? t("pedir.pausaTelefono", { phone: L.phone })
              : programar && hayFranjas
                ? t("pedir.puedesProgramar")
                : t("pedir.cerradoAviso", { horario: horarioTexto(idioma) })}
          </div>
        )}
        {error && (
          <div role="alert" style={sx("padding:13px 16px;border-radius:12px;border:1px solid rgba(255,92,40,.5);background:rgba(255,92,40,.1);color:#f6f1e9;font-size:14px")}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={enviar}
          disabled={sending || cart.length === 0 || !puedeEnviar || faltaMinimo}
          style={{ ...sx("font-family:'Anton',sans-serif;font-size:17px;letter-spacing:.05em;padding:17px 20px;border-radius:100px;border:0;cursor:pointer;transition:opacity .2s"), background: `rgb(${rgb})`, color: "#0a0806", opacity: sending || cart.length === 0 || !puedeEnviar || faltaMinimo ? 0.45 : 1 }}
        >
          {sending ? t("pedir.enviando") : t("pedir.enviar", { total: fmtP(totalFinal) })}
        </button>
        <p style={sx("margin:0;font-size:11.5px;line-height:1.5;color:rgba(246,241,233,.5)")}>{t("pedir.legalPago")}</p>
        <p style={sx("margin:0;font-size:11.5px;line-height:1.5;color:rgba(246,241,233,.5)")}>
          {t("pedir.legalTerminosA")}
          <a href="/condiciones" style={sx("color:rgba(246,241,233,.7)")}>{t("pedir.legalTerminosLink")}</a>
          {t("pedir.legalTerminosB")}
          <a href="/privacidad" style={sx("color:rgba(246,241,233,.7)")}>{t("pedir.legalPrivacidad")}</a>.
        </p>
      </div>
    </div>
  );
}

// ── Seguimiento del pedido enviado ───────────────────────────────────────────
function Seguimiento({ pedido, onNuevo }) {
  const { t, idioma } = useI18n();
  const fmtP = (c) => (idioma === "en" ? precioEn(fmtEUR(c)) : fmtEUR(c)); // precio en el formato del idioma
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
      timer.current = setTimeout(tick, 5000);
    };
    tick();
    return () => { vivo = false; clearTimeout(timer.current); };
  }, [pedido.id, pedido.code]);

  const status = info?.status || "nuevo";
  const readyLabel = info?.ready_at
    ? new Date(info.ready_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
    : null;

  const pagoEstado = info?.pago_estado || null;
  const progTxt = info?.programado_para ? programadoTexto(info.programado_para, new Date(), idioma) : null;
  const PASOS = {
    nuevo: progTxt
      ? { emoji: "⏰", titulo: t("pedir.seg.progT"), texto: t("pedir.seg.progD", { cuando: progTxt }) }
      : { emoji: "📨", titulo: t("pedir.seg.nuevoT"), texto: t("pedir.seg.nuevoD") },
    aceptado: {
      emoji: "🔥",
      titulo: t("pedir.seg.aceptadoT"),
      texto: readyLabel
        ? t(info?.entrega === "domicilio" ? "pedir.seg.aceptadoDdom" : "pedir.seg.aceptadoD", { hora: readyLabel })
        : progTxt
        ? t("pedir.seg.aceptadoDprog", { cuando: progTxt })
        : t("pedir.seg.aceptadoDsin"),
    },
    lista: info?.entrega === "domicilio"
      ? { emoji: "🛵", titulo: t("pedir.seg.caminoT"), texto: t("pedir.seg.caminoD") }
      : { emoji: "✅", titulo: t("pedir.seg.listaT"), texto: t("pedir.seg.listaD") },
    entregado: { emoji: "🍔", titulo: t("pedir.seg.entregadoT"), texto: t("pedir.seg.entregadoD") },
    rechazado: {
      emoji: "😔",
      titulo: t("pedir.seg.rechazadoT"),
      texto: pagoEstado === "reembolsado" ? t("pedir.seg.rechazadoDrf") : t("pedir.seg.rechazadoD", { phone: L?.phone }),
    },
    no_recogido: { emoji: "📦", titulo: t("pedir.seg.noRecogidoT"), texto: t("pedir.seg.noRecogidoD", { phone: L?.phone }) },
    pendiente_pago: pagoEstado === "fallido"
      ? { emoji: "💳", titulo: t("pedir.seg.pagoFalloT"), texto: t("pedir.seg.pagoFalloD") }
      : { emoji: "⏳", titulo: t("pedir.seg.confirmandoT"), texto: t("pedir.seg.confirmandoD") },
  };
  const paso = PASOS[status] || PASOS.nuevo;

  // Enlace universal de seguimiento — se comparte por WhatsApp para reabrirlo
  // desde cualquier dispositivo aunque se cierre el navegador.
  const urlSeguimiento = `${window.location.origin}/pedir?p=${pedido.id}.${pedido.code}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(t("pedir.seg.waMsg", { code: pedido.code, url: urlSeguimiento }))}`;

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
          <span style={sx("font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:rgba(246,241,233,.55)")}>{t("pedir.seg.numero")}</span>
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
              {t("pedir.seg.wa")}
            </a>
            <div style={sx("margin-top:8px;font-size:11.5px;color:rgba(246,241,233,.45)")}>
              {t("pedir.seg.waNota")}
            </div>
          </div>
        )}

        <div style={sx("font-size:14px;line-height:1.6;color:rgba(246,241,233,.7)")}>
          {info?.entrega === "domicilio"
            ? <>{t("pedir.seg.entregaDom")} <strong style={sx("color:#f6f1e9")}>{info?.direccion}</strong></>
            : <>📍 {L?.name} — {L?.address}</>}<br />
          📞 <a href={`tel:${L?.tel}`} style={{ color: `rgb(${rgb})`, textDecoration: "none", fontWeight: 700 }}>{L?.phone}</a>
          {info?.total_cents != null && (
            pagoEstado === "reembolsado" ? <><br />{t("pedir.seg.devuelto", { t: fmtP(info.total_cents) })}</>
            : pagoEstado === "reembolso_parcial" ? <><br />{t("pedir.seg.pagadoParcial", { t: fmtP(info.total_cents), d: fmtP(info.reembolsado_cents || 0) })}</>
            : <><br />{t(info.entrega === "domicilio" ? "pedir.seg.pagadoDom" : "pedir.seg.pagado", { t: fmtP(info.total_cents) })}</>
          )}
        </div>

        {status === "entregado" && L?.reviewUrl && (
          <a
            href={L.reviewUrl}
            target="_blank"
            rel="noreferrer"
            style={{ ...sx("display:inline-flex;align-items:center;gap:9px;margin-top:20px;font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.03em;padding:14px 26px;border-radius:100px;text-decoration:none;color:#0a0806"), background: `rgb(${rgb})` }}
          >
            {t("pedir.seg.resena")}
          </a>
        )}

        {caido && <p style={sx("margin:18px 0 0;font-size:12.5px;color:rgba(246,241,233,.5)")}>{t("pedir.seg.caido")}</p>}
        {!FINALES.includes(status) && !caido && (
          <p style={sx("margin:18px 0 0;font-size:12px;color:rgba(246,241,233,.45)")}>
            <span style={{ ...sx("display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px"), background: `rgb(${rgb})`, animation: "ltb-pulse 1.6s infinite" }} />
            {t("pedir.seg.auto")}
          </p>
        )}
      </div>

      <button onClick={onNuevo} style={sx("margin-top:26px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;padding:12px 24px;border-radius:100px;border:1px solid rgba(246,241,233,.25);background:transparent;color:#f6f1e9;cursor:pointer")}>
        {t("pedir.seg.otro")}
      </button>
    </div>
  );
}
