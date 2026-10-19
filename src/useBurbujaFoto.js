import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Burbuja con la foto de un plato (la pinta <BurbujaFoto>).
//   - Con ratón: se abre al pasar por encima del plato y se cierra al salir.
//   - En el móvil: se abre al tocar el plato; se cierra tocando otra vez,
//     tocando fuera, al hacer scroll o con Escape.
//   - Con teclado / lector de pantalla: el botón de la cámara del plato.
// La foto solo se descarga cuando se abre la burbuja (o al empezar a pasar el
// ratón), así que una carta con muchas fotos no pesa más al cargar.
// ─────────────────────────────────────────────────────────────────────────────

const RETRASO_HOVER_MS = 120; // evita parpadeos al cruzar la carta con el ratón
const IGNORAR = "button, a, input, select, textarea, label"; // sus clics no abren la foto

export function useBurbujaFoto() {
  // { clave, foto, nombre, rect, modo, x } — x: dónde está el ratón o el dedo,
  // para que la burbuja salga junto a él y no en el centro de una fila ancha.
  const [abierta, setAbierta] = useState(null);
  const temporizador = useRef(null);
  const ultimoPuntero = useRef("");

  const cerrar = useCallback(() => {
    clearTimeout(temporizador.current);
    setAbierta(null);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  useEffect(() => {
    if (!abierta) return;
    const onKey = (e) => { if (e.key === "Escape") cerrar(); };
    // Tocar fuera del plato cierra (tocar el mismo plato lo gestiona su onClick).
    const onDown = (e) => {
      if (abierta.modo === "toque" && !e.target.closest?.(`[data-foto-fila="${abierta.clave}"]`)) cerrar();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", cerrar, { passive: true, capture: true });
    window.addEventListener("resize", cerrar);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", cerrar, { capture: true });
      window.removeEventListener("resize", cerrar);
    };
  }, [abierta, cerrar]);

  const abrir = (clave, foto, nombre, el, modo, x) =>
    setAbierta({ clave, foto, nombre, modo, x, rect: el.getBoundingClientRect() });

  const alternar = (clave, foto, nombre, el, modo, x) => {
    if (abierta?.clave === clave) cerrar();
    else abrir(clave, foto, nombre, el, modo, x);
  };

  // Props para el contenedor del plato. Sin foto, no hace nada.
  const fila = (clave, foto, nombre) => {
    if (!foto) return {};
    return {
      "data-foto-fila": clave,
      onPointerDown: (e) => { ultimoPuntero.current = e.pointerType; },
      onPointerEnter: (e) => {
        if (e.pointerType !== "mouse") return;
        new Image().src = foto.src; // empieza a bajarla durante el retraso
        const el = e.currentTarget;
        const x = e.clientX;
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => abrir(clave, foto, nombre, el, "hover", x), RETRASO_HOVER_MS);
      },
      onPointerLeave: (e) => {
        if (e.pointerType === "mouse") cerrar();
      },
      onClick: (e) => {
        const puntero = ultimoPuntero.current;
        ultimoPuntero.current = "";
        if (puntero === "mouse" || e.target.closest(IGNORAR)) return; // con ratón ya la abre el hover
        alternar(clave, foto, nombre, e.currentTarget, "toque", e.clientX || undefined);
      },
    };
  };

  // Props para el botón de la cámara (accesible con teclado y lector).
  const boton = (clave, foto, nombre, etiqueta = `Ver foto: ${nombre}`) => ({
    type: "button",
    "aria-label": etiqueta,
    "aria-expanded": abierta?.clave === clave,
    onClick: (e) => {
      e.stopPropagation();
      const el = e.currentTarget.closest("[data-foto-fila]") || e.currentTarget;
      alternar(clave, foto, nombre, el, "toque");
    },
  });

  return { abierta, cerrar, fila, boton };
}
