// =====================================================================
// ERYON ONLINE — exploração: mundo desconhecido, monumentos e buracos
// (carregado depois de craft.js e antes de game.js)
// =====================================================================
const LANDMARKS = [
  { id: 'costela', name: 'Costela de Dragão', x: 170, y: 1060, clear: 46, r: 52 },
  { id: 'ruinas', name: 'Ruínas da Inscrição', x: 520, y: 400, clear: 34, r: 44 },
  { id: 'torre', name: 'Torre Antiga', x: 290, y: 118, clear: 30, r: 44 },
  { id: 'caverna', name: 'Caverna Escondida', x: 92, y: 812, clear: 40, r: 50, hole: 'gruta', holeLabel: 'Entrar na caverna' },
  { id: 'buraco', name: 'Buraco Misterioso', x: 575, y: 1110, clear: 34, r: 46, hole: 'abismo', holeLabel: 'Descer no buraco' },
  { id: 'circulo', name: 'Círculo de Pedras', x: 610, y: 880, clear: 38, r: 48 },
  { id: 'arvore', name: 'Árvore Ancestral', x: 110, y: 340, clear: 40, r: 50 },
  { id: 'poco', name: 'Poço da Lua', x: 630, y: 120, clear: 32, r: 44 },
];
const LM = Object.fromEntries(LANDMARKS.map(l => [l.id, l]));
const nearLandmark = (x, y, pad = 0) => LANDMARKS.some(l => Math.hypot(x - l.x, y - l.y) < l.clear + pad);
let FOUND = new Set(), FIRSTS = {};

// ---------------------------------------------------------------- desenho dos monumentos (sprites estáticos + partes animadas)
const LM_SPR = {};
function lmSprite(id) {
  if (LM_SPR[id]) return LM_SPR[id];
  let c, x, ax, ay;
  const bone = '#e4d0a0', boneD = '#c9a46a', boneL = '#fff3d6';
  if (id === 'costela') { [c, x] = canvas(96, 52); ax = 48; ay = 44;
    x.fillStyle = 'rgba(5,15,12,.5)'; x.fillRect(6, 40, 86, 8); px(x, P.dirt1, 8, 38, 82, 7);
    // coluna
    for (let i = 0; i < 26; i++) { const X = 14 + i * 3, Y = 38 - Math.round(Math.sin(i / 25 * Math.PI) * 6); px(x, P.ink, X - 1, Y - 2, 4, 4); px(x, i % 2 ? boneD : bone, X, Y - 1, 2, 2); }
    // costelas em arco
    for (let k = 0; k < 7; k++) { const cx = 24 + k * 9, hgt = 26 - Math.abs(k - 3) * 3;
      for (let s = -1; s <= 1; s += 2) for (let j = 0; j <= hgt; j++) { const X = Math.round(cx + s * Math.sin(j / hgt * 1.4) * 7), Y = 36 - j; px(x, P.ink, X - 1, Y, 3, 1); px(x, j > hgt - 3 ? boneL : bone, X, Y, 1, 1); } }
    // crânio
    px(x, P.ink, 74, 22, 20, 16); px(x, bone, 75, 23, 18, 14); px(x, boneD, 75, 33, 18, 4); px(x, P.ink, 80, 26, 4, 4); px(x, '#3a2618', 81, 27, 2, 2);
    for (let i = 0; i < 4; i++) px(x, boneL, 77 + i * 4, 37, 2, 3); px(x, P.ink, 70, 19, 6, 3); px(x, bone, 70, 18, 8, 2); px(x, boneL, 92, 16, 2, 6); px(x, boneL, 88, 15, 2, 6);
    for (let i = 0; i < 18; i++) px(x, i % 3 ? P.f6 : P.f8, 10 + Math.floor(h2(i, 5) * 78), 36 + Math.floor(h2(i, 8) * 6), 2, 1);
  }
  if (id === 'ruinas') { [c, x] = canvas(70, 48); ax = 35; ay = 40;
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + .2, X = Math.round(35 + Math.cos(a) * 26), Y = Math.round(36 + Math.sin(a) * 9), hg = 7 + (i * 7) % 14;
      px(x, P.ink, X - 4, Y - hg - 1, 9, hg + 3); px(x, P.st2, X - 3, Y - hg, 7, hg + 1); px(x, P.st3, X - 3, Y - hg, 7, 2); px(x, P.st1, X + 1, Y - hg + 2, 2, hg - 1);
      if (i % 3 === 0) { px(x, P.ink, X - 5, Y - hg - 4, 11, 4); px(x, P.st3, X - 4, Y - hg - 3, 9, 2); }
      for (let v = 0; v < hg; v += 2) if (h2(i, v) > .45) px(x, h2(v, i) > .5 ? P.f6 : P.f8, X - 3 + Math.floor(h2(i * 3, v) * 7), Y - hg + v); }
    px(x, P.ink, 12, 2, 7, 34); px(x, P.st2, 13, 3, 5, 32); px(x, P.ink, 12, 0, 26, 6); px(x, P.st3, 13, 1, 23, 4); px(x, P.f8, 14, 0, 9, 1); for (let v = 4; v < 30; v += 3) px(x, P.f6, 13 + (v % 4), v, 1, 2);
    px(x, P.ink, 40, 18, 15, 20); px(x, P.st1, 41, 19, 13, 18); px(x, P.st2, 41, 19, 13, 2);
  }
  if (id === 'torre') { [c, x] = canvas(40, 70); ax = 20; ay = 64;
    x.fillStyle = 'rgba(5,15,12,.5)'; x.fillRect(6, 60, 32, 8);
    px(x, P.ink, 7, 22, 26, 44); px(x, P.st2, 8, 23, 24, 42); for (let y = 24; y < 64; y += 5) for (let k = 0; k < 4; k++) px(x, P.st1, 8 + ((y / 5) % 2) * 3 + k * 6, y, 5, 1); px(x, P.st3, 8, 23, 3, 42);
    px(x, P.ink, 16, 50, 8, 15); px(x, '#1a1208', 17, 51, 6, 14); px(x, P.ink, 17, 32, 6, 8); px(x, P.fire3, 18, 33, 4, 6);
    for (let y = 0; y < 24; y++) { const w = Math.round(2 + y * .7); px(x, P.ink, 20 - w - 1, y, w * 2 + 2, 1); px(x, y % 4 === 0 ? '#1d3550' : '#3c5f9a', 20 - w, y, w * 2, 1); }
    px(x, P.ink, 5, 20, 30, 4); px(x, P.st3, 6, 21, 28, 2); for (let v = 0; v < 10; v++) px(x, P.f8, 8 + Math.floor(h2(v, 2) * 24), 24 + Math.floor(h2(v, 4) * 40), 1, 2);
  }
  if (id === 'caverna') { [c, x] = canvas(80, 54); ax = 40; ay = 48;
    x.fillStyle = 'rgba(5,15,12,.5)'; x.fillRect(4, 44, 74, 8);
    disc(x, 40, 30, 26, P.ink); disc(x, 40, 29, 25, P.st1); disc(x, 34, 24, 16, P.st2); disc(x, 30, 19, 7, P.st3); disc(x, 58, 34, 12, P.ink); disc(x, 58, 33, 11, P.st1);
    px(x, P.ink, 31, 28, 18, 20); px(x, '#030606', 33, 30, 14, 18); px(x, P.ink, 33, 26, 14, 3);
    px(x, P.f6, 14, 12, 26, 2); for (let v = 0; v < 12; v++) px(x, P.f8, 12 + Math.floor(h2(v, 3) * 50), 8 + Math.floor(h2(v, 6) * 26), 2, 1);
  }
  if (id === 'buraco') { [c, x] = canvas(56, 34); ax = 28; ay = 26;
    for (let r2 = 0; r2 < 3; r2++) { x.fillStyle = [P.ink, P.st1, P.st2][r2]; x.beginPath(); x.ellipse(28, 18, 26 - r2 * 2, 13 - r2, 0, 0, 6.283); x.fill(); }
    x.fillStyle = '#0a0612'; x.beginPath(); x.ellipse(28, 18, 19, 9, 0, 0, 6.283); x.fill(); x.fillStyle = '#000'; x.beginPath(); x.ellipse(28, 19, 14, 6, 0, 0, 6.283); x.fill();
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; px(x, i % 2 ? P.st3 : P.st2, Math.round(28 + Math.cos(a) * 22) - 2, Math.round(18 + Math.sin(a) * 11) - 1, 4, 3); }
    for (let k = 0; k < 5; k++) { px(x, P.woodD, 24, 9 + k * 3, 1, 2); px(x, P.woodD, 31, 9 + k * 3, 1, 2); px(x, P.wood, 24, 10 + k * 3, 8, 1); }
  }
  if (id === 'circulo') { [c, x] = canvas(76, 50); ax = 38; ay = 40;
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, X = Math.round(38 + Math.cos(a) * 30), Y = Math.round(32 + Math.sin(a) * 12), hg = 12 + (i * 5) % 9;
      x.fillStyle = 'rgba(5,15,12,.45)'; x.fillRect(X - 2, Y, 8, 3); px(x, P.ink, X - 3, Y - hg - 1, 7, hg + 2); px(x, i % 2 ? P.st2 : P.st1, X - 2, Y - hg, 5, hg); px(x, P.st3, X - 2, Y - hg, 2, hg); }
    px(x, P.ink, 30, 26, 17, 9); px(x, P.st3, 31, 27, 15, 7); px(x, P.st2, 31, 31, 15, 3);
  }
  if (id === 'arvore') { const t2 = roundTree(22, [P.f3, P.f5, P.f6, P.f8], 3.3); c = t2.c; ax = t2.ax; ay = t2.ay; }
  if (id === 'poco') { [c, x] = canvas(56, 40); ax = 28; ay = 32;
    disc(x, 28, 26, 16, P.ink); disc(x, 28, 26, 15, '#eef0ea'); disc(x, 28, 26, 12, P.ink); disc(x, 28, 26, 11, '#1d3550'); disc(x, 26, 24, 6, '#2c4f7a');
    for (const [X, Y] of [[8, 18], [48, 18], [12, 36], [44, 36]]) { px(x, P.ink, X - 3, Y - 16, 7, 18); px(x, '#eef0ea', X - 2, Y - 15, 5, 16); px(x, '#c4ccd0', X + 1, Y - 15, 1, 16); px(x, '#eef0ea', X - 3, Y - 17, 7, 2); }
  }
  return LM_SPR[id] = { c, ax, ay };
}
function drawLandmark(x, l, t) {
  const s = lmSprite(l.id); x.drawImage(s.c, l.x - s.ax, l.y - s.ay);
  const pul = .6 + .4 * Math.sin(t * 2.2 + l.x);
  if (l.id === 'ruinas') { x.globalAlpha = pul; for (const [a, b] of [[0, 0], [3, 0], [6, 1], [1, 4], [4, 5], [7, 6], [2, 9], [5, 10], [8, 12]]) px(x, P.cy2, l.x + 7 + a, l.y - 19 + b, 1, 2); x.globalAlpha = 1; glow(x, l.x + 12, l.y - 12, 9, P.cy, .1 * pul); }
  if (l.id === 'caverna') { x.globalAlpha = pul; [[-11, -14], [-11, -8], [10, -14], [10, -8], [-3, -23], [3, -23]].forEach(([a, b]) => px(x, P.cy2, l.x + a, l.y + b - 6, 2, 3)); x.globalAlpha = 1; }
  if (l.id === 'buraco') glow(x, l.x, l.y - 8, 12, '#6e4a8a', .12 * pul);
  if (l.id === 'circulo') { glow(x, l.x, l.y - 10, 10, P.fire3, .1 * pul); px(x, P.fire4, l.x - 1, l.y - 12, 2, 2); }
  if (l.id === 'arvore') { x.globalAlpha = pul; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; px(x, P.cy2, Math.round(l.x + Math.cos(a) * (10 + (i % 3) * 4)), Math.round(l.y + Math.sin(a) * 4), 2, 1); } x.globalAlpha = 1; for (let i = 0; i < 5; i++) { const ph = (t * .3 + i / 5) % 1; x.globalAlpha = 1 - ph; px(x, P.cy2, Math.round(l.x + Math.sin(i * 2.3 + t) * 16), Math.round(l.y - 20 - ph * 30), 1, 1); } x.globalAlpha = 1; }
  if (l.id === 'poco') { glow(x, l.x, l.y - 6, 12, P.cy2, .14 * pul); px(x, '#bfe6f5', l.x - 4 + Math.round(Math.sin(t) * 3), l.y - 8, 3, 1); }
  if (l.id === 'torre') glow(x, l.x, l.y - 30, 6, P.fire3, .12);
}
const LM_LIGHT = { ruinas: 22, caverna: 18, buraco: 20, circulo: 22, arvore: 30, poco: 24, torre: 18, costela: 0 };

// ---------------------------------------------------------------- mundo desconhecido (névoa que some onde você passa)
const FOG_S = 4, [fogC, fogX] = canvas(Math.ceil(WW / FOG_S), Math.ceil(WH / FOG_S));
let fogKey = '', fogDirty = false;
function fogInit(user) {
  fogKey = 'eryon_fog_' + user;
  fogX.globalCompositeOperation = 'source-over'; fogX.fillStyle = '#05090a'; fogX.fillRect(0, 0, fogC.width, fogC.height);
  revealAt(C.x, C.y, 245);
  try { const s = localStorage.getItem(fogKey); if (s) { const img = new Image(); img.onload = () => { fogX.globalCompositeOperation = 'destination-in'; fogX.drawImage(img, 0, 0); fogX.globalCompositeOperation = 'source-over'; revealAt(C.x, C.y, 245); }; img.src = s; } } catch { }
}
function revealAt(wx, wy, r) {
  fogX.globalCompositeOperation = 'destination-out';
  const cx = wx / FOG_S, cy = wy / FOG_S, rr2 = r / FOG_S;
  for (let k = 0; k < 3; k++) { fogX.globalAlpha = k === 2 ? 1 : .35; disc(fogX, cx, cy, Math.round(rr2 * (1 - k * .12) + 2), '#000'); }
  fogX.globalAlpha = 1; fogX.globalCompositeOperation = 'source-over'; fogDirty = true;
}
setInterval(() => { if (!fogDirty || !fogKey) return; fogDirty = false; try { localStorage.setItem(fogKey, fogC.toDataURL()); } catch { } }, 8000);
function drawFog(x, li, ti, cw, ch) { x.imageSmoothingEnabled = false; x.drawImage(fogC, li / FOG_S, ti / FOG_S, cw / FOG_S, ch / FOG_S, 0, 0, cw, ch); }

// ---------------------------------------------------------------- descobertas
function checkDiscover(p) {
  if (p.room) return;
  for (const l of LANDMARKS) if (!FOUND.has(l.id) && Math.hypot(p.x - l.x, p.y - l.y) < l.r) { FOUND.add(l.id); send({ t: 'discover', id: l.id }); showDiscovery(l); updFound(); }
}
function showDiscovery(l) {
  $('discName').textContent = l.name; $('disc').hidden = false; $('disc').classList.remove('anim'); void $('disc').offsetWidth; $('disc').classList.add('anim');
  clearTimeout(showDiscovery.t); showDiscovery.t = setTimeout(() => $('disc').hidden = true, 4200);
  if (SND.ctx) { const w = SND.ctx.currentTime; [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => pluck(f, w + i * .12, .35, 2.2)); drum(w, .6); }
}
function updFound() { $('foundN').textContent = `${FOUND.size}/${LANDMARKS.length}`; }

// ---------------------------------------------------------------- cavernas (salas embaixo da terra)
function caveRoom(id) {
  const deep = id === 'abismo', w = 170, h = 130, [c, x] = canvas(w, h);
  for (let y = 0; y < h; y += 2) for (let X = 0; X < w; X += 2) { const n = vn(X * .08 + (deep ? 9 : 0), y * .08); px(x, n > .62 ? '#2b3138' : n > .4 ? '#1f2428' : '#171b1e', X, y, 2, 2); }
  px(x, '#0c0f11', 0, 0, w, 20); for (let X = 0; X < w; X += 6) px(x, '#2b3138', X, 14 + Math.floor(h2(X, 1) * 6), 6, 8);
  for (const [X, Y] of [[14, 40], [150, 46], [20, 104], [146, 100], [84, 30]]) { disc(x, X, Y, 7, P.ink); disc(x, X, Y, 6, P.st1); disc(x, X - 2, Y - 2, 3, P.st2); }
  const crystals = deep ? [[40, 60], [126, 70], [86, 92]] : [[46, 52], [118, 62]], shrooms = deep ? [[66, 110], [110, 108]] : [[30, 84], [92, 106], [136, 84]];
  for (const [X, Y] of crystals) { px(x, P.ink, X - 3, Y - 9, 7, 10); px(x, deep ? '#b06a9a' : P.cy, X - 2, Y - 8, 5, 8); px(x, deep ? '#f6b6d8' : P.cy2, X - 1, Y - 8, 1, 6); }
  for (const [X, Y] of shrooms) for (let k = 0; k < 3; k++) { px(x, '#f0ead6', X + k * 4, Y - 2, 1, 3); px(x, k % 2 ? P.cy2 : P.cy, X + k * 4 - 1, Y - 3, 3, 1); }
  if (deep) for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; px(x, '#9ff3ff', Math.round(85 + Math.cos(a) * 18), Math.round(66 + Math.sin(a) * 9), 2, 1); }
  px(x, P.ink, 75, 122, 20, 8); px(x, '#3a2618', 77, 123, 16, 7); for (let k = 0; k < 3; k++) px(x, P.wood, 78, 124 + k * 2, 14, 1);
  const spots = [...crystals.map(([X, Y], i) => ({ x: X, y: Y + 6, rx: 12, ry: 10, kind: 'cmine', label: 'Minerar cristal', node: (deep ? 'a' : 'g') + i })),
    ...shrooms.map(([X, Y], i) => ({ x: X + 4, y: Y + 4, rx: 12, ry: 9, kind: 'cherb', label: 'Colher cogumelos', node: (deep ? 'm' : 'n') + i }))];
  const block = [[0, 0, w, 24], [0, 0, 4, h], [w - 4, 0, w, h], ...crystals.map(([X, Y]) => [X - 4, Y - 6, X + 4, Y + 1])];
  const l = LM[deep ? 'buraco' : 'caverna'];
  return { id, name: deep ? 'Abismo das Runas' : 'Gruta dos Cristais', w, h, img: c, spawn: { x: 85, y: 112 }, door: { x: 85, y: 122 }, fire: null, block, spots, outside: { x: l.x, y: l.y + 10 }, dark: true, glows: crystals.map(([X, Y]) => [X, Y - 4, deep ? '#b06a9a' : P.cy]) };
}
