// =====================================================================
// TERRAS DO SUL: Selva Esmeralda, Dunas Douradas e Costa do Sol (com o mar)
// + Templo da Selva e Navio Naufragado · correnteza nos rios · ondas · sereno de vez em quando
// (carregado depois de east.js e antes de game.js)
// =====================================================================
// estradas do sul (entram na lista das estradas novas: nada antigo muda de lugar)
EXT_ROADS2.push(
  [[608, 2232], [590, 2380], [530, 2560], [486, 2688]],                                    // cemitério → Templo da Selva
  [[490, 2712], [620, 2800], [800, 2876], [1000, 2902], [1250, 2914], [1470, 2930]],        // templo → praia → Navio
);
// pontes onde as estradas cruzam os braços do rio
for (const L of EXT_ROADS2) for (let i = 0; i < L.length - 1; i++) { const [ax, ay] = L[i], [bx, by] = L[i + 1], dd = Math.hypot(bx - ax, by - ay); let run = [];
  for (let s = 0; s <= dd; s += 1) { const X = ax + (bx - ax) * s / dd, Y = ay + (by - ay) * s / dd, [d, w] = branchDist(X, Y); if (d < w + 2) run.push([X, Y, w]); else if (run.length) { const m = run[run.length >> 1]; BRANCH_BRIDGES.push({ x: Math.round(m[0]), y: Math.round(m[1]), hw: m[2] + 6 }); run = []; } } }
// ---------- monumentos
const SOUTH_LM = [
  { id: 'templo', name: 'Templo da Selva', x: 470, y: 2700, clear: 62, r: 72 },
  { id: 'navio', name: 'Navio Naufragado', x: 1520, y: Math.round(seaY(1520) - 8), clear: 62, r: 72 },
];
for (const l of SOUTH_LM) { LANDMARKS.push(l); LM[l.id] = l; }
Object.assign(LM_LIGHT, { templo: 24, navio: 0 });
Object.assign(LM_FX, {
  templo: { aura: '#3fe08a', cols: ['#b0ffd0', '#3fe08a', '#1e8a4a'], kind: 'leaf', lore: 'Um templo engolido pela selva. A esmeralda lá em cima nunca para de brilhar.' },
  navio: { aura: '#9fd8ff', cols: ['#ffffff', '#9fd8ff', '#ffd84a'], kind: 'star', lore: 'Um navio pirata encalhado na areia. O baú ainda deve estar lá dentro…' },
});
function templeSprite() {   // pirâmide de degraus com escadaria, santuário no topo, cipós e uma esmeralda brilhando
  const W = 124, H = 108, [c, x] = canvas(W, H), O = '#141a12', ST2 = ['#4a5040', '#646c54', '#80886a', '#a0a684'];
  softShadow(x, 62, 102, 58, 8, .35);
  const tiers = [[8, 84, 108, 18], [18, 66, 88, 18], [28, 50, 68, 16], [38, 36, 48, 14]];
  for (const [x0, y0, w, h] of tiers) { px(x, O, x0 - 1, y0 - 1, w + 2, h + 2);
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) { const row = Y >> 2, mort = (Y & 3) === 3 || ((X + (row & 1) * 5) % 10) === 9; px(x, mort ? ST2[0] : Y < 2 ? ST2[3] : X > w * .72 ? ST2[1] : ST2[2], x0 + X, y0 + Y); } }
  // escadaria central
  for (let Y = 36; Y < 102; Y++) { const k = (Y - 36) / 66, w = Math.round(8 + k * 8); px(x, O, 62 - w - 1, Y, 1, 1); px(x, O, 62 + w, Y, 1, 1); px(x, (Y & 1) ? '#b4b896' : '#8a9070', 62 - w, Y, w * 2, 1); }
  // santuário no topo
  px(x, O, 45, 14, 34, 23); for (let Y = 15; Y < 36; Y++) px(x, Y < 18 ? ST2[3] : ST2[2], 46, Y, 32, 1); px(x, O, 42, 11, 40, 4); px(x, ST2[3], 43, 12, 38, 2);
  px(x, '#0a0e08', 56, 22, 12, 14); px(x, O, 55, 21, 14, 1);
  for (const [a, b] of [[0, 0], [1, 1], [-1, 1], [0, 2], [1, 3], [-1, 3], [0, 4]]) px(x, '#3fe08a', 62 + a, 26 + b, 1, 1); px(x, '#c8ffe0', 62, 27, 1, 1);
  // cipós e musgo
  for (const [X, Y, L] of [[14, 84, 14], [24, 66, 16], [100, 84, 12], [92, 66, 14], [36, 50, 10], [86, 50, 12], [48, 36, 8], [74, 36, 9]]) for (let k = 0; k < L; k++) { px(x, '#1e5a2a', X + Math.round(Math.sin(k * .5) * 1.2), Y + k, 1, 1); if (k % 3 === 1) px(x, '#4a9a3e', X + 1, Y + k, 1, 1); }
  for (const [x0, y0, w] of [[8, 84, 108], [18, 66, 88], [28, 50, 68], [38, 36, 48]]) for (let X = 0; X < w; X += 2) if (h2(X, y0) > .55) { px(x, '#2e7a34', x0 + X, y0 - 1, 2, 2); if (h2(y0, X) > .8) px(x, '#7ac05a', x0 + X, y0 - 2, 1, 1); }
  for (const [X, Y] of [[20, 98], [104, 98], [10, 100], [114, 101]]) { px(x, '#1e5a2a', X - 4, Y - 3, 9, 4); px(x, '#4a9a3e', X - 3, Y - 3, 7, 1); }
  return { c, ax: 62, ay: 102 };
}
function shipSprite() {   // navio pirata encalhado, inclinado, com mastro quebrado e vela rasgada
  const W = 136, H = 92, [c, x] = canvas(W, H), O = '#1a0e08', WD2 = ['#3a2214', '#5a3a22', '#7a5230', '#9a6a40'];
  softShadow(x, 68, 86, 62, 6, .3);
  // casco inclinado (desenho por colunas)
  for (let X = 8; X < 128; X++) { const k = (X - 8) / 120, top = Math.round(50 - k * 10 + Math.sin(k * 3.1) * 4), bot = Math.round(84 - Math.abs(k - .55) * 18); if (bot <= top) continue;
    px(x, O, X, top - 1, 1, bot - top + 2); for (let Y = top; Y < bot; Y++) { const plank = ((Y - top) >> 2) & 1; px(x, Y === top ? WD2[3] : X > 100 ? WD2[0] : plank ? WD2[1] : WD2[2], X, Y, 1, 1); } }
  // buracos e areia por cima
  for (const [X, Y, w, h] of [[40, 64, 8, 6], [78, 60, 6, 5], [100, 70, 7, 5]]) { px(x, O, X - 1, Y - 1, w + 2, h + 2); px(x, '#0a0604', X, Y, w, h); }
  for (let X = 4; X < 132; X++) { const hh = 4 + Math.round(Math.sin(X * .11) * 2 + h2(X, 7) * 2); px(x, '#e8d096', X, 86 - hh, 1, hh); px(x, '#f4e2b6', X, 86 - hh, 1, 1); }
  // mastro quebrado e vela rasgada
  px(x, O, 61, 6, 5, 46); px(x, WD2[2], 62, 7, 3, 44); px(x, WD2[3], 62, 7, 1, 44); px(x, O, 48, 14, 30, 3); px(x, WD2[2], 49, 15, 28, 1);
  for (let Y = 17; Y < 42; Y++) { const w = Math.round(24 - (Y - 17) * .3), tear = (Y > 30 && Y < 36) ? 6 : 0; px(x, '#e8e0cc', 50 + tear, Y, w - tear, 1); if ((Y & 3) === 0) px(x, '#c8bea8', 50 + tear, Y, w - tear, 1); } px(x, '#2a2a2a', 58, 22, 8, 7); px(x, '#e8e0cc', 60, 24, 1, 1); px(x, '#e8e0cc', 63, 24, 1, 1); px(x, '#e8e0cc', 60, 27, 4, 1);
  px(x, O, 104, 30, 3, 22); px(x, WD2[2], 105, 31, 1, 20);   // toco do outro mastro
  // baú meio enterrado
  px(x, O, 18, 74, 14, 9); px(x, '#7a5230', 19, 75, 12, 7); px(x, '#ffd84a', 19, 78, 12, 1); px(x, '#ffd84a', 24, 77, 2, 3);
  return { c, ax: 68, ay: 86 };
}
const _lmSpriteEast = lmSprite;
lmSprite = function (id) { if (LM_SPR[id]) return LM_SPR[id]; if (id === 'templo') return LM_SPR[id] = templeSprite(); if (id === 'navio') return LM_SPR[id] = shipSprite(); return _lmSpriteEast(id); };
const _drawLmEast = drawLandmark;
drawLandmark = function (x, l, t) { _drawLmEast(x, l, t); if (l.id === 'templo') glow(x, l.x, l.y - 74, 10, '#3fe08a', .2 + .12 * Math.sin(t * 2.4)); if (l.id === 'navio' && Math.sin(t * 1.7) > .7) px(x, '#fff3b0', l.x - 44 + Math.floor(t * 3) % 10, l.y - 9, 1, 1); };
function southObjects() { const blk = (X, Y, w, h) => blockers.push({ k: 'r', x0: X - w / 2, x1: X + w / 2, y0: Y - h, y1: Y }); blk(470, 2700, 104, 22); blk(SOUTH_LM[1].x, SOUTH_LM[1].y, 116, 14); }
// ---------- chão do sul, estradas e pontes
function paintSouth(x) {
  const r = rng(7070);
  for (let i = 0; i < 30000; i++) { const X = Math.floor(r() * WW), Y = Math.floor(OWH + r() * (WH - OWH)), kind = r(), b = biomeAt(X, Y); if (b < 8 || inSea(X, Y + 2) || nearBranch(X, Y, 4)) continue;
    if (b === 8) { if (kind < .3) { px(x, '#1e5a2a', X, Y - 2, 1, 3); px(x, '#3e8a3e', X + 1, Y - 3, 1, 3); px(x, '#3e8a3e', X - 1, Y - 1, 1, 2); } else if (kind < .38) { px(x, ['#e04a5a', '#ffd84a', '#d0a0ff', '#ff9a3a'][Math.floor(r() * 4)], X, Y, 2, 2); px(x, '#fff3b0', X, Y, 1, 1); } else if (kind < .5) px(x, '#0e2a1a', X, Y, 3, 1); }
    else if (b === 9) { if (kind < .12) { px(x, '#8a7a3a', X, Y - 2, 1, 3); px(x, '#a89a4a', X + 1, Y - 1, 1, 2); } else if (kind < .2) px(x, '#a87430', X, Y, 2, 1); }
    else { if (kind < .08) { px(x, '#f4e8d8', X, Y, 2, 1); px(x, '#e8a0a0', X, Y - 1, 1, 1); } else if (kind < .14) px(x, '#c8a870', X, Y, 1, 1); } }
  for (const L of EXT_ROADS2.slice(-2)) for (let i = 0; i < L.length - 1; i++) { const [ax, ay] = L[i], [bx, by] = L[i + 1], dd = Math.hypot(bx - ax, by - ay);
    for (let s = 0; s < dd; s += 2) { const X = Math.round(ax + (bx - ax) * s / dd), Y = Math.round(ay + (by - ay) * s / dd), b = biomeAt(X, Y); if (nearBranch(X, Y, 2)) continue; px(x, b === 10 || b === 9 ? '#c8a060' : b === 4 ? '#a2aab8' : '#7a5a34', X - 3, Y - 2, 7, 5); } }
  // cachoeira: paredão de pedra e gelo ao norte da lagoa, de onde a água cai
  { const X0 = POND.x - 22, Y0 = POND.y - POND.ry - 30; for (let Y = 0; Y < 30; Y++) for (let X = 0; X < 44; X++) { const edge = Math.abs(X - 22) > 20 - Y * .25; if (edge && Y < 26) continue; const k = h2(X, Y + 3); px(x, Y < 5 ? (k > .5 ? '#eef4fa' : '#c8d8e8') : k > .7 ? '#8a92a2' : k > .35 ? '#6e7688' : '#4d5566', X0 + X, Y0 + Y); }
    px(x, '#2a2e3a', X0, Y0 + 29, 44, 2); for (let Y = 6; Y < 31; Y++) { px(x, '#3f86e6', POND.x - 5, Y0 + Y, 10, 1); px(x, '#9fd8ff', POND.x - 3, Y0 + Y, 2, 1); px(x, '#e8f4ff', POND.x + 1, Y0 + Y, 1, 1); } }
  // pontes de madeira sobre os braços
  for (const br of BRANCH_BRIDGES) { const X0 = br.x - br.hw, w = br.hw * 2; px(x, P.ink, X0 - 1, br.y - 6, w + 2, 12); for (let X = 0; X < w; X += 3) { px(x, X % 6 ? P.wood : P.woodL, X0 + X, br.y - 5, 2, 10); } px(x, P.woodD, X0, br.y - 5, w, 1); px(x, P.woodD, X0, br.y + 4, w, 1); for (const X of [X0, X0 + w - 2]) { px(x, P.ink, X - 1, br.y - 9, 4, 16); px(x, P.woodL, X, br.y - 8, 2, 14); } }
}
// ---------- correnteza: riscos claros que andam com a água (rio grande, braços) e ondas na praia
function drawWaterFlow(x, t, li, ti, cw, ch) {
  const x0 = Math.max(0, li - 2), x1 = Math.min(WW, li + cw + 2);
  if (riverY(li + cw / 2) > ti - 30 && riverY(li + cw / 2) < ti + ch + 30) {
    for (let X = x0; X < x1; X++) { if (Math.abs(X - BRIDGE.x) < 9 || BRIDGES.some(b => Math.abs(X - b.x) < 9)) continue; const ry = riverY(X);
      for (const lane of [-6, -1, 4]) { const ph = ((X - t * 18 + lane * 37) % 30 + 30) % 30; if (ph < 4) { x.globalAlpha = ph < 1 ? .85 : .5; px(x, ph < 1 ? '#e8f4ff' : '#9fc8ff', X, Math.round(ry + lane + Math.sin(X * .2 + t * 2) * .6), 1, 1); } } }
    x.globalAlpha = 1; }
  for (const b of BRANCHES) { if (b.x1 < li || b.x0 > li + cw || b.y1 < ti || b.y0 > ti + ch) continue;
    for (let i = 1; i < b.line.length; i++) { const [X, Y, s] = b.line[i]; if (X < li - 4 || X > li + cw + 4 || Y < ti - 4 || Y > ti + ch + 4) continue; if (BRANCH_BRIDGES.some(br => Math.abs(X - br.x) < br.hw && Math.abs(Y - br.y) < 7)) continue;
      const [px0, py0] = b.line[i - 1], dx = X - px0, dy = Y - py0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      for (const lane of [-3.5, 0, 3]) { const ph = ((s - t * 16 + lane * 23) % 22 + 22) % 22; if (ph < 5) { x.globalAlpha = ph < 1.5 ? .85 : .45; px(x, ph < 1.5 ? '#e8f4ff' : '#9fc8ff', Math.round(X + nx * lane), Math.round(Y + ny * lane), 1, 1); } } }
    x.globalAlpha = 1; }
  if (POND.x > li - 40 && POND.x < li + cw + 40 && POND.y > ti - 60 && POND.y < ti + ch + 40) { const top = POND.y - POND.ry - 24;
    for (let k = 0; k < 10; k++) { const yy = top + ((k * 7 + t * 40) % 26), xx = POND.x - 4 + (k * 3) % 9; x.globalAlpha = .8; px(x, '#ffffff', xx, Math.round(yy), 1, 3); }
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + t, r = 5 + (t * 6 + k * 2) % 7; x.globalAlpha = .55; px(x, '#ffffff', Math.round(POND.x + Math.cos(a) * r), Math.round(POND.y - POND.ry + 6 + Math.sin(a) * r * .4), 1, 1); } x.globalAlpha = 1; }
  if (ti + ch > 2900) { for (let X = x0; X < x1; X++) { const sy = seaY(X), w1 = Math.sin(t * 1.3 + X * .035) * 2.5, w2 = Math.sin(t * 1.1 + X * .05 + 2);
      x.globalAlpha = .8; px(x, '#ffffff', X, Math.round(sy - 1 + w1), 1, 1); x.globalAlpha = .45; px(x, '#e8f4ff', X, Math.round(sy + 9 + w2 * 2), 1, 1); px(x, '#cfe4ff', X, Math.round(sy + 24 + w2 * 3), 1, 1);
      if (h2(X, Math.floor(t * 3)) > .985) { x.globalAlpha = .9; px(x, '#ffffff', X, Math.round(sy + 30 + h2(Math.floor(t * 3), X) * 90), 1, 1); } } x.globalAlpha = 1; }
}
// ---------- SERENO: uma garoa fininha que cai de vez em quando (igual para todo mundo, dia ou noite)
const DRZ_SLOT = 14 * 60000, DRZ_LEN = 4.5 * 60000;
function drizzleLevel() { const now = Date.now(), slot = Math.floor(now / DRZ_SLOT); if (h2(slot, 913) > .4) return 0; const k = (now % DRZ_SLOT) / DRZ_LEN; if (k > 1) return 0; return Math.min(1, k * 8, (1 - k) * 8); }
function drawDrizzle(x, t, li, ti, cw, ch) {
  const lv = drizzleLevel(); if (lv <= 0) return; const n = Math.round(Math.min(700, 160 + cw * ch / 1400) * lv);
  x.fillStyle = `rgba(130,150,185,${(.12 * lv).toFixed(3)})`; x.fillRect(li, ti, cw, ch);
  x.globalAlpha = .8 * lv;
  for (let i = 0; i < n; i++) { const sp = .7 + h2(i, 3) * .5, X = li + ((h2(i, 1) * cw + t * 22 * sp) % cw), Y = ti + ((h2(i, 2) * ch + t * 130 * sp) % ch); px(x, '#f4f8ff', Math.round(X), Math.round(Y), 1, 3); px(x, '#d0dcf4', Math.round(X) + 1, Math.round(Y) + 3, 1, 2); if (h2(i, Math.floor(t * 2)) > .97) px(x, '#ffffff', Math.round(X) - 1, Math.round(Y) + 3, 3, 1); }
  x.globalAlpha = 1;
  if (!drawDrizzle.told && lv > .5) { drawDrizzle.told = 1; if (typeof fxToast === 'function') fxToast('Está caindo um sereno…', 'Uma garoa fininha cobre Eryon por alguns minutos', '#9fc8ff', '☂'); }
  if (lv < .05) drawDrizzle.told = 0;
}
