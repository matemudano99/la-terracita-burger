// ─────────────────────────────────────────────────────────────────────────────
// Identidad visual de la carta: color e icono por CATEGORÍA (no por plato).
// Cada sección tiene su color, que tiñe el título, la pastilla de la barra
// superior y la franja lateral de cada plato — así se reconoce la sección de un
// vistazo al hacer scroll. Si añades una categoría nueva a src/menu.js y no la
// pones aquí, hereda valores por defecto: nunca se rompe nada.
// ─────────────────────────────────────────────────────────────────────────────

// Color de acento por categoría (RGB sin coma, para usar con rgb(... / alpha)).
export const COLOR_CAT = {
  smash: "255 197 49",
  camperos: "255 150 60",
  entrantes: "245 175 70",
  infantil: "130 210 165",
  salsas: "255 92 40",
  postres: "240 150 195",
  bebidas: "120 190 235",
  extras: "185 178 168",
};

// Icono por categoría.
const ICONO_CAT = {
  smash: "🍔",
  camperos: "🥪",
  entrantes: "🍟",
  infantil: "🧒",
  salsas: "🥫",
  postres: "🍰",
  bebidas: "🥤",
  extras: "➕",
};

export const iconoDe = (catId) => ICONO_CAT[catId] || "🍔";
export const colorDe = (catId) => COLOR_CAT[catId] || "255 197 49";
