import { useEffect, useRef, useState } from "react";
import { sx } from "./sx";

// A single scrolling marquee strip (horizontal or diagonal).
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

const A = ["La Terracita Burger", "🔥", "Smash burgers", "Angus Dry Age", "🖤"];
const B = ["Black Garlic", "Cheddar fundido", "100% Mediterráneo", "Pan de papa", "🔥"];
const C = ["Para volverte adicto", "Smash · Angus", "La Terracita", "🖤"];

export default function IntroSplash() {
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.style.overflow = "hidden";

    if (reduce) {
      timers.current.push(setTimeout(finish, 150));
      return cleanup;
    }
    timers.current.push(setTimeout(() => setLeaving(true), 1550)); // start exit
    timers.current.push(setTimeout(finish, 2300)); // remove after exit
    timers.current.push(setTimeout(finish, 3300)); // safety fallback
    return cleanup;

    function cleanup() {
      timers.current.forEach(clearTimeout);
      document.body.style.overflow = "";
    }
  }, []);

  function finish() {
    setShow(false);
    document.body.style.overflow = "";
  }

  const skip = () => {
    setLeaving(true);
    timers.current.push(setTimeout(finish, 700));
  };

  if (!show) return null;

  return (
    <div
      className={leaving ? "ltb-intro-exit" : ""}
      onClick={skip}
      style={sx("position:fixed;inset:0;z-index:1000;overflow:hidden;cursor:pointer;background:#0a0806")}
    >
      {/* Moving dividers — horizontal + diagonal */}
      <div style={sx("position:absolute;inset:0;pointer-events:none")}>
        <Strip items={A} top="8%" rot={0} dir="ltb-marq" dur={18} solid fontSize={24} />
        <Strip items={B} top="24%" rot={-9} dir="ltb-marq-r" dur={26} fontSize={40} opacity={0.9} />
        <Strip items={C} top="41%" rot={7} dir="ltb-marq" dur={30} fontSize={54} opacity={0.85} />
        <Strip items={B} top="60%" rot={-6} dir="ltb-marq-r" dur={24} fontSize={44} opacity={0.9} />
        <Strip items={A} top="76%" rot={5} dir="ltb-marq" dur={28} solid fontSize={22} opacity={0.95} />
        <Strip items={C} top="90%" rot={0} dir="ltb-marq-r" dur={20} fontSize={30} opacity={0.85} />
      </div>

      {/* Center brand */}
      <div style={sx("position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px")}>
        <div style={sx("position:absolute;top:50%;left:50%;width:min(96vw,720px);height:min(96vw,720px);transform:translate(-50%,-50%);background:radial-gradient(circle, #0a0806 34%, rgb(10 8 6 / .78) 52%, transparent 72%);pointer-events:none")} />
        <div style={sx("position:relative;display:flex;flex-direction:column;align-items:center;gap:20px")}>
          <img
            src="/logo-white.png"
            alt="La Terracita Burger"
            width="120"
            height="120"
            style={{ display: "block", width: "clamp(92px,20vw,128px)", height: "auto", animation: "ltb-rise .8s both, ltb-pulse 2.4s .8s ease-in-out infinite" }}
          />
          <h1 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;line-height:.86;letter-spacing:.01em;text-transform:uppercase")}>
            <span style={sx("display:block;font-size:clamp(38px,10vw,92px);animation:ltb-rise .9s .1s both")}>La Terracita</span>
            <span style={sx("display:block;font-size:clamp(38px,10vw,92px);color:rgb(var(--acc));text-shadow:0 0 44px rgb(var(--acc) / .6);animation:ltb-rise .9s .22s both,ltb-flicker 3.5s .8s infinite")}>Burger</span>
          </h1>
        </div>
      </div>
    </div>
  );
}
