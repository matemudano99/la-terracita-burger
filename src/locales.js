// ─────────────────────────────────────────────────────────────────────────────
// LOCALES Y HORARIOS — compartido entre la web de pedidos y el backend.
// Los pedidos online se admiten mientras la cocina está abierta, hasta
// CIERRE_PEDIDOS_MIN minutos antes del cierre de cada turno.
// ─────────────────────────────────────────────────────────────────────────────

export const LOCALES = {
  teatinos: {
    id: "teatinos",
    name: "Teatinos",
    address: "Av. Parménides 1, Local 5 · Málaga",
    tel: "628053065",
    phone: "628 053 065",
    rgb: "255 197 49",
    lat: 36.7241,
    lon: -4.47978,
    diasTexto: "Todos los días excepto martes",
    diasKey: "deliv.dias.teatinos",
    cerradoDias: [2], // 0=domingo … 2=martes
    // Teatinos NO tiene reparto propio (solo plataformas: Just Eat/Glovo/Uber).
    delivery: null,
    // Enlace para dejar reseña en Google. TODO Mateo: sustituir por el enlace
    // exacto "escribir reseña" del local (Google Maps → tu ficha → Reseñas →
    // Escribir reseña → copiar enlace). El de abajo abre la ficha para valorar.
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=La+Terracita+Burger+Teatinos+M%C3%A1laga",
  },
  rincon: {
    id: "rincon",
    name: "Rincón de la Victoria",
    address: "Av. del Mediterráneo 139 · 29730",
    tel: "622220826",
    phone: "622 220 826",
    rgb: "255 92 40",
    lat: 36.71391,
    lon: -4.27483,
    diasTexto: "Todos los días",
    diasKey: "deliv.dias.todos",
    cerradoDias: [],
    // Reparto propio — OCULTO hasta poner activo: true. Antes de activarlo:
    // ejecutar el SQL de columnas de entrega (supabase/schema.sql) y
    // actualizar la sección de entrega de /condiciones.
    // radioKm: distancia máxima de reparto desde el local (control por dirección).
    delivery: { activo: false, gastosCents: 150, minimoCents: 1500, radioKm: 4, zona: "hasta 4 km del local" },
    reviewUrl: "https://www.google.com/maps/search/?api=1&query=La+Terracita+Burger+Rinc%C3%B3n+de+la+Victoria",
  },
};

// Turnos en minutos desde medianoche (hora de Madrid): 13:00–16:00 y 20:00–23:30.
export const TURNOS = [
  [13 * 60, 16 * 60],
  [20 * 60, 23 * 60 + 30],
];
export const HORARIO_TEXTO = "13:00–16:00 · 20:00–23:30";
export const CIERRE_PEDIDOS_MIN = 15; // dejar margen a cocina antes del cierre

const fmtHM = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

// Día de la semana (0=domingo) y minutos desde medianoche en hora de Madrid,
// independientemente de dónde corra el código (servidor UTC, navegador, etc.).
export function ahoraMadrid(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dia: dias[get("weekday")] ?? 0,
    minutos: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

// Textos de horario en los dos idiomas. Viven aquí (y no en src/i18n.js)
// porque este módulo lo comparten la web y el backend (api/*).
const TXT = {
  es: {
    noValido: "Local no válido", abierto: "Abierto ahora", hasta: (h) => `Aceptamos pedidos hasta las ${h}`,
    descansamos: "Hoy descansamos", cerrado: "Cerrado ahora",
    abrimos: (cuando, h) => `Abrimos ${cuando} a las ${h}`,
    hoy: "hoy", manana: "mañana", elDia: (d) => `el ${d}`,
    faltanMin: (m) => ` — faltan ${m} min`, faltanH: (h, m) => ` — faltan ${h} h ${m} min`,
    consulta: "Consulta el horario por teléfono",
    dias: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    hoyLabel: "Hoy", mananaLabel: "Mañana",
    programado: (cuando, h) => `${cuando} a las ${h}`,
  },
  en: {
    noValido: "Invalid location", abierto: "Open now", hasta: (h) => `We take orders until ${h}`,
    descansamos: "Closed today", cerrado: "Closed right now",
    abrimos: (cuando, h) => `We open ${cuando} at ${h}`,
    hoy: "today", manana: "tomorrow", elDia: (d) => `on ${d}`,
    faltanMin: (m) => ` — in ${m} min`, faltanH: (h, m) => ` — in ${h} h ${m} min`,
    consulta: "Please check our opening hours by phone",
    dias: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    hoyLabel: "Today", mananaLabel: "Tomorrow",
    programado: (cuando, h) => `${cuando} at ${h}`,
  },
};
const txt = (idioma) => TXT[idioma] || TXT.es;

// ¿Admite pedidos online este local ahora mismo?
// Devuelve { abierto, mensaje, detalle }: mensaje es el titular ("Abierto
// ahora"), detalle la línea de apoyo ("Aceptamos pedidos hasta las 15:45").
// `idioma` solo lo usa la web; el backend lo llama sin él (español).
export function estadoLocal(localId, date = new Date(), idioma = "es") {
  const T = txt(idioma);
  const loc = LOCALES[localId];
  if (!loc) return { abierto: false, mensaje: T.noValido, detalle: "" };
  const { dia, minutos } = ahoraMadrid(date);

  if (!loc.cerradoDias.includes(dia)) {
    for (const [ini, fin] of TURNOS) {
      if (minutos >= ini && minutos <= fin - CIERRE_PEDIDOS_MIN) {
        return { abierto: true, mensaje: T.abierto, detalle: T.hasta(fmtHM(fin - CIERRE_PEDIDOS_MIN)) };
      }
    }
  }
  return {
    abierto: false,
    mensaje: loc.cerradoDias.includes(dia) ? T.descansamos : T.cerrado,
    detalle: proximaApertura(loc, dia, minutos, T),
  };
}

// "Abrimos hoy a las 20:00 — faltan 2 h 10 min" / "mañana" / "el miércoles".
function proximaApertura(loc, dia, minutos, T) {
  for (let off = 0; off < 8; off++) {
    const d = (dia + off) % 7;
    if (loc.cerradoDias.includes(d)) continue;
    for (const [ini] of TURNOS) {
      if (off === 0 && minutos >= ini) continue;
      const cuando = off === 0 ? T.hoy : off === 1 ? T.manana : T.elDia(T.dias[d]);
      let out = T.abrimos(cuando, fmtHM(ini));
      if (off === 0) {
        const faltan = ini - minutos;
        out += faltan < 60 ? T.faltanMin(faltan) : T.faltanH(Math.floor(faltan / 60), faltan % 60);
      }
      return out;
    }
  }
  return T.consulta;
}

// Turnos de hoy formateados, p. ej. "13:00–16:00 y 20:00–23:30".
export const horarioTexto = () =>
  TURNOS.map(([i, f]) => `${fmtHM(i)}–${fmtHM(f)}`).join(" y ");

// ── Pedidos programados ──────────────────────────────────────────────────────
export const PROGRAMAR_ANTELACION_MIN = 45; // antelación mínima que se ofrece
export const PROGRAMAR_MIN_SERVIDOR_MIN = 30; // mínimo que acepta el servidor
export const PROGRAMAR_HORIZONTE_DIAS = 1; // hoy y mañana
const SLOT_MIN = 15;

// Instante (Date) para un slot: `off` días y `m` minutos-del-día en Madrid,
// relativo a `ahora`. Usa la diferencia de minutos en reloj de pared Madrid
// (exacto salvo en las 2 madrugadas de cambio de hora al año, sin impacto real:
// el servidor revalida el instante contra el horario con Intl).
// `ahora` se ancla al minuto exacto para que el ISO de una franja sea ESTABLE
// entre recálculos (si no, cambiaría cada segundo y el desplegable se
// desincronizaría) y caiga siempre en HH:MM:00.
function instanteDe(ahora, off, m) {
  const { minutos } = ahoraMadrid(ahora);
  const base = Math.floor(ahora.getTime() / 60000) * 60000;
  const delta = off * 1440 + m - minutos;
  return new Date(base + delta * 60000);
}

// Franjas de 15 min disponibles para programar (hoy y mañana), respetando
// turnos, días cerrados y la antelación mínima. Devuelve [{off,label,horas:[{hm,iso}]}].
export function franjasProgramables(localId, ahora = new Date(), idioma = "es") {
  const T = txt(idioma);
  const loc = LOCALES[localId];
  if (!loc) return [];
  const { dia, minutos } = ahoraMadrid(ahora);
  const minDesde = minutos + PROGRAMAR_ANTELACION_MIN;
  const dias = [];
  for (let off = 0; off <= PROGRAMAR_HORIZONTE_DIAS; off++) {
    const d = (dia + off) % 7;
    if (loc.cerradoDias.includes(d)) continue;
    const horas = [];
    for (const [ini, fin] of TURNOS) {
      const primer = Math.ceil(ini / SLOT_MIN) * SLOT_MIN;
      for (let m = primer; m <= fin - SLOT_MIN; m += SLOT_MIN) {
        if (off === 0 && m < minDesde) continue;
        horas.push({ hm: fmtHM(m), iso: instanteDe(ahora, off, m).toISOString() });
      }
    }
    if (horas.length) dias.push({ off, label: off === 0 ? T.hoyLabel : off === 1 ? T.mananaLabel : "", horas });
  }
  return dias;
}

// Valida en el servidor un instante programado (ISO). Devuelve {ok, error?, iso?}.
export function validarProgramado(localId, iso, ahora = new Date()) {
  const loc = LOCALES[localId];
  if (!loc) return { ok: false, error: "Local no válido." };
  const cuando = new Date(iso);
  if (isNaN(cuando)) return { ok: false, error: "Hora programada no válida." };
  if (cuando.getTime() < ahora.getTime() + PROGRAMAR_MIN_SERVIDOR_MIN * 60000) {
    return { ok: false, error: `Programa el pedido con al menos ${PROGRAMAR_ANTELACION_MIN} min de antelación.` };
  }
  if (cuando.getTime() > ahora.getTime() + (PROGRAMAR_HORIZONTE_DIAS + 1) * 24 * 3600 * 1000) {
    return { ok: false, error: "Solo puedes programar para hoy o mañana." };
  }
  const { dia, minutos } = ahoraMadrid(cuando);
  if (loc.cerradoDias.includes(dia)) return { ok: false, error: "Ese día el local está cerrado." };
  const dentro = TURNOS.some(([ini, fin]) => minutos >= ini && minutos <= fin);
  if (!dentro) return { ok: false, error: "Esa hora está fuera de nuestro horario." };
  return { ok: true, iso: cuando.toISOString() };
}

// Hora programada legible, p. ej. "hoy a las 21:30" / "mañana a las 13:15".
export function programadoTexto(iso, ahora = new Date(), idioma = "es") {
  const T = txt(idioma);
  const hoy = ahoraMadrid(ahora).dia;
  const { dia, minutos } = ahoraMadrid(new Date(iso));
  const cuando = dia === hoy ? T.hoy : T.manana;
  return T.programado(cuando, fmtHM(minutos));
}

// ── Distancia (control de zona de reparto) ───────────────────────────────────
// Distancia en km entre dos coordenadas (haversine).
export function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
