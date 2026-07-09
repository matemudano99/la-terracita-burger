import { useEffect, useRef, useState } from "react";
import { sx } from "./sx";
import MarqueeBackdrop from "./MarqueeStrip";

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
      aria-hidden="true"
      style={sx("position:fixed;inset:0;z-index:1000;overflow:hidden;cursor:pointer;background:#0a0806")}
    >
      {/* Moving dividers — horizontal + diagonal */}
      <MarqueeBackdrop />

      {/* Center brand */}
      <div style={sx("position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px")}>
        <div style={sx("position:absolute;top:50%;left:50%;width:min(96vw,720px);height:min(96vw,720px);transform:translate(-50%,-50%);background:radial-gradient(circle, #0a0806 34%, rgb(10 8 6 / .78) 52%, transparent 72%);pointer-events:none")} />
        <div style={sx("position:relative;display:flex;flex-direction:column;align-items:center;gap:20px")}>
          <img
            src="/logo-ltb-white.png"
            alt="La Terracita Burger"
            width="120"
            height="120"
            style={{ display: "block", width: "clamp(92px,20vw,128px)", height: "auto", animation: "ltb-rise .8s both, ltb-pulse 2.4s .8s ease-in-out infinite" }}
          />
          <div style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;line-height:.86;letter-spacing:.01em;text-transform:uppercase")}>
            <span style={sx("display:block;font-size:clamp(38px,10vw,92px);animation:ltb-rise .9s .1s both")}>La Terracita</span>
            <span style={sx("display:block;font-size:clamp(38px,10vw,92px);color:rgb(var(--acc));text-shadow:0 0 44px rgb(var(--acc) / .6);animation:ltb-rise .9s .22s both,ltb-flicker 3.5s .8s infinite")}>Burger</span>
          </div>
        </div>
      </div>
    </div>
  );
}
