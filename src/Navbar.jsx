import { useEffect, useState } from "react";
import { sx } from "./sx";
import { SITE } from "./site";
import MarqueeBackdrop from "./MarqueeStrip";

const LINKS = [
  { href: "#del-mes", label: "Del mes" },
  { href: "#carta", label: "Carta" },
  { href: "#historia", label: "Historia" },
  { href: "#locales", label: "Locales" },
  { href: "#pedidos", label: "A domicilio" },
];

const IgIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5.5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
const FbIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M14 8.5V6.7c0-.8.2-1.2 1.3-1.2H17V2.3C16.5 2.2 15.5 2 14.4 2 11.9 2 10.3 3.5 10.3 6.3v2.2H7.5V12h2.8v9h3.4v-9h2.6l.4-3.5H14z" />
  </svg>
);

export default function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {/* Minimal floating bar — logo opens the menu */}
      <nav style={sx("position:fixed;top:0;left:0;right:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:18px clamp(16px,4vw,34px);pointer-events:none")}>
        <button
          className="ltb-logo-btn"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          style={sx("pointer-events:auto;display:grid;place-items:center;width:56px;height:56px;padding:0;border:0;border-radius:50%;cursor:pointer;background:#0a0806;box-shadow:0 6px 22px rgba(0,0,0,.5)")}
        >
          <img src="/logo-white.png" alt="La Terracita Burger — abrir menú" width="34" height="34" style={{ display: "block", width: "34px", height: "34px" }} />
        </button>

        <a
          href="#pedidos"
          className="ltb-pedir"
          style={sx("pointer-events:auto;font-family:'Anton',sans-serif;font-size:14px;letter-spacing:.06em;padding:12px 26px;border-radius:100px;background:rgb(var(--acc));color:#0a0806;text-decoration:none;box-shadow:0 0 18px rgb(var(--acc) / .45)")}
        >
          PEDIR
        </a>
      </nav>

      {/* Full-screen menu overlay */}
      {open && (
        <div className="ltb-menu" onClick={close} style={sx("position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:6px;text-align:center;padding:90px 24px 40px;overflow:hidden")}>
          {/* Moving dividers, same as the intro splash */}
          <MarqueeBackdrop />
          <div style={sx("position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 72% 62% at 50% 50%, rgb(10 8 6 / .93), rgb(10 8 6 / .55) 55%, transparent 82%)")} />

          <button aria-label="Cerrar menú" onClick={close} style={sx("position:absolute;top:22px;right:clamp(14px,4vw,32px);z-index:3;width:48px;height:48px;border-radius:50%;border:1px solid rgb(var(--acc) / .3);background:rgba(14,11,8,.5);color:#f6f1e9;font-size:22px;line-height:1;cursor:pointer")}>✕</button>

          <div onClick={(e) => e.stopPropagation()} style={sx("position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:2px")}>
            {LINKS.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                onClick={close}
                className="ltb-menu-link"
                style={{ ...sx("font-family:'Anton',sans-serif;font-size:clamp(34px,7.5vw,60px);letter-spacing:.01em;text-transform:uppercase;color:#f6f1e9;text-decoration:none;line-height:1.06;padding:4px 8px"), animation: "ltb-rise .5s both", animationDelay: `${0.05 + i * 0.06}s` }}
              >
                {l.label}
              </a>
            ))}

            <div style={{ ...sx("display:flex;align-items:center;gap:22px;margin-top:30px"), animation: "ltb-rise .5s both", animationDelay: "0.4s" }}>
              <a href={SITE.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="ltb-social"><IgIcon /></a>
              <a href={SITE.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="ltb-social"><FbIcon /></a>
            </div>
            <div style={{ ...sx("display:flex;flex-wrap:wrap;justify-content:center;gap:8px 22px;margin-top:16px;font-size:14px"), animation: "ltb-rise .5s both", animationDelay: "0.46s" }}>
              <a href={`tel:${SITE.phones.teatinos}`} style={sx("color:rgba(246,241,233,.7);text-decoration:none")}>Teatinos · 628 053 065</a>
              <a href={`tel:${SITE.phones.rincon}`} style={sx("color:rgba(246,241,233,.7);text-decoration:none")}>Rincón · 622 220 826</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
