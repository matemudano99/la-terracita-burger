// ─────────────────────────────────────────────────────────────────────────────
// Geocodificación de direcciones para el control de zona de reparto.
// Usa Nominatim (OpenStreetMap), gratis. Requiere cabecera User-Agent y un uso
// moderado (1 req/s) — sobra para el volumen de pedidos de un restaurante.
// Devuelve { lat, lon } o null si no se encuentra la dirección.
// ─────────────────────────────────────────────────────────────────────────────

export async function geocodificar(direccion) {
  const q = String(direccion || "").trim();
  if (q.length < 5) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=es&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "LaTerracitaBurger/1.0 (pedidos web; laterracita.burgers@gmail.com)",
        "Accept-Language": "es",
      },
    });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const lat = Number(arr[0].lat);
    const lon = Number(arr[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}
