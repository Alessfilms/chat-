// =====================================================================
// ERYON ONLINE — cliente do jogo (mapa aberto multiplayer)
// Usa engine.js (o mesmo mapa dos episódios) e o estado da vila do Ep. 2.
// =====================================================================
const $ = id => document.getElementById(id);
const API = (p, o) => fetch(p, o).then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { } }, del: k => { try { localStorage.removeItem(k); } catch { } } };

// ---------------------------------------------------------------- personagens dos episódios (pelo @)
const NAMED = {
  heitor_morrone: { hair: '#3a2618', beard: '#3a2618', shirt: '#a83a32', shirtD: '#5a2418', plaid: true, pants: '#2c4f7a', role: 'Lenhador' },
  lorhan_cristian: { hair: '#5a3a26', shirt: '#d0622a', shirtD: '#8a3a1c', pants: '#4a535c', hat: 'palha', role: 'Construtor' },
  'maicon.sg2010': { hair: '#1a1208', shirt: '#3f7ab0', shirtD: '#2c4f7a', pants: '#4a2f22', hat: 'bone', capColor: '#ffd84a', role: 'Construtor' },
  pablopaesrocha: { hair: '#1a1208', beard: '#1a1208', shirt: '#8b5e3c', shirtD: '#4a2f22', pants: '#2b3138', apron: '#3a2618', role: 'Mestre ferreiro' },
  _ray_hpl: { hair: '#5a3a26', shirt: '#eef0ea', shirtD: '#98a4ac', pants: '#2c4f7a', hat: 'chef', apron: '#c4ccd0', role: 'Cozinheiro' },
  paocombiscoito: { hair: '#8b5e3c', shirt: '#eef0ea', shirtD: '#98a4ac', pants: '#3c5d4a', belt: '#4e6c4a', role: 'Médico' },
  altanat19: { hair: '#1a1208', shirt: '#6e4a8a', shirtD: '#3a2650', pants: '#4a2f22', apron: '#e4d0a0', role: 'Valis · Taverneiro' },
  'eo_preto.031': { big: true, hair: '#1a1208', armor: '#4a535c', rust: '#8b5e3c', pants: '#2b3138', boots: '#1a1208', skin: '#c08060', skinD: '#8b5e3c', role: 'Gerald D. Black' },
  bio_leocordeiro: { hair: '#98a4ac', wolfEars: true, elfEars: true, cape: '#4e6c4a', shirt: '#4a535c', shirtD: '#2b3138', pants: '#2e1d16', role: 'Fenrir' },
  'kaguya.xs': { hair: '#e6efa0', longHair: true, elfEars: true, crown: true, shirt: '#3fd0e0', shirtD: '#2c4f7a', pants: '#1d3550', cape: '#1d3550', role: 'Nyx' },
};
const HAIRS = ['#d0622a', '#ffd84a', '#1a1208', '#5a3a26', '#8b5e3c', '#c4ccd0', '#a83a32', '#e6efa0'];
const SHIRTS = ['#a83a32', '#3f7ab0', '#6e4a8a', '#3c5d4a', '#d0622a', '#e4d0a0', '#4a535c', '#b06a9a'];
const PANTS = ['#3c5f9a', '#4a2f22', '#2b3138', '#3c5d4a', '#6b4630', '#1d3550'];
const SKINS = ['#e8b48c', '#f2c9a4', '#c08060', '#8b5e3c', '#5a3a26'];
const HATS = [['', 'Nenhum'], ['palha', 'Palha'], ['bone', 'Boné'], ['chef', 'Chef']];
const CAPES = ['', '#4e6c4a', '#1d3550', '#a83a32', '#6e4a8a'];
const shade = h => { const [r, g, b] = hex(h); return '#' + [r, g, b].map(v => Math.round(v * .6).toString(16).padStart(2, '0')).join(''); };
const builders = new Map();
function charFor(username, look) {
  const key = username + JSON.stringify(look || {});
  if (!builders.has(key)) {
    const l = look || {};
    const sp = NAMED[username] || { hair: l.hair || HAIRS[0], shirt: l.shirt || SHIRTS[1], shirtD: shade(l.shirt || SHIRTS[1]), pants: l.pants || PANTS[0], longHair: !!l.longHair,
      skin: l.skin || SKINS[0], skinD: shade(l.skin || SKINS[0]), beard: l.beard ? (l.hair || HAIRS[0]) : undefined, hat: l.hat || undefined, elfEars: !!l.elfEars, cape: l.cape || undefined };
    builders.set(key, charBuilder(sp));
  }
  return builders.get(key);
}

// ---------------------------------------------------------------- vila (estado do fim do Ep. 2)
let B = {}, villageLayer = null, OBJ = [], blockers = [];
const TREE_POS = [], CUT = new Set();
let BUILT = [], BRIDGES = [], lunch = null;
let DOORS = [], wood = 0;
const VR = 214, GATE = { x: 482, y: 475 };
let PAL_R = 212, PAL_IMG = null; const URBAN = new Set();
const GATE_A = Math.atan2((GATE.y - C.y) / .95, GATE.x - C.x), SOUTH_A = Math.PI / 2;
function buildWorld(world) {
  for (const b of world.construcoes) B[b.id] = b;
  const [v, x] = canvas(WW, WH); villageLayer = v;
  x.drawImage(ground, 0, 0);
  x.save(); x.beginPath(); x.ellipse(C.x, C.y, VR, VR * .95, 0, 0, 6.283); x.clip(); x.drawImage(clearTex, 0, 0); x.restore();
  paintDetails(x); paintRiver(x);
  const pts = [];
  const road = p => { for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s < d; s += 2) pts.push([a[0] + (b[0] - a[0]) * s / d, a[1] + (b[1] - a[1]) * s / d]); } };
  road([[360, 622], [400, 566], [440, 520], [GATE.x, GATE.y], [496, 452], [508, 425], [520, 404]]);
  road([[340, 642], [270, 640], [208, 624], [170, 630]]); road([[380, 644], [440, 664], [480, 690], [530, 712]]);
  road([[362, 664], [362, 720], [pathS(780), 780], [pathS(860), 860]]); road([[352, 650], [310, 700], [300, 790]]); road([[372, 652], [420, 700], [420, 786]]); road([[350, 628], [306, 560], [306, 522]]);
  for (const [X, Y] of pts) px(x, P.dirt2, Math.round(X) - 3, Math.round(Y) - 2, 7, 5);
  for (const [X, Y] of pts) { const hx = h2(Math.round(X), Math.round(Y)); if (hx > .72) { px(x, P.st1, Math.round(X) - 1, Math.round(Y) + 1, 3, 1); px(x, hx > .86 ? P.st3 : P.sand, Math.round(X) - 1, Math.round(Y), 3, 1); }
    if (hx < .1) px(x, P.f7, Math.round(X) + (hx < .05 ? 4 : -4), Math.round(Y) - 1, 1, 2); }
  disc(x, C.x, C.y, 25, P.ink); disc(x, C.x, C.y, 24, P.dirt2); disc(x, C.x, C.y, 21, P.dirt1);
  // praça de pedras (calçamento)
  for (let Y = C.y - 22; Y <= C.y + 22; Y += 3) for (let X = C.x - 22 + ((Y / 3) % 2) * 2; X <= C.x + 22; X += 4) { const d = Math.hypot(X - C.x, Y - C.y); if (d > 21 || d < 9) continue; const v = h2(X, Y); px(x, P.ink, X - 1, Y - 1, 4, 3); px(x, v > .6 ? P.st3 : v > .3 ? P.st2 : P.sand, X, Y, 3, 2); px(x, P.st4, X, Y, 1, 1); }
  for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; px(x, i % 2 ? P.st3 : P.st2, Math.round(C.x + Math.cos(a) * 24) - 1, Math.round(C.y + Math.sin(a) * 23) - 1, 3, 2); }
  drawBridgeOn(x, BRIDGE.x);
  for (const f of [B.plantacao_1, B.plantacao_2]) { px(x, P.dirt1, f.x - f.w / 2, f.y - f.h / 2, f.w, f.h);
    for (let r = 0; r < Math.floor(f.h / 4); r++) for (let c = 0; c < f.w - 2; c += 3) px(x, (r + c) % 7 === 0 ? P.fire3 : P.f8, f.x - f.w / 2 + 1 + c, f.y - f.h / 2 + r * 4, 1, 3);
    for (let c = 0; c <= f.w; c += 4) px(x, P.woodL, f.x - f.w / 2 + c, f.y - f.h / 2 - 2, 1, 3); }
  // ruínas a nordeste (desenho estático)
  { const X = RUINS.x, Y = RUINS.y; for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + .3, p0 = Math.round(X + Math.cos(a) * 20), q0 = Math.round(Y + Math.sin(a) * 13), hg = 5 + (i * 5) % 11;
      px(x, P.ink, p0 - 3, q0 - hg - 1, 7, hg + 3); px(x, P.st2, p0 - 2, q0 - hg, 5, hg + 1); px(x, P.st3, p0 - 2, q0 - hg, 5, 2); }
    px(x, P.ink, 522, 383, 13, 16); px(x, P.st1, 523, 384, 11, 14); [[0, 0, 1, 3], [4, 0, 1, 3], [7, 0, 1, 1], [1, 5, 3, 1], [6, 5, 2, 2], [2, 9, 3, 1]].forEach(([a, b, w, h]) => px(x, P.cy2, 524 + a, 385 + b, w, h)); }
  // árvores (as da área da vila foram derrubadas e viraram casas)
  const pathNear = (X, Y) => { const L = [[474, 498], [482, 476], [492, 456], [502, 438], [508, 425], [514, 414], [522, 404]]; for (let i = 0; i < L.length - 1; i++) { const [ax, ay] = L[i], [bx, by] = L[i + 1], dx = bx - ax, dy = by - ay, k = clamp(((X - ax) * dx + (Y - ay) * dy) / (dx * dx + dy * dy)); if (Math.hypot(X - ax - dx * k, Y - ay - dy * k) < 15) return true; } return false; };
  trees.forEach((t, i) => { if (t.dc < VR + 4 || pathNear(t.x, t.y + 6) || nearLandmark(t.x, t.y)) return; const sp = treeSprites[t.s]; OBJ.push({ y: t.y, x: t.x, img: sp.c, dx: t.x - sp.ax, dy: t.y - sp.ay, tree: i }); blockers.push({ k: 'c', x: t.x, y: t.y - 1, r: 3.5, tree: i }); TREE_POS.push({ i, x: t.x, y: t.y }); });
  if (B.serraria) { const X = B.serraria.x, Y = B.serraria.y, [wc, wq] = canvas(26, 14);
    for (let k = 0; k < 6; k++) { const r = k % 3, c2 = Math.floor(k / 3); px(wq, P.ink, 2 + r * 6 + c2 * 3, 6 - c2 * 4, 7, 7); px(wq, P.wood, 3 + r * 6 + c2 * 3, 7 - c2 * 4, 5, 5); px(wq, P.woodL, 4 + r * 6 + c2 * 3, 8 - c2 * 4, 3, 3); }
    OBJ.push({ y: Y, x: X, img: wc, dx: X - 13, dy: Y - 12 }); const [bc, bq] = canvas(9, 7); px(bq, P.ink, 0, 0, 9, 7); px(bq, P.wood, 1, 2, 7, 4); px(bq, P.woodL, 1, 1, 7, 2); OBJ.push({ y: Y + 8, x: X + 18, img: bc, dx: X + 14, dy: Y + 2 });
    blockers.push({ k: 'r', x0: X - 13, x1: X + 13, y0: Y - 6, y1: Y }); }
  const bld = (b, spr, ox, oy, w, h) => { if (!b) return; OBJ.push({ y: b.y, x: b.x, img: spr, dx: b.x + ox, dy: b.y + oy }); blockers.push({ k: 'r', x0: b.x - w / 2, x1: b.x + w / 2, y0: b.y - h, y1: b.y }); };
  ['casa_1', 'casa_2', 'casa_3', 'casa_4', 'casa_5', 'casa_6', 'casa_7', 'casa_8', 'casa_9'].forEach(id => B[id] && bld(B[id], HOUSE_SPR[B[id].telhado || 0], -15, -26, 26, 10));
  bld(B.forja, FORGE_SPR, -18, -28, 34, 12); bld(B.taverna, TAVERN_SPR[1], -24, -36, 46, 14); bld(B.enfermaria, TENT_SPR, -17, -24, 30, 10); bld(B.armazem, SHED_SPR, -13, -22, 26, 10);
  OBJ.push({ y: B.cozinha.y, x: B.cozinha.x, img: KITCHEN_SPR, dx: B.cozinha.x - 20, dy: B.cozinha.y - 26 });
  OBJ.push({ y: 628, x: 360, img: (() => { const [c, q] = canvas(23, 6); px(q, P.ink, 0, 0, 23, 6); px(q, P.woodD, 1, 1, 21, 4); px(q, P.wood, 1, 1, 21, 1); return c; })(), dx: 349, dy: 622 });
  blockers.push({ k: 'r', x0: 349, x1: 372, y0: 622, y1: 628 }, { k: 'c', x: C.x, y: C.y, r: 7 });
  // paliçada com portões
  const [pc, pq] = canvas(4, 10); px(pq, P.ink, 0, 0, 4, 9); px(pq, P.wood, 1, 1, 2, 7); px(pq, P.woodL, 1, 0, 1, 1); PAL_IMG = pc;
  placePalisade();
  const LB = { costela: [-42, 42, -12, 0], ruinas: [4, 20, -8, 0], torre: [-13, 13, -14, 0], caverna: [-36, 36, -22, -2], buraco: [-22, 22, -16, -2], poco: [-16, 16, -14, 2], arvore: [-4, 4, -5, 0], circulo: [-6, 8, -6, 0] };
  for (const l of LANDMARKS) { OBJ.push({ y: l.y, x: l.x, lm: l }); const b = LB[l.id]; if (b) blockers.push({ k: 'r', x0: l.x + b[0], x1: l.x + b[1], y0: l.y + b[2], y1: l.y + b[3] }); }
  OBJ.sort((a, b) => a.y - b.y);
}
function drawBridgeOn(x, X) { X = Math.round(X); const Y = Math.round(riverY(X)); px(x, P.ink, X - 8, Y - 17, 17, 34); for (let i = 0; i < 16; i++) px(x, i % 2 ? P.dirt3 : P.wood, X - 7, Y - 16 + i * 2, 15, 2); px(x, P.woodD, X - 8, Y - 17, 2, 34); px(x, P.woodD, X + 7, Y - 17, 2, 34); }
function addBridges(list) { for (const b of list) if (!BRIDGES.some(o => o.id === b.id)) { BRIDGES.push(b); drawBridgeOn(villageLayer.getContext('2d'), b.x); } }
// ---- detalhes do chão: tufos de grama, flores, samambaias, folhas e pedrinhas
function paintDetails(x) {
  const r = rng(2024);
  for (let i = 0; i < 9000; i++) {
    const X = Math.floor(r() * WW), Y = Math.floor(r() * WH), kind = r(); if (Math.abs(Y - riverY(X)) < 15) continue;
    const dc = Math.hypot(X - C.x, (Y - C.y) / .95), open = dc < VR - 4;
    if (open) {
      if (kind < .55) { const c1 = r() < .5 ? P.f7 : P.f8; px(x, c1, X, Y, 1, 2); px(x, c1, X + 1, Y - 1, 1, 3); px(x, P.f5, X + 2, Y, 1, 2); }
      else if (kind < .72) { const fc = ['#f6b6d8', '#fff3b0', '#9ff3ff', '#eef0ea', '#d0622a'][Math.floor(r() * 5)]; px(x, P.f6, X, Y + 1, 1, 2); px(x, fc, X - 1, Y, 3, 1); px(x, fc, X, Y - 1, 1, 3); px(x, '#ffd84a', X, Y, 1, 1); }
      else if (kind < .8) { px(x, P.st2, X, Y, 2, 1); px(x, P.st3, X, Y - 1, 1, 1); }
    } else {
      if (kind < .3) { const c1 = r() < .5 ? P.f4 : P.f5; for (let k = -2; k <= 2; k++) px(x, c1, X + k, Y - 2 + Math.abs(k), 1, 2); px(x, P.f6, X, Y - 3, 1, 3); }
      else if (kind < .5) { px(x, ['#5c5a2a', '#6b4630', '#8a3a1c', '#7a7a3a'][Math.floor(r() * 4)], X, Y, 2, 1); }
      else if (kind < .56) { px(x, P.st1, X, Y, 3, 2); px(x, P.st2, X, Y, 2, 1); }
      else if (kind < .6) { px(x, '#d0622a', X, Y - 1, 3, 1); px(x, '#a83a32', X, Y - 2, 3, 1); px(x, '#eef0ea', X + 1, Y - 2, 1, 1); px(x, '#e4d0a0', X + 1, Y, 1, 1); }   // cogumelos
    }
  }
}
function paintRiver(x) {
  const r = rng(99);
  for (let X = 0; X < WW; X += 2) { const y = riverY(X);
    if (r() < .35) for (const s of [-1, 1]) { const by = Math.round(y + s * (11 + r() * 3)); px(x, P.f6, X, by - 3, 1, 4); if (r() < .4) px(x, '#8b5e3c', X, by - 4, 1, 2); }
    if (r() < .05) { const ly = Math.round(y + (r() - .5) * 10); px(x, '#3c5d4a', X - 1, ly, 4, 2); px(x, '#4e6c4a', X, ly, 2, 1); if (r() < .4) px(x, '#f6b6d8', X + 1, ly - 1, 1, 1); }
    if (r() < .08) px(x, '#6fb0d8', X, Math.round(y + (r() - .5) * 12), 3, 1); }
}
// ---- vida ambiente: brilho na água, vagalumes, folhas, fumaça das chaminés e sombra das nuvens
const FIREFLIES = Array.from({ length: 70 }, (_, i) => ({ x: h2(i, 1) * WW, y: h2(i, 2) * WH, ph: h2(i, 3) * 6.283 }));
function drawAmbient(x, t, li, ti, cw, ch) {
  // brilho do rio
  for (let X = Math.max(0, li - 2); X < Math.min(WW, li + cw + 2); X += 3) { const k = Math.sin(X * .7 + t * 3.1) + Math.sin(X * .23 - t * 1.7); if (k > 1.35) { const Y = Math.round(riverY(X) + Math.sin(X * 1.3 + t) * 5); px(x, '#bfe6f5', X, Y, 2, 1); } }
  // chaminés soltando fumaça
  for (const id of ['casa_1', 'casa_3', 'casa_5', 'casa_7', 'casa_9']) { const b = B[id]; if (b && b.x > li - 20 && b.x < li + cw + 20) smoke(x, b.x + 5, b.y - 26, t + b.x, 4, '#c4ccd0'); }
  for (const h of BUILT) if ((h.type || 'casa') === 'casa' && (h.roof || 0) % 2 === 0 && h.x > li - 20 && h.x < li + cw + 20) smoke(x, h.x + 5, h.y - 26, t + h.x, 4, '#c4ccd0');
  // vagalumes
  for (const f of FIREFLIES) { const X = f.x + Math.sin(t * .4 + f.ph) * 12, Y = f.y + Math.cos(t * .33 + f.ph * 2) * 8; if (X < li || X > li + cw || Y < ti || Y > ti + ch) continue; const on = (.5 + .5 * Math.sin(t * 2.4 + f.ph * 3)) * (.35 + .65 * ambient().night); if (on < .2) continue; x.globalAlpha = on; px(x, '#fff3b0', Math.round(X), Math.round(Y), 1, 1); x.globalAlpha = on * .25; px(x, '#ffd84a', Math.round(X) - 1, Math.round(Y) - 1, 3, 3); }
  x.globalAlpha = 1;
  // folhas caindo
  for (let i = 0; i < 14; i++) { const ph = (t * .08 + i / 14) % 1, X = li + ((i * 97 + t * 6) % cw), Y = ti + ph * ch; px(x, i % 3 ? '#9a9442' : '#d0622a', Math.round(X + Math.sin(ph * 12 + i) * 6), Math.round(Y), 2, 1); }
}
const DAY_LEN = 1200;  // 20 minutos
function dayPhase() { return (Date.now() / 1000 % DAY_LEN) / DAY_LEN; }
function ambient() {   // cor e intensidade do escuro em cada momento do dia
  const K = [[0, [6, 14, 22], .10], [.40, [6, 14, 22], .12], [.47, [96, 40, 6], .30], [.53, [30, 12, 40], .48], [.6, [2, 6, 30], .68], [.82, [2, 6, 30], .68], [.9, [60, 26, 40], .38], [.96, [12, 16, 24], .16], [1, [6, 14, 22], .10]];
  const p = dayPhase(); let i = 0; while (K[i + 1][0] < p) i++; const a = K[i], b = K[i + 1], k = (p - a[0]) / (b[0] - a[0]);
  return { r: Math.round(lerp(a[1][0], b[1][0], k)), g: Math.round(lerp(a[1][1], b[1][1], k)), b: Math.round(lerp(a[1][2], b[1][2], k)), a: lerp(a[2], b[2], k), night: clamp((lerp(a[2], b[2], k) - .2) / .48) };
}
function phaseName() { const p = dayPhase(); return p < .44 ? 'Dia' : p < .53 ? 'Pôr do sol' : p < .86 ? 'Noite' : 'Amanhecer'; }
let vigC = null, vigKey = '';
function drawVignette() {
  const key = cv.width + 'x' + cv.height; if (vigKey !== key) { vigKey = key; vigC = document.createElement('canvas'); vigC.width = cv.width; vigC.height = cv.height; const q = vigC.getContext('2d');
    const g2 = q.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * .35, cv.width / 2, cv.height / 2, Math.hypot(cv.width, cv.height) * .62); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(4,8,10,.45)'); q.fillStyle = g2; q.fillRect(0, 0, cv.width, cv.height); }
  ctx.drawImage(vigC, 0, 0);
}
function drawCloudShadows(x, t, li, ti, cw, ch) {
  x.fillStyle = 'rgba(4,10,14,.10)';
  for (let i = 0; i < 5; i++) { const X = ((i * 211 + t * 7) % (WW + 300)) - 150, Y = (i * 337) % WH; if (X + 120 < li || X - 120 > li + cw || Y + 60 < ti || Y - 60 > ti + ch) continue; x.beginPath(); x.ellipse(X, Y, 110, 46, .2, 0, 6.283); x.ellipse(X + 60, Y + 20, 70, 32, 0, 0, 6.283); x.fill(); }
}
// paliçada que cresce com a cidade
function placePalisade() {
  for (let i = OBJ.length - 1; i >= 0; i--) if (OBJ[i].pal) OBJ.splice(i, 1);
  const n = Math.round(150 * PAL_R / 212), gw = .07 * 212 / PAL_R, sw = .05 * 212 / PAL_R;
  for (let i = 0; i < n; i++) { const a = -Math.PI + i / n * 6.283; if (Math.abs(Math.atan2(Math.sin(a - GATE_A), Math.cos(a - GATE_A))) < gw || Math.abs(Math.atan2(Math.sin(a - SOUTH_A), Math.cos(a - SOUTH_A))) < sw) continue;
    const X = Math.round(C.x + Math.cos(a) * PAL_R), Y = Math.round(C.y + Math.sin(a) * PAL_R * .95); if (Math.abs(Y - riverY(X)) < 14) continue; OBJ.push({ y: Y, x: X, img: PAL_IMG, dx: X - 1, dy: Y - 8, pal: true }); }
  OBJ.sort((a, b) => a.y - b.y);
}
function growCity() {
  const want = Math.min(380, 212 + Math.floor(BUILT.length / 2) * 14); if (want <= PAL_R || !villageLayer) return;
  const old = PAL_R; PAL_R = want; const x = villageLayer.getContext('2d');
  x.save(); x.beginPath(); x.ellipse(C.x, C.y, PAL_R - 4, (PAL_R - 4) * .95, 0, 0, 6.283); x.ellipse(C.x, C.y, old - 4, (old - 4) * .95, 0, 0, 6.283); x.clip('evenodd');
  const tmp = document.createElement('canvas'); tmp.width = WW; tmp.height = WH; const tx = tmp.getContext('2d'); tx.drawImage(clearTex, 0, 0);
  tx.globalCompositeOperation = 'destination-out'; for (let X = 0; X < WW; X += 2) { const y = riverY(X); tx.fillRect(X, y - 16, 2, 32); } x.drawImage(tmp, 0, 0); x.restore();
  for (const b of BRIDGES) drawBridgeOn(x, b.x); drawBridgeOn(x, BRIDGE.x);
  for (const o of OBJ) if (o.tree !== undefined) { const dc = Math.hypot(o.x - C.x, (o.y - C.y) / .95); if (dc < PAL_R - 10) URBAN.add(o.tree); }
  placePalisade();
  if (old !== 212) sys(`Eryon cresceu! A paliçada foi ampliada.`);
}
// colisão
const treeGrid = new Map();
function indexBlockers() { for (const b of blockers) { const key = b.k === 'c' ? Math.floor(b.x / 32) + ',' + Math.floor(b.y / 32) : 'r'; if (!treeGrid.has(key)) treeGrid.set(key, []); treeGrid.get(key).push(b); } }
function blocked(x, y) {
  if (x < 4 || y < 10 || x > WW - 4 || y > WH - 4) return true;
  if (Math.abs(y - riverY(x)) < 10 && Math.abs(x - BRIDGE.x) > 7 && !BRIDGES.some(b => Math.abs(x - b.x) <= 7)) return true;
  const dx = x - C.x, dy = (y - C.y) / .95, r = Math.hypot(dx, dy);
  if (r > PAL_R - 3 && r < PAL_R + 3 && Math.abs(y - riverY(x)) >= 14) { const a = Math.atan2(dy, dx); if (Math.abs(Math.atan2(Math.sin(a - GATE_A), Math.cos(a - GATE_A))) > .07 && Math.abs(Math.atan2(Math.sin(a - SOUTH_A), Math.cos(a - SOUTH_A))) > .05) return true; }
  for (const b of treeGrid.get('r') || []) if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return true;
  for (const h of BUILT) { const hw = ((BTYPES[h.type] || BTYPES.casa).w) / 2; if (x > h.x - hw && x < h.x + hw && y > h.y - 10 && y < h.y) return true; }
  if (decorBlocked(x, y)) return true;
  for (const n of NODES) if (n.kind === 'rock' && !DEPL.has(n.id) && Math.hypot(x - n.x, (y - n.y + 2) * 1.6) < 6 + n.s) return true;
  const gx0 = Math.floor(x / 32), gy0 = Math.floor(y / 32);
  for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (const b of treeGrid.get((gx0 + a) + ',' + (gy0 + c)) || []) if (!(b.tree !== undefined && (CUT.has(b.tree) || URBAN.has(b.tree))) && Math.hypot(x - b.x, (y - b.y) * 1.4) < b.r) return true;
  return false;
}

// ---------------------------------------------------------------- estado do jogo
let token = store.get('eryon_token'), me = null, myLook = null, ws = null, myId = 0;
const players = new Map();           // id -> {username, look, x, y, tx, ty, face, moving, say, sayT}
const keys = new Set(); let target = null;
const cv = $('game'), ctx = cv.getContext('2d');
let DPR = 1, S = 4;
function resize() { DPR = Math.min(window.devicePixelRatio || 1, 3); cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR); ctx.imageSmoothingEnabled = false; baseS = Math.max(2, Math.round(Math.min(cv.width / 150, cv.height / 250))); applyZoom(); }
let baseS = 4, zoomMul = 1;
function applyZoom() { const smin = Math.max(1, Math.ceil(cv.width / 700), Math.ceil(cv.height / 1250)); S = clamp(Math.round(baseS * zoomMul), smin, baseS * 3); }
function setZoom(z) { zoomMul = clamp(z, .3, 3); applyZoom(); }
addEventListener('resize', resize); resize();
const [view, vx] = canvas(Math.ceil(4000 / 2) + 4, Math.ceil(4000 / 2) + 4);
const [light, lx] = canvas(view.width, view.height);

// ---------------------------------------------------------------- login e aparência
function showErr(m) { $('err').textContent = m || ''; }
let verifyOn = false, openOn = false, postUrl = '', pollT = null;
fetch('/api/config').then(r => r.json()).then(c => { openOn = !!c.open; verifyOn = !!c.verify; postUrl = c.postUrl || ''; if (openOn) { $('enter').textContent = 'Entrar em Eryon'; $('haveCode').hidden = false; $('sub').innerHTML = 'A cidade dos seguidores.<br>Digite o seu @ do Instagram e entre.'; } else if (!verifyOn) showCode(true); }).catch(() => showCode(true));
function showCode(on) { $('codeRow').hidden = !on; $('haveCode').hidden = on || !(verifyOn || openOn); $('enter').textContent = on ? 'Entrar em Eryon' : 'Continuar';
  $('sub').innerHTML = on ? 'A cidade dos seguidores.<br>Entre com o seu @ e o código que você recebeu.' : 'A cidade dos seguidores.<br>Digite o seu @ do Instagram para entrar.'; }
$('haveCode').onclick = () => showCode(true);
const post = (p, b) => API(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
$('enter').onclick = async () => {
  const username = $('user').value.trim(); if (!username) return showErr('Digite o seu @.');
  showErr(''); $('enter').disabled = true;
  if (!$('codeRow').hidden) {                       // entrada com código (reserva)
    const code = $('code').value; if (!code) { $('enter').disabled = false; return showErr('Digite o código.'); }
    const r = await post('/api/login', { username, code }); $('enter').disabled = false;
    if (!r.ok) return showErr(r.data.error || 'Não foi possível entrar.');
    token = r.data.token; store.set('eryon_token', token); store.set('eryon_name', r.data.username); return afterLogin(r.data);
  }
  if (openOn) {                                      // entrada livre
    const j = await post('/api/join', { username }); $('enter').disabled = false;
    if (j.ok) { token = j.data.token; store.set('eryon_token', token); return afterLogin(j.data); }
    if (j.data.reserved) showCode(true);
    return showErr(j.data.error || 'Não foi possível entrar.');
  }
  const r = await post('/api/start', { username }); $('enter').disabled = false;   // verificação pelo comentário
  if (!r.ok) return showErr(r.data.error || 'Não foi possível começar.');
  $('loginCard').hidden = true; $('verifyCard').hidden = false; $('word').textContent = r.data.word;
  const link = r.data.postUrl || postUrl; $('openPost').hidden = !link; if (link) $('openPost').href = link;
  $('vstatus').textContent = 'Esperando o seu comentário…'; $('vstatus').className = 'sub wait';
  clearInterval(pollT);
  pollT = setInterval(async () => {
    const c = await post('/api/check', { id: r.data.id });
    if (c.ok && c.data.token) { clearInterval(pollT); token = c.data.token; store.set('eryon_token', token); $('verifyCard').hidden = true; $('loginCard').hidden = false; return afterLogin(c.data); }
    if (!c.ok) { clearInterval(pollT); $('vstatus').className = 'sub'; $('vstatus').textContent = c.data.error || 'Algo deu errado. Volte e tente de novo.'; return; }
    if (c.data.problem) $('vstatus').textContent = 'Ainda procurando… (o Instagram pode levar até 1 minuto para mostrar o comentário)';
  }, 5000);
};
$('copyWord').onclick = async () => { try { await navigator.clipboard.writeText($('word').textContent); $('copyWord').textContent = 'Copiado!'; } catch { } setTimeout(() => $('copyWord').textContent = 'Copiar', 1500); };
$('back').onclick = () => { clearInterval(pollT); $('verifyCard').hidden = true; $('loginCard').hidden = false; };
$('code').addEventListener('keydown', e => { if (e.key === 'Enter') $('enter').click(); });
$('user').addEventListener('keydown', e => { if (e.key === 'Enter') $('enter').click(); });
// entrada direta: o jogo abre na hora como visitante (dá para trocar para o seu @ depois)
const randLook = () => ({ hair: HAIRS[Math.floor(Math.random() * HAIRS.length)], shirt: SHIRTS[Math.floor(Math.random() * SHIRTS.length)], pants: PANTS[Math.floor(Math.random() * PANTS.length)] });
// lembra o @ e o avatar neste aparelho: mesmo que o servidor reinicie, a pessoa volta igual
function remember() { if (me) store.set('eryon_name', me); if (myLook) store.set('eryon_look', JSON.stringify(myLook)); }
function savedLook() { try { return JSON.parse(store.get('eryon_look') || 'null'); } catch { return null; } }
async function rejoin() {
  const name = store.get('eryon_name'); if (!name) return false;
  for (let i = 0; i < 3; i++) {
    const r = await post('/api/join', { username: name });
    if (r.ok) { token = r.data.token; store.set('eryon_token', token); me = r.data.username; myLook = r.data.look || savedLook(); if (myLook && !r.data.look) await post('/api/look', { token, look: myLook }); remember(); start(); return true; }
    if (r.data && r.data.reserved) { $('user').value = name; showCode(true); $('login').hidden = false; return true; }
    if (!(r.data && /já está/.test(r.data.error || ''))) break; await new Promise(z => setTimeout(z, 3000));   // a conexão antiga ainda está fechando
  }
  return false;
}
async function quickJoin() {
  if (await rejoin()) return;
  for (let i = 0; i < 5; i++) {
    const r = await post('/api/join', { username: 'visitante' + Math.floor(1000 + Math.random() * 9000) });
    if (r.ok) { token = r.data.token; store.set('eryon_token', token); myLook = savedLook() || randLook(); await post('/api/look', { token, look: myLook }); me = r.data.username; remember(); start(); return openAvatar(true); }
    if (r.data && r.data.error && !/já está/.test(r.data.error)) break;
  }
  $('login').hidden = false;
}
$('nameBtn').onclick = () => { $('nameBtn').hidden = true; $('nameForm').hidden = false; $('newName').focus(); };
$('newName').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('nameOk').click(); });
$('nameOk').onclick = async () => {
  const username = $('newName').value.trim(); if (!username) return;
  const r = await post('/api/join', { username });
  if (!r.ok) { sys(r.data.error || 'Não foi possível usar esse @.'); return; }
  const old = players.get(myId); if (old) store.set('eryon_pos', JSON.stringify({ x: old.x, y: old.y }));
  token = r.data.token; store.set('eryon_token', token); me = r.data.username;
  if (r.data.look) myLook = r.data.look; else if (myLook) await post('/api/look', { token, look: myLook });
  $('nameForm').hidden = true; $('nameBtn').hidden = false; $('menu').hidden = true; remember(); sys('Agora você é @' + me);
  reconnectNow = true; if (ws) ws.close();
};
let reconnectNow = false;
function afterLogin(d) {
  me = d.username; myLook = d.look; remember();
  if (!myLook && !NAMED[me]) return pickLook();
  start();
}
function pickLook() {
  $('loginCard').hidden = true; $('verifyCard').hidden = true; $('lookCard').hidden = false;
  myLook = { hair: HAIRS[Math.floor(Math.random() * HAIRS.length)], shirt: SHIRTS[Math.floor(Math.random() * SHIRTS.length)], pants: PANTS[0] };
  const mk = (el, list, key) => { el.innerHTML = ''; list.forEach(c => { const b = document.createElement('div'); b.className = 'sw' + (myLook[key] === c ? ' on' : ''); b.style.background = c; b.onclick = () => { myLook[key] = c; mk(el, list, key); preview(); }; el.appendChild(b); }); };
  mk($('swHair'), HAIRS, 'hair'); mk($('swShirt'), SHIRTS, 'shirt'); mk($('swPants'), PANTS, 'pants'); preview();
  $('lookOk').onclick = async () => { const r = await API('/api/look', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, look: myLook }) }); if (r.ok) myLook = r.data.look; start(); };
}
function preview() { const c = $('preview'), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 14, 17); builders.clear(); const fr = charFor('_preview', myLook).frame({ legs: 'stand', arm: 'down', eyes: 0, br: 0 }); x.drawImage(fr.c, -8, -16); }

// ---------------------------------------------------------------- conexão
function connect() {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', token }));
  ws.onmessage = ev => { const m = JSON.parse(ev.data);
    if (m.t === 'welcome') { myId = m.id; players.clear(); CUT.clear(); (m.cut || []).forEach(i => CUT.add(i)); setInv(m.inv || {}); DEPL.clear(); (m.dep || []).forEach(i => DEPL.add(i)); DECOR = m.decor || []; setBuilt(m.houses || []); FOUND = new Set(m.found || []); updFound(); addBridges(m.bridges || []); if (m.lunch) lunch = { ...m.lunch, until: Date.now() + m.lunch.left }; addPlayer(m.me, true); m.players.forEach(p => addPlayer(p)); $('chatlog').innerHTML = ''; m.chat.forEach(logChat); $('online').textContent = m.players.length + 1; }
    else if (m.t === 'join') { addPlayer(m.p); if (!$('plist').hidden) renderList(); sys(`@${m.p.username} chegou em Eryon`); }
    else if (m.t === 'leave') { const p = players.get(m.id); if (p) sys(`@${p.username} saiu`); players.delete(m.id); }
    else if (m.t === 'state') { $('online').textContent = m.online; for (const s of m.p) { if (s.id === myId) continue; const p = players.get(s.id); if (p) { if ((p.room || '') !== (s.room || '')) { p.x = s.x; p.y = s.y; } p.tx = s.x; p.ty = s.y; p.face = s.face; p.moving = s.moving; p.room = s.room || ''; p.carry = !!s.carry; } } }
    else if (m.t === 'act') { const p = players.get(m.id); if (p && !p.mine) { const t0 = performance.now() / 1000; p.act = { kind: m.kind, t0, end: t0 + (ACT_DUR[m.kind] || 1.5) }; const me2 = players.get(myId); if (me2 && (me2.room || '') === (p.room || '') && Math.hypot(me2.x - p.x, me2.y - p.y) < 120) actSound(m.kind); } }
    else if (m.t === 'trees') { CUT.clear(); m.cut.forEach(i => CUT.add(i)); }
    else if (m.t === 'houses') setBuilt(m.list);
    else if (m.t === 'bridges') addBridges(m.list);
    else if (m.t === 'inv') setInv(m.inv);
    else if (m.t === 'found') { FOUND = new Set(m.list || []); updFound(); }
    else if (m.t === 'nodes') { DEPL.clear(); m.dep.forEach(i => DEPL.add(i)); }
    else if (m.t === 'decor') DECOR = m.list || [];
    else if (m.t === 'lunch') onLunch(m);
    else if (m.t === 'note') sys(m.text);
    else if (m.t === 'wood') { wood = m.n; showWood(); }
    else if (m.t === 'look') { const p = players.get(m.id); if (p) { p.look = m.look; p.ch = charFor(p.username, m.look); if (p.mine) { myLook = m.look; remember(); skillLabel(); } } }
    else if (m.t === 'chat') { const p = players.get(m.id); if (p) { p.say = m.text; p.sayT = performance.now(); } logChat(m); } };
  ws.onclose = ev => { if (ev.code === 4001) { store.del('eryon_token'); location.reload(); return; } if (ev.code === 4002) { sys('Você entrou em outro aparelho.'); return; } const wait = reconnectNow ? 50 : 2000; reconnectNow = false; setTimeout(connect, wait); };
}
function addPlayer(p, mine) { players.set(p.id, { ...p, room: p.room || '', ph: p.id % 97, tx: p.x, ty: p.y, mine: !!mine, ch: charFor(p.username, p.look) }); }
function logChat(m) { const d = document.createElement('div'); const b = document.createElement('b'); b.textContent = '@' + m.username + ': '; d.appendChild(b); d.appendChild(document.createTextNode(m.text)); pushLog(d); }
function sys(t) { const d = document.createElement('div'); d.style.color = '#9ff3ff'; d.textContent = t; pushLog(d); }
function pushLog(d) { const l = $('chatlog'); l.appendChild(d); while (l.children.length > 6) l.firstChild.remove(); setTimeout(() => { d.style.transition = 'opacity 1s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 1000); }, 15000); }
function sendChat() { const t = $('msg').value.trim(); if (!t || !ws || ws.readyState !== 1) return; ws.send(JSON.stringify({ t: 'chat', text: t })); $('msg').value = ''; $('msg').blur(); }
$('sendBtn').onclick = sendChat; $('msg').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); e.stopPropagation(); });

// ---------------------------------------------------------------- controles
addEventListener('keydown', e => { sndStart(); if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return; if (e.key === 'Enter') { $('msg').focus(); e.preventDefault(); return; }
  const k = e.key.toLowerCase(); if (k === 'e' || k === ' ') { e.preventDefault(); doContext(); return; } if (k === 'q') { doSkill(); return; } if (k === 'c') { openPanel('craft'); return; } if (k === 'i') { openPanel('bag'); return; } if (k === 'm') { $('foundBtn').click(); return; } if (k === 'escape') { closePanels(); return; }
  keys.add(k); target = null; if (cam.mode !== 'follow') follow(); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
const cam = { L: 0, T: 0, mode: 'follow', x: C.x, y: C.y, watch: null };
const ptrs = new Map(); let drag = null, pinch0 = 0, zoom0 = 1;
cv.addEventListener('pointerdown', e => { sndStart(); if (!me) return; $('msg').blur(); cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, moved: false, cx: cam.L + cv.width / S / 2, cy: cam.T + cv.height / S / 2 };
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoomMul; if (drag) drag.moved = true; } });
cv.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 0) setZoom(zoom0 * d / pinch0); return; }
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) > 8) drag.moved = true;
  if (drag.moved) { cam.mode = 'free'; cam.watch = null; cam.x = drag.cx - dx * DPR / S; cam.y = drag.cy - dy * DPR / S; showRecenter(); } });
const endPtr = e => { const was = drag; ptrs.delete(e.pointerId); if (ptrs.size === 0) { if (was && !was.moved) { target = { x: cam.L + (e.clientX * DPR) / S, y: cam.T + (e.clientY * DPR) / S }; follow(); } drag = null; pinch0 = 0; } };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); drag = null; });
cv.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoomMul * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });
function follow() { cam.mode = 'follow'; cam.watch = null; showRecenter(); }
function showRecenter() { $('recenter').hidden = cam.mode === 'follow'; }
$('recenter').onclick = follow; $('zin').onclick = () => setZoom(zoomMul * 1.25); $('zout').onclick = () => setZoom(zoomMul / 1.25);
// lista de quem está online
$('onlineBtn').onclick = () => { const l = $('plist'); l.hidden = !l.hidden; if (!l.hidden) renderList(); };
function renderList() { const l = $('plist'); l.innerHTML = ''; const arr = [...players.values()].sort((a, b) => (b.mine - a.mine) || a.username.localeCompare(b.username));
  for (const q of arr) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pl'; b.textContent = '@' + q.username + (q.mine ? ' (você)' : '');
    b.onclick = () => { if (q.mine) follow(); else { cam.mode = 'watch'; cam.watch = q.id; showRecenter(); } $('plist').hidden = true; }; l.appendChild(b); } }

// ---------------------------------------------------------------- loop
let last = performance.now(), sendT = 0, lastSent = '', stepT = 0, revT = 1;
function start() {
  if (me && !/^visitante\d+$/.test(me)) $('nameBtn').textContent = '@' + me;
  $('login').style.display = 'none'; $('hud').style.display = 'flex'; $('camctl').style.display = 'flex'; $('chatlog').style.display = 'flex'; $('chatbar').style.display = 'flex';
  DOORS = doorsOutside(); $('actbar').style.display = 'flex'; skillLabel(); fogInit(me); updFound(); connect(); requestAnimationFrame(loop);
}
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  const p = players.get(myId);
  if (p) {
    let ix = 0, iy = 0;
    if (keys.has('arrowleft') || keys.has('a')) ix--; if (keys.has('arrowright') || keys.has('d')) ix++;
    if (keys.has('arrowup') || keys.has('w')) iy--; if (keys.has('arrowdown') || keys.has('s')) iy++;
    if (!ix && !iy && target) { const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy); if (d < 2) target = null; else { ix = dx / d; iy = dy / d; } }
    if (p.act && t < p.act.end) { ix = 0; iy = 0; target = null; }
    const blk0 = (x2, y2) => p.room ? roomBlocked(p.room, x2, y2) : blocked(x2, y2);
    const stuck = blk0(p.x, p.y), blk = (x2, y2) => !stuck && blk0(x2, y2);
    const len = Math.hypot(ix, iy) || 1, sp = 44 * dt, mx = ix / len * sp, my = iy / len * sp;
    let moved = false;
    if (mx && !blk(p.x + mx, p.y)) { p.x += mx; moved = true; }
    if (my && !blk(p.x, p.y + my)) { p.y += my; moved = true; }
    if (p.room && moved && iy > 0) { const r = roomOf(p.room); if (p.y > r.door.y + 1 && Math.abs(p.x - r.door.x) < 10) exitRoom(p); }
    if (moved) { stepT += dt; if (stepT > .34) { stepT = 0; sfx.step(!!p.room); } } else stepT = .3;
    updateContext(p, t);
    if (!p.room && fogKey) { revT += dt; if (revT > .25) { revT = 0; revealAt(p.x, p.y, 72); checkDiscover(p); } }
    setFireLevel(p.room ? (p.room === 'taverna' ? .7 : 0) : 1 - Math.hypot(p.x - C.x, p.y - C.y) / 110);
    if ((ix || iy) && !moved) target = null;
    p.moving = moved; if (ix) p.face = ix < 0 ? -1 : 1;
    sendT += dt; const sig = `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.face},${p.moving},${p.room},${p.carry}`;
    if (sendT > .1 && sig !== lastSent && ws && ws.readyState === 1) { ws.send(JSON.stringify({ t: 'move', x: p.x, y: p.y, face: p.face, moving: p.moving, room: p.room || '', carry: !!p.carry })); lastSent = sig; sendT = 0; }
  }
  for (const q of players.values()) if (!q.mine) { q.x += (q.tx - q.x) * Math.min(1, dt * 12); q.y += (q.ty - q.y) * Math.min(1, dt * 12); }
  draw(t, p);
  requestAnimationFrame(loop);
}
function draw(t, p) {
  const myRoom = p ? (p.room || '') : '', room = myRoom ? roomOf(myRoom) : null;
  const MW = room ? room.w : WW, MH = room ? room.h : WH;
  const vw = cv.width / S, vh = cv.height / S;
  let cx = p ? p.x : C.x, cy = p ? p.y - 8 : C.y;
  if (!room) { if (cam.mode === 'free') { cx = cam.x; cy = cam.y; } else if (cam.mode === 'watch') { const w = players.get(cam.watch); if (w && !w.room) { cx = w.x; cy = w.y - 8; } else follow(); } }
  const fit = (c, v, M) => v >= M ? M / 2 : clamp(c, v / 2, M - v / 2);
  cx = fit(cx, vw, MW); cy = fit(cy, vh, MH); if (!room) { cam.x = cx; cam.y = cy; }
  const L = cx - vw / 2, T = cy - vh / 2, li = Math.floor(L), ti = Math.floor(T), cw = Math.ceil(vw) + 2, ch = Math.ceil(vh) + 2;
  cam.L = L; cam.T = T;
  const x = vx; x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#060b0a'; x.fillRect(0, 0, cw, ch);
  if (room) { x.translate(-li, -ti); x.drawImage(room.img, 0, 0); }
  else { x.drawImage(villageLayer, li, ti, cw, ch, 0, 0, cw, ch); x.translate(-li, -ti); }
  // objetos ordenados por y (cenário + jogadores da mesma sala)
  const list = [];
  if (!room) {
    for (const o of OBJ) if (o.x > li - 40 && o.x < li + cw + 40 && o.y > ti - 10 && o.y < ti + ch + 50) list.push(o);
    list.push({ y: C.y + 1, fire: true });
  }
  for (const q of players.values()) if ((q.room || '') === myRoom) list.push({ y: q.y, pl: q });
  if (!room) { for (const n of NODES) if (n.x > li - 20 && n.x < li + cw + 20 && n.y > ti - 10 && n.y < ti + ch + 20) list.push({ y: n.y, node: n }); for (const d of DECOR) if (d.x > li - 30 && d.x < li + cw + 30 && d.y > ti - 10 && d.y < ti + ch + 30) list.push({ y: d.y, decor: d }); }
  if (!room) for (const h of BUILT) if (h.x > li - 40 && h.x < li + cw + 40 && h.y > ti - 10 && h.y < ti + ch + 40) list.push({ y: h.y, built: h });
  list.sort((a, b) => a.y - b.y);
  for (const o of list) {
    if (o.fire) { drawFire(x, C.x, C.y + 1, t); continue; }
    if (o.pl) { const q = o.pl; drawCharAt(x, q.ch, q.x, q.y, poseFor(q, t), q.face || 1); continue; }
    if (o.lm) { drawLandmark(x, o.lm, t); continue; }
    if (o.node) { drawNode(x, o.node); continue; }
    if (o.decor) { drawDecor(x, o.decor, t); continue; }
    if (o.built) { const h = o.built, spr = buildingSprite(h.type || 'casa', h.roof || 0), k = clamp((Date.now() - h.t) / 3000), X = h.x - Math.floor(spr.width / 2) + 2, Y = h.y - spr.height + 3;
      if (k < .35) { const hh = Math.max(1, Math.round(FRAME_SPR.height * k / .35)); x.drawImage(FRAME_SPR, 0, FRAME_SPR.height - hh, FRAME_SPR.width, hh, X, Y + FRAME_SPR.height - hh, FRAME_SPR.width, hh); }
      else { if (k < 1) x.drawImage(FRAME_SPR, X, Y); const hh = Math.max(1, Math.round(spr.height * Math.min(1, (k - .35) / .65))); x.drawImage(spr, 0, spr.height - hh, spr.width, hh, X, Y + spr.height - hh, spr.width, hh); }
      if (k < 1) burst(x, t, t - (Date.now() - h.t) / 1000 + 2.9, h.x, h.y - 2, 24, [P.st3, P.st4, P.wallD], 22, .9, 10, h.id * 7);
      continue; }
    if (o.tree !== undefined && URBAN.has(o.tree)) continue;
    if (o.tree !== undefined && CUT.has(o.tree)) { px(x, P.ink, o.x - 3, o.y - 4, 7, 5); px(x, P.wood, o.x - 2, o.y - 3, 5, 3); px(x, P.woodL, o.x - 2, o.y - 3, 5, 1); continue; }
    x.drawImage(o.img, o.dx, o.dy);
  }
  for (const q of players.values()) if ((q.room || '') === myRoom) drawActFx(x, q, t);
  if (room && room.fire) { drawFire(x, room.fire.x, room.fire.y, t); glow(x, room.fire.x, room.fire.y - 6, 18, P.fire2, .12); }
  if (!room) { drawAmbient(x, t, li, ti, cw, ch); drawCloudShadows(x, t, li, ti, cw, ch); }
  if (!room && B.forja) { x.globalAlpha = .6 + .4 * h2(Math.floor(t * 10), 2); px(x, P.fire1, B.forja.x - 7, B.forja.y - 10, 12, 8); px(x, P.fire3, B.forja.x - 5, B.forja.y - 8, 8, 5); x.globalAlpha = 1; smoke(x, B.forja.x + 11, B.forja.y - 30, t, 6); }
  if (target) { x.globalAlpha = .7; ring(x, target.x, target.y, 3 + (Math.floor(t * 4) % 2), P.fire3); x.globalAlpha = 1; }
  // luz
  const l = lx; l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, cw, ch);
  const AMB = ambient(), NIGHT = room ? 0 : AMB.night, LB = 1 + NIGHT * .6;
  l.fillStyle = room ? (room.dark ? 'rgba(2,4,8,.62)' : 'rgba(20,10,4,.28)') : `rgba(${AMB.r},${AMB.g},${AMB.b},${AMB.a.toFixed(3)})`; l.fillRect(0, 0, cw, ch); l.translate(-li, -ti); l.globalCompositeOperation = 'destination-out';
  if (room) { if (room.fire) lightHole(l, room.fire.x, room.fire.y, 60); if (room.dark) { for (const [gx2, gy2] of room.glows) lightHole(l, gx2, gy2, 22); } else lightHole(l, room.w / 2, room.h / 2, Math.max(room.w, room.h) * .45); }
  else { lightHole(l, C.x, C.y, 46 + Math.round(Math.sin(t * 9))); if (B.forja) lightHole(l, B.forja.x, B.forja.y - 8, 24); if (B.taverna) lightHole(l, B.taverna.x, B.taverna.y - 10, 28);
    for (const id of ['casa_1', 'casa_2', 'casa_3', 'casa_4', 'casa_5', 'casa_6', 'casa_7', 'casa_8', 'casa_9']) if (B[id]) lightHole(l, B[id].x, B[id].y - 6, Math.round(16 * LB)); }
  if (!room) { for (const lm of LANDMARKS) if (LM_LIGHT[lm.id]) lightHole(l, lm.x, lm.y - 10, LM_LIGHT[lm.id]); for (const h of BUILT) lightHole(l, h.x, h.y - 6, Math.round(16 * LB)); for (const d of DECOR) if (DECOR_LIGHT[d.kind]) lightHole(l, d.x, d.y - 8, DECOR_LIGHT[d.kind]); }
  if (p) lightHole(l, p.x, p.y - 6, Math.round(22 + NIGHT * 10));
  l.globalCompositeOperation = 'source-over';
  x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(light, 0, 0, cw, ch, 0, 0, cw, ch);
  if (!room && NIGHT > .05) { x.translate(-li, -ti); glow(x, C.x, C.y - 4, 24, P.fire2, .06 * NIGHT); for (const id of ['casa_1', 'casa_2', 'casa_3', 'casa_4', 'casa_5', 'casa_6', 'casa_7', 'casa_8', 'casa_9']) if (B[id]) glow(x, B[id].x, B[id].y - 8, 8, P.fire3, .07 * NIGHT); for (const h of BUILT) glow(x, h.x, h.y - 8, 8, P.fire3, .07 * NIGHT); x.setTransform(1, 0, 0, 1, 0, 0); }
  if (room && room.dark) { x.translate(-li, -ti); for (const [gx2, gy2, gc] of room.glows) glow(x, gx2, gy2, 10, gc, .14); x.setTransform(1, 0, 0, 1, 0, 0); }
  // mundo aberto (sem névoa)
  // saída ampliada
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#060b0a'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(view, 0, 0, cw, ch, Math.round(-(L - li) * S), Math.round(-(T - ti) * S), cw * S, ch * S);
  drawVignette();
  // nomes e balões (só de quem está no mesmo lugar)
  const fs = Math.round(15 * DPR), now = performance.now();
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineJoin = 'round';
  if (room) { ctx.font = `700 ${Math.round(fs * 1.1)}px Pix, monospace`; ctx.lineWidth = Math.max(3, fs / 4); ctx.strokeStyle = '#140e06'; const ty = Math.max(fs * 3, Math.round((0 - T) * S) - 6); ctx.strokeText(room.name, cv.width / 2, ty); ctx.fillStyle = '#ffd84a'; ctx.fillText(room.name, cv.width / 2, ty); }
  for (const q of players.values()) {
    if ((q.room || '') !== myRoom) continue;
    const sx = Math.round((q.x - L) * S), sy = Math.round((q.y - T - (q.ch.sp.big ? 22 : 17)) * S);
    if (sx < -200 || sx > cv.width + 200 || sy < -100 || sy > cv.height + 100) continue;
    ctx.font = `700 ${fs}px Pix, monospace`; ctx.lineWidth = Math.max(3, fs / 4); ctx.strokeStyle = '#140e06';
    const nm = '@' + q.username; ctx.strokeText(nm, sx, sy); ctx.fillStyle = q.mine ? '#ffd84a' : '#ffffff'; ctx.fillText(nm, sx, sy);
    const role = NAMED[q.username]?.role || classOf(q)?.name; if (role) { ctx.font = `700 ${Math.round(fs * .72)}px Pix, monospace`; ctx.strokeText(role.toUpperCase(), sx, sy + fs * .8); ctx.fillStyle = '#ffd84a'; ctx.fillText(role.toUpperCase(), sx, sy + fs * .8); }
    if (q.say && now - q.sayT < 6000) bubble(q.say, sx, sy - fs * 1.2, fs);
  }
}
// ---------------------------------------------------------------- ações e portas
let ctxAct = null;
function updateContext(p, t) {
  let c = null;
  if (p.room) {
    const r = roomOf(p.room);
    for (const s of r.spots) if (Math.abs(p.x - s.x) < s.rx && Math.abs(p.y - s.y) < s.ry) c = s.node && DEPL.has(s.node) ? { kind: 'none', label: 'Volta a crescer logo' } : { kind: s.kind, label: s.label, node: s.node };
    if (!c) c = { kind: 'exit', label: 'Sair' };
  } else {
    for (const d of DOORS) if (Math.hypot(p.x - d.x, p.y - d.y) < 10) c = { kind: 'enter', label: d.label, room: d.room };
    if (!c && B.serraria && Math.hypot(p.x - (B.serraria.x + 18), p.y - (B.serraria.y + 8)) < 18) c = { kind: 'split', label: 'Rachar lenha' };
    const kit = B.cozinha, nearKit = kit && Math.hypot(p.x - kit.x, p.y - (kit.y + 8)) < 24, lunchOn = lunch && Date.now() < lunch.until;
    if (!c && nearKit) c = lunchOn ? { kind: 'eat', label: 'Comer o almoço' } : { kind: 'lunch', label: 'Cozinhar e chamar para o almoço' };
    if (!c) { const dr = Math.abs(p.y - riverY(p.x)); if (dr > 9 && dr < 20 && Math.abs(p.x - BRIDGE.x) > 30 && !BRIDGES.some(b => Math.abs(p.x - b.x) < 30)) c = wood >= 15 ? { kind: 'bridge', label: 'Construir ponte (15 lenha)' } : { kind: 'none', label: 'Ponte: junte 15 lenhas' }; }
    if (!c) { let best = 14, bn = null; for (const n of NODES) { if (DEPL.has(n.id)) continue; const d = Math.hypot(p.x - n.x, (p.y - n.y) * 1.2); if (d < best) { best = d; bn = n; } } if (bn) c = bn.kind === 'rock' ? { kind: 'mine', label: 'Quebrar pedra', node: bn.id, tx: bn.x } : { kind: 'herb', label: 'Colher ervas', node: bn.id, tx: bn.x }; }
    if (!c) { const d = DECOR.find(d => d.owner === me && Math.hypot(p.x - d.x, p.y - d.y) < 14); if (d) c = { kind: 'pickup', label: 'Recolher ' + ((RBY[d.kind] || {}).name || 'objeto'), id: d.id }; }
    if (!c && canBuildAt(p)) c = { kind: 'buildmenu', label: 'Construir aqui…' };
    if (!c) { let best = 13, bt = null; for (const tr of TREE_POS) { if (CUT.has(tr.i)) continue; const d = Math.hypot(p.x - tr.x, (p.y - tr.y) * 1.2); if (d < best) { best = d; bt = tr; } } if (bt) c = { kind: 'chop', label: 'Derrubar árvore', tree: bt.i, tx: bt.x }; }
  }
  const key = c ? c.kind + c.label + (c.tree ?? '') + (c.node ?? '') + (c.id ?? '') : '';
  if (key !== (ctxAct ? ctxAct.key : '')) { ctxAct = c ? { ...c, key } : null; $('actBtn').hidden = !c; if (c) $('actBtn').textContent = c.label + (TOUCH ? '' : '  [E]'); }
}
function doContext() { const p = players.get(myId); if (!p || !ctxAct) return; const c = ctxAct;
  if (c.kind === 'enter') { sfx.door(true); const r = roomOf(c.room); p.room = c.room; p.x = r.spawn.x; p.y = r.spawn.y; target = null; follow(); sendNow(p); return; }
  if (c.kind === 'exit') return exitRoom(p);
  if (c.kind === 'none') return;
  if (c.kind === 'cmine' || c.kind === 'cherb') { const kind = c.kind === 'cmine' ? 'mine' : 'gather', node = c.node; doAct(kind); setTimeout(() => send({ t: 'gather', id: node }), ACT_DUR[kind] * 1000); return; }
  if (c.kind === 'mine' || c.kind === 'herb') { p.face = c.tx < p.x ? -1 : 1; const kind = c.kind === 'mine' ? 'mine' : 'gather', node = c.node; doAct(kind); setTimeout(() => send({ t: 'gather', id: node }), ACT_DUR[kind] * 1000); return; }
  if (c.kind === 'pickup') { send({ t: 'pickup', id: c.id }); return; }
  if (c.kind === 'bridge') { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'bridge', x: Math.round(p.x) })); doAct('build'); return; }
  if (c.kind === 'lunch') { doAct('cook'); if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'lunch' })); return; }
  if (c.kind === 'eat') { doAct('drink'); return; }
  if (c.kind === 'buildmenu') { closePanels(); $('buildPanel').hidden = false; renderBuild(); return; }
  if (c.kind === 'house') { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'build', x: Math.round(p.x) + 1, y: Math.round(p.y) - 6 })); doAct('build'); return; }
  if (c.kind === 'chop' && c.tx !== undefined) p.face = c.tx < p.x ? -1 : 1;
  doAct(c.kind, c.tree);
}
function doAct(kind, tree) {
  const p = players.get(myId); if (!p) return; const t = performance.now() / 1000; if (p.act && t < p.act.end) return;
  p.act = { kind, t0: t, end: t + ACT_DUR[kind] }; actSound(kind);
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'act', kind }));
  if (kind === 'chop' && tree !== undefined) setTimeout(() => { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'cut', tree })); sfx.fall(); }, ACT_DUR.chop * 1000);
}
function actSound(kind) {
  const rep = (fn, n, first, gap) => { for (let k = 0; k < n; k++) setTimeout(fn, first + k * gap); };
  if (kind === 'chop') rep(sfx.chop, 4, 320, 560); else if (kind === 'split') rep(sfx.split, 3, 320, 560); else if (kind === 'drink') sfx.drink(); else if (kind === 'magic') sfx.magic();
  else if (kind === 'sword') sfx.sword(); else if (kind === 'arrow') sfx.arrow(); else if (kind === 'hammer') rep(sfx.anvil, 4, 300, 500); else if (kind === 'build') rep(sfx.build, 5, 220, 400);
  else if (kind === 'mine') rep(() => play(pick('anvil_', 2), .45, .6), 4, 300, 500); else if (kind === 'gather') rep(() => sfx.step(false), 3, 200, 400);
  else if (kind === 'cook') sfx.pot(); else if (kind === 'heal') sfx.heal(); else if (kind === 'lute') sfx.lute(); else if (kind === 'serve') sfx.coins();
}
function exitRoom(p) { sfx.door(false); const r = roomOf(p.room); p.room = ''; p.x = r.outside.x; p.y = r.outside.y; target = null; follow(); sendNow(p); }
function doSkill() { const p = players.get(myId); const c = classOf(p); doAct(c ? c.skill : 'magic'); }
function skillLabel() { const p = players.get(myId), c = classOf(p); $('magicBtn').textContent = (c ? c.skillName : 'Magia') + (TOUCH ? '' : '  [Q]'); }
const TOUCH = matchMedia('(hover:none) and (pointer:coarse)').matches;
// casas construídas pelos jogadores
function setBuilt(list) { BUILT = Array.isArray(list) ? list : []; for (const k in ROOM_CACHE) if (k.startsWith('h_')) delete ROOM_CACHE[k];
  DOORS = doorsOutside().concat(BUILT.map(h => { const T = BTYPES[h.type] || BTYPES.casa; return { room: 'h_' + h.id, x: h.x + 1, y: h.y + 3, label: h.type === 'prefeitura' ? 'Entrar na Prefeitura' : `Entrar: ${T.name} de @${h.owner}` }; })); growCity(); }
function canBuildAt(p) {
  const X = p.x + 1, Y = p.y - 6; if (Math.hypot(X - C.x, Y - C.y) < 40) return false;
  for (let dx = -22; dx <= 22; dx += 7) for (let dy = -12; dy <= 0; dy += 6) if (blocked(X + dx, Y + dy)) return false;
  for (const d of DOORS) if (Math.abs(d.x - X) < 40 && Math.abs(d.y - Y) < 30) return false;
  for (const b of Object.values(B)) if (b && b.x !== undefined && Math.abs(b.x - X) < (b.w ? b.w / 2 + 16 : 32) && Math.abs(b.y - Y) < (b.h ? b.h / 2 + 16 : 28)) return false;
  if (Math.abs(Y - riverY(X)) < 24) return false;
  return true;
}
function sendNow(p) { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'move', x: p.x, y: p.y, face: p.face, moving: false, room: p.room || '' })); }
function showWood() { $('wood').textContent = `Lenha ${INV.lenha || 0} · Pedra ${INV.pedra || 0} · Ervas ${INV.ervas || 0}`; }
$('actBtn').onclick = () => { sndStart(); doContext(); };
$('magicBtn').onclick = () => { sndStart(); doSkill(); };
$('muteBtn').onclick = () => { sndStart(); const m = toggleMute(); $('muteBtn').innerHTML = (m ? MUTE_OFF : MUTE_ON) + (m ? ' Som desligado' : ' Som ligado'); $('muteBtn').title = m ? 'Ligar som' : 'Desligar som'; };
const MUTE_ON = '<svg width="22" height="22" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true"><path fill="#fff3b0" d="M1 4h2v3H1zM3 3h1v5H3zM4 2h1v7H4zM5 1h1v9H5zM7 4h1v3H7zM8 3h1v1H8zM8 7h1v1H8zM9 2h1v1H9zM9 8h1v1H9zM10 3h1v5h-1z"/></svg>';
const MUTE_OFF = '<svg width="22" height="22" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true"><path fill="#fff3b0" d="M1 4h2v3H1zM3 3h1v5H3zM4 2h1v7H4zM5 1h1v9H5z"/><path fill="#ff8a70" d="M7 3h1v1H7zM8 4h1v1H8zM9 5h1v1H9zM10 6h1v1h-1zM10 3h1v1h-1zM9 4h1v1H9zM8 6h1v1H8zM7 7h1v1H7z"/></svg>';
$('muteBtn').innerHTML = (SND.muted ? MUTE_OFF : MUTE_ON) + (SND.muted ? ' Som desligado' : ' Som ligado');
function bubble(text, sx, sy, fs) {
  ctx.font = `700 ${fs}px Pix, monospace`; const maxW = Math.min(cv.width * .6, fs * 16);
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; } if (cur) lines.push(cur);
  const lh = fs * 1.15, w = Math.max(...lines.map(l => ctx.measureText(l).width)) + fs, h = lines.length * lh + fs * .6, bx = Math.round(sx - w / 2), by = Math.round(sy - h), u = Math.max(2, Math.round(fs / 6));
  ctx.fillStyle = '#140e06'; ctx.fillRect(bx - u, by - u, w + u * 2, h + u * 2); ctx.fillRect(sx - u * 2, by + h, u * 4, u * 3);
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(bx, by, w, h); ctx.fillRect(sx - u, by + h, u * 2, u * 2);
  ctx.fillStyle = '#140e06'; ctx.textBaseline = 'top'; lines.forEach((l, i) => ctx.fillText(l, sx, by + fs * .3 + i * lh)); ctx.textBaseline = 'bottom';
}

// ---------------------------------------------------------------- início
fetch('world.json').then(r => r.json()).then(async w => {
  buildWorld(w); indexBlockers(); buildNodes(); await document.fonts.load('700 20px Pix');
  // tela de fundo atrás do login: a fogueira de Eryon
  (function idle(n) { if (me) return; draw(n / 1000, null); requestAnimationFrame(idle); })(performance.now());
  if (token) { const r = await API('/api/me?token=' + encodeURIComponent(token)); if (r.ok) { const sl = savedLook(); if (!r.data.look && sl) { await post('/api/look', { token, look: sl }); r.data.look = sl; } return afterLogin(r.data); } store.del('eryon_token'); token = null; }
  const cfg = await API('/api/config'); if (cfg.ok && cfg.data.open) return quickJoin();
  $('login').hidden = false;
});

// ---------------------------------------------------------------- editor de avatar
let draft = null, avT = 0;
function openAvatar(first) {
  draft = { hair: HAIRS[0], shirt: SHIRTS[1], pants: PANTS[0], skin: SKINS[0], longHair: false, beard: false, elfEars: false, hat: '', cape: '', cls: '', ...(myLook || {}) };
  $('avSkip').textContent = first ? 'Pular' : 'Cancelar'; $('avatar').hidden = false; buildAvatarUI(); avLoop();
}
function choice(id, opts, key) {
  const el = $(id); el.innerHTML = '';
  for (const [v, label] of opts) { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt' + (draft[key] === v ? ' on' : '');
    if (label === null) { b.className += ' sw'; b.style.background = v || 'transparent'; if (!v) b.textContent = '×'; b.setAttribute('aria-label', v || 'nenhum'); } else b.textContent = label;
    b.onclick = () => { draft[key] = v; choice(id, opts, key); }; el.appendChild(b); }
}
function classUI() {
  const el = $('avClass'); el.innerHTML = '';
  for (const c of CLASSES) { const b = document.createElement('button'); b.type = 'button'; b.className = 'cls' + (draft.cls === c.id ? ' on' : '');
    const cv2 = document.createElement('canvas'); cv2.width = 16; cv2.height = 18; cv2.className = 'clsimg'; const q2 = cv2.getContext('2d'); q2.imageSmoothingEnabled = false;
    q2.drawImage(charFor('_cls_' + c.id, { ...c.look, cls: c.id }).frame({ legs: 'stand', arm: 'down', tool: c.tool, eyes: 0, br: 0 }).c, -7, -14);
    const n = document.createElement('b'); n.textContent = c.name; const d = document.createElement('span'); d.textContent = c.desc; b.append(cv2, n, d);
    b.onclick = () => { draft = { ...draft, ...c.look, cls: c.id }; buildAvatarUI(); }; el.appendChild(b); }
}
function buildAvatarUI() {
  classUI();
  const sw = list => list.map(c => [c, null]);
  choice('avSkin', sw(SKINS), 'skin'); choice('avHair', sw(HAIRS), 'hair'); choice('avHairLen', [[false, 'Curto'], [true, 'Longo']], 'longHair');
  choice('avBeard', [[false, 'Sem barba'], [true, 'Com barba']], 'beard'); choice('avHat', HATS, 'hat'); choice('avEars', [[false, 'Humanas'], [true, 'Élficas']], 'elfEars');
  choice('avShirt', sw(SHIRTS), 'shirt'); choice('avPants', sw(PANTS), 'pants'); choice('avCape', sw(CAPES), 'cape');
}
function avLoop() { if ($('avatar').hidden) return; const c = $('avPrev'), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height);
  const ch = charFor('_avatar', draft), t = performance.now() / 1000, ph = Math.floor(t / 2) % 3, f = Math.floor(t * 6) % 2, cl = CLASS_BY[draft.cls];
  const fr = ph === 1 ? ch.frame({ legs: f ? 'w1' : 'w2', arm: 'down', tool: cl ? cl.tool : null, eyes: 0, br: 0 }) : ph === 2 && cl ? ch.frame(poseFor({ act: { kind: cl.skill, t0: Math.floor(t / 2) * 2, end: Math.floor(t / 2) * 2 + 2 } }, t)) : ch.frame({ legs: 'stand', arm: 'down', tool: cl ? cl.tool : null, eyes: Math.floor(t) % 3 - 1, br: Math.floor(t * 1.3) % 2 });
  x.drawImage(fr.c, -7, -14); requestAnimationFrame(avLoop); }
$('avatarBtn').onclick = () => openAvatar(false);
$('avSkip').onclick = () => { $('avatar').hidden = true; };
$('avSave').onclick = async () => { myLook = { ...draft }; remember(); $('avatar').hidden = true; const r = await post('/api/look', { token, look: myLook }); if (r.ok) { myLook = r.data.look; const p = players.get(myId); if (p) { p.look = myLook; p.ch = charFor(p.username, myLook); } skillLabel(); } };

// ---------------------------------------------------------------- carregar lenha e almoço
$('woodBox').onclick = () => openPanel('bag');
$('craftBtn').onclick = () => { sndStart(); openPanel('craft'); };
$('carryBtn').onclick = () => { const p = players.get(myId); if (!p) return; if (!p.carry && wood < 1) return sys('Você ainda não tem lenha.'); p.carry = !p.carry; renderBag(); };
$('bagClose').onclick = closePanels; $('craftClose').onclick = closePanels; $('buildClose').onclick = () => { $('buildPanel').hidden = true; };
function onLunch(m) {
  lunch = { username: m.username, until: Date.now() + (m.left || 120000) };
  sfx.bell(); sys(`🔔 @${m.username} chamou todo mundo para o almoço na cozinha!`);
  const p = players.get(myId); if (!p || m.username === me) return;
  $('toastText').textContent = `@${m.username} chamou para o almoço!`; $('toast').hidden = false; clearTimeout(onLunch.tm); onLunch.tm = setTimeout(() => $('toast').hidden = true, 15000);
}
$('toastGo').onclick = () => { $('toast').hidden = true; const p = players.get(myId); if (!p || !B.cozinha) return; if (p.room) exitRoom(p); target = { x: B.cozinha.x - 6, y: B.cozinha.y + 14 }; follow(); };
$('toastNo').onclick = () => { $('toast').hidden = true; };

// ---------------------------------------------------------------- mapa explorado
$('foundBtn').onclick = () => { closePanels(); $('mapPanel').hidden = false; drawMap(); };
$('mapClose').onclick = () => { $('mapPanel').hidden = true; };
function drawMap() {
  const c = $('mapCv'), x = c.getContext('2d'), k = c.width / WW; x.imageSmoothingEnabled = false;
  x.drawImage(villageLayer, 0, 0, c.width, c.height); x.globalAlpha = .55; for (const o of OBJ) if (o.tree !== undefined && !CUT.has(o.tree)) { x.fillStyle = '#1c3831'; x.fillRect(o.x * k - 1, o.y * k - 2, 3, 3); } x.globalAlpha = 1;
  x.font = '700 11px Pix, monospace'; x.textAlign = 'center';
  for (const l of LANDMARKS) if (FOUND.has(l.id)) { x.fillStyle = '#140e06'; x.fillRect(l.x * k - 3, l.y * k - 3, 7, 7); x.fillStyle = '#ffd84a'; x.fillRect(l.x * k - 2, l.y * k - 2, 5, 5); x.lineWidth = 3; x.strokeStyle = '#140e06'; x.strokeText(l.name, l.x * k, l.y * k - 6); x.fillStyle = '#fff3b0'; x.fillText(l.name, l.x * k, l.y * k - 6); }
  const p = players.get(myId); if (p && !p.room) { x.fillStyle = '#9ff3ff'; x.fillRect(p.x * k - 2, p.y * k - 2, 5, 5); }
  $('mapList').innerHTML = LANDMARKS.map(l => `<li class="${FOUND.has(l.id) ? 'f' : ''}">${FOUND.has(l.id) ? l.name : '???'}</li>`).join('');
}

// ---------------------------------------------------------------- ocultar o histórico do chat (os balões continuam)
// tela cheia: esconde botões e histórico; ficam o mapa, os balões e o campo de mensagem
let chatHidden = false; try { chatHidden = localStorage.getItem('eryon_clean') === '1'; } catch { }
const FS_ON = '<svg width="22" height="22" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true"><path fill="#fff3b0" d="M0 0h4v1H1v3H0zM7 0h4v4h-1V1H7zM0 7h1v3h3v1H0zM10 7h1v4H7v-1h3z"/></svg>';
const FS_OFF = '<svg width="22" height="22" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true"><path fill="#fff3b0" d="M3 0h1v4H0V3h3zM7 0h1v3h3v1H7zM0 7h4v4H3V8H0zM7 7h4v1H8v3H7z"/></svg>';
function applyChat() { document.body.classList.toggle('clean', chatHidden); $('chatToggle').innerHTML = chatHidden ? FS_OFF : FS_ON; $('chatToggle').setAttribute('aria-pressed', chatHidden ? 'true' : 'false'); $('chatToggle').title = chatHidden ? 'Sair da tela cheia' : 'Tela cheia: deixa só o campo de mensagem'; }
$('chatToggle').onclick = () => { chatHidden = !chatHidden; try { localStorage.setItem('eryon_clean', chatHidden ? '1' : '0'); } catch { }
  try { if (chatHidden && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); else if (!chatHidden && document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch { }
  applyChat(); };
applyChat();
// iPhone/iPad: o som só liga dentro de um toque completo (touchend/click)
for (const ev of ['touchend', 'click', 'keydown']) addEventListener(ev, () => sndStart(), { passive: true });

// ---------------------------------------------------------------- menu ☰ (tudo que não precisa ficar na tela)
function renderMe() {
  const p = players.get(myId); $('meName').textContent = '@' + (me || 'visitante'); const c = classOf(p); $('meRole').textContent = NAMED[me]?.role || (c ? c.name : 'Morador');
  $('wood').textContent = `Lenha ${INV.lenha || 0} · Pedra ${INV.pedra || 0} · Ervas ${INV.ervas || 0}`;
  const cv2 = $('meCv'), q2 = cv2.getContext('2d'); q2.imageSmoothingEnabled = false; q2.clearRect(0, 0, 16, 18); if (p) q2.drawImage(p.ch.frame({ legs: 'stand', arm: 'down', tool: (p.look && p.look.equipTool) || (c || {}).tool || null, eyes: 0, br: 0 }).c, -7, -14);
  $('nameBtn').textContent = me && !/^visitante\d+$/.test(me) ? 'Trocar meu @' : 'Usar meu @';
  $('meRole').textContent += ' · ' + phaseName() + ' em Eryon';
}
$('menuBtn').onclick = () => { const open = $('menu').hidden; closePanels(); $('menu').hidden = !open; $('menuBtn').setAttribute('aria-expanded', open); if (open) { renderMe(); $('nameForm').hidden = true; $('nameBtn').hidden = false; } };
$('menuClose').onclick = () => { $('menu').hidden = true; $('menuBtn').setAttribute('aria-expanded', 'false'); };
for (const id of ['avatarBtn', 'woodBox', 'craftBtn', 'foundBtn']) $(id).addEventListener('click', () => { $('menu').hidden = true; }, true);
