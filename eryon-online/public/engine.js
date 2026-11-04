// =====================================================================
// ERYON — motor compartilhado (pixel art 2D, vista de cima)
// Reproduz exatamente o mapa do Episódio 1 (semente 42, mesma ordem de
// geração) e oferece personagens animados, construções, luz e câmera
// para os próximos episódios. Usado por ep2/ (e futuros episódios).
// =====================================================================

// ---------- utilidades
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eOutBack = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const eInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eOut = k => 1 - Math.pow(1 - k, 3);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(42), rr = (a, b) => a + (b - a) * R();
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vn(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), u), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v); }
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
const px = (x, c, X, Y, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(X, Y, w, h); };
function disc(x, cx, cy, r, col) { x.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy); for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * .8)); x.fillRect(cx - w, cy + dy, w * 2 + 1, 1); } }
function ring(x, cx, cy, r, col) { x.fillStyle = col; const n = Math.max(12, Math.round(r * 6.3)); for (let i = 0; i < n; i++) { const a = i / n * 6.283; x.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); } }
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function flipped(c) { const [f, x] = canvas(c.width, c.height); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return f; }

// ---------- paleta (Episódio 1)
const P = { ink: '#1a120c', f0: '#0f3328', f1: '#174433', f2: '#1f5638', f3: '#2a6a3c', f4: '#357c40', f5: '#3f8f45', f6: '#4f9f4a', f7: '#66b350', f8: '#84c65a', f9: '#a6da6a',
  dirt0: '#5a3420', dirt1: '#8a5430', dirt2: '#b0703f', dirt3: '#cf8d50', sand: '#e2aa68', wood: '#8a5530', woodD: '#55321c', woodL: '#b8814a',
  st0: '#2e3440', st1: '#565e70', st2: '#7a8396', st3: '#a2abbc', st4: '#ccd3de', w1: '#3460c8', w2: '#4f86e6',
  cy: '#3fd0e0', cy2: '#9ff3ff', fire1: '#d0622a', fire2: '#f2a33a', fire3: '#ffd84a', fire4: '#fff3b0', wall: '#e4d0a0', wallD: '#c9a46a', skin: '#e8b48c', skinD: '#c08060' };

// ---------- mundo (idêntico ao Episódio 1)
// mundo: a parte original (720×1280) fica idêntica; as terras novas ficam a leste e ao sul
const OW = 720, OH = 1280, WW = 1440, WH = 2400, C = { x: 360, y: 640 };
const VW = 360, VH = 640, OUT = 3;
const riverY = x => 212 + 16 * Math.sin(x * .021) + 7 * Math.sin(x * .057 + 1);
const pathS = y => 362 + 6 * Math.sin(y * .03);
const BRIDGE = { x: 430, y: Math.round(riverY(430)) }, TOWER = { x: 290, y: 118 }, RUINS = { x: 520, y: 400 }, CAVE = { x: 92, y: 812 };
const SEAT = { x: 360, y: 668 };
const FOUNDER_A = { x: 341, y: 646 }, FOUNDER_B = { x: 380, y: 646 };

// ruído pré-calculado nos pontos da grade: dá exatamente o mesmo valor que vn(), só que muito mais rápido
function noiseGrid(f, ox = 0, oy = 0, M = 12) {
  const x0 = Math.floor(-M * f + ox) - 1, y0 = Math.floor(-M * f + oy) - 1, w = Math.ceil((WW + M) * f + ox) - x0 + 3, h = Math.ceil((WH + M) * f + oy) - y0 + 3, g = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g[j * w + i] = h2(x0 + i, y0 + j);
  return (x, y) => { const X = x * f + ox, Y = y * f + oy, xi = Math.floor(X), yi = Math.floor(Y), xf = X - xi, yf = Y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), o = (yi - y0) * w + (xi - x0);
    return lerp(lerp(g[o], g[o + 1], u), lerp(g[o + w], g[o + w + 1], u), v); };
}
// regiões: 0 vila/floresta original · 1 Floresta de Outono · 2 Vale das Flores · 3 Brejo Sombrio · 4 Picos Gelados
const BIOME_NAMES = ['Floresta de Eryon', 'Floresta de Outono', 'Vale das Flores', 'Brejo Sombrio', 'Picos Gelados'];
function biomeAt(x, y) {
  const ex = OW + 25 + (vn(y * .02, 31) - .5) * 50, ey = OH + 25 + (vn(x * .02, 37) - .5) * 50;
  if (x < ex && y < ey) return 0;
  if (x < ex) return 2;
  if (y < 1250 + (vn(x * .02, 41) - .5) * 70) return 1;
  if (y < 1800 + (vn(x * .02, 43) - .5) * 80) return 3;
  return 4;
}
const LAKE = { x: 1090, y: 770, rx: 125, ry: 78 };
const lakeVal = (x, y) => ((x - LAKE.x) / LAKE.rx) ** 2 + ((y - LAKE.y) / LAKE.ry) ** 2 + (vn(x * .05 + 200, y * .05) - .5) * .35;
const inLake = (x, y) => Math.abs(x - LAKE.x) < LAKE.rx + 30 && Math.abs(y - LAKE.y) < LAKE.ry + 30 && lakeVal(x, y) < 1;
// estradas novas (terra batida) ligando a vila às terras novas
const EXT_ROADS = [
  [[530, 712], [620, 742], [720, 760], [830, 772], [940, 752], [1010, 712], [1060, 684], [1088, 674]],
  [[1100, 672], [1150, 600], [1200, 500], [1240, 420], [1258, 378]],
  [[1100, 672], [1230, 700], [1262, 800], [1252, 1000], [1236, 1250], [1222, 1490]],
  [[1220, 1545], [1200, 1700], [1160, 1900], [1124, 2052]],
  [[362, 1450], [600, 1462], [800, 1472], [1000, 1482], [1200, 1505]],
  [[360, 1562], [300, 1562], [262, 1566]],
  [[362, 1900], [420, 1918], [452, 1930]],
  [[362, 2200], [500, 2218], [608, 2232]],
];
function nearRoad(x, y, d = 10) { for (const L of EXT_ROADS) for (let i = 0; i < L.length - 1; i++) { const [ax, ay] = L[i], [bx, by] = L[i + 1], dx = bx - ax, dy = by - ay, k = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)); if (Math.hypot(x - ax - dx * k, y - ay - dy * k) < d) return true; } return false; }

// chão no estilo pixel art: manchas de grama em tons chapados (com borda pontilhada), clareiras de terra e rio com margem de pedras
const GRASS = ['#2a6a3c', '#357c40', '#3f8f45', '#4f9f4a', '#66b350', '#84c65a'].map(hex);
const DIRT = ['#8a5430', '#b0703f', '#cf8d50', '#e2aa68'].map(hex);
const BG = [GRASS,
  ['#4a5a24', '#5c6c2a', '#6e7e30', '#86903a', '#a0a048', '#bcb45a'].map(hex),        // outono
  ['#2f7a3c', '#3c8e42', '#4fa24a', '#64b652', '#80c85e', '#a0da70'].map(hex),        // vale
  ['#1a3428', '#223e2e', '#2a4a34', '#34563a', '#3e6242', '#4a6e4a'].map(hex),        // brejo
  ['#9fb4c8', '#b4c8da', '#c8d8e8', '#dce8f2', '#eef4fa', '#ffffff'].map(hex)];       // neve
const BDIRT = [DIRT, DIRT, DIRT, ['#3a2e1e', '#4a3a24', '#5a4a30', '#6a5838'].map(hex), ['#6e7688', '#8a92a2', '#a2aab8', '#bcc4d0'].map(hex)];
const NG = { g1: noiseGrid(.03), g2: noiseGrid(.09, 9), g3: noiseGrid(.08), d1: noiseGrid(.045, 50, 20), d2: noiseGrid(.2), sw: noiseGrid(.06, 90, 40) };
function grassAt(x, y, base, pal = GRASS) {
  const n = NG.g1(x, y) * .7 + NG.g2(x, y) * .3, dith = ((x + y) & 1) ? .045 : -.045;
  let k = base + Math.floor(n * 3 + dith); k = Math.max(0, Math.min(5, k));
  return pal[k];
}
const [ground, gx] = canvas(WW, WH);
{
  const img = gx.createImageData(WW, WH), d = img.data, Wt = [P.w1, P.w2, '#2a4ea8', '#7fb0f5'].map(hex), BANK = ['#4a5060', '#6e7688', '#959eb0'].map(hex), MUD = ['#2a4038', '#34504a', '#4a6a62'].map(hex), cream = hex('#f4f0d8');
  const exA = new Float32Array(WH), eyA = new Float32Array(WW), b1 = new Float32Array(WW), b2 = new Float32Array(WW), rY = new Float32Array(WW), wobA = new Float32Array(WW);
  for (let y = 0; y < WH; y++) exA[y] = OW + 25 + (vn(y * .02, 31) - .5) * 50;
  const pS = new Float32Array(WH); for (let y = 0; y < WH; y++) pS[y] = pathS(y);
  for (let x = 0; x < WW; x++) { eyA[x] = OH + 25 + (vn(x * .02, 37) - .5) * 50; b1[x] = 1250 + (vn(x * .02, 41) - .5) * 70; b2[x] = 1800 + (vn(x * .02, 43) - .5) * 80; rY[x] = riverY(x); wobA[x] = vn(x * .15, 7) * 2; }
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const bi = (x < exA[y] && y < eyA[x]) ? 0 : x < exA[y] ? 2 : y < b1[x] ? 1 : y < b2[x] ? 3 : 4, pal = BG[bi], dirt = BDIRT[bi];
    const raw = Math.hypot(x - C.x, (y - C.y) * 1.05), dc = raw < 90 ? raw + (NG.g3(x, y) - .5) * 14 : raw, r = (bi === 2 || bi === 3 || dc < 64) ? h2(x, y) : 0;
    let c = grassAt(x, y, bi === 4 ? 2 : dc < 64 ? 2 : 1, pal);
    // manchas de terra (lama no brejo, pedra na neve)
    const dp = NG.d1(x, y) + (NG.d2(x, y) - .5) * .12;
    if (dp > .8) c = dirt[dp > .86 ? (dp > .9 ? 3 : 2) : 1]; else if (dp > .78 && ((x + y) & 1)) c = dirt[0];
    if (bi === 3) { const sw = NG.sw(x, y); if (sw > .7) c = MUD[sw > .76 ? (r > .97 ? 2 : 1) : 0]; }
    if (bi === 2 && r > .992) c = r > .996 ? hex('#f6b6d8') : cream;
    if (dc < 64 && r > .994) c = cream;
    if (dc < 18) c = DIRT[1 + Math.floor(r * 2.2)];
    if (y > 690 && Math.abs(x - pS[y]) < 8 && Math.abs(x - pS[y]) < 4 + vn(y * .1, 3) * 3) c = (bi === 4 ? BDIRT[4] : DIRT)[1 + Math.floor(vn(x * .3, y * .3) * 2.4)];
    const dr = Math.abs(y - rY[x]);
    if (dr < 16) { const wob = wobA[x];
      if (dr < 13 + wob) c = BANK[vn(x * .4, y * .4) > .6 ? 2 : vn(x * .4, y * .4) > .3 ? 1 : 0];
      if (dr < 10 + wob * .5) { const w = vn(x * .08 + y * .01, y * .25), e = 10 + wob * .5 - dr; c = e < 1.6 ? Wt[3] : e < 3.2 ? Wt[1] : Wt[w > .7 ? 1 : 0]; if (e >= 3.2 && w < .2 && ((x + y) & 1)) c = Wt[2]; } }
    // Lago Espelhado
    if (Math.abs(x - LAKE.x) < LAKE.rx + 30 && Math.abs(y - LAKE.y) < LAKE.ry + 30) { const lv = lakeVal(x, y);
      if (lv < 1.14) c = BANK[vn(x * .4, y * .4) > .6 ? 2 : vn(x * .4, y * .4) > .3 ? 1 : 0];
      if (lv < 1) { const w = vn(x * .06, y * .2); c = lv > .9 ? Wt[3] : lv > .8 ? Wt[1] : lv < .35 ? Wt[2] : Wt[w > .72 ? 1 : 0]; if (lv < .8 && w > .8 && ((x + y) % 3 === 0)) c = Wt[3]; } }
    const i = (y * WW + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  gx.putImageData(img, 0, 0);
}
const [clearTex, ctx2] = canvas(OW + 40, OH);
{
  const img = ctx2.createImageData(OW + 40, OH), d = img.data, cream = hex('#f4f0d8');
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW + 40; x++) { let c = grassAt(x + 7, y, 2); if (h2(x + 7, y) > .995) c = cream;
    const i = (y * (OW + 40) + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
  ctx2.putImageData(img, 0, 0);
}
function roundTree(r, pal, seed) {
  const w = r * 2 + 8, h = r * 2 + 12, [c, x] = canvas(w, h), cx = r + 3, cy = r + 2;
  x.fillStyle = 'rgba(5,15,12,.55)'; for (let dy = -3; dy <= 3; dy++) { const ww = Math.round(Math.sqrt(9 - dy * dy) * r / 3); x.fillRect(cx + 3 - ww, h - 5 + dy, ww * 2, 1); }
  px(x, P.ink, cx - 2, cy + r - 3, 5, 9); px(x, P.woodD, cx - 1, cy + r - 3, 3, 8); px(x, P.wood, cx - 1, cy + r - 3, 1, 8);
  const inside = (X, Y) => { const dx = X - cx, dy = Y - cy, a = Math.atan2(dy, dx); return Math.hypot(dx, dy) <= r + 1.3 * Math.sin(a * 5 + seed) + .8 * Math.sin(a * 9 + seed * 2); };
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    if (!inside(X, Y)) continue;
    const edge = !inside(X + 1, Y) || !inside(X - 1, Y) || !inside(X, Y + 1) || !inside(X, Y - 1);
    const dx = X - cx, dy = Y - cy, l = (-dx * .6 - dy * .8) / r + (h2(X + seed, Y) - .5) * .22 + (((X + Y) & 1) ? .09 : -.09);
    px(x, edge ? P.ink : l > .5 ? pal[3] : l > .05 ? pal[2] : l > -.45 ? pal[1] : pal[0], X, Y);
  }
  return { c, ax: cx, ay: h - 4 };
}
function pineTree(r, pal, seed) {
  const w = r * 2 + 6, h = Math.round(r * 3.3) + 6, [c, x] = canvas(w, h), cx = r + 2;
  x.fillStyle = 'rgba(5,15,12,.55)'; for (let dy = -2; dy <= 2; dy++) { const ww = Math.round(Math.sqrt(4.5 - dy * dy) * r / 2.2); x.fillRect(cx + 3 - ww, h - 4 + dy, ww * 2, 1); }
  px(x, P.ink, cx - 1, h - 9, 3, 6); px(x, P.woodD, cx, h - 9, 1, 5);
  const inside = (X, Y) => { for (let i = 0; i < 3; i++) { const top = Math.round(i * r * .85), bot = top + Math.round(r * 1.5), yy = Y - top; if (Y < top || Y > bot) continue;
    const hw = (yy / (bot - top)) * r * (.7 + i * .17) + (((Y + seed) % 3 === 0) ? 1 : 0); if (Math.abs(X - cx) <= hw) return true; } return false; };
  for (let Y = 0; Y < h - 7; Y++) for (let X = 0; X < w; X++) {
    if (!inside(X, Y)) continue;
    const edge = !inside(X + 1, Y) || !inside(X - 1, Y) || !inside(X, Y + 1) || !inside(X, Y - 1);
    const l = (cx - X) / r + (h2(X, Y + seed) - .5) * .25 + (((X + Y) & 1) ? .1 : -.1);
    px(x, edge ? P.ink : l > .45 ? pal[3] : l > -.05 ? pal[2] : l > -.5 ? pal[1] : pal[0], X, Y);
  }
  return { c, ax: cx, ay: h - 4 };
}
const LEAF = [['#1f5a3a', '#2f7a40', '#47994a', '#74c05c'], ['#25633c', '#3a8a45', '#5aa84e', '#90d064'], ['#4a5a1e', '#6e8228', '#93a83a', '#c2d25a'], ['#1d5238', '#33793f', '#52a049', '#7cc35a']];
const NEEDLE = [['#123d32', '#1d5a40', '#2c7448', '#47955a'], ['#174836', '#24644a', '#337d50', '#52a35e']];
const treeSprites = [];
for (let i = 0; i < 14; i++) treeSprites.push(roundTree(7 + (i % 4) * 2, LEAF[i % 4], i * 1.7));
for (let i = 0; i < 10; i++) treeSprites.push(pineTree(6 + (i % 3) * 2, NEEDLE[i % 2], i));
const trees = [];
{
  const grid = new Map(), cell = 12;
  for (let k = 0; k < 9000 && trees.length < 1500; k++) {
    const x = rr(-10, OW + 10), y = rr(-10, OH + 20);
    const dc = Math.hypot(x - C.x, (y - C.y) * 1.05);
    if (dc < 74) continue;
    if (Math.abs(y - riverY(x)) < 18) continue;
    if (y > 690 && Math.abs(x - pathS(y)) < 9) continue;
    if (Math.hypot(x - BRIDGE.x, y - BRIDGE.y) < 22 || Math.hypot(x - TOWER.x, y - TOWER.y) < 26 || Math.hypot(x - RUINS.x, y - RUINS.y) < 30 || Math.hypot(x - CAVE.x, y - CAVE.y) < 44) continue;
    const gxk = Math.floor(x / cell), gyk = Math.floor(y / cell); let ok = true;
    for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1 && ok; b++) for (const o of grid.get((gxk + a) + ',' + (gyk + b)) || []) if (Math.hypot(o.x - x, o.y - y) < 11) { ok = false; break; }
    if (!ok) continue;
    const pine = vn(x * .01 + 4, y * .01) > .5 ? R() < .8 : R() < .25;
    const s = pine ? 14 + Math.floor(R() * 10) : Math.floor(R() * 14);
    const t = { x: Math.round(x), y: Math.round(y), s, dc, dyn: dc < 250 };
    trees.push(t); const key = gxk + ',' + gyk; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(t);
  }
  trees.sort((a, b) => a.y - b.y);
}
// árvores das terras novas (entram DEPOIS das originais: a numeração das antigas não muda)
const LEAF_A = [['#6a2a10', '#a8441c', '#d8702a', '#f2a04a'], ['#7a3a10', '#b86a1a', '#e09a2a', '#f8cc5a'], ['#5a1a14', '#8a2a1c', '#c0442a', '#e8704a'], ['#4a4a14', '#7a7a1e', '#a8a02a', '#d8c84a']];
for (let i = 0; i < 8; i++) treeSprites.push(roundTree(7 + (i % 4) * 2, LEAF_A[i % 4], i * 2.3 + 50));                                    // 24..31 outono
for (let i = 0; i < 6; i++) treeSprites.push(pineTree(6 + (i % 3) * 2, i % 2 ? ['#123d32', '#1d5a40', '#c8dcea', '#ffffff'] : ['#174836', '#24644a', '#b4c8da', '#eef4fa'], i + 30));   // 32..37 neve
for (let i = 0; i < 6; i++) treeSprites.push(roundTree(6 + (i % 3) * 2, [['#1a2a1c', '#2a3a24', '#3a4a2c', '#4e5e36'], ['#22301e', '#34442a', '#465632', '#5a6a3e']][i % 2], i * 3.1 + 80));   // 38..43 brejo
{
  const R2 = rng(4343), grid = new Map(), cell = 12, add = [];
  for (const t of trees) { const k = Math.floor(t.x / cell) + ',' + Math.floor(t.y / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t); }
  for (let k = 0; k < 60000 && add.length < 3600; k++) {
    const x = R2() * WW, y = R2() * WH, bi = biomeAt(x, y), roll = R2(), pick = R2(); if (bi === 0) continue;
    if (roll > [0, .95, .3, .6, .75][bi]) continue;
    if (Math.abs(y - riverY(x)) < 18 || (y > 690 && Math.abs(x - pathS(y)) < 10) || lakeVal(x, y) < 1.3 || nearRoad(x, y, 11)) continue;
    const gxk = Math.floor(x / cell), gyk = Math.floor(y / cell); let ok = true;
    for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1 && ok; b++) for (const o of grid.get((gxk + a) + ',' + (gyk + b)) || []) if (Math.hypot(o.x - x, o.y - y) < 11) { ok = false; break; }
    if (!ok) continue;
    const s = bi === 1 ? (pick < .2 ? 14 + Math.floor(pick * 50) : 24 + Math.floor(pick * 8)) : bi === 2 ? Math.floor(pick * 14) : bi === 3 ? 38 + Math.floor(pick * 6) : 32 + Math.floor(pick * 6);
    const t = { x: Math.round(x), y: Math.round(y), s, dc: Math.hypot(x - C.x, (y - C.y) * 1.05), dyn: false, bi };
    add.push(t); const key = gxk + ',' + gyk; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(t);
  }
  add.sort((a, b) => a.y - b.y); trees.push(...add);
}

// =====================================================================
// PERSONAGENS — construídos pixel a pixel, com poses animáveis
// pose = { legs: stand|w1|w2|r1|r2|sit, arm: down|up|fwd|low|carry|wave|bow|both, tool, eyes:-1|0|1, br:0|1 }
// =====================================================================
function charBuilder(sp) {
  const cache = new Map();
  const M = { k: P.ink, h: sp.hair || '#5a3a26', s: sp.skin || P.skin, S: sp.skinD || P.skinD, e: P.ink, c: sp.shirt || '#6e7a84', C: sp.shirtD || '#4a535c',
    p: sp.pants || '#2c4f7a', b: sp.boots || '#2e1d16', B: sp.beard || sp.hair || '#3a2618', a: sp.apron || '#4a2f22', l: sp.belt || '#4a2f22', w: '#ffffff', g: P.fire3,
    m: sp.cape || '#4e6c4a', A: sp.armor || '#4a535c', r: sp.rust || '#8b5e3c', D: '#2b3138',
    H: shadeHex(sp.hair || '#5a3a26', 1.35), L: shadeHex(sp.shirt || '#6e7a84', 1.25), o: shadeHex(sp.skinD || P.skinD, .8), P: shadeHex(sp.pants || '#2c4f7a', 1.3) };
  function build(po) {
    const big = !!sp.big;
    const [c, x] = canvas(30, 34);
    const OX = big ? 10 : 11, FY = 31;              // origem (coluna 0 da cabeça) e linha do pé
    if (sp.wings) { const wy = FY - 4; for (const [sx, dir] of [[OX + 1, -1], [OX + 6, 1]]) { for (let k = 0; k < 5; k++) { const h = 7 - Math.abs(k - 1) - (k > 2 ? 1 : 0), X = sx + dir * k; px(x, '#5a3a7a', X, wy - h - 1, 1, h + 2); px(x, k % 2 ? '#f6b6d8' : '#c8f0ff', X, wy - h, 1, h); }
      px(x, '#ffffff', sx + dir * 2, wy - 5, 1, 2); } }
    const rows = [];
    // cabeça
    const eyeRow = ['k', 's', 's', 's', 's', 's', 's', 'k']; eyeRow[2 + (po.eyes || 0)] = 'e'; eyeRow[5 + (po.eyes || 0)] = 'e'; eyeRow[6 + (po.eyes > 0 ? 0 : 0)] = eyeRow[6] === 'e' ? 'e' : 'S';
    let head = ["..kkkk..", ".khHHhk.", "khHhhhhk", "khsssshk", eyeRow.join(''), sp.beard ? "kBBBBBBk" : "kSsoosSk"];
    if (sp.longHair) head = head.map((r, i) => i >= 3 ? 'h' + r.slice(1, 7) + 'h' : r);
    // tronco
    const tw = big ? 10 : 8, th = big ? 5 : 3, lh = big ? 4 : 3;
    const torso = [];
    for (let j = 0; j < th; j++) {
      let r = 'k' + 'c'.repeat(tw - 2) + 'k';
      r = r.split(''); r[2] = 'C'; r[tw - 3] = 'C'; if (j === 0) r[1] = 'L';
      if (sp.plaid && j % 2 === 0) for (let i = 1; i < tw - 1; i += 2) r[i] = 'C';
      if (sp.armor) { r = ('k' + 'A'.repeat(tw - 2) + 'k').split(''); if ((j * 3 + 1) % 4 === 0) r[3] = 'r'; if (j === 1) r[tw - 4] = 'r'; if (j === 0) { r[1] = 'D'; r[tw - 2] = 'D'; } }
      if (j === th - 1) r = ('k' + (sp.armor ? 'D' : 'l').repeat(tw - 2) + 'k').split('');
      if (sp.apron && j >= 1) { const a0 = Math.floor(tw / 2) - 2; for (let i = a0; i < a0 + 4; i++) r[i] = 'a'; }
      if (sp.longHair && j < 2) { r[0] = 'h'; r[tw - 1] = 'h'; }
      if (j === Math.min(1, th - 2) && (po.arm === 'down' || !po.arm)) { r[0] = 's'; r[tw - 1] = 's'; }
      if (j === Math.min(1, th - 2) && po.arm !== 'down' && po.arm) { r[0] = (po.arm === 'carry' || po.arm === 'both') ? 'k' : 's'; r[tw - 1] = 'k'; }
      torso.push(r.join(''));
    }
    // pernas
    const L = {
      stand: [".kppppk.", ".kpkkpk.", ".bb..bb."], w1: [".kppppk.", "kpk..kp.", "bb....b."], w2: [".kppppk.", ".pk..kpk", ".b....bb"],
      r1: [".kppppk.", "kpk...kp", "b......b"], r2: [".kppppk.", ".kpkkpk.", "..bbbb.."], sit: ["kppppppk", ".bb..bb."],
    }[po.legs || 'stand'];
    let legs = L.slice();
    if (big) legs = {
      stand: [".kppppppk.", ".kppkkppk.", ".kpk..kpk.", ".bbb..bbb."], w1: [".kppppppk.", "kppk..kpk.", "kpk....kp.", "bbb....bb."],
      w2: [".kppppppk.", ".kpk..kppk", ".kp....kpk", ".bb....bbb"], r1: [".kppppppk.", "kppk..kpk.", "kpk....kp.", "bbb....bb."],
      r2: [".kppppppk.", ".kpk..kppk", ".kp....kpk", ".bb....bbb"], sit: ["kppppppppk", ".bbb..bbb."] }[po.legs || 'stand'];
    const legRows = legs.length;
    // monta de baixo para cima
    const sitDrop = po.legs === 'sit' ? 1 : 0;
    const legTop = FY - legRows + 1, torsoTop = legTop - th, headTop = torsoTop - 6 + (po.br ? 1 : 0);
    const put = (row, X0, Y) => [...row].forEach((ch, i) => { if (ch !== '.' && M[ch]) px(x, M[ch], X0 + i, Y); });
    // capa por trás
    if (sp.cape) { px(x, P.ink, OX - 1 + (big ? -1 : 0), torsoTop - 1, tw + 2, th + legRows); px(x, M.m, OX + (big ? -1 : 0), torsoTop, tw, th + legRows - 1); }
    legs.forEach((r, j) => put(r, OX + (big ? -1 : 0), legTop + j + sitDrop));
    torso.forEach((r, j) => put(r, OX + (big ? -1 : 0), torsoTop + j + sitDrop));
    head.forEach((r, j) => put(r, OX, headTop + j + sitDrop));
    const hT = headTop + sitDrop, tT = torsoTop + sitDrop;
    // acessórios de cabeça
    if (sp.elfEars) { px(x, P.ink, OX - 2, hT + 2, 2, 3); px(x, M.s, OX - 1, hT + 3, 1, 1); px(x, P.ink, OX + 8, hT + 2, 2, 3); px(x, M.s, OX + 8, hT + 3, 1, 1); }
    if (sp.wolfEars) { for (const ex of [OX + 1, OX + 5]) { px(x, P.ink, ex - 1, hT - 3, 4, 4); px(x, M.h, ex, hT - 2, 2, 2); px(x, '#c4ccd0', ex, hT - 2, 1, 1); } }
    if (sp.hat === 'palha') { px(x, P.ink, OX - 2, hT + 1, 12, 2); px(x, '#e4c066', OX - 1, hT + 1, 10, 1); px(x, P.ink, OX + 1, hT - 2, 6, 3); px(x, '#e4c066', OX + 2, hT - 1, 4, 2); px(x, '#a83a32', OX + 2, hT, 4, 1); }
    if (sp.hat === 'bone') { px(x, P.ink, OX, hT - 1, 8, 3); px(x, sp.capColor || '#a83a32', OX + 1, hT, 6, 2); px(x, P.ink, OX + 6, hT + 1, 4, 2); px(x, sp.capColor || '#a83a32', OX + 7, hT + 1, 2, 1); }
    if (sp.hat === 'mago') { px(x, P.ink, OX - 2, hT + 1, 12, 2); px(x, '#4a2a7a', OX - 1, hT + 1, 10, 1);
      for (let k = 0; k < 8; k++) { const w = Math.max(1, 7 - k), x0 = OX + 4 - Math.ceil(w / 2) + (k > 4 ? 1 : 0); px(x, P.ink, x0 - 1, hT - k, w + 2, 1); px(x, k % 3 === 1 ? '#7a4ac0' : '#6e4a8a', x0, hT - k, w, 1); }
      px(x, '#ffd84a', OX + 3, hT - 2, 1, 1); px(x, '#ffd84a', OX + 5, hT - 4, 1, 1); px(x, '#fff3b0', OX + 6, hT - 8, 1, 1); }
    if (sp.hat === 'chef') { px(x, P.ink, OX + 1, hT - 4, 6, 6); px(x, '#ffffff', OX + 2, hT - 3, 4, 4); px(x, '#c4ccd0', OX + 5, hT - 3, 1, 4); }
    if (sp.crown) { px(x, P.ink, OX + 1, hT - 2, 6, 3); px(x, P.fire3, OX + 2, hT - 1, 4, 1); px(x, P.fire3, OX + 2, hT - 2, 1, 1); px(x, P.fire3, OX + 5, hT - 2, 1, 1); px(x, P.cy2, OX + 3, hT - 1, 2, 1); }
    // braços e ferramentas (sem contorno automático; desenhados por cima)
    const right = OX + (big ? tw - 1 : 7) + (big ? -1 : 0), left = OX - (big ? 1 : 0);   // colunas laterais do tronco
    const hy0 = tT + Math.min(1, th - 2);
    let hand = null;
    const arm = (cols) => cols.forEach(([X, Y, col]) => px(x, col, X, Y));
    const A = po.arm || 'down';
    if (A === 'up' || A === 'wave') { const wv = A === 'wave' && po.br ? 1 : 0; arm([[right + 1, tT, P.ink], [right + 1, tT - 1, M.c], [right + 1, tT - 2, P.ink], [right + 2, tT - 1, P.ink]]); hand = [right + 1 + wv, tT - 3]; arm([[hand[0], hand[1], M.s], [hand[0], hand[1] - 1, P.ink], [hand[0] + 1, hand[1], P.ink]]); }
    if (A === 'fwd' || A === 'bow') { arm([[right + 1, hy0, M.c], [right + 2, hy0, M.s], [right + 1, hy0 + 1, P.ink], [right + 2, hy0 + 1, P.ink], [right + 3, hy0, P.ink]]); hand = [right + 2, hy0]; }
    if (A === 'low') { arm([[right + 1, hy0 + 1, M.c], [right + 2, hy0 + 2, M.s], [right + 1, hy0 + 2, P.ink], [right + 3, hy0 + 2, P.ink]]); hand = [right + 2, hy0 + 2]; }
    if (A === 'carry') { arm([[left - 1, tT - 1, M.c], [left - 1, tT - 2, M.s], [right + 1, tT - 1, M.c], [right + 1, tT - 2, M.s], [left - 2, tT - 1, P.ink], [right + 2, tT - 1, P.ink]]); }
    if (A === 'both') { arm([[left - 1, hy0, M.s], [right + 1, hy0, M.s]]); hand = [right + 1, hy0]; }
    if (A === 'down') hand = [right, hy0];
    const T = po.tool, W = '#c4ccd0', Wd = '#6e7a84', wd = P.wood;
    if (T && hand) {
      const [a, b] = hand;
      if (T === 'axe') { if (A === 'up') arm([[a - 1, b - 1, wd], [a - 2, b - 2, wd], [a - 3, b - 3, wd], [a - 4, b - 5, W], [a - 3, b - 5, W], [a - 4, b - 4, Wd], [a - 5, b - 4, Wd], [a - 5, b - 5, P.ink]]);
        else if (A === 'low') arm([[a + 1, b + 1, wd], [a + 2, b + 2, wd], [a + 3, b + 3, W], [a + 3, b + 2, W], [a + 4, b + 3, Wd]]);
        else arm([[a, b + 1, wd], [a, b + 2, wd], [a + 1, b + 3, W], [a, b + 3, Wd]]); }
      if (T === 'hammer') { if (A === 'up') arm([[a, b - 1, wd], [a, b - 2, wd], [a - 1, b - 3, Wd], [a, b - 3, W], [a + 1, b - 3, Wd]]); else if (A === 'fwd' || A === 'low') arm([[a + 1, b, wd], [a + 2, b, wd], [a + 3, b - 1, W], [a + 3, b, Wd], [a + 3, b + 1, Wd]]); else arm([[a, b + 1, wd], [a - 1, b + 2, Wd], [a, b + 2, W]]); }
      if (T === 'bighammer') { if (A === 'up') arm([[a, b - 1, wd], [a, b - 2, wd], [a, b - 3, wd], [a - 1, b - 5, Wd], [a, b - 5, W], [a + 1, b - 5, Wd], [a - 1, b - 4, P.st1], [a, b - 4, Wd], [a + 1, b - 4, P.st1]]); else arm([[a + 1, b + 1, wd], [a + 2, b + 2, wd], [a + 2, b + 3, W], [a + 3, b + 3, Wd], [a + 3, b + 2, Wd]]); }
      if (T === 'ladle') arm([[a + 1, b, Wd], [a + 2, b + 1, Wd], [a + 2, b + 2, W], [a + 3, b + 2, Wd]]);
      if (T === 'flask') arm([[a + 1, b - 1, P.ink], [a + 1, b, '#7c9b5b'], [a + 1, b + 1, '#9cbf62'], [a + 2, b, P.ink]]);
      if (T === 'mug') arm([[a + 1, b - 1, '#fff3b0'], [a + 1, b, '#c9a46a'], [a + 2, b, '#c9a46a'], [a + 3, b, P.ink]]);
      if (T === 'sword') { if (A === 'up') { arm([[a - 1, b + 1, P.fire3], [a, b + 1, P.fire3], [a + 1, b + 1, P.fire3]]); for (let i = 0; i < 9; i++) arm([[a, b - i, i === 8 ? W : (i % 2 ? W : '#e8eef0')], [a + 1, b - i, Wd]]); }
        else { arm([[a, b - 1, P.fire3], [a + 1, b - 1, P.fire3], [a - 1, b - 1, P.fire3]]); for (let i = 0; i < 9; i++) arm([[a + 1, b + i, i % 2 ? W : '#e8eef0'], [a + 2, b + i, Wd]]); } }
      if (T === 'daggers') { arm([[a + 1, b + 1, W], [a + 2, b + 2, W]]); arm([[left - 1, hy0, M.s], [left - 2, hy0 + 1, W], [left - 3, hy0 + 2, W]]); }
      if (T === 'bow') { arm([[a + 2, b - 4, P.woodL], [a + 3, b - 3, P.woodL], [a + 3, b - 2, P.fire3], [a + 3, b - 1, P.woodL], [a + 3, b, P.woodL], [a + 3, b + 1, P.fire3], [a + 3, b + 2, P.woodL], [a + 2, b + 3, P.woodL]]);
        for (let i = -3; i <= 2; i++) px(x, 'rgba(255,255,255,.7)', a + 1, b + i); }
      if (T === 'torch') { arm([[a + 1, b, wd], [a + 1, b - 1, wd], [a + 1, b - 2, po.br ? P.fire3 : P.fire2], [a + 1, b - 3, P.fire4], [a, b - 2, P.fire1], [a + 2, b - 3, po.br ? P.fire1 : P.fire3]]); }
      if (T === 'lute') arm([[a + 1, b - 1, P.woodL], [a + 2, b - 1, P.woodL], [a + 3, b - 2, P.woodL], [a + 4, b - 3, P.woodL], [a + 5, b - 4, P.wood], [a, b, '#8b5e3c'], [a + 1, b, '#a3794b'], [a, b + 1, '#8b5e3c'], [a + 1, b + 1, '#6b4630'], [a - 1, b, '#6b4630'], [a, b + 2, '#6b4630'], [a + 1, b - 2, '#fff3b0']]);
      if (T === 'staff') { for (let i = -6; i < 6; i++) arm([[a + 1, b + i, i % 3 ? '#6b4630' : '#8b5e3c']]); arm([[a, b - 8, P.ink], [a + 2, b - 8, P.ink], [a + 1, b - 9, P.ink], [a + 1, b - 7, '#3fd0e0'], [a + 1, b - 8, po.br ? '#ffffff' : '#9ff3ff'], [a, b - 7, P.ink], [a + 2, b - 7, P.ink]]); }
      if (T === 'wand') arm([[a + 1, b, '#f4f0d8'], [a + 2, b - 1, '#f4f0d8'], [a + 3, b - 2, '#ffd84a'], [a + 4, b - 2, po.br ? '#ffffff' : '#fff3b0'], [a + 3, b - 3, '#fff3b0'], [a + 2, b - 2, '#fff3b0']]);
      if (T === 'spear') { for (let i = -5; i < 8; i++) arm([[a + 1, b - i, i % 3 ? '#8b5e3c' : '#6b4630']]); arm([[a + 1, b - 8, W], [a + 1, b - 9, '#e8eef0'], [a, b - 8, Wd], [a + 2, b - 8, Wd], [a + 1, b - 10, W]]); }
      if (T === 'machete') { if (A === 'up') arm([[a, b - 1, '#3a2216'], [a, b - 2, '#3a2216'], [a - 1, b - 3, W], [a, b - 3, W], [a - 1, b - 4, W], [a, b - 4, '#e8eef0'], [a - 1, b - 5, W], [a, b - 5, '#e8eef0'], [a, b - 6, W]]);
        else arm([[a + 1, b, '#3a2216'], [a + 1, b + 1, '#3a2216'], [a + 1, b + 2, W], [a + 2, b + 2, '#e8eef0'], [a + 1, b + 3, W], [a + 2, b + 3, '#e8eef0'], [a + 1, b + 4, W], [a + 2, b + 4, Wd], [a + 2, b + 5, Wd]]); }
      if (T === 'knife') arm([[a + 1, b, '#5a3420'], [a + 1, b + 1, W], [a + 2, b + 1, '#e8eef0'], [a + 1, b + 2, Wd]]);
      if (T === 'hoe') arm([[a + 1, b + 1, wd], [a + 2, b + 2, wd], [a + 3, b + 3, Wd], [a + 4, b + 3, Wd]]);
    }
    if (A === 'carry' && T) {
      const y0 = tT - 4, x0 = left - 3, w = tw + 6;
      if (T === 'plank') { px(x, P.ink, x0, y0 - 1, w, 3); px(x, P.woodL, x0 + 1, y0, w - 2, 1); }
      if (T === 'log') { px(x, P.ink, x0, y0 - 2, w, 4); px(x, P.wood, x0 + 1, y0 - 1, w - 2, 2); px(x, P.woodL, x0 + 1, y0 - 1, 1, 2); px(x, P.woodL, x0 + w - 2, y0 - 1, 1, 2); }
      if (T === 'box') { px(x, P.ink, OX, y0 - 3, 8, 5); px(x, P.sand, OX + 1, y0 - 2, 6, 3); px(x, P.dirt3, OX + 1, y0 - 1, 6, 1); }
    }
    return { c, f: flipped(c), ax: 15, ay: FY };
  }
  return {
    sp,
    frame(po) { const key = [po.legs, po.arm, po.tool, po.eyes, po.br].join('|'); if (!cache.has(key)) cache.set(key, build(po)); return cache.get(key); },
    headY: sp.big ? 20 : 15,
  };
}
// desenha personagem: X,Y = pés; face: 1 direita, -1 esquerda
function shadeHex(h, k) { const [r, g, b] = hex(h); const f = v => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k))); return '#' + [r, g, b].map(v => f(v).toString(16).padStart(2, '0')).join(''); }
function drawCharAt(x, ch, X, Y, po, face = 1, alpha = 1) {
  const fr = ch.frame(po);
  const sw = ch.sp.big ? 10 : 8, sx = Math.round(X - sw / 2), sy = Math.round(Y) - 1;
  x.fillStyle = 'rgba(5,10,8,.42)'; x.fillRect(sx + 1, sy, sw - 2, 2); x.fillStyle = 'rgba(5,10,8,.22)'; x.fillRect(sx, sy, sw, 2); x.fillRect(sx + 1, sy + 2, sw - 2, 1);
  if (alpha < 1) x.globalAlpha = alpha;
  x.drawImage(face < 0 ? fr.f : fr.c, Math.round(X) - (face < 0 ? fr.c.width - fr.ax : fr.ax), Math.round(Y) - fr.ay - (po.bob ? 1 : 0));
  x.globalAlpha = 1;
}

// =====================================================================
// CONSTRUÇÕES
// =====================================================================
function houseSprite(roof, roofD, chim) {
  const w = 26, h = 26, [c, x] = canvas(w + 4, h + 3);
  fancyBuilding(x, { w, wallTop: 12, wallH: h - 12, roof, roofD, chim, timber: true, door: 'wood', windows: [5], doorX: w - 10 });
  return c;
}
// prédio detalhado (estilo pixel art com contorno): fundação de pedras, enxaimel, janelas com cruz e floreira,
// porta de tábuas em arco com degrau e lampião, telhado de telhas em escama com cumeeira, mansarda e chaminé de tijolos
function fancyBuilding(x, o) {
  const { w, wallTop, wallH } = o, bot = wallTop + wallH, roofTop = o.roofTop || 0, O = '#1a120c';
  const WALL = o.wall || P.wall, WALLD = o.wallD || P.wallD, WL = shadeHex(WALL, 1.1), WD2 = shadeHex(WALLD, .82);
  const BEAM = '#5a3420', BEAML = '#7a4a2a', ST = ['#4d5566', '#6e7789', '#939cae', '#c3cad6'];
  // sombra no chão
  x.fillStyle = 'rgba(10,30,20,.38)'; for (let dy = 0; dy < 3; dy++) x.fillRect(3 + dy, bot - 1 + dy, w + 1 - dy, 1); x.fillStyle = 'rgba(10,30,20,.22)'; x.fillRect(w, wallTop + 3, 3, wallH - 2);
  // paredes com reboco (claro à esquerda, escuro na quina direita) e sombra do beiral
  px(x, O, 2, wallTop - 1, w - 2, wallH + 1);
  for (let Y = wallTop; Y < bot - 1; Y++) for (let X = 3; X < w - 1; X++) { let col = X > w - 5 ? WALLD : X < 5 ? WL : WALL; if (Y < wallTop + 2) col = WD2; else if (h2(X, Y) > .86) col = WALLD; px(x, col, X, Y); }
  if (o.stone) for (let Y = wallTop + 3; Y < bot - 3; Y += 3) { px(x, WALLD, 3, Y, w - 4, 1); for (let X = 3 + ((Y / 3) % 2) * 3; X < w - 1; X += 6) px(x, WALLD, X, Y - 2, 1, 2); }
  if (o.timber) { const mid = Math.floor(w / 2), yM = wallTop + Math.floor(wallH / 2) - 1;
    for (const X of [3, mid - 1, w - 4]) { px(x, BEAM, X, wallTop + 1, 2, wallH - 4); px(x, BEAML, X, wallTop + 1, 1, wallH - 4); }
    px(x, BEAM, 3, wallTop + 1, w - 5, 1); px(x, BEAM, 3, yM, w - 5, 1); px(x, BEAML, 3, yM, w - 5, 0);
    for (const [X0, dir] of [[5, 1], [w - 6, -1]]) for (let k = 0; k < Math.min(5, yM - wallTop - 1); k++) px(x, BEAM, X0 + k * dir, yM - 1 - k, 1, 1); }
  if (o.columns) for (let X = 4; X < w - 4; X += 7) { px(x, O, X - 1, wallTop + 1, 4, wallH - 3); px(x, '#f4f2ea', X, wallTop + 2, 2, wallH - 5); px(x, ST[2], X + 1, wallTop + 2, 1, wallH - 5); px(x, '#f4f2ea', X - 1, wallTop + 1, 4, 1); px(x, ST[3], X - 1, bot - 4, 4, 1); }
  // hera subindo na quina esquerda
  if (o.ivy !== false && (w + wallH) % 3 !== 1) for (let k = 0; k < wallH - 2; k++) if (h2(w, k) > .3) px(x, k % 3 ? '#3f8f45' : '#84c65a', 3 + (h2(k, w) > .6 ? 1 : 0), bot - 3 - k, 1, 1);
  // fundação de pedras
  px(x, O, 2, bot - 3, w - 2, 3);
  for (let X = 3, i = 0; X < w - 1; i++) { const sw = 3 + Math.floor(h2(i, w) * 3), ww = Math.min(sw, w - 1 - X); px(x, ST[1 + (i % 2)], X, bot - 2, ww, 2); px(x, ST[3], X, bot - 2, ww - 1, 1); px(x, ST[0], X + ww - 1, bot - 2, 1, 2); X += sw; }
  // janelas
  const wy = wallTop + 3, wxs = o.windows || [5, w - 10], SH = shadeHex(o.roof, .85), SHD = shadeHex(o.roof, .6);
  for (const wx of wxs) {
    px(x, SHD, wx - 3, wy - 1, 2, 7); px(x, SH, wx - 3, wy - 1, 1, 7); px(x, SHD, wx + 6, wy - 1, 2, 7); px(x, SH, wx + 6, wy - 1, 1, 7);      // venezianas
    for (const sx2 of [wx - 3, wx + 6]) for (let k = 1; k < 7; k += 2) px(x, O, sx2, wy - 1 + k, 2, 0);
    px(x, O, wx - 1, wy - 1, 7, 7); px(x, '#f2a33a', wx, wy, 5, 5); px(x, '#ffd84a', wx, wy, 5, 3); px(x, '#fff3b0', wx, wy, 2, 1); px(x, '#fff3b0', wx, wy, 1, 2);
    px(x, BEAM, wx + 2, wy, 1, 5); px(x, BEAM, wx, wy + 2, 5, 1);
    px(x, O, wx - 2, wy + 5, 9, 3); px(x, BEAML, wx - 1, wy + 6, 7, 1); px(x, ST[3], wx - 2, wy + 5, 9, 1);                                     // floreira
    for (let k = 0; k < 7; k++) px(x, k % 2 ? '#47994a' : ['#f6b6d8', '#e04a5a', '#fff3b0', '#9ff3ff'][(k + wx) % 4], wx - 1 + k, wy + 4, 1, 1);
  }
  // porta de tábuas em arco, moldura de pedra, degrau e lampião
  const dw = o.doorW || 6, dx = o.doorX ?? (Math.floor(w / 2) - Math.floor(dw / 2) + 1), dh = Math.min(10, wallH - 1), dt = bot - dh;
  px(x, O, dx - 2, dt - 1, dw + 4, dh); px(x, ST[2], dx - 1, dt, dw + 2, dh - 1); px(x, ST[3], dx - 1, dt, 1, dh - 1); px(x, O, dx, dt - 2, dw, 1); px(x, ST[2], dx, dt - 1, dw, 1);
  if (o.door === 'open') { px(x, '#2a1a0c', dx, dt + 1, dw, dh - 2); px(x, '#f2a33a', dx + 1, bot - 5, dw - 2, 3); px(x, '#ffd84a', dx + 1, bot - 4, dw - 2, 1); }
  else { for (let X = dx; X < dx + dw; X++) px(x, (X - dx) % 2 ? '#6a3c22' : '#8a5530', X, dt + 1, 1, dh - 2); px(x, '#2b3138', dx, dt + 3, dw, 1); px(x, '#2b3138', dx, bot - 4, dw, 1); px(x, '#ffd84a', dx + dw - 2, bot - 6, 1, 1); }
  px(x, O, dx - 2, bot - 1, dw + 4, 2); px(x, ST[2], dx - 1, bot - 1, dw + 2, 1); px(x, ST[3], dx - 1, bot - 1, dw + 2, 0);
  px(x, O, dx + dw + 2, dt, 1, 2); px(x, O, dx + dw + 2, dt + 2, 3, 4); px(x, '#ffd84a', dx + dw + 3, dt + 3, 1, 2);
  // telhado de telhas em escama
  const rH = wallTop - roofTop + 1, RL = shadeHex(o.roof, 1.22), RD = o.roofD;
  const inset = y => o.stripes ? 0 : Math.round(Math.max(0, 1 - y / (rH * .7)) * 3);
  for (let y = 0; y <= rH; y++) { const i = inset(y); px(x, O, i, roofTop + y, w + 2 - i * 2, 1); }
  for (let y = 1; y < rH; y++) { const yy = roofTop + y, i = inset(y);
    for (let X = 1 + i; X <= w - i; X++) {
      let col;
      if (o.stripes) col = Math.floor((X - 1) / 3) % 2 ? o.roof : RD;
      else { const row = Math.floor((y - 1) / 3), ry = (y - 1) % 3, tx = (X - 1 + (row % 2) * 2) % 4; col = ry === 2 ? RD : (tx === 0 ? RD : ry === 0 && tx === 1 ? RL : o.roof); }
      if (X > w - 3 && col === o.roof) col = shadeHex(o.roof, .86);
      px(x, col, X, yy);
    } }
  { const i = inset(1); px(x, RL, 1 + i, roofTop + 1, w - i * 2, 1); px(x, shadeHex(o.roof, 1.5), 2 + i, roofTop + 1, Math.max(1, w - 8 - i * 2), 1); } px(x, shadeHex(RD, .8), 1, wallTop, w, 1);
  if (o.stripes) for (let X = 1; X <= w; X += 3) px(x, O, X, wallTop + 1, 2, 1);   // franja do toldo
  // pontas do beiral (madeira)
  px(x, BEAML, 0, wallTop - 1, 2, 2); px(x, BEAML, w, wallTop - 1, 2, 2);
  // mansarda (janelinha no telhado)
  if (!o.stripes && rH >= 11 && w >= 24) { const mx = 4, my = roofTop + 3; px(x, O, mx, my, 7, 6); px(x, '#ffd84a', mx + 1, my + 2, 5, 3); px(x, '#fff3b0', mx + 1, my + 2, 2, 1); px(x, BEAM, mx + 3, my + 2, 1, 3);
    px(x, O, mx - 1, my - 1, 9, 2); px(x, RL, mx, my - 1, 7, 1); }
  // chaminé de tijolos
  if (o.chim) { const cx = w - 9, cy = Math.max(0, roofTop - 1); px(x, O, cx, cy, 7, 8); for (let Y = cy + 2; Y < cy + 8; Y++) for (let X = cx + 1; X < cx + 6; X++) px(x, (Y % 2 === 0) || ((X + (Y % 4 < 2 ? 0 : 2)) % 4 === 0) ? '#6a2a1a' : '#a8482c', X, Y);
    px(x, ST[2], cx, cy, 7, 2); px(x, ST[3], cx, cy, 7, 1); px(x, '#1a120c', cx + 2, cy, 3, 1); }
}
const ROOFS = [['#a83a32', '#5a2418'], ['#3c5f9a', '#1d3550'], ['#6e4a8a', '#3a2650'], ['#8b5e3c', '#4a2f22'], ['#3f7ab0', '#2c4f7a'], ['#d0622a', '#8a3a1c']];
const HOUSE_SPR = ROOFS.map((r, i) => houseSprite(r[0], r[1], i % 2 === 0));
// estrutura de madeira (fase de construção)
function frameSprite(w = 26, h = 26) {
  const [c, x] = canvas(w + 4, h + 3);
  for (const X of [3, 12, w - 3]) { px(x, P.ink, X - 1, 10, 3, h - 10); px(x, P.woodL, X, 11, 1, h - 12); }
  px(x, P.ink, 2, 10, w - 2, 3); px(x, P.woodL, 3, 11, w - 4, 1);
  px(x, P.ink, 2, h - 2, w - 2, 2); px(x, P.wood, 3, h - 2, w - 4, 1);
  for (let i = 0; i < 10; i++) px(x, P.woodL, 3 + i, 10 - i, 1, 1), px(x, P.woodL, w - 2 - i, 10 - i, 1, 1);
  return c;
}
const FRAME_SPR = frameSprite();
function forgeSprite() {
  const [c, x] = canvas(36, 30);
  x.fillStyle = 'rgba(5,15,12,.55)'; x.fillRect(4, 26, 32, 4);
  px(x, P.ink, 1, 11, 34, 17); px(x, P.st2, 2, 12, 32, 15); for (let y = 12; y < 27; y += 3) for (let X = 2 + (y % 2) * 3; X < 34; X += 6) px(x, P.st1, X, y, 5, 1);
  px(x, P.ink, 9, 16, 14, 11); px(x, '#1a1010', 10, 17, 12, 10);           // fornalha aberta
  px(x, P.ink, 0, 0, 36, 12); for (let y = 1; y < 11; y++) px(x, y % 3 === 0 ? '#2b3138' : '#4a535c', 1, y, 34, 1);
  px(x, P.ink, 26, 0, 7, 8); px(x, P.st3, 27, 0, 5, 7);
  return c;
}
const FORGE_SPR = forgeSprite();
function tavernSprite(open) {
  const [c, x] = canvas(48, 38);
  fancyBuilding(x, { w: 46, wallTop: 15, wallH: 21, roof: '#a83a32', roofD: '#5a2418', wall: '#8b5e3c', wallD: '#6b4630', timber: true, door: open ? 'open' : 'wood', doorW: 8, windows: [5, 14, 27, 36], chim: true });
  // placa com caneca pendurada
  px(x, P.ink, 30, 17, 1, 3); px(x, P.ink, 28, 19, 11, 8); px(x, P.woodL, 29, 20, 9, 6); px(x, P.fire4, 31, 21, 4, 4); px(x, P.fire3, 31, 23, 4, 2); px(x, P.ink, 35, 22, 1, 2);
  return c;
}
const TAVERN_SPR = [tavernSprite(false), tavernSprite(true)];
function tentSprite() {
  const [c, x] = canvas(34, 26);
  x.fillStyle = 'rgba(5,15,12,.55)'; x.fillRect(4, 22, 30, 4);
  for (let y = 0; y < 22; y++) { const w = Math.round(4 + y * 1.3); px(x, P.ink, 17 - w - 1, y, w * 2 + 2, 1); px(x, y % 4 === 0 ? '#c4ccd0' : '#eef0ea', 17 - w, y, w * 2, 1); }
  px(x, P.ink, 13, 12, 8, 10); px(x, '#3a3028', 14, 13, 6, 9);
  px(x, '#4e6c4a', 8, 9, 3, 3); px(x, '#9cbf62', 9, 8, 1, 5); px(x, '#9cbf62', 7, 10, 5, 1);  // folha (ervas)
  return c;
}
const TENT_SPR = tentSprite();
function kitchenSprite() {
  const [c, x] = canvas(40, 30);
  x.fillStyle = 'rgba(5,15,12,.55)'; x.fillRect(4, 26, 34, 4);
  for (const X of [3, 35]) { px(x, P.ink, X - 1, 9, 3, 18); px(x, P.wood, X, 10, 1, 16); }
  px(x, P.ink, 0, 0, 40, 11); for (let y = 1; y < 10; y++) px(x, y % 3 === 0 ? '#5a3a26' : '#8b5e3c', 1, y, 38, 1);
  px(x, P.ink, 24, 18, 13, 7); px(x, P.woodL, 25, 19, 11, 3); px(x, '#d0622a', 26, 19, 2, 1); px(x, '#9cbf62', 29, 19, 2, 1); px(x, P.fire3, 32, 19, 2, 1); px(x, P.wood, 26, 22, 1, 3); px(x, P.wood, 34, 22, 1, 3);
  return c;
}
const KITCHEN_SPR = kitchenSprite();
function shedSprite() {
  const [c, x] = canvas(30, 24);
  x.fillStyle = 'rgba(5,15,12,.55)'; x.fillRect(4, 20, 26, 4);
  px(x, P.ink, 1, 8, 22, 14); px(x, '#7a4f2e', 2, 9, 20, 12); for (let X = 2; X < 22; X += 3) px(x, '#5a3a26', X, 9, 1, 12);
  px(x, P.ink, 0, 0, 24, 9); for (let y = 1; y < 8; y++) px(x, y % 2 ? '#4a535c' : '#6e7a84', 1, y, 22, 1);
  for (const [X, Y] of [[22, 14], [25, 17], [22, 18]]) { px(x, P.ink, X, Y, 6, 6); px(x, P.dirt3, X + 1, Y + 1, 4, 4); px(x, P.woodD, X + 1, Y + 2, 4, 1); }
  return c;
}
const SHED_SPR = shedSprite();

// =====================================================================
// EFEITOS E LUZ
// =====================================================================
function burst(x, t, t0, ox, oy, n, cols, speed, life, grav, seed, size = 1) {
  const age = t - t0; if (age < 0 || age > life) return; const r = rng(Math.floor(seed));
  for (let i = 0; i < n; i++) { const a = r() * 6.283, sp = speed * (.3 + r() * .7), lf = life * (.5 + r() * .5), col = cols[Math.floor(r() * cols.length)]; if (age > lf) continue;
    const k = 1 - Math.exp(-age * 3), X = ox + Math.cos(a) * sp * k, Y = oy + Math.sin(a) * sp * k * .8 + grav * age * age;
    px(x, col, Math.round(X), Math.round(Y), size, size); }
}
function drawFire(x, X, Y, t, power = 1) {
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; px(x, i % 2 ? P.st2 : P.st3, Math.round(X + Math.cos(a) * 6) - 1, Math.round(Y + Math.sin(a) * 4) - 1, 2, 2); }
  px(x, P.woodD, X - 5, Y - 1, 10, 2); px(x, P.wood, X - 3, Y - 2, 6, 1);
  const f = Math.floor(t * 12);
  for (let cx = -3; cx <= 3; cx++) {
    const hgt = Math.round((7 - Math.abs(cx) * 1.6) * power + h2(cx, f) * 3 * power);
    for (let k = 0; k < hgt; k++) { const rel = k / Math.max(1, hgt); px(x, rel < .3 ? P.fire4 : rel < .55 ? P.fire3 : rel < .8 ? P.fire2 : P.fire1, X + cx, Y - 2 - k); }
  }
  for (let i = 0; i < 6 + 10 * (power - 1); i++) { const ph = (t + i * .37) % 1.4; px(x, ph < .7 ? P.fire3 : P.fire1, X + Math.round(Math.sin(i * 7.1 + t * 2) * (3 + ph * 4)), Math.round(Y - 8 - ph * 22 * power)); }
}
function smallFire(x, X, Y, t) { const f = Math.floor(t * 12); for (let cx = -2; cx <= 2; cx++) { const hg = Math.round(4 - Math.abs(cx) + h2(cx, f) * 2); for (let k = 0; k < hg; k++) px(x, k < 1 ? P.fire4 : k < 2 ? P.fire3 : P.fire1, X + cx, Y - k); } }
function smoke(x, X, Y, t, n = 5, col = '#98a4ac') { for (let i = 0; i < n; i++) { const ph = (t * .5 + i / n) % 1; x.globalAlpha = .6 * (1 - ph); px(x, col, Math.round(X + Math.sin(ph * 6 + i) * 2 + ph * 6), Math.round(Y - ph * 26), 2 + Math.round(ph * 2), 2 + Math.round(ph * 2)); } x.globalAlpha = 1; }
function lightHole(x, X, Y, r) { for (let i = 0; i < 4; i++) { x.globalAlpha = .28; disc(x, X, Y, Math.max(1, Math.round(r * (1 - i * .22))), '#000'); } x.globalAlpha = 1; }
function glow(x, X, Y, r, col, a = .18) { x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { x.globalAlpha = a; disc(x, X, Y, Math.max(1, Math.round(r * (1 - i * .3))), col); } x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
function orb(x, X, Y, col = P.fire3) { glow(x, X, Y, 9, col, .22); disc(x, X, Y, 2, P.fire4); px(x, '#ffffff', Math.round(X) - 1, Math.round(Y) - 1, 2, 2); }
// ícones 7x7 (profissão, habilidade, história)
const ICONS = {
  axe: ["..kk...", ".kWWk..", "kWWwk..", ".kkwk..", "...wk..", "...wk..", "...kk.."], hammer: ["kkkkk..", "kWWWk..", "kkwkk..", "..wk...", "..wk...", "..wk...", "..kk..."],
  pot: [".kkkkk.", "kk...kk", "kRRRRRk", "kRRRRRk", ".kRRRk.", "..kkk..", "......."], herb: ["...k...", "..kGk..", ".kGgGk.", "kGgGgGk", ".kGgGk.", "...w...", "...w..."],
  star: ["...Y...", "...Y...", "YYYYYYY", ".YYYYY.", "..YYY..", ".YY.YY.", "Y.....Y"], scroll: ["kkkkkk.", "kSSSSk.", ".kSssk.", ".kSssk.", ".kSssk.", "kSSSSk.", "kkkkkk."],
  mug: ["kkkk...", "kYYkk..", "kYYk.k.", "kYYkk..", "kkkk...", ".......", "......."], sword: ["......W", ".....W.", "....W..", "Y..W...", ".YW....", ".kY....", "k..Y..."],
};
function drawIcon(x, name, X, Y) { const m = { k: P.ink, W: '#c4ccd0', w: P.wood, R: P.fire1, G: '#4e6c4a', g: '#9cbf62', Y: P.fire3, S: '#e4d0a0', s: '#c9a46a' };
  px(x, P.ink, X - 1, Y - 1, 9, 9); px(x, '#1c2a22', X, Y, 7, 7); ICONS[name].forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.' && m[ch]) px(x, m[ch], X + i, Y + j); })); }

// =====================================================================
// CÂMERA
// =====================================================================
function hermite(keys, t, idx) {
  const n = keys.length; if (t <= keys[0][0]) return keys[0][idx]; if (t >= keys[n - 1][0]) return keys[n - 1][idx];
  let i = 0; while (keys[i + 1][0] < t) i++;
  const k0 = keys[i], k1 = keys[i + 1], dt = k1[0] - k0[0], u = (t - k0[0]) / dt;
  const tan = j => (j <= 0 || j >= n - 1) ? 0 : (keys[j + 1][idx] - keys[j - 1][idx]) / (keys[j + 1][0] - keys[j - 1][0]);
  return (2 * u ** 3 - 3 * u * u + 1) * k0[idx] + (u ** 3 - 2 * u * u + u) * dt * tan(i) + (-2 * u ** 3 + 3 * u * u) * k1[idx] + (u ** 3 - u * u) * dt * tan(i + 1);
}
// posição sobre um caminho temporizado: [[t,x,y],...] -> {x,y,moving,face}
function track(keys, t) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], moving: false, face: 0 };
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1];
    if (t < b[0]) { const k = (t - a[0]) / (b[0] - a[0]); const mv = Math.hypot(b[1] - a[1], b[2] - a[2]) > .5; return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), moving: mv, face: mv ? Math.sign(b[1] - a[1]) : 0, speed: Math.hypot(b[1] - a[1], b[2] - a[2]) / (b[0] - a[0]) }; } }
  const l = keys[keys.length - 1]; return { x: l[1], y: l[2], moving: false, face: 0 };
}

// =====================================================================
// PINTOR DE FORMAS (pixel art com contorno): cada forma tem "dentro" e "cor";
// primeiro desenha o contorno de todas, depois o preenchimento sombreado (luz vindo de cima-esquerda)
// =====================================================================
function shade4(pal, l) { return l > .62 ? pal[3] : l > .18 ? pal[2] : l > -.38 ? pal[1] : pal[0]; }
function painter(x) {
  const ops = [], dth = (X, Y) => (((X + Y) & 1) ? .07 : -.07);
  const api = {
    ell(cx, cy, rx, ry, pal, o = P.ink, bias = 0) { ops.push({ o, bb: [cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1], inside: (X, Y) => ((X + .5 - cx) / rx) ** 2 + ((Y + .5 - cy) / ry) ** 2 <= 1,
      col: (X, Y) => { const u = (X + .5 - cx) / rx, v = (Y + .5 - cy) / ry; return shade4(pal, -u * .5 - v * .85 + bias + dth(X, Y)); } }); return api; },
    tube(pts, r, pal, o = P.ink, bias = 0) {   // pts: [[x,y,(raio)],...]
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { const rr = p[2] ?? r; x0 = Math.min(x0, p[0] - rr); y0 = Math.min(y0, p[1] - rr); x1 = Math.max(x1, p[0] + rr); y1 = Math.max(y1, p[1] + rr); }
      const near = (X, Y) => { let best = 1e9, bx = 0, by = 0, br = r; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, k = clamp(((X - a[0]) * dx + (Y - a[1]) * dy) / L), qx = a[0] + dx * k, qy = a[1] + dy * k, d = Math.hypot(X - qx, Y - qy), ra = (a[2] ?? r) + ((b[2] ?? r) - (a[2] ?? r)) * k; if (d - ra < best) { best = d - ra; bx = X - qx; by = Y - qy; br = ra; } } return [best, bx, by, br]; };
      ops.push({ o, bb: [x0 - 1, y0 - 1, x1 + 1, y1 + 1], inside: (X, Y) => near(X + .5, Y + .5)[0] <= 0, col: (X, Y) => { const [, bx, by, br] = near(X + .5, Y + .5); return shade4(pal, (-bx * .55 - by * .85) / Math.max(1, br) + bias + dth(X, Y)); } }); return api; },
    poly(pts, pal, o = P.ink, bias = 0) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = (x1 - x0) / 2 || 1, h = (y1 - y0) / 2 || 1;
      const inside = (X, Y) => { X += .5; Y += .5; let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > Y) !== (b[1] > Y) && X < (b[0] - a[0]) * (Y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
      ops.push({ o, bb: [x0 - 1, y0 - 1, x1 + 1, y1 + 1], inside, col: (X, Y) => shade4(pal, -(X - cx) / w * .55 - (Y - cy) / h * .6 + bias + dth(X, Y)) }); return api; },
    done() {
      const W = x.canvas.width, H = x.canvas.height;
      for (const op of ops) { if (!op.o) continue; const [a, b, c, d] = op.bb.map(Math.floor); for (let Y = Math.max(0, b - 1); Y <= Math.min(H - 1, d + 1); Y++) for (let X = Math.max(0, a - 1); X <= Math.min(W - 1, c + 1); X++)
        if (!op.inside(X, Y) && (op.inside(X + 1, Y) || op.inside(X - 1, Y) || op.inside(X, Y + 1) || op.inside(X, Y - 1))) px(x, op.o, X, Y); }
      for (const op of ops) { const [a, b, c, d] = op.bb.map(Math.floor); for (let Y = Math.max(0, b); Y <= Math.min(H - 1, d); Y++) for (let X = Math.max(0, a); X <= Math.min(W - 1, c); X++) if (op.inside(X, Y)) px(x, op.col(X, Y), X, Y); }
      ops.length = 0; return api;
    },
  };
  return api;
}
function softShadow(x, cx, cy, rx, ry, a = .32) { x.fillStyle = `rgba(10,30,20,${a})`; for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(1 - (dy / (ry + .5)) ** 2)); x.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1); } }
