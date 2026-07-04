import { useEffect, useRef, useState } from "react";
import { sx } from "./sx";

const LINKS = [
  { href: "#carta", label: "Carta" },
  { href: "#historia", label: "Historia" },
  { href: "#locales", label: "Locales" },
  { href: "#pedidos", label: "A domicilio" },
];

export default function Navbar() {
  const navRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const n = navRef.current;
      if (!n) return;
      const s = window.scrollY > 40 || open;
      n.style.background = s ? "rgba(10,8,6,.85)" : "transparent";
      n.style.backdropFilter = s ? "blur(14px)" : "none";
      n.style.borderColor = s ? "rgba(246,241,233,.1)" : "transparent";
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <nav ref={navRef} style={sx("position:fixed;top:0;left:0;right:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:14px 5vw;transition:background .3s,backdrop-filter .3s,border-color .3s;border-bottom:1px solid transparent")}>
      <a href="#top" onClick={close} style={sx("display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit")}>
        <span style={sx("display:grid;place-items:center;width:46px;height:46px;border-radius:50%;border:2px solid #f6f1e9;background:#0a0806;font-family:'Anton',sans-serif;font-size:19px;letter-spacing:.5px;line-height:1")}>LTB</span>
        <span style={sx("font-family:'Anton',sans-serif;font-size:17px;letter-spacing:.14em")}>LA TERRACITA</span>
      </a>

      {/* Desktop links */}
      <div className="ltb-nav-desktop" style={sx("display:flex;align-items:center;gap:30px")}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} className="ltb-navlink" style={sx("position:relative;font-weight:600;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:#f6f1e9;text-decoration:none;opacity:.8")}>
            {l.label}
          </a>
        ))}
        <a
          href="#pedidos"
          style={sx("font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.06em;padding:11px 22px;border-radius:100px;background:rgb(var(--acc));color:#0a0806;text-decoration:none;box-shadow:0 0 0 rgb(var(--acc) / .6);transition:box-shadow .3s,transform .2s")}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 26px rgb(var(--acc) / .8)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 rgb(var(--acc) / .6)")}
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
        style={sx("display:none;place-items:center;gap:5px;width:46px;height:46px;border-radius:12px;border:1px solid rgba(246,241,233,.2);background:rgba(10,8,6,.4);cursor:pointer")}
      >
        <span />
        <span />
        <span />
      </button>

      {/* Mobile dropdown */}
      <div className="ltb-nav-mobile" data-open={open} style={sx("display:none")}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={close} style={sx("font-family:'Anton',sans-serif;font-size:22px;letter-spacing:.04em;text-transform:uppercase;color:#f6f1e9;text-decoration:none;padding:12px 4px;border-bottom:1px solid rgba(246,241,233,.08)")}>
            {l.label}
          </a>
        ))}
        <a href="#pedidos" onClick={close} style={sx("margin-top:14px;text-align:center;font-family:'Anton',sans-serif;font-size:18px;letter-spacing:.06em;padding:15px;border-radius:100px;background:rgb(var(--acc));color:#0a0806;text-decoration:none")}>
          PEDIR AHORA
        </a>
      </div>
    </nav>
  );
}
