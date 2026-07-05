// ─────────────────────────────────────────────────────────────────────────────
// HAMBURGUESA DEL MES — edita este archivo cada mes.
// Cambia el texto, los ingredientes y las rutas de foto (en /public/fotos).
// Si cambias `mes`, la intro neón vuelve a mostrarse a cada visitante.
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
  img: "/fotos/mes-black-garlic-1.jpg",
  img2: "/fotos/mes-black-garlic-2.jpg",
};
