import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Idioma de la web (español / inglés).
// - Se detecta del navegador la primera vez (es-* → español, resto → inglés) y
//   la elección del usuario se recuerda en localStorage.
// - Los textos viven en DICT; los de la carta (platos) en src/menuI18n.js.
// - Si falta una traducción, cae al español: nunca aparece una clave suelta.
// Uso:  const { t, idioma, setIdioma } = useI18n();  →  t("carta.titulo")
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = "ltb_idioma";
const EVENTO = "ltb-idioma";

export const IDIOMAS = [
  { id: "es", label: "ES", nombre: "Español", flag: "🇪🇸" },
  { id: "en", label: "EN", nombre: "English", flag: "🇬🇧" },
];

function detectar() {
  try {
    const guardado = localStorage.getItem(LS_KEY);
    if (guardado === "es" || guardado === "en") return guardado;
  } catch { /* modo privado */ }
  const nav = (navigator.language || "es").toLowerCase();
  return nav.startsWith("es") ? "es" : "en";
}

let actual = detectar();

export const getIdioma = () => actual;

export function setIdiomaGlobal(id) {
  if (id !== "es" && id !== "en") return;
  actual = id;
  try { localStorage.setItem(LS_KEY, id); } catch { /* modo privado */ }
  document.documentElement.lang = id;
  window.dispatchEvent(new Event(EVENTO));
}

// Hook: devuelve el idioma actual, el traductor y el cambiador.
export function useI18n() {
  const [idioma, setIdiomaState] = useState(actual);
  useEffect(() => {
    const on = () => setIdiomaState(actual);
    window.addEventListener(EVENTO, on);
    return () => window.removeEventListener(EVENTO, on);
  }, []);
  useEffect(() => { document.documentElement.lang = idioma; }, [idioma]);
  return {
    idioma,
    setIdioma: setIdiomaGlobal,
    t: (clave, vars) => traducir(clave, idioma, vars),
  };
}

// Traduce una clave. `vars` sustituye {marcadores} en el texto.
export function traducir(clave, idioma = actual, vars) {
  const txt = (DICT[clave] && (DICT[clave][idioma] ?? DICT[clave].es)) ?? clave;
  if (!vars) return txt;
  return Object.keys(vars).reduce((s, k) => s.replaceAll(`{${k}}`, vars[k]), txt);
}

// ── Textos ───────────────────────────────────────────────────────────────────
const DICT = {
  // Comunes
  "com.pedirOnline": { es: "Pedir online para recoger", en: "Order online for pickup" },
  "com.verCarta": { es: "Ver la carta", en: "View the menu" },
  "com.volverWeb": { es: "← Volver a la web", en: "← Back to the site" },
  "com.inicio": { es: "Inicio", en: "Home" },
  "com.idioma": { es: "Idioma", en: "Language" },
  "com.cargando": { es: "Cargando…", en: "Loading…" },

  // ── /carta ───────────────────────────────────────────────────────────────
  "carta.titulo1": { es: "Nuestra", en: "Our" },
  "carta.titulo2": { es: "carta", en: "menu" },
  "carta.claim": {
    es: "Smash burgers de Angus Dry Age · pan de patata · salsas caseras. Precios con IVA.",
    en: "Dry-aged Angus smash burgers · potato bun · homemade sauces. Prices include VAT.",
  },
  "carta.nota": {
    es: "Toda modificación en hamburguesas y camperos se cobra como extra. Convierte tus patatas en boniatos por 1,90 € o en patatas con cheddar y bacon por 2,90 €.",
    en: "Any change to burgers or camperos is charged as an extra. Swap your fries for sweet potato fries (€1.90) or cheddar & bacon fries (€2.90).",
  },
  "carta.alergias": {
    es: "¿Alergias o intolerancias? Pregunta a nuestro equipo.",
    en: "Allergies or intolerances? Just ask our team.",
  },
  "carta.footer": {
    es: "© 2026 La Terracita Burguer España SL · Teatinos · Rincón de la Victoria",
    en: "© 2026 La Terracita Burguer España SL · Teatinos · Rincón de la Victoria",
  },

  // ── Portada ──────────────────────────────────────────────────────────────
  "web.saltar": { es: "Saltar al contenido", en: "Skip to content" },
  "web.h1": {
    es: "La Terracita Burger — Smash burgers de ternera Angus Dry Age en Málaga: Teatinos y Rincón de la Victoria",
    en: "La Terracita Burger — Dry-aged Angus smash burgers in Málaga: Teatinos and Rincón de la Victoria",
  },
  "web.marq1": { es: "Smash burgers para volverte adicto 🔥", en: "Smash burgers you'll crave 🔥" },
  "web.marq2": { es: "Angus Dry Age", en: "Dry-aged Angus" },
  "web.marq3": { es: "100% Mediterráneo", en: "100% Mediterranean" },
  "web.marq4": { es: "Cheddar fundido", en: "Melted cheddar" },

  "web.carta.kicker": { es: "01 — La Carta", en: "01 — The Menu" },
  "web.carta.h2a": { es: "Elige tu", en: "Pick your" },
  "web.carta.h2b": { es: "vicio", en: "favourite" },
  "web.carta.completa": { es: "Ver la carta completa →", en: "See the full menu →" },

  "web.historia.kicker": { es: "02 — Historia", en: "02 — Our story" },
  "web.historia.h2": { es: "El smash<br />que engancha", en: "The smash<br />that hooks you" },
  "web.historia.p1a": { es: "Aplastamos cada medallón de ", en: "We smash every " },
  "web.historia.p1b": { es: "ternera Angus Dry Age", en: "dry-aged Angus beef patty" },
  "web.historia.p1c": {
    es: " sobre la plancha ardiendo para sellar esos bordes crujientes que te hacen volver. Cheddar fundido, ",
    en: " on a screaming-hot griddle to seal those crispy edges that bring you back. Melted cheddar, artisan ",
  },
  "web.historia.p1d": { es: "pan de papa", en: "potato bun" },
  "web.historia.p1e": { es: " artesano y salsas caseras.", en: " and homemade sauces." },
  "web.historia.p2a": { es: "Nacidos en Málaga, con alma ", en: "Born in Málaga, with a " },
  "web.historia.p2b": { es: "mediterránea", en: "Mediterranean" },
  "web.historia.p2c": { es: ". Hoy con ", en: " soul. Today with " },
  "web.historia.p2d": { es: "dos locales", en: "two locations" },
  "web.historia.p2e": {
    es: " —Teatinos y Rincón de la Victoria— y reparto a domicilio por Glovo, Just Eat y Uber Eats. Sin humos, sin postureo: solo hamburguesas que provocan adicción.",
    en: " —Teatinos and Rincón de la Victoria— plus delivery through Glovo, Just Eat and Uber Eats. No fuss, no posing: just seriously addictive burgers.",
  },
  "web.historia.resenas": { es: "· +1.300 reseñas en Google", en: "· 1,300+ Google reviews" },
  "web.stats.burgers": { es: "Smash burgers", en: "Smash burgers" },
  "web.stats.locales": { es: "Locales en Málaga", en: "Locations in Málaga" },
  "web.stats.angus": { es: "Angus Dry Age", en: "Dry-aged Angus" },

  "web.locales.kicker": { es: "03 — Locales", en: "03 — Locations" },
  "web.locales.h2": { es: "Encuentranos", en: "Find us" },
  "web.locales.maps": { es: "Ver en Google Maps ↗", en: "View on Google Maps ↗" },
  "web.locales.comoLlegar": { es: "Cómo llegar →", en: "Get directions →" },
  "web.locales.abrirMapa": { es: "Abrir {local} en Google Maps", en: "Open {local} in Google Maps" },
  "web.locales.mapaTitulo": { es: "Mapa La Terracita Burger — {local}", en: "Map of La Terracita Burger — {local}" },

  "web.cta.h2": { es: "¿Con hambre?<br />No esperes más", en: "Hungry?<br />Don't wait" },
  "web.cta.p": {
    es: "Reserva mesa o pide para llevar. Te lo dejamos crujiente.",
    en: "Book a table or order takeaway. We'll keep it crispy.",
  },
  "web.cta.llamarTeatinos": { es: "LLAMAR A TEATINOS", en: "CALL TEATINOS" },
  "web.cta.llamarRincon": { es: "LLAMAR A RINCÓN", en: "CALL RINCÓN" },

  "web.footer.claim": { es: "Smash burgers para volverte adicto 🔥", en: "Smash burgers you'll crave 🔥" },
  "web.footer.locales": { es: "Locales", en: "Locations" },
  "web.footer.siguenos": { es: "Síguenos", en: "Follow us" },
  "web.footer.avisoLegal": { es: "Aviso legal", en: "Legal notice" },
  "web.footer.privacidad": { es: "Privacidad", en: "Privacy" },
  "web.footer.cookies": { es: "Cookies", en: "Cookies" },
  "web.footer.condiciones": { es: "Términos y condiciones", en: "Terms & conditions" },
  "web.footer.soloEs": { es: "", en: "(in Spanish)" },

  // Navegación
  "nav.delMes": { es: "Del mes", en: "This month" },
  "nav.carta": { es: "Carta", en: "Menu" },
  "nav.historia": { es: "Historia", en: "Our story" },
  "nav.locales": { es: "Locales", en: "Locations" },
  "nav.domicilio": { es: "A domicilio", en: "Delivery" },
  "nav.pedir": { es: "PEDIR", en: "ORDER" },
  "nav.pedirOnline": { es: "Pedir online", en: "Order online" },
  "nav.abrirMenu": { es: "Abrir menú", en: "Open menu" },
  "nav.cerrarMenu": { es: "Cerrar menú", en: "Close menu" },

  // Sección "A domicilio" de la portada
  "deliv.kicker": { es: "04 — A domicilio", en: "04 — Delivery" },
  "deliv.h2a": { es: "Pídela en", en: "Get it at" },
  "deliv.h2b": { es: "casa", en: "home" },
  "deliv.claim": {
    es: "Pide en nuestra web para recoger sin comisiones, llámanos, o pide a domicilio por tu app favorita.",
    en: "Order on our site for pickup with no commissions, call us, or get delivery through your favourite app.",
  },
  "deliv.pidiendoEn": { es: "Pidiendo en", en: "Ordering from" },
  "deliv.resenas": { es: "({n} reseñas · Google)", en: "({n} reviews · Google)" },
  "deliv.pedirOnlineTitulo": { es: "Pide online y recoge", en: "Order online & pick up" },
  "deliv.pedirOnlineSub": {
    es: "Sin comisiones — pago seguro online y recoges cuando quieras",
    en: "No commissions — secure online payment, pick up whenever you like",
  },
  "deliv.llamanos": { es: "Llámanos", en: "Call us" },
  "deliv.llamanosSub": { es: "Sin comisiones — pide directo al local", en: "No commissions — order straight from the restaurant" },
  "deliv.pedirAhora": { es: "Pedir ahora →", en: "Order now →" },
  "deliv.dias.teatinos": { es: "Todos los días excepto martes", en: "Every day except Tuesday" },
  "deliv.dias.todos": { es: "Todos los días", en: "Every day" },

  // Hamburguesa del mes
  "mes.kicker": { es: "Hamburguesa del mes", en: "Burger of the month" },
  "mes.badge": { es: "Del mes", en: "This month" },
  "mes.alt": { es: "Hamburguesa del mes: {name}", en: "Burger of the month: {name}" },
  "mes.pedirAhora": { es: "PEDIR AHORA", en: "ORDER NOW" },
  "mes.verCarta": { es: "VER LA CARTA", en: "SEE THE MENU" },
};

export default DICT;
