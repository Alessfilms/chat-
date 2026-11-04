// =====================================================================
// EVENTO: O GIGANTE DE PEDRA — desenho, efeitos, contagem regressiva, ataques, catapultas e consertos
// =====================================================================
let GIANT = { at: 0, state: 'none', result: '', damaged: new Set(), live: null };
const GFX = { shots: [], hits: [], smash: [], shakeUntil: 0, view: null, catFire: {} };
// ---------- sprite do gigante (pedra com musgo e olhos azuis, como a estátua)
const GSPR = {};
function giantSprite(f) {   // f: 0/1 andando, 2 braços erguidos, 3 pancada — corpo de rochas empilhadas, musgo, cipós e magia
  if (GSPR[f]) return GSPR[f]; const W = 100, H = 116, [c, x] = canvas(W, H), O = '#121419';
  const ST = ['#3a404e', '#555e6e', '#78818f', '#a0a9b6'], SD = ['#2e333e', '#454c5a', '#636b79', '#858e9b'], M = ['#245a32', '#2f7a40', '#4f9f4a', '#84c65a'];
  const cx = 50, foot = 110, sw = f === 0 ? 1 : f === 1 ? -1 : 0, up = f === 2, hit = f === 3;
  const pt = painter(x), rocks = [], vines = [];
  const R = (X, Y, rx, ry, back) => { rocks.push([X, Y, rx, ry, back]); };
  // pernas (pedras empilhadas)
  const lx = cx - 13 - sw * 3, rx2 = cx + 13 + sw * 3;
  for (const [X, back] of [[lx, sw > 0], [rx2, sw < 0]]) { R(X, foot - 4, 11, 5, back); R(X + (X < cx ? 1 : -1), foot - 15, 8, 8, back); R(X + (X < cx ? 2 : -2), foot - 28, 9, 9, back); }
  // braço de trás
  const arm = (side, back) => { const s2 = side, sx = cx + s2 * 24;
    if (up) { R(sx, 40, 9, 9, back); R(sx + s2 * 3, 26, 7, 8, back); R(sx + s2 * 2, 12, 7, 7, back); R(sx, 2 + 6, 10, 9, back); }
    else if (hit) { R(sx, 40, 9, 9, back); R(sx + s2 * 6, 56, 7, 8, back); R(sx + s2 * 8, 70, 7, 7, back); R(sx + s2 * 6, 86, 11, 10, back); }
    else { const k = s2 * sw * (back ? -1 : 1); R(sx, 40, 9, 9, back); R(sx + s2 * 5 + k * 2, 55, 7, 8, back); R(sx + s2 * 6 + k * 4, 69, 7, 7, back); R(sx + s2 * 6 + k * 6, 84, 10, 10, back); } };
  arm(-1, true);
  // tronco: bacia, peito grande e ombros
  R(cx, 70, 17, 10, false); R(cx, 50, 23, 19, false); R(cx - 17, 38, 10, 9, false); R(cx + 17, 38, 10, 9, false);
  // cabeça: bloco com sobrancelha e mandíbula
  R(cx, 22, 12, 11, false); R(cx, 30, 9, 5, false);
  // desenha (pedras de trás mais escuras), cada camada com contorno
  // cada pedra é um polígono irregular (quinas e faces), não uma bola
  const rock = (X, Y, rx, ry, pal, i) => { const n = 7 + (i % 3), pts = []; for (let k = 0; k < n; k++) { const a = k / n * 6.283 + h2(i, k) * .5, j = .78 + h2(k, i + 3) * .3; pts.push([X + Math.cos(a) * rx * j * 1.08, Y + Math.sin(a) * ry * j * 1.08]); } pt.poly(pts, pal, O, .08); };
  for (const back of [true, false]) { rocks.forEach(([X, Y, rx, ry, b2], i) => { if (!!b2 === back) rock(X, Y, rx, ry, back ? SD : ST, i + f * 0); }); pt.done(); }
  arm(1, false); rocks.slice(-4).forEach(([X, Y, rx, ry], i) => rock(X, Y, rx, ry, ST, 40 + i)); pt.done();
  // faces das pedras: uma aresta clara em cima de cada uma
  rocks.forEach(([X, Y, rx, ry], i) => { const w = Math.round(rx * .9); for (let k = -w; k < w - 1; k++) { const yy = Math.round(Y - ry * .55 + Math.abs(k) * .18); const d = x.getImageData(Math.round(X + k), yy, 1, 1).data; if (d[3] && d[0] > 60) px(x, ST[3], Math.round(X + k), yy, 1, 1); } });
  // juntas escuras entre as pedras e textura
  for (let i = 0; i < 120; i++) { const X = Math.floor(h2(i, f + 3) * W), Y = Math.floor(h2(f + 3, i) * H); const d = x.getImageData(X, Y, 1, 1).data; if (d[3] && d[0] > 90 && h2(i, 9) > .5) px(x, ST[1], X, Y, 1, 1); }
  // sobrancelha, olhos e boca
  px(x, O, cx - 11, 18, 22, 3); px(x, ST[3], cx - 10, 17, 20, 1);
  px(x, O, cx - 8, 21, 6, 4); px(x, O, cx + 2, 21, 6, 4); px(x, '#9ff3ff', cx - 7, 22, 4, 2); px(x, '#9ff3ff', cx + 3, 22, 4, 2); px(x, '#ffffff', cx - 6, 22, 1, 1); px(x, '#ffffff', cx + 4, 22, 1, 1);
  px(x, O, cx - 6, 30, 12, 2); for (let k = 0; k < 4; k++) px(x, ST[3], cx - 5 + k * 3, 30, 1, 1);
  // rachaduras com magia azul no peito, ombros e pernas
  const crack = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [a1, b1] = pts[i], [a2, b2] = pts[i + 1], n = Math.max(Math.abs(a2 - a1), Math.abs(b2 - b1)); for (let k = 0; k <= n; k++) { const X = Math.round(a1 + (a2 - a1) * k / n), Y = Math.round(b1 + (b2 - b1) * k / n); px(x, O, X, Y, 1, 1); px(x, '#3fd0e0', X + 1, Y, 1, 1); } } };
  crack([[cx - 4, 36], [cx - 1, 44], [cx - 5, 52], [cx - 2, 60]]); crack([[cx + 8, 42], [cx + 12, 50], [cx + 9, 56]]); crack([[cx - 18, 34], [cx - 15, 41]]); crack([[lx + 1, foot - 32], [lx - 2, foot - 24]]);
  px(x, '#9ff3ff', cx - 2, 47, 2, 2); px(x, '#9ff3ff', cx + 10, 49, 1, 2);
  // musgo no alto das pedras (ombros, cabeça, peito, punhos)
  const moss = (X, Y, w) => { for (let k = -w; k <= w; k++) { const hh = 2 + Math.round(h2(X + k, Y) * 2); px(x, M[1], X + k, Y, 1, hh); px(x, M[3], X + k, Y, 1, 1); if (h2(k, X) > .82) { px(x, '#f6b6d8', X + k, Y - 1, 1, 1); } } };
  moss(cx, 12, 7); moss(cx - 17, 30, 6); moss(cx + 17, 30, 6); moss(cx - 6, 32, 5); moss(cx + 8, 34, 4); moss(lx, foot - 37, 4);
  // cipós pendurados com folhas
  const vine = (X, Y, L, sway) => { let vx = X; for (let k = 0; k < L; k++) { vx += Math.sin(k * .5 + sway) * .6; px(x, M[0], Math.round(vx), Y + k, 1, 1); if (k % 3 === 1) { px(x, M[2], Math.round(vx) + (k % 2 ? 1 : -1), Y + k, 1, 1); px(x, M[3], Math.round(vx) + (k % 2 ? 2 : -2), Y + k - 1, 1, 1); } } px(x, M[2], Math.round(vx), Y + L, 1, 2); };
  vine(cx - 20, 42, 26, f); vine(cx - 14, 46, 18, f + 1); vine(cx + 18, 44, 22, f + 2); vine(cx - 6, 60, 16, f + 3); vine(cx + 8, 62, 20, f + 1.5); vine(cx + 24 + (hit ? 8 : 6), 60, 14, f + 2.5);
  // pedrinhas flutuando (magia)
  const pebbles = [[cx - 34, 24, 3], [cx + 34, 20, 2], [cx - 30, 60, 2], [cx + 36, 52, 3]];
  return GSPR[f] = { r: c, l: flipped(c), W, H, eyes: [[cx - 5, 23], [cx + 5, 23]], pebbles };
}
function giantFrame(t) { const L = GIANT.live; if (!L) return 0; if (L.phase === 'stomp' || (L.phase === 'fight' && performance.now() - (GFX.lastSmashT || 0) < 1400)) { const k = ((performance.now() - (GFX.lastSmashT || 0)) / 1000); return k < .25 ? 3 : (k > 2.2 ? 2 : 0); } return Math.floor(t * 2.2) % 2; }
function drawGiantAt(x, X, Y, f, face, t, flash) {
  const s = giantSprite(f), ox = X - s.W / 2, oy = Y - s.H + 4, flip = face > 0;
  x.fillStyle = 'rgba(8,20,16,.42)'; x.beginPath(); x.ellipse(X, Y, 30, 8, 0, 0, 6.283); x.fill();
  // pedrinhas flutuando em volta
  for (const [px0, py0, r] of s.pebbles) { const ex = flip ? s.W - px0 : px0, bob = Math.sin(t * 2 + px0) * 2; disc(x, ox + ex, oy + py0 + bob, r + 1, '#121419'); disc(x, ox + ex, oy + py0 + bob, r, '#78818f'); px(x, '#a0a9b6', ox + ex - 1, oy + py0 + bob - 1, 1, 1); }
  x.drawImage(flip ? s.l : s.r, ox, oy);
  for (const [ex, ey] of s.eyes) glow(x, ox + (flip ? s.W - ex : ex), oy + ey, 6, '#9ff3ff', .2 + .08 * Math.sin(t * 4));
  if (flash) { x.globalAlpha = .45; x.globalCompositeOperation = 'lighter'; x.drawImage(flip ? s.l : s.r, ox, oy); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
}
function drawGiant(x, t) { const L = GIANT.live; if (!L) return; (L.kind === 'fogo' ? drawFireAt : drawGiantAt)(x, Math.round(L.x), Math.round(L.y), giantFrame(t), L.face, t, performance.now() - (GFX.lastHitT || 0) < 160); }
// ---------- catapulta (objeto que todos podem criar): base fixa + braço que gira quando dispara
let CAT_SPR = null;
function catapultSprite() { if (CAT_SPR) return CAT_SPR; const [c, x] = canvas(36, 30), O = '#1a120c', WD = ['#4a2f22', '#6b4630', '#8b5e3c', '#b8814a'];
  x.fillStyle = 'rgba(10,30,20,.32)'; x.fillRect(2, 26, 33, 4);
  // chassi com tábuas e cravos
  px(x, O, 3, 17, 30, 7); px(x, WD[2], 4, 18, 28, 5); px(x, WD[3], 4, 18, 28, 1); px(x, WD[0], 4, 22, 28, 1); for (let X = 7; X < 31; X += 6) px(x, '#2b3138', X, 19, 1, 1);
  // montantes em A e eixo
  for (const X of [12, 22]) { px(x, O, X - 1, 6, 3, 13); px(x, WD[2], X, 7, 1, 11); } px(x, O, 10, 5, 16, 3); px(x, WD[3], 11, 6, 14, 1);
  // corda enrolada no tambor
  disc(x, 17, 15, 3, O); disc(x, 17, 15, 2, '#c9a46a'); px(x, '#8a6a3c', 16, 14, 3, 1); px(x, '#8a6a3c', 16, 16, 3, 1);
  // rodas com raios
  for (const X of [7, 29]) { disc(x, X, 24, 5, O); disc(x, X, 24, 4, WD[1]); ring(x, X, 24, 3, WD[3]); px(x, WD[0], X - 3, 24, 7, 1); px(x, WD[0], X, 21, 1, 7); disc(x, X, 24, 1, '#2b3138'); }
  // pilha de pedras de munição
  for (const [X, Y] of [[31, 15], [34, 15], [32, 12]]) { disc(x, X, Y, 2, O); px(x, '#939cae', X - 1, Y - 1, 2, 2); }
  return CAT_SPR = { c, ax: 18, ay: 28 }; }
function drawCatapultArm(x, d, t) {
  // braço armado para trás (com pedra no cesto) que gira por cima até quase em pé ao disparar, e depois volta
  const fired = GFX.catFire[d.id], k = fired ? (performance.now() - fired) / 1000 : 9, REST = 205, UP = 80;
  const deg = k < .22 ? REST - (REST - UP) * (k / .22) ** 1.6 : k < .7 ? UP : k < 2.4 ? UP + (REST - UP) * ((k - .7) / 1.7) : REST, a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const pivX = d.x, pivY = d.y - 20, L1 = 17, L2 = 6, O = '#1a120c';
  const seg = (r0, r1, col, hi) => { for (let r = r0; r <= r1; r += .5) { const X = Math.round(pivX + ca * r), Y = Math.round(pivY - sa * r); px(x, O, X - 1, Y - 1, 3, 3); } for (let r = r0; r <= r1; r += .5) { const X = Math.round(pivX + ca * r), Y = Math.round(pivY - sa * r); px(x, Math.round(r) % 5 === 0 ? hi : col, X, Y, 1, 1); } };
  seg(-L2, L1, '#8b5e3c', '#b8814a');
  const bx = Math.round(pivX + ca * L1), by = Math.round(pivY - sa * L1); px(x, O, bx - 3, by - 2, 7, 5); px(x, '#6b4630', bx - 2, by - 1, 5, 3); px(x, '#8b5e3c', bx - 2, by - 1, 5, 1);
  if (!fired || k > 2.0) { disc(x, bx, by - 3, 3, O); disc(x, bx, by - 3, 2, '#7a8396'); px(x, '#a0a9b6', bx - 1, by - 4, 1, 1); }
  const cwx = Math.round(pivX - ca * L2), cwy = Math.round(pivY + sa * L2); px(x, O, cwx - 4, cwy - 3, 9, 8); px(x, '#565e70', cwx - 3, cwy - 2, 7, 6); px(x, '#7a8396', cwx - 3, cwy - 2, 7, 1); px(x, '#2b3138', cwx - 3, cwy + 1, 7, 1);
  disc(x, pivX, pivY, 2, O); px(x, '#c9a46a', pivX, pivY, 1, 1);
  if (fired && k < .5) burst(x, t, fired / 1000 + .2, bx, by, 8, ['#c9a46a', '#8b5e3c'], 14, .4, 10, d.id);
}
// ---------- mensagens do servidor
function onGiantMsg(m) {
  if (m.t === 'giant') { const was = GIANT.state; GIANT.at = m.at; GIANT.state = m.state; GIANT.result = m.result; GIANT.damaged = new Set(m.damaged || []); GIANT.live = m.live;
    const fogo = (m.live && m.live.kind === 'fogo') || (m.end && GIANT.lastKind === 'fogo'); if (m.live) GIANT.lastKind = m.live.kind;
    if (m.start) { giantHorn(); setTimeout(() => dragonRoar && SND.ctx && dragonRoar(.45), 900); fxToast(fogo ? 'A FERA DE FOGO APARECEU!' : 'O GIGANTE ACORDOU!', fogo ? 'Ela vem do leste queimando tudo. Defendam Eryon!' : 'Ele vem do leste. Defendam Eryon!', '#e04a3a', fogo ? '🔥' : '⚠'); }
    if (m.end) { fxToast(m.end === 'won' ? 'VITÓRIA!' : 'A cidade foi danificada', m.end === 'won' ? (fogo ? 'Eryon venceu a Fera de Fogo!' : 'Eryon venceu o Gigante de Pedra!') : 'Consertem as casas com lenha', m.end === 'won' ? '#ffd84a' : '#e04a3a', m.end === 'won' ? '♛' : '⚠'); if (m.end === 'won') fanfare(true); }
    updGiantHud(); return true; }
  if (m.t === 'giantHit') { GFX.lastHitT = performance.now(); if (GIANT.live) GFX.hits.push({ x: GIANT.live.x + (Math.random() - .5) * 30, y: GIANT.live.y - 70 - Math.random() * 24, d: m.d, t0: performance.now(), big: m.d >= 20 }); if (m.kind === 'zap' && SND.ctx) thunder(); return true; }
  if (m.t === 'giantSmash') { GFX.lastSmashT = performance.now(); GFX.smash.push({ x: m.x, y: m.y, t0: performance.now() }); const p = players.get(myId);
    if (p && !p.room && Math.hypot(p.x - m.x, p.y - m.y) < 260) { stomp(); shake(); } return true; }
  if (m.t === 'stunned') { GFX.stunUntil = performance.now() + (m.ms || 2000); shake(); stomp(.6); sys(GIANT.live && GIANT.live.kind === 'fogo' ? 'A fera te queimou! Você ficou tonto...' : 'O gigante te acertou! Você ficou tonto...'); return true; }
  if (m.t === 'catShot') { GFX.catFire[m.id] = performance.now(); GFX.shots.push({ ...m, t0: performance.now() + 200 }); const p = players.get(myId); if (p && !p.room && Math.hypot(p.x - m.x, p.y - m.y) < 220) play('wood_hit', .5, .7); return true; }
  return false;
}
// ---------- desenho dos efeitos no mundo
function bldPos(id) { if (id.startsWith('h_')) { const h = BUILT.find(q => 'h_' + q.id === id); return h ? { x: h.x, y: h.y } : null; } return B[id] ? { x: B[id].x, y: B[id].y } : null; }
function drawGiantWorld(x, t, li, ti, cw, ch) {
  drawStun(x, t);
  // construções danificadas: fuligem, rachaduras, fogo e fumaça
  for (const id of GIANT.damaged) { const b = bldPos(id); if (!b || b.x < li - 40 || b.x > li + cw + 40 || b.y < ti - 40 || b.y > ti + ch + 40) continue;
    x.globalAlpha = .45; x.fillStyle = '#140e06'; x.beginPath(); x.ellipse(b.x, b.y - 10, 15, 10, 0, 0, 6.283); x.fill(); x.globalAlpha = 1;
    for (const [a, c2] of [[-8, -18], [3, -14], [9, -20]]) { px(x, '#140e06', b.x + a, b.y + c2, 1, 5); px(x, '#140e06', b.x + a + 1, b.y + c2 + 5, 1, 3); }
    smallFire(x, b.x - 5, b.y - 16, t + b.x); smallFire(x, b.x + 6, b.y - 12, t * 1.3 + b.y); smoke(x, b.x, b.y - 24, t + b.x, 5, '#4a4a4a'); glow(x, b.x, b.y - 14, 10, P.fire2, .12); }
  // pancadas no chão
  for (let i = GFX.smash.length - 1; i >= 0; i--) { const s = GFX.smash[i], k = (performance.now() - s.t0) / 900; if (k > 1) { GFX.smash.splice(i, 1); continue; }
    x.globalAlpha = 1 - k; ring(x, s.x, s.y, 6 + k * 34, '#c9a46a'); ring(x, s.x, s.y, 3 + k * 22, '#e4d0a0'); x.globalAlpha = 1; burst(x, t, s.t0 / 1000, s.x, s.y - 4, 18, ['#8b5e3c', '#c9a46a', '#6e7789'], 28, .9, 30, 9); }
  // pedras das catapultas em arco
  for (let i = GFX.shots.length - 1; i >= 0; i--) { const s = GFX.shots[i], k = (performance.now() - s.t0) / 800; if (k > 1.4) { GFX.shots.splice(i, 1); continue; }
    if (k < 0) continue; if (k <= 1) { const X = s.x + (s.tx - s.x) * k, Y = s.y - 30 + (s.ty - 60 - s.y + 14) * k - Math.sin(k * Math.PI) * 70; px(x, P.ink, Math.round(X) - 3, Math.round(Y) - 3, 7, 7); px(x, P.st2, Math.round(X) - 2, Math.round(Y) - 2, 5, 5); px(x, P.st3, Math.round(X) - 2, Math.round(Y) - 2, 2, 2); }
    else { if (!s.boom) { s.boom = 1; const p = players.get(myId); if (p && Math.hypot(p.x - s.tx, p.y - s.ty) < 260) stomp(.5); } burst(x, t, s.t0 / 1000 + .8, s.tx, s.ty - 60, 22, ['#c3cad6', '#939cae', '#ffd84a'], 30, .6, 20, 3); } }
}
// ---------- textos na tela: nome, vida e números de dano
function giantLabels(ctx2, L, T, S, fs) {
  const G2 = GIANT.live; if (!G2) return; const sx = Math.round((G2.x - L) * S), sy = Math.round((G2.y - (G2.kind === 'fogo' ? 96 : 118) - T) * S);
  if (sx > -300 && sx < cv.width + 300 && sy > -100 && sy < cv.height + 200) { ctx2.textAlign = 'center'; ctx2.textBaseline = 'bottom'; ctx2.font = `700 ${Math.round(fs * 1.05)}px Pix, monospace`; ctx2.lineWidth = Math.max(3, fs / 4); ctx2.strokeStyle = '#140e06'; const NM = G2.kind === 'fogo' ? 'FERA DE FOGO' : 'GIGANTE DE PEDRA'; ctx2.strokeText(NM, sx, sy); ctx2.fillStyle = G2.kind === 'fogo' ? '#ffb04a' : '#ff9a8a'; ctx2.fillText(NM, sx, sy);
    const w = fs * 7, h = Math.max(6, fs * .45); ctx2.fillStyle = '#140e06'; ctx2.fillRect(sx - w / 2 - 2, sy + 3, w + 4, h + 4); ctx2.fillStyle = '#3a1410'; ctx2.fillRect(sx - w / 2, sy + 5, w, h); ctx2.fillStyle = '#e04a3a'; ctx2.fillRect(sx - w / 2, sy + 5, w * Math.max(0, G2.hp) / G2.max, h); }
  for (let i = GFX.hits.length - 1; i >= 0; i--) { const hh = GFX.hits[i], k = (performance.now() - hh.t0) / 900; if (k > 1) { GFX.hits.splice(i, 1); continue; }
    const X = Math.round((hh.x - L) * S), Y = Math.round((hh.y - k * 18 - T) * S); ctx2.globalAlpha = 1 - k; ctx2.font = `700 ${Math.round(fs * (hh.big ? 1.4 : 1))}px Pix, monospace`; ctx2.strokeText('-' + hh.d, X, Y); ctx2.fillStyle = hh.big ? '#9ff3ff' : '#ffd84a'; ctx2.fillText('-' + hh.d, X, Y); ctx2.globalAlpha = 1; }
}
// ---------- barras e contagem regressiva (HUD)
function fmtLeft(ms) { const m = Math.max(0, Math.ceil(ms / 60000)), h = Math.floor(m / 60); return h ? `${h}h${String(m % 60).padStart(2, '0')}` : `${m} min`; }
function updGiantHud() {
  const el = $('giantHud'); if (!el) return; const now = Date.now(), L = GIANT.live;
  if (L) { el.hidden = false; el.className = 'gh battle'; el.innerHTML = (L.phase === 'leave' ? `<div class="gl">${L.kind === 'fogo' ? 'A FERA ESTÁ INDO EMBORA' : 'O GIGANTE ESTÁ INDO EMBORA'}</div>` : L.engaged ? `<div class="gl">⚔ LUTA ATÉ O FIM</div>` : `<div class="gl">${L.kind === 'fogo' ? 'Ataque a fera para enfrentá-la!' : 'Ataque o gigante para enfrentá-lo!'}</div>`) + `<div class="gl">${L.kind === 'fogo' ? 'FERA DE FOGO' : 'GIGANTE'} <b>${Math.max(0, L.hp)}</b></div><div class="gb"><i style="width:${Math.max(0, 100 * L.hp / L.max)}%"></i></div><div class="gl">CIDADE <b>${L.city}%</b></div><div class="gb city"><i style="width:${L.city}%"></i></div>`; return; }
  if (GIANT.state === 'scheduled' && GIANT.at > now && GIANT.at - now < 36 * 3600e3) { const hh = new Date(GIANT.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }); el.hidden = false; el.className = 'gh warn'; el.innerHTML = `⚠ O GIGANTE ATACA ÀS ${hh} · faltam <b>${fmtLeft(GIANT.at - now)}</b><small>Crie lanças e catapultas (botão Criar) e defenda Eryon!</small>`; return; }
  if (GIANT.damaged.size) { el.hidden = false; el.className = 'gh warn'; el.innerHTML = `A cidade foi danificada · ${GIANT.damaged.size} construções<small>Chegue perto de uma e toque em "Consertar" (2 lenhas)</small>`; return; }
  el.hidden = true;
}
setInterval(updGiantHud, 15000);
// ---------- ações
let gHitReady = 0;
function giantContext(p) {
  if (p.room || p.fly) return null; const L = GIANT.live;
  if (L && L.phase === 'leave') return null;
  if (L) { const eq = (p.look && p.look.equip) || '', ranged = eq === 'arco' || (classOf(p) || {}).id === 'arqueira', reach = ranged ? 150 : 62, d = Math.hypot(p.x - L.x, p.y - L.y);
    for (const dd of DECOR) if (dd.kind === 'catapulta' && Math.hypot(p.x - dd.x, p.y - dd.y) < 24) return { kind: 'econ', label: 'Disparar catapulta (1 pedra)', fn: () => { send({ t: 'fireCat', id: dd.id }); doAct('hammer'); } };
    if (d < reach) return { kind: 'econ', label: L.kind === 'fogo' ? 'Atacar a fera!' : 'Atacar o gigante!', fn: () => { const now = performance.now(); if (now < gHitReady) return; gHitReady = now + 1400; p.face = L.x < p.x ? -1 : 1; doAct(ranged ? 'arrow' : eq === 'espada' || eq === 'lanca' || ['guarda', 'guerreiro'].includes((classOf(p) || {}).id) ? 'sword' : 'chop'); send({ t: 'hitGiant' }); } };
    return null; }
  for (const id of GIANT.damaged) { const b = bldPos(id); if (b && Math.hypot(p.x - b.x, p.y - (b.y + 4)) < 26) return { kind: 'econ', label: 'Consertar (2 lenhas)', fn: () => { send({ t: 'repair', id }); doAct('build'); } }; }
  return null;
}
// ---------- sons e tremor
function stomp(v = 1) { if (!SND.ctx) return; const c = SND.ctx, w = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(70, w); o.frequency.exponentialRampToValueAtTime(28, w + .5); g.gain.setValueAtTime(.7 * v, w); g.gain.exponentialRampToValueAtTime(.001, w + .7); o.connect(g); g.connect(SND.sfx); o.start(w); o.stop(w + .75); noiseHit(w, .35, 160, .5 * v, 'lowpass'); }
function giantHorn() { if (!SND.ctx) return; const c = SND.ctx, w = c.currentTime; for (const [f, d] of [[146.8, 0], [146.8, .9], [196, 1.8]]) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; g.gain.setValueAtTime(0, w + d); g.gain.linearRampToValueAtTime(.12, w + d + .1); g.gain.linearRampToValueAtTime(0, w + d + .8); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; o.connect(lp); lp.connect(g); g.connect(SND.sfx); o.start(w + d); o.stop(w + d + .85); } }
function shake() { const el = cv; let n = 0; const iv = setInterval(() => { el.style.transform = n++ > 8 ? '' : `translate(${(Math.random() - .5) * 10}px,${(Math.random() - .5) * 8}px)`; if (n > 9) clearInterval(iv); }, 40); }
addEventListener('DOMContentLoaded', () => { const el = $('giantHud'); if (el) el.onclick = () => { if (GIANT.state === 'scheduled') { closePanels(); openPanel('craft'); } }; });

// =====================================================================
// GUARDAS DO REINO (NPCs) e ESTANDARTES DE ERYON
// Guardas patrulham portões, praça e castelo. Quando o gigante chega perto
// do posto deles, correm para cercá-lo e atacam com lanças.
// =====================================================================
const GUARDS = [
  { a: [512, 1474], b: [512, 1474], face: 1, skin: '#c08060' },     // portão do castelo (fixos)
  { a: [568, 1474], b: [568, 1474], face: -1, skin: '#e8b48c' },
  { a: [470, 1500], b: [610, 1500], skin: '#8b5e3c' },              // ronda em frente ao castelo
  { a: [470, 486], b: [500, 486], skin: '#f2c9a4' },                // portão nordeste
  { a: [318, 676], b: [402, 676], skin: '#5a3a26' },                // praça da fogueira
  { a: [336, 604], b: [390, 604], skin: '#c08060' },
].map((g, i) => ({ ...g, i, x: g.a[0], y: g.a[1], moving: false, fc: g.face || 1, ch: null }));
const BANNERS = [{ x: 380, y: 626, h: 30 }, { x: 498, y: 1470, h: 26 }, { x: 582, y: 1470, h: 26 }, { x: 456, y: 492, h: 24 }];
function guardChar(g) { if (g.ch) return g.ch; const sp = { hair: '#5a3a26', shirt: '#3f7ab0', shirtD: '#264a6c', pants: '#2b3138', skin: g.skin, skinD: shadeHex(g.skin, .6), hat: 'elmo', cape: '#a83a32', beard: g.i % 3 === 1 ? '#5a3a26' : undefined };
  return g.ch = charBuilder(sp); }
function updGuards(t) {
  const now = performance.now(), dt = Math.min(.05, (now - (updGuards.lt || now)) / 1000); updGuards.lt = now; const L = GIANT.live;
  for (const g of GUARDS) {
    let tx, ty, fight = false;
    if (L && L.phase !== 'leave' && Math.hypot(L.x - g.a[0], L.y - g.a[1]) < 360) { const ang = g.i * 1.05 + t * .15, r = 44 + (g.i % 2) * 10; tx = L.x + Math.cos(ang) * r; ty = L.y + Math.sin(ang) * r * .5 + 4; fight = true; }
    else { const per = 9 + g.i, k = ((t + g.i * 3.1) % (per * 2)) / per, u = k < 1 ? k : 2 - k, e = Math.min(1, Math.max(0, (u - .1) / .8)); tx = g.a[0] + (g.b[0] - g.a[0]) * e; ty = g.a[1] + (g.b[1] - g.a[1]) * e; }
    const dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy), sp = (fight ? 46 : 22) * dt;
    if (d > 300) { g.x = tx; g.y = ty; g.moving = false; }
    else if (d > .6) { const st = Math.min(d, sp); g.x += dx / d * st; g.y += dy / d * st; g.moving = d > 1.5; if (Math.abs(dx) > .3) g.fc = dx < 0 ? -1 : 1; }
    else g.moving = false;
    g.fight = fight && d < 6; if (g.fight) g.fc = L.x < g.x ? -1 : 1; else if (!g.moving && g.face) g.fc = g.face;
  }
}
function kingdomObjs(list, li, ti, cw, ch, t) {
  updGuards(t);
  for (const g of GUARDS) if (g.x > li - 20 && g.x < li + cw + 20 && g.y > ti - 10 && g.y < ti + ch + 30) list.push({ y: g.y, guard: g });
  for (const b of BANNERS) if (b.x > li - 30 && b.x < li + cw + 30 && b.y > ti - 10 && b.y < ti + ch + 50) list.push({ y: b.y, banner: b });
}
function drawGuard(x, g, t) {
  const f4 = Math.floor(t * 9 + g.i) % 4, u = (t + g.i * .37) % .8;
  const po = g.fight ? { legs: 'stand', arm: u < .4 ? 'up' : 'low', tool: 'spear', eyes: 0, br: 0 } : g.moving ? { legs: ['w1', 'stand', 'w2', 'stand'][f4], bob: f4 % 2 === 0, arm: 'down', tool: 'spear', eyes: 0, br: 0 } : { legs: 'stand', arm: 'down', tool: 'spear', eyes: 0, br: Math.floor(t * 1.3 + g.i) % 2 };
  drawCharAt(x, guardChar(g), g.x, g.y, po, g.fc);
}
// estandarte de Eryon: campo vermelho, borda dourada e cristal azul, tremulando
function drawBanner(x, X, Y, t, h = 28) {
  const O = '#140e06', top = Y - h; x.fillStyle = 'rgba(5,10,8,.35)'; x.fillRect(X - 2, Y - 1, 5, 2);
  px(x, O, X - 1, top - 1, 3, h + 1); px(x, '#6b4630', X, top, 1, h); px(x, O, X - 1, top - 3, 3, 3); px(x, '#ffd84a', X, top - 2, 1, 1);
  const W = 14, H = 11;
  for (let c = 0; c < W; c++) { const off = Math.round(Math.sin(t * 4 - c * .55) * (c / W) * 2.2), cx = X + 1 + c, y0 = top + 1 + off, edge = c === W - 1;
    px(x, O, cx, y0 - 1, 1, H + 2);
    for (let r = 0; r < H; r++) { const bord = r === 0 || r === H - 1 || c === 0 || edge, dx = Math.abs(c - 7), dy = Math.abs(r - 5), gem = dx + dy * .8 <= 3;
      let col = bord ? '#ffd84a' : gem ? (dx + dy * .8 <= 1.2 ? '#e8ffff' : c < 7 ? '#9ff3ff' : '#3fa0c0') : (r > H - 4 ? '#8a1e20' : '#b0282a');
      if (!bord && !gem && Math.sin(t * 4 - c * .55) > .6) col = r > H - 4 ? '#a02424' : '#c83a34';
      px(x, col, cx, y0 + r, 1, 1); }
    if (c % 3 === 1) { px(x, O, cx, y0 + H + 1, 1, 2); px(x, '#ffd84a', cx, y0 + H + 1, 1, 1); } }
}
function guardLabels(ctx2, L, T, S, fs) {
  ctx2.textAlign = 'center'; ctx2.textBaseline = 'bottom'; ctx2.font = `700 ${Math.round(fs * .8)}px Pix, monospace`; ctx2.lineWidth = Math.max(2, fs / 5); ctx2.strokeStyle = '#140e06';
  for (const g of GUARDS) { const sx = Math.round((g.x - L) * S), sy = Math.round((g.y - 24 - T) * S); if (sx < -80 || sx > cv.width + 80 || sy < -20 || sy > cv.height + 40) continue; ctx2.strokeText('Guarda do Reino', sx, sy); ctx2.fillStyle = '#9fc4ff'; ctx2.fillText('Guarda do Reino', sx, sy); }
}
// estrelinhas girando sobre a cabeça de quem foi atordoado
function drawStun(x, t) { const p = players.get(myId); if (!p || p.room || performance.now() > (GFX.stunUntil || 0)) return;
  for (let k = 0; k < 3; k++) { const a = t * 5 + k * 2.09, X = Math.round(p.x + Math.cos(a) * 7), Y = Math.round(p.y - 22 + Math.sin(a) * 2); px(x, '#140e06', X - 1, Y - 1, 3, 3); px(x, '#ffd84a', X, Y, 1, 1); px(x, '#ffd84a', X - 1, Y, 3, 1); } }

// =====================================================================
// FERA DE FOGO — salamandra gigante de lava (desenhada olhando para a esquerda)
// =====================================================================
const FSPR = {};
function fireSprite(f) {   // f: 0/1 andando, 2 rugindo (cabeça erguida), 3 pisada/baforada
  if (FSPR[f]) return FSPR[f]; const W = 124, H = 86, [c, x] = canvas(W, H), O = '#140806';
  const BD = ['#4a120c', '#8a2414', '#c8441a', '#f07a2a'], DK = ['#2a0c08', '#521a10', '#7a2614', '#a83a18'], HR = ['#1a1208', '#3a2a20', '#5e4c3c', '#8a7a6a'];
  const sw = f === 0 ? 1 : f === 1 ? -1 : 0, roar = f === 2, hit = f === 3, foot = 80;
  const hx = roar ? 22 : hit ? 20 : 24, hy = roar ? 30 : hit ? 50 : 40;
  const pt = painter(x);
  // pernas de trás (lado de longe), mais escuras
  pt.tube([[50, 58], [48 - sw * 4, foot - 2]], 5, DK, O).tube([[86, 58], [88 + sw * 4, foot - 2]], 6, DK, O).done();
  pt.ell(47 - sw * 4, foot - 1, 6, 3, DK, O).ell(89 + sw * 4, foot - 1, 7, 3, DK, O).done();
  // cauda (afina e sobe)
  pt.tube([[88, 54, 10], [104, 50, 7], [114, 40, 5], [116, 28, 3]], 4, BD, O).done();
  // corpo
  pt.ell(64, 52, 31, 15, BD, O).done();
  // pescoço e cabeça
  pt.tube([[42, 48, 10], [hx + 8, hy + 4, 8]], 8, BD, O).ell(hx, hy, 14, 10, BD, O).ell(hx - 10, hy + 4, 9, 6, BD, O).done();
  // pernas da frente (lado de perto)
  const fl = hit ? -6 : sw * 4;
  pt.tube([[42, 58], [40 + fl, foot - 2]], 6, BD, O).tube([[80, 58], [82 - sw * 4, foot - 2]], 7, BD, O).done();
  pt.ell(39 + fl, foot - 1, 7, 3, BD, O).ell(83 - sw * 4, foot - 1, 8, 3, BD, O).done();
  // chifres
  pt.tube([[hx + 6, hy - 7], [hx + 14, hy - 15], [hx + 22, hy - 17]], 2, HR, O).tube([[hx - 2, hy - 8], [hx + 2, hy - 18]], 2, HR, O).done();
  // barriga dourada (parte de baixo do corpo e do pescoço)
  for (let Y = 56; Y <= 67; Y++) for (let X = 36; X < 94; X++) { const u = (X + .5 - 64) / 31, v = (Y + .5 - 52) / 15; if (u * u + v * v < .82) px(x, Y > 63 ? '#c86a1a' : (X + Y) & 1 ? '#f0a83a' : '#e8962a', X, Y); }
  for (let X = 40; X < 90; X += 5) px(x, '#a8501a', X, 60, 1, 6);
  // placas/espinhos escuros nas costas
  for (let k = 0; k < 8; k++) { const X = 40 + k * 7, Y = 38 + Math.round(Math.abs(k - 3.5) * .9); px(x, O, X - 2, Y - 5, 5, 5); px(x, '#3a1410', X - 1, Y - 4, 3, 4); px(x, '#6a2414', X, Y - 5, 1, 2); }
  // rachaduras de lava brilhando
  const crack = pts => { for (let i = 0; i < pts.length - 1; i++) { const [a1, b1] = pts[i], [a2, b2] = pts[i + 1], n = Math.max(Math.abs(a2 - a1), Math.abs(b2 - b1)); for (let k = 0; k <= n; k++) { const X = Math.round(a1 + (a2 - a1) * k / n), Y = Math.round(b1 + (b2 - b1) * k / n); px(x, '#ffd84a', X, Y, 1, 1); px(x, '#fff3b0', X, Y - 1, 1, 1); } } };
  crack([[50, 44], [56, 49], [53, 54]]); crack([[68, 42], [72, 47], [78, 46], [81, 51]]); crack([[92, 50], [100, 48]]); crack([[106, 44], [110, 38]]); crack([[hx + 2, hy - 2], [hx + 7, hy + 2]]);
  // olho em brasa, narinas e boca
  px(x, O, hx - 6, hy - 4, 6, 4); px(x, '#ffe04a', hx - 5, hy - 3, 4, 2); px(x, '#ffffff', hx - 5, hy - 3, 1, 1); px(x, O, hx - 3, hy - 3, 1, 2);
  px(x, O, hx - 17, hy + 1, 2, 1);
  if (roar || hit) { px(x, O, hx - 19, hy + 5, 14, 5); px(x, '#5a0c08', hx - 18, hy + 6, 12, 3); px(x, '#ffd84a', hx - 17, hy + 6, 10, 1); for (let k = 0; k < 4; k++) px(x, '#fff3b0', hx - 17 + k * 3, hy + 5, 1, 1); }
  else { px(x, O, hx - 18, hy + 6, 12, 1); px(x, '#fff3b0', hx - 15, hy + 7, 1, 1); px(x, '#fff3b0', hx - 11, hy + 7, 1, 1); }
  const spine = []; for (let k = 0; k < 8; k++) spine.push([40 + k * 7, 33 + Math.round(Math.abs(k - 3.5) * .9)]);
  return FSPR[f] = { r: c, l: flipped(c), W, H, mouth: [hx - 18, hy + 6], tail: [116, 26], spine, eye: [hx - 3, hy - 2] };
}
function flame(x, X, Y, hgt, t, seed) {   // labareda vertical tremulante
  const fl = Math.floor(t * 14 + seed); for (let k = 0; k < hgt; k++) { const w = Math.max(1, Math.round((1 - k / hgt) * 3 + h2(k, fl) * 1.5)), dx = Math.round(Math.sin(t * 9 + k * .6 + seed) * k / hgt * 2);
    px(x, k < hgt * .25 ? '#fff3b0' : k < hgt * .5 ? P.fire3 : k < hgt * .8 ? P.fire2 : P.fire1, X - Math.floor(w / 2) + dx, Y - k, w, 1); } }
function drawFireAt(x, X, Y, f, face, t, flash) {
  const s = fireSprite(f), flip = face > 0, ox = X - s.W / 2, oy = Y - s.H + 6, mx = p => flip ? s.W - p : p;
  x.fillStyle = 'rgba(30,8,4,.45)'; x.beginPath(); x.ellipse(X, Y, 42, 9, 0, 0, 6.283); x.fill();
  // chão queimando por onde passa
  glow(x, X, Y, 30, P.fire2, .1);
  x.drawImage(flip ? s.l : s.r, ox, oy);
  if (flash) { x.globalAlpha = .5; x.globalCompositeOperation = 'lighter'; x.drawImage(flip ? s.l : s.r, ox, oy); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
  // crista de fogo nas costas e na ponta da cauda
  s.spine.forEach(([sx, sy], i) => flame(x, Math.round(ox + mx(sx)), Math.round(oy + sy), 7 + Math.round(4 * Math.abs(Math.sin(t * 3 + i))), t, i * 3));
  flame(x, Math.round(ox + mx(s.tail[0])), Math.round(oy + s.tail[1]), 16, t, 40); flame(x, Math.round(ox + mx(s.tail[0]) + (flip ? 2 : -2)), Math.round(oy + s.tail[1] + 2), 10, t, 47);
  glow(x, ox + mx(s.tail[0]), oy + s.tail[1] - 6, 12, P.fire3, .2); glow(x, X, oy + 40, 34, P.fire2, .09 + .04 * Math.sin(t * 5));
  glow(x, ox + mx(s.eye[0]), oy + s.eye[1], 5, '#ffe04a', .3);
  // fagulhas subindo
  for (let i = 0; i < 10; i++) { const ph = (t * .7 + i / 10) % 1, ex = ox + mx(40 + (i * 13) % 70) + Math.sin(ph * 8 + i) * 4, ey = oy + 30 - ph * 46; x.globalAlpha = 1 - ph; px(x, ph < .4 ? P.fire4 : P.fire2, Math.round(ex), Math.round(ey), 1, 1); } x.globalAlpha = 1;
  // baforada de fogo logo depois de uma pisada
  const k = (performance.now() - (GFX.lastSmashT || 0)) / 1000;
  if (k < 1.1) { const dir = flip ? 1 : -1, bx = ox + mx(s.mouth[0]), by = oy + s.mouth[1], len = 70 * Math.min(1, k * 4);
    x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 46; i++) { const u = h2(i, 7), d = u * len, spread = d * .32, yy = by + d * .25 + (h2(i, 3) - .5) * spread * 2, r = 2 + u * 5, a = (1 - k / 1.1) * (1 - u * .5);
      x.globalAlpha = a * .8; disc(x, Math.round(bx + dir * d + Math.sin(t * 20 + i) * 2), Math.round(yy), Math.round(r), u < .3 ? '#fff3b0' : u < .6 ? P.fire3 : P.fire2); }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
}
