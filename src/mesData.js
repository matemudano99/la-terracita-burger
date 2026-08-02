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
  mes: "Julio",
  name: "Black Garlic",
  tag: "Edición limitada",
  tagEn: "Limited edition",
  hook: "Si eres de los que buscan algo diferente… acabas de encontrar tu burger 🖤🔥",
  hookEn: "If you're after something different… you've just found your burger 🖤🔥",
  ingredients: [
    { icon: "🥩", text: "2 smash de ternera Angus" },
    { icon: "🧀", text: "Cheddar" },
    { icon: "🍄", text: "Portobellos" },
    { icon: "🧅", text: "Cebolla morada" },
    { icon: "🥬", text: "Canónigos" },
    { icon: "🖤", text: "Salsa de ajo negro" },
  ],
  ingredientsEn: [
    { icon: "🥩", text: "2 Angus smash patties" },
    { icon: "🧀", text: "Cheddar" },
    { icon: "🍄", text: "Portobello mushrooms" },
    { icon: "🧅", text: "Red onion" },
    { icon: "🥬", text: "Lamb's lettuce" },
    { icon: "🖤", text: "Black garlic sauce" },
  ],
  closing: "Potencia, cremosidad y un sabor profundo que engancha desde el primer bocado 🤤",
  closingEn: "Bold, creamy and deeply savoury — hooked from the first bite 🤤",
  price: "", // opcional — se oculta si queda vacío
  // Precios en céntimos para poder pedirla online (aparece como "Burger
  // Especial" en /pedir). Ejemplo: { Simple: 1290, Doble: 1490 } o { u: 1490 }
  // para precio único. Déjalo en null y mostrará "Consulta" sin botón de pedir.
  precioCents: { u: 1690 },
  img: "/fotos/mes-black-garlic-1.webp",
  img2: "/fotos/mes-black-garlic-2.webp",
};
