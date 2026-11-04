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
function cFlag(x, X, Y, col = '#b0282a') { px(x, '#3a2216', X, Y, 1, 14); px(x, '#ffd84a', X, Y - 1, 1, 1); px(x, CO, X + 1, Y - 1, 12, 9); px(x, '#ffd84a', X + 2, Y, 10, 7); px(x, col, X + 3, Y + 1, 8, 5); px(x, shadeHex(col, .7), X + 3, Y + 5, 8, 1); px(x, '#5fd0f0', X + 6, Y + 1, 2, 1); px(x, '#9ff3ff', X + 5, Y + 2, 4, 2); px(x, '#3fa0c0', X + 6, Y + 4, 2, 1); }
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
  const stg = curStage(); if (onCastleMsg.stg !== stg) { onCastleMsg.stg = stg; delete ROOM_CACHE.castelo; }
}
// ---------- Salão do Trono: dá para entrar desde já; o salão vai ficando pronto junto com a obra
function throneRoom(stage) {
  const w = 260, h = 180, [c, x] = canvas(w, h), done = stage >= 7, st = n => stage >= n;
  // piso: terra batida no começo, pedra quadriculada depois da fundação
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) px(x, st(1) ? (((X / 12 | 0) + (Y / 12 | 0)) & 1 ? '#7a8396' : '#939cae') : (h2(X >> 1, Y >> 1) > .5 ? '#8a5430' : '#9a6538'), X, Y);
  if (st(1)) { for (let X = 0; X < w; X += 12) px(x, '#565e70', X, 34, 1, h); for (let Y = 34; Y < h; Y += 12) px(x, '#565e70', 0, Y, w, 1); }
  // parede do fundo
  if (st(2)) { cBricks(x, 0, 0, w, 34, CSB, 77); for (const X of [24, 74, 170, 220]) cWindow(x, X, 8); fBeam(x, 24, 35, 6, 40); fBeam(x, 220, 35, 6, 40); }
  else { px(x, '#4a5060', 0, 0, w, 34); for (let X = 0; X < w; X += 26) { px(x, '#3a2216', X + 6, 0, 3, 34); px(x, '#b8814a', X + 7, 0, 1, 34); } px(x, '#3a2216', 0, 14, w, 3); px(x, '#b8814a', 0, 14, w, 1); }
  // colunas
  if (st(3)) for (const X of [30, 84, 176, 230]) { px(x, CO, X - 7, 34, 15, 112); px(x, CS[2], X - 6, 34, 13, 110); px(x, CS[3], X - 6, 34, 3, 110); px(x, CS[1], X + 3, 34, 4, 110); px(x, CO, X - 9, 144, 19, 7); px(x, CS[3], X - 8, 145, 17, 5); }
  // tapete vermelho, estrado e trono
  if (st(5)) { px(x, '#7a1a14', 116, 52, 28, h - 52); px(x, '#c0302a', 118, 52, 24, h - 52); for (let Y = 56; Y < h; Y += 8) px(x, '#ffd84a', 118, Y, 24, 1);
    px(x, CO, 96, 34, 68, 22); px(x, CS[2], 97, 35, 66, 20); px(x, CS[3], 97, 35, 66, 2); px(x, CS[1], 97, 49, 66, 2); px(x, CS[3], 97, 50, 66, 1);
    px(x, CO, 116, 22, 28, 26); px(x, '#ffd84a', 117, 23, 26, 24); px(x, '#f2a33a', 117, 40, 26, 7); px(x, '#c0302a', 121, 30, 18, 12); px(x, CO, 116, 14, 28, 10); px(x, '#ffd84a', 117, 15, 26, 8); px(x, '#fff3b0', 119, 16, 6, 2); px(x, '#9ff3ff', 128, 17, 4, 4); }
  // mesa do banquete e lustres (castelo pronto)
  if (done) { fBox(x, 34, 70, 30, 60, '#7a4a2a', '#a3794b'); fBox(x, 196, 70, 30, 60, '#7a4a2a', '#a3794b');
    for (const X0 of [34, 196]) { for (let k = 0; k < 6; k++) { fChair(x, X0 - 8, 74 + k * 9); fChair(x, X0 + 32, 74 + k * 9); }
      for (let k = 0; k < 7; k++) { const Y = 74 + k * 8; disc(x, X0 + 8, Y, 2, '#f4f0d8'); px(x, ['#e04a3a', '#ffd84a', '#3c8e42', '#a8482c'][k % 4], X0 + 7, Y - 1, 2, 2); px(x, '#c9a46a', X0 + 20, Y - 2, 3, 4); } }
    for (const [X, Y] of [[130, 90], [130, 140]]) { ring(x, X, Y, 9, '#c9a46a'); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; px(x, '#ffd84a', Math.round(X + Math.cos(a) * 9), Math.round(Y + Math.sin(a) * 9) - 1, 1, 2); } }
    for (const X of [12, 248]) { px(x, CO, X - 4, 60, 9, 18); px(x, '#a2abbc', X - 3, 61, 7, 16); px(x, '#565e70', X - 3, 66, 7, 1); px(x, '#c3cad6', X - 2, 61, 2, 5); }
    for (const X of [50, 210]) { px(x, CO, X - 7, 2, 15, 30); px(x, '#c0302a', X - 6, 3, 13, 26); px(x, '#ffd84a', X - 3, 9, 7, 7); } }
  // obra: andaimes, blocos e ferramentas enquanto não fica pronto
  if (!done) { for (const X of [20, 90, 160, 230]) { px(x, '#3a2216', X, 36, 3, 50); px(x, '#b8814a', X + 1, 36, 1, 50); } px(x, '#3a2216', 16, 60, 220, 3); px(x, '#b8814a', 16, 60, 220, 1);
    for (let i = 0; i < 9; i++) { const X = 40 + (i % 3) * 8 + (i > 5 ? 150 : 0), Y = 120 + Math.floor(i / 3) * 5; px(x, CO, X - 1, Y - 1, 8, 6); px(x, CS[2], X, Y, 6, 4); px(x, CS[3], X, Y, 6, 1); }
    px(x, CO, 200, 140, 20, 8); px(x, '#8a5530', 201, 141, 18, 6); px(x, '#c3cad6', 206, 136, 2, 6); px(x, '#3a2216', 214, 137, 2, 6); }
  // escada para a torre (lateral direita)
  if (st(6)) fStairs(x, 236, 120, 18, 6, true);
  // porta
  px(x, CO, 112, h - 8, 36, 8); px(x, '#1a1208', 114, h - 7, 32, 7);
  const block = [[0, 0, w, 38], [0, 0, 4, h], [w - 4, 0, w, h]];
  if (st(3)) for (const X of [30, 84, 176, 230]) block.push([X - 8, 140, X + 9, 152]);
  if (st(5)) block.push([95, 18, 165, 50]);
  if (done) block.push([30, 68, 70, 132], [192, 68, 232, 132]);
  const spots = [];
  if (st(5)) spots.push({ x: 130, y: 54, rx: 14, ry: 6, kind: 'magic', label: 'Sentar no trono' });
  if (st(6)) spots.push({ x: 245, y: 136, rx: 12, ry: 14, kind: 'stairs', to: 'castelo_torre', label: 'Subir para a Torre do Rei' });
  if (done) spots.push({ x: 50, y: 100, rx: 22, ry: 34, kind: 'eat', label: 'Comer no banquete' }, { x: 211, y: 100, rx: 22, ry: 34, kind: 'eat', label: 'Comer no banquete' });
  return { id: 'castelo', name: done ? 'Salão do Trono de Eryon' : `Castelo de Eryon · em obras (${stage}/7)`, w, h, img: c, spawn: { x: 130, y: 166 }, door: { x: 130, y: 174 }, block, stairsAt: { x: 228, y: 140 },
    glows: [[40, 50, P.fire3], [220, 50, P.fire3]], spots, outside: { x: CASTLE.spot.x, y: CASTLE.spot.y - 10 } };
}
// ---------- Torre do Rei: biblioteca e quarto real
function towerRoom() {
  const w = 200, h = 150, [c, x] = canvas(w, h);
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) px(x, ((X / 10 | 0) + (Y / 10 | 0)) & 1 ? '#6b4630' : '#7a4f2e', X, Y);
  cBricks(x, 0, 0, w, 30, CSB, 91); cWindow(x, 96, 8); fBeam(x, 96, 31, 6, 50);
  fShelf(x, 6, 30, 40, 40, 5); fShelf(x, 154, 30, 40, 40, 17); fShelf(x, 6, 74, 22, 40, 23);
  // cama com dossel
  px(x, FO, 120, 78, 38, 48); for (const [X, Y] of [[120, 78], [156, 78], [120, 124], [156, 124]]) px(x, '#ffd84a', X, Y, 3, 3);
  fBed(x, 126, 84, '#7a1a14', '#c0302a'); px(x, '#6e4a8a', 120, 76, 40, 4); px(x, '#b08af0', 120, 76, 40, 1);
  // mesa com mapa, globo, luneta e baú de ouro
  fBox(x, 54, 46, 40, 16, '#5a3420', '#7a4a2a'); px(x, '#e4d0a0', 58, 48, 22, 11); px(x, '#3c8e42', 60, 50, 8, 5); px(x, '#3f6fc0', 70, 52, 8, 4); px(x, '#a83a32', 66, 51, 1, 1); fChair(x, 70, 66);
  disc(x, 104, 52, 6, FO); disc(x, 104, 52, 5, '#3f6fc0'); disc(x, 102, 51, 2, '#3c8e42'); px(x, '#c9a46a', 103, 58, 3, 4);
  px(x, FO, 92, 26, 3, 14); px(x, '#c9a46a', 93, 27, 1, 12); px(x, FO, 88, 24, 10, 4); px(x, '#ffd84a', 89, 25, 8, 2);
  fChest(x, 40, 120, true); fChest(x, 62, 124, true); fRug(x, 60, 86, 44, 26, '#1d3550', '#3f6fc0'); fPlant(x, 186, 136);
  fStairs(x, 8, 120, 18, 6, false);
  const block = [[0, 0, w, 34], [5, 29, 47, 71], [153, 29, 195, 71], [5, 73, 29, 115], [119, 77, 160, 127], [53, 45, 95, 63], [97, 45, 111, 61], [38, 118, 82, 136], [180, 128, 195, 145], [0, 0, 3, h], [w - 3, 0, w, h], [0, h - 3, w, h]];
  return { id: 'castelo_torre', name: 'Torre do Rei', w, h, img: c, spawn: { x: 36, y: 130 }, door: { x: -999, y: -999 }, block, stairsAt: { x: 36, y: 130 }, glows: [[104, 40, P.fire3]],
    spots: [{ x: 17, y: 132, rx: 12, ry: 14, kind: 'stairs', to: 'castelo', label: 'Descer para o salão' }, { x: 74, y: 66, rx: 12, ry: 6, kind: 'magic', label: 'Estudar o mapa de Eryon' }, { x: 139, y: 108, rx: 14, ry: 22, kind: 'heal', label: 'Descansar na cama do rei' }],
    outside: { x: CASTLE.spot.x, y: CASTLE.spot.y - 10 } };
}
// placas fixas apontando para a obra
const CASTLE_SIGNS = [{ x: 378, y: 1014, text: '↓ Obra do Castelo de Eryon · siga a estrada', color: '#ffd84a', fixed: true }, { x: 384, y: 1446, text: '→ Castelo de Eryon (obra) · leve pedras!', color: '#ffd84a', fixed: true }];
const allSigns = () => SIGNS.concat(CASTLE_SIGNS);
function castleHint() { try { if (localStorage.getItem('eryon_castle_hint') === '1' || castleDone()) return; localStorage.setItem('eryon_castle_hint', '1'); } catch { return; }
  setTimeout(() => fxToast('A obra do Castelo começou!', 'Fica ao sul da vila: siga a estrada e leve pedras', '#ffd84a', '♜'), 9000); }
