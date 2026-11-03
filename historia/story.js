/* O Reino Sem Histórias — animação em pixel art sincronizada com narracao.mp3
   Tudo é desenhado proceduralmente numa tela de 216x384 (9:16) e ampliado sem suavização. */
(function () {
'use strict';

const W = 216, H = 384;

/* ---------- utilidades ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = p => { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); };
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (lt, a, b) => clamp((lt - a) / (b - a), 0, 1);
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

let ctx = null;
function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disc(cx, cy, rx, ry, c) {
  ctx.fillStyle = c;
  for (let yy = -ry; yy <= ry; yy++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy / ry) * (yy / ry))));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + yy), w * 2 + 1, 1);
  }
}
function line(x0, y0, x1, y1, c, s = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
  for (let i = 0; i <= n; i++) { const p = n ? i / n : 0; R(lerp(x0, x1, p), lerp(y0, y1, p), s, s, c); }
}

const OUT = '#0e1210';

/* ---------- fonte bitmap 5x7 com acentos ---------- */
const G = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
};
const ACC = { acute: ['...#.', '..#..'], grave: ['.#...', '..#..'], circ: ['..#..', '.#.#.'], tilde: ['.##.#', '#..#.'] };
const ACCMAP = {
  'Á': ['A', 'acute'], 'À': ['A', 'grave'], 'Â': ['A', 'circ'], 'Ã': ['A', 'tilde'],
  'É': ['E', 'acute'], 'Ê': ['E', 'circ'], 'Í': ['I', 'acute'], 'Ó': ['O', 'acute'],
  'Ô': ['O', 'circ'], 'Õ': ['O', 'tilde'], 'Ú': ['U', 'acute'], 'Ç': ['C', null],
};
const GCACHE = {};
function glyph(ch) {
  if (GCACHE[ch]) return GCACHE[ch];
  let base = ch, acc = null, ced = ch === 'Ç';
  if (ACCMAP[ch]) { base = ACCMAP[ch][0]; acc = ACCMAP[ch][1]; }
  if (ch === '—' || ch === '–') base = '-';
  const rows = G[base];
  let g;
  if (!rows) g = { rows: null, off: 0, w: 3 };
  else if (/[A-Z0-9]/.test(base)) g = { rows, off: 0, w: 5, acc, ced };
  else {
    let mn = 5, mx = -1;
    rows.forEach(r => { for (let i = 0; i < 5; i++) if (r[i] === '#') { mn = Math.min(mn, i); mx = Math.max(mx, i); } });
    g = { rows, off: mn, w: mx - mn + 1 };
  }
  return (GCACHE[ch] = g);
}
function textW(s, sc = 1) {
  s = s.toUpperCase(); let w = 0;
  for (const ch of s) w += (glyph(ch).w + 1) * sc;
  return Math.max(0, w - sc);
}
function text(s, x, y, col, sc = 1, align = 'left', shadow = null) {
  s = s.toUpperCase();
  if (align === 'center') x = Math.round(x - textW(s, sc) / 2);
  else if (align === 'right') x = Math.round(x - textW(s, sc));
  if (shadow) text(s, x + sc, y + sc, shadow, sc, 'left');
  ctx.fillStyle = col;
  for (const ch of s) {
    const g = glyph(ch);
    if (g.rows) {
      for (let j = 0; j < 7; j++) for (let i = g.off; i < 5; i++) if (g.rows[j][i] === '#') ctx.fillRect(x + (i - g.off) * sc, y + j * sc, sc, sc);
      if (g.acc) { const a = ACC[g.acc]; for (let j = 0; j < 2; j++) for (let i = 0; i < 5; i++) if (a[j][i] === '#') ctx.fillRect(x + i * sc, y + (j - 3) * sc, sc, sc); }
      if (g.ced) { ctx.fillRect(x + 2 * sc, y + 7 * sc, sc, sc); ctx.fillRect(x + 1 * sc, y + 8 * sc, sc, sc); }
    }
    x += (g.w + 1) * sc;
  }
}
function wrap(s, max) {
  const words = s.split(/\s+/); const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ---------- elementos de interface pixel ---------- */
function frame(x, y, w, h, fill = '#1b1a12', border = '#d4c290') {
  R(x, y, w, h, '#07080a');
  R(x + 1, y + 1, w - 2, h - 2, border);
  R(x + 2, y + 2, w - 4, h - 4, fill);
}
function tag(s, cx, y, col = '#f4e9c8', border = '#d4c290') {
  const w = textW(s) + 8;
  frame(Math.round(cx - w / 2), y, w, 13, '#1b1a12', border);
  text(s, Math.round(cx - w / 2) + 4, y + 4, col);
}
function bubble(cx, by, s, fill = '#f4ecd8', col = '#2a1d14') {
  const w = textW(s) + 8, h = 13, x = Math.round(cx - w / 2), y = by - h - 3;
  R(x, y + 1, w, h - 2, OUT); R(x + 1, y, w - 2, h, OUT);
  R(x + 1, y + 1, w - 2, h - 2, fill);
  R(cx - 1, y + h - 1, 3, 2, OUT); R(cx, y + h - 1, 1, 1, fill); R(cx, y + h, 1, 2, OUT);
  text(s, x + 4, y + 4, col);
}

/* ---------- personagens ---------- */
const SPR = [
  '..oooooo..',
  '.oHHHHHHo.',
  'oHHHHHHHHo',
  'oHSSSSSSHo',
  'oHSESSESHo',
  '.oSSSSSSo.',
  'ooCCCCCCoo',
  'oSCCCCCCSo',
  'oSCCCCCCSo',
  'ooCCCCCCoo',
  '.oPPPPPPo.',
  '.oPPooPPo.',
  '.oBBooBBo.',
];
const CAST = {
  m1: { hair: '#c4502a', skin: '#f0b48a', shirt: '#a8322e', pants: '#3a4a8a' },
  m2: { hair: '#f0d060', skin: '#f3c09a', shirt: '#3f6fb5', pants: '#3a2a22', long: true },
  king: { hair: '#d8d8d8', skin: '#f0b48a', shirt: '#6a2c8a', pants: '#6a2c8a', beard: true, crown: true, robe: true },
  guard: { hair: '#8a90a0', skin: '#e0a47a', shirt: '#4a4f5f', pants: '#2a2e38', spear: true },
};
const HAIRS = ['#2a1a12', '#5a3a20', '#c4502a', '#f0d060', '#8a8a8a', '#1a1a1a', '#a0522d', '#d9d9d9'];
const SHIRTS = ['#6a8a3a', '#8a3a6a', '#3a6a8a', '#b5803a', '#5a4a8a', '#2f7a6a', '#a33a3a', '#cc8844', '#4a7a4a'];
const SKINS = ['#f0b48a', '#d29a6a', '#a8704a', '#7a4a2a', '#f3c09a'];
function villager(i) {
  return {
    hair: HAIRS[(rnd(i * 3.7) * HAIRS.length) | 0], shirt: SHIRTS[(rnd(i * 5.3) * SHIRTS.length) | 0],
    skin: SKINS[(rnd(i * 9.1) * SKINS.length) | 0], pants: rnd(i * 2.2) > 0.5 ? '#3a2a22' : '#2e3a5a',
    long: rnd(i * 4.4) > 0.6,
  };
}
function person(x, y, o, opt = {}) {
  const s = opt.s || 1, t = opt.t || 0;
  x = Math.round(x); y = Math.round(y);
  const rows = SPR.slice();
  if (o.long) { rows[5] = 'oHSSSSSSHo'; rows[6] = 'oHCCCCCCHo'; }
  if (o.beard) { rows[5] = '.oWWWWWWo.'; rows[6] = 'ooCWWWWCoo'; }
  if (o.robe) { rows[10] = '.oCCCCCCo.'; rows[11] = '.oCCCCCCo.'; rows[12] = '.oooooooo.'; }
  const f = opt.walk || 0;
  if (f === 1 && !o.robe) { rows[11] = '.oPPo.oo..'; rows[12] = '.oBBo.....'; }
  if (f === 2 && !o.robe) { rows[11] = '..oo.oPPo.'; rows[12] = '.....oBBo.'; }
  if (opt.back) { rows[3] = 'oHHHHHHHHo'; rows[4] = 'oHHHHHHHHo'; rows[5] = '.oHHHHHHo.'; }
  const blink = ((t * 0.7 + (opt.seed || 0) * 0.37) % 3.2) < 0.12;
  const pal = { o: OUT, H: o.hair, S: o.skin, E: blink ? o.skin : '#1a1a1a', C: o.shirt, P: o.pants, B: '#2a1a14', W: '#efefef' };
  const by = y + (f ? -((f + 1) % 2) : 0);
  if (!opt.noShadow) { ctx.globalAlpha = 0.35; R(x + 1 * s, y + 12.5 * s, 8 * s, 2 * s, '#000'); ctx.globalAlpha = 1; }
  if (o.spear) { R(x + 10 * s, by - 6 * s, s, 18 * s, '#5a3a22'); R(x + 9 * s, by - 9 * s, 3 * s, 3 * s, '#c9cfdb'); R(x + 10 * s, by - 10 * s, s, s, '#c9cfdb'); }
  if (opt.hat) {
    const hr = ['....oo....', '...oTTo...', '..oTTTTo..', '.oTTTTTTo.', 'oYYYYYYYYo'];
    hr.forEach((r, j) => { for (let i = 0; i < 10; i++) { const c = r[i]; if (c === '.') continue; R(x + i * s, by + (j - 4) * s, s, s, c === 'o' ? OUT : c === 'T' ? opt.hat : '#e8c048'); } });
  }
  rows.forEach((r, j) => { for (let i = 0; i < 10; i++) { const c = r[i]; if (c === '.') continue; ctx.fillStyle = pal[c]; ctx.fillRect(x + i * s, by + j * s, s, s); } });
  if (o.helmet || o.spear) { R(x + 2 * s, by + 1 * s, 6 * s, 1 * s, '#b4bac8'); }
  if (o.crown) {
    const cr = ['Y..YY..Y', 'YYYYYYYY', 'YYRYYRYY'];
    cr.forEach((r, j) => { for (let i = 0; i < 8; i++) { const c = r[i]; if (c === '.') continue; R(x + (i + 1) * s, by + (j - 3) * s, s, s, c === 'Y' ? '#e8c048' : '#c02a3a'); } });
  }
  if (opt.armUp) { R(x + 9 * s, by + 2 * s, 2 * s, 6 * s, OUT); R(x + 9 * s, by + 3 * s, 1 * s, 4 * s, o.skin); }
  if (opt.tool) { // martelo levantado/abaixado
    const up = opt.tool > 0;
    if (up) { R(x + 9 * s, by + 1 * s, s, 6 * s, '#5a3a22'); R(x + 8 * s, by - 1 * s, 4 * s, 3 * s, '#8a90a0'); }
    else { R(x + 9 * s, by + 7 * s, 5 * s, s, '#5a3a22'); R(x + 13 * s, by + 5 * s, 3 * s, 4 * s, '#8a90a0'); }
  }
}

/* ---------- elementos de cenário ---------- */
function tree(g, x, y, r, seed, pal) {
  pal = pal || { o: '#0d1712', d: '#2b4430', m: '#3f5f3a', l: '#5c7c45', t: '#4a3020' };
  const C = [[0, 0, r], [-r * 0.65, r * 0.3, r * 0.7], [r * 0.65, r * 0.3, r * 0.7], [0, -r * 0.55, r * 0.7], [-r * 0.4, -r * 0.3, r * 0.6]];
  const inside = (px, py) => C.some(c => (px - c[0]) ** 2 + (py - c[1]) ** 2 <= c[2] * c[2]);
  // tronco
  g.fillStyle = pal.o; g.fillRect(x - 3, y + r * 0.6, 6, r * 0.9 + 1);
  g.fillStyle = pal.t; g.fillRect(x - 2, y + r * 0.6, 4, r * 0.9);
  const ext = Math.ceil(r * 1.5);
  for (let yy = -ext; yy <= ext; yy++) for (let xx = -ext; xx <= ext; xx++) {
    if (!inside(xx, yy)) continue;
    let col;
    if (!inside(xx - 1, yy) || !inside(xx + 1, yy) || !inside(xx, yy - 1) || !inside(xx, yy + 1)) col = pal.o;
    else {
      const n = rnd(seed + xx * 3.1 + yy * 7.7);
      const lightness = (-xx - yy) / r + (n - 0.5) * 0.5;
      col = lightness > 0.55 ? pal.l : lightness < -0.45 ? pal.d : pal.m;
    }
    g.fillStyle = col; g.fillRect(x + xx, y + yy, 1, 1);
  }
}
function pine(g, x, y, h, col = '#1a2c24', o = '#0b140f') {
  for (let k = 0; k < 3; k++) {
    const ty = y + k * h * 0.28, hh = h * 0.45, wmax = h * 0.22 + k * h * 0.08;
    for (let j = 0; j < hh; j++) { const w = Math.round(wmax * j / hh); g.fillStyle = o; g.fillRect(x - w - 1, ty + j, w * 2 + 3, 1); g.fillStyle = col; g.fillRect(x - w, ty + j, w * 2 + 1, 1); }
  }
  g.fillStyle = o; g.fillRect(x - 2, y + h * 0.95, 5, h * 0.2); g.fillStyle = '#3a2618'; g.fillRect(x - 1, y + h * 0.95, 3, h * 0.18);
}
function crate(x, y, s = 1) {
  R(x, y, 13 * s, 13 * s, OUT); R(x + s, y + s, 11 * s, 11 * s, '#7a5634'); R(x + s, y + s, 11 * s, 2 * s, '#946a40');
  R(x + 2 * s, y + 6 * s, 9 * s, s, '#5a3d24'); R(x + s, y + 11 * s, 11 * s, s, '#5a3d24');
}
function fireflies(t, n = 46, tint = 1, yMax = H) {
  for (let i = 0; i < n; i++) {
    const x = rnd(i * 3.1) * W + Math.sin(t * 0.6 + i) * 6;
    const y = rnd(i * 5.7) * yMax + Math.cos(t * 0.5 + i * 1.3) * 5;
    if (Math.sin(t * 2.1 + i * 2.3) < -0.35) continue;
    ctx.globalAlpha = tint;
    R(x, y, 1, 1, i % 3 === 0 ? '#c79ad8' : '#d9e68a');
    ctx.globalAlpha = 1;
  }
}
function campfire(x, y, t) {
  ctx.globalAlpha = 0.06 + 0.015 * Math.sin(t * 9);
  disc(x, y - 4, 70, 52, '#ffb050'); disc(x, y - 4, 48, 36, '#ffb050'); disc(x, y - 4, 28, 20, '#ffc070');
  ctx.globalAlpha = 1;
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    R(x + Math.cos(a) * 10 - 1, y + Math.sin(a) * 5 - 1, 3, 2, '#8d8d86'); R(x + Math.cos(a) * 10 - 1, y + Math.sin(a) * 5 - 1, 3, 1, '#b8b8ae');
  }
  R(x - 6, y - 1, 12, 2, '#4a2a18');
  for (let dx = -5; dx <= 5; dx++) {
    let h = (6 - Math.abs(dx)) * 1.7 + Math.sin(t * 13 + dx * 1.7) * 1.5 + Math.sin(t * 7.1 + dx) * 1;
    h = Math.max(1, h);
    R(x + dx, y - h, 1, h, '#e8742a');
    if (Math.abs(dx) <= 3) { const h2 = h * 0.72; R(x + dx, y - h2, 1, h2, '#ffb43a'); }
    if (Math.abs(dx) <= 1) { const h3 = h * 0.45; R(x + dx, y - h3, 1, h3, '#fff1a0'); }
  }
  for (let i = 0; i < 7; i++) {
    const life = (t * 0.8 + rnd(i)) % 1;
    const ex = x + (rnd(i + 9) - 0.5) * 12 + Math.sin(t * 3 + i) * 2, ey = y - 10 - life * 34;
    R(ex, ey, 1, 1, life < 0.7 ? '#ff9a3a' : '#7a3a22');
  }
}
function lightbulb(cx, y, pop, t) {
  const s = pop < 1 ? (pop < 0.5 ? 1 : 1) : 1;
  if (pop <= 0) return;
  const bob = Math.round(Math.sin(t * 4) * 1);
  y += bob;
  const rows = ['..oooo..', '.oYYYYo.', 'oYWYYYYo', 'oYWYYYYo', 'oYYYYYYo', '.oYYYYo.', '..oGGo..', '..oGGo..', '...oo...'];
  if (pop > 0.3 && Math.floor(t * 6) % 2 === 0) {
    [[-8, 2], [11, 2], [-6, -4], [9, -4], [1, -7], [2, -7]].forEach(p => R(cx - 4 + p[0], y + p[1], 2, 1, '#fff1a0'));
  }
  rows.forEach((r, j) => { for (let i = 0; i < 8; i++) { const c = r[i]; if (c === '.') continue; R(cx - 4 + i * s, y + j * s, s, s, c === 'o' ? OUT : c === 'Y' ? '#ffe066' : c === 'W' ? '#fffbe0' : '#9a9aa0'); } });
}
function gear(cx, cy, r, a, s, col = '#c9a24a') {
  for (let yy = -r - 1; yy <= r + 1; yy++) for (let xx = -r - 1; xx <= r + 1; xx++) {
    const d = Math.sqrt(xx * xx + yy * yy); const ang = Math.atan2(yy, xx) - a;
    const tooth = (((ang % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3)) < Math.PI / 6;
    let c = null;
    if (d < 1.2) c = OUT; else if (d < r - 0.5) c = col; else if (d < r + 1 && tooth) c = col;
    if (c) R(cx + xx * s, cy + yy * s, s, s, c);
  }
}
function machine(x, y, p, t, s = 1, paper = 0) {
  const P = (i, j, w, h, c) => R(x + i * s, y + j * s, w * s, h * s, c);
  if (p > 0) { P(4, 30, 3, 9, OUT); P(5, 30, 1, 8, '#5a5f6a'); P(33, 30, 3, 9, OUT); P(34, 30, 1, 8, '#5a5f6a'); }
  if (p > 0.2) {
    P(2, 10, 36, 22, OUT); P(3, 11, 34, 20, '#7a808e'); P(3, 11, 34, 2, '#9aa1b0'); P(3, 28, 34, 3, '#5c616d');
    for (let k = 0; k < 5; k++) P(5 + k * 7, 13, 1, 1, '#d8dde8');
  }
  if (p > 0.4) gear(x + 30 * s, y + 21 * s, 5, t * 3, s);
  if (p > 0.5) gear(x + 30 * s, y + 9 * s, 3, -t * 4.5, s, '#a8823a');
  if (p > 0.55) { P(11, 1, 18, 10, OUT); P(12, 2, 16, 3, '#b8873a'); P(15, 5, 10, 5, '#b8873a'); P(12, 2, 16, 1, '#e0b060'); P(16, 9, 8, 2, OUT); }
  if (p > 0.7) {
    P(5, 15, 18, 11, OUT); P(6, 16, 16, 9, '#173a33');
    for (let l = 0; l < 3; l++) { const w = 3 + ((t * 5 + l * 3) | 0) % 11; P(7, 17 + l * 3, Math.min(14, w), 1, '#7fe0c8'); }
  }
  if (p > 0.85) {
    P(7, 28, 26, 2, OUT);
    if (paper > 0) { const L = Math.round(paper); P(9, 30, 22, L, OUT); P(10, 30, 20, L - 1, '#f1e6c8'); for (let k = 3; k < L - 2; k += 3) P(12, 30 + k, 12 + ((k * 7) % 5), 1, '#8a7a5a'); }
  }
  if (p >= 1) {
    for (let k = 0; k < 3; k++) { const on = ((t * 3 + k) | 0) % 3 === 0; P(26 + k * 3, 14, 2, 2, on ? ['#ff5a4a', '#ffd04a', '#5aff8a'][k] : '#3a3a3a'); }
    const puff = (t * 0.9) % 1; ctx.globalAlpha = 0.5 * (1 - puff); disc(x + 36 * s, y + (8 - puff * 14) * s, (2 + puff * 3) * s, (2 + puff * 3) * s, '#cfd6e0'); ctx.globalAlpha = 1;
  }
}
function scroll(x, y, w, h, s = 1) {
  R(x, y + 2 * s, w, h - 4 * s, OUT); R(x + s, y + 3 * s, w - 2 * s, h - 6 * s, '#efe0b8');
  R(x - s, y, w + 2 * s, 4 * s, OUT); R(x, y + s, w, 2 * s, '#c9a76a');
  R(x - s, y + h - 4 * s, w + 2 * s, 4 * s, OUT); R(x, y + h - 3 * s, w, 2 * s, '#c9a76a');
}
function book(x, y, col) { R(x, y, 4, 8, OUT); R(x + 1, y + 1, 2, 6, col); R(x + 1, y + 2, 2, 1, '#e8c048'); }

/* ---------- fundos pré-desenhados ---------- */
const BG = {};
function hexrgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
const FX = 108, FY = 196; // centro da clareira / fogueira
function bakeForest() {
  const c = mk(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  const pick = (x, y) => {
    const n = rnd(x * 7.3 + y * 13.1), n2 = rnd(Math.floor(x / 4) * 3.1 + Math.floor(y / 4) * 7.7);
    const dx = (x - FX) / 100, dy = (y - FY) / 120, r = Math.sqrt(dx * dx + dy * dy) + (n2 - 0.5) * 0.09;
    const dr = Math.sqrt(((x - FX) / 32) ** 2 + ((y - FY + 2) / 24) ** 2) + (n2 - 0.5) * 0.3;
    if (x > 100 && x < 116 && y > 352) return n < 0.3 ? '#6a4428' : '#5a3a22';
    if (dr < 1) return n < 0.15 ? '#9a6a40' : n < 0.45 ? '#83552f' : '#744a29';
    if (r < 0.5) return n < 0.07 ? '#4c6c48' : n > 0.985 ? '#c8a8d8' : '#3a573d';
    if (r < 0.82) return n < 0.07 ? '#3a573d' : n > 0.988 ? '#d9e68a' : '#30493a';
    if (r < 1.0) return n < 0.08 ? '#30493a' : '#283e33';
    return n < 0.1 ? '#24372f' : n > 0.985 ? '#3b2a2a' : '#1c2b25';
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const [r, gg, b] = hexrgb(pick(x, y)); const i = (y * W + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  [[8, 8, 40], [30, -6, 34], [178, 2, 38], [206, 30, 32], [-4, 70, 30], [214, 110, 34], [196, 6, 28], [60, -12, 30]].forEach(p => pine(g, p[0], p[1], p[2]));
  const dk = { o: '#0a120e', d: '#1d3026', m: '#25392c', l: '#2f4834', t: '#2e2016' };
  tree(g, 4, 150, 14, 11, dk); tree(g, 214, 196, 13, 12, dk);
  tree(g, 22, 312, 22, 1); tree(g, 46, 340, 16, 2); tree(g, 204, 330, 20, 3); tree(g, 186, 372, 14, 4);
  tree(g, 18, 40, 15, 5); tree(g, 196, 66, 14, 6);
  // banco de tronco atrás da fogueira
  g.fillStyle = OUT; g.fillRect(FX - 24, FY - 33, 48, 10); g.fillStyle = '#6a4024'; g.fillRect(FX - 23, FY - 32, 46, 8);
  g.fillStyle = '#84522e'; g.fillRect(FX - 23, FY - 32, 46, 2); g.fillStyle = '#4e2e1a'; g.fillRect(FX - 23, FY - 26, 46, 2);
  BG.forest = c;
}
function bakeThrone() {
  const c = mk(W, H), g = c.getContext('2d');
  g.fillStyle = '#2b2436'; g.fillRect(0, 0, W, 160);
  for (let y = 0; y < 160; y += 6) for (let x = (y / 6) % 2 ? -6 : 0; x < W; x += 12) {
    g.fillStyle = rnd(x + y * 31) > 0.5 ? '#3a3247' : '#352d42'; g.fillRect(x + 1, y + 1, 11, 5);
  }
  for (let y = 160; y < H; y += 14) for (let x = 0; x < W; x += 14) { g.fillStyle = ((x + y) / 14) % 2 ? '#2b2535' : '#363044'; g.fillRect(x, y, 14, 14); }
  g.fillStyle = '#1d1826'; g.fillRect(0, 156, W, 5);
  // tapete
  g.fillStyle = '#c9a24a'; g.fillRect(86, 150, 44, H); g.fillStyle = '#7d2230'; g.fillRect(88, 150, 40, H); g.fillStyle = '#922a3a'; g.fillRect(92, 150, 32, H);
  // estandartes
  [24, 172].forEach(bx => {
    g.fillStyle = OUT; g.fillRect(bx - 1, 20, 22, 62); g.fillStyle = '#8a2232'; g.fillRect(bx, 21, 20, 56);
    for (let k = 0; k < 10; k++) { g.fillStyle = OUT; g.fillRect(bx + k, 77 + k, 1, 1); g.fillRect(bx + 19 - k, 77 + k, 1, 1); g.fillStyle = '#8a2232'; g.fillRect(bx + k + 1, 77, 18 - 2 * k, k); }
    g.fillStyle = '#e8c048'; g.fillRect(bx + 5, 40, 10, 6); g.fillRect(bx + 5, 37, 2, 3); g.fillRect(bx + 9, 36, 2, 4); g.fillRect(bx + 13, 37, 2, 3);
    g.fillStyle = '#c9a24a'; g.fillRect(bx - 2, 18, 24, 3);
  });
  // trono
  g.fillStyle = OUT; g.fillRect(88, 82, 40, 64); g.fillStyle = '#c9a24a'; g.fillRect(89, 83, 38, 62);
  g.fillStyle = '#7d2230'; g.fillRect(93, 88, 30, 40); g.fillStyle = '#922a3a'; g.fillRect(95, 90, 26, 36);
  g.fillStyle = '#e8c048'; g.fillRect(89, 83, 38, 2); g.fillRect(105, 76, 6, 7); g.fillStyle = OUT; g.fillRect(104, 75, 8, 1);
  g.fillStyle = '#a8823a'; g.fillRect(89, 128, 38, 17); g.fillStyle = '#7d2230'; g.fillRect(92, 128, 32, 6);
  // degraus
  g.fillStyle = '#4a4258'; g.fillRect(76, 146, 64, 6); g.fillStyle = '#5a5268'; g.fillRect(76, 146, 64, 2);
  g.fillStyle = '#3e374c'; g.fillRect(70, 152, 76, 6);
  BG.throne = c;
}
function bakeWorkshop() {
  const c = mk(W, H), g = c.getContext('2d');
  g.fillStyle = '#2e2119'; g.fillRect(0, 0, W, 150);
  for (let x = 0; x < W; x += 9) { g.fillStyle = rnd(x) > 0.5 ? '#352619' : '#3a2a1c'; g.fillRect(x, 0, 8, 150); }
  g.fillStyle = '#1e150f'; g.fillRect(0, 146, W, 6);
  for (let y = 152; y < H; y += 8) { g.fillStyle = (y / 8) % 2 ? '#5a3a24' : '#543620'; g.fillRect(0, y, W, 7); g.fillStyle = '#3e2818'; g.fillRect(0, y + 7, W, 1); for (let x = (y * 7) % 40; x < W; x += 40) g.fillRect(x, y, 1, 7); }
  // janela com lua
  g.fillStyle = OUT; g.fillRect(150, 30, 40, 34); g.fillStyle = '#16203a'; g.fillRect(152, 32, 36, 30);
  g.fillStyle = '#f1e6c0'; g.fillRect(174, 38, 6, 6); g.fillStyle = '#16203a'; g.fillRect(176, 37, 5, 5);
  g.fillStyle = '#5a3a24'; g.fillRect(169, 32, 2, 30); g.fillRect(152, 46, 36, 2);
  // prateleiras
  [[14, 40], [14, 74]].forEach(([x, y]) => {
    g.fillStyle = OUT; g.fillRect(x, y, 70, 4); g.fillStyle = '#7a5634'; g.fillRect(x + 1, y + 1, 68, 2);
    for (let k = 0; k < 9; k++) { const col = ['#8a3a3a', '#3a6a8a', '#b5803a', '#5a8a3a', '#7a5a9a'][k % 5]; g.fillStyle = OUT; g.fillRect(x + 4 + k * 7, y - 10, 6, 10); g.fillStyle = col; g.fillRect(x + 5 + k * 7, y - 9, 4, 9); }
  });
  // bancada
  g.fillStyle = OUT; g.fillRect(10, 112, 64, 8); g.fillStyle = '#84522e'; g.fillRect(11, 113, 62, 5);
  g.fillStyle = OUT; g.fillRect(14, 120, 4, 26); g.fillRect(66, 120, 4, 26);
  g.fillStyle = '#8a90a0'; g.fillRect(20, 108, 10, 4); g.fillRect(40, 106, 3, 6); g.fillStyle = '#c9a24a'; g.fillRect(50, 109, 8, 3);
  BG.workshop = c;
}
function bakeKingdom() {
  const c = mk(W, H), g = c.getContext('2d');
  const bands = ['#0b1020', '#0e1426', '#111a2e', '#152036', '#19253e'];
  for (let y = 0; y < 230; y++) { g.fillStyle = bands[Math.min(4, (y / 46) | 0)]; g.fillRect(0, y, W, 1); }
  // montanhas
  for (let x = 0; x < W; x++) { const h = 30 + Math.sin(x * 0.05) * 10 + Math.sin(x * 0.13 + 1) * 6; g.fillStyle = '#1a2238'; g.fillRect(x, 200 - h, 1, h + 40); }
  // castelo
  const S = '#3d4258', SD = '#30354a', SL = '#4b5170';
  const block = (x, y, w, h) => { g.fillStyle = OUT; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = S; g.fillRect(x, y, w, h); g.fillStyle = SL; g.fillRect(x, y, 2, h); g.fillStyle = SD; g.fillRect(x + w - 2, y, 2, h);
    for (let k = 0; k < w; k += 4) { g.fillStyle = OUT; g.fillRect(x + k - 1, y - 4, 4, 4); g.fillStyle = S; g.fillRect(x + k, y - 3, 2, 3); }
    for (let yy = y + 4; yy < y + h; yy += 5) for (let xx = x + ((yy / 5) % 2 ? 2 : 4); xx < x + w - 2; xx += 6) { g.fillStyle = SD; g.fillRect(xx, yy, 3, 1); } };
  block(70, 150, 76, 60); block(56, 118, 18, 92); block(142, 118, 18, 92); block(96, 100, 24, 50);
  const roof = (cx, y, w, h) => { for (let j = 0; j < h; j++) { const ww = Math.round(w / 2 * j / h); g.fillStyle = OUT; g.fillRect(cx - ww - 1, y + j, ww * 2 + 3, 1); g.fillStyle = j % 3 ? '#5a2330' : '#6e2c3c'; g.fillRect(cx - ww, y + j, ww * 2 + 1, 1); } };
  roof(65, 96, 22, 22); roof(151, 96, 22, 22); roof(108, 74, 28, 26);
  g.fillStyle = OUT; g.fillRect(98, 182, 20, 29); g.fillStyle = '#141824'; g.fillRect(99, 184, 18, 27); g.fillRect(101, 181, 14, 3);
  [[62, 130], [62, 150], [148, 130], [148, 150], [80, 165], [130, 165], [86, 190], [124, 190]].forEach(([x, y]) => { g.fillStyle = '#151826'; g.fillRect(x, y, 3, 5); });
  g.fillStyle = '#f3c75a'; g.fillRect(106, 112, 4, 6); // janela do rei
  // colina e chão
  for (let y = 205; y < H; y++) { g.fillStyle = y < 260 ? '#1f2e26' : y < 320 ? '#1c2a23' : '#18241f'; g.fillRect(0, y, W, 1); }
  for (let i = 0; i < 400; i++) { g.fillStyle = rnd(i) > 0.5 ? '#26382d' : '#16211b'; g.fillRect(rnd(i * 2.3) * W, 206 + rnd(i * 3.3) * 178, 1, 1); }
  // estrada
  for (let y = 210; y < H; y++) { const w = 10 + (y - 210) * 0.25; g.fillStyle = '#3e3226'; g.fillRect(108 - w, y, w * 2, 1); }
  // casas
  const house = (x, y, w) => {
    g.fillStyle = OUT; g.fillRect(x - 1, y - 1, w + 2, 14); g.fillStyle = '#5a5040'; g.fillRect(x, y, w, 12); g.fillStyle = '#4a4234'; g.fillRect(x + w - 3, y, 3, 12);
    for (let j = 0; j < 9; j++) { g.fillStyle = OUT; g.fillRect(x - 2 + j, y - 1 - j, w + 4 - 2 * j, 1); g.fillStyle = '#6b3a2a'; g.fillRect(x - 1 + j, y - 1 - j, w + 2 - 2 * j, 1); }
    g.fillStyle = '#1a1820'; g.fillRect(x + 3, y + 4, 3, 4); g.fillRect(x + w - 8, y + 6, 4, 6);
  };
  [[20, 236, 22], [52, 246, 18], [184, 248, 22], [8, 270, 20], [190, 280, 18], [36, 286, 18], [164, 296, 20]].forEach(p => house(p[0], p[1], p[2]));
  BG.kingdom = c;
}
function bakeVillage() {
  const c = mk(W, H), g = c.getContext('2d');
  g.fillStyle = '#2a2a32'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 6) for (let x = ((y / 6) % 2) * 4; x < W; x += 8) { g.fillStyle = rnd(x * 3 + y) > 0.5 ? '#33333c' : '#2e2e36'; g.fillRect(x, y, 7, 5); }
  for (let i = 0; i < 6; i++) {
    const x = 6 + i * 36, y = 18;
    g.fillStyle = OUT; g.fillRect(x - 1, y + 20, 32, 46); g.fillStyle = '#4c4a4e'; g.fillRect(x, y + 21, 30, 44);
    for (let j = 0; j < 16; j++) { g.fillStyle = OUT; g.fillRect(x - 3 + j, y + 20 - j, 36 - 2 * j, 1); g.fillStyle = '#4a3434'; g.fillRect(x - 2 + j, y + 20 - j, 34 - 2 * j, 1); }
    g.fillStyle = '#1a1a22'; g.fillRect(x + 4, y + 30, 6, 7); g.fillRect(x + 20, y + 30, 6, 7); g.fillRect(x + 11, y + 48, 8, 17);
  }
  g.fillStyle = OUT; disc2(g, 108, 200, 26, 14); g.fillStyle = '#55555e'; disc2(g, 108, 200, 25, 13); g.fillStyle = '#2a2a32'; disc2(g, 108, 199, 20, 9);
  g.fillStyle = '#55555e'; g.fillRect(105, 176, 6, 22); g.fillStyle = OUT; g.fillRect(104, 174, 8, 3);
  BG.village = c;
}
function disc2(g, cx, cy, rx, ry) { for (let yy = -ry; yy <= ry; yy++) { const w = Math.round(rx * Math.sqrt(1 - (yy / ry) ** 2)); g.fillRect(cx - w, cy + yy, w * 2 + 1, 1); } }
function bakeVault() {
  const c = mk(W, H), g = c.getContext('2d');
  g.fillStyle = '#22202a'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < 200; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < W; x += 16) { g.fillStyle = rnd(x + y * 7) > 0.5 ? '#2c2a36' : '#292733'; g.fillRect(x + 1, y + 1, 15, 7); }
  for (let y = 200; y < H; y++) { g.fillStyle = y % 10 === 0 ? '#1a1820' : '#25232c'; g.fillRect(0, y, W, 1); }
  [[18, 40], [18, 90], [18, 140]].forEach(([x, y]) => { g.fillStyle = OUT; g.fillRect(x - 2, y, W - 32, 5); g.fillStyle = '#6a4a2e'; g.fillRect(x - 1, y + 1, W - 34, 3); });
  g.fillStyle = OUT; g.fillRect(14, 0, 4, 150); g.fillRect(W - 18, 0, 4, 150);
  BG.vault = c;
}
function bakeWall() {
  const c = mk(W, H), g = c.getContext('2d');
  const bands = ['#0b1020', '#0e1426', '#121a30', '#172238'];
  for (let y = 0; y < H; y++) { g.fillStyle = bands[Math.min(3, (y / 60) | 0)]; g.fillRect(0, y, W, 1); }
  for (let x = 0; x < W; x++) { const h = 20 + Math.sin(x * 0.07) * 8 + Math.sin(x * 0.19) * 4; g.fillStyle = '#1c2a2a'; g.fillRect(x, 170 - h, 1, h); }
  g.fillStyle = '#1f2e26'; g.fillRect(0, 170, W, 20);
  const top = 190;
  g.fillStyle = OUT; g.fillRect(0, top - 1, W, H - top + 1);
  for (let y = top; y < H; y += 7) for (let x = (y / 7) % 2 ? -7 : 0; x < W; x += 14) { g.fillStyle = rnd(x * 5 + y) > 0.5 ? '#454a60' : '#3d4258'; g.fillRect(x + 1, y + 1, 13, 6); }
  for (let x = 0; x < W; x += 12) { g.fillStyle = OUT; g.fillRect(x, top - 9, 8, 9); g.fillStyle = '#4b5170'; g.fillRect(x + 1, top - 8, 6, 8); }
  BG.wall = c;
}

/* ---------- cenas ---------- */
const M1X = FX - 38, M2X = FX + 28, MY = FY - 18;

function sceneForest(t, lt, extras) {
  ctx.drawImage(BG.forest, 0, 0);
  crate(FX - 72, FY + 2); crate(FX + 58, FY - 2);
  campfire(FX, FY + 4, t);
  if (extras) extras();
  fireflies(t);
}
function drawCrowd(t, n, arriveStart) {
  for (let i = 0; i < n; i++) {
    const sl = SLOTS[i];
    const st = arriveStart ? arriveStart(i) : -99;
    const p = ease(prog(t, st, st + 0.9));
    const fromX = sl.x < FX ? -14 : W + 4;
    const x = lerp(fromX, sl.x, p), y = lerp(sl.y + 10, sl.y, p);
    const walking = p > 0 && p < 1;
    if (p <= 0) continue;
    person(x, y, villager(i + 7), { t, seed: i, walk: walking ? 1 + (Math.floor(t * 8) % 2) : 0 });
  }
}
const SLOTS = (() => {
  const out = [];
  const rings = [[56, 40, 10], [80, 64, 16], [96, 92, 22]];
  rings.forEach(([rx, ry, n], ri) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + ri * 0.4;
      const x = FX + Math.cos(a) * rx - 5, y = FY + Math.sin(a) * ry - 10;
      if (Math.abs(x + 5 - FX) < 30 && y < FY - 10 && y > FY - 50) continue; // banco
      if (y > 268 || y < 74 || x < 4 || x > W - 14) continue;
      if (Math.abs(x - M1X) < 12 && Math.abs(y - MY) < 14) continue;
      if (Math.abs(x - M2X) < 12 && Math.abs(y - MY) < 14) continue;
      if (Math.abs(x + 5 - FX) < 12 && Math.abs(y - (FY + 30)) < 16) continue; // lugar vazio "você"
      out.push({ x: Math.round(x), y: Math.round(y) });
    }
  });
  out.sort((a, b) => Math.hypot(a.x - FX, a.y - FY) - Math.hypot(b.x - FX, b.y - FY));
  return out;
})();

function drawYouSpot(t, label = 'VOCÊ?') {
  const x = FX - 5, y = FY + 22;
  const on = Math.floor(t * 4) % 2 === 0;
  ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 6);
  disc(x + 5, y + 13, 9, 4, '#ffe066');
  ctx.globalAlpha = 1;
  // silhueta pontilhada
  SPR.forEach((r, j) => { for (let i = 0; i < 10; i++) if (r[i] === 'o' && (i + j + (on ? 0 : 1)) % 2 === 0) R(x + i, y + j, 1, 1, '#ffe066'); });
  tag(label, x + 5, y + 18, '#ffe066', '#ffe066');
  const b = Math.round(Math.sin(t * 6) * 2);
  const ay = y - 12 + b;
  R(x + 3, ay, 5, 2, '#ffe066'); R(x + 4, ay + 2, 3, 1, '#ffe066'); R(x + 5, ay + 3, 1, 1, '#ffe066');
}

const SC = [];
function add(s, e, f, o, nf) { SC.push({ s, e, f, o, nf }); }

// 1. O reino (0 – 5.56)
add(0, 5.56, (lt, t) => {
  ctx.drawImage(BG.kingdom, 0, 0);
  for (let i = 0; i < 70; i++) { if (Math.sin(t * 3 + i) > -0.6) R(rnd(i * 1.3) * W, rnd(i * 2.9) * 170, 1, 1, i % 5 ? '#c8d0e8' : '#fff4c8'); }
  disc(194, 116, 8, 8, '#f1e6c0'); R(190, 112, 2, 2, '#d8cca0'); R(196, 119, 3, 2, '#d8cca0');
  [[65, 92], [151, 92], [108, 70]].forEach(([x, y]) => { R(x, y - 10, 1, 10, '#2a2a2a'); const w = Math.round(Math.sin(t * 5 + x) * 1); R(x + 1, y - 10 + w * 0, 6, 3, '#a8322e'); R(x + 1 + 6, y - 10 + (w > 0 ? 1 : 0), 2, 2, '#a8322e'); });
  // guardas patrulhando
  const gx = 40 + ((t * 10) % 140);
  person(gx, 214, CAST.guard, { t, walk: 1 + (Math.floor(t * 6) % 2) });
  person(176 - ((t * 8) % 120), 226, CAST.guard, { t, walk: 1 + (Math.floor(t * 6 + 1) % 2) });
  // placa de proibido
  const sx = 130, sy = 246;
  R(sx + 15, sy + 18, 4, 30, OUT); R(sx + 16, sy + 18, 2, 30, '#6a4024');
  frame(sx - 4, sy - 4, 42, 26, '#e8d5a8', '#8a6a3a');
  R(sx + 9, sy + 2, 16, 12, OUT); R(sx + 10, sy + 3, 7, 10, '#f4ecd8'); R(sx + 17, sy + 3, 7, 10, '#f4ecd8'); R(sx + 17, sy + 3, 1, 10, OUT);
  const xo = lt > 0.8;
  if (xo) for (let k = 0; k < 16; k++) { R(sx + 9 + k, sy + k * 0.8, 2, 2, '#d0302a'); R(sx + 24 - k, sy + k * 0.8, 2, 2, '#d0302a'); }
}, (lt) => {
  const n = Math.floor(lt * 14);
  const a = 'O REINO', b = 'SEM HISTÓRIAS';
  text(a.slice(0, n), 108, 22, '#f4e9c8', 2, 'center', '#07080a');
  if (n > a.length) text(b.slice(0, n - a.length), 108, 42, '#e8c048', 2, 'center', '#07080a');
  if (lt > 1.6) text('EPISÓDIO 1', 108, 66, '#9aa4c8', 1, 'center', '#07080a');
});

// 2. O rei e os sonhos (5.56 – 10.32)
add(5.56, 10.32, (lt, t) => {
  ctx.drawImage(BG.throne, 0, 0);
  torches(t);
  person(103, 116, CAST.king, { t, noShadow: true });
  // balão de pensamento
  const bx = 120, by = 54;
  [[110, 104, 2], [114, 98, 3]].forEach(([x, y, r]) => { disc(x, y, r + 1, r + 1, OUT); disc(x, y, r, r, '#f4ecd8'); });
  disc(bx, by + 18, 26, 18, OUT); disc(bx, by + 18, 25, 17, '#f4ecd8');
  // sonho: lua, estrelas e um castelo voador
  disc(bx - 10, by + 12, 5, 5, '#e8c048'); disc(bx - 8, by + 10, 4, 4, '#f4ecd8');
  [[bx + 4, by + 6], [bx + 14, by + 12], [bx + 8, by + 24], [bx - 14, by + 26]].forEach(([x, y], i) => { const s = Math.floor(t * 4 + i) % 2; R(x, y - s, 1, 3, '#7a5ab0'); R(x - 1, y + 1 - s, 3, 1, '#7a5ab0'); });
  R(bx + 2, by + 20, 10, 6, '#7a5ab0'); R(bx + 2, by + 17, 2, 3, '#7a5ab0'); R(bx + 10, by + 17, 2, 3, '#7a5ab0'); R(bx + 6, by + 15, 2, 5, '#7a5ab0');
  if (lt > 1.4) {
    const p = prog(lt, 1.4, 1.7);
    const sh = lt < 1.9 ? Math.round(Math.sin(lt * 80) * 1) : 0;
    for (let k = 0; k < 30 * p; k++) { R(bx - 15 + k + sh, by + 4 + k * 0.95, 3, 3, '#d0302a'); R(bx + 14 - k + sh, by + 4 + k * 0.95, 3, 3, '#d0302a'); }
  }
  return { x: 54, y: 30, z: 2 };
}, (lt) => { tag('O REI', 108, 238); });

// 3. Livros trancados (10.32 – 14.6)
const BOOKS = Array.from({ length: 27 }, (_, i) => ({ x: 22 + (i % 9) * 19, y: 32 + Math.floor(i / 9) * 50, c: ['#8a3a3a', '#3a6a8a', '#b5803a', '#5a8a3a', '#7a5a9a', '#2f7a6a'][i % 6] }));
add(10.32, 14.6, (lt, t) => {
  ctx.drawImage(BG.vault, 0, 0);
  const cx = 92, cy = 204;
  const closed = lt > 2.7;
  // baú
  if (!closed) { R(cx - 1, cy - 14, 34, 16, OUT); R(cx, cy - 13, 32, 14, '#6a4024'); R(cx, cy - 13, 32, 2, '#c9a24a'); }
  BOOKS.forEach((b, i) => {
    const st = 0.6 + i * 0.06, p = prog(lt, st, st + 0.55);
    if (p >= 1) return;
    const x = lerp(b.x, cx + 12 + (i % 3) * 3, p), y = lerp(b.y, cy, p) - Math.sin(p * Math.PI) * 30;
    book(x, y, b.c);
  });
  R(cx - 1, cy - 1, 34, 24, OUT); R(cx, cy, 32, 22, '#7a5634'); R(cx, cy, 32, 3, '#946a40'); R(cx, cy + 10, 32, 2, '#c9a24a'); R(cx + 6, cy, 2, 22, '#c9a24a'); R(cx + 24, cy, 2, 22, '#c9a24a');
  if (closed) { R(cx - 2, cy - 7, 36, 9, OUT); R(cx - 1, cy - 6, 34, 7, '#84522e'); R(cx - 1, cy - 6, 34, 2, '#c9a24a'); }
  if (lt > 3.0) {
    const p = prog(lt, 3.0, 3.4);
    for (let k = 0; k < 40 * p; k += 2) { R(cx - 4 + k, cy - 8 + k * 0.75, 2, 2, (k / 2) % 2 ? '#8a8a90' : '#c0c0c8'); R(cx + 36 - k, cy - 8 + k * 0.75, 2, 2, (k / 2) % 2 ? '#8a8a90' : '#c0c0c8'); }
  }
  if (lt > 3.5) {
    const lx = cx + 13, ly = cy + 4;
    R(lx + 1, ly - 4, 6, 5, OUT); R(lx + 2, ly - 3, 4, 4, '#2a2a2a');
    R(lx, ly, 8, 8, OUT); R(lx + 1, ly + 1, 6, 6, '#e8c048'); R(lx + 3, ly + 3, 2, 3, OUT);
    if (lt < 3.8) { ctx.globalAlpha = 0.6; disc(lx + 4, ly + 4, 14, 14, '#fff6c0'); ctx.globalAlpha = 1; }
  }
  person(136, 192, CAST.guard, { t });
  person(66, 192, CAST.guard, { t, seed: 3 });
  return { x: 54, y: 70, z: 2 };
}, (lt) => { if (lt > 3.6) text('TRANCADOS!', 108, 44, '#e8c048', 2, 'center', '#07080a'); });

// 4. Contadores desaparecem / silêncio (14.6 – 18.88)
add(14.6, 18.88, (lt, t) => {
  ctx.drawImage(BG.village, 0, 0);
  const tellers = [[64, 140, '#7a3a8a'], [100, 128, '#2f6a8a'], [136, 140, '#8a6a2a']];
  tellers.forEach(([x, y, hat], i) => {
    const vt = 0.5 + i * 0.35;
    if (lt < vt) {
      person(x, y, villager(40 + i), { t, hat, seed: i });
    } else if (lt < vt + 0.7) {
      const p = (lt - vt) / 0.7;
      ctx.globalAlpha = 1 - p;
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; disc(x + 5 + Math.cos(a) * p * 12, y + 6 + Math.sin(a) * p * 8, 4 - p * 3, 4 - p * 3, '#9a9aa6'); }
      ctx.globalAlpha = 1;
    }
  });
  if (lt > 1.8) {
    const vs = [[60, 204], [74, 222], [94, 230], [116, 230], [138, 222], [152, 204]];
    vs.forEach(([x, y], i) => {
      const v = villager(60 + i); v.shirt = '#5a5a62'; v.hair = '#3a3a40'; v.pants = '#2a2a30';
      person(x, y, v, { t, seed: i });
      if (lt > 2.2 + i * 0.12 && i % 2 === 0) bubble(x + 5, y - 2, '...', '#c8c8d0', '#3a3a44');
    });
  }
  return { x: 54, y: 96, z: 2 };
}, (lt) => { if (lt < 1.9) tag('CONTADORES DE HISTÓRIAS', 108, 22); if (lt > 2.4) text('SILÊNCIO.', 108, 70, '#c8c8d0', 2, 'center', '#07080a'); });

// 5. Dois jovens têm uma ideia (18.88 – 22.12)
add(18.88, 22.12, (lt, t) => {
  sceneForest(t, lt, () => {
    person(M1X, MY, CAST.m1, { t, seed: 1 });
    person(M2X, MY, CAST.m2, { t, seed: 2 });
  });
  if (lt < 1.4) { tag('MORADOR 1', M1X + 5, MY - 20); tag('MORADOR 2', M2X + 5, MY - 20); }
  if (lt > 1.4) { lightbulb(M1X + 5, MY - 14, prog(lt, 1.4, 1.6), t); lightbulb(M2X + 5, MY - 14, prog(lt, 1.5, 1.7), t + 0.3); }
  return { x: 54, y: 110, z: 2 };
}, (lt, t) => {
  if (lt > 1.9) text('UMA IDEIA!', 108, 34, '#ffe066', 2, 'center', '#07080a');
});

// 6. A oficina secreta (22.12 – 30.24)
const MX = 88, MYY = 196;
function workshopBase(t) {
  ctx.drawImage(BG.workshop, 0, 0);
  // lampião
  ctx.globalAlpha = 0.08 + 0.02 * Math.sin(t * 7); disc(108, 160, 90, 70, '#ffb050'); disc(108, 160, 60, 46, '#ffb050'); ctx.globalAlpha = 1;
  R(104, 96, 9, 12, OUT); R(105, 97, 7, 10, '#ffd060'); R(107, 92, 3, 4, OUT);
}
add(22.12, 30.24, (lt, t) => {
  workshopBase(t);
  const p = prog(lt, 0.3, 5.0);
  const paper = lt > 6.4 ? clamp((lt - 6.4) * 14, 0, 22) : 0;
  machine(MX, MYY, p, t, 1, paper);
  if (p > 0 && p < 1) {
    for (let k = 0; k < 4; k++) { const sx = MX + 4 + rnd(Math.floor(t * 10) + k) * 34, sy = MYY + 8 + rnd(Math.floor(t * 10) * 3 + k) * 22; R(sx, sy, 1, 1, '#fff1a0'); R(sx + 1, sy - 1, 1, 1, '#ffb43a'); }
  }
  const ham = p < 1 ? (Math.floor(t * 5) % 2 ? 1 : -1) : 0;
  person(MX - 22, MYY + 16, CAST.m1, { t, seed: 1, tool: ham });
  person(MX + 48, MYY + 16, CAST.m2, { t, seed: 2, tool: p < 1 ? -ham : 0 });
  // ideia entrando na máquina
  if (lt > 5.2 && lt < 6.4) {
    const q = ease(prog(lt, 5.2, 6.2));
    lightbulb(lerp(MX - 17, MX + 20, q), lerp(MYY - 20, MYY - 2, q), 1, t);
  }
  return { x: 40, y: 120, z: 2 };
}, (lt) => {
  tag('OFICINA SECRETA', 108, 24);
  if (lt > 6.6) text('IDEIA  >  HISTÓRIA', 108, 52, '#7fe0c8', 1, 'center', '#07080a');
});

// 7. Scriptter (30.24 – 34.24)
add(30.24, 34.24, (lt, t) => {
  workshopBase(t);
  ctx.globalAlpha = 0.25;
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + t * 0.6; line(MX + 20, MYY + 20, MX + 20 + Math.cos(a) * 60, MYY + 20 + Math.sin(a) * 60, '#ffe066', 2); }
  ctx.globalAlpha = 1;
  machine(MX, MYY, 1, t, 1, 22);
  for (let k = 0; k < 8; k++) { if ((Math.floor(t * 6) + k) % 3) continue; R(MX - 6 + rnd(k * 7) * 52, MYY - 6 + rnd(k * 9) * 50, 1, 3, '#fff6c0'); R(MX - 7 + rnd(k * 7) * 52, MYY - 5 + rnd(k * 9) * 50, 3, 1, '#fff6c0'); }
  return { x: 54, y: 120, z: 2 };
}, (lt, t) => {
  const p = ease(prog(lt, 0.1, 0.6));
  const y = Math.round(lerp(-30, 40, p));
  text('SCRIPTTER', 108, y + 2, '#3a2a10', 3, 'center');
  text('SCRIPTTER', 108, y, '#e8c048', 3, 'center');
  if (lt > 0.8) text('A MÁQUINA DE HISTÓRIAS', 108, y + 30, '#f4e9c8', 1, 'center', '#07080a');
});

// 8. O rei descobre (34.24 – 36.4)
function torches(t) {
  [62, 152].forEach((x, i) => {
    R(x, 70, 4, 10, OUT); R(x + 1, 70, 2, 9, '#5a3a22');
    const h = 5 + Math.sin(t * 12 + i) * 1.5;
    R(x - 1, 70 - h, 6, h, '#e8742a'); R(x, 70 - h * 0.7, 4, h * 0.7, '#ffb43a'); R(x + 1, 70 - h * 0.4, 2, h * 0.4, '#fff1a0');
    ctx.globalAlpha = 0.07; disc(x + 2, 66, 24, 24, '#ffb050'); ctx.globalAlpha = 1;
  });
}
add(34.24, 36.4, (lt, t) => {
  ctx.drawImage(BG.throne, 0, 0); torches(t);
  person(103, 116, CAST.king, { t, noShadow: true, armUp: lt > 1.1 });
  const p = ease(prog(lt, 0, 1.0));
  person(103, lerp(300, 150, p), CAST.guard, { t, back: true, walk: p < 1 ? 1 + (Math.floor(t * 8) % 2) : 0 });
  if (lt > 0.9) scroll(118, 140, 10, 12);
  if (lt > 1.1) { const sh = Math.round(Math.sin(t * 60) * (lt < 1.5 ? 1 : 0)); text('!', 108 + sh, 92, '#ff5a4a', 2, 'center', '#07080a'); }
  return { x: 54, y: 70, z: 2 };
}, (lt, t) => {
  if (lt > 1.1) tag('O REI DESCOBRIU A MÁQUINA', 108, 22);
});

// 9. Levados ao castelo (36.4 – 39.24)
add(36.4, 39.24, (lt, t) => {
  ctx.drawImage(BG.kingdom, 0, 0);
  for (let i = 0; i < 70; i++) R(rnd(i * 1.3) * W, rnd(i * 2.9) * 170, 1, 1, '#c8d0e8');
  disc(176, 44, 9, 9, '#f1e6c0');
  const x0 = -60 + lt * 50, y0 = 244;
  const wf = 1 + (Math.floor(t * 8) % 2);
  person(x0 + 72, y0, CAST.guard, { t, walk: wf });
  person(x0 + 56, y0, CAST.m1, { t, walk: 3 - wf, seed: 1 });
  person(x0 + 42, y0, CAST.m2, { t, walk: wf, seed: 2 });
  person(x0 + 26, y0, CAST.guard, { t, walk: 3 - wf });
  // carroça com a máquina
  const cx = x0 - 46;
  machine(cx + 1, y0 - 34, 1, t, 1, 0);
  R(cx - 2, y0 + 4, 46, 5, OUT); R(cx - 1, y0 + 5, 44, 3, '#6a4024');
  disc(cx + 6, y0 + 10, 3, 3, OUT); disc(cx + 36, y0 + 10, 3, 3, OUT); R(cx + 6, y0 + 10, 1, 1, '#8a6a3a'); R(cx + 36, y0 + 10, 1, 1, '#8a6a3a');
  R(cx + 43, y0 + 6, 28, 1, '#5a3a22');
  return { x: 54, y: 150, z: 2 };
}, (lt) => { tag('A CAMINHO DO CASTELO', 108, 22); });

// 10. Sala do trono: o martelo (39.24 – 43.76)
function throneCourt(t, lt, hammer, armUp) {
  ctx.drawImage(BG.throne, 0, 0); torches(t);
  person(103, 116, CAST.king, { t, noShadow: true, armUp });
  machine(88, 172, 1, t, 1, 0);
  person(60, 214, CAST.m1, { t, back: true, seed: 1 });
  person(146, 214, CAST.m2, { t, back: true, seed: 2 });
  // guarda com martelo
  const gx = 134, gy = 170;
  person(gx, gy, { ...CAST.guard, spear: false }, { t });
  const up = hammer;
  if (up > 0) { R(gx + 9, gy - 8 * up, 2, 12, '#5a3a22'); R(gx + 5, gy - 8 * up - 6, 10, 6, OUT); R(gx + 6, gy - 8 * up - 5, 8, 4, '#8a90a0'); }
  else { R(gx + 9, gy + 6, 2, 9, '#5a3a22'); R(gx + 6, gy + 14, 8, 5, OUT); R(gx + 7, gy + 15, 6, 3, '#8a90a0'); }
  person(28, 170, CAST.guard, { t, seed: 4 });
}
add(39.24, 43.76, (lt, t) => {
  const up = lt < 2.3 ? ease(prog(lt, 0.2, 1.0)) : 0;
  throneCourt(t, lt, up, lt > 1.3);
  if (lt > 1.3) bubble(108, 114, 'ESPERE!');
  return { x: 54, y: 76, z: 2 };
}, (lt, t) => {
  if (lt > 2.6) tag('UMA PROPOSTA...', 108, 22);
});

// 11. A proposta (43.76 – 50.64)
add(43.76, 50.64, (lt, t) => {
  throneCourt(t, lt, 0, false);
  return { x: 54, y: 76, z: 2 };
}, (lt, t) => {
  const lines1 = 'CONTEM-ME UMA HISTÓRIA QUE REALMENTE CONSIGA ME SURPREENDER.';
  const lines2 = 'E EU LIBERTAREI O POVO.';
  const second = lt > 4.24;
  const msg = second ? lines2 : lines1;
  const n = Math.floor((second ? lt - 4.24 : lt) * (second ? 16 : 22));
  frame(6, 284, 204, 74, '#1b1a12');
  R(12, 290, 26, 30, '#2b2436'); person(16, 296, CAST.king, { t, s: 2, noShadow: true });
  R(12, 290, 26, 1, '#d4c290'); R(12, 319, 26, 1, '#d4c290');
  text('O REI', 25, 326, '#e8c048', 1, 'center');
  const ls = wrap(msg.slice(0, n), 26);
  ls.forEach((l, i) => text(l, 44, 294 + i * 11, '#f4e9c8'));
  if (n >= msg.length && Math.floor(t * 3) % 2) R(196, 348, 5, 3, '#e8c048');
});

// 12. Preocupados (50.64 – 54.6)
add(50.64, 54.6, (lt, t) => {
  workshopBase(t);
  machine(MX, MYY, 1, t, 1, 0);
  person(MX - 22, MYY + 16, CAST.m1, { t, seed: 1 });
  person(MX + 48, MYY + 16, CAST.m2, { t, seed: 2 });
  if (Math.floor(t * 2) % 2) { R(MX - 12, MYY + 14, 1, 2, '#9ad0ff'); R(MX + 58, MYY + 14, 1, 2, '#9ad0ff'); }
  if (lt > 2.4) { // carta e pombo na janela
    R(MX + 58, MYY + 24, 8, 6, OUT); R(MX + 59, MYY + 25, 6, 4, '#f4ecd8'); R(MX + 59, MYY + 25, 6, 1, '#d0302a');
  }
  if (lt > 0.4) { bubble(MX - 17, MYY + 14, '?'); bubble(MX + 53, MYY + 14, '?'); }
  return { x: 40, y: 120, z: 2 };
}, (lt, t) => {
  if (lt > 0.4) text('SOZINHOS?', 108, 52, '#f4e9c8', 2, 'center', '#07080a');
});

// 13. Mensagem além das muralhas (54.6 – 60.84)
function pigeon(x, y, t) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(2, 2); x = 0; y = 0;
  const up = Math.floor(t * 8) % 2;
  R(x, y, 7, 4, OUT); R(x + 1, y + 1, 5, 2, '#e8e8f0'); R(x + 6, y, 2, 2, OUT); R(x + 7, y + 1, 1, 1, '#ffb43a');
  if (up) { R(x + 2, y - 3, 3, 3, OUT); R(x + 3, y - 2, 1, 2, '#c8c8d8'); } else { R(x + 2, y + 3, 3, 3, OUT); R(x + 3, y + 3, 1, 2, '#c8c8d8'); }
  R(x + 2, y + 4, 4, 3, OUT); R(x + 3, y + 5, 2, 1, '#f4ecd8');
  ctx.restore();
}
add(54.6, 60.84, (lt, t) => {
  ctx.drawImage(BG.wall, 0, 0);
  for (let i = 0; i < 60; i++) if (Math.sin(t * 3 + i) > -0.5) R(rnd(i * 1.7) * W, rnd(i * 3.1) * 140, 1, 1, '#c8d0e8');
  disc(40, 40, 8, 8, '#f1e6c0');
  const p = prog(lt, 0.2, 3.6);
  const x = lerp(-10, W + 10, p), y = 250 - Math.sin(p * Math.PI) * 140 + Math.sin(t * 8) * 2;
  if (lt < 3.8) pigeon(x, y, t);
  person(30, 330, CAST.m1, { t, back: true, seed: 1, armUp: lt < 1.2 });
  person(50, 330, CAST.m2, { t, back: true, seed: 2 });
}, (lt, t) => {
  if (lt < 3.8) tag('ALÉM DAS MURALHAS', 108, 22);
  if (lt > 3.76) {
    const p = ease(prog(lt, 3.76, 4.2));
    ctx.globalAlpha = 0.6; R(0, 0, W, H, '#05060a'); ctx.globalAlpha = 1;
    const h = Math.round(lerp(10, 110, p));
    scroll(22, 140 - h / 2, 172, h, 1);
    if (p > 0.9) {
      text('PRECISAMOS', 108, 120, '#4a2a14', 2, 'center');
      text('DE', 108, 138, '#4a2a14', 2, 'center');
      text('HISTORIADORES!', 108, 156, '#a8322e', 2, 'center');
    }
  }
});

// 14. Chegam os historiadores (60.84 – 67.72)
const ARRIVE = i => i < 2 ? 60.84 + i * 0.3 : i < 10 ? 62.56 + (i - 2) * 0.1 : 64.12 + (i - 10) * 0.045;
add(60.84, 67.72, (lt, t) => {
  sceneForest(t, lt, () => {
    person(M1X, MY, CAST.m1, { t, seed: 1 });
    person(M2X, MY, CAST.m2, { t, seed: 2 });
    drawCrowd(t, SLOTS.length, ARRIVE);
  });
}, (lt, t) => {
  let n;
  if (t < 62.56) n = 2; else if (t < 64.12) n = 10; else n = Math.round(lerp(10, 200, ease(prog(t, 64.2, 66.6))));
  frame(46, 14, 124, 30, '#1b1a12');
  text(String(n), 108, 19, '#e8c048', 2, 'center');
  text('HISTORIADORES', 108, 35, '#f4e9c8', 1, 'center');
  if (t < 62.56) { const a = SLOTS[0], b = SLOTS[1]; if (t > 61.8) { tag('HISTORIADOR', a.x + 5, a.y - 16); tag('HISTORIADOR', b.x + 5, b.y - 16); } }
});

// 15. O rei ainda não se surpreendeu (67.72 – 71.6)
add(67.72, 71.6, (lt, t) => {
  ctx.drawImage(BG.throne, 0, 0); torches(t);
  person(103, 116, CAST.king, { t, noShadow: true });
  for (let k = 0; k < 9; k++) scroll(60 + (k % 3) * 8 + (k > 5 ? 4 : 0), 150 - Math.floor(k / 3) * 5, 6, 10);
  for (let k = 0; k < 9; k++) scroll(140 + (k % 3) * 8 - (k > 5 ? 4 : 0), 150 - Math.floor(k / 3) * 5, 6, 10);
  const c = (lt * 1.3) % 1, side = Math.floor(lt * 1.3) % 2 ? 1 : -1;
  scroll(108 + side * c * 60, 120 - Math.sin(c * Math.PI) * 40 + c * 30, 6, 10);
  return { x: 54, y: 40, z: 2 };
}, (lt, t) => {
  if (lt > 0.4) bubble(108, 128, Math.floor(t * 2) % 2 ? 'BOCEJO...' : 'NÃO.');
  text('AINDA NÃO...', 108, 40, '#f4e9c8', 2, 'center', '#07080a');
});

// 16. É aqui que você entra (71.6 – 73.88)
add(71.6, 73.88, (lt, t) => {
  sceneForest(t, lt, () => {
    person(M1X, MY, CAST.m1, { t, seed: 1 });
    person(M2X, MY, CAST.m2, { t, seed: 2 });
    drawCrowd(t, SLOTS.length);
    drawYouSpot(t);
  });
  return { x: 54, y: 118, z: 2 };
}, (lt) => { text('É AQUI QUE', 108, 40, '#f4e9c8', 2, 'center', '#07080a'); text('VOCÊ ENTRA', 108, 62, '#ffe066', 2, 'center', '#07080a'); });

// 17. Escreva nos comentários (73.88 – 77.92)
function dimForest(t) {
  ctx.drawImage(BG.forest, 0, 0); campfire(FX, FY + 4, t); fireflies(t);
  ctx.globalAlpha = 0.6; R(0, 0, W, H, '#06080a'); ctx.globalAlpha = 1;
}
add(73.88, 77.92, (lt, t) => { dimForest(t); }, (lt, t) => {
  text('ESCREVA', 108, 34, '#f4e9c8', 2, 'center', '#07080a');
  text('NOS COMENTÁRIOS', 108, 54, '#ffe066', 2, 'center', '#07080a');
  frame(14, 82, 188, 150, '#efe0b8', '#8a6a3a');
  // ícone de comentário
  R(24, 92, 18, 13, OUT); R(25, 93, 16, 11, '#7fe0c8'); R(27, 104, 3, 3, OUT); R(28, 104, 1, 2, '#7fe0c8');
  R(28, 96, 10, 1, OUT); R(28, 99, 7, 1, OUT);
  text('COMENTÁRIOS', 48, 95, '#4a2a14');
  R(22, 112, 172, 1, '#b89a62');
  const story = 'ERA UMA VEZ, NUM REINO ONDE TUDO PODIA ACONTECER...';
  const n = Math.floor(lt * 16);
  const ls = wrap(story.slice(0, n), 27);
  person(24, 120, villager(3), { t, noShadow: true });
  ls.forEach((l, i) => text(l, 40, 124 + i * 11, '#2a1d14'));
  // pena
  const last = ls.length ? ls[ls.length - 1] : '';
  const qx = 40 + textW(last) + 2, qy = 124 + Math.max(0, ls.length - 1) * 11;
  R(qx, qy - 10, 2, 10, '#f4ecd8'); R(qx - 1, qy - 12, 4, 6, '#f4ecd8'); R(qx + 1, qy - 12, 1, 8, OUT); R(qx, qy, 1, 2, OUT);
  if (Math.floor(t * 3) % 2) R(qx + 3, qy, 1, 7, '#2a1d14');
  frame(122, 206, 72, 18, '#a8322e', '#e8c048');
  text('ENVIAR', 158, 212, '#f4e9c8', 1, 'center');
});

// 18. Próximo episódio (77.92 – 83.0)
add(77.92, 83.0, (lt, t) => {
  for (let y = 0; y < H; y++) { const off = Math.floor(y + t * 30) % 24; R(0, y, W, 1, off < 12 ? '#24132a' : '#1c0f22'); }
  for (let k = 0; k < 6; k++) line(108 + Math.sin(t * 30 + k) * 3, 150 + k * 20, 108 + Math.sin(t * 30 + k + 1) * 3, 170 + k * 20, '#ffe066', 2);
  // rolo de história (esquerda)
  scroll(24, 150, 52, 70, 1);
  for (let k = 0; k < 7; k++) R(32, 160 + k * 7, 26 + (k * 13) % 12, 2, '#8a6a3a');
  ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6); disc(50, 186, 40, 46, '#ffe066'); ctx.globalAlpha = 1;
  scroll(24, 150, 52, 70, 1);
  for (let k = 0; k < 7; k++) R(32, 160 + k * 7, 26 + (k * 13) % 12, 2, '#8a6a3a');
  // rei (direita)
  person(134, 150, CAST.king, { t, s: 5, noShadow: true });
}, (lt, t) => {
  text('PRÓXIMO', 108, 36, '#f4e9c8', 2, 'center', '#07080a');
  text('EPISÓDIO', 108, 56, '#e8c048', 2, 'center', '#07080a');
  const p = ease(prog(lt, 0.3, 0.7));
  text('VS', 108, 176, '#ff5a4a', Math.max(1, Math.round(3 * p)), 'center', '#07080a');
  tag('A MELHOR HISTÓRIA', 50, 232);
  tag('O REI', 160, 232);
  if (lt > 1.2) text('SERÁ ESCOLHIDA PARA', 108, 262, '#f4e9c8', 1, 'center', '#07080a');
  if (lt > 1.2) text('ENFRENTAR O REI', 108, 274, '#ffe066', 1, 'center', '#07080a');
});

// 19. Siga agora (83.0 – 92.72)
add(83.0, 92.72, (lt, t) => {
  dimForest(t);
  if (lt > 4.1) {
    const p = ease(prog(lt, 4.1, 4.5));
    ctx.globalAlpha = 0.35 * p; disc(108, 222, 30, 18, '#ffe066'); ctx.globalAlpha = 1;
    const b = lt < 4.6 ? Math.round(Math.sin((lt - 4.1) * 20) * 3) : 0;
    person(98, 206 - b, villager(99), { t, s: 1, seed: 9 });
  }
  if (lt > 5.3) {
    for (let i = 0; i < 8; i++) {
      const st = 5.3 + i * 0.25; if (lt < st) continue;
      const p = ease(prog(lt, st, st + 0.6));
      const tx = i < 4 ? 36 + i * 12 : 128 + (i - 4) * 12;
      person(lerp(i < 4 ? -14 : W + 4, tx, p), 248 + (i % 2) * 6, villager(120 + i), { t, seed: i, walk: p < 1 ? 1 + (Math.floor(t * 8) % 2) : 0 });
    }
  }
}, (lt, t) => {
  // cartão do perfil
  frame(24, 30, 168, 110, '#1b1a12');
  R(36, 42, 40, 40, '#2b2436');
  ctx.save();
  machine(38, 44, 1, t, 1, 0);
  ctx.restore();
  text('SCRIPTTER', 84, 46, '#e8c048', 2);
  text('HISTÓRIAS COM', 84, 66, '#c8c0a0');
  text('IA E PIXEL', 84, 77, '#c8c0a0');
  const followed = lt > 2.0;
  const pressed = lt > 1.85 && lt < 2.05;
  frame(36, 96 + (pressed ? 1 : 0), 144, 26, followed ? '#2f7a4a' : '#a8322e', '#e8c048');
  text(followed ? 'SEGUINDO!' : '+ SEGUIR AGORA', 108, 103 + (pressed ? 1 : 0), '#f4e9c8', 1, 'center');
  text(followed ? 'BEM-VINDO AO REINO' : 'TOQUE PARA SEGUIR', 108, 113 + (pressed ? 1 : 0), '#f4e9c8', 1, 'center');
  // cursor
  if (lt < 2.6) {
    const p = ease(prog(lt, 0.3, 1.7));
    const cx = Math.round(lerp(190, 116, p)), cy = Math.round(lerp(190, 110, p));
    const cur = ['o.....', 'oo....', 'oWo...', 'oWWo..', 'oWWWo.', 'oWWWWo', 'oWWoo.', 'oo.Wo.', '...oo.'];
    cur.forEach((r, j) => { for (let i = 0; i < 6; i++) { if (r[i] === '.') continue; R(cx + i * 2, cy + j * 2, 2, 2, r[i] === 'o' ? OUT : '#ffffff'); } });
  }
  if (followed && lt < 3.6) {
    for (let k = 0; k < 30; k++) { const a = rnd(k) * Math.PI * 2, sp = 20 + rnd(k * 3) * 50, q = lt - 2.0; R(108 + Math.cos(a) * sp * q, 108 + Math.sin(a) * sp * q + q * q * 30, 2, 2, ['#e8c048', '#ff5a4a', '#7fe0c8', '#c79ad8'][k % 4]); }
  }
  if (lt > 4.1) {
    tag('NOVO HISTORIADOR', 108, 182, '#ffe066', '#ffe066');
    frame(56, 160, 104, 16, '#1b1a12');
    text('HISTORIADORES: ' + (lt > 4.3 ? '201' : '200'), 108, 165, '#e8c048', 1, 'center');
  }
  if (lt > 5.3) text('OFICIALMENTE', 108, 150, '#f4e9c8', 1, 'center', '#07080a');
});

// 20. Final (92.72 – fim)
add(92.72, 99.5, (lt, t) => {
  sceneForest(t, lt, () => {
    person(M1X, MY, CAST.m1, { t, seed: 1 });
    person(M2X, MY, CAST.m2, { t, seed: 2 });
    drawCrowd(t, SLOTS.length);
    drawYouSpot(t, 'VOCÊ');
  });
  const p = ease(prog(lt, 0.5, 5));
  ctx.globalAlpha = 0.18 * p;
  for (let y = 0; y < 120; y += 2) { ctx.globalAlpha = 0.22 * p * (1 - y / 120); R(0, y, W, 2, '#ff9a4a'); }
  ctx.globalAlpha = 1;
}, (lt, t) => {
  text('SCRIPTTER', 108, 24, '#3a2a10', 3, 'center');
  text('SCRIPTTER', 108, 22, '#e8c048', 3, 'center');
  if (lt > 1.0) text('O PRÓXIMO HISTORIADOR', 108, 52, '#f4e9c8', 1, 'center', '#07080a');
  if (lt > 1.6) text('PODE SER VOCÊ', 108, 64, '#ffe066', 1, 'center', '#07080a');
});

/* ---------- legendas ---------- */
const SUBS = [
  [0.0, 5.56, 'Há muito tempo, existia um reino onde contar histórias era proibido.'],
  [5.56, 10.32, 'O rei acreditava que histórias faziam as pessoas sonharem demais.'],
  [10.32, 14.6, 'Por isso, os livros foram trancados,'],
  [14.6, 18.88, 'os contadores de histórias desapareceram e o povo viveu anos em silêncio.'],
  [18.88, 22.12, 'Até que dois jovens tiveram uma ideia.'],
  [22.12, 30.24, 'Escondidos em uma pequena oficina, eles construíram uma máquina capaz de transformar qualquer ideia em uma história.'],
  [30.24, 34.24, 'Eles deram a ela o nome de Scriptter.'],
  [34.24, 39.24, 'Quando o rei descobriu a máquina, ordenou que os dois fossem levados até o castelo.'],
  [39.24, 43.76, 'Mas, em vez de destruir a Scriptter, ele fez uma proposta.'],
  [50.64, 54.6, 'Os dois jovens sabiam que não conseguiriam fazer isso sozinhos.'],
  [54.6, 58.36, 'Então, enviaram uma mensagem para além das muralhas.'],
  [60.84, 62.56, 'Primeiro chegaram dois.'],
  [62.56, 64.12, 'Depois, dez.'],
  [64.12, 67.72, 'E hoje, já somos duzentos historiadores.'],
  [67.72, 71.6, 'Mas ainda não encontramos a história capaz de vencer o rei.'],
  [71.6, 73.88, 'É aqui que você entra.'],
  [73.88, 77.92, 'Escreva nos comentários a melhor história que conseguir imaginar.'],
  [77.92, 83.0, 'A história mais incrível será escolhida para enfrentar o rei no próximo episódio.'],
  [83.0, 87.08, 'E se você acabou de encontrar esta página, siga agora.'],
  [87.08, 92.72, 'Porque cada novo seguidor se torna oficialmente um novo historiador da Scriptter.'],
  [92.72, 98.4, 'E talvez, o próximo historiador capaz de libertar todo o reino seja você.'],
];
let showSubs = true;
function drawSubs(t) {
  if (!showSubs) return;
  const s = SUBS.find(x => t >= x[0] && t < x[1]);
  if (!s) return;
  const ls = wrap(s[2].toUpperCase(), 32);
  const h = ls.length * 11 + 8, y0 = 300 - Math.floor(h / 2) + 12;
  ctx.globalAlpha = 0.72; R(8, y0, W - 16, h, '#06070a'); ctx.globalAlpha = 1;
  ls.forEach((l, i) => text(l, 108, y0 + 6 + i * 11, '#f4e9c8', 1, 'center', '#000'));
}

/* ---------- renderização ---------- */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
let main, mctx, stage, sctx;
function dither(amount) {
  if (amount <= 0) return;
  const img = mctx.getImageData(0, 0, W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (BAYER[(y & 3) * 4 + (x & 3)] / 16 < amount) { const i = (y * W + x) * 4; d[i] = 5; d[i + 1] = 6; d[i + 2] = 8; }
  }
  mctx.putImageData(img, 0, 0);
}
function render(t) {
  const sc = SC.find(s => t >= s.s && t < s.e) || SC[SC.length - 1];
  const lt = t - sc.s;
  ctx = sctx; sctx.clearRect(0, 0, W, H);
  const cam = sc.f(lt, t) || { x: 0, y: 0, z: 1 };
  ctx = mctx;
  mctx.imageSmoothingEnabled = false;
  mctx.fillStyle = '#000'; mctx.fillRect(0, 0, W, H);
  mctx.drawImage(stage, cam.x, cam.y, W / cam.z, H / cam.z, 0, 0, W, H);
  if (sc.o) sc.o(lt, t);
  drawSubs(t);
  let fade = 0;
  if (!sc.nf) fade = Math.max(fade, 1 - lt / 0.22);
  if (t > 97.9) fade = Math.max(fade, (t - 97.9) / 0.5);
  dither(clamp(fade, 0, 1));
}

function init(canvas) {
  main = canvas; main.width = W; main.height = H; mctx = main.getContext('2d');
  stage = mk(W, H); sctx = stage.getContext('2d');
  ctx = sctx;
  bakeForest(); bakeThrone(); bakeWorkshop(); bakeKingdom(); bakeVillage(); bakeVault(); bakeWall();
}

window.Story = { init, render, W, H, DURATION: 98.43, setSubs: v => { showSubs = v; } };
})();
