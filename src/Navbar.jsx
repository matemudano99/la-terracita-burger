import { useState } from "react";
import { sx } from "./sx";

const LINKS = [
  { href: "#del-mes", label: "Del mes" },
  { href: "#carta", label: "Carta" },
  { href: "#locales", label: "Locales" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav
      className="ltb-nav"
      style={sx("position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:40;width:min(1080px, calc(100% - 26px));display:flex;align-items:center;justify-content:space-between;gap:16px;padding:9px 10px 9px 18px;border-radius:100px;background:rgba(14,11,8,.55);backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px) saturate(1.3);border:1px solid rgb(var(--acc) / .22);box-shadow:0 10px 40px rgba(0,0,0,.45), 0 0 26px rgb(var(--acc) / .12), inset 0 1px 0 rgba(255,255,255,.06)")}
    >
      <a href="#del-mes" onClick={close} style={sx("display:flex;align-items:center;gap:11px;text-decoration:none;color:inherit")}>
        <img src="/logo-white.png" alt="La Terracita Burger" width="38" height="38" style={{ display: "block", width: "38px", height: "38px" }} />
        <span style={sx("font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.14em")}>LA TERRACITA</span>
      </a>

      {/* Desktop links */}
      <div className="ltb-nav-desktop" style={sx("display:flex;align-items:center;gap:26px")}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} className="ltb-navlink" style={sx("position:relative;font-weight:600;font-size:13.5px;letter-spacing:.07em;text-transform:uppercase;color:#f6f1e9;text-decoration:none;opacity:.85")}>
            {l.label}
          </a>
        ))}
        <a
          href="#pedidos"
          className="ltb-pedir"
          style={sx("font-family:'Anton',sans-serif;font-size:14px;letter-spacing:.06em;padding:10px 22px;border-radius:100px;background:rgb(var(--acc));color:#0a0806;text-decoration:none;box-shadow:0 0 18px rgb(var(--acc) / .5);transition:box-shadow .3s,transform .2s")}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgb(var(--acc) / .85)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 18px rgb(var(--acc) / .5)")}
        >
          PEDIR
        </a>
      </div>

      {/* Mobile hamburger */}
      <button
        className="ltb-burger"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        data-open={open}
        onClick={() => setOpen((o) => !o)}
        style={sx("display:none;place-items:center;gap:5px;width:42px;height:42px;border-radius:50%;border:1px solid rgb(var(--acc) / .3);background:rgba(10,8,6,.4);cursor:pointer")}
      >
        <span />
        <span />
        <span />
      </button>

      {/* Mobile dropdown */}
      <div className="ltb-nav-mobile" data-open={open} style={sx("display:none")}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={close} style={sx("font-family:'Anton',sans-serif;font-size:20px;letter-spacing:.04em;text-transform:uppercase;color:#f6f1e9;text-decoration:none;padding:11px 6px;border-bottom:1px solid rgba(246,241,233,.08)")}>
            {l.label}
          </a>
        ))}
        <a href="#pedidos" onClick={close} style={sx("margin-top:12px;text-align:center;font-family:'Anton',sans-serif;font-size:17px;letter-spacing:.06em;padding:14px;border-radius:100px;background:rgb(var(--acc));color:#0a0806;text-decoration:none;box-shadow:0 0 22px rgb(var(--acc) / .5)")}>
          PEDIR AHORA
        </a>
      </div>
    </nav>
  );
}
