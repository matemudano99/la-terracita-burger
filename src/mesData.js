// ─────────────────────────────────────────────────────────────────────────────
// HAMBURGUESA DEL MES — edita este archivo cada mes.
// Cambia el texto, los ingredientes y las fotos. Para las fotos: pon los .jpg
// nuevos en /assets-src/fotos y ejecuta `npm run optimize:images` para generar
// los .webp en /public/fotos, luego apunta img/img2 a esos .webp.
//
// INGLÉS (opcional): los campos *En (tagEn, hookEn, ingredientsEn, closingEn,
// descEn) son la versión en inglés. Si los dejas vacíos se muestra el español,
// así que la web nunca se rompe si un mes no los traduces.
// ─────────────────────────────────────────────────────────────────────────────
export const BURGER_DEL_MES = {
  mes: "Septiembre",
  name: "Black Mirror",
  tag: "Edición limitada",
  tagEn: "Limited edition",
  hook: "Hay burgers que no se pueden dejar de mirar 👀🍔",
  hookEn: "Some burgers you just can't stop looking at 👀🍔",
  ingredients: [
    { icon: "🥓", text: "Mermelada de bacon" },
    { icon: "🥓", text: "Crujiente de bacon" },
    { icon: "🥩", text: "2 smash de ternera Angus" },
    { icon: "🧀", text: "Cheddar" },
    { icon: "🧅", text: "Cebolla caramelizada" },
    { icon: "🍞", text: "Pan de patata" },
  ],
  ingredientsEn: [
    { icon: "🥓", text: "Bacon jam" },
    { icon: "🥓", text: "Crispy bacon" },
    { icon: "🥩", text: "2 Angus smash patties" },
    { icon: "🧀", text: "Cheddar" },
    { icon: "🧅", text: "Caramelised onion" },
    { icon: "🍞", text: "Potato bun" },
  ],
  closing: "Dulce, salado, crujiente y mucho sabor en cada mordisco 🤤",
  closingEn: "Sweet, savoury, crunchy and packed with flavour in every bite 🤤",
  price: "", // opcional — se oculta si queda vacío
  // Precios en céntimos para poder pedirla online (aparece como "Burger
  // Especial" en /pedir). Ejemplo: { Simple: 1290, Doble: 1490 } o { u: 1490 }
  // para precio único. Déjalo en null y mostrará "Consulta" sin botón de pedir.
  precioCents: { u: 1690 },
  img: "/fotos/mes-black-mirror-1.webp",
  img2: "/fotos/mes-black-mirror-2.webp",
};
