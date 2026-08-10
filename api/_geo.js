// ─────────────────────────────────────────────────────────────────────────────
// Geocodificación de direcciones para el control de zona de reparto.
// Usa Nominatim (OpenStreetMap), gratis. Requiere cabecera User-Agent y un uso
// moderado (1 req/s) — sobra para el volumen de pedidos de un restaurante.
//
// Devuelve { lat, lon }, o null si la dirección no existe. Si el servicio no
// responde LANZA GeoNoDisponible: no es lo mismo «esa calle no existe» que «no
// he podido comprobarlo», y al cliente hay que decirle una cosa u otra.
// ─────────────────────────────────────────────────────────────────────────────

export class GeoNoDisponible extends Error {}

const TIMEOUT_MS = 6000;

export async function geocodificar(direccion) {
  const q = String(direccion || "").trim();
  if (q.length < 5) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=es&q=${encodeURIComponent(q)}`;

  let res;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "LaTerracitaBurger/1.0 (pedidos web; laterracita.burgers@gmail.com)",
        "Accept-Language": "es",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new GeoNoDisponible("Nominatim no responde");
  }
  if (!res.ok) throw new GeoNoDisponible(`Nominatim ${res.status}`);

  let arr;
  try {
    arr = await res.json();
  } catch {
    throw new GeoNoDisponible("Respuesta ilegible de Nominatim");
  }
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const lat = Number(arr[0].lat);
  const lon = Number(arr[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}
