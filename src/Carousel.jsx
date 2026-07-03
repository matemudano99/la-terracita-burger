import { useEffect, useState } from "react";
import { sx } from "./sx";

// Slides for the Historia carousel. Replace `bg` with a real photo by adding
// an `img` URL (e.g. img: "/fotos/smash.jpg") — it renders as a cover image.
const SLIDES = [
  { emoji: "🔥", caption: "Smash en la plancha ardiendo", bg: "radial-gradient(circle at 30% 30%,#ff5c28,transparent 60%),linear-gradient(140deg,#2a1608,#120b06)" },
  { emoji: "🧀", caption: "Cheddar fundido sobre Angus", bg: "radial-gradient(circle at 70% 40%,#ffc531,transparent 62%),linear-gradient(140deg,#241a06,#120b06)" },
  { emoji: "🍔", caption: "Bordes crujientes que enganchan", bg: "radial-gradient(circle at 50% 60%,#ff8a3d,transparent 60%),linear-gradient(140deg,#2a1408,#120b06)" },
];

export default function Carousel() {
  const [i, setI] = useState(0);
  const n = SLIDES.length;

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % n), 4200);
    return () => clearInterval(t);
  }, [n]);

  const go = (d) => setI((x) => (x + d + n) % n);

  const arrow = "position:absolute;top:50%;transform:translateY(-50%);z-index:3;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;border:1px solid rgba(246,241,233,.25);background:rgba(10,8,6,.55);backdrop-filter:blur(6px);color:#f6f1e9;font-size:20px;line-height:1;cursor:pointer;transition:background .2s,border-color .2s";

  return (
    <div style={sx("position:relative;width:100%;aspect-ratio:4/5;border-radius:20px;overflow:hidden;border:1px solid rgba(246,241,233,.1)")}>
      {SLIDES.map((s, idx) => (
        <div
          key={idx}
          style={{
            ...sx("position:absolute;inset:0;display:grid;place-items:center;text-align:center;gap:14px;padding:24px;transition:opacity .6s ease"),
            opacity: idx === i ? 1 : 0,
            background: s.img ? `url(${s.img}) center/cover no-repeat` : s.bg,
          }}
        >
          {!s.img && (
            <>
              <span style={sx("font-size:64px;line-height:1;filter:drop-shadow(0 6px 20px rgba(0,0,0,.5))")}>{s.emoji}</span>
              <span style={sx("font-family:'Anton',sans-serif;font-size:22px;letter-spacing:.03em;text-transform:uppercase;color:#f6f1e9;max-width:220px;line-height:1.05")}>{s.caption}</span>
            </>
          )}
        </div>
      ))}

      {/* Vignette for legibility */}
      <div style={sx("position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(10,8,6,.55));pointer-events:none;z-index:2")} />

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
      <div style={sx("position:absolute;bottom:16px;left:0;right:0;z-index:3;display:flex;justify-content:center;gap:9px")}>
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Ir a la imagen ${idx + 1}`}
            onClick={() => setI(idx)}
            style={{
              ...sx("width:9px;height:9px;border-radius:50%;border:0;padding:0;cursor:pointer;transition:all .25s"),
              width: idx === i ? "24px" : "9px",
              background: idx === i ? "rgb(var(--acc))" : "rgba(246,241,233,.4)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
