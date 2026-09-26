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
  name: "La Victoria",
  tag: "Edición limitada",
  tagEn: "Limited edition",
  hook: "Una nueva burger llega a La Terracita. Y viene con mucho que decir 👀🔥",
  hookEn: "A new burger lands at La Terracita. And it has plenty to say 👀🔥",
  ingredients: [
    { icon: "🥩", text: "2 smash de ternera Angus" },
    { icon: "🧀", text: "Queso provolone" },
    { icon: "🍆", text: "Salsa de berenjena ahumada" },
    { icon: "🍆", text: "Berenjena grillada" },
    { icon: "🥬", text: "Canónigos" },
    { icon: "🍞", text: "Pan de patata" },
  ],
  ingredientsEn: [
    { icon: "🥩", text: "2 Angus smash patties" },
    { icon: "🧀", text: "Provolone cheese" },
    { icon: "🍆", text: "Smoked aubergine sauce" },
    { icon: "🍆", text: "Grilled aubergine" },
    { icon: "🥬", text: "Lamb's lettuce" },
    { icon: "🍞", text: "Potato bun" },
  ],
  closing: "Intensa, cremosa y con ese toque ahumado que hace que cada bocado sea diferente 😋",
  closingEn: "Bold, creamy and with that smoky touch that makes every bite different 😋",
  price: "", // opcional — se oculta si queda vacío
  // Precios en céntimos para poder pedirla online (aparece como "Burger
  // Especial" en /pedir). Ejemplo: { Simple: 1290, Doble: 1490 } o { u: 1490 }
  // para precio único. Déjalo en null y mostrará "Consulta" sin botón de pedir.
  precioCents: { u: 1690 },
  img: "/fotos/mes-la-victoria-1.webp",
  img2: "/fotos/mes-la-victoria-2.webp",
};
