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
function onKingdomMsg(m) {
  if (m.t === 'rg') { const q = players.get(m.id); if (q) { if (m.rg) RGS.add(q.username); else { RGS.delete(q.username); q.horse = false; } q.ch = charFor(q.username, q.look); } return true; }
  if (m.t === 'rgMe') { const p = players.get(myId); if (p) { if (m.rg) RGS.add(p.username); else { RGS.delete(p.username); p.horse = false; } p.ch = charFor(p.username, p.look); }
    if (m.rg) { fxToast('VOCÊ É GUARDA REAL!', 'Toque em 🐎 Cavalo para montar e proteja Eryon', '#9fc4ff', '🛡'); fanfare(true); } else sys('Você não é mais Guarda Real.'); updHorseBtn(); return true; }
  return false;
}
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
