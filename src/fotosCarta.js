// GENERADO por scripts/optimize-images.mjs — no editar a mano.
// Fotos de los platos para la burbuja de la carta (id del producto → foto).
// Para añadir una: assets-src/fotos/carta/<id>.jpg y npm run optimize:images.
export const FOTOS_CARTA = {
  "burger-especial": {
    "src": "/fotos/carta/burger-especial.webp?v=0280462f",
    "w": 452,
    "h": 600
  },
  "cheeseburger": {
    "src": "/fotos/carta/cheeseburger.webp?v=b618eed9",
    "w": 450,
    "h": 600
  },
  "chicken-little": {
    "src": "/fotos/carta/chicken-little.webp?v=fe94552d",
    "w": 600,
    "h": 400
  },
  "la-terracita": {
    "src": "/fotos/carta/la-terracita.webp?v=eabd2490",
    "w": 400,
    "h": 600
  },
  "martita": {
    "src": "/fotos/carta/martita.webp?v=39bfa5e3",
    "w": 600,
    "h": 400
  },
  "mexican": {
    "src": "/fotos/carta/mexican.webp?v=ef585712",
    "w": 480,
    "h": 600
  },
  "oklahoma": {
    "src": "/fotos/carta/oklahoma.webp?v=13f742cb",
    "w": 400,
    "h": 600
  },
  "paquito": {
    "src": "/fotos/carta/paquito.webp?v=bdf750ef",
    "w": 600,
    "h": 400
  },
  "pepita": {
    "src": "/fotos/carta/pepita.webp?v=7a1bee61",
    "w": 600,
    "h": 400
  },
  "teke-burger": {
    "src": "/fotos/carta/teke-burger.webp?v=3204b2c6",
    "w": 600,
    "h": 400
  },
  "veggie": {
    "src": "/fotos/carta/veggie.webp?v=6052aeb0",
    "w": 546,
    "h": 600
  },
  "yankee": {
    "src": "/fotos/carta/yankee.webp?v=c0b80dcd",
    "w": 400,
    "h": 600
  }
};

export const fotoDe = (id) => FOTOS_CARTA[id] || null;
