import Phaser from 'phaser';
import { PixelCanvas } from './PixelCanvas';

/**
 * Fonte bitmap própria do Scriptter, 5x7 com minúsculas, descendentes e
 * acentos do português. Desenhada pixel a pixel e registrada como BitmapFont
 * do Phaser com largura variável — nada de texto vetorial com antialias.
 *
 * Célula: 2 linhas para acentos + 7 de corpo + 2 de descendente = 11.
 */
const ACC = 2;
const CELL_H = 11;

const G: Record<string, string> = {
  A: '.###. #...# #...# ##### #...# #...# #...#',
  B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.',
  D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####',
  F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .####',
  H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '### .#. .#. .#. .#. .#. ###',
  J: '..### ...#. ...#. ...#. #..#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  N: '#...# ##..# #.#.# #..## #...# #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.',
  P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
  R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.',
  T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.',
  V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# ##.## #...#',
  X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
  Z: '##### ....# ...#. ..#.. .#... #.... #####',
  a: '..... ..... .###. ....# .#### #...# .####',
  b: '#.... #.... ####. #...# #...# #...# ####.',
  c: '.... .... .### #... #... #... .###',
  d: '....# ....# .#### #...# #...# #...# .####',
  e: '..... ..... .###. #...# ##### #.... .###.',
  f: '..## .#.. .#.. ###. .#.. .#.. .#..',
  g: '..... ..... .#### #...# #...# #...# .#### ....# .###.',
  h: '#.... #.... ####. #...# #...# #...# #...#',
  i: '# . # # # # #',
  j: '..# ... ..# ..# ..# ..# ..# #.# .#.',
  k: '#... #... #..# #.#. ##.. #.#. #..#',
  l: '#. #. #. #. #. #. .#',
  m: '..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#',
  n: '..... ..... ####. #...# #...# #...# #...#',
  o: '..... ..... .###. #...# #...# #...# .###.',
  p: '..... ..... ####. #...# #...# #...# ####. #.... #....',
  q: '..... ..... .#### #...# #...# #...# .#### ....# ....#',
  r: '.... .... #.## ##.. #... #... #...',
  s: '..... ..... .#### #.... .###. ....# ####.',
  t: '.#.. .#.. ###. .#.. .#.. .#.. ..##',
  u: '..... ..... #...# #...# #...# #...# .####',
  v: '..... ..... #...# #...# #...# .#.#. ..#..',
  w: '..... ..... #...# #...# #.#.# #.#.# .#.#.',
  x: '..... ..... #...# .#.#. ..#.. .#.#. #...#',
  y: '..... ..... #...# #...# #...# #...# .#### ....# .###.',
  z: '..... ..... ##### ...#. ..#.. .#... #####',
  '0': '.###. #...# #..## #.#.# ##..# #...# .###.',
  '1': '.#. ##. .#. .#. .#. .#. ###',
  '2': '.###. #...# ....# ..##. .#... #.... #####',
  '3': '####. ....# ....# .###. ....# ....# ####.',
  '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  '5': '##### #.... ####. ....# ....# #...# .###.',
  '6': '.###. #.... #.... ####. #...# #...# .###.',
  '7': '##### ....# ...#. ..#.. .#... .#... .#...',
  '8': '.###. #...# #...# .###. #...# #...# .###.',
  '9': '.###. #...# #...# .#### ....# ....# .###.',
  ' ': '... ... ... ... ... ... ...',
  '.': '. . . . . . #',
  ',': '.. .. .. .. .. .# .# #.',
  '!': '# # # # # . #',
  '?': '.###. #...# ....# ..##. ..#.. ..... ..#..',
  ':': '. . # . . # .',
  ';': '.. .. .# .. .. .# .# #.',
  '-': '... ... ... ### ... ... ...',
  '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
  '=': '.... .... #### .... #### .... ....',
  '"': '#.# #.# ... ... ... ... ...',
  "'": '# # . . . . .',
  '(': '.# #. #. #. #. #. .#',
  ')': '#. .# .# .# .# .# #.',
  '/': '....# ...#. ...#. ..#.. .#... .#... #....',
  '—': '..... ..... ..... ##### ..... ..... .....',
  '·': '. . . # . . .',
  '@': '.###. #...# #.### #.#.# #.### #.... .###.',
  '#': '.#.#. ##### .#.#. .#.#. .#.#. ##### .#.#.',
  '*': '..... #.#.# .###. ##### .###. #.#.# .....',
  '_': '..... ..... ..... ..... ..... ..... #####',
  '>': '#... .#.. ..#. ...# ..#. .#.. #...',
  '<': '...# ..#. .#.. #... .#.. ..#. ...#',
  '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
  '&': '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#',
  '[': '## #. #. #. #. #. ##',
  ']': '## .# .# .# .# .# ##',
  '↓': '..#.. ..#.. ..#.. ..#.. #.#.# .###. ..#..',
  '→': '..... ..#.. ...#. ##### ...#. ..#.. .....',
  '♥': '..... .#.#. ##### ##### .###. ..#.. .....',
  '★': '..#.. ..#.. ##### .###. .###. ##.## #...#',
  '▶': '#... ##.. ###. #### ###. ##.. #...',
  '❚': '##.## ##.## ##.## ##.## ##.## ##.## ##.##',
};

type Mark = 'acute' | 'grave' | 'circ' | 'tilde' | 'diaer' | 'cedil';
const MARKS: Record<Mark, [number, number][]> = {
  acute: [[1, 0], [0, 1]],
  grave: [[-1, 0], [0, 1]],
  circ: [[0, 0], [-1, 1], [1, 1]],
  tilde: [[-1, 1], [0, 0], [1, 1], [2, 0]],
  diaer: [[-1, 1], [1, 1]],
  cedil: [[0, 7], [-1, 8], [0, 8]],
};

const COMPOSED: Record<string, [string, Mark]> = {
  'á': ['a', 'acute'], 'à': ['a', 'grave'], 'â': ['a', 'circ'], 'ã': ['a', 'tilde'],
  'é': ['e', 'acute'], 'ê': ['e', 'circ'], 'í': ['ı', 'acute'], 'ó': ['o', 'acute'],
  'ô': ['o', 'circ'], 'õ': ['o', 'tilde'], 'ú': ['u', 'acute'], 'ü': ['u', 'diaer'],
  'ç': ['c', 'cedil'],
  'Á': ['A', 'acute'], 'À': ['A', 'grave'], 'Â': ['A', 'circ'], 'Ã': ['A', 'tilde'],
  'É': ['E', 'acute'], 'Ê': ['E', 'circ'], 'Í': ['I', 'acute'], 'Ó': ['O', 'acute'],
  'Ô': ['O', 'circ'], 'Õ': ['O', 'tilde'], 'Ú': ['U', 'acute'], 'Ç': ['C', 'cedil'],
};
// i sem pingo, base para "í"
G['ı'] = '. . # # # # #';

function parse(src: string): string[] {
  return src.split(' ');
}

export const FONT_KEY = 'px';
export const FONT_LINE = 12;

/** Gera textura + dados da BitmapFont e registra no cache do Phaser. */
export function bakeFont(scene: Phaser.Scene): void {
  const chars = [...Object.keys(G), ...Object.keys(COMPOSED)];
  const glyphs: { ch: string; rows: string[]; mark?: Mark; upper?: boolean }[] = chars.map((ch) => {
    const comp = COMPOSED[ch];
    if (comp) {
      const base = parse(G[comp[0]]);
      return { ch, rows: base, mark: comp[1], upper: comp[0] === comp[0].toUpperCase() && comp[0] !== 'ı' };
    }
    return { ch, rows: parse(G[ch]) };
  });

  const widths = glyphs.map((g) => g.rows[0].length);
  const totalW = widths.reduce((a, b) => a + b + 1, 0);
  const pc = new PixelCanvas(totalW, CELL_H);
  const color = '#ffffff';

  let x = 0;
  const layout: { ch: string; x: number; w: number }[] = [];
  glyphs.forEach((g, gi) => {
    const w = widths[gi];
    g.rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') pc.px(x + rx, ACC + ry, color);
    });
    if (g.mark) {
      const cx = Math.floor((w - 1) / 2);
      for (const [mx, my] of MARKS[g.mark]) {
        let yy: number;
        if (g.mark === 'cedil') yy = ACC + my;
        else yy = g.upper ? my : ACC + my; // maiúsculas: acento acima; minúsculas: dentro do corpo
        pc.px(x + cx + mx, yy, color);
      }
    }
    layout.push({ ch: g.ch, x, w });
    x += w + 1;
  });

  const key = FONT_KEY + '-tex';
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, pc.commit())!;
  const frame = tex.get();
  const tw = tex.source[0].width, th = tex.source[0].height;

  const charsData: Record<number, unknown> = {};
  for (const l of layout) {
    const code = l.ch.codePointAt(0)!;
    charsData[code] = {
      x: l.x, y: 0, width: l.w, height: CELL_H,
      centerX: Math.floor(l.w / 2), centerY: Math.floor(CELL_H / 2),
      xOffset: 0, yOffset: 0, xAdvance: l.w + 1,
      data: {}, kerning: {},
      u0: (frame.cutX + l.x) / tw, v0: frame.cutY / th,
      u1: (frame.cutX + l.x + l.w) / tw, v1: (frame.cutY + CELL_H) / th,
    };
  }
  scene.cache.bitmapFont.add(FONT_KEY, {
    data: { font: FONT_KEY, size: CELL_H, lineHeight: FONT_LINE, chars: charsData },
    texture: key,
    frame: null,
  });
}

/**
 * Fonte compacta 3x5 (só maiúsculas e números) para placas de nome no mundo,
 * onde cada pixel da fonte é um pixel do cenário.
 */
const S: Record<string, string> = {
  A: '### #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '### #.. #.. #.. ###', D: '##. #.# #.# #.# ##.',
  E: '### #.. ##. #.. ###', F: '### #.. ##. #.. #..', G: '### #.. #.# #.# ###', H: '#.# #.# ### #.# #.#',
  I: '### .#. .#. .#. ###', J: '..# ..# ..# #.# ###', K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###',
  M: '#.# ### ### #.# #.#', N: '##. #.# #.# #.# #.#', O: '### #.# #.# #.# ###', P: '### #.# ### #.. #..',
  Q: '### #.# #.# ### ..#', R: '##. #.# ##. #.# #.#', S: '### #.. ### ..# ###', T: '### .#. .#. .#. .#.',
  U: '#.# #.# #.# #.# ###', V: '#.# #.# #.# #.# .#.', W: '#.# #.# ### ### #.#', X: '#.# #.# .#. #.# #.#',
  Y: '#.# #.# ### .#. .#.', Z: '### ..# .#. #.. ###',
  '0': '### #.# #.# #.# ###', '1': '.#. ##. .#. .#. ###', '2': '### ..# ### #.. ###', '3': '### ..# ### ..# ###',
  '4': '#.# #.# ### ..# ..#', '5': '### #.. ### ..# ###', '6': '### #.. ### #.# ###', '7': '### ..# ..# .#. .#.',
  '8': '### #.# ### #.# ###', '9': '### #.# ### ..# ###', ' ': '.. .. .. .. ..', '@': '### #.# #.# #.. ###',
  '.': '. . . . #', '-': '... ... ### ... ...', '#': '#.# ### #.# ### #.#',
};
export const FONT_SMALL = 'pxs';

export function bakeSmallFont(scene: Phaser.Scene): void {
  const keys = Object.keys(S);
  const rows = keys.map((k) => S[k].split(' '));
  const totalW = rows.reduce((a, r) => a + r[0].length + 1, 0);
  const pc = new PixelCanvas(totalW, 5);
  const chars: Record<number, unknown> = {};
  let x = 0;
  const lay: { code: number; x: number; w: number }[] = [];
  keys.forEach((k, i) => {
    const r = rows[i], w = r[0].length;
    r.forEach((row, y) => [...row].forEach((c, xx) => { if (c === '#') pc.px(x + xx, y, '#ffffff'); }));
    lay.push({ code: k.codePointAt(0)!, x, w });
    x += w + 1;
  });
  const key = FONT_SMALL + '-tex';
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, pc.commit())!;
  const tw = tex.source[0].width, th = tex.source[0].height;
  for (const l of lay)
    chars[l.code] = {
      x: l.x, y: 0, width: l.w, height: 5, centerX: Math.floor(l.w / 2), centerY: 2, xOffset: 0, yOffset: 0,
      xAdvance: l.w + 1, data: {}, kerning: {}, u0: l.x / tw, v0: 0, u1: (l.x + l.w) / tw, v1: 5 / th,
    };
  scene.cache.bitmapFont.add(FONT_SMALL, { data: { font: FONT_SMALL, size: 5, lineHeight: 6, chars }, texture: key, frame: null });
}

/** Normaliza texto para os glifos disponíveis (reticências, aspas curvas...). */
export function normalizeText(s: string): string {
  return s
    .replace(/…/g, '...')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/–/g, '-');
}
