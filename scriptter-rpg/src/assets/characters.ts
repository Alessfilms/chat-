import Phaser from 'phaser';
import { P } from './palette';
import { PixelCanvas, rng } from './PixelCanvas';

/**
 * Gerador de sprite sheets de personagens ("paper doll" em pixel art).
 *
 * Cada personagem é montado por partes (cabelo, rosto, roupa, acessórios)
 * desenhadas pixel a pixel num quadro de 16x20, com contorno automático de 1px
 * e sombra embutida. O lado direito é o espelho do lado esquerdo.
 *
 * Layout da sheet (frame 16x20):
 *   linhas  = direções: 0 down, 1 left, 2 right, 3 up
 *   colunas = idle0 idle1 | walk0 walk1 walk2 walk3 | interact0 interact1 | celebrate0 celebrate1
 */
export const CHAR_W = 16;
export const CHAR_H = 20;
export const DIRS = ['down', 'left', 'right', 'up'] as const;
export type Dir = (typeof DIRS)[number];

export const SHEET_COLS = {
  idle: [0, 1],
  walk: [2, 3, 4, 5],
  interact: [6, 7],
  celebrate: [8, 9],
} as const;
export type AnimName = keyof typeof SHEET_COLS;

export type HairStyle = 'messy' | 'neat' | 'long' | 'bun' | 'short' | 'hood' | 'hat';

export interface CharacterStyle {
  skin: string;
  skinShade: string;
  hair: string;
  hairLight: string;
  hairStyle: HairStyle;
  shirt: string;
  shirtShade: string;
  pants: string;
  shoes: string;
  /** cor do capuz/chapéu quando hairStyle = hood | hat */
  headwear?: string;
  headwearShade?: string;
  scarf?: string;
  scarfShade?: string;
  glasses?: boolean;
  book?: boolean;
  coat?: boolean;
  belt?: string;
}

type Legs = 'stand' | 'stepA' | 'stepB';
type Arms = 'down' | 'swingA' | 'swingB' | 'forward' | 'up' | 'book';

interface Pose {
  bob: number; // desloca corpo inteiro para cima
  legs: Legs;
  arms: Arms;
  flutter?: number; // animação do cachecol
  sparkle?: boolean;
}

/** Contexto de desenho com origem do quadro. */
class Frame {
  constructor(public pc: PixelCanvas, public ox: number, public oy: number) {}
  p(x: number, y: number, c: string | undefined, a = 255) {
    if (!c) return;
    this.pc.px(this.ox + x, this.oy + y, c, a);
  }
  vline(x: number, y0: number, y1: number, c: string) {
    for (let y = y0; y <= y1; y++) this.p(x, y, c);
  }
  clear(x: number, y: number) {
    this.pc.px(this.ox + x, this.oy + y, null);
  }
  r(x: number, y: number, w: number, h: number, c: string | undefined) {
    if (!c) return;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, c);
  }
}

// ---------------------------------------------------------------------------
// Partes — visão de FRENTE (down)
// ---------------------------------------------------------------------------
function drawFront(f: Frame, s: CharacterStyle, pose: Pose) {
  const b = -pose.bob;
  // pernas
  const legY = 15;
  const lL = pose.legs === 'stepA' ? 1 : pose.legs === 'stepB' ? -1 : 0;
  const lR = -lL;
  f.r(6, legY + b, 2, 2 + Math.max(0, lL), s.pants);
  f.r(8, legY + b, 2, 2 + Math.max(0, lR), s.pants);
  f.p(8, legY + b, shade(s.pants));
  f.r(6, 17 + b + Math.max(0, lL) - (lL < 0 ? 1 : 0), 2, 1, s.shoes);
  f.r(8, 17 + b + Math.max(0, lR) - (lR < 0 ? 1 : 0), 2, 1, s.shoes);

  // corpo
  const coatExtra = s.coat ? 1 : 0;
  f.r(5, 10 + b, 6, 5 + coatExtra, s.shirt);
  f.r(10, 10 + b, 1, 5 + coatExtra, s.shirtShade);
  f.r(5, 14 + b + coatExtra, 6, 1, s.shirtShade);
  if (s.coat) {
    f.p(7, 11 + b, s.shirtShade);
    f.p(7, 13 + b, P.gold2);
    f.vline(8, 11 + b, 14 + b, s.shirtShade);
  }
  if (s.belt) f.r(5, 13 + b, 6, 1, s.belt);

  // braços
  drawArmsFront(f, s, pose, b);

  // cabeça
  f.r(4, 3 + b, 8, 7, s.skin);
  f.clear(4, 9 + b);
  f.clear(11, 9 + b);
  f.r(11, 4 + b, 1, 6, s.skinShade);
  f.r(5, 9 + b, 6, 1, s.skinShade);
  // olhos
  f.p(6, 7 + b, P.ink);
  f.p(9, 7 + b, P.ink);
  f.p(5, 8 + b, '#e59a8a', 160);
  f.p(10, 8 + b, '#e59a8a', 160);

  drawHairFront(f, s, b);

  if (s.glasses) {
    f.p(5, 7 + b, P.inkSoft);
    f.p(6, 7 + b, '#bfe3ee');
    f.p(7, 7 + b, P.inkSoft);
    f.p(8, 7 + b, P.inkSoft);
    f.p(9, 7 + b, '#bfe3ee');
    f.p(10, 7 + b, P.inkSoft);
    f.p(6, 6 + b, P.inkSoft);
    f.p(9, 6 + b, P.inkSoft);
  }
  if (s.scarf) {
    f.r(5, 10 + b, 6, 1, s.scarf);
    f.r(4, 10 + b, 1, 1, s.scarfShade);
    f.r(11, 10 + b, 1, 1, s.scarfShade);
    const fl = pose.flutter ?? 0;
    f.r(9, 11 + b, 2, 2 + (fl > 0 ? 1 : 0), s.scarf);
    f.p(10, 12 + b, s.scarfShade);
  }
}

function drawArmsFront(f: Frame, s: CharacterStyle, pose: Pose, b: number) {
  const sl = s.shirtShade;
  switch (pose.arms) {
    case 'up':
      f.r(3, 5 + b, 1, 5, sl);
      f.r(12, 5 + b, 1, 5, sl);
      f.p(3, 4 + b, s.skin);
      f.p(12, 4 + b, s.skin);
      return;
    case 'forward':
      f.r(4, 10 + b, 1, 2, sl);
      f.r(11, 10 + b, 1, 2, sl);
      f.r(5, 12 + b, 1, 1, sl);
      f.r(10, 12 + b, 1, 1, sl);
      f.p(6, 12 + b, s.skin);
      f.p(9, 12 + b, s.skin);
      return;
    case 'book': {
      f.r(4, 10 + b, 1, 3, sl);
      f.r(11, 10 + b, 1, 3, sl);
      // livro aberto segurado à frente
      f.r(5, 12 + b, 6, 3, P.paper3);
      f.vline(8, 12 + b, 14 + b, P.paper1);
      f.r(5, 15 + b, 6, 1, '#7a2e3a');
      f.p(4, 13 + b, s.skin);
      f.p(11, 13 + b, s.skin);
      f.p(6, 13 + b, P.paper1);
      f.p(9, 13 + b, P.paper1);
      return;
    }
    default: {
      const dl = pose.arms === 'swingA' ? 1 : pose.arms === 'swingB' ? -1 : 0;
      f.r(4, 10 + b, 1, 4 + (dl < 0 ? -1 : 0), sl);
      f.r(11, 10 + b, 1, 4 + (dl > 0 ? -1 : 0), sl);
      f.p(4, 14 + b + (dl < 0 ? -1 : 0), s.skin);
      f.p(11, 14 + b + (dl > 0 ? -1 : 0), s.skin);
      if (s.book && pose.arms === 'down') {
        f.r(11, 12 + b, 2, 3, '#7a2e3a');
        f.p(12, 12 + b, P.paper2);
      }
    }
  }
}

function drawHairFront(f: Frame, s: CharacterStyle, b: number) {
  const h = s.hair, hl = s.hairLight, hd = shade(s.hair);
  switch (s.hairStyle) {
    case 'messy':
      f.r(4, 2 + b, 8, 3, h);
      f.p(5, 1 + b, h); f.p(8, 1 + b, h); f.p(10, 1 + b, h);
      f.r(4, 5 + b, 3, 1, h); f.p(4, 6 + b, h); f.p(8, 5 + b, h); f.r(10, 5 + b, 2, 1, h);
      f.r(11, 5 + b, 1, 3, hd); f.r(4, 5 + b, 1, 3, h);
      f.p(6, 2 + b, hl); f.p(7, 2 + b, hl); f.p(9, 3 + b, hl);
      break;
    case 'neat':
      f.r(4, 2 + b, 8, 3, h);
      f.r(4, 5 + b, 5, 1, h);
      f.r(4, 5 + b, 1, 4, h); f.r(11, 4 + b, 1, 4, hd);
      f.p(6, 3 + b, hl); f.p(7, 3 + b, hl); f.p(5, 4 + b, hl);
      break;
    case 'long':
      f.r(4, 2 + b, 8, 3, h);
      f.r(3, 4 + b, 2, 8, h); f.r(11, 4 + b, 2, 8, hd);
      f.r(5, 5 + b, 2, 1, h); f.r(9, 5 + b, 2, 1, h);
      f.p(6, 3 + b, hl); f.p(7, 3 + b, hl); f.p(3, 6 + b, hl);
      break;
    case 'bun':
      f.r(4, 2 + b, 8, 3, h);
      f.r(6, 0 + b, 4, 2, h); f.p(7, 0 + b, hl);
      f.r(4, 5 + b, 1, 3, h); f.r(11, 5 + b, 1, 3, hd);
      f.p(6, 3 + b, hl);
      break;
    case 'short':
      f.r(4, 2 + b, 8, 3, h);
      f.p(4, 5 + b, h); f.p(11, 5 + b, hd);
      f.p(6, 2 + b, hl); f.p(9, 3 + b, hl);
      break;
    case 'hood': {
      const c = s.headwear ?? P.violet1, cs = s.headwearShade ?? P.violet0;
      f.r(3, 2 + b, 10, 3, c);
      f.r(3, 5 + b, 1, 6, c); f.r(12, 5 + b, 1, 6, cs);
      f.r(4, 9 + b, 1, 2, c); f.r(11, 9 + b, 1, 2, cs);
      f.r(4, 5 + b, 8, 1, cs);
      f.p(5, 2 + b, shade(c, -1));
      break;
    }
    case 'hat': {
      const c = s.headwear ?? P.wood1, cs = s.headwearShade ?? P.wood0;
      f.r(4, 4 + b, 8, 2, h);
      f.r(2, 3 + b, 12, 1, cs);
      f.r(5, 0 + b, 6, 3, c);
      f.r(5, 2 + b, 6, 1, P.fire1);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// COSTAS (up)
// ---------------------------------------------------------------------------
function drawBack(f: Frame, s: CharacterStyle, pose: Pose) {
  const b = -pose.bob;
  const lL = pose.legs === 'stepA' ? 1 : pose.legs === 'stepB' ? -1 : 0;
  const lR = -lL;
  f.r(6, 15 + b, 2, 2 + Math.max(0, lL), s.pants);
  f.r(8, 15 + b, 2, 2 + Math.max(0, lR), s.pants);
  f.r(6, 17 + b + Math.max(0, lL) - (lL < 0 ? 1 : 0), 2, 1, s.shoes);
  f.r(8, 17 + b + Math.max(0, lR) - (lR < 0 ? 1 : 0), 2, 1, s.shoes);
  const coatExtra = s.coat ? 1 : 0;
  f.r(5, 10 + b, 6, 5 + coatExtra, s.shirt);
  f.r(10, 10 + b, 1, 5 + coatExtra, s.shirtShade);
  if (s.belt) f.r(5, 13 + b, 6, 1, s.belt);
  const sl = s.shirtShade;
  if (pose.arms === 'up') {
    f.r(3, 5 + b, 1, 5, sl); f.r(12, 5 + b, 1, 5, sl);
    f.p(3, 4 + b, s.skin); f.p(12, 4 + b, s.skin);
  } else {
    const dl = pose.arms === 'swingA' ? 1 : pose.arms === 'swingB' ? -1 : 0;
    f.r(4, 10 + b, 1, 4 + (dl > 0 ? -1 : 0), sl);
    f.r(11, 10 + b, 1, 4 + (dl < 0 ? -1 : 0), sl);
    f.p(4, 14 + b + (dl > 0 ? -1 : 0), s.skin);
    f.p(11, 14 + b + (dl < 0 ? -1 : 0), s.skin);
  }
  // cabeça (nuca)
  f.r(4, 3 + b, 8, 7, s.skin);
  const h = s.hair, hd = shade(s.hair), hl = s.hairLight;
  if (s.hairStyle === 'hood') {
    const c = s.headwear ?? P.violet1, cs = s.headwearShade ?? P.violet0;
    f.r(3, 2 + b, 10, 9, c); f.r(11, 3 + b, 2, 8, cs); f.r(6, 10 + b, 4, 3, cs);
  } else if (s.hairStyle === 'hat') {
    const c = s.headwear ?? P.wood1, cs = s.headwearShade ?? P.wood0;
    f.r(4, 4 + b, 8, 5, h); f.r(2, 3 + b, 12, 1, cs); f.r(5, 0 + b, 6, 3, c); f.r(5, 2 + b, 6, 1, P.fire1);
  } else {
    const bottom = s.hairStyle === 'long' ? 12 : s.hairStyle === 'short' ? 7 : 9;
    f.r(4, 2 + b, 8, bottom - 2, h);
    f.r(10, 3 + b, 2, bottom - 3, hd);
    if (s.hairStyle === 'long') { f.r(3, 4 + b, 1, 8, h); f.r(12, 4 + b, 1, 8, hd); }
    if (s.hairStyle === 'bun') { f.r(6, 0 + b, 4, 2, h); f.p(7, 0 + b, hl); }
    if (s.hairStyle === 'messy') { f.p(5, 1 + b, h); f.p(8, 1 + b, h); f.p(10, 1 + b, h); }
    f.p(6, 3 + b, hl); f.p(7, 3 + b, hl);
  }
  if (s.scarf) {
    f.r(4, 10 + b, 8, 1, s.scarf);
    const fl = pose.flutter ?? 0;
    f.r(7, 11 + b, 2, 2 + (fl > 0 ? 1 : 0), s.scarf);
    f.p(8, 12 + b, s.scarfShade);
  }
}

// ---------------------------------------------------------------------------
// PERFIL ESQUERDO (left). O direito é espelhado.
// ---------------------------------------------------------------------------
function drawSide(f: Frame, s: CharacterStyle, pose: Pose) {
  const b = -pose.bob;
  // pernas
  if (pose.legs === 'stand') {
    f.r(7, 15 + b, 3, 2, s.pants);
    f.p(9, 15 + b, shade(s.pants));
    f.r(6, 17 + b, 3, 1, s.shoes);
    f.p(9, 17 + b, s.shoes);
  } else {
    const front = pose.legs === 'stepA';
    // perna da frente (vai para a esquerda) e de trás
    f.r(5, 15 + b, 2, 2, front ? s.pants : shade(s.pants));
    f.r(9, 15 + b, 2, 2, front ? shade(s.pants) : s.pants);
    f.r(4, 17 + b, 3, 1, s.shoes);
    f.r(9, 17 + b, 2, 1, s.shoes);
  }
  // capa/cachecol atrás
  if (s.scarf) {
    const fl = pose.flutter ?? 0;
    f.r(10, 10 + b, 2, 1, s.scarf);
    f.r(11, 11 + b - fl, 1, 2, s.scarf);
    f.p(12, 11 + b - fl, s.scarfShade);
    if (fl > 0) f.p(12, 10 + b - fl, s.scarf);
  }
  // corpo
  const coatExtra = s.coat ? 1 : 0;
  f.r(6, 10 + b, 5, 5 + coatExtra, s.shirt);
  f.r(10, 10 + b, 1, 5 + coatExtra, s.shirtShade);
  if (s.belt) f.r(6, 13 + b, 5, 1, s.belt);
  // cabeça
  f.r(4, 3 + b, 7, 7, s.skin);
  f.p(3, 7 + b, s.skin); // nariz
  f.r(5, 9 + b, 5, 1, s.skinShade);
  f.p(5, 7 + b, P.ink);
  // cabelo
  const h = s.hair, hd = shade(s.hair), hl = s.hairLight;
  switch (s.hairStyle) {
    case 'hood': {
      const c = s.headwear ?? P.violet1, cs = s.headwearShade ?? P.violet0;
      f.r(4, 2 + b, 8, 3, c); f.r(7, 5 + b, 5, 6, c); f.r(10, 5 + b, 2, 6, cs); f.p(4, 5 + b, cs);
      break;
    }
    case 'hat': {
      const c = s.headwear ?? P.wood1, cs = s.headwearShade ?? P.wood0;
      f.r(7, 4 + b, 5, 5, h); f.r(2, 3 + b, 11, 1, cs); f.r(5, 0 + b, 6, 3, c); f.r(5, 2 + b, 6, 1, P.fire1);
      break;
    }
    default: {
      const bottom = s.hairStyle === 'long' ? 12 : s.hairStyle === 'short' ? 6 : 8;
      f.r(4, 2 + b, 8, 3, h);
      f.r(8, 5 + b, 4, bottom - 4, h);
      f.r(11, 4 + b, 1, bottom - 3, hd);
      if (s.hairStyle === 'messy') { f.p(5, 1 + b, h); f.p(8, 1 + b, h); f.p(3, 4 + b, h); f.p(4, 5 + b, h); }
      if (s.hairStyle === 'neat') { f.r(4, 5 + b, 2, 1, h); }
      if (s.hairStyle === 'bun') { f.r(10, 1 + b, 3, 3, h); }
      f.p(6, 2 + b, hl); f.p(7, 2 + b, hl);
    }
  }
  if (s.glasses) {
    f.p(4, 7 + b, P.inkSoft); f.p(5, 7 + b, '#bfe3ee'); f.p(6, 7 + b, P.inkSoft); f.p(7, 7 + b, P.inkSoft);
    f.p(5, 6 + b, P.inkSoft);
  }
  if (s.scarf) { f.r(5, 10 + b, 5, 1, s.scarf); f.p(9, 10 + b, s.scarfShade); }
  // braço (frente)
  const sl = s.shirtShade;
  switch (pose.arms) {
    case 'forward':
      f.r(4, 11 + b, 4, 1, sl); f.p(3, 11 + b, s.skin);
      break;
    case 'up':
      f.r(7, 5 + b, 1, 5, sl); f.p(7, 4 + b, s.skin);
      break;
    case 'book':
      f.r(7, 11 + b, 1, 2, sl); f.r(3, 12 + b, 4, 2, P.paper3); f.r(3, 14 + b, 4, 1, '#7a2e3a'); f.p(7, 13 + b, s.skin);
      break;
    default: {
      const d = pose.arms === 'swingA' ? -1 : pose.arms === 'swingB' ? 1 : 0;
      f.r(8 + d, 11 + b, 1, 3, sl);
      f.p(8 + d, 14 + b, s.skin);
      if (s.book && pose.arms === 'down') { f.r(7, 12 + b, 2, 3, '#7a2e3a'); f.p(7, 12 + b, P.paper2); }
    }
  }
}

// ---------------------------------------------------------------------------

function shade(c: string, amt = 1): string {
  const n = parseInt(c.slice(1), 16);
  const k = amt > 0 ? 0.72 : 1.25;
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * k));
  const b = Math.min(255, Math.round((n & 255) * k));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function shadowAt(pc: PixelCanvas, ox: number, oy: number, bob: number) {
  // sombra elíptica (não recebe contorno); encolhe quando o personagem pula
  const rx = bob > 1 ? 4 : 5;
  for (let y = 17; y <= 19; y++)
    for (let x = 1; x < 15; x++) {
      const dx = (x + 0.5 - 8) / rx, dy = (y + 0.5 - 18.4) / 1.4;
      if (dx * dx + dy * dy <= 1 && pc.alphaAt(ox + x, oy + y) === 0) pc.px(ox + x, oy + y, P.ink, 90);
    }
}

/** Poses por coluna da sheet, para personagens principais. */
function poseFor(col: number, style: CharacterStyle, energetic: boolean): Pose {
  const idleArms: Arms = style.book ? 'down' : 'down';
  switch (col) {
    case 0: return { bob: 0, legs: 'stand', arms: idleArms, flutter: 0 };
    case 1: return { bob: energetic ? 1 : 0, legs: 'stand', arms: idleArms, flutter: 1 };
    case 2: return { bob: 0, legs: 'stand', arms: 'down', flutter: 0 };
    case 3: return { bob: 1, legs: 'stepA', arms: 'swingA', flutter: 1 };
    case 4: return { bob: 0, legs: 'stand', arms: 'down', flutter: 0 };
    case 5: return { bob: 1, legs: 'stepB', arms: 'swingB', flutter: 1 };
    case 6: return { bob: 0, legs: 'stand', arms: style.book ? 'book' : 'forward', flutter: 0 };
    case 7: return { bob: 0, legs: 'stand', arms: style.book ? 'book' : 'forward', flutter: 1, sparkle: true };
    case 8: return { bob: 2, legs: 'stand', arms: 'up', flutter: 1 };
    default: return { bob: 0, legs: 'stand', arms: 'up', flutter: 0 };
  }
}

function drawCharFrame(pc: PixelCanvas, ox: number, oy: number, dir: Dir, style: CharacterStyle, pose: Pose) {
  const f = new Frame(pc, ox, oy);
  if (dir === 'down') drawFront(f, style, pose);
  else if (dir === 'up') drawBack(f, style, pose);
  else drawSide(f, style, pose);
  pc.outline(P.ink, { x: ox, y: oy, w: CHAR_W, h: CHAR_H });
  if (pose.sparkle) {
    // faísca dourada de "interação"
    const sx = dir === 'left' ? 2 : dir === 'right' ? 13 : 13;
    f.p(sx, 9, P.gold3); f.p(sx, 8, P.gold4); f.p(sx - 1, 9, P.gold2); f.p(sx + 1, 9, P.gold2); f.p(sx, 10, P.gold2);
  }
  shadowAt(pc, ox, oy, pose.bob);
}

/**
 * Gera sheet completa (4 direções × 10 quadros) e registra a textura com
 * quadros nomeados `${dir}-${col}`.
 */
export function bakeCharacterSheet(scene: Phaser.Scene, key: string, style: CharacterStyle, energetic = false): void {
  const cols = 10;
  const pc = new PixelCanvas(CHAR_W * cols, CHAR_H * 4);
  (['down', 'left', 'up'] as Dir[]).forEach((dir) => {
    const row = DIRS.indexOf(dir);
    for (let c = 0; c < cols; c++) drawCharFrame(pc, c * CHAR_W, row * CHAR_H, dir, style, poseFor(c, style, energetic));
  });
  // direita = espelho da esquerda
  for (let c = 0; c < cols; c++) pc.mirrorRegion(c * CHAR_W, 1 * CHAR_H, CHAR_W, CHAR_H, c * CHAR_W, 2 * CHAR_H);

  const tex = scene.textures.addCanvas(key, pc.commit())!;
  DIRS.forEach((dir, row) => {
    for (let c = 0; c < cols; c++) tex.add(`${dir}-${c}`, 0, c * CHAR_W, row * CHAR_H, CHAR_W, CHAR_H);
  });
}

/** Registra as animações Phaser (idle/walk/interact/celebrate × 4 direções). */
export function registerCharacterAnims(scene: Phaser.Scene, key: string, energetic = false): void {
  const rates: Record<AnimName, number> = { idle: energetic ? 3 : 2, walk: 8, interact: 4, celebrate: 6 };
  for (const dir of DIRS) {
    for (const name of Object.keys(SHEET_COLS) as AnimName[]) {
      const k = `${key}-${name}-${dir}`;
      if (scene.anims.exists(k)) continue;
      scene.anims.create({
        key: k,
        frames: SHEET_COLS[name].map((c) => ({ key, frame: `${dir}-${c}` })),
        frameRate: rates[name],
        repeat: -1,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// MULTIDÃO — variações leves (8 quadros cada) para o Blitter
// ---------------------------------------------------------------------------
export const CROWD_FRAMES = ['idle0', 'idle1', 'wd0', 'wd1', 'ws0', 'ws1', 'wu0', 'wu1', 'cheer'] as const;
export type CrowdFrame = (typeof CROWD_FRAMES)[number];
export const CROWD_VARIANTS = 28;

const SKINS: [string, string][] = [[P.skin0, P.skin0s], [P.skin1, P.skin1s], [P.skin2, P.skin2s], [P.skin3, P.skin3s]];
const HAIRS: [string, string][] = [
  ['#2b2238', '#4a3d5e'], ['#5a3420', '#7d4c2e'], ['#8a5a2b', '#b07a3e'], ['#c9a04a', '#e8c76e'],
  ['#9a3b2a', '#c4573a'], ['#d8d2c4', '#f2eee2'], ['#1b1b22', '#3a3a48'],
];
const SHIRTS: [string, string][] = [
  ['#4f6b8f', '#3a5070'], ['#6b4f8f', '#503a70'], ['#8f4f4f', '#6e3a3a'], ['#4f8f6b', '#3a6e50'],
  ['#8f7a4f', '#6e5c3a'], ['#3f5a5a', '#2c4242'], ['#a0603a', '#7a462a'], ['#5a4a6e', '#403452'],
  ['#2f4a6a', '#22364f'], ['#7a3a5a', '#5a2a42'],
];
const PANTS = ['#3a3048', '#2e3a4a', '#4a3a2e', '#3a4a3e', '#2a2a36'];
const STYLES: HairStyle[] = ['short', 'messy', 'long', 'bun', 'neat', 'hood', 'hat', 'short', 'long'];
const HEADWEAR: [string, string][] = [[P.violet1, P.violet0], ['#2f5a5a', '#1f3e3e'], ['#6b3a2a', '#4a281d'], ['#3a4a7a', '#2a3558']];

export function crowdStyle(i: number): CharacterStyle {
  const r = rng(1000 + i * 17);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const [skin, skinShade] = pick(SKINS);
  const [hair, hairLight] = pick(HAIRS);
  const [shirt, shirtShade] = pick(SHIRTS);
  const hairStyle = pick(STYLES);
  const [headwear, headwearShade] = pick(HEADWEAR);
  return {
    skin, skinShade, hair, hairLight, hairStyle, shirt, shirtShade,
    pants: pick(PANTS), shoes: P.wood0, headwear, headwearShade,
    scarf: r() < 0.18 ? pick([P.fire1, P.gold2, '#4f8fa0']) : undefined,
    scarfShade: '#5a2a2a',
    glasses: r() < 0.15,
    book: r() < 0.15,
    belt: r() < 0.4 ? P.wood0 : undefined,
    coat: r() < 0.3,
  };
}

/**
 * Sheet compacta para a multidão: CROWD_VARIANTS linhas × 9 quadros.
 * Quadros nomeados `v${i}-${frame}`.
 */
export function bakeCrowdSheet(scene: Phaser.Scene, key: string): void {
  const n = CROWD_FRAMES.length;
  const pc = new PixelCanvas(CHAR_W * n, CHAR_H * CROWD_VARIANTS);
  for (let v = 0; v < CROWD_VARIANTS; v++) {
    const st = crowdStyle(v);
    const oy = v * CHAR_H;
    const stand: Pose = { bob: 0, legs: 'stand', arms: 'down' };
    const breathe: Pose = { bob: 1, legs: 'stand', arms: 'down', flutter: 1 };
    const sA: Pose = { bob: 1, legs: 'stepA', arms: 'swingA', flutter: 1 };
    const sB: Pose = { bob: 1, legs: 'stepB', arms: 'swingB' };
    drawCharFrame(pc, 0 * CHAR_W, oy, 'down', st, stand);
    drawCharFrame(pc, 1 * CHAR_W, oy, 'down', st, breathe);
    drawCharFrame(pc, 2 * CHAR_W, oy, 'down', st, sA);
    drawCharFrame(pc, 3 * CHAR_W, oy, 'down', st, sB);
    drawCharFrame(pc, 4 * CHAR_W, oy, 'left', st, sA);
    drawCharFrame(pc, 5 * CHAR_W, oy, 'left', st, sB);
    drawCharFrame(pc, 6 * CHAR_W, oy, 'up', st, sA);
    drawCharFrame(pc, 7 * CHAR_W, oy, 'up', st, sB);
    drawCharFrame(pc, 8 * CHAR_W, oy, 'down', st, { bob: 2, legs: 'stand', arms: 'up' });
  }
  const tex = scene.textures.addCanvas(key, pc.commit())!;
  for (let v = 0; v < CROWD_VARIANTS; v++)
    CROWD_FRAMES.forEach((fr, c) => tex.add(`v${v}-${fr}`, 0, c * CHAR_W, v * CHAR_H, CHAR_W, CHAR_H));
}
