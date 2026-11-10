// ─────────────────────────────────────────────────────────────────────────────
// HAMBURGUESA DEL MES — edita este archivo cada mes.
// Cambia el texto, los ingredientes y las fotos. Para las fotos: pon los .jpg
// nuevos en /assets-src/fotos y ejecuta `npm run optimize:images` para generar
// los .webp en /public/fotos, luego apunta img/img2 a esos .webp (y la
// precarga de index.html a img). La og:image y la foto de la Burger Especial
// en la carta salen solas de img al ejecutar el script.
//
// INGLÉS (opcional): los campos *En (tagEn, hookEn, ingredientsEn, closingEn,
// descEn) son la versión en inglés. Si los dejas vacíos se muestra el español,
// así que la web nunca se rompe si un mes no los traduces.
// ─────────────────────────────────────────────────────────────────────────────
export const BURGER_DEL_MES = {
  mes: "Noviembre",
  name: "La Piscina",
  tag: "Por tiempo limitado",
  tagEn: "Limited time",
  hook: "Una combinación que viene pisando fuerte 🧀🥓",
  hookEn: "A combo that's coming in strong 🧀🥓",
  ingredients: [
    { icon: "🧀", text: "Piscina de cheddar" },
    { icon: "🥩", text: "Doble smash de ternera Angus" },
    { icon: "🥓", text: "Bacon en cubos" },
    { icon: "🔥", text: "Salsa BBQ" },
    { icon: "🧅", text: "Cebolla crispy" },
    { icon: "🧀", text: "Y más cheddar" },
  ],
  ingredientsEn: [
    { icon: "🧀", text: "A pool of cheddar" },
    { icon: "🥩", text: "Double Angus smash patty" },
    { icon: "🥓", text: "Diced bacon" },
    { icon: "🔥", text: "BBQ sauce" },
    { icon: "🧅", text: "Crispy onion" },
    { icon: "🧀", text: "And more cheddar" },
  ],
  closing: "Disponible por tiempo limitado en nuestros dos locales: Rincón y Teatinos. ¿Te la vas a perder esta vez? 😏",
  closingEn: "Available for a limited time at both our restaurants: Rincón and Teatinos. Are you missing it this time? 😏",
  price: "", // opcional — se oculta si queda vacío
  // Precios en céntimos para poder pedirla online (aparece como "Burger
  // Especial" en /pedir). Ejemplo: { Simple: 1290, Doble: 1490 } o { u: 1490 }
  // para precio único. Déjalo en null y mostrará "Consulta" sin botón de pedir.
  precioCents: { u: 1390 },
  img: "/fotos/mes-la-piscina-1.webp",
  img2: "/fotos/mes-la-piscina-2.webp",
};
