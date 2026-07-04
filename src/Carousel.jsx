import { useEffect, useState } from "react";
import { sx } from "./sx";

// Real LTB photos (in /public/fotos). Add or reorder freely.
const SLIDES = [
  { img: "/fotos/burger-bacon.jpg", caption: "Bacon, cheddar y bordes crujientes" },
  { img: "/fotos/burger-laterracita.jpg", caption: "La Terracita — setas y queso de cabra" },
  { img: "/fotos/burger-smash.jpg", caption: "Smash de Angus Dry Age" },
  { img: "/fotos/burger-couple.jpg", caption: "Para volverte adicto 🔥" },
];

export default function Carousel() {
  const [i, setI] = useState(0);
  const n = SLIDES.length;

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % n), 4200);
    return () => clearInterval(t);
  }, [n]);

  const go = (d) => setI((x) => (x + d + n) % n);

  const arrow = "position:absolute;top:50%;transform:translateY(-50%);z-index:4;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;border:1px solid rgba(246,241,233,.25);background:rgba(10,8,6,.55);backdrop-filter:blur(6px);color:#f6f1e9;font-size:20px;line-height:1;cursor:pointer;transition:background .2s,border-color .2s";

  return (
    <div style={sx("position:relative;width:100%;aspect-ratio:4/5;border-radius:20px;overflow:hidden;border:1px solid rgba(246,241,233,.1);background:#0a0806")}>
      {SLIDES.map((s, idx) => (
        <div
          key={idx}
          style={{
            ...sx("position:absolute;inset:0;transition:opacity .6s ease"),
            opacity: idx === i ? 1 : 0,
            background: `#0a0806 url(${s.img}) center/cover no-repeat`,
          }}
        />
      ))}

      {/* Vignette for legibility */}
      <div style={sx("position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,transparent 45%,rgba(10,8,6,.78));pointer-events:none")} />

      {/* Caption */}
      <div style={sx("position:absolute;left:20px;right:20px;bottom:44px;z-index:3;pointer-events:none")}>
        <span style={sx("font-family:'Anton',sans-serif;font-size:20px;letter-spacing:.02em;text-transform:uppercase;color:#f6f1e9;line-height:1.05;text-shadow:0 2px 12px rgba(0,0,0,.6)")}>
          {SLIDES[i].caption}
        </span>
      </div>

      <button
        aria-label="Anterior"
        onClick={() => go(-1)}
        style={sx(arrow + ";left:12px")}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(var(--acc))"; e.currentTarget.style.color = "#0a0806"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(10,8,6,.55)"; e.currentTarget.style.color = "#f6f1e9"; }}
      >
        ‹
      </button>
      <button
        aria-label="Siguiente"
        onClick={() => go(1)}
        style={sx(arrow + ";right:12px")}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(var(--acc))"; e.currentTarget.style.color = "#0a0806"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(10,8,6,.55)"; e.currentTarget.style.color = "#f6f1e9"; }}
      >
        ›
      </button>

      {/* Dots */}
      <div style={sx("position:absolute;bottom:16px;left:0;right:0;z-index:4;display:flex;justify-content:center;gap:9px")}>
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Ir a la imagen ${idx + 1}`}
            onClick={() => setI(idx)}
            style={{
              ...sx("height:9px;border-radius:50%;border:0;padding:0;cursor:pointer;transition:all .25s"),
              width: idx === i ? "24px" : "9px",
              borderRadius: idx === i ? "100px" : "50%",
              background: idx === i ? "rgb(var(--acc))" : "rgba(246,241,233,.5)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
