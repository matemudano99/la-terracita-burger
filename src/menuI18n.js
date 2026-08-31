// ─────────────────────────────────────────────────────────────────────────────
// Traducción al inglés de la carta. src/menu.js sigue siendo la fuente única
// (precios y textos en español); aquí solo están sus equivalentes en inglés.
//
// Cómo mantenerlo: si añades un plato a src/menu.js y no lo traduces aquí, en
// inglés se muestra el texto en español (nunca se rompe ni queda vacío).
// Los nombres propios (Cheeseburger, Paquito, Oklahoma…) no se traducen.
// ─────────────────────────────────────────────────────────────────────────────
import { MENU, displayCats } from "./menu";

// Categorías: etiqueta y nota.
const CAT_EN = {
  smash: {
    label: "Smash Burgers",
    nota: "Each patty is 100 g of dry-aged Angus beef. All burgers include a classic sauce of your choice and fries.",
  },
  camperos: {
    label: "Camperos",
    nota: "Toasted local-style sandwiches. All include a classic sauce of your choice and fries.",
  },
  entrantes: {
    label: "Starters",
    nota: "All starters include a classic sauce of your choice — tell us which one in the notes.",
  },
  infantil: { label: "Kids' menu" },
  salsas: {
    label: "Sauces",
    nota: "Burgers, camperos and starters already include one classic sauce — these are extra ones.",
  },
  postres: { label: "Desserts", nota: "*Ask us about other desserts available." },
  bebidas: { label: "Drinks" },
  extras: {
    label: "Extras",
    nota: "To add to burgers and camperos — when ordering online you choose them inside each item.",
  },
};

// Platos: nombre (solo si cambia) y descripción.
const ITEM_EN = {
  // Smash Burgers
  cheeseburger: { desc: "Dry-aged Angus smash beef, potato bun and melted cheddar + fries." },
  classic: { desc: "Angus smash beef, melted cheddar, lettuce, tomato, onion and pickles + fries." },
  veggie: { desc: "Veggie smash patty, tomato, lettuce and guacamole + fries." },
  yankee: { desc: "Angus smash beef, melted cheddar, bacon, crispy onion and BBQ sauce + fries." },
  mexican: { desc: "Angus smash beef, melted cheddar, guacamole, applewood-smoked bacon, hot sauce and a cheddar shot + fries." },
  derrumbe: { desc: "Angus smash beef, melted cheddar, bacon, onion rings and cheddar landslide sauce + fries." },
  "chicken-little": { desc: "Crispy chicken fillet, lettuce, tomato and house aioli + fries." },
  "la-terracita": { desc: "Angus smash beef, goat cheese, mushrooms, caramelised onion and honey-mustard sauce + fries." },
  oklahoma: { desc: "Double Angus smash beef, butter-fried onion, 4 slices of melted cheddar and house sauce + fries." },
  "jack-burger": { desc: "Double Angus smash beef, melted cheddar, smoked bacon, whisky-caramelised onion and Jack Daniel's sauce + fries." },
  "teke-burger": { desc: "Double Angus smash beef, melted cheddar, smoked bacon, tomato, tartare sauce and ketchup, topped with a cheese-filled tequeño + fries." },

  // Camperos
  paquito: { desc: "Ham, melted cheese, lettuce, tomato, onion and homemade aioli + fries." },
  pepita: { desc: "Ham, crispy chicken, melted cheese, lettuce, tomato and house aioli + fries." },
  manolito: { desc: "Dry-aged Angus smash beef, melted cheese, lettuce, tomato, onion and mayo + fries." },
  martita: { desc: "Dry-aged Angus smash beef, honey mustard, goat cheese, caramelised onion and mushrooms + fries." },

  // Entrantes
  aros: { name: "Onion rings", desc: "Battered onion rings, crispy outside and tender inside." },
  boniatos: { name: "Sweet potato fries", desc: "Golden, sweet and crispy sweet potato sticks." },
  "boniatos-oklahoma": { name: 'Sweet potato fries "Oklahoma"', desc: "Sweet potato fries with crispy smoked bacon, caramelised onion and house sauce." },
  "chicken-fingers": { name: "Chicken fingers", desc: "American-style battered chicken strips, extra crispy." },
  croquetas: { name: "Angus croquettes", desc: "Gourmet Angus beef croquettes, crispy outside and creamy inside." },
  mix: { name: "Starter platter", desc: "Chicken fingers + nachos + cheddar & bacon fries + tequeños + onion rings + sauces." },
  "nachos-cheddar": { name: "Nachos with cheddar & bacon", desc: "Toasted corn chips, melted cheddar and crispy bacon." },
  "nachos-guacamole": { name: "Nachos with cheddar & guacamole", desc: "Toasted corn chips, melted cheddar and guacamole." },
  "nachos-pulled": { name: "Pulled pork nachos", desc: "Cheddar, guacamole, sour cream, pico de gallo and chipotle pulled pork." },
  "nachos-chili": { name: "Chili con carne nachos", desc: "Cheddar, guacamole, sour cream, pico de gallo and chili con carne." },
  patatas: { name: "Fries", desc: "Classic and crispy." },
  "patatas-cheddar": { name: "Cheddar & bacon fries", desc: "Topped with melted cheddar and smoked bacon." },
  tequenos: { name: "Tequeños", desc: "Cheese sticks wrapped in crispy dough." },

  // Menú infantil
  "infantil-nuggets": { name: "Nuggets + fries", desc: "Tender, crispy chicken nuggets with fries and a sauce of your choice." },
  "infantil-cheese": { name: "Cheeseburger + fries", desc: "A simple cheeseburger for the little ones, with fries." },

  // Salsas
  "salsa-arandanos": { name: "Cranberry", desc: "Classic sauce." },
  "salsa-alioli": { name: "Aioli", desc: "Classic sauce." },
  "salsa-barbacoa": { name: "BBQ", desc: "Classic sauce." },
  "salsa-ketchup": { name: "Ketchup", desc: "Classic sauce." },
  "salsa-mayonesa": { name: "Mayo", desc: "Classic sauce." },
  "salsa-mostaza": { name: "Mustard", desc: "Classic sauce." },
  "salsa-mostaza-miel": { name: "Honey mustard", desc: "Classic sauce." },
  "salsa-picante": { name: "Hot sauce", desc: "Classic sauce." },
  "salsa-cheddar": { name: "Cheddar", desc: "Special sauce." },
  "salsa-mango-curry": { name: "Mango & curry", desc: "Special sauce." },
  "salsa-trufada": { name: "Truffle mayo", desc: "Special sauce." },
  "salsa-casa": { name: "House sauce", desc: "Special sauce." },
  "salsa-baconnaise": { name: "Smokey baconnaise", desc: "Special sauce." },
  "salsa-chili-dulce": { name: "Sweet chili sauce", desc: "Special sauce." },

  // Postres
  chocotorta: { desc: "Layers of chocolate biscuits, dulce de leche mousse and cream cheese." },
  "tarta-oreo": { name: "Oreo cheesecake", desc: "White chocolate cheesecake on a crunchy Oreo base, with biscuit pieces." },
  "tarta-pistacho": { name: "Pistachio cheesecake", desc: "Creamy cheesecake with real pistachio paste on a crunchy base." },

  // Bebidas
  "agua-sin-gas": { name: "Still water", desc: "33 cl." },
  "agua-con-gas": { name: "Sparkling water", desc: "33 cl." },
  "lata-refresco": { name: "Soft drink (can)", desc: "33 cl · to go." },
  "cruzcampo-lata": { name: "Cruzcampo (can)", desc: "33 cl · to go · 18+." },
  "amstel-lata": { name: "Amstel (can)", desc: "33 cl · to go · 18+." },
  "refresco-vaso": { name: "Soft drinks 35 cl", desc: "Full range, in-restaurant." },
  "cerveza-barril": { name: "Draught beer", desc: "Perfectly poured, in-restaurant." },
  "clara-barril": { name: "Shandy (draught)", desc: "With its citrus twist, in-restaurant." },
  "alhambra-especial": { name: "Alhambra Especial", desc: "In-restaurant." },
  "alhambra-reserva": { name: "Alhambra Reserva", desc: "Full-bodied lager, in-restaurant." },
  "alhambra-sin": { name: "Alhambra alcohol-free", desc: "In-restaurant." },
  mahou: { desc: "In-restaurant." },
  "mahou-sin-gluten": { name: "Mahou gluten-free", desc: "In-restaurant." },
  "mahou-sin-alcohol": { name: "Mahou alcohol-free", desc: "In-restaurant." },
  corona: { desc: "With a wedge of lime, in-restaurant." },
  vino: { name: "Glass of wine", desc: "In-restaurant." },
  "tinto-verano": { name: "Tinto de verano", desc: "Red wine with soda, in-restaurant." },
  fernet: { desc: "For the brave, in-restaurant." },

  // Extras (la categoría se genera desde EXTRAS de menu.js)
  "extra-aros": { name: "Onion rings" },
  "extra-bacon": { name: "Bacon" },
  "extra-medallon-extra": { name: "Extra patty (beef, veggie or chicken)" },
  "extra-cambio-medallon": { name: "Swap patty for chicken or veggie" },
  "extra-cebolla-natural": { name: "Fresh onion" },
  "extra-cebolla-caramelizada": { name: "Caramelised onion" },
  "extra-cebolla-crispy": { name: "Crispy onion" },
  "extra-cheddar-loncha": { name: "Cheddar slice" },
  "extra-derrumbe": { name: "Cheddar landslide sauce" },
  "extra-guacamole": { name: "Guacamole" },
  "extra-huevo": { name: "Fried egg" },
  "extra-jeringa": { name: "Cheddar shot" },
  "extra-lechuga": { name: "Lettuce" },
  "extra-pepinillos": { name: "Pickles" },
  "extra-queso-cabra": { name: "Goat cheese" },
  "extra-setas": { name: "Mushrooms" },
  "extra-tomate": { name: "Tomato" },
  "extra-guantes": { name: "Gloves" },
};

// Etiquetas de variante (Simple, Ración, Cañita…) y de distintivo (Picante…).
const VARIANTE_EN = {
  Simple: "Single",
  Doble: "Double",
  Media: "Half",
  Ración: "Full",
  Tinto: "Red",
  Blanco: "White",
  Cañita: "Small",
  Copa: "Glass",
  "Jarra / Tanque": "Pint / Stein",
  "Fanta Naranja": "Fanta Orange",
  "Nestea Limón": "Nestea Lemon",
  "Fuze Tea Maracuyá": "Fuze Tea Passion Fruit",
  "Aquarius Limón": "Aquarius Lemon",
  "Aquarius Naranja": "Aquarius Orange",
};

const TAG_EN = {
  Veggie: "Veggie",
  Picante: "Spicy",
  "La Casa": "House",
  Top: "Top",
  "Para compartir": "To share",
  Especial: "Special",
  Nuevo: "New",
  "Del mes": "Of the month",
};

// Opciones de /pedir (acompañamiento, pan y extras) — por texto exacto, que es
// como llegan desde UPGRADES / PANES / EXTRAS de src/menu.js.
const OPCION_EN = {
  // Acompañamiento y pan
  "Patatas fritas (incluidas)": "Fries (included)",
  "Cambiar a boniatos fritos": "Swap for sweet potato fries",
  "Patatas con cheddar y bacon": "Cheddar & bacon fries",
  "Pan de patata (incluido)": "Potato bun (included)",
  "Pan sin gluten brioche (posible contaminación cruzada)": "Gluten-free brioche bun (possible cross-contamination)",
  // Extras
  "Aros de cebolla": "Onion rings",
  Bacon: "Bacon",
  "Medallón extra (ternera, veggie o pollo)": "Extra patty (beef, veggie or chicken)",
  "Cambiar medallón a pollo o veggie": "Swap patty for chicken or veggie",
  "Cebolla natural": "Fresh onion",
  "Cebolla caramelizada": "Caramelised onion",
  "Cebolla crispy": "Crispy onion",
  "Cheddar loncha": "Cheddar slice",
  "Derrumbe de cheddar": "Cheddar landslide sauce",
  Guacamole: "Guacamole",
  Huevo: "Fried egg",
  "Jeringa de cheddar": "Cheddar shot",
  Lechuga: "Lettuce",
  Pepinillos: "Pickles",
  "Queso de cabra": "Goat cheese",
  Setas: "Mushrooms",
  Tomate: "Tomato",
  Guantes: "Gloves",
};

// Nombre de un plato por id, en el idioma pedido (para el carrito, donde el
// nombre llega ya calculado en español desde priceLine).
export function nombreItem(itemId, idioma, fallback) {
  if (idioma !== "en") return fallback;
  return ITEM_EN[itemId]?.name || fallback;
}

// Traduce una etiqueta suelta (variante, distintivo u opción).
export const tEtiqueta = (txt, idioma) =>
  idioma === "en" ? VARIANTE_EN[txt] || TAG_EN[txt] || OPCION_EN[txt] || txt : txt;

// Precio al formato inglés: "16,90 €" → "€16.90" (y "Consulta" → "Ask us").
export function precioEn(txt) {
  const m = /^(\d+),(\d{2})\s*€$/.exec(String(txt).trim());
  if (m) return `€${m[1]}.${m[2]}`;
  return txt === "Consulta" ? "Ask us" : txt;
}

// MENU para /pedir en el idioma pedido: conserva la estructura completa
// (variants con céntimos, flags upgrades/extras/panes…) y solo traduce los
// textos. NO usar cartaEn() aquí: esa devuelve precios ya formateados.
export function menuPedir(idioma, menu = MENU) {
  if (idioma !== "en") return menu;
  return menu.map((cat) => ({
    ...cat,
    label: CAT_EN[cat.id]?.label || cat.label,
    nota: CAT_EN[cat.id]?.nota ?? cat.nota,
    items: cat.items.map((it) => {
      const tr = ITEM_EN[it.id] || {};
      return {
        ...it,
        // Lo escrito en /admin manda sobre el diccionario; si no hay inglés,
        // se ve el español (nunca queda un hueco).
        name: it.nameEn || tr.name || it.name,
        desc: it.descEn ?? tr.desc ?? it.desc,
        tag: it.tag ? TAG_EN[it.tag] || it.tag : it.tag,
        priceLabel: it.priceLabel === "Consulta" ? "Ask us" : it.priceLabel,
      };
    }),
  }));
}

// Carta lista para pintar (solo lectura), en el idioma pedido.
export function cartaEn(idioma, precios, menu) {
  const cats = displayCats(precios, menu);
  if (idioma !== "en") return cats;
  return cats.map((cat) => ({
    ...cat,
    label: CAT_EN[cat.id]?.label || cat.label,
    nota: CAT_EN[cat.id]?.nota ?? cat.nota,
    items: cat.items.map((it) => {
      const tr = ITEM_EN[it.id] || {};
      return {
        ...it,
        name: it.nameEn || tr.name || it.name,
        desc: it.descEn ?? tr.desc ?? it.desc,
        tag: it.tag ? TAG_EN[it.tag] || it.tag : it.tag,
        rows: it.rows.map(([label, precio]) => [VARIANTE_EN[label] || label, precioEn(precio)]),
      };
    }),
  }));
}
