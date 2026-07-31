import { useEffect, useState } from "react";
import { sx } from "../sx";
import { displayCats } from "../menu";
import { iconoDe, colorDe } from "./identidad";
import LtbMark from "../LtbMark";

// ─────────────────────────────────────────────────────────────────────────────
// /carta — carta digital COMPLETA para ver en el local (se llega por QR).
// Solo lectura: todas las categorías y productos con precios, incluidas las
// bebidas de barril y demás que no se piden online. La fuente de datos es
// src/menu.js (la misma que la portada y /pedir), así que siempre está
// sincronizada. Diseño denso y con icono por plato: en móvil se ven muchos
// platos de un vistazo y cada uno se distingue al instante.
// ─────────────────────────────────────────────────────────────────────────────

const CATS = displayCats();

export default function CartaPage() {
  const [activa, setActiva] = useState(CATS[0]?.id);

  useEffect(() => {
    document.title = "Carta — La Terracita Burger";
  }, []);

  // Resalta en la barra la categoría visible al hacer scroll.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiva(visible.target.id.replace("cat-", ""));
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    CATS.forEach((c) => {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  // Mantiene visible la pastilla activa dentro de la barra deslizable.
  useEffect(() => {
    document.getElementById(`pill-${activa}`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activa]);

  return (
    <div style={sx("min-height:100vh")}>
      {/* Fondo ambiental sutil */}
      <div style={sx("position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden")}>
        <div style={sx("position:absolute;top:-12%;left:-8%;width:60vw;height:60vw;background:radial-gradient(circle,rgb(var(--acc) / .16),transparent 62%);filter:blur(30px)")} />
        <div style={sx("position:absolute;bottom:-16%;right:-10%;width:52vw;height:52vw;background:radial-gradient(circle,rgb(var(--emb) / .12),transparent 62%);filter:blur(30px)")} />
      </div>

      {/* Cabecera compacta */}
      <header style={sx("position:relative;z-index:2;text-align:center;padding:28px 20px 14px")}>
        <a href="/" aria-label="Inicio" style={sx("display:inline-flex")}>
          <LtbMark size={28} style={{ color: "#f6f1e9" }} />
        </a>
        <h1 style={sx("margin:12px 0 0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(34px,9vw,60px);line-height:.92;text-transform:uppercase")}>Nuestra <span className="ltb-flicker-text" style={sx("color:rgb(var(--acc));text-shadow:0 0 30px rgb(var(--acc) / .5)")}>carta</span></h1>
        <p style={sx("margin:10px auto 0;max-width:440px;font-size:12.5px;line-height:1.5;color:rgba(246,241,233,.55)")}>Smash burgers de Angus Dry Age · pan de patata · salsas caseras. Precios con IVA.</p>
      </header>

      {/* Barra de categorías (sticky, con color por sección) */}
      <nav style={sx("position:sticky;top:0;z-index:5;background:rgba(10,8,6,.92);backdrop-filter:blur(10px);border-top:1px solid rgba(246,241,233,.08);border-bottom:1px solid rgba(246,241,233,.08)")}>
        <div style={sx("display:flex;gap:7px;overflow-x:auto;padding:10px clamp(12px,4vw,28px);max-width:1100px;margin:0 auto;-webkit-overflow-scrolling:touch;scrollbar-width:none")}>
          {CATS.map((c) => {
            const on = c.id === activa;
            const col = colorDe(c.id);
            return (
              <a
                key={c.id}
                id={`pill-${c.id}`}
                href={`#cat-${c.id}`}
                style={{
                  ...sx("flex:none;display:inline-flex;align-items:center;gap:6px;font-family:'Anton',sans-serif;font-size:13px;letter-spacing:.03em;text-transform:uppercase;padding:8px 15px;border-radius:100px;text-decoration:none;transition:all .2s"),
                  border: `1px solid ${on ? `rgb(${col})` : "rgba(246,241,233,.16)"}`,
                  background: on ? `rgb(${col})` : "transparent",
                  color: on ? "#0a0806" : "#f6f1e9",
                }}
              >
                <span style={sx("font-size:14px;line-height:1")}>{iconoDe(c.id)}</span>
                {c.label}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Secciones */}
      <main style={sx("position:relative;z-index:2;max-width:1100px;margin:0 auto;padding:8px clamp(12px,4vw,28px) 36px")}>
        {CATS.map((cat) => {
          const col = colorDe(cat.id);
          return (
            <section key={cat.id} id={`cat-${cat.id}`} style={sx("scroll-margin-top:64px;padding:22px 0 2px")}>
              <div style={sx("display:flex;align-items:center;gap:10px;margin-bottom:4px")}>
                <span style={{ ...sx("display:grid;place-items:center;width:34px;height:34px;border-radius:10px;font-size:18px;flex:none"), background: `rgb(${col} / .16)`, border: `1px solid rgb(${col} / .4)` }}>
                  {iconoDe(cat.id)}
                </span>
                <h2 style={{ ...sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(24px,5.5vw,36px);line-height:1;text-transform:uppercase"), color: `rgb(${col})` }}>{cat.label}</h2>
              </div>
              {cat.nota && <p style={sx("margin:0 0 4px;font-size:12px;line-height:1.45;color:rgba(246,241,233,.5)")}>{cat.nota}</p>}

              {/* Filas compactas: icono · nombre+desc · precios */}
              <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr));gap:8px;margin-top:12px")}>
                {cat.items.map((item, i) => (
                  <div
                    key={item.id || item.name + i}
                    style={{
                      ...sx("display:flex;align-items:flex-start;gap:11px;padding:11px 13px;border-radius:13px;background:#100c08"),
                      border: "1px solid rgba(246,241,233,.09)",
                      borderLeft: `3px solid rgb(${col} / .8)`, // franja de color = categoría
                    }}
                  >
                    {/* Nombre + descripción */}
                    <div style={sx("flex:1;min-width:0")}>
                      <div style={sx("display:flex;align-items:baseline;gap:7px;flex-wrap:wrap")}>
                        <h3 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:17px;letter-spacing:.01em;text-transform:uppercase;line-height:1.15")}>{item.name}</h3>
                        {item.tag && (
                          <span style={{ ...sx("flex:none;font-size:9px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;padding:2px 7px;border-radius:100px"), background: `rgb(${col} / .18)`, color: `rgb(${col})`, border: `1px solid rgb(${col} / .45)` }}>{item.tag}</span>
                        )}
                      </div>
                      {item.desc && (
                        <p style={sx("margin:3px 0 0;font-size:11.5px;line-height:1.4;color:rgba(246,241,233,.6);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden")}>{item.desc}</p>
                      )}
                    </div>

                    {/* Precios */}
                    <div style={sx("flex:none;text-align:right;display:flex;flex-direction:column;gap:2px;padding-left:4px")}>
                      {item.rows.map((row, ri) => (
                        <div key={ri} style={sx("display:flex;align-items:baseline;justify-content:flex-end;gap:5px;white-space:nowrap")}>
                          {row[0] && <span style={sx("font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:rgba(246,241,233,.5);font-weight:700")}>{row[0]}</span>}
                          <span style={{ ...sx("font-family:'Anton',sans-serif;font-size:16px;line-height:1.1"), color: `rgb(${col})` }}>{row[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <p style={sx("margin:28px 0 0;font-size:12px;line-height:1.6;color:rgba(246,241,233,.55);text-align:center")}>
          Toda modificación en hamburguesas y camperos se cobra como extra. Convierte tus patatas en boniatos por 1,90 € o en patatas con cheddar y bacon por 2,90 €.
          <br />¿Alergias o intolerancias? Pregunta a nuestro equipo.
        </p>

        <div style={sx("margin:24px 0 0;text-align:center")}>
          <a href="/pedir" style={sx("display:inline-flex;align-items:center;gap:8px;font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.05em;padding:14px 30px;border-radius:100px;background:rgb(var(--acc));color:#0a0806;text-decoration:none")}>
            🍔 Pedir online para recoger
          </a>
        </div>
      </main>

      <footer style={sx("position:relative;z-index:2;text-align:center;padding:24px 20px 36px;font-size:11.5px;color:rgba(246,241,233,.42)")}>
        © 2026 La Terracita Burguer España SL · Teatinos · Rincón de la Victoria
      </footer>
    </div>
  );
}
