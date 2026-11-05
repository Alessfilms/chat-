// =====================================================================
// TERRAS DO LESTE: Montanhas de Ferro, Terras do Vulcão e Cânions Vermelhos
// + Mão do Gigante (mão de pedra enfiada no chão), Vulcão de Eryon e Arco do Cânion
// (carregado depois de explore.js e antes de game.js; nada do mapa antigo muda de lugar)
// =====================================================================
const BAS = ['#1e1618', '#2e2224', '#43302f', '#5a403c'], BAS_O = '#0c0808';
const MTN = ['#3a3640', '#55505c', '#76707e', '#9a94a2'], SNOW = ['#9fb4c8', '#c8d8e8', '#eef4fa', '#ffffff'];
const RED = ['#7a2e18', '#a0441f', '#c4602e', '#e08a4c'], RED_O = '#2a0e06';
// ---------- monumentos novos
const EAST_LM = [
  { id: 'mao', name: 'Mão do Gigante', x: 1604, y: 672, clear: 54, r: 64 },
  { id: 'vulcao', name: 'Vulcão de Eryon', x: 1900, y: 1300, clear: 96, r: 110 },
  { id: 'arco', name: 'Arco do Cânion', x: 1880, y: 2030, clear: 64, r: 74 },
];
for (const l of EAST_LM) { LANDMARKS.push(l); LM[l.id] = l; }
Object.assign(LM_LIGHT, { mao: 20, vulcao: 70, arco: 0 });
Object.assign(LM_FX, {
  mao: { aura: '#3fd0e0', cols: ['#9ff3ff', '#3fd0e0', '#c3cad6'], kind: 'rune', lore: 'Uma mão de pedra do tamanho de uma casa… onde estará o resto do gigante?' },
  vulcao: { aura: '#ff5a1a', cols: ['#ffd84a', '#ff7a1a', '#c0301a'], kind: 'ember', lore: 'O coração de fogo de Eryon. Dizem que a Fera de Fogo nasceu aqui.' },
  arco: { aura: '#f0a060', cols: ['#fff3b0', '#f0a060', '#c4602e'], kind: 'gold', lore: 'O vento levou mil anos para esculpir esta ponte de pedra.' },
});
// ---------- sprites
function handSprite() {   // mão aberta gigante saindo da terra, com musgo, cipós e uma runa no meio da palma
  const W = 108, H = 128, [c, x] = canvas(W, H), pt = painter(x), O = STONE_O;
  softShadow(x, 54, 118, 48, 8, .3); pt.ell(54, 116, 46, 10, EARTH, '#3a2216', -.1).done();
  pt.tube([[54, 113, 13], [52, 92, 13]], 13, STONE, O).done();
  pt.tube([[36, 80, 5.5], [24, 68, 5], [17, 55, 4.2]], 5, STONE, O);                       // polegar
  pt.ell(52, 74, 21, 19, STONE, O);                                                       // palma
  pt.tube([[40, 60, 5.4], [35, 38, 5], [32, 20, 4.4]], 5, STONE, O);                     // indicador
  pt.tube([[50, 57, 5.8], [49, 30, 5.4], [49, 9, 4.6]], 5, STONE, O);                    // médio
  pt.tube([[60, 58, 5.3], [64, 34, 5], [67, 16, 4.2]], 5, STONE, O);                     // anelar
  pt.tube([[68, 63, 4.4], [76, 46, 4], [81, 34, 3.4]], 4, STONE, O);                     // mindinho
  pt.done();
  // dobras dos dedos, unhas e linhas da palma
  for (const [X, Y] of [[36, 44], [34, 30], [49, 40], [49, 24], [63, 42], [65, 28], [74, 50], [78, 42], [27, 70], [21, 61]]) { px(x, O, X - 3, Y, 6, 1); px(x, STONE[3], X - 2, Y - 1, 4, 1); }
  for (const [X, Y] of [[32, 18], [49, 7], [67, 14], [81, 32], [16, 53]]) { px(x, STONE[3], X - 1, Y, 3, 2); px(x, '#e8ecf2', X - 1, Y, 1, 1); }
  for (let k = 0; k < 14; k++) { px(x, O, 38 + k, 68 + Math.round(Math.sin(k / 4) * 2), 1, 1); px(x, O, 42 + k, 80 - Math.round(k / 3), 1, 1); }
  // runa azul na palma
  for (const [a, b] of [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4], [3, 2], [4, 2], [-1, 2], [-2, 2]]) px(x, '#3fd0e0', 52 + a, 72 + b, 1, 1); px(x, '#e8ffff', 52, 74, 1, 1);
  // rachaduras, musgo e cipós
  for (const [x0, y0, n] of [[58, 96, 8], [46, 104, 6], [62, 70, 5]]) for (let k = 0; k < n; k++) px(x, O, x0 + (k % 3) - 1, y0 + k, 1, 1);
  for (const [X, Y, w] of [[50, 9, 3], [32, 19, 3], [66, 15, 3], [44, 56, 6], [60, 57, 5], [54, 92, 8], [30, 70, 4]]) for (let k = -w; k <= w; k++) { px(x, MOSS[1], X + k, Y, 1, 2); if (h2(X + k, Y) > .6) px(x, MOSS[3], X + k, Y - 1, 1, 1); }
  for (const [X, Y, L] of [[38, 46, 18], [64, 44, 22], [78, 46, 14], [46, 84, 20]]) for (let k = 0; k < L; k++) { const vx = X + Math.round(Math.sin(k * .5) * 1.2); px(x, MOSS[0], vx, Y + k, 1, 1); if (k % 3 === 1) px(x, MOSS[2], vx + 1, Y + k, 1, 1); }
  x.save(); x.beginPath(); x.rect(0, 115, W, 20); x.clip(); pt.ell(54, 116, 46, 10, EARTH, '#3a2216', -.1).done(); x.restore();   // terra na frente do pulso
  for (let i = 0; i < 30; i++) { const X = 12 + Math.floor(h2(i, 72) * 84), Y = 117 + Math.floor(h2(72, i) * 7); if (((X - 54) / 44) ** 2 + ((Y - 116) / 9) ** 2 < .85) px(x, h2(i, 5) > .5 ? EARTH[3] : EARTH[0], X, Y, 2, 1); }
  grassRim(x, 54, 116, 44, 9, 71);
  for (const [X, Y] of [[14, 112], [92, 114], [22, 120], [86, 120]]) { pt.ell(X, Y, 4, 3, STONE, O); } pt.done();
  return { c, ax: 54, ay: 118 };
}
function volcanoSprite(W, H, seed) {   // cone de basalto com cratera de lava e rios de lava descendo
  const [c, x] = canvas(W, H), pt = painter(x), cw = W * .16, top = H * .2, base = H - 8, cx = W / 2;
  softShadow(x, cx, base, W * .48, 9, .35);
  pt.poly([[4, base], [cx - cw, top], [cx + cw, top], [W - 4, base]], BAS, BAS_O, .05).done();
  x.globalAlpha = .45; x.fillStyle = '#0c0808'; x.beginPath(); x.moveTo(cx + cw * .3, top); x.lineTo(cx + cw, top); x.lineTo(W - 4, base); x.lineTo(cx + W * .1, base); x.fill(); x.globalAlpha = 1;
  for (let i = 0; i < W * 2; i++) { const X = Math.floor(h2(i, seed) * W), Y = Math.floor(top + h2(seed, i) * (base - top)), half = (Y - top) / (base - top) * (W / 2 - cw) + cw; if (Math.abs(X - cx) < half - 2) px(x, h2(i, seed + 3) > .5 ? BAS[3] : BAS[0], X, Y, 2, 1); }
  // cratera
  pt.ell(cx, top + 1, cw + 2, Math.max(3, H * .05), BAS, BAS_O).done();
  for (let Y = -3; Y <= 3; Y++) { const w = Math.round((cw - 3) * Math.sqrt(1 - (Y / 4) ** 2)); px(x, Y < 0 ? '#c0301a' : '#ff7a1a', Math.round(cx - w), Math.round(top + 2 + Y * .7), w * 2, 1); } px(x, '#ffd84a', Math.round(cx - cw * .5), Math.round(top + 2), Math.round(cw), 1);
  // rios de lava
  const flows = Math.max(2, Math.round(W / 60));
  for (let f = 0; f < flows; f++) { let X = cx + (h2(f, seed) - .5) * cw * 1.6, Y = top + 3; const dir = h2(seed, f) > .5 ? 1 : -1;
    while (Y < base - 6) { const k = (Y - top) / (base - top); X += dir * (.35 + k * .5) + Math.sin(Y * .25 + f) * .6; Y += 1; const w = k < .7 ? 2 : 3;
      px(x, '#8a1a0c', Math.round(X) - 1, Math.round(Y), w + 2, 1); px(x, '#ff7a1a', Math.round(X), Math.round(Y), w, 1); if ((Y + f) % 3 === 0) px(x, '#ffd84a', Math.round(X), Math.round(Y), 1, 1); } }
  for (let i = 0; i < 6; i++) { const X = 10 + h2(i, seed + 9) * (W - 20), Y = base - 2 + h2(seed + 9, i) * 4; pt.ell(X, Y, 3 + h2(i, 1) * 3, 2.5, BAS, BAS_O); } pt.done();
  return { c, ax: Math.round(cx), ay: base, top: Math.round(top), cw };
}
function archSprite() {   // arco de pedra vermelha esculpido pelo vento
  const W = 132, H = 98, [c, x] = canvas(W, H), pt = painter(x);
  softShadow(x, 66, 92, 62, 7, .3);
  pt.poly([[10, 92], [14, 50], [22, 30], [38, 26], [42, 60], [40, 92]], RED, RED_O).poly([[92, 92], [90, 58], [96, 28], [112, 30], [120, 52], [124, 92]], RED, RED_O).done();
  const band = []; for (let k = 0; k <= 1.001; k += .05) { const X = 22 + k * 88, Y = 26 - Math.sin(k * Math.PI) * 18; band.push([X, Y, 9 - Math.sin(k * Math.PI) * 3]); } pt.tube(band, 7, RED, RED_O).done();
  // camadas da rocha
  const d = x.getImageData(0, 0, W, H), D = d.data; for (let Y = 0; Y < H; Y++) { if ((Y >> 2) % 3 !== 0) continue; for (let X = 0; X < W; X++) { const i = (Y * W + X) * 4; if (D[i + 3] && D[i] > 90) { D[i] = Math.min(255, D[i] + 30); D[i + 1] = Math.min(255, D[i + 1] + 22); D[i + 2] = Math.min(255, D[i + 2] + 14); } } } x.putImageData(d, 0, 0);
  for (const [X, Y] of [[30, 90], [104, 90], [60, 94], [76, 93]]) { px(x, RED_O, X - 3, Y - 2, 7, 4); px(x, RED[2], X - 2, Y - 1, 5, 2); }
  return { c, ax: 66, ay: 92 };
}
function mesaSprite(W, H, seed) {   // morro de topo plano com faixas de rocha
  const [c, x] = canvas(W, H), O = RED_O, ST = ['#8e3a1c', '#b0502a', '#c86a36', '#dc8a4c', '#e8a868'];
  softShadow(x, W / 2, H - 3, W / 2 - 1, 5, .3);
  for (let Y = 4; Y < H - 2; Y++) { const k = (Y - 4) / (H - 6), inset = Math.round((1 - k) * 3 + h2(Y, seed) * 2), x0 = inset + 1, x1 = W - inset - 2; px(x, O, x0 - 1, Y, x1 - x0 + 3, 1);
    const band = ST[Math.floor((Y + seed) / 4) % 5]; px(x, band, x0, Y, x1 - x0 + 1, 1); px(x, shadeHex(band, .72), Math.round(x1 - (x1 - x0) * .3), Y, Math.round((x1 - x0) * .3) + 1, 1); if (h2(seed, Y) > .8) px(x, shadeHex(band, .6), x0 + Math.floor(h2(Y, 3) * (x1 - x0)), Y, 2, 1); }
  px(x, O, 3, 2, W - 6, 3); px(x, '#f0c08a', 4, 3, W - 8, 1); px(x, '#dca070', 4, 4, W - 8, 1); if (W > 40) for (let k = 0; k < 3; k++) { px(x, '#4a8a3a', 8 + k * 9 + (seed % 5), 1, 3, 2); }
  return { c, ax: Math.floor(W / 2), ay: H - 3 };
}
function mountainSprite(W, H, seed) {   // montanha com 1-3 picos, face sombreada e neve no topo
  const [c, x] = canvas(W, H), pt = painter(x), base = H - 3, n = 1 + Math.floor(h2(seed, 1) * 3);
  softShadow(x, W / 2, base, W / 2 - 2, 6, .32);
  const peaks = []; for (let k = 0; k < n; k++) { const px0 = W * (n === 1 ? .5 : .28 + k * (.44 / (n - 1))) + (h2(k, seed) - .5) * W * .1, hk = (k === Math.floor(n / 2) ? 1 : .7 + h2(seed, k) * .2) * (H - 6), wk = W * (n === 1 ? .48 : .34); peaks.push([px0, base - hk, wk]); }
  peaks.sort((a, b) => a[1] - b[1]).reverse();
  for (const [X, T, w] of peaks) { pt.poly([[Math.max(1, X - w), base], [X - w * .15, T + 4], [X, T], [X + w * .12, T + 3], [Math.min(W - 2, X + w), base]], MTN, '#16141a', .05).done();
    x.globalAlpha = .35; x.fillStyle = '#0c0a10'; x.beginPath(); x.moveTo(X, T); x.lineTo(Math.min(W - 2, X + w), base); x.lineTo(X + w * .1, base); x.fill(); x.globalAlpha = 1;
    // neve no topo com borda recortada
    const sh = (base - T) * .3; for (let Y = 0; Y < sh; Y++) { const half = (Y / (base - T)) * w * 1.02, jag = Y > sh - 4 ? Math.round(h2(Y, X) * 3) : 0; const l = Math.round(X - half + jag), r = Math.round(X + half - jag); if (r > l) { px(x, SNOW[2], l, Math.round(T + Y), r - l, 1); px(x, SNOW[0], Math.round(X + half * .2), Math.round(T + Y), Math.max(0, r - Math.round(X + half * .2)), 1); } px(x, SNOW[3], Math.round(X - half * .6), Math.round(T + Y), Math.max(1, Math.round(half * .3)), 1); }
    // arestas e pedras
    for (let k = 0; k < 4; k++) { let rx = X + (h2(k, seed) - .5) * w * .6, ry = T + sh + 4; for (let s = 0; s < (base - ry) * .6; s++) { rx += (h2(s, k + seed) - .5) * 1.4; px(x, '#2a2630', Math.round(rx), Math.round(ry + s), 1, 1); } } }
  for (let i = 0; i < W / 4; i++) { const X = h2(i, seed + 5) * W, Y = base - 1 - h2(seed + 5, i) * 5; px(x, h2(i, 9) > .5 ? '#4a584a' : '#647464', Math.round(X), Math.round(Y), 2, 1); }
  return { c, ax: Math.floor(W / 2), ay: base };
}
// ---------- onde fica cada coisa (calculado ao carregar, antes das árvores entrarem no mapa)
const EAST = { objs: [], foot: [] };
{
  const okSpot = (X, Y, pad) => !nearRoad(X, Y, pad) && !nearBranch(X, Y, pad + 30) && Math.abs(Y - riverY(X)) > pad + 12 && !EAST_LM.some(l => Math.hypot(X - l.x, Y - l.y) < l.clear + pad + 30) && !EAST.foot.some(f => Math.abs(f.x - X) < (f.w + pad) * .55 && Math.abs(f.y - Y) < f.h * .5 + pad * .4);
  // montanhas (norte)
  for (let gy = 90, row = 0; gy < 800; gy += 100, row++) for (let gx = 1500 + (row % 2) * 50; gx < 2250; gx += 115) { const j = h2(gx, gy), X = Math.round(gx + (j - .5) * 40), Y = Math.round(gy + (h2(gy, gx) - .5) * 30);
    if (biomeAt(X, Y) !== 5 || j < .18) continue; const W = 90 + Math.round(h2(X, 3) * 70), H = 64 + Math.round(h2(3, X) * 56); if (!okSpot(X, Y, 26)) continue; EAST.objs.push({ kind: 'mtn', x: X, y: Y, W, H, seed: X + Y }); EAST.foot.push({ x: X, y: Y, w: W, h: H * .5 }); }
  // vulcões menores (o grande é o monumento)
  for (const [X, Y, W, H] of [[1620, 1420, 120, 90], [2160, 1040, 130, 96], [2190, 1520, 100, 76]]) { EAST.objs.push({ kind: 'volc', x: X, y: Y, W, H, seed: X }); EAST.foot.push({ x: X, y: Y, w: W, h: H * .5 }); }
  // morros dos cânions (sul)
  for (let gy = 1730, row = 0; gy < 2370; gy += 105, row++) for (let gx = 1520 + (row % 2) * 55; gx < 2250; gx += 120) { const j = h2(gx + 7, gy), X = Math.round(gx + (j - .5) * 46), Y = Math.round(gy + (h2(gy, gx + 7) - .5) * 30);
    if (biomeAt(X, Y) !== 7 || j < .25 || Math.abs(NG.cn(X, Y) - .5) < .06) continue; const W = 40 + Math.round(h2(X, 8) * 54), H = 30 + Math.round(h2(8, X) * 34); if (!okSpot(X, Y, 22)) continue; EAST.objs.push({ kind: 'mesa', x: X, y: Y, W, H, seed: X % 97 }); EAST.foot.push({ x: X, y: Y, w: W, h: H * .45 }); }
}
// árvores do leste que ficariam dentro de montanhas, vulcões, morros ou monumentos não aparecem
function nearEastThing(X, Y) { return EAST.foot.some(f => Math.abs(f.x - X) < f.w * .5 + 4 && Y > f.y - f.h - 6 && Y < f.y + 8) || EAST_LM.some(l => Math.hypot(X - l.x, Y - l.y) < l.clear + 10); }
// sprites dos monumentos novos (o resto continua igual)
const _lmSpriteBase = lmSprite;
lmSprite = function (id) {
  if (LM_SPR[id]) return LM_SPR[id];
  if (id === 'mao') return LM_SPR[id] = handSprite();
  if (id === 'vulcao') return LM_SPR[id] = volcanoSprite(230, 170, 7);
  if (id === 'arco') return LM_SPR[id] = archSprite();
  return _lmSpriteBase(id);
};
// animações: fumaça e erupções nos vulcões, runa piscando na mão
function volcanoFx(x, X, Y, s, t, big) {
  const cy = Y - s.ay + s.top, k = .5 + .5 * Math.sin(t * 2 + X);
  glow(x, X, cy + 2, big ? 26 : 16, '#ff7a1a', .16 + .1 * k);
  for (let i = 0; i < (big ? 9 : 5); i++) { const ph = (t * .12 + i / (big ? 9 : 5) + X * .001) % 1, r = (big ? 6 : 4) + ph * (big ? 16 : 10); x.globalAlpha = .5 * (1 - ph); disc(x, Math.round(X + Math.sin(ph * 5 + i) * 6 + ph * 22), Math.round(cy - 6 - ph * (big ? 110 : 70)), Math.round(r), ph < .15 ? '#5a3a30' : '#3a3434'); } x.globalAlpha = 1;
  // erupção de tempos em tempos: bolas de lava em arco
  const per = big ? 7 : 11, e = (t + X * .01) % per; if (e < 1.6) for (let i = 0; i < (big ? 10 : 5); i++) { const a = -Math.PI / 2 + (h2(i, Math.floor((t + X * .01) / per)) - .5) * 1.6, v = (big ? 70 : 45) * (.6 + h2(Math.floor(t / per), i) * .6), bx = X + Math.cos(a) * v * e, by = cy + Math.sin(a) * v * e + 40 * e * e;
    px(x, '#ffd84a', Math.round(bx), Math.round(by), 2, 2); px(x, '#ff7a1a', Math.round(bx) - 1, Math.round(by) + 1, 1, 1); }
}
const _drawLandmarkBase = drawLandmark;
drawLandmark = function (x, l, t) {
  _drawLandmarkBase(x, l, t);
  if (l.id === 'vulcao') volcanoFx(x, l.x, l.y, lmSprite('vulcao'), t, true);
  if (l.id === 'mao') { const a = .35 + .3 * Math.sin(t * 2); glow(x, l.x - 2, l.y - 44, 9, '#3fd0e0', a * .5); }
};
// entra no mapa: montanhas, vulcões e morros (com bloqueio para ninguém atravessar), pedras e ervas do leste
function eastObjects() {
  const blk = (X, Y, w, h) => blockers.push({ k: 'r', x0: X - w / 2, x1: X + w / 2, y0: Y - h, y1: Y });
  blk(1604, 672, 60, 12); blk(1900, 1300, 180, 44); blk(1880 - 42, 2030, 30, 10); blk(1880 + 41, 2030, 32, 10);
  for (const o of EAST.objs) {
    const s = o.kind === 'mtn' ? mountainSprite(o.W, o.H, o.seed) : o.kind === 'volc' ? volcanoSprite(o.W, o.H, o.seed) : mesaSprite(o.W, o.H, o.seed);
    const ob = { y: o.y, x: o.x, img: s.c, dx: o.x - s.ax, dy: o.y - s.ay }; if (o.kind === 'volc') ob.fx = (x, t) => volcanoFx(x, o.x, o.y, s, t, false); OBJ.push(ob);
    blk(o.x, o.y, o.W * .78, o.kind === 'mtn' ? o.H * .32 : o.kind === 'volc' ? o.H * .3 : o.H * .4);
  }
}
// recursos do leste: entram DEPOIS das pedras/ervas/frutas antigas (para a numeração delas não mudar)
function eastNodes() {
  const r = rng(6061); let ri = 300, hi = 400;
  for (let k = 0; k < 4000 && (ri < 360 || hi < 430); k++) { const X = Math.round(OWW + 40 + r() * (WW - OWW - 60)), Y = Math.round(40 + r() * (OWH - 80)), b = biomeAt(X, Y), herb = r() < .4; if (b < 5) continue;
    if (nearEastThing(X, Y) || nearRoad(X, Y, 14) || nearBranch(X, Y, 10) || Math.abs(Y - riverY(X)) < 24 || NODES.some(n => Math.abs(n.x - X) < 30 && Math.abs(n.y - Y) < 30)) continue;
    if (b === 6 && Math.abs(NG.lv(X, Y) - .5) < .05) continue; if (b === 7 && Math.abs(NG.cn(X, Y) - .5) < .05) continue;
    if (herb && b === 5 && hi < 430) NODES.push({ id: 'h' + hi++, kind: 'herb', x: X, y: Y, s: Math.floor(r() * 3) }); else if (!herb && ri < 360) NODES.push({ id: 'r' + ri++, kind: 'rock', x: X, y: Y, s: Math.floor(r() * 3) }); }
}
// detalhes do chão do leste e as estradas novas
function paintEast(x) {
  const r = rng(5150);
  for (let i = 0; i < 26000; i++) { const X = Math.floor(OWW + r() * (WW - OWW)), Y = Math.floor(r() * OWH), kind = r(), b = biomeAt(X, Y); if (b < 5 || Math.abs(Y - riverY(X)) < 15) continue;
    if (b === 5) { if (kind < .35) { px(x, '#2a2630', X - 1, Y, 4, 2); px(x, '#8a8494', X, Y, 2, 1); } else if (kind < .5) { px(x, '#9fb4c8', X, Y, 1, 1); } else if (kind < .58) { px(x, '#4a584a', X, Y - 1, 1, 2); px(x, '#d0a0ff', X, Y - 2, 1, 1); } }
    else if (b === 6) { if (Math.abs(NG.lv(X, Y) - .5) < .035) continue; if (kind < .4) px(x, '#141012', X, Y, 2, 1); else if (kind < .5) px(x, '#5a4844', X, Y, 1, 1); else if (kind < .54) { px(x, '#ff7a1a', X, Y, 1, 1); } else if (kind < .6) { px(x, '#0c0808', X - 1, Y - 1, 3, 2); px(x, '#3a2e2c', X, Y - 1, 1, 1); } }
    else { if (Math.abs(NG.cn(X, Y) - .5) < .036) continue; if (kind < .35) px(x, '#8a3a1c', X, Y, 2, 1); else if (kind < .5) px(x, '#f0c08a', X, Y, 1, 1); else if (kind < .58) { px(x, '#8a7a3a', X, Y - 2, 1, 3); px(x, '#a89a4a', X + 1, Y - 1, 1, 2); } else if (kind < .6) { px(x, '#efe2bf', X, Y, 3, 1); px(x, '#efe2bf', X + 1, Y - 1, 1, 1); } } }
  for (const L of EXT_ROADS2) for (let i = 0; i < L.length - 1; i++) { const [ax, ay] = L[i], [bx, by] = L[i + 1], dd = Math.hypot(bx - ax, by - ay);
    for (let s = 0; s < dd; s += 2) { const X = Math.round(ax + (bx - ax) * s / dd), Y = Math.round(ay + (by - ay) * s / dd), b = biomeAt(X, Y); px(x, b === 6 ? '#4a3a36' : b === 7 ? '#d8a070' : b === 5 ? '#8a8676' : b === 4 ? '#a2aab8' : P.dirt2, X - 3, Y - 2, 7, 5); }
    for (let s = 0; s < dd; s += 2) { const X = Math.round(ax + (bx - ax) * s / dd), Y = Math.round(ay + (by - ay) * s / dd), hx = h2(X, Y); if (hx > .74) { px(x, P.st1, X - 1, Y + 1, 3, 1); px(x, hx > .86 ? P.st3 : P.sand, X - 1, Y, 3, 1); } } }
}

// árvores antigas que ficam em cima das estradas novas somem (entram no URBAN: o número delas continua o mesmo)
function hideRoadTrees() { for (const o of OBJ) if (o.tree !== undefined && !trees[o.tree].east && trees[o.tree].bi && nearRoad(o.x, o.y + 4, 10)) URBAN.add(o.tree); }
