import { useState } from "react";
import { createPortal } from "react-dom";
import { sx } from "./sx";

// Burbuja flotante con la foto de un plato, junto al plato que la abrió.
// Va encima del plato si cabe y, si no, debajo; nunca se sale de la pantalla.
// La controla useBurbujaFoto(): aquí solo se pinta.

const MARGEN = 12; // distancia mínima a los bordes de la pantalla
const SEPARACION = 10; // entre el plato y la burbuja
const PIE = 40; // alto del pie con el nombre

export default function BurbujaFoto({ foto, nombre, rect, modo, x, onCerrar }) {
  const [cargada, setCargada] = useState(false);
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const ancho = Math.min(300, vw - MARGEN * 2);
  const altoFoto = Math.min(Math.round((ancho * foto.h) / foto.w), 320, vh - PIE - MARGEN * 4);
  const alto = altoFoto + PIE;

  const caeArriba = rect.top - SEPARACION - alto >= MARGEN;
  const caeAbajo = rect.bottom + SEPARACION + alto <= vh - MARGEN;
  const arriba = caeArriba || !caeAbajo;
  const top = arriba
    ? Math.max(MARGEN, rect.top - SEPARACION - alto)
    : rect.bottom + SEPARACION;
  const centro = x ?? rect.left + rect.width / 2;
  const left = Math.min(Math.max(MARGEN, centro - ancho / 2), vw - ancho - MARGEN);
  const flechaX = Math.min(Math.max(18, centro - left), ancho - 18);
  const deToque = modo === "toque";

  return createPortal(
    <div
      role="dialog"
      aria-label={nombre}
      onClick={deToque ? onCerrar : undefined}
      style={{
        ...sx("position:fixed;z-index:80;border-radius:16px;background:#120e0a;border:1px solid rgba(246,241,233,.16);box-shadow:0 18px 50px -12px rgba(0,0,0,.85);animation:ltb-burbuja .18s ease-out both"),
        top,
        left,
        width: ancho,
        transformOrigin: `${flechaX}px ${arriba ? "100%" : "0"}`,
        pointerEvents: deToque ? "auto" : "none", // con ratón no tapa el plato
      }}
    >
      <div style={{ ...sx("position:relative;overflow:hidden;border-radius:15px 15px 0 0;background:#1c1610"), height: altoFoto }}>
        <img
          src={foto.src}
          alt={nombre}
          width={foto.w}
          height={foto.h}
          decoding="async"
          onLoad={() => setCargada(true)}
          style={{ ...sx("display:block;width:100%;height:100%;object-fit:cover;transition:opacity .2s"), opacity: cargada ? 1 : 0 }}
        />
      </div>
      <div style={{ ...sx("display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 14px"), height: PIE }}>
        <span style={sx("font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.02em;text-transform:uppercase;color:#f6f1e9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{nombre}</span>
        {deToque && <span aria-hidden="true" style={sx("flex:none;font-size:15px;color:rgba(246,241,233,.55)")}>✕</span>}
      </div>
      {/* Flecha hacia el plato */}
      <span
        aria-hidden="true"
        style={{
          ...sx("position:absolute;width:12px;height:12px;background:#120e0a;transform:rotate(45deg)"),
          left: flechaX - 6,
          ...(arriba
            ? { bottom: -7, borderRight: "1px solid rgba(246,241,233,.16)", borderBottom: "1px solid rgba(246,241,233,.16)" }
            : { top: -7, background: "#1c1610", borderLeft: "1px solid rgba(246,241,233,.16)", borderTop: "1px solid rgba(246,241,233,.16)" }),
        }}
      />
    </div>,
    document.body
  );
}

// Botón con el icono de la cámara: indica que el plato tiene foto y la abre
// con teclado. Recibe las props de useBurbujaFoto().boton().
export function BotonFoto(props) {
  return (
    <button
      {...props}
      className="ltb-boton-foto"
      style={sx("flex:none;display:inline-grid;place-items:center;width:26px;height:26px;padding:0;border-radius:50%;border:1px solid rgba(246,241,233,.22);background:transparent;color:rgba(246,241,233,.7);cursor:pointer;vertical-align:middle")}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    </button>
  );
}
