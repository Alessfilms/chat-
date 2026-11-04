// =====================================================================
// DRAGÕES voando sobre Eryon. A posição vem do relógio, então todos os jogadores
// veem os mesmos dragões no mesmo lugar. Sombra no chão, asas batendo e som quando passam perto.
// =====================================================================
const DRAGON_PALS = [
  { body: ['#5a1a14', '#8a2a1c', '#c0442a', '#e8704a'], belly: '#f2c27a', wing: ['#4a1410', '#7a2418'], memb: '#b8402a', eye: '#ffd84a' },   // vermelho
  { body: ['#103a34', '#1d5a4a', '#2f8a6a', '#5ac08e'], belly: '#d8e8a0', wing: ['#0c2a26', '#1a4a40'], memb: '#2a7a62', eye: '#ff7a3a' },   // verde-esmeralda
  { body: ['#2a1640', '#46286a', '#6e4a9a', '#9a7ad0'], belly: '#e0c8f0', wing: ['#1e0f30', '#38205a'], memb: '#5a3a8a', eye: '#9ff3ff' },   // roxo
];
const DRAGON_SPR = {};
function dragonFrame(pi, f) {   // f: 0 asas em cima, 1 meio, 2 embaixo
  const key = pi + '_' + f; if (DRAGON_SPR[key]) return DRAGON_SPR[key];
  const D = DRAGON_PALS[pi], [c, x] = canvas(60, 40), O = '#140a08', pt = painter(x);
  const sh = [28, 17], tips = [[[14, 1], [24, 0], [35, 3]], [[8, 12], [20, 9], [37, 11]], [[13, 34], [23, 36], [34, 31]]][f];
  const wing = (dx, dy, dark) => {   // membrana + ossos da asa
    const T = tips.map(([a, b]) => [a + dx, b + dy]), S = [sh[0] + dx, sh[1] + dy];
    x.fillStyle = dark ? D.wing[0] : D.memb; x.beginPath(); x.moveTo(S[0], S[1]); T.forEach(([a, b]) => x.lineTo(a, b)); x.lineTo(S[0] - 10, S[1] + 3); x.closePath(); x.fill();
    x.fillStyle = dark ? D.wing[0] : D.wing[1]; for (let i = 0; i < T.length - 1; i++) { const m = [(T[i][0] + T[i + 1][0]) / 2, (T[i][1] + T[i + 1][1]) / 2]; x.beginPath(); x.moveTo(T[i][0], T[i][1]); x.lineTo(m[0] + (S[0] - m[0]) * .25, m[1] + (S[1] - m[1]) * .25); x.lineTo(T[i + 1][0], T[i + 1][1]); x.fill(); }
    pt.tube([[S[0], S[1], 1.4], [T[2][0], T[2][1], .6]], 1, dark ? [D.wing[0], D.wing[0], D.wing[1], D.wing[1]] : D.body, O);
    for (const [a, b] of T.slice(0, 2)) pt.tube([[T[2][0] + (S[0] - T[2][0]) * .3, T[2][1] + (S[1] - T[2][1]) * .3, .9], [a, b, .5]], .8, dark ? [D.wing[0], D.wing[0], D.wing[1], D.wing[1]] : D.body, O);
    pt.done();
  };
  wing(-4, f === 2 ? -2 : 2, true);                       // asa de trás (mais escura)
  // cauda com ponta de flecha
  pt.tube([[18, 21, 3], [10, 23, 2.2], [4, 21, 1.4], [1, 17, .9]], 2, D.body, O).done();
  x.fillStyle = O; x.beginPath(); x.moveTo(-1, 14); x.lineTo(4, 16); x.lineTo(0, 20); x.fill(); x.fillStyle = D.body[2]; x.fillRect(0, 16, 2, 2);
  // corpo, pescoço e cabeça
  pt.ell(27, 21, 11, 5.5, D.body, O).done();
  pt.tube([[35, 19, 3], [41, 14, 2.4], [44, 11, 2.2]], 2.4, D.body, O).done();
  pt.poly([[42, 7], [49, 8], [56, 11], [56, 14], [48, 15], [42, 14]], D.body, O, .1).done();
  pt.tube([[44, 8, 1.1], [39, 4, .8], [36, 3, .4]], 1, ['#a88a5a', '#d6c094', '#efe2bf', '#fffaf0'], O).done();   // chifre
  x.fillStyle = D.belly; x.fillRect(19, 24, 16, 2); x.fillRect(36, 18, 3, 3); x.fillRect(48, 14, 7, 1);
  for (let X = 18; X < 36; X += 3) px(x, D.body[0], X, 24, 1, 2);                        // escamas da barriga
  for (let X = 20; X < 34; X += 3) { px(x, O, X, 14, 2, 2); px(x, D.body[3], X, 14, 1, 1); }   // espinhos nas costas
  px(x, D.eye, 50, 10, 2, 1); px(x, O, 51, 10, 1, 1); px(x, O, 54, 12, 1, 1);           // olho e narina
  // patas recolhidas
  pt.tube([[24, 25, 1.5], [22, 29, 1]], 1, D.body, O).tube([[31, 25, 1.5], [30, 29, 1]], 1, D.body, O).done();
  wing(0, 0, false);                                      // asa da frente
  const fl = flipped(c);
  return DRAGON_SPR[key] = { r: c, l: fl };
}
// rotas: oito grandes e ovais pelo mapa, cada dragão com seu tempo
const DRAGONS = [
  { pal: 0, period: 150, phase: 0, rx: 300, ry: 520, alt: 70, sx: 1 },
  { pal: 1, period: 190, phase: 2.1, rx: 260, ry: 460, alt: 95, sx: -1 },
  { pal: 2, period: 230, phase: 4.2, rx: 320, ry: 580, alt: 120, sx: 1 },
];
function dragonPos(d, T) {
  const a = (T / d.period) * 6.283 + d.phase;
  return { x: WW / 2 + Math.sin(a) * d.rx * d.sx, y: WH / 2 + Math.sin(a * 2) * d.ry * .5 + Math.cos(a * .5) * 120, a };
}
function dragonState(d) {
  const T = Date.now() / 1000, p = dragonPos(d, T), q = dragonPos(d, T + .2), vx = q.x - p.x;
  const glide = Math.sin(T * .3 + d.phase) > .55, flap = glide ? 1 : Math.floor((T * 6 + d.phase) % 4), f = flap === 3 ? 1 : flap;
  return { x: p.x, y: p.y, alt: d.alt + Math.sin(T * 1.4 + d.phase) * 6, right: vx >= 0, f, flapPhase: (T * 6 + d.phase) % 4, glide };
}
function drawDragonShadows(x, li, ti, cw, ch) {
  for (const d of DRAGONS) { const s = dragonState(d); if (s.x < li - 60 || s.x > li + cw + 60 || s.y < ti - 40 || s.y > ti + ch + 40) continue;
    const k = 1 - d.alt / 260; x.fillStyle = `rgba(8,20,16,${(.22 * k).toFixed(3)})`;
    const w = (s.f === 1 ? 26 : 16) * k; x.beginPath(); x.ellipse(Math.round(s.x), Math.round(s.y), w, 5 * k, 0, 0, 6.283); x.fill(); x.fillRect(Math.round(s.x + (s.right ? -26 : 8) * k), Math.round(s.y - 1), Math.round(18 * k), 2); }
}
let dragonSnd = 0;
function drawDragons(x, li, ti, cw, ch, me) {
  for (const d of DRAGONS) { const s = dragonState(d), Y = s.y - s.alt;
    if (s.x < li - 60 || s.x > li + cw + 60 || Y < ti - 50 || Y > ti + ch + 50) continue;
    const spr = dragonFrame(d.pal, s.f), img = s.right ? spr.r : spr.l;
    x.drawImage(img, Math.round(s.x - 30), Math.round(Y - 20));
    // som: bater de asas e um rugido distante de vez em quando, quando passa perto
    if (me && SND.ctx && !me.room) { const dist = Math.hypot(me.x - s.x, me.y - s.y); const now = performance.now();
      if (dist < 140 && !s.glide && Math.floor(s.flapPhase) === 2 && now - (d.lastFlap || 0) > 500) { d.lastFlap = now; play('whoosh', .25 * (1 - dist / 140), .55); }
      if (dist < 200 && now - dragonSnd > 45000) { dragonSnd = now; dragonRoar(.35 * (1 - dist / 200)); } }
  }
}
function dragonRoar(g) {   // rugido sintetizado: ruído grave filtrado com tremor
  const c = SND.ctx, w = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain(), o = c.createOscillator(), og = c.createGain();
  s.buffer = SND.noise; s.loop = true; f.type = 'lowpass'; f.frequency.setValueAtTime(300, w); f.frequency.linearRampToValueAtTime(900, w + .4); f.frequency.linearRampToValueAtTime(200, w + 1.8);
  v.gain.setValueAtTime(0, w); v.gain.linearRampToValueAtTime(g, w + .25); v.gain.exponentialRampToValueAtTime(.001, w + 2);
  o.frequency.value = 22; og.gain.value = g * .6; o.connect(og); og.connect(v.gain);
  s.connect(f); f.connect(v); v.connect(SND.sfx); s.start(w); s.stop(w + 2.1); o.start(w); o.stop(w + 2.1);
}
