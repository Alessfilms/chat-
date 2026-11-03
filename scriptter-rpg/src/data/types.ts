/** Tipos compartilhados pelos dados de episódios, mapas e timeline. */

export interface Vec {
  x: number;
  y: number;
}

/** Luz pontual (fogueira, janela, lanterna, núcleo da máquina...). */
export interface LightDef {
  radius: number;
  color: number;
  intensity?: number;
  flicker?: number;
  /** brilho aditivo extra (0..1) — dá o "calor" que passa do tom original */
  glow?: number;
}

export type PropType =
  | 'oakL' | 'oakM' | 'pine' | 'bush' | 'bushFlower' | 'rock' | 'mushroom' | 'flower'
  | 'log' | 'crate' | 'stump' | 'campfire' | 'machine' | 'lamp' | 'tent'
  | 'houseA' | 'houseB' | 'tower' | 'wall' | 'castle' | 'banner' | 'well' | 'signpost';

export interface PropDef {
  type: PropType;
  x: number;
  y: number;
  frame?: string;
  /** id opcional para a timeline referenciar */
  id?: string;
  flipX?: boolean;
}

/** Definição de mapa (um por episódio, mas reaproveitável). */
export interface MapDef {
  id: string;
  width: number;
  height: number;
  seed: number;
  /** Pontos nomeados que a timeline usa: "fire", "forestSouth", "machine"... */
  anchors: Record<string, Vec>;
  clearing: { center: Vec; radius: number; dirtRadius: number };
  /** Caminhos de terra (polilinhas) */
  paths: { points: Vec[]; width: number }[];
  forest: { count: number; pineRatio: number; keepOut: { center: Vec; radius: number }[] };
  props: PropDef[];
}

/** Estágios de evolução do mundo, ligados ao número de historiadores. */
export interface StageDef {
  id: string;
  minHistorians: number;
  label: string;
  /** raio da clareira (floresta é derrubada até aqui) */
  clearingRadius: number;
  /** quantos historiadores aparecem como sprites (o resto fica no contador) */
  maxVisibleCrowd: number;
  structures: PropDef[];
  paths?: { points: Vec[]; width: number }[];
}

export interface TimelineEvent {
  /** segundos (número) ou "mm:ss" / "mm:ss.s" */
  time: number | string;
  action: string;
  params?: Record<string, unknown>;
  /** comentário livre, ignorado pelo motor */
  note?: string;
}

export interface TimelineDef {
  episode: string;
  /** arquivo de áudio relativo à pasta do episódio (opcional) */
  audio?: string;
  /** duração total; se ausente usa a duração do áudio ou o último evento + 4s */
  duration?: number;
  events: TimelineEvent[];
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface EpisodeManifest {
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  map: string;
  /** caminhos relativos a public/episodes/<id>/ */
  timeline: string;
  dialogues: string;
  audio?: string;
  /** contagem inicial de historiadores ao entrar no episódio */
  startHistorians?: number;
  /** mostra a máquina já instalada no início */
  machine?: boolean;
  available?: boolean;
}

export interface SocialSnapshot {
  historianCount?: number;
  comments?: { user?: string; text: string }[];
  events?: { type: 'follow' | 'comment'; user?: string; text?: string }[];
}
