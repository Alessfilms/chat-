// =====================================================================
// REINO: peças do castelo que o Rei constrói, postos de guarda, Guardas Reais e cavalos
// =====================================================================
const CS_R = ['#4d5566', '#6e7789', '#939cae', '#c3cad6'];
function royalDecor(k) {
  if (k === 'muralha_rei') { const [c, x] = canvas(32, 30); x.fillStyle = 'rgba(10,30,20,.32)'; x.fillRect(1, 27, 31, 3); cBricks(x, 1, 9, 30, 19, CS_R, 7); cMerlons(x, 1, 9, 30, CS_R); px(x, '#47994a', 3, 26, 4, 1); px(x, '#47994a', 22, 26, 3, 1); return { c, ax: 16, ay: 28 }; }
  if (k === 'muralha_rei_v') { const [c, x] = canvas(12, 46); x.fillStyle = 'rgba(10,30,20,.32)'; x.fillRect(1, 43, 11, 3); cBricks(x, 1, 6, 10, 38, CS_R, 3); cMerlons(x, 1, 6, 10, CS_R); return { c, ax: 6, ay: 44 }; }
  if (k === 'torre_rei') { const [c, x] = canvas(32, 82); x.fillStyle = 'rgba(10,30,20,.32)'; x.beginPath(); x.ellipse(16, 78, 15, 4, 0, 0, 6.283); x.fill();
    cTower(x, 16, 42, 78, 13, CS_R); cWindow(x, 14, 52); cRoof(x, 16, 44, 15, 24); cFlag(x, 16, 8); return { c, ax: 16, ay: 79 }; }
  if (k === 'portao_rei') { const [c, x] = canvas(40, 40); x.fillStyle = 'rgba(10,30,20,.32)'; x.fillRect(1, 37, 39, 3);
    cBricks(x, 1, 10, 10, 28, CS_R, 2); cBricks(x, 29, 10, 10, 28, CS_R, 5); cBricks(x, 1, 6, 38, 9, CS_R, 9); cMerlons(x, 1, 6, 38, CS_R);
    for (let Y = 15; Y < 38; Y++) { const w = Y < 21 ? Math.round(9 * Math.sqrt(1 - ((21 - Y) / 6) ** 2)) : 9; px(x, '#1a1d24', 20 - w - 1, Y, w * 2 + 2, 1); px(x, '#140e06', 20 - w, Y, w * 2, 1); }
    for (let X = 12; X < 29; X += 3) px(x, '#565e70', X, 17, 1, 13); for (const Y of [19, 24, 29]) px(x, '#565e70', 12, Y, 17, 1); for (let X = 12; X < 29; X += 3) px(x, '#a0a9b6', X, 30, 1, 2);
    cFlag(x, 4, -1); cFlag(x, 34, -1); return { c, ax: 20, ay: 38 }; }
  if (k === 'posto_guarda') { const [c, x] = canvas(18, 30); x.fillStyle = 'rgba(10,30,20,.32)'; x.fillRect(1, 27, 17, 3); px(x, P.ink, 2, 10, 14, 18); px(x, P.wood, 3, 11, 12, 16); px(x, P.woodL, 3, 11, 1, 16); for (let Y = 14; Y < 27; Y += 4) px(x, P.woodD, 3, Y, 12, 1);
    px(x, '#140e06', 6, 15, 6, 12); px(x, P.ink, 0, 4, 18, 7); for (let X = 1; X < 17; X++) px(x, (X >> 1) % 2 ? '#3f7ab0' : '#c0302a', X, 5, 1, 5); for (let X = 1; X < 17; X += 2) px(x, '#ffd84a', X, 9, 1, 1); px(x, P.ink, 8, 0, 2, 5); px(x, '#ffd84a', 8, 0, 2, 1);
    return { c, ax: 9, ay: 28 }; }
  return null;
}
// ---------- guardas dos postos (NPC): um em cada posto colocado pelo Rei
const POST_G = new Map();
function allGuards() {
  const seen = new Set();
  for (const d of DECOR) if (d.kind === 'posto_guarda') { seen.add(d.id); let g = POST_G.get(d.id); const hx = d.x + 13, hy = d.y + 2;
    if (!g) { g = { a: [hx - 8, hy], b: [hx + 8, hy], skin: ['#c08060', '#e8b48c', '#8b5e3c', '#f2c9a4', '#5a3a26'][d.id % 5], i: 20 + (d.id % 50), x: hx, y: hy, moving: false, fc: 1, ch: null, post: true }; POST_G.set(d.id, g); }
    else { g.a = [hx - 8, hy]; g.b = [hx + 8, hy]; } }
  for (const id of POST_G.keys()) if (!seen.has(id)) POST_G.delete(id);
  return POST_G.size ? GUARDS.concat([...POST_G.values()]) : GUARDS;
}
// ---------- Guardas Reais e cavalos
function canHorse(p) { return !!p && ((KING && p.username === KING) || RGS.has(p.username) || (classOf(p) || {}).id === 'guarda'); }
function updHorseBtn() { const b = $('horseBtn'), p = players.get(myId); if (!b) return; b.hidden = !canHorse(p); b.classList.toggle('on', !!(p && p.horse)); b.querySelector('span').textContent = p && p.horse ? '🐎 Descer' : '🐎 Cavalo'; }
function toggleHorse() { const p = players.get(myId); if (!p || !canHorse(p)) return; if (p.room) return sys('Saia para o lado de fora para montar no cavalo.'); if (p.fly) return sys('Pouse antes de montar no cavalo.');
  p.horse = !p.horse; if (p.horse) { fxToast('A cavalo!', 'Você anda bem mais rápido. Proteja a cidade!', '#9fc4ff', '🐎'); play('whoosh', .4, .7); } updHorseBtn(); }
addEventListener('DOMContentLoaded', () => { const b = $('horseBtn'); if (b) b.onclick = () => { sndStart(); toggleHorse(); }; addEventListener('keydown', e => { if ((e.key === 'h' || e.key === 'H') && document.activeElement && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') toggleHorse(); }); });
var onKingdomMsg = function (m) {
  if (m.t === 'cutMine') { MYCUTS.add(m.i); return true; }
  if (m.t === 'rg') { const q = players.get(m.id); if (q) { if (m.rg) RGS.add(q.username); else { RGS.delete(q.username); q.horse = false; } q.ch = charFor(q.username, q.look); } return true; }
  if (m.t === 'rgMe') { const p = players.get(myId); if (p) { if (m.rg) RGS.add(p.username); else { RGS.delete(p.username); p.horse = false; } p.ch = charFor(p.username, p.look); }
    if (m.rg) { fxToast('VOCÊ É GUARDA REAL!', 'Toque em 🐎 Cavalo para montar e proteja Eryon', '#9fc4ff', '🛡'); fanfare(true); } else sys('Você não é mais Guarda Real.'); updHorseBtn(); return true; }
  return false;
};
// cavalo de lado (olhando para a direita); o do Rei é branco com manta vermelha, o dos guardas é castanho com manta azul
const HSPR = {};
function horseSprite(royal, f) {
  const key = (royal ? 'r' : 'g') + f; if (HSPR[key]) return HSPR[key]; const [c, x] = canvas(34, 26), O = '#140e06', pt = painter(x);
  const BD = royal ? ['#8a8478', '#c4c0b4', '#e8e4d8', '#ffffff'] : ['#3a2214', '#6b4630', '#8b5e3c', '#b8814a'], MN = royal ? '#d8d0c0' : '#1a1208', CP = royal ? ['#6a1410', '#a8261a', '#c0302a'] : ['#142a48', '#1d3550', '#3f7ab0'];
  const L = [[[10, 0], [13, 0], [21, 0], [24, 0]], [[8, -2], [12, 1], [20, 2], [25, -2]], [[11, 1], [14, -2], [22, -2], [23, 1]], [[9, -1], [13, 2], [19, 1], [26, -1]]][f];
  for (const [i, [lx, sw]] of L.entries()) pt.tube([[lx, 14], [lx + sw, 19], [lx + sw * .5, 23]], 1.6, i % 2 ? BD : BD.map(v => shadeHex(v, .8)), O);
  pt.done();
  pt.tube([[6, 11, 2], [3, 15, 1.5], [2, 19, 1]], 1.5, [MN, MN, MN, MN], O).ell(17, 12, 10, 5.5, BD, O).tube([[24, 10, 3.5], [27, 4, 2.8]], 3, BD, O).ell(29, 4, 4.5, 2.6, BD, O).done();
  px(x, O, 26, 0, 2, 2); px(x, BD[2], 26, 1, 1, 1); px(x, O, 30, 3, 1, 1); px(x, O, 32, 5, 1, 1);
  for (let k = 0; k < 6; k++) px(x, MN, 23 + Math.round(k * .6), 9 - k, 2, 1);
  // manta com franja dourada e sela
  px(x, O, 11, 7, 13, 9); px(x, CP[1], 12, 8, 11, 7); px(x, CP[2], 12, 8, 11, 1); px(x, CP[0], 12, 13, 11, 1); for (let X = 12; X < 23; X += 2) px(x, '#ffd84a', X, 15, 1, 1); px(x, '#ffd84a', 16, 10, 3, 3); px(x, CP[1], 17, 11, 1, 1);
  px(x, O, 14, 5, 7, 3); px(x, '#6b4630', 15, 6, 5, 1); px(x, O, 29, 4, 4, 1);
  return HSPR[key] = { r: c, l: flipped(c) };
}
function drawRider(x, q, t) {
  const royal = !!KING && q.username === KING, f = q.moving ? Math.floor(t * 10 + (q.ph || 0)) % 4 : 0, s = horseSprite(royal, f), face = q.face || 1, bob = q.moving && f % 2 ? 1 : 0;
  x.fillStyle = 'rgba(5,10,8,.4)'; x.beginPath(); x.ellipse(q.x, q.y, 12, 3, 0, 0, 6.283); x.fill();
  const hx = Math.round(q.x - 17), hy = Math.round(q.y - 24 - bob);
  x.drawImage(face < 0 ? s.l : s.r, hx, hy);
  const tool = royal ? null : 'spear', po = { legs: 'sit', arm: tool ? 'down' : 'low', tool, eyes: 0, br: 0 };
  drawCharAt(x, q.ch, q.x - face, q.y - 14 - bob, po, face);
  if (q.moving && f === 1 && Math.random() < .5) burst(x, t, t - .05, q.x - face * 12, q.y - 1, 3, ['#c9a46a', '#a0784a'], 10, .4, 20, q.id || 1);
}
setInterval(() => { const p = players.get(myId); if (p && p.horse && (p.room || p.fly)) p.horse = false; updHorseBtn(); }, 2000);

// ---------- árvore cortada: toco + troncos caídos que vão se amontoando no chão (não some mais)
const LOG_SPR = {};
function logSprite(v) {
  if (LOG_SPR[v]) return LOG_SPR[v]; const [c, x] = canvas(30, 16), O = P.ink, BK = ['#3a2216', '#5a3a26', '#6b4630', '#8b5e3c'];
  x.fillStyle = 'rgba(10,30,20,.3)'; x.beginPath(); x.ellipse(15, 13, 14, 3, 0, 0, 6.283); x.fill();
  const log = (X, Y, L) => { px(x, O, X - 1, Y - 1, L + 2, 6); for (let k = 0; k < L; k++) { px(x, BK[(k * 7 + Y) % 3 === 0 ? 1 : 2], X + k, Y, 1, 4); px(x, BK[3], X + k, Y, 1, 1); px(x, BK[0], X + k, Y + 3, 1, 1); if ((k + Y) % 5 === 0) px(x, BK[0], X + k, Y + 1, 1, 2); }
    px(x, O, X + L - 1, Y - 1, 4, 6); px(x, '#e4c590', X + L, Y, 2, 4); px(x, '#c9a46a', X + L, Y + 1, 2, 2); px(x, '#a0784a', X + L + 1, Y + 1, 1, 1); };   // ponta cortada com anéis
  if (v === 0) log(4, 9, 18);
  else if (v === 1) { log(3, 10, 17); log(8, 6, 16); }
  else { log(2, 10, 18); log(7, 10, 15); log(5, 6, 16); px(x, '#47994a', 3, 14, 3, 1); }
  return LOG_SPR[v] = c;
}
// troncos recolhidos e mudas plantadas
const LOGS = new Set(), MYCUTS = new Set(), FREECUTS = new Set(); let PLANTS = {};
function setTreeState(m) { LOGS.clear(); (m.logs || []).forEach(i => LOGS.add(i)); PLANTS = m.plants || {}; }
function drawSapling(x, o, k) {   // muda crescendo (k de 0 a 1)
  const h = Math.round(4 + k * 14), w = Math.round(2 + k * 6);
  px(x, P.ink, o.x - 1, o.y - h, 3, h); px(x, P.wood, o.x, o.y - h + 1, 1, h - 1);
  for (let i = 0; i < 2 + Math.round(k * 4); i++) { const yy = o.y - h + 2 + i * 2, ww = Math.max(2, w - i); px(x, '#1f5a3a', o.x - ww, yy - 1, ww * 2 + 1, 3); px(x, i % 2 ? '#47994a' : '#66b350', o.x - ww + 1, yy, ww * 2 - 1, 1); }
  px(x, '#84c65a', o.x, o.y - h - 1, 1, 2); px(x, '#6b4630', o.x - 3, o.y - 1, 7, 2);
}
function stumpContext(p) {
  let best = 12, bt = null; for (const tr of TREE_POS) { if (!CUT.has(tr.i)) continue; const d = Math.hypot(p.x - tr.x, (p.y - tr.y) * 1.2); if (d < best) { best = d; bt = tr; } } if (!bt) return null;
  const i = bt.i, pl = PLANTS[i], mine = MYCUTS.has(i) || FREECUTS.has(i);
  if (pl) { const left = Math.max(0, 5 * 60000 - (Date.now() - pl.at)); return { kind: 'econ', label: `Muda de @${pl.by} crescendo · ${Math.ceil(left / 60000)} min`, fn: () => {}, id: 'pl' + i }; }
  if (!LOGS.has(i)) return { kind: 'econ', label: 'Recolher a madeira (+2 lenha)', fn: () => { p.face = bt.x < p.x ? -1 : 1; send({ t: 'logs', tree: i }); doAct('gather'); }, id: 'lg' + i };
  if (mine) return { kind: 'econ', label: 'Plantar árvore', fn: () => { send({ t: 'plant', tree: i }); doAct('gather'); }, id: 'pt' + i };
  return null;
}
function drawCutTree(x, o) {
  const pl = PLANTS[o.tree]; if (pl) { drawSapling(x, o, Math.min(1, (Date.now() - pl.at) / (5 * 60000))); return; }
  const v = Math.floor(h2(o.tree, 31) * 3), fl = h2(31, o.tree) > .5, s = logSprite(v);
  // toco
  px(x, P.ink, o.x - 4, o.y - 5, 9, 6); px(x, P.wood, o.x - 3, o.y - 4, 7, 4); px(x, '#e4c590', o.x - 3, o.y - 4, 7, 2); px(x, '#c9a46a', o.x - 1, o.y - 4, 3, 1); px(x, P.woodD, o.x - 3, o.y - 1, 7, 1);
  // troncos caídos ao lado (somem depois que alguém recolhe a madeira)
  if (LOGS.has(o.tree)) return;
  if (fl) { x.save(); x.translate(Math.round(o.x - 2), 0); x.scale(-1, 1); x.drawImage(s, -30, Math.round(o.y - 12)); x.restore(); } else x.drawImage(s, Math.round(o.x + 2), Math.round(o.y - 12));
}

// =====================================================================
// PAINEL DO REI (só o Rei vê): tesouro, imposto, ordens, recompensas e guardas
// =====================================================================
let ROYAL = null;
function updKingBtn() { const b = $('kingBtn'); if (b) b.hidden = !(me && KING && me === KING); }
function openKing() { closePanels(); $('kingPanel').hidden = false; send({ t: 'royal', a: 'state' }); renderKing(); }
const kEsc = v => String(v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
function renderKing() {
  const b = $('kingBody'); if (!b || $('kingPanel').hidden) return; const R = ROYAL || { moedas: 0, taxAt: 0, log: [], online: [] }, left = Math.max(0, 30 * 60000 - (Date.now() - (R.taxAt || 0)));
  let h = `<div class="kp"><div class="treas">Tesouro do Reino: ${R.moedas} moedas</div>`;
  h += `<h3>💰 Cobrar imposto</h3><p class="hint">Tira uma parte das moedas de quem está online (no máximo 100 por pessoa). Guardas Reais não pagam. ${left ? `Próximo imposto em ${Math.ceil(left / 60000)} min.` : 'Pode cobrar agora.'}</p>
    <div class="row2"><button data-k="tax" data-p="5" ${left ? 'disabled' : ''}>5%</button><button data-k="tax" data-p="10" ${left ? 'disabled' : ''}>10%</button><button data-k="tax" data-p="20" ${left ? 'disabled' : ''}>20%</button></div>`;
  h += `<h3>📜 Dar uma ordem</h3><div class="row2"><button data-k="ord" data-t="Todos ao castelo! O Rei convoca o povo." data-g="castelo">Todos ao castelo</button><button data-k="ord" data-t="Reunião na praça da fogueira, agora!" data-g="praca">Reunir na praça</button>
    <button data-k="ord" data-t="Guardas, protejam a vila! Ninguém entra sem ordem do Rei." data-g="vila">Guardas na vila</button><button data-k="ord" data-t="Cortem lenha e quebrem pedras para o Reino!" data-g="">Trabalhar para o Reino</button>
    <button data-k="ord" data-t="Hoje é dia de festa em Eryon! Todos à praça!" data-g="praca">Festa!</button><button data-k="ord" data-t="Preparem as armas! Um inimigo pode atacar a qualquer momento!" data-g="vila">Preparar armas</button></div>
    <div class="row2" style="margin-top:6px"><input id="kOrd" maxlength="160" placeholder="Escreva a sua ordem..." style="flex:3"><select id="kGo" style="flex:1"><option value="">sem lugar</option><option value="castelo">castelo</option><option value="praca">praça</option><option value="vila">vila</option></select></div>
    <div class="row2" style="margin-top:6px"><button data-k="ordx">Anunciar ordem para todos</button></div>`;
  h += `<h3>🎁 Recompensar</h3><div class="row2"><input id="kUser" placeholder="@ de quem" style="flex:2"><input id="kN" type="number" min="1" value="10" style="flex:1"></div>
    <div class="row2" style="margin-top:6px"><button data-k="give">Dar ao @</button><button data-k="share">Dividir com todos online</button></div>
    <div class="row2" style="margin-top:6px"><button data-k="wd">Pegar do Tesouro</button><button data-k="dep">Guardar no Tesouro</button></div>`;
  h += `<h3>🛡 Povo online (${R.online.length})</h3>`;
  for (const o of R.online) h += `<div class="ppl"><span>${o.rg ? '🛡 ' : ''}@${kEsc(o.u)} · ${o.m} moedas</span><span class="row2"><button data-k="pick" data-u="${kEsc(o.u)}">Recompensar</button><button data-k="rg" data-u="${kEsc(o.u)}" data-on="${o.rg ? 0 : 1}">${o.rg ? 'Dispensar' : 'Nomear guarda'}</button></span></div>`;
  if (!R.online.length) h += '<p class="hint">Ninguém online agora além de você.</p>';
  if (R.log.length) h += `<h3>📖 Registro do Reino</h3><div class="log">${R.log.map(l => kEsc(new Date(l.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) + ' · ' + l.txt)).join('<br>')}</div>`;
  b.innerHTML = h + '</div>';
  b.querySelectorAll('button[data-k]').forEach(el => el.onclick = () => { const k = el.dataset.k, n = Math.floor(Number(($('kN') || {}).value) || 0), u = (($('kUser') || {}).value || '').trim().replace(/^@/, '');
    if (k === 'tax') { if (confirm(`Cobrar ${el.dataset.p}% de imposto de quem está online?`)) send({ t: 'royal', a: 'tax', pct: Number(el.dataset.p) }); }
    else if (k === 'ord') send({ t: 'royal', a: 'decree', text: el.dataset.t, go: el.dataset.g });
    else if (k === 'ordx') { const tx = ($('kOrd').value || '').trim(); if (tx) { send({ t: 'royal', a: 'decree', text: tx, go: $('kGo').value }); $('kOrd').value = ''; } }
    else if (k === 'give') send({ t: 'royal', a: 'give', username: u, n });
    else if (k === 'share') send({ t: 'royal', a: 'share', n });
    else if (k === 'wd') send({ t: 'royal', a: 'withdraw', n });
    else if (k === 'dep') send({ t: 'royal', a: 'deposit', n });
    else if (k === 'pick') { $('kUser').value = el.dataset.u; $('kN').focus(); }
    else if (k === 'rg') send({ t: 'appoint', username: el.dataset.u, on: el.dataset.on === '1' }); });
}
const DECREE_GO = { castelo: () => ({ x: CASTLE.spot.x, y: CASTLE.spot.y + 12 }), praca: () => ({ x: C.x, y: C.y + 30 }), vila: () => ({ x: C.x + 40, y: C.y + 40 }) };
function showDecree(m) {
  const el = $('notice'); if (!el) return; $('noticeIco').textContent = '📜'; $('noticeT').textContent = 'ORDEM DO REI'; $('noticeB').textContent = `${m.text}\n— Rei @${m.king}`;
  const go = $('noticeGo'), f = DECREE_GO[m.go]; go.hidden = !f || me === m.king; if (f) { go.textContent = m.go === 'castelo' ? 'Ir ao castelo' : m.go === 'praca' ? 'Ir à praça' : 'Ir para a vila'; go.onclick = () => { hideNotice(); const p = players.get(myId); if (p && !p.room) { target = f(); follow(); } }; }
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); if (typeof giantHorn === 'function') giantHorn();
}
const _okm = onKingdomMsg;
onKingdomMsg = function (m) {
  if (m.t === 'royal') { ROYAL = m; renderKing(); return true; }
  if (m.t === 'decree') { showDecree(m); return true; }
  if (m.t === 'taxed') { fxToast('Imposto do Rei', `Você pagou ${m.n} moedas (${m.pct}%) ao Tesouro do Reino`, '#ffd84a', '👑'); return true; }
  if (m.t === 'reward') { fxToast('Presente do Rei!', `Você ganhou ${m.n} moedas do Tesouro`, '#ffd84a', '🎁'); fanfare(true); return true; }
  return _okm(m);
};
addEventListener('DOMContentLoaded', () => { const b = $('kingBtn'); if (b) b.onclick = () => { sndStart(); openKing(); }; const c = $('kingClose'); if (c) c.onclick = () => { $('kingPanel').hidden = true; }; });
setInterval(updKingBtn, 1500);
