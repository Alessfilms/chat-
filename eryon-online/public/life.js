// =====================================================================
// ERYON ONLINE — vida na vila: interiores, ações e som
// (carregado depois de engine.js e antes de game.js)
// =====================================================================

// ---------------------------------------------------------------- interiores
const ROOM_CACHE = {};
function rectsBlock(list, x, y) { for (const [x0, y0, x1, y1] of list) if (x > x0 && x < x1 && y > y0 && y < y1) return true; return false; }
function planks(x, w, h, y0, a, b) {
  for (let y = y0; y < h; y += 6) { px(x, ((y - y0) / 6) % 2 ? a : b, 0, y, w, 6); px(x, '#2e1d16', 0, y, w, 1);
    for (let k = 0; k < w; k += 34) px(x, '#2e1d16', (k + (y * 7) % 34), y, 1, 6); }
  for (let i = 0; i < w * h / 400; i++) px(x, '#5a3a26', Math.floor(h2(i, 3) * w), y0 + Math.floor(h2(i, 9) * (h - y0)), 2, 1);
}
function tavernRoom() {
  const w = 200, h = 140, [c, x] = canvas(w, h);
  planks(x, w, h, 26, '#7a4f2e', '#6b4630');
  px(x, '#3a2618', 0, 0, w, 26); for (let k = 0; k < w; k += 28) px(x, '#2e1d16', k, 0, 4, 26); px(x, '#6e7a84', 0, 0, w, 3); px(x, P.ink, 0, 25, w, 2);
  for (const wx of [128, 152]) { px(x, P.ink, wx, 5, 14, 12); px(x, '#ffd84a', wx + 1, 6, 12, 10); px(x, '#fff3b0', wx + 2, 7, 4, 3); px(x, P.ink, wx + 7, 6, 1, 10); }
  // prateleiras com garrafas atrás do balcão
  for (const sy of [7, 15]) { px(x, '#2e1d16', 12, sy + 6, 96, 2); for (let k = 0; k < 22; k++) { const bx = 14 + k * 4, col = ['#3c5d4a', '#a83a32', '#f2a33a', '#6e4a8a', '#3f7ab0'][(k + sy) % 5]; px(x, col, bx, sy, 2, 6); px(x, '#fff3b0', bx, sy, 1, 1); } }
  // balcão
  px(x, P.ink, 8, 28, 104, 16); px(x, '#6b4630', 9, 33, 102, 10); px(x, '#a3794b', 9, 29, 102, 4); px(x, '#c9a46a', 9, 29, 102, 1);
  for (let k = 0; k < 6; k++) { const mx = 20 + k * 15; px(x, P.ink, mx - 1, 25, 5, 5); px(x, '#c9a46a', mx, 26, 3, 3); px(x, '#fff3b0', mx, 26, 3, 1); }
  // barris
  for (const by of [52, 70]) { disc(x, 8, by, 7, P.ink); disc(x, 8, by, 6, '#7a4f2e'); px(x, '#2b3138', 2, by - 3, 13, 1); px(x, '#2b3138', 2, by + 3, 13, 1); disc(x, 8, by, 2, '#4a2f22'); }
  // lareira
  px(x, P.ink, 166, 22, 34, 40); px(x, '#6e7a84', 167, 23, 32, 38); for (let y = 24; y < 60; y += 5) px(x, '#4a535c', 167 + (y % 10), y, 30, 1);
  px(x, P.ink, 174, 36, 18, 22); px(x, '#140808', 175, 37, 16, 21);
  // tapete
  px(x, '#5a2418', 66, 76, 68, 38); px(x, '#a83a32', 68, 78, 64, 34); for (let k = 0; k < 64; k += 6) px(x, '#d0622a', 68 + k, 80, 3, 30);
  // mesas e banquinhos
  const tables = [[56, 82], [146, 82], [56, 116], [146, 116]];
  for (const [tx, ty] of tables) { for (const [sx, sy] of [[-12, 0], [12, 0], [0, 10]]) { disc(x, tx + sx, ty + sy, 3, P.ink); disc(x, tx + sx, ty + sy, 2, '#8b5e3c'); }
    disc(x, tx, ty, 9, P.ink); disc(x, tx, ty, 8, '#8b5e3c'); disc(x, tx - 2, ty - 2, 5, '#a3794b'); px(x, '#fff3b0', tx - 3, ty - 3, 2, 2); px(x, '#a83a32', tx + 2, ty, 2, 2); }
  // porta
  px(x, P.ink, 90, 132, 20, 8); px(x, '#1a1208', 92, 133, 16, 7); px(x, '#c9a46a', 88, 130, 24, 2);
  const block = [[0, 0, w, 30], [6, 26, 114, 46], [0, 44, 16, 78], [164, 20, 200, 64], [0, 0, 3, h], [197, 0, w, h], ...tables.map(([tx, ty]) => [tx - 10, ty - 7, tx + 10, ty + 6])];
  return { id: 'taverna', name: 'Taverna do Valis', w, h, img: c, spawn: { x: 100, y: 124 }, door: { x: 100, y: 133 }, fire: { x: 183, y: 56 }, block,
    spots: [{ x: 60, y: 50, rx: 52, ry: 9, kind: 'drink', label: 'Beber vinho' }], outside: B.taverna ? { x: B.taverna.x, y: B.taverna.y + 6 } : { x: 362, y: 584 } };
}
function houseRoom(id, bb) {
  const b = bb || B[id] || { x: 360, y: 640, telhado: 0 }, roof = ROOFS[b.telhado || 0];
  const w = 130, h = 100, [c, x] = canvas(w, h);
  planks(x, w, h, 22, '#8b5e3c', '#7a4f2e');
  px(x, '#e4d0a0', 0, 0, w, 22); px(x, '#c9a46a', 0, 18, w, 4); px(x, P.ink, 0, 21, w, 2); for (let k = 0; k < w; k += 32) px(x, '#7a4f2e', k, 0, 3, 22);
  px(x, P.ink, 54, 4, 20, 12); px(x, '#9ff3ff', 55, 5, 18, 10); px(x, '#3f7ab0', 55, 11, 18, 4); px(x, P.ink, 63, 5, 1, 10);
  // cama
  px(x, P.ink, 5, 24, 28, 30); px(x, '#7a4f2e', 6, 25, 26, 28); px(x, '#eef0ea', 8, 26, 22, 7); px(x, roof[0], 7, 34, 24, 18); px(x, roof[1], 7, 46, 24, 1);
  // mesa e cadeiras
  for (const [sx, sy] of [[-12, 0], [12, 0]]) { px(x, P.ink, 64 + sx - 3, 62 + sy - 3, 7, 7); px(x, '#a3794b', 64 + sx - 2, 62 + sy - 2, 5, 5); }
  px(x, P.ink, 54, 54, 21, 14); px(x, '#8b5e3c', 55, 55, 19, 12); px(x, '#a3794b', 55, 55, 19, 3); px(x, '#fff3b0', 60, 57, 3, 3); px(x, '#a83a32', 66, 58, 3, 2);
  // baú e planta
  px(x, P.ink, 98, 24, 24, 14); px(x, '#6b4630', 99, 25, 22, 12); px(x, '#ffd84a', 109, 29, 2, 3); px(x, '#3a2618', 99, 30, 22, 1);
  disc(x, 116, 80, 5, P.ink); disc(x, 116, 80, 4, '#6b4630'); disc(x, 116, 75, 6, '#3c5d4a'); disc(x, 114, 73, 3, '#7c9b5b');
  // tapete e porta
  px(x, roof[1], 44, 74, 42, 16); px(x, roof[0], 46, 76, 38, 12);
  px(x, P.ink, 56, 92, 18, 8); px(x, '#1a1208', 58, 93, 14, 7);
  const block = [[0, 0, w, 26], [3, 22, 35, 56], [52, 52, 77, 70], [96, 22, 124, 40], [109, 72, 123, 86], [0, 0, 3, h], [127, 0, w, h]];
  return { id, name: 'Casa', w, h, img: c, spawn: { x: 65, y: 86 }, door: { x: 65, y: 93 }, fire: null, block, spots: [], outside: { x: b.x - 1, y: b.y + 6 } };
}
function roomOf(id) { if (!ROOM_CACHE[id]) { if (id === 'castelo') ROOM_CACHE[id] = throneRoom(); else if (id === 'taverna') ROOM_CACHE[id] = tavernRoom(); else if (id === 'gruta' || id === 'abismo') ROOM_CACHE[id] = caveRoom(id); else if (id.startsWith('h_')) { const h = BUILT.find(q => 'h_' + q.id === id) || { x: 360, y: 700, roof: 0 }; const T = BTYPES[h.type] || BTYPES.casa;
      const r = h.type === 'bar' ? { ...tavernRoom(), id, outside: { x: h.x + 1, y: h.y + 6 } } : houseRoom(id, { x: h.x, y: h.y, telhado: h.roof }); r.outside = { x: h.x + 1, y: h.y + 6 };
      r.name = h.type === 'prefeitura' ? 'Prefeitura de Eryon' : `${T.name} de @${h.owner || 'alguém'}`; ROOM_CACHE[id] = r; } else ROOM_CACHE[id] = houseRoom(id); } return ROOM_CACHE[id]; }
function roomBlocked(id, x, y) { const r = roomOf(id); if (x < 4 || x > r.w - 4 || y < 10 || y > r.h - 3) return true; return rectsBlock(r.block, x, y); }
// portas no mapa de fora
function doorsOutside() {
  const d = [];
  if (B.taverna) d.push({ room: 'taverna', x: B.taverna.x, y: B.taverna.y + 3, label: 'Entrar na taverna' });
  for (let i = 1; i <= 9; i++) { const b = B['casa_' + i]; if (b) d.push({ room: 'casa_' + i, x: b.x - 1, y: b.y + 3, label: 'Entrar na casa' }); }
  for (const l of LANDMARKS) if (l.hole) d.push({ room: l.hole, x: l.x, y: l.y + (l.id === 'buraco' ? 4 : 8), label: l.holeLabel });
  return d;
}

// ---------------------------------------------------------------- classes
const CLASSES = [
  { id: 'lenhador', name: 'Lenhador', desc: 'Derruba árvores e racha lenha rendendo o dobro.', skill: 'chop', skillName: 'Machadada', tool: 'axe', look: { hair: '#5a3a26', skin: '#e8b48c', shirt: '#a83a32', pants: '#3c5f9a', beard: true, longHair: false, elfEars: false, hat: '', cape: '' } },
  { id: 'guerreiro', name: 'Guerreiro', desc: 'Protege a vila. Golpe de espada.', skill: 'sword', skillName: 'Golpe de espada', tool: 'sword', look: { hair: '#1a1208', skin: '#c08060', shirt: '#4a535c', pants: '#2b3138', cape: '#a83a32', beard: false, longHair: false, elfEars: false, hat: '' } },
  { id: 'maga', name: 'Feiticeira', desc: 'Lança feitiços de estrelas.', skill: 'magic', skillName: 'Feitiço', tool: null, look: { hair: '#e6efa0', skin: '#f2c9a4', shirt: '#6e4a8a', pants: '#1d3550', cape: '#1d3550', longHair: true, beard: false, elfEars: true, hat: '' } },
  { id: 'arqueira', name: 'Arqueira', desc: 'Atira flechas longe.', skill: 'arrow', skillName: 'Atirar flecha', tool: 'bow', look: { hair: '#d0622a', skin: '#e8b48c', shirt: '#3c5d4a', pants: '#4a2f22', cape: '#4e6c4a', elfEars: true, longHair: true, beard: false, hat: '' } },
  { id: 'ferreiro', name: 'Ferreiro', desc: 'Martela na bigorna e faz faíscas.', skill: 'hammer', skillName: 'Martelar', tool: 'bighammer', look: { hair: '#1a1208', skin: '#8b5e3c', shirt: '#4a535c', pants: '#2b3138', beard: true, longHair: false, elfEars: false, hat: '', cape: '' } },
  { id: 'construtor', name: 'Construtor', desc: 'Ergue a vila com martelo e tábuas.', skill: 'build', skillName: 'Construir', tool: 'hammer', look: { hair: '#8b5e3c', skin: '#f2c9a4', shirt: '#3f7ab0', pants: '#4a2f22', hat: 'bone', beard: false, longHair: false, elfEars: false, cape: '' } },
  { id: 'cozinheiro', name: 'Cozinheiro', desc: 'Cozinha para todos.', skill: 'cook', skillName: 'Cozinhar', tool: 'ladle', look: { hair: '#5a3a26', skin: '#c08060', shirt: '#e4d0a0', pants: '#3c5f9a', hat: 'chef', beard: false, longHair: false, elfEars: false, cape: '' } },
  { id: 'curandeira', name: 'Curandeira', desc: 'Cura quem está por perto.', skill: 'heal', skillName: 'Curar', tool: 'flask', look: { hair: '#c4ccd0', skin: '#e8b48c', shirt: '#b06a9a', pants: '#3c5d4a', longHair: true, beard: false, elfEars: false, hat: '', cape: '' } },
  { id: 'bardo', name: 'Bardo', desc: 'Toca alaúde para a vila ouvir.', skill: 'lute', skillName: 'Tocar alaúde', tool: 'lute', look: { hair: '#ffd84a', skin: '#f2c9a4', shirt: '#d0622a', pants: '#1d3550', hat: 'palha', beard: false, longHair: false, elfEars: false, cape: '#6e4a8a' } },
  { id: 'mago', name: 'Mago', desc: 'Solta raios do céu: derruba várias árvores de uma vez.', skill: 'zap', skillName: 'Raio', tool: 'staff', look: { hair: '#c4ccd0', skin: '#e8b48c', shirt: '#6e4a8a', pants: '#1d3550', cape: '#1d3550', beard: true, longHair: true, elfEars: false, hat: 'mago' } },
  { id: 'fada', name: 'Fada', desc: 'Tem asas e voa por Eryon quando quiser.', skill: 'flyfairy', skillName: 'Voar', tool: 'wand', look: { hair: '#ffd84a', skin: '#f2c9a4', shirt: '#b06a9a', pants: '#3c5d4a', cape: '', longHair: true, beard: false, elfEars: true, hat: '' } },
  { id: 'taverneiro', name: 'Taverneiro', desc: 'Serve bebida na taverna.', skill: 'serve', skillName: 'Servir bebida', tool: 'mug', look: { hair: '#a83a32', skin: '#e8b48c', shirt: '#e4d0a0', pants: '#4a2f22', beard: true, longHair: false, elfEars: false, hat: '', cape: '' } },
];
const CLASS_BY = Object.fromEntries(CLASSES.map(c => [c.id, c]));
const classOf = q => CLASS_BY[q && q.look && q.look.cls] || null;

// ---------------------------------------------------------------- ações
const ACT_DUR = { zap: 1.5, flyfairy: .1, mine: 2.0, gather: 1.6, eat: 2.2, bridge: 2.4,  chop: 2.4, split: 1.8, drink: 2.2, magic: 1.6, sword: 1.2, arrow: 1.2, hammer: 2.0, build: 2.0, cook: 2.4, heal: 2.0, lute: 2.8, serve: 2.0 };
function poseFor(q, t) {
  const a = q.act;
  if (a && t < a.end) {
    const u = t - a.t0;
    if (a.kind === 'chop' || a.kind === 'split') return { legs: 'stand', arm: (u % .56) < .32 ? 'up' : 'low', tool: 'axe', eyes: 0, br: 0 };
    if (a.kind === 'drink') return { legs: 'stand', arm: (u % 1.1) < .55 ? 'up' : 'fwd', tool: 'mug', eyes: 0, br: 0 };
    if (a.kind === 'magic') return { legs: 'stand', arm: 'up', tool: null, eyes: 0, br: Math.floor(u * 8) % 2 };
    if (a.kind === 'zap') return { legs: 'stand', arm: 'up', tool: 'staff', eyes: 0, br: Math.floor(u * 10) % 2 };
    if (a.kind === 'mine') return { legs: 'stand', arm: (u % .5) < .3 ? 'up' : 'low', tool: 'bighammer', eyes: 0, br: 0 };
    if (a.kind === 'gather') return { legs: 'sit', arm: (u % .6) < .3 ? 'low' : 'fwd', tool: null, eyes: 0, br: 0 };
    if (a.kind === 'sword') return { legs: 'stand', arm: (u % .4) < .2 ? 'up' : 'low', tool: 'sword', eyes: 0, br: 0 };
    if (a.kind === 'arrow') return { legs: 'stand', arm: 'bow', tool: 'bow', eyes: 1, br: 0 };
    if (a.kind === 'hammer') return { legs: 'stand', arm: (u % .5) < .3 ? 'up' : 'low', tool: 'bighammer', eyes: 0, br: 0 };
    if (a.kind === 'build') return { legs: 'stand', arm: (u % .4) < .22 ? 'up' : 'fwd', tool: 'hammer', eyes: 0, br: 0 };
    if (a.kind === 'cook') return { legs: 'stand', arm: (u % .7) < .35 ? 'fwd' : 'low', tool: 'ladle', eyes: 0, br: 0 };
    if (a.kind === 'heal') return { legs: 'stand', arm: 'fwd', tool: 'flask', eyes: 0, br: Math.floor(u * 4) % 2 };
    if (a.kind === 'lute') return { legs: 'stand', arm: 'fwd', tool: 'lute', eyes: 0, br: Math.floor(u * 3.3) % 2 };
    if (a.kind === 'serve') return { legs: 'stand', arm: (u % 1) < .5 ? 'up' : 'fwd', tool: 'mug', eyes: 0, br: 0 };
  }
  const tool = (q.look && q.look.equipTool) || (classOf(q) || {}).tool || null;
  if (q.carry) { const f2 = Math.floor(t * 6 + (q.ph || 0)) % 2; return { legs: q.moving ? (f2 ? 'w1' : 'w2') : 'stand', arm: 'carry', tool: 'log', eyes: 0, br: 0 }; }
  const f4 = Math.floor(t * 9 + (q.ph || 0)) % 4;
  return q.moving ? { legs: ['w1', 'stand', 'w2', 'stand'][f4], bob: f4 % 2 === 0, arm: 'down', tool, eyes: 0, br: 0 } : { legs: 'stand', arm: 'down', tool, eyes: 0, br: Math.floor(t * 1.3 + (q.ph || 0)) % 2 };
}
const MAGIC_COLS = [[P.cy2, '#ffffff', P.cy], ['#f6b6d8', '#ffffff', '#b06a9a'], [P.fire3, P.fire4, P.fire2], ['#9cbf62', '#e6efa0', '#ffffff']];
function drawActFx(x, q, t) {
  const a = q.act; if (!a || t > a.end + 1.2) return;
  const u = t - a.t0, fx = q.x + (q.face || 1) * 7, fy = q.y - 4;
  if (a.kind === 'zap') { const pts = a.pts && a.pts.length ? a.pts : [[q.x + (q.face || 1) * 30, q.y - 2]];
    // cajado brilhando e raios caindo do céu, um depois do outro
    if (u < .6) glow(x, q.x + (q.face || 1) * 2, q.y - 24, 6 + u * 10, '#9ff3ff', .25);
    pts.forEach(([X, Y], i) => { const t0 = .45 + i * .12, k = u - t0; if (k < 0 || k > .55) return;
      if (k < .28) { x.globalAlpha = 1 - k / .28 * .5; let bx = X, by = Y - 140; const r = rng(Math.floor(X * 7 + Y * 3 + i));
        for (let s2 = 0; s2 < 14; s2++) { const nx = X + (r() - .5) * 14 * (1 - s2 / 14), ny = by + 10; for (let yy = by; yy < ny; yy++) { const xx = Math.round(bx + (nx - bx) * (yy - by) / 10); px(x, '#ffffff', xx, yy, 2, 1); px(x, '#9ff3ff', xx - 1, yy, 1, 1); px(x, '#9ff3ff', xx + 2, yy, 1, 1); } bx = nx; by = ny; }
        x.globalAlpha = 1; glow(x, X, Y - 6, 18, '#9ff3ff', .3 * (1 - k / .28)); }
      burst(x, t, a.t0 + t0, X, Y - 4, 14, ['#ffffff', '#9ff3ff', P.fire3, P.woodL], 26, .6, 20, i * 13 + 5); });
    return; }
  if (a.kind === 'chop' || a.kind === 'split') { const hit = Math.floor(u / .56); for (let k = 0; k <= hit && k < 5; k++) burst(x, t, a.t0 + k * .56 + .32, fx, fy, 8, [P.woodL, P.sand, a.kind === 'chop' ? P.f8 : P.wood], 10, .5, 18, q.ph * 31 + k); }
  if (a.kind === 'magic') { const cols = MAGIC_COLS[(q.ph || 0) % MAGIC_COLS.length]; const k = clamp(u / 1.2);
    if (u < 1.6) { x.globalAlpha = 1 - k; ring(x, q.x, q.y - 3, 4 + k * 22, cols[0]); ring(x, q.x, q.y - 3, 3 + k * 16, cols[2]); x.globalAlpha = 1; }
    burst(x, t, a.t0 + .1, q.x, q.y - 16, 40, cols, 24, 1.4, -6, q.ph * 7 + Math.floor(a.t0)); glow(x, q.x, q.y - 14, 10, cols[0], .18 * (1 - k)); }
  const F = q.face || 1;
  if (a.kind === 'sword' && u < 1.3) { const k = (u % .4) / .4; x.globalAlpha = 1 - k; for (let i = 0; i < 9; i++) { const ang = -1.2 + i * .3 + k * .6; px(x, i % 2 ? '#ffffff' : P.st4, Math.round(q.x + F * (6 + Math.cos(ang) * 9)), Math.round(q.y - 8 + Math.sin(ang) * 8), 2, 1); } x.globalAlpha = 1; }
  if (a.kind === 'arrow' && u > .45 && u < 1.6) { const k = clamp((u - .45) / .7), ax = Math.round(q.x + F * (8 + k * 80)), ay = Math.round(q.y - 9 + k * k * 4); px(x, P.wood, ax - F * 5, ay, 6, 1); px(x, P.st4, ax + (F > 0 ? 1 : -2), ay - 1, 2, 3); px(x, '#eef0ea', ax - F * 6, ay - 1, 2, 3); if (k >= 1) burst(x, t, a.t0 + 1.15, ax, ay, 8, [P.woodL, P.sand], 6, .4, 10, q.ph + 3); }
  if (a.kind === 'mine') { const hit = Math.floor(u / .5); for (let k = 0; k <= hit && k < 4; k++) burst(x, t, a.t0 + k * .5 + .3, fx, fy + 2, 10, [P.st3, P.st4, P.st2], 10, .45, 16, q.ph * 17 + k); }
  if (a.kind === 'gather') burst(x, t, a.t0 + .6, fx, fy + 3, 12, [P.f8, P.f9, '#f6b6d8'], 9, .6, -4, q.ph * 5 + Math.floor(a.t0));
  if (a.kind === 'hammer' || a.kind === 'build') { const per = a.kind === 'hammer' ? .5 : .4; const hit = Math.floor(u / per); for (let k = 0; k <= hit && k < 6; k++) burst(x, t, a.t0 + k * per + per * .6, fx, fy + 2, a.kind === 'hammer' ? 12 : 6, a.kind === 'hammer' ? [P.fire3, P.fire4, P.fire2] : [P.woodL, P.sand], 10, .4, 14, q.ph * 13 + k); }
  if (a.kind === 'cook') { for (let i = 0; i < 6; i++) { const ph = (u * .8 + i / 6) % 1; x.globalAlpha = .7 * (1 - ph) * clamp(a.end - t + 1); px(x, '#eef0ea', Math.round(fx + Math.sin(ph * 6 + i) * 3), Math.round(fy - 4 - ph * 16), 2, 2); } x.globalAlpha = 1; }
  if (a.kind === 'heal') { const k = clamp(u / 2); x.globalAlpha = 1 - k; ring(x, q.x, q.y - 3, 6 + k * 26, '#9cbf62'); x.globalAlpha = 1;
    for (let i = 0; i < 8; i++) { const ph = (u * .7 + i / 8) % 1, X = Math.round(q.x + Math.cos(i * 2.4) * (8 + i * 2)), Y = Math.round(q.y - 6 - ph * 20); x.globalAlpha = (1 - ph) * clamp(a.end - t + .5); px(x, '#9cbf62', X - 1, Y, 3, 1); px(x, '#9cbf62', X, Y - 1, 1, 3); } x.globalAlpha = 1; }
  if (a.kind === 'lute') { for (let i = 0; i < 5; i++) { const ph = (u * .6 + i / 5) % 1, X = Math.round(q.x + F * 4 + Math.sin(ph * 5 + i) * 6), Y = Math.round(q.y - 16 - ph * 18); x.globalAlpha = (1 - ph) * clamp(a.end - t + .5); px(x, P.fire3, X, Y, 2, 2); px(x, P.fire3, X + 1, Y - 4, 1, 4); px(x, P.fire3, X + 2, Y - 4, 1, 1); } x.globalAlpha = 1; }
  if (a.kind === 'serve' && u > .9 && u < 2.2) { x.globalAlpha = clamp(2.2 - u); px(x, P.ink, q.x + F * 8 - 3, q.y - 22, 7, 7); px(x, '#c9a46a', q.x + F * 8 - 2, q.y - 21, 5, 5); px(x, '#fff3b0', q.x + F * 8 - 2, q.y - 21, 5, 2); x.globalAlpha = 1; }
  if (a.kind === 'drink' && u > 1.2 && u < 2.6) { const y = Math.round(q.y - 24 - (u - 1.2) * 6); x.globalAlpha = clamp(2.6 - u); px(x, P.ink, q.x + 3, y - 1, 13, 7); px(x, '#fff3b0', q.x + 4, y, 11, 5); px(x, '#a83a32', q.x + 6, y + 1, 2, 3); px(x, '#a83a32', q.x + 9, y + 1, 1, 3); px(x, '#a83a32', q.x + 11, y + 1, 2, 3); x.globalAlpha = 1; }
}

// ---------------------------------------------------------------- som
const SND = { ctx: null, master: null, music: null, sfx: null, fire: null, muted: false, noise: null, nextBeat: 0, beat: 0, note: 4 };
try { SND.muted = localStorage.getItem('eryon_mute') === '1'; } catch { }
// "desbloqueio" do iPhone: um <audio> silencioso tocando coloca o som no modo reprodução,
// assim o Web Audio toca mesmo com a chave de silencioso ligada
let unlockEl = null;
function silentWavUrl() { const sr = 8000, n = sr / 2, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' })); }
function iosUnlock() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { }
  if (!unlockEl) { unlockEl = new Audio(silentWavUrl()); unlockEl.loop = true; unlockEl.setAttribute('playsinline', ''); unlockEl.volume = 0.01; }
  if (unlockEl.paused) unlockEl.play().catch(() => {});
}
function sndStart() {
  iosUnlock();
  if (SND.ctx) { if (SND.ctx.state !== 'running') SND.ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const c = SND.ctx = new AC(); c.resume().catch(() => {});
  // toca um buffer vazio dentro do toque: exigência antiga do Safari
  try { const b0 = c.createBuffer(1, 1, 22050), s0 = c.createBufferSource(); s0.buffer = b0; s0.connect(c.destination); s0.start(0); } catch { }
  SND.master = c.createGain(); SND.master.gain.value = SND.muted ? 0 : 1; SND.master.connect(c.destination);
  SND.music = c.createGain(); SND.music.gain.value = .05; SND.music.connect(SND.master);
  SND.sfx = c.createGain(); SND.sfx.gain.value = .35; SND.sfx.connect(SND.master);
  SND.fire = c.createGain(); SND.fire.gain.value = 0; SND.fire.connect(SND.master);
  const n = c.createBuffer(1, c.sampleRate, c.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; SND.noise = n;
  // eco (usado pelo alaúde, magia e descobertas)
  SND.echo = c.createDelay(1); SND.echo.delayTime.value = .43; const fb = c.createGain(); fb.gain.value = .35; const ef = c.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 1800;
  SND.echo.connect(ef); ef.connect(fb); fb.connect(SND.echo); ef.connect(SND.sfx);
  startMusic();
  crackleLoop();
}
const SCALE = [146.83, 164.81, 174.61, 196, 220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440];   // ré dórico
function pluck(f, when, gain = .3, dur = 1.8) { const c = SND.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2.01;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(gain, when + .008); g.gain.exponentialRampToValueAtTime(.0008, when + dur);
  o.connect(g); o2.connect(g); g.connect(SND.sfx); g.connect(SND.echo); o.start(when); o2.start(when); o.stop(when + dur + .1); o2.stop(when + dur + .1); }
function drum(when, gain) { const c = SND.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(95, when); o.frequency.exponentialRampToValueAtTime(48, when + .35);
  g.gain.setValueAtTime(gain, when); g.gain.exponentialRampToValueAtTime(.001, when + .5); o.connect(g); g.connect(SND.sfx); o.start(when); o.stop(when + .55); }
// música medieval de verdade (CC0, RandomMind — ver music/CREDITOS.txt), tocando baixinho em sequência
const TRACKS = ['music/m0.mp3', 'music/m1.mp3', 'music/m2.mp3', 'music/m3.mp3'];
let musicEl = null, trackI = Math.floor(Math.random() * TRACKS.length);
function startMusic() {
  if (musicEl) return;
  musicEl = new Audio(); musicEl.setAttribute('playsinline', ''); musicEl.preload = 'auto'; musicEl.crossOrigin = 'anonymous';
  try { const src = SND.ctx.createMediaElementSource(musicEl); src.connect(SND.music); SND.music.gain.value = .22; }
  catch { musicEl.volume = .12; }   // sem Web Audio: volume direto no elemento
  musicEl.onended = () => nextTrack(); musicEl.onerror = () => setTimeout(nextTrack, 3000);
  nextTrack();
}
function nextTrack() { if (!musicEl) return; musicEl.src = TRACKS[trackI++ % TRACKS.length]; musicEl.play().catch(() => {}); }
// quando volta para a aba ou toca na tela, garante que a música continua
document.addEventListener('visibilitychange', () => { if (!document.hidden && musicEl && musicEl.paused && musicEl.src) musicEl.play().catch(() => {}); });
function noiseHit(when, dur, freq, gain, type = 'bandpass', bus = SND.sfx) { const c = SND.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = SND.noise; s.playbackRate.value = .8 + Math.random() * .4;
  f.type = type; f.frequency.value = freq; f.Q.value = 1.2; g.gain.setValueAtTime(gain, when); g.gain.exponentialRampToValueAtTime(.001, when + dur); s.connect(f); f.connect(g); g.connect(bus); s.start(when, Math.random() * .5); s.stop(when + dur + .02); }
// amostras reais (CC0 / domínio público — ver sfx/CREDITOS.txt)
const SAMPLES = {}, SAMPLE_NAMES = ['fire', 'chop', 'wood_hit', 'plank', 'creak', 'door_open', 'door_close', 'sword_draw', 'slash', 'anvil_0', 'anvil_1', 'pot', 'coins', 'whoosh',
  'step_grass_0', 'step_grass_1', 'step_grass_2', 'step_grass_3', 'step_wood_0', 'step_wood_1', 'step_wood_2'];
function loadSamples() { for (const n of SAMPLE_NAMES) fetch('sfx/' + n + '.mp3').then(r => r.arrayBuffer()).then(b => new Promise((ok, bad) => SND.ctx.decodeAudioData(b, ok, bad))).then(buf => { SAMPLES[n] = buf; if (n === 'fire') startFireLoop(); }).catch(() => {}); }
function play(n, gain = 1, rate = 1, when = 0) { if (!SND.ctx || !SAMPLES[n]) return; const s = SND.ctx.createBufferSource(), g = SND.ctx.createGain(); s.buffer = SAMPLES[n]; s.playbackRate.value = rate * (.94 + Math.random() * .12); g.gain.value = gain; s.connect(g); g.connect(SND.sfx); s.start(SND.ctx.currentTime + when); }
function startFireLoop() { const s = SND.ctx.createBufferSource(); s.buffer = SAMPLES.fire; s.loop = true; s.connect(SND.fire); s.start(); }
function crackleLoop() { loadSamples(); }
const pick = (base, n) => base + Math.floor(Math.random() * n);
const sfx = {
  step(indoor) { indoor ? play(pick('step_wood_', 3), .5) : play(pick('step_grass_', 4), .55); },
  chop() { play('chop', .9); play('wood_hit', .35, 1.2); },
  split() { play('chop', .8, 1.1); play('plank', .5); },
  fall() { play('creak', .7, .8); play('wood_hit', 1, .55, .55); play('plank', .8, .7, .7); },
  magic() { synthMagic(); },
  drink() { synthDrink(); },
  door(open = true) { play(open ? 'door_open' : 'door_close', .8); },
  sword() { play('sword_draw', .7); play('slash', .8, 1, .35); },
  arrow() { play('whoosh', .9, 1.6, .45); },
  anvil() { play(pick('anvil_', 2), .6); },
  pot() { play('pot', .6); },
  coins() { play('coins', .6); },
  build() { play('wood_hit', .7, 1.3); },
  bell() { if (!SND.ctx) return; const w = SND.ctx.currentTime; for (const k of [0, .45, .9]) for (const [f, gn] of [[880, .2], [2210, .07], [3520, .04]]) { const o = SND.ctx.createOscillator(), g = SND.ctx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(gn, w + k); g.gain.exponentialRampToValueAtTime(.001, w + k + 1.4); o.connect(g); g.connect(SND.sfx); o.start(w + k); o.stop(w + k + 1.5); } },
  lute() { if (!SND.ctx) return; const w = SND.ctx.currentTime; [0, 3, 5, 7, 5, 3, 0, -2].forEach((st, i) => pluck(SCALE[clamp(SND.note + st, 0, SCALE.length - 1)], w + i * .3, .4, 1.4)); },
  heal() { if (!SND.ctx) return; const w = SND.ctx.currentTime; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { const o = SND.ctx.createOscillator(), g = SND.ctx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, w + i * .12); g.gain.linearRampToValueAtTime(.14, w + i * .12 + .02); g.gain.exponentialRampToValueAtTime(.001, w + i * .12 + 1.2); o.connect(g); g.connect(SND.sfx); g.connect(SND.echo); o.start(w + i * .12); o.stop(w + i * .12 + 1.3); }); },
};
function synthMagic() { if (!SND.ctx) return; const w = SND.ctx.currentTime; [587.33, 739.99, 880, 1174.66, 1479.98].forEach((f, i) => { const o = SND.ctx.createOscillator(), g = SND.ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, w + i * .07); g.gain.linearRampToValueAtTime(.18, w + i * .07 + .01); g.gain.exponentialRampToValueAtTime(.001, w + i * .07 + .9); o.connect(g); g.connect(SND.sfx); g.connect(SND.echo); o.start(w + i * .07); o.stop(w + i * .07 + 1); }); }
function synthDrink() { if (!SND.ctx) return; const w = SND.ctx.currentTime; for (const k of [0, .55, 1.1]) { const o = SND.ctx.createOscillator(), g = SND.ctx.createGain(); o.frequency.setValueAtTime(320, w + k); o.frequency.exponentialRampToValueAtTime(140, w + k + .14); g.gain.setValueAtTime(.3, w + k); g.gain.exponentialRampToValueAtTime(.001, w + k + .16); o.connect(g); g.connect(SND.sfx); o.start(w + k); o.stop(w + k + .18); } }
function setFireLevel(v) { if (SND.ctx) SND.fire.gain.setTargetAtTime(clamp(v) * .55, SND.ctx.currentTime, .3); }
function toggleMute() { SND.muted = !SND.muted; try { localStorage.setItem('eryon_mute', SND.muted ? '1' : '0'); } catch { } if (SND.master) SND.master.gain.setTargetAtTime(SND.muted ? 0 : 1, SND.ctx.currentTime, .05); return SND.muted; }
