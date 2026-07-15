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
    diasTexto: "Todos los días excepto martes",
    cerradoDias: [2], // 0=domingo … 2=martes
  },
  rincon: {
    id: "rincon",
    name: "Rincón de la Victoria",
    address: "Av. del Mediterráneo 139 · 29730",
    tel: "622220826",
    phone: "622 220 826",
    rgb: "255 92 40",
    diasTexto: "Todos los días",
    cerradoDias: [],
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

// ¿Admite pedidos online este local ahora mismo?
// Devuelve { abierto, mensaje, detalle }: mensaje es el titular ("Abierto
// ahora"), detalle la línea de apoyo ("Aceptamos pedidos hasta las 15:45").
export function estadoLocal(localId, date = new Date()) {
  const loc = LOCALES[localId];
  if (!loc) return { abierto: false, mensaje: "Local no válido", detalle: "" };
  const { dia, minutos } = ahoraMadrid(date);

  if (!loc.cerradoDias.includes(dia)) {
    for (const [ini, fin] of TURNOS) {
      if (minutos >= ini && minutos <= fin - CIERRE_PEDIDOS_MIN) {
        return { abierto: true, mensaje: "Abierto ahora", detalle: `Aceptamos pedidos hasta las ${fmtHM(fin - CIERRE_PEDIDOS_MIN)}` };
      }
    }
  }
  return {
    abierto: false,
    mensaje: loc.cerradoDias.includes(dia) ? "Hoy descansamos" : "Cerrado ahora",
    detalle: proximaApertura(loc, dia, minutos),
  };
}

// "Abrimos hoy a las 20:00 — faltan 2 h 10 min" / "mañana" / "el miércoles".
function proximaApertura(loc, dia, minutos) {
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  for (let off = 0; off < 8; off++) {
    const d = (dia + off) % 7;
    if (loc.cerradoDias.includes(d)) continue;
    for (const [ini] of TURNOS) {
      if (off === 0 && minutos >= ini) continue;
      const cuando = off === 0 ? "hoy" : off === 1 ? "mañana" : `el ${DIAS[d]}`;
      let txt = `Abrimos ${cuando} a las ${fmtHM(ini)}`;
      if (off === 0) {
        const faltan = ini - minutos;
        txt += faltan < 60 ? ` — faltan ${faltan} min` : ` — faltan ${Math.floor(faltan / 60)} h ${faltan % 60} min`;
      }
      return txt;
    }
  }
  return "Consulta el horario por teléfono";
}

// Turnos de hoy formateados, p. ej. "13:00–16:00 y 20:00–23:30".
export const horarioTexto = () =>
  TURNOS.map(([i, f]) => `${fmtHM(i)}–${fmtHM(f)}`).join(" y ");
