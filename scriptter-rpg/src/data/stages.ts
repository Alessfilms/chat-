import type { PropDef, StageDef, Vec } from './types';

/**
 * Evolução do mundo por número de historiadores (seguidores).
 *
 *   0      → A CLAREIRA
 *   500    → PRIMEIRAS CASAS
 *   1.000  → PEQUENA VILA
 *   5.000  → CIDADE
 *   10.000 → GRANDE REINO DOS HISTORIADORES
 *
 * Cada estágio declara o que é construído. As posições são relativas à
 * fogueira (centro), em graus e distância, para funcionar em qualquer mapa.
 * Estágios são cumulativos: o estágio N inclui as estruturas dos anteriores.
 */
export const CENTER_PLACEHOLDER: Vec = { x: 0, y: 0 };

function polar(type: PropDef['type'], deg: number, dist: number, extra: Partial<PropDef> = {}): PropDef {
  const a = (deg * Math.PI) / 180;
  return { type, x: Math.round(Math.cos(a) * dist), y: Math.round(Math.sin(a) * dist * 0.92), ...extra };
}

export const STAGES: StageDef[] = [
  {
    id: 'clearing',
    minHistorians: 0,
    label: 'A CLAREIRA',
    clearingRadius: 150,
    maxVisibleCrowd: 220,
    structures: [polar('banner', -60, 70), polar('banner', -120, 70)],
  },
  {
    id: 'houses',
    minHistorians: 500,
    label: 'PRIMEIRAS CASAS',
    clearingRadius: 215,
    maxVisibleCrowd: 300,
    structures: [
      polar('houseA', -150, 175), polar('houseB', -30, 178), polar('tent', 160, 165),
      polar('tent', 20, 170), polar('lamp', -90, 150), polar('lamp', 90, 120),
    ],
    paths: [{ width: 14, points: [{ x: 0, y: 0 }, { x: -150, y: -80 }] }, { width: 14, points: [{ x: 0, y: 0 }, { x: 150, y: -80 }] }],
  },
  {
    id: 'village',
    minHistorians: 1000,
    label: 'PEQUENA VILA',
    clearingRadius: 300,
    maxVisibleCrowd: 380,
    structures: [
      polar('houseA', 200, 240), polar('houseB', 225, 260), polar('houseA', -45, 250),
      polar('houseB', -135, 255), polar('houseA', -10, 262), polar('well', 135, 210),
      polar('lamp', -165, 210), polar('lamp', -15, 212), polar('signpost', 70, 160),
    ],
    paths: [{ width: 16, points: [{ x: 0, y: 0 }, { x: -230, y: 0 }] }, { width: 16, points: [{ x: 0, y: 0 }, { x: 230, y: 0 }] }],
  },
  {
    id: 'city',
    minHistorians: 5000,
    label: 'CIDADE',
    clearingRadius: 420,
    maxVisibleCrowd: 420,
    structures: [
      polar('tower', -120, 360), polar('tower', -60, 360), polar('wall', -100, 352), polar('wall', -80, 352),
      polar('houseA', 170, 340), polar('houseB', 10, 345), polar('houseB', 155, 300), polar('houseA', 25, 300),
      polar('lamp', 180, 300), polar('lamp', 0, 300),
    ],
  },
  {
    id: 'kingdom',
    minHistorians: 10000,
    label: 'GRANDE REINO DOS HISTORIADORES',
    clearingRadius: 520,
    maxVisibleCrowd: 460,
    structures: [polar('castle', -90, 440), polar('banner', -100, 400), polar('banner', -80, 400)],
  },
];

export function stageFor(count: number): StageDef {
  let s = STAGES[0];
  for (const st of STAGES) if (count >= st.minHistorians) s = st;
  return s;
}

export function stageIndex(id: string): number {
  return Math.max(0, STAGES.findIndex((s) => s.id === id));
}
