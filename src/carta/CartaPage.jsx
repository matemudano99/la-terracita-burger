import { useEffect, useState } from "react";
import { sx } from "../sx";
import { displayCats } from "../menu";
import LtbMark from "../LtbMark";

// ─────────────────────────────────────────────────────────────────────────────
// /carta — carta digital COMPLETA para ver en el local (se llega por QR).
// Solo lectura: muestra todas las categorías y todos los productos con precios,
// incluidas las bebidas de barril y demás que no se piden online. La fuente de
// datos es src/menu.js (la misma que la portada y /pedir), así que se mantiene
// siempre sincronizada. No hay carrito ni pagos: es la carta de mesa.
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
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    CATS.forEach((c) => {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div style={sx("min-height:100vh")}>
      {/* Fondo ambiental sutil */}
      <div style={sx("position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden")}>
        <div style={sx("position:absolute;top:-12%;left:-8%;width:60vw;height:60vw;background:radial-gradient(circle,rgb(var(--acc) / .16),transparent 62%);filter:blur(30px)")} />
        <div style={sx("position:absolute;bottom:-16%;right:-10%;width:52vw;height:52vw;background:radial-gradient(circle,rgb(var(--emb) / .12),transparent 62%);filter:blur(30px)")} />
      </div>

      {/* Cabecera */}
      <header style={sx("position:relative;z-index:2;text-align:center;padding:44px 20px 20px")}>
        <a href="/" aria-label="Inicio" style={sx("display:inline-flex")}>
          <LtbMark size={34} style={{ color: "#f6f1e9" }} />
        </a>
        <div style={sx("font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--acc-lt);margin:18px 0 8px")}>La Terracita Burger</div>
        <h1 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(44px,12vw,80px);line-height:.9;text-transform:uppercase")}>Nuestra <span className="ltb-flicker-text" style={sx("color:rgb(var(--acc));text-shadow:0 0 30px rgb(var(--acc) / .5)")}>carta</span></h1>
        <p style={sx("margin:16px auto 0;max-width:460px;font-size:14px;line-height:1.55;color:rgba(246,241,233,.6)")}>Smash burgers de ternera Angus Dry Age · pan de patata artesano · salsas caseras. Precios con IVA incluido.</p>
      </header>

      {/* Barra de categorías (sticky) */}
      <nav style={sx("position:sticky;top:0;z-index:5;background:rgba(10,8,6,.9);backdrop-filter:blur(10px);border-top:1px solid rgba(246,241,233,.08);border-bottom:1px solid rgba(246,241,233,.08)")}>
        <div style={sx("display:flex;gap:8px;overflow-x:auto;padding:12px clamp(14px,4vw,28px);max-width:1100px;margin:0 auto;-webkit-overflow-scrolling:touch")}>
          {CATS.map((c) => {
            const on = c.id === activa;
            return (
              <a key={c.id} href={`#cat-${c.id}`} style={sx(`flex:none;font-family:'Anton',sans-serif;font-size:14px;letter-spacing:.03em;text-transform:uppercase;padding:9px 18px;border-radius:100px;text-decoration:none;transition:all .2s;border:1px solid ${on ? "rgb(var(--acc))" : "rgba(246,241,233,.16)"};background:${on ? "rgb(var(--acc))" : "transparent"};color:${on ? "#0a0806" : "#f6f1e9"}`)}>
                {c.label}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Secciones de la carta */}
      <main style={sx("position:relative;z-index:2;max-width:1100px;margin:0 auto;padding:20px clamp(14px,4vw,28px) 40px")}>
        {CATS.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} style={sx("scroll-margin-top:72px;padding:28px 0 6px")}>
            <h2 style={sx("margin:0 0 4px;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(28px,6vw,44px);line-height:1;text-transform:uppercase")}>
              <span style={{ color: `rgb(var(--acc))` }}>—</span> {cat.label}
            </h2>
            {cat.nota && <p style={sx("margin:6px 0 0;font-size:12.5px;line-height:1.5;color:rgba(246,241,233,.55)")}>{cat.nota}</p>}

            <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr));gap:14px;margin-top:18px")}>
              {cat.items.map((item, i) => (
                <div key={item.name + i} style={sx("background:#100c08;border:1px solid rgba(246,241,233,.1);border-radius:16px;padding:18px 20px")}>
                  <div style={sx("display:flex;align-items:flex-start;justify-content:space-between;gap:12px")}>
                    <h3 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:22px;letter-spacing:.01em;text-transform:uppercase;line-height:1.05")}>{item.name}</h3>
                    {item.tag && <span style={sx("flex:none;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;padding:4px 9px;border-radius:100px;background:rgb(var(--emb) / .16);color:rgb(var(--emb));border:1px solid rgb(var(--emb) / .35)")}>{item.tag}</span>}
                  </div>
                  {item.desc && <p style={sx("margin:9px 0 0;font-size:13px;line-height:1.5;color:rgba(246,241,233,.68)")}>{item.desc}</p>}
                  <div style={sx("margin-top:14px;padding-top:12px;border-top:1px dashed rgba(246,241,233,.14);display:flex;flex-direction:column;gap:6px")}>
                    {item.rows.map((row, ri) => (
                      <div key={ri} style={sx("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
                        <span style={sx("font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,241,233,.72);font-weight:600")}>{row[0]}</span>
                        <span style={sx("flex:1;border-bottom:1px dotted rgba(246,241,233,.16);transform:translateY(-4px)")} />
                        <span style={{ ...sx("font-family:'Anton',sans-serif;font-size:19px"), color: "rgb(var(--acc))" }}>{row[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <p style={sx("margin:34px 0 0;font-size:12.5px;line-height:1.6;color:rgba(246,241,233,.6);text-align:center")}>
          Toda modificación en hamburguesas y camperos se cobra como extra. Convierte tus patatas en boniatos por 1,90 € o en patatas con cheddar y bacon por 2,90 €.
          <br />¿Alergias o intolerancias? Pregunta a nuestro equipo.
        </p>

        {/* CTA discreto para pedir online */}
        <div style={sx("margin:28px 0 0;text-align:center")}>
          <a href="/pedir" style={sx("display:inline-flex;align-items:center;gap:8px;font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.05em;padding:14px 30px;border-radius:100px;background:rgb(var(--acc));color:#0a0806;text-decoration:none")}>
            🍔 Pedir online para recoger
          </a>
        </div>
      </main>

      <footer style={sx("position:relative;z-index:2;text-align:center;padding:28px 20px 40px;font-size:12px;color:rgba(246,241,233,.45)")}>
        © 2026 La Terracita Burguer España SL · Teatinos · Rincón de la Victoria
      </footer>
    </div>
  );
}
