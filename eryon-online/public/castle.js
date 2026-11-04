// =====================================================================
// CASTELO DE ERYON — construído aos poucos por toda a comunidade.
// Cada pedra levada para a obra vira um bloco; o castelo sobe em 7 etapas.
// =====================================================================
const CASTLE = { x: 540, y: 1440, ox: 410, oy: 1234, W: 260, H: 210, spot: { x: 540, y: 1458 } };
let CSTATE = { pedra: 0, lenha: 0, stages: [], top: [] };
const CS = ['#4d5566', '#6e7789', '#939cae', '#c3cad6'], CSB = ['#3e4554', '#59616f', '#79818f', '#9aa2b0'], CO = '#1a1d24';
function cBricks(x, x0, y0, w, h, pal, seed = 0) {
  px(x, CO, x0 - 1, y0 - 1, w + 2, h + 2);
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) { const row = Math.floor(Y / 4), bx = Math.floor((X + (row % 2) * 4) / 8), mort = Y % 4 === 3 || (X + (row % 2) * 4) % 8 === 7;
    const sh = X < 2 ? 3 : X > w - 3 ? 0 : (h2(bx + seed, row) > .55 ? 2 : 1); px(x, mort ? pal[0] : (Y % 4 === 0 && !mort) ? pal[Math.min(3, sh + 1)] : pal[sh], x0 + X, y0 + Y); }
}
function cMerlons(x, x0, y, w, pal) { for (let X = x0; X + 5 <= x0 + w; X += 8) { px(x, CO, X - 1, y - 5, 7, 6); px(x, pal[2], X, y - 4, 5, 5); px(x, pal[3], X, y - 4, 5, 1); } }
function cTower(x, cx, y0, y1, r, pal) {
  for (let Y = y0; Y < y1; Y++) for (let X = -r; X <= r; X++) { const u = X / r, row = Math.floor((Y - y0) / 4), mort = (Y - y0) % 4 === 3 || ((X + r + (row % 2) * 4) % 8 === 7);
    let col = u < -.55 ? pal[3] : u < .15 ? pal[2] : u < .6 ? pal[1] : pal[0]; if (mort) col = pal[0]; px(x, Math.abs(X) === r ? CO : col, cx + X, Y); }
  px(x, CO, cx - r, y1, r * 2 + 1, 1); px(x, CO, cx - r - 1, y0 - 1, r * 2 + 3, 1);
  for (let X = -r; X <= r - 4; X += 7) { px(x, CO, cx + X - 1, y0 - 6, 6, 6); px(x, pal[2], cx + X, y0 - 5, 4, 5); px(x, pal[3], cx + X, y0 - 5, 4, 1); }
  for (const yy of [y0 + 14, y0 + 30]) if (yy < y1 - 8) { px(x, CO, cx - 2, yy, 4, 8); px(x, '#2a1a10', cx - 1, yy + 1, 2, 6); }
}
function cWindow(x, X, Y, lit = true) { px(x, CO, X - 1, Y - 1, 7, 10); px(x, lit ? '#f2a33a' : '#1a1208', X, Y + 2, 5, 7); px(x, lit ? '#ffd84a' : '#1a1208', X, Y, 5, 4); px(x, CO, X + 2, Y, 1, 9); px(x, lit ? '#fff3b0' : '#1a1208', X, Y, 1, 2); }
function cRoof(x, cx, yb, r, h) { for (let Y = 0; Y < h; Y++) { const w = Math.round((Y + 1) / h * (r + 2)); for (let X = -w; X <= w; X++) { const u = X / Math.max(1, w), band = (Y + (X & 1)) % 3 === 0; px(x, Math.abs(X) === w ? '#101a2a' : band ? '#1d3550' : u < -.3 ? '#6f9be0' : u < .3 ? '#3f6fc0' : '#2c4f8a', cx + X, yb - h + Y); } } px(x, '#101a2a', cx - r - 3, yb, r * 2 + 7, 1); }
function cFlag(x, X, Y, col = '#c0302a') { px(x, '#3a2216', X, Y, 1, 12); px(x, CO, X + 1, Y - 1, 11, 7); px(x, col, X + 1, Y, 10, 5); px(x, '#ffd84a', X + 4, Y + 1, 3, 3); px(x, shadeHex(col, .7), X + 1, Y + 4, 10, 1); }
// partes do castelo, na ordem de desenho (de trás para frente), cada uma ligada a uma etapa
const CPARTS = [
  { st: 0, draw: x => { px(x, CO, 12, 96, 236, 112); for (let Y = 97; Y < 207; Y++) for (let X = 13; X < 247; X++) { const f = ((Math.floor(X / 10) + Math.floor(Y / 6)) & 1); px(x, Y > 196 ? (Y === 197 ? CS[3] : CS[1]) : f ? '#8a8270' : '#9a927e', X, Y); } for (let X = 13; X < 247; X += 10) px(x, '#6e6658', X, 97, 1, 99); } },
  { st: 2, draw: x => { cBricks(x, 40, 70, 180, 42, CSB, 3); cMerlons(x, 40, 70, 180, CSB); } },
  { st: 3, draw: x => { cTower(x, 34, 46, 118, 16, CSB); cTower(x, 226, 46, 118, 16, CSB); } },
  { st: 5, draw: x => { cBricks(x, 92, 18, 76, 112, CS, 9); cMerlons(x, 92, 18, 76, CS); for (const X of [102, 127, 152]) cWindow(x, X, 32); for (const X of [102, 152]) cWindow(x, X, 62); px(x, CO, 122, 86, 16, 22); px(x, '#3a2414', 123, 87, 14, 21); } },
  { st: 2, draw: x => { for (const X0 of [30, 212]) { cBricks(x, X0, 100, 18, 92, CS, X0); px(x, CS[3], X0, 100, 18, 2); } } },
  { st: 3, draw: x => { cTower(x, 30, 112, 204, 20, CS); cTower(x, 230, 112, 204, 20, CS); for (const cx of [30, 230]) cWindow(x, cx - 2, 150); } },
  { st: 1, draw: x => { cBricks(x, 46, 140, 60, 64, CS, 21); cBricks(x, 154, 140, 60, 64, CS, 22); cMerlons(x, 46, 140, 60, CS); cMerlons(x, 154, 140, 60, CS); for (const X of [64, 190]) { px(x, CO, X - 1, 160, 4, 10); px(x, '#1a1208', X, 161, 2, 8); } } },
  { st: 4, draw: x => { cBricks(x, 100, 118, 60, 86, CS, 31); cMerlons(x, 100, 118, 60, CS);
      for (let Y = 150; Y < 204; Y++) { const w = Y < 162 ? Math.round(18 * Math.sqrt(1 - ((162 - Y) / 12) ** 2)) : 18; px(x, CO, 130 - w - 1, Y, w * 2 + 2, 1); px(x, (Y & 1) ? '#7a4a2a' : '#8a5530', 130 - w, Y, w * 2, 1); }
      for (let X = 113; X < 148; X += 5) px(x, '#5a3420', X, 152, 1, 52); for (const Y of [166, 186]) px(x, '#2b3138', 112, Y, 36, 2); px(x, '#ffd84a', 135, 182, 2, 2); px(x, '#ffd84a', 124, 182, 2, 2); px(x, CO, 129, 150, 2, 54);
      px(x, CO, 118, 126, 24, 14); px(x, '#c0302a', 119, 127, 22, 12); px(x, '#ffd84a', 126, 129, 8, 8); px(x, '#c0302a', 128, 131, 4, 4); } },
  { st: 6, draw: x => { for (const [cx, yb, r] of [[34, 40, 16], [226, 40, 16], [30, 106, 20], [230, 106, 20]]) { cRoof(x, cx, yb, r, r + 12); cFlag(x, cx, yb - r - 24); }
      cRoof(x, 130, 12, 38, 0); for (const [cx, yb] of [[96, 14], [164, 14]]) { cRoof(x, cx, yb, 7, 16); } cFlag(x, 130, -0); for (const X of [70, 186]) { px(x, CO, X - 1, 146, 12, 30); px(x, '#c0302a', X, 147, 10, 26); px(x, '#ffd84a', X + 3, 152, 4, 4); for (let k = 0; k < 10; k += 2) px(x, '#c0302a', X + k, 173, 1, 2); } } },
];
let CPART_C = null;
function castleParts() {
  if (CPART_C) return CPART_C;
  CPART_C = CPARTS.map(p => { const [c, x] = canvas(CASTLE.W, CASTLE.H); p.draw(x); const d = x.getImageData(0, 0, c.width, c.height).data; let y0 = c.height, y1 = 0;
    for (let Y = 0; Y < c.height; Y++) for (let X = 0; X < c.width; X++) if (d[(Y * c.width + X) * 4 + 3]) { if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
    return { c, st: p.st, y0, y1: y1 + 1 }; });
  return CPART_C;
}
function stageFrac(i) { const s = CSTATE.stages[i]; if (!s) return 0; const np = s.pedra, nl = s.lenha, gp = clamp(CSTATE.pedra - s.p0, 0, np), gl = clamp(CSTATE.lenha - s.l0, 0, nl); return (gp + gl) / Math.max(1, np + nl); }
function curStage() { for (let i = 0; i < CSTATE.stages.length; i++) if (stageFrac(i) < 1) return i; return CSTATE.stages.length; }
const castleDone = () => CSTATE.stages.length && curStage() >= CSTATE.stages.length;
// ---------- mundo: limpa a área, piso de pedra em frente, bloqueios e a pedreira
function castleWorld(x) {
  for (let i = OBJ.length - 1; i >= 0; i--) { const o = OBJ[i]; if (o.tree !== undefined && o.x > 396 && o.x < 684 && o.y > 1262 && o.y < 1600) { OBJ.splice(i, 1); const ti = TREE_POS.findIndex(t => t.i === o.tree); if (ti >= 0) TREE_POS.splice(ti, 1); } }
  for (let i = blockers.length - 1; i >= 0; i--) { const b = blockers[i]; if (b.k === 'c' && b.x > 396 && b.x < 684 && b.y > 1262 && b.y < 1600) blockers.splice(i, 1); }
  for (let Y = 1442; Y < 1474; Y += 3) for (let X = 500 + ((Y / 3) % 2) * 2; X < 580; X += 4) { const v = h2(X, Y); px(x, P.ink, X - 1, Y - 1, 4, 3); px(x, v > .6 ? P.st3 : v > .3 ? P.st2 : P.sand, X, Y, 3, 2); }
  blockers.push({ k: 'r', x0: 418, x1: 662, y0: 1330, y1: 1438 });
  OBJ.push({ y: CASTLE.y, x: CASTLE.x, castle: true });
}
function castleQuarry() {   // pedreira do castelo: pedras grandes que voltam rápido
  const spots = [[468, 1500], [500, 1522], [532, 1498], [566, 1524], [600, 1502], [636, 1520], [454, 1540], [520, 1550], [588, 1548], [650, 1546], [486, 1572], [620, 1574]];
  spots.forEach(([X, Y], i) => NODES.push({ id: 'r' + (160 + i), kind: 'rock', x: X, y: Y, s: 2 }));
}
// ---------- desenho
function drawCastle(x, t) {
  const parts = castleParts(), X0 = CASTLE.ox, Y0 = CASTLE.oy, cur = curStage(), done = castleDone();
  if (!done) { x.globalAlpha = .14; for (const p of parts) x.drawImage(p.c, X0, Y0); x.globalAlpha = 1; }
  for (const p of parts) { const f = stageFrac(p.st); if (f <= 0) continue; const hh = Math.max(1, Math.round((p.y1 - p.y0) * Math.min(1, f))), sy = p.y1 - hh;
    x.drawImage(p.c, 0, sy, CASTLE.W, hh, X0, Y0 + sy, CASTLE.W, hh);
    if (f < 1 && p.st === cur) { const ry = Y0 + sy;   // andaimes na linha da obra
      for (let k = 0; k < 6; k++) { const X = X0 + 20 + k * 44; px(x, '#3a2216', X - 1, ry - 6, 3, Y0 + p.y1 - ry + 6); px(x, '#b8814a', X, ry - 6, 1, Y0 + p.y1 - ry + 6); }
      px(x, '#3a2216', X0 + 18, ry - 2, CASTLE.W - 36, 3); px(x, '#b8814a', X0 + 18, ry - 2, CASTLE.W - 36, 1);
      for (let k = 0; k < 5; k++) { const bx = X0 + 40 + k * 46 + Math.round(Math.sin(t + k) * 2); px(x, CO, bx - 1, ry - 7, 7, 5); px(x, CS[2], bx, ry - 6, 5, 3); px(x, CS[3], bx, ry - 6, 5, 1); } } }
  if (!done) {   // canteiro de obras: pilhas de blocos e toras, placa
    const sx = CASTLE.spot.x;
    for (let i = 0; i < 6; i++) { const bx = sx - 64 + (i % 3) * 7, by = 1466 - Math.floor(i / 3) * 4; px(x, CO, bx - 1, by - 1, 8, 5); px(x, CS[2], bx, by, 6, 3); px(x, CS[3], bx, by, 6, 1); }
    for (let i = 0; i < 3; i++) { const by = 1468 - i * 3; px(x, P.ink, sx + 48, by - 1, 18, 4); px(x, P.wood, sx + 49, by, 16, 2); px(x, P.woodL, sx + 49, by, 16, 1); disc(x, sx + 49, by + 1, 1, P.woodL); }
    px(x, P.ink, sx + 25, 1446, 2, 14); px(x, P.ink, sx + 18, 1440, 16, 9); px(x, P.woodL, sx + 19, 1441, 14, 7); px(x, P.woodD, sx + 21, 1443, 10, 1); px(x, P.woodD, sx + 21, 1445, 8, 1);
  }
  // efeitos de blocos chegando
  for (let i = CFX.length - 1; i >= 0; i--) { const e = CFX[i], k = (performance.now() - e.t0) / 900; if (k > 1) { CFX.splice(i, 1); continue; }
    const X = lerp(e.x, e.tx, k), Y = lerp(e.y, e.ty, k) - Math.sin(k * Math.PI) * 30; px(x, CO, Math.round(X) - 1, Math.round(Y) - 1, 6, 5); px(x, CS[2], Math.round(X), Math.round(Y), 4, 3); px(x, CS[3], Math.round(X), Math.round(Y), 4, 1); }
}
const CFX = [];
const isQuarry = id => /^r1(6\d|7[01])$/.test(id);
function castleFx(n, from) { const cur = Math.min(curStage(), CSTATE.stages.length - 1), part = castleParts().find(p => p.st === cur) || castleParts()[0], f = stageFrac(cur), ty = CASTLE.oy + part.y1 - (part.y1 - part.y0) * f;
  for (let i = 0; i < Math.min(12, 2 + Math.floor(n / 5)); i++) setTimeout(() => CFX.push({ x: (from ? from.x : CASTLE.spot.x) + (Math.random() - .5) * 20, y: from ? from.y - 6 : CASTLE.spot.y, tx: CASTLE.ox + 30 + Math.random() * 200, ty, t0: performance.now() }), i * 80); }
function castleLabel(ctx2, L, T, S, fs, p) {
  if (!p || p.room || !CSTATE.stages.length || Math.hypot(p.x - CASTLE.x, p.y - CASTLE.y + 60) > 230) return;
  const cur = curStage(), tot = CSTATE.stages.reduce((a, s) => a + s.pedra + s.lenha, 0), got = Math.min(tot, CSTATE.pedra + CSTATE.lenha), pct = Math.floor(100 * got / tot);
  const sx = Math.round((CASTLE.x - L) * S), sy = Math.max(fs * 4, Math.round((CASTLE.oy - 6 - T) * S));
  let line2; if (castleDone()) line2 = 'Pronto! Entre pelo portão'; else { const s = CSTATE.stages[cur], fp = Math.max(0, s.p0 + s.pedra - CSTATE.pedra), fl = Math.max(0, s.l0 + s.lenha - CSTATE.lenha); line2 = `Etapa ${cur + 1}/${CSTATE.stages.length}: ${s.name} · faltam ${fp} pedras${fl ? ' e ' + fl + ' lenhas' : ''}`; }
  ctx2.textAlign = 'center'; ctx2.textBaseline = 'bottom'; ctx2.lineJoin = 'round';
  ctx2.font = `700 ${Math.round(fs * 1.15)}px Pix, monospace`; ctx2.lineWidth = Math.max(3, fs / 4); ctx2.strokeStyle = '#140e06'; const l1 = `Castelo de Eryon · ${pct}%`; ctx2.strokeText(l1, sx, sy - fs * 1.1); ctx2.fillStyle = '#ffd84a'; ctx2.fillText(l1, sx, sy - fs * 1.1);
  ctx2.font = `700 ${Math.round(fs * .8)}px Pix, monospace`; ctx2.strokeText(line2, sx, sy, cv.width * .95); ctx2.fillStyle = '#fff8e0'; ctx2.fillText(line2, sx, sy, cv.width * .95);
  const bw = Math.min(cv.width * .6, fs * 14), bh = Math.max(6, fs * .45); ctx2.fillStyle = '#140e06'; ctx2.fillRect(sx - bw / 2 - 2, sy + 4, bw + 4, bh + 4); ctx2.fillStyle = '#2a4a3d'; ctx2.fillRect(sx - bw / 2, sy + 6, bw, bh); ctx2.fillStyle = '#ffd84a'; ctx2.fillRect(sx - bw / 2, sy + 6, bw * pct / 100, bh);
}
// ---------- ação: levar pedras e lenha
function castleContext(p) {
  if (p.room || !CSTATE.stages.length || Math.hypot(p.x - CASTLE.spot.x, p.y - CASTLE.spot.y) > 42) return null;
  if (castleDone()) return null;
  const cur = curStage(), s = CSTATE.stages[cur], needL = s.l0 + s.lenha - CSTATE.lenha > 0, needP = s.p0 + s.pedra - CSTATE.pedra > 0;
  const hasP = (INV.pedra || 0) > 0 && needP, hasL = (INV.lenha || 0) > 0 && needL;
  if (hasP || hasL) return { kind: 'castle', label: `Levar ${hasP ? Math.min(50, INV.pedra) + ' pedras' : ''}${hasP && hasL ? ' + ' : ''}${hasL ? Math.min(50, INV.lenha) + ' lenhas' : ''} para o castelo` };
  return { kind: 'none', label: needP ? 'Castelo: quebre pedras e traga aqui' : 'Castelo: falta lenha para esta etapa' };
}
function castleGive() { const cur = curStage(), s = CSTATE.stages[cur]; if (!s) return; const needL = s.l0 + s.lenha - CSTATE.lenha > 0, needP = s.p0 + s.pedra - CSTATE.pedra > 0;
  send({ t: 'castle', pedra: needP ? Math.min(50, INV.pedra || 0) : 0, lenha: needL ? Math.min(50, INV.lenha || 0) : 0 }); doAct('hammer'); }
function onCastleMsg(m) {
  const wasDone = castleDone(); CSTATE = { pedra: m.pedra, lenha: m.lenha, stages: m.stages || CSTATE.stages, top: m.top || CSTATE.top };
  if (m.n) { const me2 = players.get(myId); if (me2 && !me2.room && Math.hypot(me2.x - CASTLE.x, me2.y - CASTLE.y) < 320) { castleFx(m.n, m.fx); if (m.by === me && m.fx && !castleFx.told && (castleFx.told = 1)) fxToast('+' + m.n + ' blocos no castelo!', 'A pedra virou bloco na obra', '#ffd84a', '▣'); play('anvil_' + (Math.random() < .5 ? 0 : 1), .35); play('wood_hit', .3, .8); } }
  if (castleDone() && !wasDone && m.n) { fxToast('O CASTELO ESTÁ PRONTO!', 'Toda Eryon construiu junto. Entre pelo portão!', '#ffd84a', '♛'); fanfare(true); }
  if (!m.n) castleHint();
  if (castleDone()) { if (!DOORS.some(d => d.room === 'castelo')) DOORS.push({ room: 'castelo', x: CASTLE.x, y: CASTLE.y + 4, label: 'Entrar no castelo' }); }
}
// ---------- Salão do Trono (quando o castelo fica pronto)
function throneRoom() {
  const w = 240, h = 170, [c, x] = canvas(w, h);
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) px(x, ((Math.floor(X / 12) + Math.floor(Y / 12)) & 1) ? '#7a8396' : '#939cae', X, Y);
  for (let X = 0; X < w; X += 12) px(x, '#565e70', X, 30, 1, h); for (let Y = 30; Y < h; Y += 12) px(x, '#565e70', 0, Y, w, 1);
  cBricks(x, 0, 0, w, 30, CSB, 77); for (const X of [30, 90, 144, 204]) cWindow(x, X, 8);
  for (const X of [26, 76, 164, 214]) { px(x, CO, X - 6, 30, 13, 120); px(x, CS[2], X - 5, 30, 11, 118); px(x, CS[3], X - 5, 30, 3, 118); px(x, CS[1], X + 3, 30, 3, 118); px(x, CO, X - 8, 148, 17, 6); px(x, CS[3], X - 7, 149, 15, 4); }
  for (const X of [50, 190]) { px(x, CO, X - 7, 2, 15, 30); px(x, '#c0302a', X - 6, 3, 13, 26); px(x, '#ffd84a', X - 3, 9, 7, 7); }
  px(x, '#7a1a14', 108, 40, 24, h - 40); px(x, '#c0302a', 110, 40, 20, h - 40); for (let Y = 44; Y < h; Y += 8) px(x, '#ffd84a', 110, Y, 20, 1);
  px(x, CO, 104, 30, 32, 16); px(x, '#ffd84a', 105, 31, 30, 14); px(x, '#f2a33a', 105, 40, 30, 5); px(x, '#c0302a', 110, 36, 20, 8); px(x, CO, 104, 22, 32, 10); px(x, '#ffd84a', 105, 23, 30, 8); px(x, '#fff3b0', 108, 24, 4, 2); px(x, '#9ff3ff', 118, 25, 4, 4);
  for (const X of [40, 200]) { px(x, CO, X - 2, 50, 5, 14); px(x, '#3a2216', X - 1, 51, 3, 12); }
  px(x, CO, 104, h - 8, 32, 8); px(x, '#1a1208', 106, h - 7, 28, 7);
  const block = [[0, 0, w, 34], [0, 0, 4, h], [w - 4, 0, w, h], [100, 20, 140, 48], ...[26, 76, 164, 214].map(X => [X - 7, 140, X + 8, 154])];
  return { id: 'castelo', name: 'Salão do Trono de Eryon', w, h, img: c, spawn: { x: 120, y: 152 }, door: { x: 120, y: 164 }, block, glows: [[40, 50, P.fire3], [200, 50, P.fire3]],
    spots: [{ x: 120, y: 54, rx: 14, ry: 8, kind: 'magic', label: 'Sentar no trono' }], outside: { x: CASTLE.spot.x, y: CASTLE.spot.y } };
}

// placas fixas apontando para a obra
const CASTLE_SIGNS = [{ x: 378, y: 1014, text: '↓ Obra do Castelo de Eryon · siga a estrada', color: '#ffd84a', fixed: true }, { x: 384, y: 1446, text: '→ Castelo de Eryon (obra) · leve pedras!', color: '#ffd84a', fixed: true }];
const allSigns = () => SIGNS.concat(CASTLE_SIGNS);
function castleHint() { try { if (localStorage.getItem('eryon_castle_hint') === '1' || castleDone()) return; localStorage.setItem('eryon_castle_hint', '1'); } catch { return; }
  setTimeout(() => fxToast('A obra do Castelo começou!', 'Fica ao sul da vila: siga a estrada e leve pedras', '#ffd84a', '♜'), 9000); }
