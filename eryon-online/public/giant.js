// =====================================================================
// EVENTO: O GIGANTE DE PEDRA — desenho, efeitos, contagem regressiva, ataques, catapultas e consertos
// =====================================================================
let GIANT = { at: 0, state: 'none', result: '', damaged: new Set(), live: null };
const GFX = { shots: [], hits: [], smash: [], shakeUntil: 0, view: null };
// ---------- sprite do gigante (pedra com musgo e olhos azuis, como a estátua)
const GSPR = {};
function giantSprite(f) {   // f: 0/1 andando, 2 braços para cima, 3 pancada
  if (GSPR[f]) return GSPR[f]; const W = 76, H = 96, [c, x] = canvas(W, H), pt = painter(x), ST = ['#3e4554', '#5a6272', '#7a8396', '#9aa4b4'], O = '#14161c', M = ['#2f6a3a', '#3f8f45', '#66b350', '#84c65a'];
  const cx = 38, legY = 92, sw = f === 0 ? 1 : f === 1 ? -1 : 0;
  // pernas
  pt.tube([[cx - 9, 62, 7], [cx - 10 - sw * 3, legY - 4, 7]], 7, ST, O).tube([[cx + 9, 62, 7], [cx + 10 + sw * 3, legY - 4, 7]], 7, ST, O).done();
  pt.ell(cx - 10 - sw * 3, legY - 3, 9, 4, ST, O).ell(cx + 10 + sw * 3, legY - 3, 9, 4, ST, O).done();
  // braço de trás
  const up = f === 2, hit = f === 3;
  const armB = up ? [[cx - 16, 34, 6], [cx - 20, 18, 5], [cx - 16, 4, 6]] : hit ? [[cx - 16, 34, 6], [cx - 22, 52, 5], [cx - 18, 70, 7]] : [[cx - 18, 34, 6], [cx - 24 + sw * 2, 52, 5], [cx - 24 + sw * 4, 66, 7]];
  pt.tube(armB, 6, ST, O, -.15).done();
  // tronco e cabeça
  pt.ell(cx, 42, 20, 22, ST, O, .05).done(); pt.ell(cx, 16, 11, 10, ST, O, .1).done();
  for (let i = 0; i < 30; i++) { const a = 3.5 + h2(i, 7) * 2.4, r = .7 + h2(7, i) * .25; px(x, M[(i % 3) + 1], Math.round(cx + Math.cos(a) * 19 * r), Math.round(42 + Math.sin(a) * 21 * r), 2, 1); }
  for (let i = 0; i < 10; i++) px(x, M[2], Math.round(cx - 8 + h2(i, 3) * 16), Math.round(8 + h2(i, 4) * 4), 2, 1);
  for (const [X, Y] of [[cx - 6, 34], [cx + 8, 48], [cx - 2, 56], [cx + 4, 28]]) { px(x, O, X, Y, 1, 4); px(x, O, X + 1, Y + 4, 1, 3); }   // rachaduras
  px(x, O, cx - 6, 14, 4, 3); px(x, O, cx + 3, 14, 4, 3); px(x, '#9ff3ff', cx - 5, 15, 2, 1); px(x, '#9ff3ff', cx + 4, 15, 2, 1);   // olhos
  px(x, O, cx - 4, 21, 9, 2); px(x, '#2b3240', cx - 3, 21, 7, 1);                                                                       // boca
  // braço da frente
  const armF = up ? [[cx + 16, 34, 6], [cx + 20, 18, 5], [cx + 16, 4, 6]] : hit ? [[cx + 16, 34, 6], [cx + 22, 52, 5], [cx + 18, 70, 7]] : [[cx + 18, 34, 6], [cx + 24 - sw * 2, 52, 5], [cx + 24 - sw * 4, 66, 7]];
  pt.tube(armF, 6, ST, O, .1).done();
  return GSPR[f] = { r: c, l: flipped(c), W, H };
}
function giantFrame(t) { const L = GIANT.live; if (!L) return 0; if (L.phase === 'stomp') { const k = ((performance.now() - (GFX.lastSmashT || 0)) / 1000); return k < .25 ? 3 : (k > 2.2 ? 2 : 0); } return Math.floor(t * 2.2) % 2; }
function drawGiant(x, t) {
  const L = GIANT.live; if (!L) return; const f = giantFrame(t), s = giantSprite(f), X = Math.round(L.x), Y = Math.round(L.y);
  x.fillStyle = 'rgba(8,20,16,.4)'; x.beginPath(); x.ellipse(X, Y, 26, 7, 0, 0, 6.283); x.fill();
  x.drawImage(L.face > 0 ? s.l : s.r, X - 38, Y - 94);
  glow(x, X - 2, Y - 79, 6, '#9ff3ff', .18 + .08 * Math.sin(t * 4)); glow(x, X + 6, Y - 79, 6, '#9ff3ff', .18 + .08 * Math.sin(t * 4));
  if (performance.now() - (GFX.lastHitT || 0) < 160) { x.globalAlpha = .45; x.globalCompositeOperation = 'lighter'; x.drawImage(L.face > 0 ? s.l : s.r, X - 38, Y - 94); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
}
// ---------- catapulta (objeto que todos podem criar)
let CAT_SPR = null;
function catapultSprite() { if (CAT_SPR) return CAT_SPR; const [c, x] = canvas(30, 24); x.fillStyle = 'rgba(10,30,20,.3)'; x.fillRect(2, 21, 27, 3);
  px(x, P.ink, 2, 14, 26, 6); px(x, P.wood, 3, 15, 24, 4); px(x, P.woodL, 3, 15, 24, 1);
  for (const X of [5, 22]) { disc(x, X, 20, 3, P.ink); disc(x, X, 20, 2, P.woodD); px(x, P.woodL, X, 19, 1, 1); }
  px(x, P.ink, 12, 4, 4, 12); px(x, P.wood, 13, 5, 2, 10);
  for (let k = 0; k < 14; k++) { const X = 14 - k, Y = 12 - Math.round(k * .55); px(x, P.ink, X, Y, 2, 3); px(x, P.woodL, X, Y + 1, 1, 1); }
  px(x, P.ink, 0, 3, 6, 5); px(x, '#5a3420', 1, 4, 4, 3); px(x, P.st2, 2, 4, 2, 2); return CAT_SPR = { c, ax: 15, ay: 22 }; }
// ---------- mensagens do servidor
function onGiantMsg(m) {
  if (m.t === 'giant') { const was = GIANT.state; GIANT.at = m.at; GIANT.state = m.state; GIANT.result = m.result; GIANT.damaged = new Set(m.damaged || []); GIANT.live = m.live;
    if (m.start) { giantHorn(); setTimeout(() => dragonRoar && SND.ctx && dragonRoar(.45), 900); fxToast('O GIGANTE ACORDOU!', 'Ele vem do leste. Defendam Eryon!', '#e04a3a', '⚠'); }
    if (m.end) { fxToast(m.end === 'won' ? 'VITÓRIA!' : 'A cidade foi danificada', m.end === 'won' ? 'Eryon venceu o Gigante de Pedra!' : 'Consertem as casas com lenha', m.end === 'won' ? '#ffd84a' : '#e04a3a', m.end === 'won' ? '♛' : '⚠'); if (m.end === 'won') fanfare(true); }
    updGiantHud(); return true; }
  if (m.t === 'giantHit') { GFX.lastHitT = performance.now(); if (GIANT.live) GFX.hits.push({ x: GIANT.live.x + (Math.random() - .5) * 24, y: GIANT.live.y - 60 - Math.random() * 20, d: m.d, t0: performance.now(), big: m.d >= 20 }); if (m.kind === 'zap' && SND.ctx) thunder(); return true; }
  if (m.t === 'giantSmash') { GFX.lastSmashT = performance.now(); GFX.smash.push({ x: m.x, y: m.y, t0: performance.now() }); const p = players.get(myId);
    if (p && !p.room && Math.hypot(p.x - m.x, p.y - m.y) < 260) { stomp(); shake(); } return true; }
  if (m.t === 'catShot') { GFX.shots.push({ ...m, t0: performance.now() }); const p = players.get(myId); if (p && !p.room && Math.hypot(p.x - m.x, p.y - m.y) < 220) play('wood_hit', .5, .7); return true; }
  return false;
}
// ---------- desenho dos efeitos no mundo
function bldPos(id) { if (id.startsWith('h_')) { const h = BUILT.find(q => 'h_' + q.id === id); return h ? { x: h.x, y: h.y } : null; } return B[id] ? { x: B[id].x, y: B[id].y } : null; }
function drawGiantWorld(x, t, li, ti, cw, ch) {
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
    if (k <= 1) { const X = s.x + (s.tx - s.x) * k, Y = s.y - 14 + (s.ty - 60 - s.y + 14) * k - Math.sin(k * Math.PI) * 70; px(x, P.ink, Math.round(X) - 3, Math.round(Y) - 3, 7, 7); px(x, P.st2, Math.round(X) - 2, Math.round(Y) - 2, 5, 5); px(x, P.st3, Math.round(X) - 2, Math.round(Y) - 2, 2, 2); }
    else { if (!s.boom) { s.boom = 1; const p = players.get(myId); if (p && Math.hypot(p.x - s.tx, p.y - s.ty) < 260) stomp(.5); } burst(x, t, s.t0 / 1000 + .8, s.tx, s.ty - 60, 22, ['#c3cad6', '#939cae', '#ffd84a'], 30, .6, 20, 3); } }
}
// ---------- textos na tela: nome, vida e números de dano
function giantLabels(ctx2, L, T, S, fs) {
  const G2 = GIANT.live; if (!G2) return; const sx = Math.round((G2.x - L) * S), sy = Math.round((G2.y - 100 - T) * S);
  if (sx > -300 && sx < cv.width + 300 && sy > -100 && sy < cv.height + 200) { ctx2.textAlign = 'center'; ctx2.textBaseline = 'bottom'; ctx2.font = `700 ${Math.round(fs * 1.05)}px Pix, monospace`; ctx2.lineWidth = Math.max(3, fs / 4); ctx2.strokeStyle = '#140e06'; ctx2.strokeText('GIGANTE DE PEDRA', sx, sy); ctx2.fillStyle = '#ff9a8a'; ctx2.fillText('GIGANTE DE PEDRA', sx, sy);
    const w = fs * 7, h = Math.max(6, fs * .45); ctx2.fillStyle = '#140e06'; ctx2.fillRect(sx - w / 2 - 2, sy + 3, w + 4, h + 4); ctx2.fillStyle = '#3a1410'; ctx2.fillRect(sx - w / 2, sy + 5, w, h); ctx2.fillStyle = '#e04a3a'; ctx2.fillRect(sx - w / 2, sy + 5, w * Math.max(0, G2.hp) / G2.max, h); }
  for (let i = GFX.hits.length - 1; i >= 0; i--) { const hh = GFX.hits[i], k = (performance.now() - hh.t0) / 900; if (k > 1) { GFX.hits.splice(i, 1); continue; }
    const X = Math.round((hh.x - L) * S), Y = Math.round((hh.y - k * 18 - T) * S); ctx2.globalAlpha = 1 - k; ctx2.font = `700 ${Math.round(fs * (hh.big ? 1.4 : 1))}px Pix, monospace`; ctx2.strokeText('-' + hh.d, X, Y); ctx2.fillStyle = hh.big ? '#9ff3ff' : '#ffd84a'; ctx2.fillText('-' + hh.d, X, Y); ctx2.globalAlpha = 1; }
}
// ---------- barras e contagem regressiva (HUD)
function fmtLeft(ms) { const m = Math.max(0, Math.ceil(ms / 60000)), h = Math.floor(m / 60); return h ? `${h}h${String(m % 60).padStart(2, '0')}` : `${m} min`; }
function updGiantHud() {
  const el = $('giantHud'); if (!el) return; const now = Date.now(), L = GIANT.live;
  if (L) { el.hidden = false; el.className = 'gh battle'; el.innerHTML = `<div class="gl">GIGANTE <b>${Math.max(0, L.hp)}</b></div><div class="gb"><i style="width:${Math.max(0, 100 * L.hp / L.max)}%"></i></div><div class="gl">CIDADE <b>${L.city}%</b></div><div class="gb city"><i style="width:${L.city}%"></i></div>`; return; }
  if (GIANT.state === 'scheduled' && GIANT.at > now && GIANT.at - now < 36 * 3600e3) { const hh = new Date(GIANT.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }); el.hidden = false; el.className = 'gh warn'; el.innerHTML = `⚠ O GIGANTE ATACA ÀS ${hh} · faltam <b>${fmtLeft(GIANT.at - now)}</b><small>Crie lanças e catapultas (botão Criar) e defenda Eryon!</small>`; return; }
  if (GIANT.damaged.size) { el.hidden = false; el.className = 'gh warn'; el.innerHTML = `A cidade foi danificada · ${GIANT.damaged.size} construções<small>Chegue perto de uma e toque em "Consertar" (2 lenhas)</small>`; return; }
  el.hidden = true;
}
setInterval(updGiantHud, 15000);
// ---------- ações
let gHitReady = 0;
function giantContext(p) {
  if (p.room || p.fly) return null; const L = GIANT.live;
  if (L) { const eq = (p.look && p.look.equip) || '', ranged = eq === 'arco' || (classOf(p) || {}).id === 'arqueira', reach = ranged ? 150 : 62, d = Math.hypot(p.x - L.x, p.y - L.y);
    for (const dd of DECOR) if (dd.kind === 'catapulta' && Math.hypot(p.x - dd.x, p.y - dd.y) < 24) return { kind: 'econ', label: 'Disparar catapulta (1 pedra)', fn: () => { send({ t: 'fireCat', id: dd.id }); doAct('hammer'); } };
    if (d < reach) return { kind: 'econ', label: 'Atacar o gigante!', fn: () => { const now = performance.now(); if (now < gHitReady) return; gHitReady = now + 1400; p.face = L.x < p.x ? -1 : 1; doAct(ranged ? 'arrow' : eq === 'espada' || eq === 'lanca' ? 'sword' : 'chop'); send({ t: 'hitGiant' }); } };
    return null; }
  for (const id of GIANT.damaged) { const b = bldPos(id); if (b && Math.hypot(p.x - b.x, p.y - (b.y + 4)) < 26) return { kind: 'econ', label: 'Consertar (2 lenhas)', fn: () => { send({ t: 'repair', id }); doAct('build'); } }; }
  return null;
}
// ---------- sons e tremor
function stomp(v = 1) { if (!SND.ctx) return; const c = SND.ctx, w = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(70, w); o.frequency.exponentialRampToValueAtTime(28, w + .5); g.gain.setValueAtTime(.7 * v, w); g.gain.exponentialRampToValueAtTime(.001, w + .7); o.connect(g); g.connect(SND.sfx); o.start(w); o.stop(w + .75); noiseHit(w, .35, 160, .5 * v, 'lowpass'); }
function giantHorn() { if (!SND.ctx) return; const c = SND.ctx, w = c.currentTime; for (const [f, d] of [[146.8, 0], [146.8, .9], [196, 1.8]]) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; g.gain.setValueAtTime(0, w + d); g.gain.linearRampToValueAtTime(.12, w + d + .1); g.gain.linearRampToValueAtTime(0, w + d + .8); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; o.connect(lp); lp.connect(g); g.connect(SND.sfx); o.start(w + d); o.stop(w + d + .85); } }
function shake() { const el = cv; let n = 0; const iv = setInterval(() => { el.style.transform = n++ > 8 ? '' : `translate(${(Math.random() - .5) * 10}px,${(Math.random() - .5) * 8}px)`; if (n > 9) clearInterval(iv); }, 40); }
addEventListener('DOMContentLoaded', () => { const el = $('giantHud'); if (el) el.onclick = () => { if (GIANT.state === 'scheduled') { closePanels(); openPanel('craft'); } }; });
