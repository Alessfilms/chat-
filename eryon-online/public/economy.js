// =====================================================================
// ECONOMIA DE ERYON: moedas, frutas, animais com dono, barracas de feira,
// Mercador na Praça da Feira, muros/portões e construções novas
// =====================================================================
const GOOD_NAMES = { moedas: 'Moedas', frutas: 'Frutas', leite: 'Leite', ovos: 'Ovos', trufas: 'Trufas', lenha: 'Lenha', pedra: 'Pedra', ervas: 'Ervas', vaca: 'Vaca', porco: 'Porco', galinha: 'Galinha' };
const MERCH_BUY = { frutas: 1, leite: 3, ovos: 2, trufas: 6 };
const ANIM = { vaca: { name: 'Vaca', price: 30, prod: 'leite', act: 'Ordenhar a vaca', w: 18 }, porco: { name: 'Porco', price: 18, prod: 'trufas', act: 'Procurar trufas com o porco', w: 14 }, galinha: { name: 'Galinha', price: 8, prod: 'ovos', act: 'Pegar os ovos', w: 9 } };
const MERCH = { x: 640, y: 650 }, FAIR = { x: 640, y: 684, r: 62 };
const ROT_KINDS = new Set(['cerca', 'muro', 'portao']);
let ANIMALS_L = [];
const nameOf = k => GOOD_NAMES[k] || (RBY[k] || {}).name || k;

// ---------- sprites dos objetos novos (muro, portão, barraca, macieira)
function econDecor(k) {
  const mk = (W, H) => canvas(W, H), O = '#1a1d24', ST = ['#4d5566', '#6e7789', '#939cae', '#c3cad6'];
  if (k === 'muro') { const [c, x] = mk(16, 13); x.fillStyle = 'rgba(10,30,20,.3)'; x.fillRect(1, 11, 15, 2); px(x, O, 0, 2, 16, 10);
    for (let Y = 0; Y < 3; Y++) for (let X = 0; X < 4; X++) { const bx = 1 + X * 4 - (Y % 2) * 2, bw = 3; if (bx < 1 || bx > 13) continue; px(x, ST[(X + Y) % 2 ? 1 : 2], bx, 3 + Y * 3, bw, 2); px(x, ST[3], bx, 3 + Y * 3, bw, 1); }
    px(x, ST[3], 1, 2, 14, 1); px(x, '#47994a', 2, 2, 3, 1); return { c, ax: 8, ay: 12 }; }
  if (k === 'muro_v') { const [c, x] = mk(7, 21); x.fillStyle = 'rgba(10,30,20,.3)'; x.fillRect(1, 19, 6, 2); px(x, O, 0, 0, 7, 20); for (let Y = 1; Y < 19; Y += 3) { px(x, ST[(Y >> 1) % 2 ? 1 : 2], 1, Y, 5, 2); px(x, ST[3], 1, Y, 5, 1); } return { c, ax: 3, ay: 19 }; }
  if (k === 'portao' || k === 'portao_v') { const v = k === 'portao_v', [c, x] = v ? mk(7, 21) : mk(16, 13);
    if (!v) { for (const X of [0, 13]) { px(x, P.ink, X, 0, 3, 12); px(x, P.woodD, X + 1, 1, 1, 10); } px(x, P.ink, 3, 3, 10, 8); for (let X = 3; X < 13; X += 2) px(x, (X >> 1) % 2 ? P.wood : P.woodL, X, 4, 1, 6); px(x, P.woodD, 3, 6, 10, 1); px(x, '#ffd84a', 8, 7, 1, 1); return { c, ax: 8, ay: 12 }; }
    px(x, P.ink, 1, 0, 5, 3); px(x, P.ink, 1, 17, 5, 3); px(x, P.ink, 2, 3, 3, 14); px(x, P.wood, 3, 3, 1, 14); return { c, ax: 3, ay: 19 }; }
  if (k === 'barraca') { const [c, x] = mk(28, 26); x.fillStyle = 'rgba(10,30,20,.3)'; x.fillRect(2, 23, 26, 3);
    for (const X of [2, 24]) { px(x, P.ink, X - 1, 6, 3, 18); px(x, P.wood, X, 7, 1, 16); }
    px(x, P.ink, 0, 16, 28, 8); px(x, P.wood, 1, 17, 26, 6); px(x, P.woodL, 1, 17, 26, 1); px(x, P.woodD, 1, 21, 26, 1);           // balcão
    px(x, P.ink, 0, 2, 28, 7); for (let X = 1; X < 27; X++) px(x, Math.floor((X - 1) / 4) % 2 ? '#f4f0d8' : '#c0302a', X, 3, 1, 5);   // toldo listrado
    for (let X = 1; X < 27; X += 4) { px(x, P.ink, X, 8, 4, 2); px(x, Math.floor((X - 1) / 4) % 2 ? '#f4f0d8' : '#c0302a', X + 1, 8, 2, 1); }
    return { c, ax: 14, ay: 24 }; }
  if (k === 'pomar') { const t2 = roundTree(8, ['#1f5a3a', '#2f7a40', '#47994a', '#74c05c'], 77); return { c: t2.c, ax: t2.ax, ay: t2.ay }; }
  return null;
}
const GOOD_COL = { frutas: ['#e04a3a', '#ffd84a'], leite: ['#f4f0d8', '#c3cad6'], ovos: ['#f4ecd8', '#e8c890'], trufas: ['#4a3020', '#6b4630'], lenha: [P.wood, P.woodL], pedra: [P.st2, P.st3], ervas: ['#47994a', '#84c65a'], vaca: ['#f4f0d8', '#1a1a1a'], porco: ['#f0a0b0', '#d07890'], galinha: ['#ffffff', '#e04a3a'] };
function drawEconDecor(x, d, t) {
  if (d.kind === 'barraca') { (d.shop || []).slice(0, 6).forEach((it, i) => { const [a, b] = GOOD_COL[it.k] || ['#c9a46a', '#ffd84a'], X = d.x - 11 + (i % 3) * 8, Y = d.y - 11 - Math.floor(i / 3) * 4;
      px(x, P.ink, X - 1, Y - 1, 6, 4); px(x, P.woodD, X, Y, 4, 2); px(x, a, X, Y - 1, 2, 1); px(x, b, X + 2, Y - 1, 2, 1); px(x, a, X + 1, Y - 2, 2, 1); }); }
  if (d.kind === 'pomar') { const ready = Date.now() - (d.lastH || 0) >= 4 * 60000; if (ready) for (const [ax2, ay2] of [[-5, -16], [3, -19], [6, -12], [-2, -10], [-7, -9]]) { px(x, '#7a1a14', d.x + ax2, d.y + ay2, 2, 2); px(x, '#e04a3a', d.x + ax2, d.y + ay2, 1, 1); } }
}
// ---------- arbustos de frutas (recurso para colher)
function econNodes() {
  for (let i = NODES.length - 1; i >= 0; i--) { const n = NODES[i]; if (Math.hypot(n.x - FAIR.x, (n.y - FAIR.y) * 1.2) < FAIR.r + 14) NODES.splice(i, 1); }   // praça livre
  const r = rng(779); let fi = 0, tries = 0;
  while (fi < 110 && tries++ < 12000) { const x = 20 + r() * (WW - 40), y = 40 + r() * (WH - 80), b = biomeAt(x, y); if (b === 4 || b === 3 && r() < .7) continue;
    if (Math.hypot(x - C.x, (y - C.y) * 1.05) < 110 || Math.hypot(x - FAIR.x, (y - FAIR.y) * 1.2) < FAIR.r + 20 || blocked(x, y) || blocked(x + 5, y) || Math.abs(y - riverY(x)) < 20 || lakeVal(x, y) < 1.3 || NODES.some(n => Math.abs(n.x - x) < 24 && Math.abs(n.y - y) < 24)) continue;
    NODES.push({ id: 'f' + fi++, kind: 'fruit', x: Math.round(x), y: Math.round(y), s: Math.floor(r() * 3) }); }
}
function drawFruitBush(x, n) { const gone = DEPL.has(n.id), X = n.x, Y = n.y, fc = [['#e04a3a', '#ff9a8a'], ['#f2a33a', '#ffd84a'], ['#7a3aa8', '#b08af0']][n.s];
  x.fillStyle = 'rgba(10,30,20,.35)'; x.fillRect(X - 6, Y - 1, 13, 2); disc(x, X, Y - 5, 6, P.ink); disc(x, X, Y - 5, 5, '#2f7a40'); disc(x, X - 1, Y - 6, 3, '#47994a'); px(x, '#74c05c', X - 2, Y - 8, 2, 1);
  if (!gone) for (const [a, b] of [[-3, -7], [2, -8], [3, -4], [-2, -3], [0, -6]]) { px(x, fc[0], X + a, Y + b, 2, 2); px(x, fc[1], X + a, Y + b, 1, 1); } }

// ---------- animais com dono
const ASPR = {};
function animalSprite(k, f) { const key = k + f; if (ASPR[key]) return ASPR[key]; const O = P.ink;
  let c, x;
  if (k === 'vaca') { [c, x] = canvas(20, 15); const W = '#f4f0d8', B = '#1e1a18', up = f;
    px(x, O, 2, 3, 13, 8); px(x, W, 3, 4, 11, 6); px(x, B, 5, 4, 3, 3); px(x, B, 10, 6, 3, 3); px(x, '#c8c0a8', 3, 9, 11, 1);
    px(x, O, 13, 1, 6, 7); px(x, W, 14, 2, 4, 5); px(x, '#f0a0b0', 15, 5, 3, 2); px(x, O, 16, 3, 1, 1); px(x, '#c9a46a', 13, 0, 1, 2); px(x, '#c9a46a', 18, 0, 1, 2);
    for (const [L, o] of [[3, 0], [6, up], [10, 0], [13, up]]) { px(x, O, L, 11, 2, 3 - o); px(x, B, L, 13 - o, 2, 1); } px(x, O, 1, 4, 1, 4); px(x, B, 0, 7, 2, 2); px(x, '#f0a0b0', 7, 11, 3, 1); }
  if (k === 'porco') { [c, x] = canvas(16, 12); const Pk = '#f0a0b0', Pd = '#d07890';
    px(x, O, 1, 2, 12, 7); px(x, Pk, 2, 3, 10, 5); px(x, Pd, 2, 7, 10, 1); px(x, '#ffd0d8', 3, 3, 6, 1);
    px(x, O, 11, 2, 5, 6); px(x, Pk, 12, 3, 3, 4); px(x, Pd, 14, 4, 2, 2); px(x, O, 14, 5, 1, 1); px(x, O, 12, 4, 1, 1); px(x, Pd, 11, 1, 2, 2);
    for (const [L, o] of [[3, 0], [5, f], [9, 0], [11, f]]) px(x, O, L, 9, 1, 2 - o); px(x, Pd, 0, 3, 2, 1); px(x, Pd, 0, 2, 1, 1); }
  if (k === 'galinha') { [c, x] = canvas(10, 10); const Wt = '#ffffff';
    px(x, O, 1, 3, 7, 5); px(x, Wt, 2, 4, 5, 3); px(x, '#e8e8e8', 2, 6, 5, 1); px(x, O, 5, 0, 4, 5); px(x, Wt, 6, 1, 2, 3); px(x, '#e04a3a', 6, 0, 2, 1); px(x, '#f2a33a', 8, 2, 2, 1); px(x, O, 7, 2, 1, 1); px(x, '#e04a3a', 7, 4, 1, 1);
    px(x, '#f2a33a', 3, 8, 1, 2 - f); px(x, '#f2a33a', 5, 8, 1, 1 + f); px(x, O, 0, 3, 2, 3); }
  return ASPR[key] = { r: c, l: flipped(c) };
}
function animalPos(a, t) { const ph = a.id * 1.731, sp = .6 + (a.id % 5) * .1, X = a.x + Math.sin(t * .09 * sp + ph) * 16 + Math.sin(t * .23 + ph * 2) * 5, Y = a.y + Math.cos(t * .07 * sp + ph) * 8;
  const dx = Math.cos(t * .09 * sp + ph) * .09 * sp * 16 + Math.cos(t * .23 + ph * 2) * .23 * 5; const grazing = Math.sin(t * .4 + ph) > .3; return { X: grazing ? Math.round(X) : X, Y, right: dx >= 0, moving: !grazing }; }
function drawAnimal(x, a, t) { const p = animalPos(a, t), s = animalSprite(a.kind, p.moving ? Math.floor(t * 4 + a.id) % 2 : 0), img = p.right ? s.r : s.l;
  x.fillStyle = 'rgba(10,30,20,.3)'; x.fillRect(Math.round(p.X) - img.width / 2 + 2, Math.round(p.Y) - 1, img.width - 4, 2);
  x.drawImage(img, Math.round(p.X - img.width / 2), Math.round(p.Y - img.height + 1));
  if (a.ready && a.owner === me) { x.globalAlpha = .6 + .4 * Math.sin(t * 5); px(x, '#ffd84a', Math.round(p.X) - 1, Math.round(p.Y - img.height - 5), 2, 3); px(x, '#ffd84a', Math.round(p.X) - 1, Math.round(p.Y - img.height - 1), 2, 1); x.globalAlpha = 1; }
  if (a.heart && performance.now() - a.heart < 1500) { const k = (performance.now() - a.heart) / 1500; x.globalAlpha = 1 - k; px(x, '#e04a5a', Math.round(p.X) - 2, Math.round(p.Y - img.height - 4 - k * 10), 2, 2); px(x, '#e04a5a', Math.round(p.X) + 1, Math.round(p.Y - img.height - 4 - k * 10), 2, 2); px(x, '#e04a5a', Math.round(p.X) - 1, Math.round(p.Y - img.height - 2 - k * 10), 3, 2); x.globalAlpha = 1; }
}

// ---------- Praça da Feira e o Mercador
function econWorld(x) {
  for (let i = OBJ.length - 1; i >= 0; i--) { const o = OBJ[i]; if (o.tree !== undefined && Math.hypot(o.x - FAIR.x, (o.y - FAIR.y) * 1.2) < FAIR.r + 16) { OBJ.splice(i, 1); const ti = TREE_POS.findIndex(q => q.i === o.tree); if (ti >= 0) TREE_POS.splice(ti, 1); } }
  for (let i = blockers.length - 1; i >= 0; i--) { const b = blockers[i]; if (b.k === 'c' && Math.hypot(b.x - FAIR.x, (b.y - FAIR.y) * 1.2) < FAIR.r + 16) blockers.splice(i, 1); }
  for (let Y = FAIR.y - 58; Y <= FAIR.y + 58; Y += 3) for (let X = FAIR.x - 70 + ((Y / 3) % 2) * 2; X <= FAIR.x + 70; X += 4) { if (Math.hypot(X - FAIR.x, (Y - FAIR.y) * 1.2) > FAIR.r) continue; const v = h2(X, Y); px(x, '#3a2a1c', X - 1, Y - 1, 4, 3); px(x, v > .6 ? '#d8b88a' : v > .3 ? '#c9a46a' : '#b8946a', X, Y, 3, 2); }
  for (let Y = FAIR.y + 46; Y < 752; Y += 2) px(x, P.dirt2, FAIR.x - 3, Y, 7, 2);
  OBJ.push({ y: MERCH.y, x: MERCH.x, merchant: true }); blockers.push({ k: 'r', x0: MERCH.x - 20, x1: MERCH.x + 20, y0: MERCH.y - 10, y1: MERCH.y });
}
let MERCH_SPR = null;
function drawMerchant(x, t) {
  if (!MERCH_SPR) { const [c, q] = canvas(48, 34); q.fillStyle = 'rgba(10,30,20,.35)'; q.fillRect(2, 30, 46, 4);
    for (const X of [3, 44]) { px(q, P.ink, X - 1, 6, 3, 26); px(q, P.wood, X, 7, 1, 24); }
    px(q, P.ink, 0, 2, 48, 8); for (let X = 1; X < 47; X++) px(q, Math.floor((X - 1) / 5) % 2 ? '#ffd84a' : '#3f6fc0', X, 3, 1, 6); for (let X = 1; X < 47; X += 5) { px(q, P.ink, X, 9, 5, 2); px(q, Math.floor((X - 1) / 5) % 2 ? '#ffd84a' : '#3f6fc0', X + 1, 9, 3, 1); }
    MERCH_SPR = c; }
  x.drawImage(MERCH_SPR, MERCH.x - 24, MERCH.y - 32);
  const ch = charFor('mercador_bento', { hair: '#5a3a26', shirt: '#3f7ab0', pants: '#4a2f22', skin: '#c08060', beard: true, hat: 'palha' }); drawCharAt(x, ch, MERCH.x, MERCH.y - 8, { legs: 'stand', arm: Math.sin(t * 1.5) > .6 ? 'wave' : 'down', eyes: 0, br: Math.floor(t * 3) % 2 }, 1);
  px(x, P.ink, MERCH.x - 23, MERCH.y - 12, 46, 12); px(x, P.wood, MERCH.x - 22, MERCH.y - 11, 44, 10); px(x, P.woodL, MERCH.x - 22, MERCH.y - 11, 44, 1);
  for (let i = 0; i < 5; i++) { const [a, b] = Object.values(GOOD_COL)[i]; const X = MERCH.x - 20 + i * 9; px(x, P.ink, X - 1, MERCH.y - 15, 8, 5); px(x, P.woodD, X, MERCH.y - 14, 6, 3); px(x, a, X, MERCH.y - 16, 3, 2); px(x, b, X + 3, MERCH.y - 16, 3, 2); }
}

// ---------- rótulos na tela (barracas, animais, mercador)
function econLabels(ctx2, L, T, S, fs, p) {
  if (!p || p.room) return; const t = performance.now() / 1000; ctx2.textAlign = 'center'; ctx2.textBaseline = 'bottom'; ctx2.lineJoin = 'round';
  const lab = (txt, wx, wy, col = '#fff8e0', sc = .78) => { const sx = Math.round((wx - L) * S), sy = Math.round((wy - T) * S); ctx2.font = `700 ${Math.round(fs * sc)}px Pix, monospace`; ctx2.lineWidth = Math.max(3, fs / 4); ctx2.strokeStyle = '#140e06'; ctx2.strokeText(txt, sx, sy); ctx2.fillStyle = col; ctx2.fillText(txt, sx, sy); };
  if (Math.hypot(p.x - MERCH.x, p.y - MERCH.y) < 110) lab('Mercador Bento · compra e vende', MERCH.x, MERCH.y - 34, '#ffd84a', .85);
  for (const d of DECOR) if (d.kind === 'barraca' && Math.hypot(p.x - d.x, p.y - d.y) < 90) lab(d.owner === me ? 'Sua barraca' : `Barraca de @${d.owner}`, d.x, d.y - 27, '#ffd84a');
  for (const a of ANIMALS_L) { const q = animalPos(a, t); if (Math.hypot(p.x - q.X, p.y - q.Y) < 70) lab(a.owner === me ? ({ vaca: 'Sua vaca', porco: 'Seu porco', galinha: 'Sua galinha' })[a.kind] : `${ANIM[a.kind].name} de @${a.owner}`, q.X, q.Y - (a.kind === 'vaca' ? 16 : 11), a.owner === me ? '#a6da6a' : '#fff8e0', .68); }
}

// ---------- ações perto das coisas
function econContext(p) {
  if (p.room) return null; const t = performance.now() / 1000;
  if (Math.hypot(p.x - MERCH.x, p.y - (MERCH.y + 6)) < 30) return { kind: 'econ', label: 'Falar com o Mercador', fn: () => openEcon('merchant') };
  let best = null, bd = 16;
  for (const a of ANIMALS_L) { const q = animalPos(a, t), dd = Math.hypot(p.x - q.X, p.y - q.Y); if (dd < bd) { bd = dd; best = a; } }
  if (best) { const A = ANIM[best.kind];
    if (best.owner === me) return best.ready ? { kind: 'econ', label: A.act, fn: () => { send({ t: 'animalAct', id: best.id, what: 'collect' }); doAct('gather'); }, alt: { label: 'Guardar', fn: () => send({ t: 'animalAct', id: best.id, what: 'pickup' }) }, id: best.id }
      : { kind: 'econ', label: `${A.name}: pronto em ${Math.max(1, Math.ceil((best.left - (performance.now() - (best.seen || 0))) / 60000))} min`, fn: () => { best.heart = performance.now(); }, alt: { label: 'Guardar', fn: () => send({ t: 'animalAct', id: best.id, what: 'pickup' }) }, id: best.id };
    return { kind: 'econ', label: `Fazer carinho (${A.name.toLowerCase()} de @${best.owner})`, fn: () => { best.heart = performance.now(); }, id: best.id }; }
  for (const d of DECOR) { const dd = Math.hypot(p.x - d.x, p.y - d.y); if (dd > 18) continue;
    if (d.kind === 'barraca') return d.owner === me ? { kind: 'econ', label: 'Minha barraca (vender)', fn: () => openEcon('stall', d.id), alt: { label: 'Mover', fn: () => startPlacing({ kind: 'barraca', id: d.id }) }, id: d.id } : { kind: 'econ', label: `Ver barraca de @${d.owner}`, fn: () => openEcon('stall', d.id), id: d.id };
    if (d.kind === 'pomar' && d.owner === me) { const left = 4 * 60000 - (Date.now() - (d.lastH || 0)); return { kind: 'econ', label: left <= 0 ? 'Colher maçãs' : `Macieira: maçãs em ${Math.ceil(left / 60000)} min`, fn: () => { if (left <= 0) { send({ t: 'harvest', id: d.id }); doAct('gather'); } }, alt: { label: 'Mover', fn: () => startPlacing({ kind: 'pomar', id: d.id }) }, id: d.id }; } }
  return null;
}

// ---------- painel da economia (Mercador e barracas)
let ECON = null;
function openEcon(kind, id) { ECON = { kind, id }; closePanels(); $('econPanel').hidden = false; renderEcon(); }
function renderEcon() {
  if (!ECON || $('econPanel').hidden) return; const b = $('econBody'), coins = INV.moedas || 0; let h = `<div class="coins">Suas moedas: <b>${coins}</b></div>`;
  if (ECON.kind === 'merchant') { $('econTitle').textContent = 'Mercador Bento';
    h += '<h3>Vender para o mercador</h3>'; let any = false;
    for (const [k, pr] of Object.entries(MERCH_BUY)) { const n = INV[k] || 0; if (!n) continue; any = true; h += `<div class="item erow"><div><b>${nameOf(k)} × ${n}</b><span>${pr} moeda${pr > 1 ? 's' : ''} cada</span></div><div class="row2"><button data-a="ms" data-k="${k}" data-n="1">Vender 1</button><button data-a="ms" data-k="${k}" data-n="${n}">Vender tudo (${n * pr})</button></div></div>`; }
    for (const k of Object.keys(ANIM)) { const n = INV[k] || 0; if (!n) continue; any = true; h += `<div class="item erow"><div><b>${ANIM[k].name} × ${n}</b><span>${Math.floor(ANIM[k].price / 2)} moedas</span></div><div class="row2"><button data-a="ms" data-k="${k}" data-n="1">Vender 1</button></div></div>`; }
    if (!any) h += '<p class="hint">Traga frutas (dos arbustos e macieiras), leite, ovos ou trufas dos seus animais.</p>';
    h += '<h3>Comprar animais</h3>';
    for (const [k, A] of Object.entries(ANIM)) h += `<div class="item erow"><div><b>${A.name} · ${A.price} moedas</b><span>Dá ${nameOf(A.prod).toLowerCase()} de tempos em tempos. Só o dono recolhe.</span></div><button data-a="mb" data-k="${k}" ${coins < A.price ? 'disabled' : ''}>${coins < A.price ? 'Faltam moedas' : 'Comprar'}</button></div>`;
  } else {
    const d = DECOR.find(q => q.id === ECON.id); if (!d) { closePanels(); return; } const mine = d.owner === me; $('econTitle').textContent = mine ? 'Minha barraca' : `Barraca de @${d.owner}`;
    const shop = d.shop || [];
    if (!shop.length) h += `<p class="hint">${mine ? 'Sua barraca está vazia. Coloque coisas à venda abaixo.' : 'Essa barraca está vazia agora.'}</p>`;
    for (const it of shop) h += mine ? `<div class="item erow"><div><b>${nameOf(it.k)} × ${it.n}</b><span>${it.price} moeda${it.price > 1 ? 's' : ''} cada</span></div><button data-a="st" data-k="${it.k}">Recolher</button></div>`
      : `<div class="item erow"><div><b>${nameOf(it.k)} × ${it.n}</b><span>${it.price} moeda${it.price > 1 ? 's' : ''} cada</span></div><div class="row2"><button data-a="sb" data-k="${it.k}" data-n="1" ${coins < it.price ? 'disabled' : ''}>Comprar 1</button>${it.n > 1 ? `<button data-a="sb" data-k="${it.k}" data-n="${Math.min(it.n, Math.floor(coins / it.price))}" ${coins < it.price * 2 ? 'disabled' : ''}>Comprar ${Math.max(1, Math.min(it.n, Math.floor(coins / it.price)))}</button>` : ''}</div></div>`;
    if (mine) { const opts = Object.entries(INV).filter(([k, v]) => v > 0 && k !== 'moedas' && (GOOD_NAMES[k] || (RBY[k] && RBY[k].type !== 'tool')));
      h += '<h3>Colocar à venda</h3>' + (opts.length ? `<div class="sellform"><select id="eK">${opts.map(([k, v]) => `<option value="${k}">${nameOf(k)} (tem ${v})</option>`).join('')}</select><label>Quantos <input id="eN" type="number" min="1" value="1"></label><label>Preço (moedas cada) <input id="eP" type="number" min="1" max="999" value="${MERCH_BUY[opts[0][0]] ? MERCH_BUY[opts[0][0]] + 1 : 2}"></label><button data-a="sp">Colocar à venda</button></div>` : '<p class="hint">Sua mochila está vazia.</p>') + '<p class="hint">O dinheiro das vendas cai na sua mochila mesmo se você estiver offline.</p>'; }
  }
  b.innerHTML = h;
  for (const el of b.querySelectorAll('button[data-a]')) el.onclick = () => { const a = el.dataset.a, k = el.dataset.k, n = Number(el.dataset.n || 1);
    if (a === 'ms') send({ t: 'merchSell', k, n }); else if (a === 'mb') send({ t: 'merchBuy', k }); else if (a === 'st') send({ t: 'shopTake', id: ECON.id, k }); else if (a === 'sb') send({ t: 'shopBuy', id: ECON.id, k, n });
    else if (a === 'sp') send({ t: 'shopPut', id: ECON.id, k: $('eK').value, n: Number($('eN').value), price: Number($('eP').value) });
    play('coins', .5); };
}
function onEconMsg(m) {
  if (m.t === 'animals') { const now = performance.now(); ANIMALS_L = (m.list || []).map(a => ({ ...a, seen: now, heart: (ANIMALS_L.find(q => q.id === a.id) || {}).heart })); return true; }
  return false;
}

// ---------- construções novas
function econBuilding(type) {
  const O = P.ink;
  if (type === 'cabana') { const w = 26, [c, x] = canvas(w + 4, 30); x.fillStyle = 'rgba(10,30,20,.38)'; x.fillRect(4, 27, w, 3);
    px(x, O, 2, 13, w - 2, 15); for (let Y = 14; Y < 27; Y += 3) { px(x, '#6a3c22', 3, Y, w - 4, 3); px(x, '#8a5530', 3, Y, w - 4, 1); for (const X of [3, w - 3]) { px(x, '#b8814a', X - 1, Y, 2, 2); } }
    px(x, O, 9, 18, 7, 10); px(x, '#3a2414', 10, 19, 5, 9); px(x, '#ffd84a', 14, 23, 1, 1); px(x, O, 18, 17, 6, 6); px(x, '#ffd84a', 19, 18, 4, 4); px(x, '#5a3420', 21, 18, 1, 4);
    for (let Y = 0; Y < 14; Y++) { const i = Math.max(0, Math.round((1 - Y / 9) * 4)); px(x, O, i, Y, w + 2 - i * 2, 1); if (Y > 0 && Y < 13) for (let X = 1 + i; X <= w - i; X++) px(x, (Y + (X >> 2)) % 3 === 0 ? '#2c5a2a' : X > w - 3 ? '#3a6e30' : '#4a8a3a', X, Y); }
    px(x, '#6aa84a', 4, 1, w - 7, 1); return c; }
  if (type === 'celeiro') { const w = 36, [c, x] = canvas(w + 4, 38); x.fillStyle = 'rgba(10,30,20,.38)'; x.fillRect(4, 35, w, 3);
    px(x, O, 2, 15, w - 2, 21); for (let X = 3; X < w - 1; X++) px(x, X % 4 === 0 ? '#7a2018' : X > w - 5 ? '#8a2a1c' : '#a83a32', X, 16, 1, 19);
    px(x, O, 12, 20, 14, 16); px(x, '#f4f0d8', 13, 21, 12, 14); px(x, '#7a2018', 14, 22, 10, 12); for (let k = 0; k < 10; k++) { px(x, '#f4f0d8', 14 + k, 22 + Math.round(k * 1.2), 1, 1); px(x, '#f4f0d8', 23 - k, 22 + Math.round(k * 1.2), 1, 1); } px(x, '#f4f0d8', 13, 27, 12, 1);
    px(x, O, 16, 8, 6, 6); px(x, '#f4f0d8', 17, 9, 4, 4); px(x, '#3a2414', 18, 10, 2, 3);
    for (let Y = 0; Y < 16; Y++) { const i = Y < 6 ? Math.round((6 - Y) * 1.6) : 0; px(x, O, i, Y, w + 2 - i * 2, 1); if (Y > 0) for (let X = 1 + i; X <= w - i; X++) px(x, (Y + (X & 1)) % 3 === 0 ? '#2b3138' : X > w - 4 ? '#3e4554' : '#4a535c', X, Y); }
    px(x, '#f4f0d8', 0, 15, w + 2, 1); return c; }
  if (type === 'torre_vigia') { const w = 20, [c, x] = canvas(w + 4, 52); x.fillStyle = 'rgba(10,30,20,.38)'; x.fillRect(4, 49, w, 3);
    for (let Y = 16; Y < 50; Y++) for (let X = 3; X < w - 1; X++) { const u = (X - 3) / (w - 4), row = Math.floor(Y / 4), mort = Y % 4 === 3 || (X + (row % 2) * 3) % 6 === 0; px(x, mort ? '#4d5566' : u < .3 ? '#a2abbc' : u < .7 ? '#7a8396' : '#565e70', X, Y); }
    px(x, O, 2, 16, 1, 34); px(x, O, w - 1, 16, 1, 34); px(x, O, 7, 38, 8, 12); px(x, '#3a2414', 8, 39, 6, 11); px(x, O, 8, 24, 6, 7); px(x, '#ffd84a', 9, 25, 4, 5);
    px(x, O, 0, 12, w + 2, 5); px(x, P.wood, 1, 13, w, 3); px(x, P.woodL, 1, 13, w, 1); for (let X = 1; X < w; X += 3) px(x, P.woodD, X, 14, 1, 2);
    for (let Y = 0; Y < 12; Y++) { const half = Math.round(Y * 1.0) + 1; px(x, O, w / 2 + 1 - half - 1, Y, half * 2 + 2, 1); px(x, Y % 3 ? '#a83a32' : '#5a2418', w / 2 + 1 - half, Y, half * 2, 1); } return c; }
  if (type === 'moinho') { const w = 28, [c, x] = canvas(w + 4, 44); x.fillStyle = 'rgba(10,30,20,.38)'; x.fillRect(4, 41, w, 3);
    for (let Y = 16; Y < 42; Y++) { const half = Math.round(9 + (Y - 16) * .2); for (let X = -half; X <= half; X++) { const u = X / half, row = Math.floor(Y / 4), mort = Y % 4 === 3; px(x, Math.abs(X) === half ? O : mort ? '#c9a46a' : u < -.4 ? '#f4ecd8' : u < .4 ? '#e4d0a0' : '#c9a46a', w / 2 + 1 + X, Y); } }
    px(x, O, w / 2 - 3, 32, 8, 10); px(x, '#3a2414', w / 2 - 2, 33, 6, 9); px(x, O, w / 2 - 2, 22, 6, 6); px(x, '#ffd84a', w / 2 - 1, 23, 4, 4);
    for (let Y = 4; Y < 17; Y++) { const half = Math.round((Y - 4) * .85) + 1; px(x, O, w / 2 + 1 - half - 1, Y, half * 2 + 2, 1); px(x, Y % 3 ? '#8b5e3c' : '#5a3420', w / 2 + 1 - half, Y, half * 2, 1); } return c; }
  if (type === 'casarao') { const w = 46, H = 40, [c, x] = canvas(w + 4, H); fancyBuilding(x, { w, wallTop: 13, wallH: 24, roof: '#5a2418', roofD: '#3a1410', wall: '#e4d0a0', wallD: '#c9a46a', timber: true, door: 'wood', doorW: 8, windows: [4, 13, w - 20, w - 11], chim: true });
    for (const X of [4, 13, w - 20, w - 11]) { px(x, O, X - 1, 27, 7, 6); px(x, '#ffd84a', X, 28, 5, 4); px(x, '#5a3420', X + 2, 28, 1, 4); } return c; }
  return null;
}
function drawMillBlades(x, h, t) { const cx = h.x + 1, cy = h.y - 31, a0 = t * 1.2;
  for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    for (let r = 2; r < 17; r++) { const X = Math.round(cx + ca * r), Y = Math.round(cy + sa * r * .9); px(x, P.ink, X, Y, 1, 1); if (r > 5) { const pxl = Math.round(cx + ca * r - sa * 3), pyl = Math.round(cy + sa * r * .9 + ca * 3); px(x, P.ink, pxl, pyl, 1, 1); px(x, '#f4f0d8', Math.round((X + pxl) / 2), Math.round((Y + pyl) / 2), 1, 1); } } }
  px(x, P.ink, cx - 2, cy - 2, 4, 4); px(x, '#8b5e3c', cx - 1, cy - 1, 2, 2); }
addEventListener('DOMContentLoaded', () => { $('econClose').onclick = () => { $('econPanel').hidden = true; ECON = null; }; });
