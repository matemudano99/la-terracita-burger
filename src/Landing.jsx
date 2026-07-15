import { useEffect, useRef, useState } from "react";
import { sx } from "./sx";
import { SITE } from "./site";
import Navbar from "./Navbar";
import IntroSplash from "./IntroSplash";
import BurgerDelMes from "./BurgerDelMes";
import Carousel from "./Carousel";
import Delivery from "./Delivery";
import LtbMark from "./LtbMark";
import { displayCats } from "./menu";

// La carta vive en src/menu.js (única fuente de verdad, compartida con /pedir
// y el backend de pedidos). Aquí solo se da el formato de presentación.
const CATS = displayCats();


const tabStyle = (active) =>
  `font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.03em;text-transform:uppercase;padding:12px 22px;border-radius:100px;cursor:pointer;transition:all .25s;border:1px solid ${active ? "rgb(var(--acc))" : "rgba(246,241,233,.16)"};background:${active ? "rgb(var(--acc))" : "transparent"};color:${active ? "#0a0806" : "#f6f1e9"};box-shadow:${active ? "0 8px 30px -8px rgb(var(--acc) / .7)" : "none"}`;

const cardStyle = (hovered) =>
  `position:relative;background:${hovered ? "#17110b" : "#100c08"};border:1px solid ${hovered ? "rgb(var(--acc) / .5)" : "rgba(246,241,233,.1)"};border-radius:16px;padding:22px;transition:all .3s cubic-bezier(.2,.8,.2,1);transform:translateY(${hovered ? "-6px" : "0"});box-shadow:${hovered ? "0 22px 50px -20px rgb(var(--acc) / .5)" : "none"};animation:ltb-rise .5s both`;

export default function Landing() {
  const [activeCat, setActiveCat] = useState("smash");
  const [hover, setHover] = useState(null);

  const glowRef = useRef(null);
  const c1 = useRef(null);
  const c2 = useRef(null);
  const c3 = useRef(null);
  const magC = useRef(null);
  const magD = useRef(null);

  useEffect(() => {
    // Scroll reveals
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.opacity = "1";
            e.target.style.transform = "translateY(0)";
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    // Count-up numbers
    const countUp = (el) => {
      const target = +el.dataset.count;
      const suf = el.dataset.suffix || "";
      const dur = 1200;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const countObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            countUp(e.target);
            countObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    [c1.current, c2.current, c3.current].forEach((el) => el && countObs.observe(el));

    // Cursor glow
    const onMove = (ev) => {
      if (glowRef.current)
        glowRef.current.style.transform = `translate(${ev.clientX}px,${ev.clientY}px)`;
    };
    window.addEventListener("mousemove", onMove);

    // Magnetic buttons
    const mags = [magC.current, magD.current].filter(Boolean);
    const handlers = mags.map((el) => {
      const move = (ev) => {
        const r = el.getBoundingClientRect();
        const x = ev.clientX - r.left - r.width / 2;
        const y = ev.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.3}px,${y * 0.4}px) scale(1.04)`;
      };
      const leave = () => {
        el.style.transform = "translate(0,0) scale(1)";
      };
      el.addEventListener("mousemove", move);
      el.addEventListener("mouseleave", leave);
      return { el, move, leave };
    });

    return () => {
      io.disconnect();
      countObs.disconnect();
      window.removeEventListener("mousemove", onMove);
      handlers.forEach((h) => {
        h.el.removeEventListener("mousemove", h.move);
        h.el.removeEventListener("mouseleave", h.leave);
      });
    };
  }, []);

  const cat = CATS.find((c) => c.id === activeCat) || CATS[0];

  return (
    <>
      <a className="ltb-skip" href="#contenido">Saltar al contenido</a>

      {/* Brand intro splash (plays on load) */}
      <IntroSplash />

      {/* Ambient background blobs */}
      <div style={sx("position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden")}>
        <div style={sx("position:absolute;top:-10%;left:-5%;width:52vw;height:52vw;background:radial-gradient(circle,rgb(var(--acc) / .22),transparent 62%);filter:blur(20px);animation:ltb-drift 18s ease-in-out infinite")} />
        <div style={sx("position:absolute;bottom:-15%;right:-8%;width:46vw;height:46vw;background:radial-gradient(circle,rgb(var(--emb) / .14),transparent 62%);filter:blur(20px);animation:ltb-drift 22s ease-in-out infinite reverse")} />
      </div>

      {/* Cursor glow */}
      <div ref={glowRef} style={sx("position:fixed;top:0;left:0;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;background:radial-gradient(circle,rgb(var(--acc) / .18),transparent 60%);pointer-events:none;z-index:1;transition:transform .18s cubic-bezier(.2,.9,.2,1);mix-blend-mode:screen")} />

      {/* Nav */}
      <Navbar />

      <h1 className="sr-only">
        La Terracita Burger — Smash burgers de ternera Angus Dry Age en Málaga: Teatinos y Rincón de la Victoria
      </h1>

      <main id="contenido">
      {/* Hamburguesa del mes — primera pantalla */}
      <BurgerDelMes />

      {/* Marquee */}
      <div aria-hidden="true" style={sx("position:relative;z-index:3;border-top:1px solid rgb(var(--acc) / .25);border-bottom:1px solid rgb(var(--acc) / .25);background:rgb(var(--acc));overflow:hidden;padding:14px 0")}>
        <div style={sx("display:flex;width:max-content;animation:ltb-marq 24s linear infinite;font-family:'Anton',sans-serif;font-size:24px;letter-spacing:.04em;color:#0a0806;text-transform:uppercase")}>
          <span style={sx("padding:0 26px")}>Smash burgers para volverte adicto 🔥</span><span style={sx("padding:0 26px")}>Angus Dry Age</span><span style={sx("padding:0 26px")}>100% Mediterráneo</span><span style={sx("padding:0 26px")}>Cheddar fundido</span><span style={sx("padding:0 26px")}>Smash burgers para volverte adicto 🔥</span><span style={sx("padding:0 26px")}>Angus Dry Age</span><span style={sx("padding:0 26px")}>100% Mediterráneo</span><span style={sx("padding:0 26px")}>Cheddar fundido</span>
        </div>
      </div>

      {/* Carta */}
      <section id="carta" className="ltb-cv" style={sx("position:relative;z-index:2;padding:96px 5vw 80px;max-width:1240px;margin:0 auto")}>
        <div data-reveal="" style={sx("opacity:0;transform:translateY(46px);transition:opacity .7s,transform .7s")}>
          <div style={sx("font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:var(--acc-lt);margin-bottom:12px")}>01 — La Carta</div>
          <h2 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(40px,7vw,96px);line-height:.9;text-transform:uppercase")}>Elige tu <span className="ltb-flicker-text" style={sx("color:rgb(var(--acc));text-shadow:0 0 30px rgb(var(--acc) / .5)")}>vicio</span></h2>
        </div>

        <div style={sx("display:flex;flex-wrap:wrap;gap:12px;margin:44px 0 40px")}>
          {CATS.map((c) => {
            const active = c.id === activeCat;
            return (
              <button key={c.id} onClick={() => setActiveCat(c.id)} aria-pressed={active} style={sx(tabStyle(active))}>
                {c.label}{" "}
                <span style={sx(`font-size:11px;padding:2px 7px;border-radius:100px;margin-left:2px;background:${active ? "rgba(10,8,6,.18)" : "rgba(246,241,233,.1)"};color:inherit`)}>{c.items.length}</span>
              </button>
            );
          })}
        </div>

        {cat.nota && <p style={sx("margin:-22px 0 24px;font-size:13px;line-height:1.5;color:rgba(246,241,233,.6)")}>{cat.nota}</p>}
        <div key={activeCat} style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:16px")}>
          {cat.items.map((item, i) => {
            const hovered = hover === activeCat + i;
            return (
              <div key={item.name} style={sx(cardStyle(hovered))} onMouseEnter={() => setHover(activeCat + i)} onMouseLeave={() => setHover(null)}>
                <div style={sx("display:flex;align-items:flex-start;justify-content:space-between;gap:12px")}>
                  <h3 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:24px;letter-spacing:.01em;text-transform:uppercase;line-height:1")}>{item.name}</h3>
                  {item.tag && (
                    <span style={sx("flex:none;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;padding:4px 9px;border-radius:100px;background:rgb(var(--emb) / .16);color:rgb(var(--emb));border:1px solid rgb(var(--emb) / .35)")}>{item.tag}</span>
                  )}
                </div>
                <p style={sx("margin:10px 0 0;font-size:13.5px;line-height:1.5;color:rgba(246,241,233,.72)")}>{item.desc}</p>
                <div style={sx("margin-top:16px;padding-top:14px;border-top:1px dashed rgba(246,241,233,.14);display:flex;flex-direction:column;gap:6px")}>
                  {item.rows.map((row, ri) => (
                    <div key={ri} style={sx("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
                      <span style={sx("font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,241,233,.72);font-weight:600")}>{row[0]}</span>
                      <span style={sx("flex:1;border-bottom:1px dotted rgba(246,241,233,.16);transform:translateY(-4px)")} />
                      <span style={sx("font-family:'Anton',sans-serif;font-size:20px;color:rgb(var(--acc))")}>{row[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p style={sx("margin:34px 0 0;font-size:12.5px;color:rgba(246,241,233,.72);text-align:center")}>Toda modificación en hamburguesas y camperos se cobra como extra. Convierte tus patatas en boniatos por 1,90 € o en patatas con cheddar y bacon por 2,90 €.</p>
      </section>

      {/* Marquee reverse */}
      <div aria-hidden="true" style={sx("position:relative;z-index:3;background:#0d0a07;border-top:1px solid rgba(246,241,233,.08);border-bottom:1px solid rgba(246,241,233,.08);overflow:hidden;padding:12px 0")}>
        <div style={sx("display:flex;width:max-content;animation:ltb-marq-r 30s linear infinite;font-family:'Anton',sans-serif;font-size:22px;letter-spacing:.05em;color:rgba(246,241,233,.16);text-transform:uppercase")}>
          <span style={sx("padding:0 24px")}>★ Cheeseburger</span><span style={sx("padding:0 24px")}>★ Oklahoma</span><span style={sx("padding:0 24px")}>★ Jack Burger</span><span style={sx("padding:0 24px")}>★ La Terracita</span><span style={sx("padding:0 24px")}>★ Mexican</span><span style={sx("padding:0 24px")}>★ Derrumbe</span><span style={sx("padding:0 24px")}>★ Cheeseburger</span><span style={sx("padding:0 24px")}>★ Oklahoma</span><span style={sx("padding:0 24px")}>★ Jack Burger</span><span style={sx("padding:0 24px")}>★ La Terracita</span><span style={sx("padding:0 24px")}>★ Mexican</span><span style={sx("padding:0 24px")}>★ Derrumbe</span>
        </div>
      </div>

      {/* Historia */}
      <section id="historia" className="ltb-2col ltb-cv" style={sx("position:relative;z-index:2;padding:100px 5vw;max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center")}>
        <div data-reveal="" style={sx("opacity:0;transform:translateY(46px);transition:opacity .7s,transform .7s")}>
          <div style={sx("font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:var(--acc-lt);margin-bottom:14px")}>02 — Historia</div>
          <h2 style={sx("margin:0 0 22px;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(36px,5.5vw,72px);line-height:.92;text-transform:uppercase")}>El smash<br />que engancha</h2>
          <p style={sx("margin:0 0 18px;font-size:16px;line-height:1.65;color:rgba(246,241,233,.72)")}>Aplastamos cada medallón de <strong style={sx("color:#f6f1e9")}>ternera Angus Dry Age</strong> sobre la plancha ardiendo para sellar esos bordes crujientes que te hacen volver. Cheddar fundido, <strong style={sx("color:#f6f1e9")}>pan de papa</strong> artesano y salsas caseras.</p>
          <p style={sx("margin:0 0 18px;font-size:16px;line-height:1.65;color:rgba(246,241,233,.72)")}>Nacidos en Málaga, con alma <strong style={sx("color:rgb(var(--emb))")}>mediterránea</strong>. Hoy con <strong style={sx("color:#f6f1e9")}>dos locales</strong> —Teatinos y Rincón de la Victoria— y reparto a domicilio por Glovo, Just Eat y Uber Eats. Sin humos, sin postureo: solo hamburguesas que provocan adicción.</p>
          <div style={sx("display:inline-flex;align-items:center;gap:10px;padding:9px 16px;border-radius:100px;border:1px solid rgb(var(--acc) / .35);background:rgb(var(--acc) / .08)")}>
            <span style={sx("color:rgb(var(--acc));letter-spacing:2px;font-size:15px")}>★★★★★</span>
            <span style={sx("font-size:13.5px;color:rgba(246,241,233,.8)")}><strong style={sx("color:#f6f1e9")}>4,8</strong> · +1.300 reseñas en Google</span>
          </div>
          <div className="ltb-stats" style={sx("display:flex;gap:40px;margin-top:34px")}>
            <div><div ref={c1} data-count="12" style={sx("font-family:'Anton',sans-serif;font-size:46px;color:rgb(var(--acc));line-height:1")}>0</div><div style={sx("font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:rgba(246,241,233,.64)")}>Smash burgers</div></div>
            <div><div ref={c2} data-count="2" style={sx("font-family:'Anton',sans-serif;font-size:46px;color:rgb(var(--acc));line-height:1")}>0</div><div style={sx("font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:rgba(246,241,233,.64)")}>Locales en Málaga</div></div>
            <div><div ref={c3} data-count="100" data-suffix="%" style={sx("font-family:'Anton',sans-serif;font-size:46px;color:rgb(var(--acc));line-height:1")}>0</div><div style={sx("font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:rgba(246,241,233,.64)")}>Angus Dry Age</div></div>
          </div>
        </div>
        <div data-reveal="" style={sx("opacity:0;transform:translateY(46px);transition:opacity .7s .1s,transform .7s .1s;position:relative")}>
          <div style={sx("position:absolute;inset:-8% -8% -8% -8%;background:radial-gradient(circle,rgb(var(--acc) / .3),transparent 65%);filter:blur(30px);animation:ltb-pulse 5s infinite")} />
          <Carousel />
          <span style={sx("position:absolute;top:-18px;right:-10px;z-index:4;display:grid;place-items:center;width:100px;height:100px;border-radius:50%;background:rgb(var(--emb));color:#0a0806;font-family:'Anton',sans-serif;font-size:14px;text-align:center;line-height:1;text-transform:uppercase;transform:rotate(10deg);animation:ltb-float 6s ease-in-out infinite")}>Angus<br />Dry Age</span>
        </div>
      </section>

      {/* Locales */}
      <section id="locales" className="ltb-cv" style={sx("position:relative;z-index:2;padding:60px 5vw 100px;max-width:1200px;margin:0 auto")}>
        <div data-reveal="" style={sx("opacity:0;transform:translateY(46px);transition:opacity .7s,transform .7s;text-align:center;margin-bottom:52px")}>
          <div style={sx("font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:var(--acc-lt);margin-bottom:12px")}>03 — Locales</div>
          <h2 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(40px,7vw,92px);line-height:.9;text-transform:uppercase")}>Encuentranos</h2>
        </div>
        <div className="ltb-2col" style={sx("display:grid;grid-template-columns:1fr 1fr;gap:22px")}>
          <div data-reveal="" style={sx("opacity:0;transform:translateY(46px);transition:opacity .7s,transform .7s;position:relative;border:1px solid rgba(246,241,233,.12);border-radius:20px;overflow:hidden;background:#0f0b08")} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgb(var(--acc) / .5)"; e.currentTarget.style.transform = "translateY(-6px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(246,241,233,.12)"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={sx("position:relative;height:200px;overflow:hidden")}>
              <iframe
                title="Mapa La Terracita Burger — Teatinos"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-4.48378,36.7216,-4.47578,36.7266&layer=mapnik&marker=36.7241,-4.47978"
                style={sx("display:block;width:100%;height:100%;border:0;pointer-events:none")}
                loading="lazy"
              />
              <a
                href="https://www.google.com/maps/search/?api=1&query=36.7241,-4.47978"
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir Teatinos en Google Maps"
                style={sx("position:absolute;inset:0;z-index:2;display:flex;align-items:flex-end;justify-content:flex-end;padding:12px;text-decoration:none")}
              >
                <span style={sx("font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:7px 12px;border-radius:100px;background:rgba(10,8,6,.8);color:#f6f1e9;border:1px solid rgba(246,241,233,.22);backdrop-filter:blur(4px)")}>Ver en Google Maps ↗</span>
              </a>
            </div>
            <div style={sx("padding:26px")}>
              <h3 style={sx("margin:0 0 6px;font-family:'Anton',sans-serif;font-weight:400;font-size:30px;text-transform:uppercase")}>Teatinos</h3>
              <p style={sx("margin:0 0 18px;font-size:14.5px;line-height:1.5;color:rgba(246,241,233,.72)")}>Av. Parménides 1<br />Málaga</p>
              <div style={sx("display:flex;flex-wrap:wrap;gap:12px")}>
                <a href="tel:628053065" style={sx("font-family:'Anton',sans-serif;font-size:16px;padding:12px 22px;border-radius:100px;background:rgb(var(--acc));color:#0a0806;text-decoration:none")}>628 053 065</a>
                <a href="https://maps.google.com/?q=Av.+Parménides+1+Málaga" target="_blank" rel="noreferrer" style={sx("font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:12px 22px;border-radius:100px;border:1px solid rgba(246,241,233,.25);color:#f6f1e9;text-decoration:none;display:inline-flex;align-items:center")}>Cómo llegar →</a>
              </div>
            </div>
          </div>
          <div data-reveal="" style={sx("opacity:0;transform:translateY(46px);transition:opacity .7s .08s,transform .7s .08s;position:relative;border:1px solid rgba(246,241,233,.12);border-radius:20px;overflow:hidden;background:#0f0b08")} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgb(var(--acc) / .5)"; e.currentTarget.style.transform = "translateY(-6px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(246,241,233,.12)"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={sx("position:relative;height:200px;overflow:hidden")}>
              <iframe
                title="Mapa La Terracita Burger — Rincón de la Victoria"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-4.27883,36.7114,-4.27083,36.7164&layer=mapnik&marker=36.71391,-4.27483"
                style={sx("display:block;width:100%;height:100%;border:0;pointer-events:none")}
                loading="lazy"
              />
              <a
                href="https://www.google.com/maps/search/?api=1&query=36.71391,-4.27483"
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir Rincón de la Victoria en Google Maps"
                style={sx("position:absolute;inset:0;z-index:2;display:flex;align-items:flex-end;justify-content:flex-end;padding:12px;text-decoration:none")}
              >
                <span style={sx("font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:7px 12px;border-radius:100px;background:rgba(10,8,6,.8);color:#f6f1e9;border:1px solid rgba(246,241,233,.22);backdrop-filter:blur(4px)")}>Ver en Google Maps ↗</span>
              </a>
            </div>
            <div style={sx("padding:26px")}>
              <h3 style={sx("margin:0 0 6px;font-family:'Anton',sans-serif;font-weight:400;font-size:30px;text-transform:uppercase")}>Rincón de la Victoria</h3>
              <p style={sx("margin:0 0 18px;font-size:14.5px;line-height:1.5;color:rgba(246,241,233,.72)")}>Av. del Mediterráneo 139<br />29730 · Rincón de la Victoria</p>
              <div style={sx("display:flex;flex-wrap:wrap;gap:12px")}>
                <a href="tel:622220826" style={sx("font-family:'Anton',sans-serif;font-size:16px;padding:12px 22px;border-radius:100px;background:rgb(var(--acc));color:#0a0806;text-decoration:none")}>622 220 826</a>
                <a href="https://maps.google.com/?q=Avenida+del+Mediterráneo+139+Rincón+de+la+Victoria" target="_blank" rel="noreferrer" style={sx("font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:12px 22px;border-radius:100px;border:1px solid rgba(246,241,233,.25);color:#f6f1e9;text-decoration:none;display:inline-flex;align-items:center")}>Cómo llegar →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery */}
      <Delivery />

      {/* CTA */}
      <section className="ltb-cv" style={sx("position:relative;z-index:2;padding:0 5vw 100px;max-width:1200px;margin:0 auto")}>
        <div data-reveal="" style={sx("opacity:0;transform:translateY(46px);transition:opacity .7s,transform .7s;position:relative;overflow:hidden;border-radius:28px;background:linear-gradient(135deg,rgb(var(--acc)),var(--acc-lt));padding:clamp(40px,6vw,72px);text-align:center")}>
          <div style={sx("position:absolute;top:-40%;left:50%;width:60%;height:180%;background:radial-gradient(circle,rgba(255,255,255,.35),transparent 60%);animation:ltb-drift 14s ease-in-out infinite")} />
          <h2 style={sx("position:relative;margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(34px,6vw,74px);line-height:.92;text-transform:uppercase;color:#0a0806")}>¿Con hambre?<br />No esperes más</h2>
          <p style={sx("position:relative;margin:18px auto 30px;max-width:460px;font-size:16.5px;line-height:1.5;color:rgba(10,8,6,.78);font-weight:500")}>Reserva mesa o pide para llevar. Te lo dejamos crujiente.</p>
          <div style={sx("position:relative;display:flex;flex-wrap:wrap;gap:14px;justify-content:center")}>
            <a ref={magC} href="tel:628053065" style={sx("font-family:'Anton',sans-serif;font-size:18px;padding:16px 34px;border-radius:100px;background:#0a0806;color:#f6f1e9;text-decoration:none;transition:transform .18s")}>LLAMAR A TEATINOS</a>
            <a ref={magD} href="tel:622220826" style={sx("font-family:'Anton',sans-serif;font-size:18px;padding:16px 34px;border-radius:100px;background:rgba(10,8,6,.12);color:#0a0806;text-decoration:none;border:2px solid rgba(10,8,6,.4);transition:transform .18s")}>LLAMAR A RINCÓN</a>
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer style={sx("position:relative;z-index:2;padding:70px 5vw 40px;border-top:1px solid rgba(246,241,233,.1)")}>
        <div style={sx("max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:40px")}>
          <div style={sx("max-width:320px")}>
            <div style={sx("display:flex;align-items:center;gap:12px;margin-bottom:16px")}>
              <LtbMark size={30} label="La Terracita Burger" style={{ color: "#f6f1e9" }} />
              <div style={sx("font-family:'Anton',sans-serif;font-size:18px;letter-spacing:.1em;line-height:1")}>LA TERRACITA<br /><span style={sx("font-size:11px;letter-spacing:.3em;color:var(--acc-lt)")}>BURGER · MEDITERRÁNEO</span></div>
            </div>
            <p style={sx("margin:0;font-size:14px;line-height:1.5;color:rgba(246,241,233,.68)")}>Smash burgers para volverte adicto 🔥</p>
          </div>
          <div style={sx("display:flex;gap:64px;flex-wrap:wrap")}>
            <div>
              <div style={sx("font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.72);margin-bottom:14px")}>Locales</div>
              <a href="tel:628053065" style={sx("display:block;color:#f6f1e9;text-decoration:none;font-weight:600;margin-bottom:8px")}>Teatinos · 628 053 065</a>
              <a href="tel:622220826" style={sx("display:block;color:#f6f1e9;text-decoration:none;font-weight:600")}>Rincón · 622 220 826</a>
            </div>
            <div>
              <div style={sx("font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.72);margin-bottom:14px")}>Síguenos</div>
              <a href={SITE.instagram} target="_blank" rel="noreferrer" style={sx("display:block;color:rgb(var(--acc));text-decoration:none;font-weight:700;margin-bottom:8px")}>Instagram →</a>
              <a href={SITE.facebook} target="_blank" rel="noreferrer" style={sx("display:block;color:#f6f1e9;text-decoration:none;font-weight:600")}>Facebook →</a>
            </div>
          </div>
        </div>
        <div style={sx("max-width:1200px;margin:44px auto 0;padding-top:22px;border-top:1px solid rgba(246,241,233,.08);display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;font-size:12px;color:rgba(246,241,233,.6)")}>
          <span>© 2026 La Terracita Burger · Málaga</span>
          <span style={sx("display:flex;flex-wrap:wrap;gap:12px")}>
            <a href="/aviso-legal" style={sx("color:rgba(246,241,233,.6)")}>Aviso legal</a>
            <a href="/privacidad" style={sx("color:rgba(246,241,233,.6)")}>Privacidad</a>
            <a href="/cookies" style={sx("color:rgba(246,241,233,.6)")}>Cookies</a>
          </span>
          <span>Angus Dry Age · 100% Mediterráneo</span>
        </div>
      </footer>
    </>
  );
}
