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

  // ── /pedir ───────────────────────────────────────────────────────────────
  "pedir.kicker": { es: "Pedidos online — recogida en local", en: "Online orders — pickup at the restaurant" },
  "pedir.kickerDom": { es: "Pedidos online — recogida o a domicilio", en: "Online orders — pickup or delivery" },
  "pedir.repartoTitulo": { es: "Reparto a domicilio", en: "Home delivery" },
  "pedir.repartoDetalle": {
    es: "{zona} · envío {envio} · pedido mínimo {min}",
    en: "{zona} · {envio} delivery fee · {min} minimum order",
  },
  "pedir.h1a": { es: "Pide y", en: "Order &" },
  "pedir.h1b": { es: "recoge", en: "collect" },
  "pedir.claim": {
    es: "Sin comisiones, directo a nuestra cocina. Pago seguro online — recoge cuando quieras.",
    en: "No commissions, straight to our kitchen. Secure online payment — pick it up whenever you like.",
  },
  "pedir.claimDom": {
    es: "Sin comisiones, directo a nuestra cocina. Recógelo o te lo llevamos a casa — pago seguro online.",
    en: "No commissions, straight to our kitchen. Pick it up or we'll bring it to you — secure online payment.",
  },
  "pedir.eligeLocal": {
    es: "👆 Elige primero el local donde quieres recoger tu pedido.",
    en: "👆 First choose where you'd like to pick up your order.",
  },
  "pedir.horario": { es: "🕒 Mediodía y noche:", en: "🕒 Lunch & dinner:" },
  "pedir.llamanos": { es: "Llámanos", en: "Call us" },
  "pedir.soloLocal": { es: "Solo en el local", en: "In-restaurant only" },
  "pedir.agotado": { es: "Agotado hoy", en: "Sold out today" },
  "pedir.anadir": { es: "Añadir +", en: "Add +" },
  "pedir.desde": { es: "desde {p}", en: "from {p}" },
  "pedir.notaFinal": {
    es: "Toda modificación en hamburguesas y camperos se cobra como extra. ¿Alergias o dudas? Indícalo en las notas o llámanos: {phone}.",
    en: "Any change to burgers or camperos is charged as an extra. Allergies or questions? Add a note or call us: {phone}.",
  },
  "pedir.verPedido": { es: "VER PEDIDO ({n})", en: "VIEW ORDER ({n})" },
  "pedir.carritoVacio": { es: "Carrito vacío", en: "Empty cart" },
  "pedir.verCarrito": { es: "Ver carrito", en: "View cart" },

  // Modal de producto
  "pedir.cerrar": { es: "Cerrar", en: "Close" },
  "pedir.menos": { es: "Menos", en: "Minus" },
  "pedir.mas": { es: "Más", en: "Plus" },
  "pedir.elige": { es: "Elige", en: "Choose" },
  "pedir.acompanamiento": { es: "Elige tu acompañamiento", en: "Choose your side" },
  "pedir.pan": { es: "Elige tu pan", en: "Choose your bun" },
  "pedir.extras": { es: "Extras", en: "Extras" },
  "pedir.opcionalParen": { es: "(opcional)", en: "(optional)" },
  "pedir.notasItem": { es: "Notas (sin cebolla, punto de la carne…)", en: "Notes (no onion, how you like it cooked…)" },
  "pedir.opcional": { es: "Opcional", en: "Optional" },
  "pedir.anadirPrecio": { es: "AÑADIR · {p}", en: "ADD · {p}" },
  "pedir.opcionesDe": { es: "Opciones de {name}", en: "{name} options" },

  // Carrito y checkout
  "pedir.tuPedido": { es: "Tu pedido", en: "Your order" },
  "pedir.recogida": { es: "🏃 Recogida", en: "🏃 Pickup" },
  "pedir.domicilio": { es: "🛵 A domicilio", en: "🛵 Delivery" },
  "pedir.recogidaEn": { es: "📍 Recogida en", en: "📍 Pick up at" },
  "pedir.pagoSeguroLinea": { es: "💳 Pago seguro online por adelantado", en: "💳 Secure online payment in advance" },
  "pedir.entregaZona": { es: "🛵 Entrega a domicilio — zona:", en: "🛵 Home delivery — area:" },
  "pedir.zonaRadio": { es: "hasta {km} km del local", en: "within {km} km of the restaurant" },
  "pedir.gastosEnvio": { es: "🚚 Gastos de envío:", en: "🚚 Delivery fee:" },
  "pedir.minimoDom": { es: "mínimo {min}", en: "{min} minimum" },
  "pedir.calle": { es: "Calle y número *", en: "Street and number *" },
  "pedir.piso": { es: "Piso / puerta (opcional)", en: "Floor / door (optional)" },
  "pedir.cuando": { es: "¿Para cuándo?", en: "When for?" },
  "pedir.asap": { es: "🔥 Lo antes posible", en: "🔥 As soon as possible" },
  "pedir.programar": { es: "⏰ Programar", en: "⏰ Schedule" },
  "pedir.cerradoProgramar": {
    es: "🌙 Ahora estamos cerrados — deja tu pedido programado y lo tendremos listo a la hora que elijas.",
    en: "🌙 We're closed right now — schedule your order and we'll have it ready at the time you choose.",
  },
  "pedir.listoA": { es: "⏰ Listo", en: "⏰ Ready" },
  "pedir.agotadoQuitar": { es: "— agotado hoy 😔", en: "— sold out today 😔" },
  "pedir.quitar": { es: "Quitar", en: "Remove" },
  "pedir.vacio": { es: "El carrito está vacío.", en: "Your cart is empty." },
  "pedir.envio": { es: "Envío", en: "Delivery" },
  "pedir.total": { es: "TOTAL", en: "TOTAL" },
  "pedir.minimo": {
    es: "🍔 El pedido mínimo {tipo} es de {min} — te faltan {falta}.",
    en: "🍔 Minimum {tipo} order is {min} — you need {falta} more.",
  },
  "pedir.tipoDomicilio": { es: "a domicilio", en: "delivery" },
  "pedir.tipoOnline": { es: "online", en: "online" },
  "pedir.nombre": { es: "Tu nombre *", en: "Your name *" },
  "pedir.telefono": { es: "Teléfono * (te llamamos si hay dudas)", en: "Phone * (we'll call if anything's unclear)" },
  "pedir.notasLocal": { es: "Notas para el local", en: "Notes for the restaurant" },
  "pedir.noDisponible": {
    es: "Los pedidos online no están disponibles ahora mismo. Llámanos y te atendemos: {phone}.",
    en: "Online ordering isn't available right now. Give us a call and we'll take care of it: {phone}.",
  },
  "pedir.cerradoAviso": { es: "Horario: {horario}.", en: "Opening hours: {horario}." },
  "pedir.puedesProgramar": { es: "Puedes dejar tu pedido programado ⏰.", en: "You can schedule your order ⏰." },
  "pedir.pausa": { es: "Pedidos pausados un momento", en: "Orders paused for a moment" },
  "pedir.pausaSub": { es: "La cocina está a tope — llámanos y te atendemos.", en: "The kitchen is at full capacity — give us a call and we'll help." },
  "pedir.pausaTelefono": { es: "Volvemos enseguida; mientras, llámanos al {phone}.", en: "We'll be back shortly; in the meantime, call us at {phone}." },
  "pedir.seg.pagadoParcial": { es: "💳 Pagado: {t} · ↩️ devuelto {d}", en: "💳 Paid: {t} · ↩️ refunded {d}" },
  "pedir.enviar": { es: "PAGAR Y ENVIAR · {total}", en: "PAY & PLACE ORDER · {total}" },
  "pedir.enviando": { es: "ENVIANDO…", en: "SENDING…" },
  "pedir.legalPago": {
    es: "💳 Pago seguro por adelantado: tarjeta, Bizum, Apple Pay o Google Pay. Si el local no pudiera preparar tu pedido, se te devuelve el importe automáticamente.",
    en: "💳 Secure payment in advance: card, Bizum, Apple Pay or Google Pay. If the restaurant can't prepare your order, you're refunded automatically.",
  },
  "pedir.legalTerminosA": { es: "Al pagar aceptas los ", en: "By paying you accept our " },
  "pedir.legalTerminosLink": { es: "términos y condiciones", en: "terms & conditions" },
  "pedir.legalTerminosB": {
    es: " (cancelaciones y reembolsos incluidos). Usamos tu nombre y teléfono solo para gestionar este pedido — más info en ",
    en: " (cancellations and refunds included). We use your name and phone only to handle this order — more in ",
  },
  "pedir.legalPrivacidad": { es: "privacidad", en: "privacy" },

  // Errores de validación (cliente)
  "pedir.err.nombre": { es: "Dinos tu nombre para el pedido.", en: "Please tell us your name for the order." },
  "pedir.err.telefono": { es: "Escribe un teléfono válido (9 dígitos).", en: "Please enter a valid phone number (9 digits)." },
  "pedir.err.direccion": { es: "Escribe la calle y el número de entrega.", en: "Please enter the delivery street and number." },
  "pedir.err.hora": { es: "Elige la hora para tu pedido programado.", en: "Please choose a time for your scheduled order." },
  "pedir.err.generico": { es: "No se pudo enviar el pedido.", en: "We couldn't place your order." },

  // Seguimiento del pedido
  "pedir.seg.nuevoT": { es: "Pedido enviado", en: "Order placed" },
  "pedir.seg.nuevoD": { es: "El local lo está revisando. En un momento te confirmamos por aquí.", en: "The restaurant is reviewing it. We'll confirm here in a moment." },
  "pedir.seg.progT": { es: "Pedido programado", en: "Order scheduled" },
  "pedir.seg.progD": { es: "Lo tendremos listo {cuando}. Te avisamos por aquí cuando lo pongamos en plancha.", en: "We'll have it ready {cuando}. We'll let you know here when it hits the grill." },
  "pedir.seg.aceptadoT": { es: "¡Confirmado! Ya está en plancha", en: "Confirmed! It's on the grill" },
  "pedir.seg.aceptadoD": { es: "Estará listo sobre las {hora}.", en: "It'll be ready around {hora}." },
  "pedir.seg.aceptadoDprog": { es: "Lo tendrás listo {cuando}.", en: "It'll be ready {cuando}." },
  "pedir.seg.aceptadoDsin": { es: "Te avisamos aquí cuando esté listo.", en: "We'll let you know here when it's ready." },
  "pedir.seg.listaT": { es: "¡Listo para recoger!", en: "Ready for pickup!" },
  "pedir.seg.listaD": { es: "Pásate por el local, te esperamos.", en: "Come by the restaurant — we're waiting for you." },
  "pedir.seg.caminoT": { es: "¡Va de camino!", en: "On its way!" },
  "pedir.seg.caminoD": { es: "Tu pedido acaba de salir hacia tu dirección.", en: "Your order has just left for your address." },
  "pedir.seg.entregadoT": { es: "Entregado", en: "Delivered" },
  "pedir.seg.entregadoD": { es: "¡Que aproveche! Nos vemos pronto.", en: "Enjoy! See you soon." },
  "pedir.seg.rechazadoT": { es: "No hemos podido aceptarlo", en: "We couldn't accept it" },
  "pedir.seg.rechazadoDrf": { es: "Lo sentimos — te hemos devuelto el importe (lo verás en tu banco en 1-3 días). Llámanos si quieres y lo resolvemos.", en: "We're sorry — you've been refunded (it'll show in your bank in 1-3 days). Call us and we'll sort it out." },
  "pedir.seg.rechazadoD": { es: "Lo sentimos — llámanos al {phone} y lo resolvemos.", en: "We're sorry — call us on {phone} and we'll sort it out." },
  "pedir.seg.noRecogidoT": { es: "Quedó sin recoger", en: "Not collected" },
  "pedir.seg.noRecogidoD": { es: "Este pedido no llegó a recogerse. Si hubo un problema, llámanos al {phone}.", en: "This order was never collected. If something went wrong, call us on {phone}." },
  "pedir.seg.pagoFalloT": { es: "El pago no se completó", en: "Payment didn't go through" },
  "pedir.seg.pagoFalloD": { es: "Tranquilo: no se te ha cobrado. Vuelve a hacer el pedido cuando quieras.", en: "Don't worry: you haven't been charged. Just place the order again whenever you like." },
  "pedir.seg.confirmandoT": { es: "Confirmando el pago…", en: "Confirming payment…" },
  "pedir.seg.confirmandoD": { es: "Un momento — estamos confirmando el cobro con el banco. Esta pantalla se actualiza sola.", en: "One moment — we're confirming the payment with the bank. This page updates itself." },
  "pedir.seg.numero": { es: "Tu número de pedido", en: "Your order number" },
  "pedir.seg.wa": { es: "💬 Guardar seguimiento en WhatsApp", en: "💬 Save tracking to WhatsApp" },
  "pedir.seg.waNota": { es: "Envíatelo a ti mismo y podrás abrir este seguimiento desde donde quieras.", en: "Send it to yourself and you can open this tracking page from anywhere." },
  "pedir.seg.waMsg": { es: "Mi pedido en La Terracita Burger 🍔 nº {code} — seguimiento: {url}", en: "My order at La Terracita Burger 🍔 no. {code} — tracking: {url}" },
  "pedir.seg.entregaDom": { es: "🛵 Entrega a domicilio:", en: "🛵 Home delivery:" },
  "pedir.seg.pagado": { es: "💳 Pagado online: {t} — no pagas nada al recoger", en: "💳 Paid online: {t} — nothing to pay on pickup" },
  "pedir.seg.devuelto": { es: "↩️ Te hemos devuelto {t} (1-3 días en tu banco)", en: "↩️ We've refunded {t} (1-3 days in your bank)" },
  "pedir.seg.importe": { es: "💶 Importe: {t}", en: "💶 Amount: {t}" },
  "pedir.seg.resena": { es: "⭐ ¿Todo rico? Déjanos 5 estrellas", en: "⭐ Enjoyed it? Leave us 5 stars" },
  "pedir.seg.caido": { es: "No podemos actualizar el estado ahora mismo — tu pedido sigue en marcha. Si tienes dudas, llámanos.", en: "We can't refresh the status right now — your order is still going. Call us if you have any doubts." },
  "pedir.seg.auto": { es: "Esta página se actualiza sola — no hace falta recargar.", en: "This page updates itself — no need to refresh." },
  "pedir.seg.otro": { es: "Hacer otro pedido", en: "Place another order" },

  // Sección "A domicilio" de la portada
  "deliv.kicker": { es: "04 — A domicilio", en: "04 — Delivery" },
  "deliv.h2a": { es: "Pídela en", en: "Get it at" },
  "deliv.h2b": { es: "casa", en: "home" },
  "deliv.claim": {
    es: "Pide en nuestra web para recoger sin comisiones, llámanos, o pide a domicilio por tu app favorita.",
    en: "Order on our site for pickup with no commissions, call us, or get delivery through your favourite app.",
  },
  "deliv.claimReparto": {
    es: "Pide en nuestra web sin comisiones —recogida en los dos locales y reparto propio en Rincón—, llámanos, o pide por tu app favorita.",
    en: "Order on our site with no commissions — pickup at both restaurants and our own delivery in Rincón — call us, or use your favourite app.",
  },
  "deliv.pidiendoEn": { es: "Pidiendo en", en: "Ordering from" },
  "deliv.resenas": { es: "({n} reseñas · Google)", en: "({n} reviews · Google)" },
  "deliv.pedirOnlineTitulo": { es: "Pide online y recoge", en: "Order online & pick up" },
  "deliv.pedirOnlineSub": {
    es: "Sin comisiones — pago seguro online y recoges cuando quieras",
    en: "No commissions — secure online payment, pick up whenever you like",
  },
  "deliv.pedirOnlineTituloDom": { es: "Pide online: recoge o a domicilio", en: "Order online: pickup or delivery" },
  "deliv.pedirOnlineSubDom": {
    es: "Sin comisiones — reparto propio hasta {km} km por {envio}",
    en: "No commissions — our own delivery within {km} km for {envio}",
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
