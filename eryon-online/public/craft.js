// =====================================================================
// ERYON ONLINE — recursos, mochila, criação por classe e objetos no mapa
// (carregado depois de life.js e antes de game.js)
// =====================================================================
let RECIPES = [], RBY = {};
fetch('recipes.json').then(r => r.json()).then(l => { RECIPES = l; RBY = Object.fromEntries(l.map(r => [r.id, r])); });
let INV = { lenha: 0, pedra: 0, ervas: 0 };
const RES = [['lenha', 'Lenha'], ['pedra', 'Pedra'], ['ervas', 'Ervas']];

// ---------------------------------------------------------------- rochas e moitas de ervas (posições fixas, iguais para todos)
const NODES = [], DEPL = new Set();
function buildNodes() {
  const r = rng(777);
  let tries = 0;
  while (NODES.filter(n => n.kind === 'rock').length < 45 && tries++ < 4000) {
    const x = 20 + r() * (OW - 40), y = 40 + r() * (OH - 80), dc = Math.hypot(x - C.x, (y - C.y) * 1.05);
    if (dc < 225 || blocked(x, y) || blocked(x + 6, y) || blocked(x - 6, y) || Math.abs(y - riverY(x)) < 20) continue;
    if (NODES.some(n => Math.hypot(n.x - x, n.y - y) < 30)) continue;
    NODES.push({ id: 'r' + NODES.length, kind: 'rock', x: Math.round(x), y: Math.round(y), s: Math.floor(r() * 3) });
  }
  tries = 0; let hi = 0;
  while (hi < 50 && tries++ < 4000) {
    const x = 20 + r() * (OW - 40), y = 40 + r() * (OH - 80), dc = Math.hypot(x - C.x, (y - C.y) * 1.05);
    if (dc < 90 || blocked(x, y) || Math.abs(y - riverY(x)) < 16) continue;
    if (NODES.some(n => Math.hypot(n.x - x, n.y - y) < 26)) continue;
    NODES.push({ id: 'h' + hi++, kind: 'herb', x: Math.round(x), y: Math.round(y), s: Math.floor(r() * 3) });
  }
  // terras novas: mais pedra e ervas (ids continuam a numeração)
  const r2 = rng(778); let ri = 45, hj = 50; tries = 0;
  while ((ri < 160 || hj < 190) && tries++ < 20000) {
    const x = 20 + r2() * (WW - 40), y = 40 + r2() * (WH - 80), herb = r2() < .55; if (biomeAt(x, y) === 0 || blocked(x, y) || blocked(x + 6, y) || Math.abs(y - riverY(x)) < 20 || inLake(x, y) || lakeVal(x, y) < 1.3) continue;
    if (NODES.some(n => Math.abs(n.x - x) < 30 && Math.abs(n.y - y) < 30)) continue;
    if (herb && hj < 190) NODES.push({ id: 'h' + hj++, kind: 'herb', x: Math.round(x), y: Math.round(y), s: Math.floor(r2() * 3) });
    else if (!herb && ri < 160) NODES.push({ id: 'r' + ri++, kind: 'rock', x: Math.round(x), y: Math.round(y), s: Math.floor(r2() * 3) });
  }
}
const ROCK_SPR = [];
function rockSprite(k) {   // pedra mineável: blocos facetados com contorno, rachaduras, musgo e veios brilhando
  if (ROCK_SPR[k]) return ROCK_SPR[k];
  const [c, x] = canvas(28, 26), pt = painter(x), ST = ['#4d5566', '#6e7789', '#939cae', '#c3cad6'], O = '#22262f', s = 1 + k * .25;
  softShadow(x, 15, 22, 11 * s, 2.5, .35);
  pt.poly([[14 - 9 * s, 22], [14 - 8 * s, 22 - 7 * s], [14 - 3 * s, 22 - 12 * s], [14 + 4 * s, 22 - 11 * s], [14 + 8 * s, 22 - 5 * s], [14 + 9 * s, 22]], ST, O, .05).done();
  if (k > 0) pt.poly([[20 - 2 * k, 22], [21 - 2 * k, 17], [25, 16], [27, 22]], ST, O, -.1).done();
  pt.poly([[3, 22], [4, 18], [8, 17], [10, 22]], ST, O).done();
  // faces: topo claro, lado direito escuro
  px(x, ST[3], Math.round(14 - 3 * s), Math.round(22 - 11 * s), Math.round(6 * s), 1);
  px(x, ST[0], Math.round(14 + 3 * s), Math.round(22 - 6 * s), 1, Math.round(5 * s)); px(x, ST[0], Math.round(14 + 2 * s), Math.round(22 - 2 * s), Math.round(3 * s), 1);
  px(x, O, 12, Math.round(22 - 8 * s), 1, 3); px(x, O, 13, Math.round(22 - 5 * s), 1, 2);    // rachadura
  px(x, '#3fd0e0', Math.round(14 - 5 * s), Math.round(22 - 5 * s), 2, 1); px(x, '#c8f6ff', Math.round(14 - 5 * s), Math.round(22 - 5 * s), 1, 1);   // veio
  px(x, '#66b350', Math.round(14 - 4 * s), Math.round(22 - 12 * s), Math.round(5 * s), 1); px(x, '#90d064', Math.round(14 - 3 * s), Math.round(22 - 12 * s), 2, 1); px(x, '#47994a', 4, 18, 4, 1);
  for (const [a2, b2] of [[2, 23], [25, 23], [9, 23]]) { px(x, '#47994a', a2, b2 - 2, 1, 2); px(x, '#90d064', a2 + 1, b2 - 3, 1, 2); }
  return ROCK_SPR[k] = c;
}
function drawNode(x, n) {
  const gone = DEPL.has(n.id), X = n.x, Y = n.y;
  if (n.kind === 'rock') {
    if (gone) { px(x, P.ink, X - 5, Y - 3, 11, 4); px(x, P.st1, X - 4, Y - 2, 4, 2); px(x, P.st2, X + 1, Y - 2, 3, 1); px(x, P.st1, X + 2, Y - 1, 2, 1); return; }
    const sp = rockSprite(n.s); x.drawImage(sp, X - 14, Y - 22);
  } else {
    if (gone) { px(x, P.f5, X - 1, Y - 3, 1, 3); px(x, P.f6, X + 1, Y - 2, 1, 2); return; }
    disc(x, X, Y - 4, 5, P.ink); disc(x, X, Y - 4, 4, P.f6); disc(x, X - 1, Y - 5, 2, P.f8);
    const fc = ['#f6b6d8', '#fff3b0', '#9ff3ff'][n.s]; px(x, fc, X - 3, Y - 6, 1, 1); px(x, fc, X + 2, Y - 7, 1, 1); px(x, fc, X + 1, Y - 3, 1, 1);
  }
}

// ---------------------------------------------------------------- objetos colocados pelos jogadores
let DECOR = [];
const DECOR_SPR = {};
function decorSprite(k) {
  if (DECOR_SPR[k]) return DECOR_SPR[k];
  const S2 = { cerca: [16, 11], cerca_v: [6, 21], banco: [16, 9], lanterna: [8, 18], fogueira: [14, 8], tabuas: [16, 10], canteiro: [16, 10], cristal: [10, 14], runa: [10, 14], alvo: [12, 14], estandarte: [9, 18], boneco: [11, 16], palco: [24, 12], barril: [10, 11] }[k] || [8, 8];
  const [c, x] = canvas(S2[0], S2[1]), W = S2[0], H = S2[1];
  const box = (X, Y, w, h, col) => { px(x, P.ink, X - 1, Y - 1, w + 2, h + 2); px(x, col, X, Y, w, h); };
  if (k === 'cerca') { x.fillStyle = 'rgba(10,30,20,.3)'; x.fillRect(1, H - 2, 15, 2);
    for (const r of [4, 7]) { px(x, P.ink, 1, r - 1, 14, 3); px(x, P.wood, 1, r, 14, 1); px(x, P.woodL, 1, r, 14, 1); }
    for (const X of [0, 12]) { px(x, P.ink, X, 1, 4, H - 2); px(x, P.ink, X + 1, 0, 2, 1); px(x, P.wood, X + 1, 1, 2, H - 4); px(x, P.woodL, X + 1, 1, 1, H - 4); px(x, P.woodD, X + 1, H - 4, 2, 1); }
    px(x, '#47994a', 5, H - 3, 1, 2); px(x, '#84c65a', 9, H - 3, 1, 1); }
  if (k === 'cerca_v') { x.fillStyle = 'rgba(10,30,20,.3)'; x.fillRect(1, H - 2, 6, 2);
    for (const X of [1, 3]) { px(x, P.ink, X, 3, 3, H - 5); }
    px(x, P.woodL, 2, 4, 1, H - 7); px(x, P.wood, 4, 4, 1, H - 7);
    for (const Y of [0, H - 9]) { px(x, P.ink, 0, Y + 1, 6, 8); px(x, P.ink, 1, Y, 4, 1); px(x, P.wood, 1, Y + 1, 4, 6); px(x, P.woodL, 1, Y + 1, 2, 6); px(x, P.woodD, 1, Y + 6, 4, 1); px(x, '#b8814a', 2, Y + 1, 2, 1); } }
  if (k === 'banco') { box(1, 2, 14, 2, P.woodL); box(2, 5, 2, 3, P.wood); box(12, 5, 2, 3, P.wood); }
  if (k === 'lanterna') { box(3, 4, 2, 13, P.woodD); box(2, 1, 4, 4, P.st1); px(x, P.fire3, 3, 2, 2, 2); }
  if (k === 'fogueira') { for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; px(x, i % 2 ? P.st2 : P.st3, Math.round(7 + Math.cos(a) * 5) - 1, Math.round(5 + Math.sin(a) * 2), 2, 2); } px(x, P.woodD, 3, 5, 8, 1); }
  if (k === 'tabuas') { for (let i = 0; i < 3; i++) box(1 + i, 6 - i * 2, 13, 2, i % 2 ? P.woodL : P.wood); }
  if (k === 'canteiro') { box(1, 3, 14, 6, P.dirt1); for (let i = 0; i < 6; i++) { px(x, P.f8, 2 + i * 2, 1 + (i % 2), 1, 4); if (i % 2) px(x, '#f6b6d8', 2 + i * 2, 1, 1, 1); } }
  if (k === 'cristal') { box(3, 2, 4, 9, P.cy); px(x, P.cy2, 4, 2, 1, 7); px(x, P.ink, 2, 12, 6, 1); px(x, P.st2, 2, 11, 6, 2); }
  if (k === 'runa') { box(2, 1, 6, 12, P.st2); px(x, P.st3, 2, 1, 2, 12); for (const [a, b2] of [[4, 3], [5, 5], [4, 7], [6, 9]]) px(x, P.cy2, a, b2, 1, 1); }
  if (k === 'alvo') { box(5, 9, 1, 5, P.wood); disc(x, 6, 6, 5, P.ink); disc(x, 6, 6, 4, '#eef0ea'); disc(x, 6, 6, 3, '#a83a32'); disc(x, 6, 6, 1, '#eef0ea'); }
  if (k === 'estandarte') { box(1, 1, 1, 16, P.woodD); box(3, 2, 5, 8, '#a83a32'); px(x, P.fire3, 4, 4, 3, 1); px(x, P.fire3, 5, 6, 1, 2); }
  if (k === 'boneco') { box(5, 2, 1, 13, P.woodD); box(2, 5, 7, 1, P.woodD); box(3, 6, 5, 6, '#c9a46a'); box(4, 1, 3, 3, '#e4d0a0'); }
  if (k === 'palco') { box(1, 3, 22, 7, P.wood); px(x, P.woodL, 1, 3, 22, 2); for (let i = 2; i < 22; i += 4) px(x, P.woodD, i, 5, 1, 5); }
  if (k === 'barril') { box(1, 1, 8, 9, P.wood); px(x, '#2b3138', 1, 3, 8, 1); px(x, '#2b3138', 1, 7, 8, 1); px(x, P.woodL, 2, 1, 2, 9); }
  return DECOR_SPR[k] = { c, ax: Math.floor(W / 2), ay: H - 1 };
}
const DECOR_BLOCK = { banco: 7, barril: 4, boneco: 3, alvo: 3, runa: 4, cristal: 3, palco: 11, tabuas: 7, cerca: 7, fogueira: 6, lanterna: 2, estandarte: 1, canteiro: 7 };
function decorBlocked(x, y) { for (const d of DECOR) { if (d.kind === 'cerca' && d.rot) { if (x > d.x - 3 && x < d.x + 3 && y > d.y - 15 && y < d.y + 1) return true; continue; }
  const w = DECOR_BLOCK[d.kind] || 3; if (x > d.x - w && x < d.x + w && y > d.y - 4 && y < d.y + 1) return true; } return false; }
const sprKey = d => d.kind === 'cerca' && d.rot ? 'cerca_v' : d.kind;
function drawDecor(x, d, t) {
  const s = decorSprite(sprKey(d)); x.drawImage(s.c, d.x - s.ax, d.y - s.ay);
  if (d.kind === 'fogueira') drawFire(x, d.x, d.y - 1, t, .7);
  if (d.kind === 'cristal') glow(x, d.x, d.y - 8, 8, P.cy, .12 + .06 * Math.sin(t * 3 + d.id));
  if (d.kind === 'lanterna') glow(x, d.x, d.y - 15, 7, P.fire3, .14);
}
const DECOR_LIGHT = { fogueira: 30, lanterna: 22, cristal: 18 };

// ---------------------------------------------------------------- painéis: mochila e criação
const near = (b, p, r) => b && Math.hypot(p.x - b.x, p.y - b.y) < r;
function wherOk(rc, p) { if (!rc.where) return true; if (p.room) return false; return rc.where === 'forja' ? near(B.forja, p, 45) : rc.where === 'cozinha' ? near(B.cozinha, p, 36) : true; }
const costText = c => Object.entries(c).map(([k, v]) => `${v} ${k}`).join(' + ');
function hasCost(c) { return Object.entries(c).every(([k, v]) => (INV[k] || 0) >= v); }
function nearestPlayer(p, r = 32) { let best = r, who = null; for (const q of players.values()) { if (q.mine || (q.room || '') !== (p.room || '')) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < best) { best = d; who = q; } } return who; }
function renderBag() {
  const p = players.get(myId); if (!p) return;
  $('bagRes').innerHTML = RES.map(([k, n]) => `<div class="res"><b>${INV[k] || 0}</b><span>${n}</span></div>`).join('');
  const list = $('bagItems'); list.innerHTML = '';
  const items = Object.entries(INV).filter(([k, v]) => RBY[k] && v > 0);
  if (!items.length) { list.innerHTML = '<p class="hint">Sua mochila está vazia. Junte lenha, pedra e ervas e crie itens no botão "Criar".</p>'; }
  const mate = nearestPlayer(p), eq = p.look && p.look.equip;
  for (const [k, v] of items) {
    const rc = RBY[k], row = document.createElement('div'); row.className = 'item';
    const t = document.createElement('div'); t.innerHTML = `<b></b><span></span>`; t.querySelector('b').textContent = `${rc.name} × ${v}`; t.querySelector('span').textContent = rc.desc || '';
    row.appendChild(t); const acts = document.createElement('div'); acts.className = 'row2';
    const btn = (label, fn, dis) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.disabled = !!dis; b.onclick = fn; acts.appendChild(b); };
    if (rc.type === 'food') btn('Usar', () => { send({ t: 'use', id: k }); doAct(k === 'pocao' ? 'heal' : 'drink'); closePanels(); });
    if (rc.type === 'equip') btn(eq === k ? 'Guardar' : 'Equipar', () => { send({ t: 'equip', id: eq === k ? null : k }); closePanels(); });
    if (rc.type === 'decor') btn('Colocar', () => { if (p.room) return sys('Coloque objetos do lado de fora.'); closePanels(); startPlacing({ kind: k }); }, p.room);
    if (rc.type === 'tool') { const s = document.createElement('span'); s.className = 'tag'; s.textContent = 'ativo'; acts.appendChild(s); }
    btn(mate ? `Dar p/ @${mate.username}` : 'Dar (chegue perto de alguém)', () => { if (mate) { send({ t: 'give', id: k, to: mate.id }); closePanels(); } }, !mate);
    row.appendChild(acts); list.appendChild(row);
  }
  $('carryBtn').textContent = p.carry ? 'Guardar a lenha do ombro' : 'Carregar lenha no ombro';
}
function renderCraft() {
  const p = players.get(myId); if (!p) return; const c = classOf(p), list = $('craftList'); list.innerHTML = '';
  $('craftTitle').textContent = c ? `Criar · ${c.name}` : 'Criar';
  if (!c) { list.innerHTML = '<p class="hint">Escolha um personagem em "Meu avatar" para criar coisas. Cada personagem cria itens diferentes.</p>'; return; }
  for (const rc of RECIPES.filter(r => r.cls === c.id)) {
    const row = document.createElement('div'); row.className = 'item'; const t = document.createElement('div'); t.innerHTML = '<b></b><span></span><em></em>';
    t.querySelector('b').textContent = rc.name + (rc.make ? ` (×${rc.make})` : ''); t.querySelector('span').textContent = rc.desc || '';
    const okW = wherOk(rc, p), okC = hasCost(rc.cost);
    t.querySelector('em').textContent = 'Custa: ' + costText(rc.cost) + (rc.where ? ` · só ${rc.where === 'forja' ? 'perto da forja' : 'na cozinha'}` : '');
    const b = document.createElement('button'); b.type = 'button'; b.textContent = !okC ? 'Falta recurso' : !okW ? (rc.where === 'forja' ? 'Vá até a forja' : 'Vá até a cozinha') : 'Criar';
    b.disabled = !(okW && okC); b.onclick = () => { send({ t: 'craft', id: rc.id }); doAct(c.skill === 'chop' ? 'split' : c.skill === 'magic' ? 'magic' : c.skill); closePanels(); };
    row.append(t, b); list.appendChild(row);
  }
}
function openPanel(id) { const was = !$(id).hidden; closePanels(); if (was) return; $(id).hidden = false; if (id === 'bag') renderBag(); else renderCraft(); }
function closePanels() { if ($('menu')) $('menu').hidden = true; $('bag').hidden = true; $('craft').hidden = true; if ($('buildPanel')) $('buildPanel').hidden = true; if ($('mapPanel')) $('mapPanel').hidden = true; for (const id of ['questPanel', 'supPanel', 'repPanel']) if ($(id)) $(id).hidden = true; }
function send(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }
function setInv(inv) { INV = { lenha: 0, pedra: 0, ervas: 0, ...inv }; wood = INV.lenha || 0; showWood(); if (!$('bag').hidden) renderBag(); if (!$('craft').hidden) renderCraft(); }

// ---------------------------------------------------------------- tipos de construção da cidade
const BTYPES = {
  casa: { name: 'Casa', cost: { lenha: 10 }, w: 26, desc: 'Sua casa em Eryon.' },
  bar: { name: 'Bar', cost: { lenha: 14, pedra: 4 }, w: 34, walls: '#8b5e3c', wallsD: '#6b4630', roof: ['#a83a32', '#5a2418'], sign: 'mug', desc: 'Para beber e conversar.' },
  mercado: { name: 'Mercado', cost: { lenha: 12, pedra: 4, ervas: 2 }, w: 32, walls: '#e4d0a0', wallsD: '#c9a46a', roof: ['#eef0ea', '#a83a32'], stripes: true, sign: 'crate', desc: 'Onde se troca de tudo.' },
  hospital: { name: 'Hospital', cost: { lenha: 12, pedra: 8, ervas: 4 }, w: 36, walls: '#eef0ea', wallsD: '#c4ccd0', roof: ['#3c5d4a', '#1c3831'], sign: 'leaf', desc: 'Cuida dos moradores.' },
  escola: { name: 'Escola', cost: { lenha: 14, pedra: 6 }, w: 34, walls: '#e4d0a0', wallsD: '#c9a46a', roof: ['#3c5f9a', '#1d3550'], sign: 'book', desc: 'Para aprender os segredos de Eryon.' },
  banco: { name: 'Banco', cost: { lenha: 10, pedra: 14 }, w: 34, walls: '#c4ccd0', wallsD: '#98a4ac', roof: ['#4a535c', '#2b3138'], sign: 'coin', columns: true, desc: 'Guarda as riquezas da cidade.' },
  prefeitura: { name: 'Prefeitura', cost: { lenha: 20, pedra: 16 }, w: 46, walls: '#c4ccd0', wallsD: '#98a4ac', roof: ['#6e4a8a', '#3a2650'], sign: 'flag', columns: true, tower: true, limit: 1, desc: 'Só existe uma. O coração da cidade.' },
};
const B_SPR = {};
function buildingSprite(type, roofIdx) {
  if (type === 'casa' || !BTYPES[type]) return HOUSE_SPR[roofIdx || 0];
  if (B_SPR[type]) return B_SPR[type];
  const T = BTYPES[type], w = T.w, wallH = 16, roofH = 13, top = T.tower ? 14 : 0, H = top + roofH + wallH + 3, [c, x] = canvas(w + 4, H);
  const y0 = top + roofH - 2;
  fancyBuilding(x, { w, wallTop: y0, wallH: wallH + 1, roofTop: top, roof: T.roof[0], roofD: T.roof[1], wall: T.walls, wallD: T.wallsD, stripes: T.stripes, columns: T.columns, stone: !!T.columns, timber: !T.columns && type !== 'hospital', door: type === 'bar' || type === 'mercado' ? 'open' : 'wood', doorW: w > 40 ? 8 : 6, windows: w > 40 ? [5, 15, w - 20, w - 10] : [4, w - 10], chim: type === 'bar' || type === 'escola' });
  if (T.tower) { const tx = Math.floor(w / 2) - 5; px(x, P.ink, tx, 2, 11, top + 2); px(x, T.walls, tx + 1, 3, 9, top); for (let y = 4; y < top; y += 3) px(x, T.wallsD, tx + 1, y, 9, 1); disc(x, tx + 5, 8, 3, P.ink); disc(x, tx + 5, 8, 2, '#eef0ea'); px(x, P.ink, tx + 5, 6, 1, 3); px(x, P.ink, tx + 5, 8, 2, 1); px(x, P.woodD, tx + 10, 0, 1, 8); px(x, '#a83a32', tx + 11, 0, 5, 4); px(x, P.fire3, tx + 12, 1, 2, 1); }
  // placa
  const sx = Math.floor(w / 2) - 4, sy = y0 - 3; px(x, P.ink, sx, sy, 9, 7); px(x, P.woodL, sx + 1, sy + 1, 7, 5);
  const ic = { mug: [[2, 1, 3, 3, P.fire4], [5, 2, 1, 1, P.ink]], crate: [[2, 1, 4, 3, P.dirt3], [2, 2, 4, 1, P.woodD]], leaf: [[3, 1, 2, 3, '#4e6c4a'], [2, 2, 4, 1, '#9cbf62']], book: [[2, 1, 4, 3, '#3c5f9a'], [4, 1, 1, 3, '#eef0ea']], coin: [[2, 1, 3, 3, P.fire3], [3, 2, 1, 1, P.fire2]], flag: [[2, 1, 4, 2, '#a83a32'], [2, 3, 1, 1, P.woodD]] }[T.sign] || [];
  for (const [a, b2, ww, hh, col] of ic) px(x, col, sx + 1 + a, sy + b2, ww, hh);
  return B_SPR[type] = c;
}
const costOf = (type, cls) => { const c = { ...BTYPES[type].cost }; if (cls === 'construtor') for (const k in c) c[k] = Math.ceil(c[k] * .6); return c; };
function renderBuild() {
  const p = players.get(myId); if (!p) return; const cls = (classOf(p) || {}).id, list = $('buildList'); list.innerHTML = '';
  const mine = BUILT.filter(h => h.owner === me).length;
  $('buildHint').textContent = `Você tem ${mine}/5 construções.` + (cls === 'construtor' ? ' Construtor paga 40% menos.' : '');
  for (const [id, T] of Object.entries(BTYPES)) {
    const cost = costOf(id, cls), taken = T.limit && BUILT.some(h => h.type === id), ok = hasCost(cost) && !taken && mine < 5;
    const row = document.createElement('div'); row.className = 'item brow';
    const cv2 = document.createElement('canvas'); const spr = buildingSprite(id, 0); cv2.width = spr.width; cv2.height = spr.height; cv2.className = 'bimg'; const q2 = cv2.getContext('2d'); q2.imageSmoothingEnabled = false; q2.drawImage(spr, 0, 0);
    const t = document.createElement('div'); t.innerHTML = '<b></b><span></span><em></em>'; t.querySelector('b').textContent = T.name; t.querySelector('span').textContent = T.desc; t.querySelector('em').textContent = 'Custa: ' + costText(cost) + (T.limit ? ' · única na cidade' : '');
    const b = document.createElement('button'); b.type = 'button'; b.textContent = taken ? 'Já existe' : mine >= 5 ? 'Limite atingido' : ok ? 'Construir aqui' : 'Falta recurso'; b.disabled = !ok;
    b.onclick = () => { send({ t: 'build', type: id, x: Math.round(p.x) + 1, y: Math.round(p.y) - 6 }); doAct('build'); $('buildPanel').hidden = true; };
    row.append(cv2, t, b); list.appendChild(row);
  }
}

// ---------------------------------------------------------------- modo de colocar/mover objetos (com prévia e encaixe das cercas)
let placing = null;
function startPlacing(o) { placing = { kind: o.kind, id: o.id || null, rot: o.rot ? 1 : 0 }; $('placeBar').hidden = false; $('placeRot').hidden = placing.kind !== 'cerca'; $('placeOk').textContent = (placing.id ? 'Soltar ' : 'Colocar ') + ((RBY[placing.kind] || {}).name || 'objeto').toLowerCase(); document.body.classList.add('placing'); }
function stopPlacing() { placing = null; $('placeBar').hidden = true; document.body.classList.remove('placing'); }
function placeSpot(p) {
  let X = p.x + (p.face || 1) * 12, Y = p.y + 3;
  if (placing.kind === 'cerca') { if (placing.rot) { X = Math.round(X / 6) * 6; Y = Math.round(Y / 15) * 15; } else { X = Math.round(X / 14) * 14; Y = Math.round(Y / 6) * 6; } }
  X = Math.round(X); Y = Math.round(Y);
  const ok = !p.room && Math.abs(Y - riverY(X)) > 12 && !blocked(X, Y - 1) && Math.hypot(X - p.x, Y - p.y) < 38 && !DECOR.some(d => d.id !== placing.id && Math.abs(d.x - X) < 3 && Math.abs(d.y - Y) < 3);
  return { X, Y, ok };
}
function drawPlacing(x, p, t) {
  if (!placing || !p || p.room) return; const { X, Y, ok } = placeSpot(p), s = decorSprite(placing.kind === 'cerca' && placing.rot ? 'cerca_v' : placing.kind);
  x.globalAlpha = .55 + .2 * Math.sin(t * 6); x.drawImage(s.c, X - s.ax, Y - s.ay); x.globalAlpha = 1;
  x.globalAlpha = .8; ring(x, X, Y, 3, ok ? '#84c65a' : '#e04a3a'); x.globalAlpha = 1;
}
function confirmPlacing() {
  const p = players.get(myId); if (!placing || !p) return; const { X, Y, ok } = placeSpot(p);
  if (!ok) return sys('Não dá para colocar aí. Ande um pouco e tente de novo.');
  if (placing.id) send({ t: 'move', id: placing.id, x: X, y: Y, rot: placing.rot }); else send({ t: 'place', id: placing.kind, x: X, y: Y, rot: placing.rot });
  play('plank', .6);
  // cercas: continua no modo para emendar a próxima (se ainda tiver na mochila)
  if (!placing.id && placing.kind === 'cerca' && (INV.cerca || 0) > 1) { INV.cerca--; return; }
  stopPlacing();
}
