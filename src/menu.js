// ─────────────────────────────────────────────────────────────────────────────
// CARTA — única fuente de verdad para la web (sección Carta), la página de
// pedidos (/pedir) y el backend (validación de precios en /api/orders).
// Precios en CÉNTIMOS para evitar errores de coma flotante.
// Para cambiar la carta, edita solo este archivo.
//
// Campos útiles:
//   - soloLocal: true   → aparece en la carta pero no se puede pedir online
//   - orderable: false  → aparece con "Consulta" (sin precio cerrado)
//   - soloCarta: true   → (categoría) solo se muestra en la carta de la web;
//                          en /pedir sus conceptos van dentro de cada producto
//   - notaHint          → placeholder del campo de notas en /pedir
//   - locales: [...]    → solo existe en esos locales (ids de src/locales.js);
//                          sin el campo, está en todos
// La Burger Especial se lee de src/mesData.js (la hamburguesa del mes).
// ─────────────────────────────────────────────────────────────────────────────
import { BURGER_DEL_MES } from "./mesData.js";
import { fotoDe } from "./fotosCarta.js";

// Acompañamiento — hamburguesas y camperos incluyen patatas fritas.
// `corto`/`cortoEn` son para la nota de la carta ("Convierte tus patatas en…");
// `locales` limita la opción a esos locales, como en los productos.
export const UPGRADES = [
  { id: "no", label: "Patatas fritas (incluidas)", cents: 0 },
  { id: "boniato", label: "Cambiar a boniatos fritos", corto: "boniatos", cortoEn: "sweet potato fries", cents: 190 },
  { id: "deluxe", label: "Cambiar a patatas deluxe", corto: "patatas deluxe", cortoEn: "deluxe fries", cents: 190, locales: ["teatinos"] },
  { id: "cheddar-bacon", label: "Patatas con cheddar y bacon", corto: "patatas con cheddar y bacon", cortoEn: "cheddar & bacon fries", cents: 290 },
];

// Pan — solo hamburguesas.
export const PANES = [
  { id: "patata", label: "Pan de patata (incluido)", cents: 0 },
  { id: "sin-gluten", label: "Pan sin gluten brioche (posible contaminación cruzada)", cents: 0 },
];

// Extras de ingredientes — hamburguesas y camperos.
export const EXTRAS = [
  { id: "aros", label: "Aros de cebolla", cents: 165 },
  { id: "bacon", label: "Bacon", cents: 150 },
  { id: "medallon-extra", label: "Medallón extra (ternera, veggie o pollo)", cents: 220 },
  { id: "cambio-medallon", label: "Cambiar medallón a pollo o veggie", cents: 100 },
  { id: "cebolla-natural", label: "Cebolla natural", cents: 70 },
  { id: "cebolla-caramelizada", label: "Cebolla caramelizada", cents: 100 },
  { id: "cebolla-crispy", label: "Cebolla crispy", cents: 150 },
  { id: "cheddar-loncha", label: "Cheddar loncha", cents: 90 },
  { id: "derrumbe", label: "Derrumbe de cheddar", cents: 150 },
  { id: "guacamole", label: "Guacamole", cents: 150 },
  { id: "huevo", label: "Huevo", cents: 150 },
  { id: "jeringa", label: "Jeringa de cheddar", cents: 150 },
  { id: "lechuga", label: "Lechuga", cents: 50 },
  { id: "pepinillos", label: "Pepinillos", cents: 90 },
  { id: "queso-cabra", label: "Queso de cabra", cents: 220 },
  { id: "setas", label: "Setas", cents: 110 },
  { id: "tomate", label: "Tomate", cents: 50 },
  { id: "guantes", label: "Guantes", cents: 30 },
];

const SALSA_HINT = "¿Qué salsa clásica quieres? (una incluida)";

// Burger del mes → ítem "Burger Especial". Pon precios en mesData.js
// (precioCents) para que se pueda pedir online; si no, muestra "Consulta".
const especial = {
  id: "burger-especial",
  name: BURGER_DEL_MES.name,
  tag: "Del mes",
  desc: BURGER_DEL_MES.ingredients.map((i) => i.text).join(" + ") + ".",
  notaHint: SALSA_HINT,
  ...(BURGER_DEL_MES.precioCents
    ? { variants: Object.entries(BURGER_DEL_MES.precioCents).map(([k, cents]) => ({ id: k.toLowerCase(), label: k === "u" ? "" : k[0].toUpperCase() + k.slice(1), cents })) }
    : { orderable: false, priceLabel: "Consulta" }),
};

export const MENU = [
  {
    id: "smash",
    label: "Smash Burgers",
    nota: "Cada medallón es de 100 g de ternera Angus Dry Age. Todas incluyen una salsa clásica a elección y patatas fritas.",
    upgrades: true,
    extras: true,
    panes: true,
    notaHint: SALSA_HINT,
    items: [
      { id: "cheeseburger", name: "Cheeseburger", desc: "Smash de ternera Angus Dry Age, pan de patata y cheddar fundido + patatas fritas.", variants: [{ id: "simple", label: "Simple", cents: 990 }, { id: "doble", label: "Doble", cents: 1190 }] },
      { id: "classic", name: "Classic", desc: "Smash de ternera, cheddar fundido, lechuga, tomate, cebolla y pepinillos + patatas fritas.", variants: [{ id: "simple", label: "Simple", cents: 1090 }, { id: "doble", label: "Doble", cents: 1290 }] },
      { id: "veggie", name: "Veggie", desc: "Medallón vegetariano smash, tomate, lechuga y guacamole + patatas fritas.", tag: "Veggie", variants: [{ id: "simple", label: "Simple", cents: 1090 }, { id: "doble", label: "Doble", cents: 1290 }] },
      { id: "yankee", name: "Yankee", desc: "Smash de ternera, cheddar fundido, bacon, cebolla crispy y salsa barbacoa + patatas fritas.", variants: [{ id: "simple", label: "Simple", cents: 1190 }, { id: "doble", label: "Doble", cents: 1390 }] },
      { id: "mexican", name: "Mexican", desc: "Smash de ternera, cheddar fundido, guacamole, bacon ahumado en madera de manzano, salsa picante y jeringa de cheddar + patatas fritas.", tag: "Picante", variants: [{ id: "simple", label: "Simple", cents: 1190 }, { id: "doble", label: "Doble", cents: 1390 }] },
      { id: "derrumbe", name: "Derrumbe", desc: "Smash de ternera, cheddar fundido, bacon, aros de cebolla y derrumbe de cheddar + patatas fritas.", variants: [{ id: "simple", label: "Simple", cents: 1300 }, { id: "doble", label: "Doble", cents: 1500 }] },
      { id: "chicken-little", name: "Chicken Little", desc: "Medallón de pollo crispy, lechuga, tomate y alioli de la casa + patatas fritas.", variants: [{ id: "simple", label: "Simple", cents: 1340 }, { id: "doble", label: "Doble", cents: 1540 }] },
      { id: "la-terracita", name: "La Terracita", desc: "Smash de ternera, queso de cabra, setas, cebolla caramelizada y salsa de mostaza y miel + patatas fritas.", tag: "La Casa", variants: [{ id: "simple", label: "Simple", cents: 1390 }, { id: "doble", label: "Doble", cents: 1590 }] },
      { id: "oklahoma", name: "Oklahoma", desc: "Doble smash de ternera, cebolla en mantequilla, 4 lonchas de cheddar fundido y salsa de la casa + patatas fritas.", variants: [{ id: "doble", label: "Doble", cents: 1590 }] },
      { id: "jack-burger", name: "Jack Burger", desc: "Doble smash de ternera, cheddar fundido, bacon ahumado, cebolla caramelizada con whisky y salsa Jack Daniels + patatas fritas.", variants: [{ id: "doble", label: "Doble", cents: 1590 }] },
      { id: "teke-burger", name: "Teke-Burger", desc: "Doble smash de ternera, cheddar fundido, bacon ahumado, tomate, salsa tártara y ketchup, con tapa de tequeño relleno de queso + patatas fritas.", variants: [{ id: "doble", label: "Doble", cents: 1690 }] },
      especial,
    ],
  },
  {
    id: "camperos",
    label: "Camperos",
    nota: "Todos incluyen una salsa clásica a elección y patatas fritas.",
    upgrades: true,
    extras: true,
    notaHint: SALSA_HINT,
    items: [
      { id: "paquito", name: "Paquito", desc: "Jamón york, queso fundido, lechuga, tomate, cebolla y alioli casero + patatas fritas.", variants: [{ id: "u", label: "", cents: 790 }] },
      { id: "pepita", name: "Pepita", desc: "Jamón york, pollo crispy, queso fundido, lechuga, tomate y alioli de la casa + patatas fritas.", variants: [{ id: "u", label: "", cents: 1100 }] },
      { id: "manolito", name: "Manolito", desc: "Carne Angus Dry Age smash, queso fundido, lechuga, tomate, cebolla y mayonesa + patatas fritas.", variants: [{ id: "u", label: "", cents: 1200 }] },
      { id: "martita", name: "Martita", desc: "Carne Angus Dry Age smash, mostaza y miel, queso de cabra, cebolla caramelizada y setas + patatas fritas.", variants: [{ id: "u", label: "", cents: 1300 }] },
    ],
  },
  {
    id: "entrantes",
    label: "Entrantes",
    nota: "Todos los entrantes incluyen una salsa clásica a elección — dinos cuál en las notas.",
    notaHint: SALSA_HINT,
    items: [
      { id: "aros", name: "Aros de cebolla", desc: "Crujientes por fuera y tiernos por dentro, rebozados.", variants: [{ id: "media", label: "Media", cents: 490 }, { id: "racion", label: "Ración", cents: 890 }] },
      { id: "boniatos", name: "Boniatos fritos", desc: "Bastones de boniato fritos, dorados, dulces y crujientes.", variants: [{ id: "u", label: "", cents: 790 }] },
      { id: "boniatos-oklahoma", name: 'Boniatos "Oklahoma"', desc: "Boniatos fritos con bacon ahumado crujiente, cebolla caramelizada y salsa de la casa.", tag: "Top", variants: [{ id: "u", label: "", cents: 990 }] },
      { id: "chicken-fingers", name: "Chicken fingers", desc: "Tiras de pollo rebozadas al estilo americano, ultra crujientes.", variants: [{ id: "media", label: "Media", cents: 790 }, { id: "racion", label: "Ración", cents: 1090 }] },
      { id: "croquetas", name: "Croquetas angus", desc: "Croquetas gourmet de carne Angus, crujientes por fuera y cremosas por dentro.", variants: [{ id: "u", label: "", cents: 1090 }] },
      { id: "mix", name: "Mix de entrantes", desc: "Chicken fingers + nachos + patatas con cheddar y bacon + tequeños + aros de cebolla + salsas.", tag: "Para compartir", variants: [{ id: "u", label: "", cents: 1690 }] },
      { id: "nachos-cheddar", name: "Nachos con cheddar y bacon", desc: "Tortas de maíz tostadas, cheddar fundido y bacon crujiente.", variants: [{ id: "u", label: "", cents: 990 }] },
      { id: "nachos-guacamole", name: "Nachos con cheddar y guacamole", desc: "Tortas de maíz tostadas, cheddar fundido y guacamole.", variants: [{ id: "u", label: "", cents: 990 }] },
      { id: "nachos-pulled", name: "Nachos pulled pork", desc: "Cheddar, guacamole, crema agria, pico de gallo y pulled pork con chipotle.", variants: [{ id: "u", label: "", cents: 1190 }] },
      { id: "nachos-chili", name: "Nachos chili con carne", desc: "Cheddar, guacamole, crema agria, pico de gallo y chili con carne.", variants: [{ id: "u", label: "", cents: 1190 }] },
      { id: "patatas", name: "Patatas fritas", desc: "Clásicas y crujientes.", variants: [{ id: "u", label: "", cents: 690 }] },
      { id: "patatas-cheddar", name: "Patatas con cheddar y bacon", desc: "Cubiertas de cheddar fundido y trozos de bacon ahumado.", variants: [{ id: "u", label: "", cents: 890 }] },
      { id: "tequenos", name: "Tequeños", desc: "Palitos de queso fundido envueltos en masa crujiente.", variants: [{ id: "media", label: "Media", cents: 790 }, { id: "racion", label: "Ración", cents: 1090 }] },
    ],
  },
  {
    id: "infantil",
    label: "Menú infantil",
    items: [
      { id: "infantil-nuggets", name: "Nuggets + patatas fritas", desc: "Nuggets de pollo tiernos y crujientes, con patatas fritas y salsa a elección.", notaHint: SALSA_HINT, variants: [{ id: "u", label: "", cents: 990 }] },
      { id: "infantil-cheese", name: "Cheeseburger + patatas fritas", desc: "Cheeseburger sencilla para los peques, con patatas fritas.", variants: [{ id: "u", label: "", cents: 990 }] },
    ],
  },
  {
    id: "salsas",
    label: "Salsas",
    nota: "Hamburguesas, camperos y entrantes incluyen una salsa clásica — estas son para repetir.",
    items: [
      { id: "salsa-arandanos", name: "Arándanos", desc: "Salsa clásica.", variants: [{ id: "u", label: "", cents: 90 }] },
      { id: "salsa-alioli", name: "Alioli", desc: "Salsa clásica.", variants: [{ id: "u", label: "", cents: 90 }] },
      { id: "salsa-barbacoa", name: "Barbacoa", desc: "Salsa clásica.", variants: [{ id: "u", label: "", cents: 90 }] },
      { id: "salsa-ketchup", name: "Ketchup", desc: "Salsa clásica.", variants: [{ id: "u", label: "", cents: 90 }] },
      { id: "salsa-mayonesa", name: "Mayonesa", desc: "Salsa clásica.", variants: [{ id: "u", label: "", cents: 90 }] },
      { id: "salsa-mostaza", name: "Mostaza", desc: "Salsa clásica.", variants: [{ id: "u", label: "", cents: 90 }] },
      { id: "salsa-mostaza-miel", name: "Mostaza y miel", desc: "Salsa clásica.", variants: [{ id: "u", label: "", cents: 90 }] },
      { id: "salsa-picante", name: "Picante", desc: "Salsa clásica.", variants: [{ id: "u", label: "", cents: 90 }] },
      { id: "salsa-cheddar", name: "Cheddar", desc: "Salsa especial.", tag: "Especial", variants: [{ id: "u", label: "", cents: 100 }] },
      { id: "salsa-mango-curry", name: "Mango y curry", desc: "Salsa especial.", tag: "Especial", variants: [{ id: "u", label: "", cents: 100 }] },
      { id: "salsa-trufada", name: "Mayonesa trufada", desc: "Salsa especial.", tag: "Especial", variants: [{ id: "u", label: "", cents: 100 }] },
      { id: "salsa-casa", name: "Salsa de la casa", desc: "Salsa especial.", tag: "Especial", variants: [{ id: "u", label: "", cents: 100 }] },
      { id: "salsa-baconnaise", name: "Smokey baconnaise", desc: "Salsa especial.", tag: "Especial", variants: [{ id: "u", label: "", cents: 100 }] },
      { id: "salsa-chili-dulce", name: "Salsa de chili dulce", desc: "Salsa especial.", tag: "Especial", variants: [{ id: "u", label: "", cents: 100 }] },
    ],
  },
  {
    id: "postres",
    label: "Postres",
    nota: "*Consulta por otros postres disponibles.",
    items: [
      { id: "chocotorta", name: "Chocotorta", desc: "Capas de galletas de chocolate, mousse de dulce de leche y queso crema.", variants: [{ id: "u", label: "", cents: 490 }] },
      { id: "tarta-oreo", name: "Tarta de queso Oreo", desc: "Tarta de queso de chocolate blanco sobre base crujiente de Oreo, con trocitos de galleta.", variants: [{ id: "u", label: "", cents: 490 }] },
      { id: "tarta-pistacho", name: "Tarta de queso pistacho", desc: "Cheesecake cremosa con auténtica pasta de pistacho sobre base crujiente.", tag: "Nuevo", variants: [{ id: "u", label: "", cents: 490 }] },
    ],
  },
  {
    id: "bebidas",
    label: "Bebidas",
    items: [
      { id: "agua-sin-gas", name: "Agua sin gas", desc: "33 cl.", variants: [{ id: "u", label: "", cents: 250 }] },
      { id: "agua-con-gas", name: "Agua con gas", desc: "33 cl.", variants: [{ id: "u", label: "", cents: 270 }] },
      { id: "lata-refresco", name: "Refresco en lata", desc: "33 cl · para llevar.", locales: ["rincon"], variants: [
        { id: "coca-cola", label: "Coca-Cola", cents: 270 },
        { id: "coca-cola-zero", label: "Coca-Cola Zero", cents: 270 },
        { id: "fanta-naranja", label: "Fanta Naranja", cents: 270 },
        { id: "nestea-limon", label: "Nestea Limón", cents: 270 },
        { id: "fuze-tea", label: "Fuze Tea Maracuyá", cents: 270 },
        { id: "aquarius-limon", label: "Aquarius Limón", cents: 270 },
        { id: "aquarius-naranja", label: "Aquarius Naranja", cents: 270 },
      ] },
      // En Teatinos, tal cual su carta: sin sabores y solo para delivery.
      { id: "latas-refresco", name: "Latas de refresco", desc: "Solo delivery.", locales: ["teatinos"], variants: [{ id: "u", label: "", cents: 270 }] },
      { id: "cruzcampo-lata", name: "Cruzcampo lata", desc: "33 cl · para llevar · +18.", locales: ["rincon"], variants: [{ id: "u", label: "", cents: 270 }] },
      { id: "amstel-lata", name: "Amstel lata", desc: "33 cl · para llevar · +18.", locales: ["rincon"], variants: [{ id: "u", label: "", cents: 300 }] },
      { id: "cerveza-lata", name: "Cerveza en lata", desc: "33 cl · para llevar · +18.", locales: ["teatinos"], variants: [{ id: "u", label: "", cents: 270 }] },
      { id: "refresco-vaso", name: "Refrescos 35 cl", desc: "Variedad completa, en el local.", soloLocal: true, variants: [{ id: "u", label: "", cents: 310 }] },
      { id: "cerveza-barril", name: "Cerveza de barril", desc: "Bien tirada, en el local.", soloLocal: true, variants: [{ id: "canita", label: "Cañita", cents: 210 }, { id: "copa", label: "Copa", cents: 290 }, { id: "jarra", label: "Jarra / Tanque", cents: 370 }] },
      { id: "clara-barril", name: "Clara de barril", desc: "Con su toque de limón, en el local.", soloLocal: true, variants: [{ id: "canita", label: "Cañita", cents: 210 }, { id: "copa", label: "Copa", cents: 290 }, { id: "jarra", label: "Jarra / Tanque", cents: 370 }] },
      { id: "alhambra-especial", name: "Alhambra especial", desc: "En el local.", soloLocal: true, variants: [{ id: "u", label: "", cents: 260 }] },
      { id: "alhambra-reserva", name: "Alhambra reserva", desc: "Rubia con carácter, en el local.", soloLocal: true, variants: [{ id: "u", label: "", cents: 360 }] },
      { id: "alhambra-sin", name: "Alhambra sin alcohol", desc: "En el local.", soloLocal: true, variants: [{ id: "u", label: "", cents: 290 }] },
      { id: "mahou", name: "Mahou", desc: "En el local.", soloLocal: true, variants: [{ id: "u", label: "", cents: 360 }] },
      { id: "mahou-sin-gluten", name: "Mahou sin gluten", desc: "En el local.", soloLocal: true, variants: [{ id: "u", label: "", cents: 360 }] },
      { id: "mahou-sin-alcohol", name: "Mahou sin alcohol", desc: "En el local.", soloLocal: true, variants: [{ id: "u", label: "", cents: 350 }] },
      { id: "corona", name: "Corona", desc: "Con su gajo de lima, en el local.", soloLocal: true, locales: ["rincon"], variants: [{ id: "u", label: "", cents: 400 }] },
      { id: "vino", name: "Copa de vino", desc: "En el local.", soloLocal: true, variants: [{ id: "tinto", label: "Tinto", cents: 300 }, { id: "blanco", label: "Blanco", cents: 300 }] },
      { id: "tinto-verano", name: "Tinto de verano", desc: "En el local.", soloLocal: true, variants: [{ id: "copa", label: "Copa", cents: 350 }, { id: "jarra", label: "Jarra / Tanque", cents: 400 }] },
      { id: "fernet", name: "Fernet", desc: "Para los valientes, en el local.", soloLocal: true, variants: [{ id: "u", label: "", cents: 750 }] },
    ],
  },
  {
    id: "extras",
    label: "Extras",
    nota: "Para añadir a hamburguesas y camperos — al pedir online se eligen dentro de cada producto.",
    soloCarta: true, // en /pedir van dentro del producto, no como categoría
    items: EXTRAS.map((e) => ({ id: `extra-${e.id}`, name: e.label, desc: "", variants: [{ id: "u", label: "", cents: e.cents }] })),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PROMOCIÓN WEB — descuento que se aplica al carrito entero, no a un producto.
// Se calcula igual en la web y en el servidor (que es quien manda).
// Para quitarla: activa: false. Para cambiarla, toca solo estas constantes.
//   pct        → % de descuento sobre la hamburguesa que entra en promoción
//   categorias → qué categorías de la carta cuentan como "hamburguesa"
// El descuento se aplica sobre el PRECIO BASE del producto, no sobre extras,
// panes ni acompañamientos.
// ─────────────────────────────────────────────────────────────────────────────
export const PROMO = {
  activa: true,
  nombre: "PROMO WEB: 50 % en la segunda hamburguesa",
  nombreEn: "WEB DEAL: 50% off your second burger",
  corto: "50 % en la 2ª hamburguesa",
  cortoEn: "50% off the 2nd burger",
  pct: 50,
  categorias: ["smash"],
};

// Ids de los productos que entran en la promoción. Se calculan sobre la carta
// efectiva para que un producto creado desde /admin también entre.
export const idsEnPromo = (menu = MENU) =>
  new Set(menu.filter((c) => PROMO.categorias.includes(c.id)).flatMap((c) => c.items.map((i) => i.id)));

// Descuento de la promoción sobre unas líneas ya valoradas con priceLine().
// Cada pareja de hamburguesas descuenta la más barata de las dos: con 3
// hamburguesas se descuenta una, con 4 dos, y así.
export function promoDescuento(items, menu = MENU) {
  if (!PROMO.activa || !Array.isArray(items)) return 0;
  const enPromo = idsEnPromo(menu);
  const unidades = [];
  for (const it of items) {
    if (!it || !enPromo.has(it.itemId)) continue;
    for (let i = 0; i < it.qty; i++) unidades.push(it.baseCents ?? 0);
  }
  unidades.sort((a, b) => b - a); // de más cara a más barata
  let desc = 0;
  for (let i = 1; i < unidades.length; i += 2) desc += Math.round((unidades[i] * PROMO.pct) / 100);
  return desc;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRECIOS EDITABLES DESDE /admin
// Los de este archivo son los de partida. Si en la tabla `precios` de Supabase
// hay una fila para un producto (o extra, pan o acompañamiento), esa manda.
// Clave: `itemId:variantId`. Los añadidos van con prefijo para no chocar con
// los ids de producto: `extra:bacon`, `pan:sin-gluten`, `upg:boniato`.
// Borrar la fila devuelve el precio de este archivo.
// ─────────────────────────────────────────────────────────────────────────────
export const clavePrecio = (itemId, variantId = "u") => `${itemId}:${variantId}`;
export const ID_EXTRA = (id) => `extra:${id}`;
export const ID_PAN = (id) => `pan:${id}`;
export const ID_UPGRADE = (id) => `upg:${id}`;

// Precio vigente: el de /admin si existe, si no el de la carta.
export function precioDe(precios, itemId, variantId, porDefecto) {
  const v = precios?.[clavePrecio(itemId, variantId)];
  return Number.isInteger(v) && v >= 0 ? v : porDefecto;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTOS EDITADOS DESDE /admin
// La carta de este archivo es la base. La tabla `productos` de Supabase puede,
// sobre esa base: cambiar nombre/descripción/etiqueta de un producto, ocultarlo
// o añadir productos nuevos. `fusionarCarta()` devuelve la carta resultante y
// es la que usan la web y el servidor — nadie lee MENU a pelo salvo como base.
// ─────────────────────────────────────────────────────────────────────────────
export function fusionarCarta(productos) {
  if (!Array.isArray(productos) || productos.length === 0) return MENU;
  const porId = new Map(productos.map((p) => [p.id, p]));
  const enBase = new Set(MENU.flatMap((c) => c.items.map((i) => i.id)));

  const cats = MENU.map((cat) => ({
    ...cat,
    items: cat.items
      .filter((it) => !porId.get(it.id)?.oculto)
      .map((it) => {
        const ov = porId.get(it.id);
        if (!ov) return it;
        return {
          ...it,
          name: ov.nombre || it.name,
          nameEn: ov.nombre_en || undefined,
          desc: ov.descripcion ?? it.desc,
          descEn: ov.descripcion_en || undefined,
          tag: ov.etiqueta === "" ? undefined : ov.etiqueta || it.tag,
          variants: Array.isArray(ov.variantes) && ov.variantes.length ? ov.variantes : it.variants,
          editado: true,
        };
      }),
  }));

  // Productos creados desde el panel (los que no existen en este archivo).
  for (const p of productos) {
    if (p.oculto || enBase.has(p.id)) continue;
    const cat = cats.find((c) => c.id === p.categoria);
    if (!cat || !Array.isArray(p.variantes) || p.variantes.length === 0) continue;
    cat.items.push({
      id: p.id,
      name: p.nombre,
      nameEn: p.nombre_en || undefined,
      desc: p.descripcion || "",
      descEn: p.descripcion_en || undefined,
      tag: p.etiqueta || undefined,
      notaHint: cat.notaHint,
      variants: p.variantes,
      nuevo: true,
    });
  }
  return cats;
}

// ¿Existe este producto en el local? (sin local se considera que sí)
export const enLocal = (item, localId) => !localId || !Array.isArray(item.locales) || item.locales.includes(localId);

// Carta de un local: la misma para todos salvo los productos con `locales`.
// Sin local (p. ej. /carta a secas), la carta entera.
export const cartaDeLocal = (menu, localId) =>
  localId ? menu.map((cat) => ({ ...cat, items: cat.items.filter((it) => enLocal(it, localId)) })) : menu;

// Acompañamientos que se ofrecen en un local.
export const upgradesDeLocal = (localId) => UPGRADES.filter((u) => enLocal(u, localId));

// Nota de la carta sobre el cambio de patatas, con los acompañamientos y
// precios vigentes del local: "Convierte tus patatas en boniatos o patatas
// deluxe por 1,90 € o en patatas con cheddar y bacon por 2,90 €."
export function notaPatatas(localId, precios, idioma = "es") {
  const en = idioma === "en";
  const porPrecio = new Map();
  for (const u of upgradesDeLocal(localId)) {
    if (u.id === "no") continue;
    const cents = precioDe(precios, ID_UPGRADE(u.id), "u", u.cents);
    porPrecio.set(cents, [...(porPrecio.get(cents) || []), en ? u.cortoEn : u.corto]);
  }
  const partes = [...porPrecio].map(([cents, nombres]) =>
    en ? `${nombres.join(" or ")} (${fmtEUR(cents).replace(/^(.*) €$/, "€$1").replace(",", ".")})` : `${nombres.join(" o ")} por ${fmtEUR(cents)}`
  );
  if (!partes.length) return "";
  return en
    ? `Swap your fries for ${partes.join(" or ")}.`
    : `Convierte tus patatas en ${partes.join(" o en ")}.`;
}

export const fmtEUR = (cents) =>
  (cents / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

// Pedido mínimo online para recogida (permite la Cheeseburger simple, 9,90 €).
export const PEDIDO_MINIMO_CENTS = 900;

// Forma que espera la sección "Carta" de Landing.jsx (rows [etiqueta, precio]).
// La categoría "Extras" de la carta lista los añadidos como si fueran
// productos (id `extra-bacon`), pero su precio se guarda con el prefijo del
// añadido (`extra:bacon`): aquí se traduce el id para buscarlo.
const idParaPrecio = (id) => (id.startsWith("extra-") ? ID_EXTRA(id.slice(6)) : id);

export const displayCats = (precios, menu = MENU) =>
  menu.map((cat) => ({
    id: cat.id,
    label: cat.label,
    nota: cat.nota,
    items: cat.items.map((it) => ({
      id: it.id,
      name: it.name,
      nameEn: it.nameEn,
      desc: it.desc,
      descEn: it.descEn,
      tag: it.tag,
      locales: it.locales,
      foto: fotoDe(it.id),
      rows: it.orderable === false
        ? [["", it.priceLabel || "Consulta"]]
        : it.variants.map((v) => [v.label, fmtEUR(precioDe(precios, idParaPrecio(it.id), v.id, v.cents))]),
    })),
  }));

// Nombre de un ítem por id (para mensajes de error).
export function itemName(id, menu = MENU) {
  for (const c of menu) {
    const it = c.items.find((i) => i.id === id);
    if (it) return it.name;
  }
  return "Un producto";
}

// Precio con descuento (%) aplicado, redondeado al céntimo.
export const conDescuento = (cents, descuento) =>
  descuento ? Math.round((cents * (100 - descuento)) / 100) : cents;

// Busca un ítem y calcula el precio de una línea. Devuelve null si no es válido.
// Usado por el backend para recalcular precios (nunca se confía en el cliente).
// `carta` es el estado por local (agotados/descuentos) gestionado desde /cocina:
// un ítem agotado no es pedible y el descuento se aplica al precio base
// (no a extras ni acompañamientos).
export function priceLine({ itemId, variantId, upgradeId, extraIds, panId, qty, carta, precios, menu = MENU, local }) {
  for (const cat of menu) {
    const it = cat.items.find((i) => i.id === itemId);
    if (!it) continue;
    if (it.orderable === false || it.soloLocal || cat.soloCarta) return null;
    if (!enLocal(it, local)) return null; // producto que no hay en ese local

    const estadoCarta = carta?.[itemId];
    if (estadoCarta?.agotado) return null;

    const v = it.variants.find((x) => x.id === variantId);
    if (!v) return null;

    let upgrade = null;
    if (upgradeId && upgradeId !== "no") {
      if (!cat.upgrades) return null;
      upgrade = UPGRADES.find((u) => u.id === upgradeId);
      if (!upgrade || !enLocal(upgrade, local)) return null;
    }

    let pan = null;
    if (panId && panId !== "patata") {
      if (!cat.panes) return null;
      pan = PANES.find((p) => p.id === panId);
      if (!pan) return null;
    }

    const extras = [];
    if (Array.isArray(extraIds) && extraIds.length > 0) {
      if (!cat.extras || extraIds.length > 10 || new Set(extraIds).size !== extraIds.length) return null;
      for (const id of extraIds) {
        const e = EXTRAS.find((x) => x.id === id);
        if (!e) return null;
        extras.push(e);
      }
    }

    const q = Math.floor(Number(qty));
    if (!Number.isFinite(q) || q < 1 || q > 20) return null;

    const descuento = estadoCarta?.descuento || 0;
    const base = conDescuento(precioDe(precios, itemId, v.id, v.cents), descuento);
    const upgradeCents = upgrade ? precioDe(precios, ID_UPGRADE(upgrade.id), "u", upgrade.cents) : 0;
    const panCents = pan ? precioDe(precios, ID_PAN(pan.id), "u", pan.cents) : 0;
    const extrasCents = extras.reduce((s, e) => s + precioDe(precios, ID_EXTRA(e.id), "u", e.cents), 0);
    const unit = base + upgradeCents + panCents + extrasCents;
    return {
      itemId,
      name: it.name,
      variant: v.label,
      upgrade: upgrade ? upgrade.label : null,
      pan: pan ? pan.label : null,
      extras: extras.map((e) => e.label),
      descuento: descuento || null,
      qty: q,
      baseCents: base, // precio del producto sin extras: lo que mira la promo
      unitCents: unit,
      lineCents: unit * q,
    };
  }
  return null;
}
