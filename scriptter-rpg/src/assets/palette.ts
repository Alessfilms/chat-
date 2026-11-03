/**
 * Paleta única do Scriptter. Todos os sprites gerados usam estas cores,
 * o que mantém a identidade visual consistente entre cenas e episódios.
 *
 * Os tons do mundo são pintados "de dia" (médios) e escurecidos pela camada
 * de luz noturna (multiply). A luz quente da fogueira devolve a cor original.
 */
export const P = {
  // contorno
  ink: '#140f1a',
  inkSoft: '#231a2b',

  // grama / floresta
  grass0: '#1f3a33',
  grass1: '#2a4a3a',
  grass2: '#355a40',
  grass3: '#426b47',
  grass4: '#55804f',
  grass5: '#6c9a5a',
  moss: '#7da65f',

  leaf0: '#14282a',
  leaf1: '#1d3a33',
  leaf2: '#2b5140',
  leaf3: '#3d6b4a',
  leaf4: '#5a8a55',
  leaf5: '#7fae68',

  pine0: '#0f2024',
  pine1: '#173230',
  pine2: '#234a3e',
  pine3: '#33634c',

  bark0: '#2a1a17',
  bark1: '#3f2a22',
  bark2: '#5a3b2b',
  bark3: '#77503a',

  dirt0: '#4a2f22',
  dirt1: '#5f3d2a',
  dirt2: '#7a5034',
  dirt3: '#946541',
  dirt4: '#ad7c51',

  stone0: '#3b3c4a',
  stone1: '#5a5c6b',
  stone2: '#7f8291',
  stone3: '#a9adb8',

  wood0: '#3a2419',
  wood1: '#5b3a24',
  wood2: '#7c5233',
  wood3: '#9c6d43',

  // fogo / luz quente
  fire0: '#7a1f1f',
  fire1: '#c2402a',
  fire2: '#e8762d',
  fire3: '#f6b13b',
  fire4: '#ffe27a',
  fire5: '#fff7cf',

  // magia / noite
  night0: '#07090f',
  night1: '#0d1424',
  night2: '#16213a',
  night3: '#22325a',
  violet0: '#2b1d47',
  violet1: '#46306e',
  violet2: '#7a5aa8',
  violet3: '#b79be0',
  petal: '#d9a3d6',
  petal2: '#f0d0ee',
  firefly: '#e9f59a',
  firefly2: '#b8e06a',
  gold0: '#6b4a12',
  gold1: '#a8741c',
  gold2: '#d9a531',
  gold3: '#f5d36b',
  gold4: '#fff1b5',
  brass0: '#4a3218',
  brass1: '#7b5626',
  brass2: '#b08236',
  brass3: '#dcb35e',
  copper: '#b0613a',
  steam: '#c9d3e0',

  // papel / pergaminho
  paper0: '#8a6a45',
  paper1: '#c9a774',
  paper2: '#e6cf9c',
  paper3: '#f6e9c4',

  // pele
  skin0: '#f2c49b',
  skin0s: '#d29c76',
  skin1: '#d9a072',
  skin1s: '#b07850',
  skin2: '#a96f48',
  skin2s: '#83512f',
  skin3: '#6e4528',
  skin3s: '#4f2f1b',

  // UI
  uiBg: '#120e18',
  uiBg2: '#1d1726',
  uiEdge: '#e6cf9c',
  uiEdgeDark: '#6b5236',
  uiText: '#f6e9c4',
  uiAccent: '#f5d36b',
  uiMuted: '#8f8296',
  white: '#ffffff',
} as const;

export type PaletteKey = keyof typeof P;

/** Converte '#rrggbb' para número 0xrrggbb. */
export function hex(c: string): number {
  return parseInt(c.slice(1), 16);
}

/** Converte '#rrggbb' em [r,g,b]. */
export function rgb(c: string): [number, number, number] {
  const n = hex(c);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
