// ─────────────────────────────────────────────────────────────────────────────
// HAMBURGUESA DEL MES — edita este archivo cada mes.
// Cambia el texto, los ingredientes y las fotos. Para las fotos: pon los .jpg
// nuevos en /assets-src/fotos y ejecuta `npm run optimize:images` para generar
// los .webp en /public/fotos, luego apunta img/img2 a esos .webp.
// ─────────────────────────────────────────────────────────────────────────────
export const BURGER_DEL_MES = {
  mes: "Julio",
  name: "Black Garlic",
  tag: "Edición limitada",
  hook: "Si eres de los que buscan algo diferente… acabas de encontrar tu burger 🖤🔥",
  ingredients: [
    { icon: "🥩", text: "2 smash de ternera Angus" },
    { icon: "🧀", text: "Cheddar" },
    { icon: "🍄", text: "Portobellos" },
    { icon: "🧅", text: "Cebolla morada" },
    { icon: "🥬", text: "Canónigos" },
    { icon: "🖤", text: "Salsa de ajo negro" },
  ],
  closing: "Potencia, cremosidad y un sabor profundo que engancha desde el primer bocado 🤤",
  price: "", // opcional — se oculta si queda vacío
  img: "/fotos/mes-black-garlic-1.webp",
  img2: "/fotos/mes-black-garlic-2.webp",
};
