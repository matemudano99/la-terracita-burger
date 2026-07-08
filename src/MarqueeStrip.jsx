// Animated marquee dividers — shared by the intro splash and the menu overlay
// so both look identical.

const A = ["La Terracita Burger", "🔥", "Smash burgers", "Angus Dry Age", "🖤"];
const B = ["Black Garlic", "Cheddar fundido", "100% Mediterráneo", "Pan de papa", "🔥"];
const C = ["Para volverte adicto", "Smash · Angus", "La Terracita", "🖤"];

function Strip({ items, rot = 0, top, dir = "ltb-marq", dur = 22, solid = false, fontSize = 26, opacity = 1 }) {
  const row = [...items, ...items];
  return (
    <div
      style={{
        position: "absolute",
        left: "-30vw",
        width: "160vw",
        top,
        transform: `rotate(${rot}deg)`,
        padding: solid ? "9px 0" : "6px 0",
        overflow: "hidden",
        opacity,
        background: solid ? "rgb(var(--acc))" : "transparent",
        borderTop: solid ? "1px solid rgb(var(--acc))" : "1px solid rgb(var(--acc) / .18)",
        borderBottom: solid ? "1px solid rgb(var(--acc))" : "1px solid rgb(var(--acc) / .18)",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "max-content",
          animation: `${dir} ${dur}s linear infinite`,
          fontFamily: "'Anton',sans-serif",
          fontSize: `${fontSize}px`,
          letterSpacing: ".04em",
          textTransform: "uppercase",
          color: solid ? "#0a0806" : "rgba(246,241,233,.16)",
          whiteSpace: "nowrap",
        }}
      >
        {row.map((t, i) => (
          <span key={i} style={{ padding: "0 24px" }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// Full-screen layer of moving dividers (horizontal + diagonal).
export default function MarqueeBackdrop() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <Strip items={A} top="8%" rot={0} dir="ltb-marq" dur={18} solid fontSize={24} />
      <Strip items={B} top="24%" rot={-9} dir="ltb-marq-r" dur={26} fontSize={40} opacity={0.9} />
      <Strip items={C} top="41%" rot={7} dir="ltb-marq" dur={30} fontSize={54} opacity={0.85} />
      <Strip items={B} top="60%" rot={-6} dir="ltb-marq-r" dur={24} fontSize={44} opacity={0.9} />
      <Strip items={A} top="76%" rot={5} dir="ltb-marq" dur={28} solid fontSize={22} opacity={0.95} />
      <Strip items={C} top="90%" rot={0} dir="ltb-marq-r" dur={20} fontSize={30} opacity={0.85} />
    </div>
  );
}
