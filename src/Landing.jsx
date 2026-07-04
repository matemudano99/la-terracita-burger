import { useEffect, useRef, useState } from "react";
import { sx } from "./sx";
import Navbar from "./Navbar";
import Carousel from "./Carousel";
import Delivery from "./Delivery";

const CATS = [
  {
    id: "smash",
    label: "Smash Burgers",
    items: [
      { name: "Cheeseburger", desc: "Smash de ternera + cheddar fundido.", rows: [["Simple", "9,90 €"], ["Doble", "11,90 €"]] },
      { name: "Classic", desc: "Smash de ternera + cheddar fundido + tomate + lechuga + cebolla + pepinillos.", rows: [["Simple", "10,90 €"], ["Doble", "12,90 €"]] },
      { name: "Veggie", desc: "Smash de medallón vegetariano + tomate + lechuga + guacamole.", tag: "Veggie", rows: [["Simple", "10,90 €"], ["Doble", "12,90 €"]] },
      { name: "Yankee", desc: "Smash + cheddar + bacon ahumado en madera de manzano + cebolla crispy + barbacoa.", rows: [["Simple", "11,90 €"], ["Doble", "13,90 €"]] },
      { name: "Mexican", desc: "Smash + guacamole + cheddar + bacon ahumado + cebolla + picante + jeringa de cheddar.", tag: "Picante", rows: [["Simple", "11,90 €"], ["Doble", "13,90 €"]] },
      { name: "Derrumbe", desc: "Smash + cheddar + bacon + aros de cebolla + salsa cheddar derrumbe.", rows: [["Simple", "13,00 €"], ["Doble", "15,00 €"]] },
      { name: "Chicken Little", desc: "Medallón de pollo crispy + lechuga + tomate + alioli.", rows: [["Simple", "13,40 €"], ["Doble", "15,40 €"]] },
      { name: "La Terracita", desc: "Smash + setas + queso de cabra + cebolla caramelizada + mostaza y miel.", tag: "La Casa", rows: [["Simple", "13,90 €"], ["Doble", "15,90 €"]] },
      { name: "Oklahoma", desc: "Doble smash + 4 lonchas de cheddar + cebolla en mantequilla + salsa de la casa.", rows: [["Doble", "15,90 €"]] },
      { name: "Jack Burger", desc: "Doble smash + cheddar + bacon + cebolla caramelizada con whisky + salsa Jack Daniels.", rows: [["Doble", "15,90 €"]] },
      { name: "Teke-Burger", desc: "Doble smash + cheddar + bacon + tomate + salsa tártara + ketchup + tapa de tequeño.", rows: [["Doble", "16,90 €"]] },
      { name: "Burger Especial", desc: "Consulta nuestra burger especial del momento.", tag: "Especial", rows: [["", "Consulta"]] },
    ],
  },
  {
    id: "camperos",
    label: "Camperos",
    items: [
      { name: "Paquito", desc: "Jamón cocido + queso + lechuga + tomate + cebolla + ali oli casero.", rows: [["", "7,90 €"]] },
      { name: "Pepita", desc: "Jamón cocido + pollo crispy + queso + lechuga + tomate + ali oli casero.", rows: [["", "11,00 €"]] },
      { name: "Manolito", desc: "Smash de ternera + queso + lechuga + tomate + cebolla + mayonesa.", rows: [["", "12,00 €"]] },
      { name: "Martita", desc: "Smash + mostaza y miel + queso de cabra + cebolla caramelizada + setas.", rows: [["", "13,00 €"]] },
    ],
  },
  {
    id: "entrantes",
    label: "Entrantes",
    items: [
      { name: "Aros de cebolla", desc: "Crujientes, con salsa clásica a elección.", rows: [["Media", "4,90 €"], ["Ración", "8,90 €"]] },
      { name: "Boniatos fritos", desc: "Dulces y crujientes.", rows: [["", "7,90 €"]] },
      { name: 'Boniatos "Oklahoma"', desc: "Bacon crujiente + cebolla caramelizada + salsa de la casa.", tag: "Top", rows: [["", "9,90 €"]] },
      { name: "Chicken fingers", desc: "Tiras de pollo crispy con salsa a elección.", rows: [["Media", "7,90 €"], ["Ración", "10,90 €"]] },
      { name: "Croquetas angus", desc: "Cremosas de carne Angus.", rows: [["", "10,90 €"]] },
      { name: "Mix de entrantes", desc: "Chicken fingers + nachos + patatas + tequeños + aros de cebolla + salsas.", tag: "Para compartir", rows: [["", "16,90 €"]] },
      { name: "Nachos cheddar y bacon", desc: "Nachos gratinados con cheddar y bacon.", rows: [["", "9,90 €"]] },
      { name: "Nachos pulled pork", desc: "Cheddar, guacamole, crema agria, pico de gallo y pulled pork con chipotle.", rows: [["", "11,90 €"]] },
      { name: "Patatas fritas", desc: "Clásicas o con cheddar y bacon (+2€).", rows: [["", "6,90 €"]] },
      { name: "Tequeños", desc: "Palitos de queso rebozados.", rows: [["Media", "7,90 €"], ["Ración", "10,90 €"]] },
    ],
  },
  {
    id: "postres",
    label: "Postres",
    items: [
      { name: "Chocotorta", desc: "Clásico argentino de galletas y dulce de leche.", rows: [["", "4,90 €"]] },
      { name: "Tarta de queso Oreo", desc: "Queso, chocolate blanco y galletas Oreo.", rows: [["", "4,90 €"]] },
      { name: "Tarta de queso pistacho", desc: "Cremosa con pistacho.", tag: "Nuevo", rows: [["", "4,90 €"]] },
    ],
  },
  {
    id: "bebidas",
    label: "Bebidas",
    items: [
      { name: "Cañita", desc: "La caña bien tirada.", rows: [["", "2,10 €"]] },
      { name: "Alhambra Reserva", desc: "Rubia con carácter.", rows: [["", "3,60 €"]] },
      { name: "Mahou", desc: "Clásica de barril.", rows: [["", "3,60 €"]] },
      { name: "Corona", desc: "Con su gajo de lima.", rows: [["", "4,00 €"]] },
      { name: "Copa de vino", desc: "Tinto o blanco.", rows: [["", "3,00 €"]] },
      { name: "Fernet", desc: "Para los valientes.", rows: [["", "7,50 €"]] },
      { name: "Refrescos", desc: "35cl, variedad completa.", rows: [["", "3,10 €"]] },
      { name: "Agua", desc: "Con o sin gas.", rows: [["", "2,50 €"]] },
    ],
  },
];

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
  const magA = useRef(null);
  const magB = useRef(null);
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
    const mags = [magA.current, magB.current, magC.current, magD.current].filter(Boolean);
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
      {/* Ambient background blobs */}
      <div style={sx("position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden")}>
        <div style={sx("position:absolute;top:-10%;left:-5%;width:52vw;height:52vw;background:radial-gradient(circle,rgb(var(--acc) / .22),transparent 62%);filter:blur(20px);animation:ltb-drift 18s ease-in-out infinite")} />
        <div style={sx("position:absolute;bottom:-15%;right:-8%;width:46vw;height:46vw;background:radial-gradient(circle,rgb(var(--emb) / .14),transparent 62%);filter:blur(20px);animation:ltb-drift 22s ease-in-out infinite reverse")} />
      </div>

      {/* Cursor glow */}
      <div ref={glowRef} style={sx("position:fixed;top:0;left:0;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;background:radial-gradient(circle,rgb(var(--acc) / .18),transparent 60%);pointer-events:none;z-index:1;transition:transform .18s cubic-bezier(.2,.9,.2,1);mix-blend-mode:screen")} />

      {/* Nav */}
      <Navbar />

      {/* Hero */}
      <section id="top" style={sx("position:relative;z-index:2;min-height:100svh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:120px 5vw 40px")}>
        <div style={sx("display:inline-flex;align-items:center;gap:10px;padding:8px 16px;border:1px solid rgb(var(--acc) / .5);border-radius:100px;margin-bottom:34px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--acc-lt);animation:ltb-rise .8s both")}>
          <span style={sx("width:7px;height:7px;border-radius:50%;background:rgb(var(--acc));animation:ltb-pulse 1.6s infinite")} /> Smash Burger · Mediterráneo
        </div>
        <h1 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;line-height:.82;letter-spacing:-.01em;text-transform:uppercase")}>
          <span style={sx("display:block;font-size:clamp(56px,13vw,190px);animation:ltb-rise .9s .05s both")}>La Terracita</span>
          <span style={sx("display:block;font-size:clamp(56px,13vw,190px);color:rgb(var(--acc));text-shadow:0 0 44px rgb(var(--acc) / .55);animation:ltb-rise .9s .16s both,ltb-flicker 7s 2s infinite")}>Burger</span>
        </h1>
        <p style={sx("max-width:560px;margin:30px auto 0;font-size:clamp(17px,2.2vw,22px);line-height:1.45;color:rgba(246,241,233,.72);animation:ltb-rise .9s .28s both")}>
          Smash burgers para volverte <span style={sx("color:rgb(var(--emb));font-weight:700")}>adicto</span> 🔥 &nbsp;Medallón Angus Dry Age, cheddar fundido y patatas. Punto.
        </p>
        <div style={sx("display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-top:40px;animation:ltb-rise .9s .4s both")}>
          <a ref={magA} href="#carta" style={sx("font-family:'Anton',sans-serif;font-size:19px;letter-spacing:.06em;padding:17px 40px;border-radius:100px;background:rgb(var(--acc));color:#0a0806;text-decoration:none;box-shadow:0 12px 40px -8px rgb(var(--acc) / .7);transition:transform .18s")}>VER LA CARTA</a>
          <a ref={magB} href="#pedidos" style={sx("font-family:'Anton',sans-serif;font-size:19px;letter-spacing:.06em;padding:17px 40px;border-radius:100px;background:transparent;color:#f6f1e9;text-decoration:none;border:2px solid rgba(246,241,233,.25);transition:border-color .25s,transform .18s")}>RESERVAR / PEDIR</a>
        </div>
        <div style={sx("position:absolute;bottom:26px;left:50%;transform:translateX(-50%);font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(246,241,233,.4);display:flex;flex-direction:column;align-items:center;gap:8px")}>
          Scroll<span style={sx("width:1px;height:34px;background:linear-gradient(rgb(var(--acc) / .8),transparent)")} />
        </div>
      </section>

      {/* Marquee */}
      <div style={sx("position:relative;z-index:3;border-top:1px solid rgb(var(--acc) / .25);border-bottom:1px solid rgb(var(--acc) / .25);background:rgb(var(--acc));overflow:hidden;padding:14px 0")}>
        <div style={sx("display:flex;width:max-content;animation:ltb-marq 24s linear infinite;font-family:'Anton',sans-serif;font-size:24px;letter-spacing:.04em;color:#0a0806;text-transform:uppercase")}>
          <span style={sx("padding:0 26px")}>Smash burgers para volverte adicto 🔥</span><span style={sx("padding:0 26px")}>Angus Dry Age</span><span style={sx("padding:0 26px")}>100% Mediterráneo</span><span style={sx("padding:0 26px")}>Cheddar fundido</span><span style={sx("padding:0 26px")}>Smash burgers para volverte adicto 🔥</span><span style={sx("padding:0 26px")}>Angus Dry Age</span><span style={sx("padding:0 26px")}>100% Mediterráneo</span><span style={sx("padding:0 26px")}>Cheddar fundido</span>
        </div>
      </div>

      {/* Carta */}
      <section id="carta" style={sx("position:relative;z-index:2;padding:96px 5vw 80px;max-width:1240px;margin:0 auto")}>
        <div data-reveal="" style={sx("opacity:0;transform:translateY(46px);transition:opacity .7s,transform .7s")}>
          <div style={sx("font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:var(--acc-lt);margin-bottom:12px")}>01 — La Carta</div>
          <h2 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(40px,7vw,96px);line-height:.9;text-transform:uppercase")}>Elige tu <span style={sx("color:rgb(var(--acc));text-shadow:0 0 30px rgb(var(--acc) / .5)")}>vicio</span></h2>
        </div>

        <div style={sx("display:flex;flex-wrap:wrap;gap:12px;margin:44px 0 40px")}>
          {CATS.map((c) => {
            const active = c.id === activeCat;
            return (
              <button key={c.id} onClick={() => setActiveCat(c.id)} style={sx(tabStyle(active))}>
                {c.label}{" "}
                <span style={sx(`font-size:11px;padding:2px 7px;border-radius:100px;margin-left:2px;background:${active ? "rgba(10,8,6,.18)" : "rgba(246,241,233,.1)"};color:inherit`)}>{c.items.length}</span>
              </button>
            );
          })}
        </div>

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
                <p style={sx("margin:10px 0 0;font-size:13.5px;line-height:1.5;color:rgba(246,241,233,.6)")}>{item.desc}</p>
                <div style={sx("margin-top:16px;padding-top:14px;border-top:1px dashed rgba(246,241,233,.14);display:flex;flex-direction:column;gap:6px")}>
                  {item.rows.map((row, ri) => (
                    <div key={ri} style={sx("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
                      <span style={sx("font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,241,233,.45);font-weight:600")}>{row[0]}</span>
                      <span style={sx("flex:1;border-bottom:1px dotted rgba(246,241,233,.16);transform:translateY(-4px)")} />
                      <span style={sx("font-family:'Anton',sans-serif;font-size:20px;color:rgb(var(--acc))")}>{row[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p style={sx("margin:34px 0 0;font-size:12.5px;color:rgba(246,241,233,.42);text-align:center")}>Toda modificación en hamburguesas y camperos se cobra como extra. Conviértelas en boniatos o patatas deluxe por 1,90€ · con cheddar y bacon por 2,90€.</p>
      </section>

      {/* Marquee reverse */}
      <div style={sx("position:relative;z-index:3;background:#0d0a07;border-top:1px solid rgba(246,241,233,.08);border-bottom:1px solid rgba(246,241,233,.08);overflow:hidden;padding:12px 0")}>
        <div style={sx("display:flex;width:max-content;animation:ltb-marq-r 30s linear infinite;font-family:'Anton',sans-serif;font-size:22px;letter-spacing:.05em;color:rgba(246,241,233,.16);text-transform:uppercase")}>
          <span style={sx("padding:0 24px")}>★ Cheeseburger</span><span style={sx("padding:0 24px")}>★ Oklahoma</span><span style={sx("padding:0 24px")}>★ Jack Burger</span><span style={sx("padding:0 24px")}>★ La Terracita</span><span style={sx("padding:0 24px")}>★ Mexican</span><span style={sx("padding:0 24px")}>★ Derrumbe</span><span style={sx("padding:0 24px")}>★ Cheeseburger</span><span style={sx("padding:0 24px")}>★ Oklahoma</span><span style={sx("padding:0 24px")}>★ Jack Burger</span><span style={sx("padding:0 24px")}>★ La Terracita</span><span style={sx("padding:0 24px")}>★ Mexican</span><span style={sx("padding:0 24px")}>★ Derrumbe</span>
        </div>
      </div>

      {/* Historia */}
      <section id="historia" className="ltb-2col" style={sx("position:relative;z-index:2;padding:100px 5vw;max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center")}>
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
            <div><div ref={c1} data-count="12" style={sx("font-family:'Anton',sans-serif;font-size:46px;color:rgb(var(--acc));line-height:1")}>0</div><div style={sx("font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:rgba(246,241,233,.5)")}>Smash burgers</div></div>
            <div><div ref={c2} data-count="2" style={sx("font-family:'Anton',sans-serif;font-size:46px;color:rgb(var(--acc));line-height:1")}>0</div><div style={sx("font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:rgba(246,241,233,.5)")}>Locales en Málaga</div></div>
            <div><div ref={c3} data-count="100" data-suffix="%" style={sx("font-family:'Anton',sans-serif;font-size:46px;color:rgb(var(--acc));line-height:1")}>0</div><div style={sx("font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:rgba(246,241,233,.5)")}>Angus Dry Age</div></div>
          </div>
        </div>
        <div data-reveal="" style={sx("opacity:0;transform:translateY(46px);transition:opacity .7s .1s,transform .7s .1s;position:relative")}>
          <div style={sx("position:absolute;inset:-8% -8% -8% -8%;background:radial-gradient(circle,rgb(var(--acc) / .3),transparent 65%);filter:blur(30px);animation:ltb-pulse 5s infinite")} />
          <Carousel />
          <span style={sx("position:absolute;top:-18px;right:-10px;z-index:4;display:grid;place-items:center;width:100px;height:100px;border-radius:50%;background:rgb(var(--emb));color:#0a0806;font-family:'Anton',sans-serif;font-size:14px;text-align:center;line-height:1;text-transform:uppercase;transform:rotate(10deg);animation:ltb-float 6s ease-in-out infinite")}>Angus<br />Dry Age</span>
        </div>
      </section>

      {/* Locales */}
      <section id="locales" style={sx("position:relative;z-index:2;padding:60px 5vw 100px;max-width:1200px;margin:0 auto")}>
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
              <p style={sx("margin:0 0 18px;font-size:14.5px;line-height:1.5;color:rgba(246,241,233,.62)")}>Av. Parménides 1<br />Málaga</p>
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
              <p style={sx("margin:0 0 18px;font-size:14.5px;line-height:1.5;color:rgba(246,241,233,.62)")}>Av. del Mediterráneo 139<br />29730 · Rincón de la Victoria</p>
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
      <section style={sx("position:relative;z-index:2;padding:0 5vw 100px;max-width:1200px;margin:0 auto")}>
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

      {/* Footer */}
      <footer style={sx("position:relative;z-index:2;padding:70px 5vw 40px;border-top:1px solid rgba(246,241,233,.1)")}>
        <div style={sx("max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:40px")}>
          <div style={sx("max-width:320px")}>
            <div style={sx("display:flex;align-items:center;gap:12px;margin-bottom:16px")}>
              <span style={sx("display:grid;place-items:center;width:52px;height:52px;border-radius:50%;border:2px solid #f6f1e9;font-family:'Anton',sans-serif;font-size:21px;letter-spacing:.5px")}>LTB</span>
              <div style={sx("font-family:'Anton',sans-serif;font-size:18px;letter-spacing:.1em;line-height:1")}>LA TERRACITA<br /><span style={sx("font-size:11px;letter-spacing:.3em;color:var(--acc-lt)")}>BURGER · MEDITERRÁNEO</span></div>
            </div>
            <p style={sx("margin:0;font-size:14px;line-height:1.5;color:rgba(246,241,233,.55)")}>Smash burgers para volverte adicto 🔥</p>
          </div>
          <div style={sx("display:flex;gap:64px;flex-wrap:wrap")}>
            <div>
              <div style={sx("font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.45);margin-bottom:14px")}>Locales</div>
              <a href="tel:628053065" style={sx("display:block;color:#f6f1e9;text-decoration:none;font-weight:600;margin-bottom:8px")}>Teatinos · 628 053 065</a>
              <a href="tel:622220826" style={sx("display:block;color:#f6f1e9;text-decoration:none;font-weight:600")}>Rincón · 622 220 826</a>
            </div>
            <div>
              <div style={sx("font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,241,233,.45);margin-bottom:14px")}>Síguenos</div>
              <a href="https://instagram.com/laterracita.burger" target="_blank" rel="noreferrer" style={sx("display:inline-flex;align-items:center;gap:8px;color:rgb(var(--acc));text-decoration:none;font-weight:700")}>@laterracita.burger →</a>
            </div>
          </div>
        </div>
        <div style={sx("max-width:1200px;margin:44px auto 0;padding-top:22px;border-top:1px solid rgba(246,241,233,.08);display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;font-size:12px;color:rgba(246,241,233,.4)")}>
          <span>© 2026 La Terracita Burger · Málaga</span>
          <span>Angus Dry Age · 100% Mediterráneo</span>
        </div>
      </footer>
    </>
  );
}
