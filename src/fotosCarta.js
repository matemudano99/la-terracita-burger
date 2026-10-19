// GENERADO por scripts/optimize-images.mjs — no editar a mano.
// Fotos de los platos para la burbuja de la carta (id del producto → foto).
// Para añadir una: assets-src/fotos/carta/<id>.jpg y npm run optimize:images.
export const FOTOS_CARTA = {
  "burger-especial": {
    "src": "/fotos/carta/burger-especial.webp?v=0280462f",
    "w": 452,
    "h": 600
  },
  "la-terracita": {
    "src": "/fotos/carta/la-terracita.webp?v=836b4f5a",
    "w": 600,
    "h": 400
  }
};

export const fotoDe = (id) => FOTOS_CARTA[id] || null;
