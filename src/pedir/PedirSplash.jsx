import { useEffect, useRef, useState } from "react";
import { sx } from "../sx";
import MarqueeBackdrop from "../MarqueeStrip";
import LtbMark from "../LtbMark";

// Splash breve al entrar en /pedir — mismo lenguaje visual que el intro de la
// portada pero más corto. Se muestra una vez por sesión (sessionStorage) y se
// puede saltar con un toque. Respeta prefers-reduced-motion.
const SS_KEY = "ltb_pedir_splash";

export function debeMostrarSplash() {
  try {
    return !sessionStorage.getItem(SS_KEY);
  } catch {
    return true;
  }
}

export default function PedirSplash({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    try { sessionStorage.setItem(SS_KEY, "1"); } catch { /* modo privado */ }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.style.overflow = "hidden";

    if (reduce) {
      timers.current.push(setTimeout(finish, 120));
    } else {
      timers.current.push(setTimeout(() => setLeaving(true), 1250)); // inicia salida
      timers.current.push(setTimeout(finish, 1980)); // retira tras la salida
      timers.current.push(setTimeout(finish, 3000)); // red de seguridad
    }
    const pendientes = timers.current;
    return () => {
      pendientes.forEach(clearTimeout);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    document.body.style.overflow = "";
    onDone();
  }

  const skip = () => {
    setLeaving(true);
    timers.current.push(setTimeout(finish, 700));
  };

  return (
    <div
      className={leaving ? "ltb-intro-exit" : ""}
      onClick={skip}
      aria-hidden="true"
      style={sx("position:fixed;inset:0;z-index:1000;overflow:hidden;cursor:pointer;background:#0a0806")}
    >
      <MarqueeBackdrop />

      <div style={sx("position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px")}>
        <div style={sx("position:absolute;top:50%;left:50%;width:min(96vw,720px);height:min(96vw,720px);transform:translate(-50%,-50%);background:radial-gradient(circle, #0a0806 34%, rgb(10 8 6 / .78) 52%, transparent 72%);pointer-events:none")} />
        <div style={sx("position:relative;display:flex;flex-direction:column;align-items:center;gap:16px")}>
          <div style={sx("font-size:clamp(46px,11vw,76px);line-height:1;animation:ltb-rise .6s both,ltb-float 3s .6s ease-in-out infinite")}>🍔</div>
          <div style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;line-height:.88;letter-spacing:.01em;text-transform:uppercase")}>
            <span style={sx("display:block;font-size:clamp(40px,10vw,88px);animation:ltb-rise .7s .08s both")}>¿Hambre?</span>
            <span style={sx("display:block;font-size:clamp(40px,10vw,88px);color:rgb(var(--acc));text-shadow:0 0 44px rgb(var(--acc) / .6);animation:ltb-rise .7s .2s both,ltb-flicker 3.5s .7s infinite")}>Pide y recoge</span>
          </div>
          <div style={sx("display:flex;align-items:center;gap:10px;font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:rgba(246,241,233,.6);animation:ltb-rise .7s .34s both")}>
            <LtbMark size={15} style={{ color: "rgb(var(--acc))" }} /> Sin comisiones · directo a cocina
          </div>
        </div>
      </div>
    </div>
  );
}
