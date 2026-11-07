// =====================================================================
// DRAGÕES vistos de cima: de vez em quando um (ou um bando) atravessa a tela voando alto,
// com a sombra passando no chão, e some do outro lado.
// =====================================================================
const DRAGON_PALS = [
  { body: ['#5a1a14', '#8a2a1c', '#c0442a', '#e8704a'], memb: ['#4a1410', '#7a2418', '#a8382a', '#c85a3a'], horn: '#efe2bf', eye: '#ffd84a' },   // vermelho
  { body: ['#103a34', '#1d5a4a', '#2f8a6a', '#5ac08e'], memb: ['#0c2a26', '#164a3e', '#227060', '#3a9a7a'], horn: '#efe2bf', eye: '#ff7a3a' },   // esmeralda
  { body: ['#2a1640', '#46286a', '#6e4a9a', '#9a7ad0'], memb: ['#1e0f30', '#33205a', '#4e3480', '#7058a8'], horn: '#e8e0ff', eye: '#9ff3ff' },   // roxo
  { body: ['#2a2e36', '#454b58', '#6a7282', '#9aa2b2'], memb: ['#1c1f26', '#30343e', '#4a505e', '#646c7c'], horn: '#fff3d6', eye: '#ffd84a' },   // cinza
  { body: ['#0e0c10', '#1e1a22', '#34303c', '#524c5c'], memb: ['#3a0a08', '#6a1410', '#a8261a', '#d8442a'], horn: '#e8d8b0', eye: '#ff6a1a' },   // NEGRO (chefe)
  { body: ['#1e0a12', '#3a1220', '#621c30', '#8e2c42'], memb: ['#140a24', '#2a1448', '#46207a', '#6a34a8'], horn: '#efe2bf', eye: '#ff7a1a' },   // DUAS CABEÇAS (chefe)
];
const DSPR = {}, DIRS = 16;
// desenha o dragão (cabeça para cima no desenho) girado no ângulo da direção, ponto a ponto: fica nítido em qualquer direção
function dragonTop(pi, f, di) {
  const key = pi + '_' + f + '_' + di; if (DSPR[key]) return DSPR[key];
  const D = DRAGON_PALS[pi], N = 80, [c, x] = canvas(N, N), O = '#140a08', pt = painter(x), a = di / DIRS * 6.283, ca = Math.cos(a), sa = Math.sin(a);
  const R = ([px0, py0, r]) => [N / 2 + px0 * ca - py0 * sa, N / 2 + px0 * sa + py0 * ca, r];   // gira (direção 0 = para cima)
  const sp = [1, .72, .42][f], fw = [0, -3, 2][f];      // abertura das asas em cada quadro do bater
  const wing = s => {   // s = -1 esquerda, 1 direita
    const sh = [s * 4, -3], wr = [s * 15 * sp + s * 2, -10 + fw], t1 = [s * 31 * sp + s * 3, -6 + fw * .5], t2 = [s * 29 * sp + s * 3, 4], t3 = [s * 21 * sp + s * 2, 11], back = [s * 5, 8];
    const mem = [sh, wr, t1, [s * 25 * sp + s * 2, 1], t2, [s * 22 * sp + s * 2, 7], t3, [s * 12 * sp + s, 9], back].map(p => R(p));
    pt.poly(mem, D.memb, O, s > 0 ? -.05 : .1);
    pt.tube([R([...sh, 2]), R([...wr, 1.5]), R([...t1, .6])], 1.4, D.body, O);
    for (const tp of [t2, t3]) pt.tube([R([...wr, 1.2]), R([...tp, .5])], 1, D.body, O);
  };
  wing(-1); wing(1); pt.done();
  // cauda balançando um pouco, com ponta de flecha
  const tw = [0, 2, -2][f];
  pt.tube([R([0, 7, 3.4]), R([tw * .5, 15, 2.4]), R([tw, 22, 1.6]), R([tw * .3, 29, .9])], 2, D.body, O).poly([R([tw * .3 - 3, 29]), R([tw * .3, 34]), R([tw * .3 + 3, 29]), R([tw * .3, 27])], D.body, O).done();
  // corpo, pescoço e cabeça
  pt.tube([R([0, -5, 5]), R([0, 1, 5.5]), R([0, 7, 3.6])], 5, D.body, O).done();
  pt.tube([R([0, -8, 3]), R([0, -14, 2.4])], 2.5, D.body, O).done();
  pt.tube([R([-2, -15, 1.2]), R([-4, -10, .5])], 1, [D.horn, D.horn, D.horn, '#ffffff'], O).tube([R([2, -15, 1.2]), R([4, -10, .5])], 1, [D.horn, D.horn, D.horn, '#ffffff'], O);
  pt.tube([R([0, -15, 3.6]), R([0, -19, 3]), R([0, -23, 1.6])], 3, D.body, O).done();
  // espinhos nas costas e olhos
  for (let k = -12; k <= 18; k += 3) { const [X, Y] = R([0, k]); px(x, k < 6 ? D.body[3] : D.body[2], Math.round(X), Math.round(Y), 1, 1); }
  for (const s of [-1.6, 1.6]) { const [X, Y] = R([s, -19]); px(x, D.eye, Math.round(X), Math.round(Y), 1, 1); }
  // sombra = mesma silhueta escura
  const [sc, sx] = canvas(N, N); sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(8,18,14,1)'; sx.fillRect(0, 0, N, N);
  return DSPR[key] = { c, s: sc };
}
function dragon2Top(pi, f, di) {   // DRAGÃO DE DUAS CABEÇAS: mesmo corpo, dois pescoços e duas cabeças
  const key = 'two' + pi + '_' + f + '_' + di; if (DSPR[key]) return DSPR[key];
  const D = DRAGON_PALS[pi], N = 80, [c, x] = canvas(N, N), O = '#140a08', pt = painter(x), a = di / DIRS * 6.283, ca = Math.cos(a), sa = Math.sin(a);
  const R = ([px0, py0, r]) => [N / 2 + px0 * ca - py0 * sa, N / 2 + px0 * sa + py0 * ca, r];   // gira (direção 0 = para cima)
  const sp = [1, .72, .42][f], fw = [0, -3, 2][f];      // abertura das asas em cada quadro do bater
  const wing = s => {   // s = -1 esquerda, 1 direita
    const sh = [s * 4, -3], wr = [s * 15 * sp + s * 2, -10 + fw], t1 = [s * 31 * sp + s * 3, -6 + fw * .5], t2 = [s * 29 * sp + s * 3, 4], t3 = [s * 21 * sp + s * 2, 11], back = [s * 5, 8];
    const mem = [sh, wr, t1, [s * 25 * sp + s * 2, 1], t2, [s * 22 * sp + s * 2, 7], t3, [s * 12 * sp + s, 9], back].map(p => R(p));
    pt.poly(mem, D.memb, O, s > 0 ? -.05 : .1);
    pt.tube([R([...sh, 2]), R([...wr, 1.5]), R([...t1, .6])], 1.4, D.body, O);
    for (const tp of [t2, t3]) pt.tube([R([...wr, 1.2]), R([...tp, .5])], 1, D.body, O);
  };
  wing(-1); wing(1); pt.done();
  // cauda balançando um pouco, com ponta de flecha
  const tw = [0, 2, -2][f];
  pt.tube([R([0, 7, 3.4]), R([tw * .5, 15, 2.4]), R([tw, 22, 1.6]), R([tw * .3, 29, .9])], 2, D.body, O).poly([R([tw * .3 - 3, 29]), R([tw * .3, 34]), R([tw * .3 + 3, 29]), R([tw * .3, 27])], D.body, O).done();
  // corpo, pescoço e cabeça
  pt.tube([R([0, -5, 5]), R([0, 1, 5.5]), R([0, 7, 3.6])], 5, D.body, O).done();
  for (const sd of [-1, 1]) { const hx = sd * 8;
    pt.tube([R([sd * 1.5, -6, 3.2]), R([sd * 5, -11, 2.6]), R([hx, -15, 2.4])], 2.5, D.body, O).done();
    pt.tube([R([hx - 2, -16, 1.2]), R([hx - 4 - sd, -11, .5])], 1, [D.horn, D.horn, D.horn, '#ffffff'], O).tube([R([hx + 2, -16, 1.2]), R([hx + 4 - sd, -11, .5])], 1, [D.horn, D.horn, D.horn, '#ffffff'], O);
    pt.tube([R([hx, -15, 3.4]), R([hx + sd * .6, -19, 2.9]), R([hx + sd * 1.2, -23, 1.5])], 3, D.body, O).done(); }
  // espinhos nas costas e olhos
  for (let k = -12; k <= 18; k += 3) { const [X, Y] = R([0, k]); px(x, k < 6 ? D.body[3] : D.body[2], Math.round(X), Math.round(Y), 1, 1); }
  for (const sd of [-1, 1]) for (const s of [-1.4, 1.4]) { const [X, Y] = R([sd * 8.6 + s, -19]); px(x, sd < 0 ? D.eye : '#9ff3ff', Math.round(X), Math.round(Y), 1, 1); }
  // sombra = mesma silhueta escura
  const [sc, sx] = canvas(N, N); sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(8,18,14,1)'; sx.fillRect(0, 0, N, N);
  return DSPR[key] = { c, s: sc };
}
// voos: de tempos em tempos um dragão (às vezes um bando) cruza a tela e vai embora
const FLIGHTS = []; let nextFlight = performance.now() + 9000 + Math.random() * 9000, dragonSnd = 0;
function spawnFlight(li, ti, cw, ch) {
  const di = Math.floor(Math.random() * DIRS), a = di / DIRS * 6.283, dx = Math.sin(a), dy = -Math.cos(a);      // direção do voo
  const cx = li + cw / 2 + (Math.random() - .5) * cw * .5, cy = ti + ch / 2 + (Math.random() - .5) * ch * .4, back = Math.hypot(cw, ch) / 2 + 160;
  const n = Math.random() < .25 ? 3 : Math.random() < .3 ? 2 : 1, pal = Math.floor(Math.random() * 4), speed = 75 + Math.random() * 35, alt = 80 + Math.random() * 60;
  for (let i = 0; i < n; i++) { const side = i === 0 ? 0 : (i % 2 ? -1 : 1), off = i === 0 ? 0 : 34;
    FLIGHTS.push({ x: cx - dx * (back + off) - dy * side * 30, y: cy - dy * (back + off) + dx * side * 30, dx, dy, di, speed, alt: alt + i * 8, pal: n > 1 && i ? (pal + i) % 4 : pal, ph: Math.random() * 4, born: performance.now(), life: (back * 2 + 200) / speed * 1000 }); }
  if (SND.ctx && performance.now() - dragonSnd > 25000) { dragonSnd = performance.now(); setTimeout(() => dragonRoar(.28), 900); }
}
function updFlights(li, ti, cw, ch) {
  const now = performance.now();
  if (now > nextFlight) { const me2 = typeof players !== 'undefined' && players.get(myId), nest = me2 && LM.ninho && Math.hypot(me2.x - LM.ninho.x, me2.y - LM.ninho.y) < 380;
    nextFlight = now + (nest ? 12000 + Math.random() * 12000 : 35000 + Math.random() * 50000); spawnFlight(li, ti, cw, ch); }
  for (let i = FLIGHTS.length - 1; i >= 0; i--) { const f = FLIGHTS[i], t = (now - f.born) / 1000; if (now - f.born > f.life) { FLIGHTS.splice(i, 1); continue; } f.cx = f.x + f.dx * f.speed * t; f.cy = f.y + f.dy * f.speed * t; f.t = t; }
}
const flapFrame = f => { const k = Math.floor((f.t * 5 + f.ph) % 6); return Math.sin(f.t * .5 + f.ph) > .4 ? 0 : [0, 1, 2, 2, 1, 0][k]; };
function drawDragonShadows(x, li, ti, cw, ch) {
  updFlights(li, ti, cw, ch);
  for (const f of FLIGHTS) { if (f.cx === undefined) continue; const s = dragonTop(f.pal, flapFrame(f), f.di);
    x.globalAlpha = .26; x.drawImage(s.s, Math.round(f.cx - 40 + 10), Math.round(f.cy - 40 + 6)); }
  x.globalAlpha = 1;
}
function drawDragons(x, li, ti, cw, ch, me) {
  for (const f of FLIGHTS) { if (f.cx === undefined) continue; const fr = flapFrame(f), s = dragonTop(f.pal, fr, f.di), X = f.cx, Y = f.cy - f.alt;
    x.drawImage(s.c, Math.round(X - 40), Math.round(Y - 40));
    if (me && SND.ctx && !me.room && fr === 2 && performance.now() - (f.lastFlap || 0) > 700) { const d = Math.hypot(me.x - X, me.y - f.cy); if (d < 160) { f.lastFlap = performance.now(); play('whoosh', .22 * (1 - d / 160), .5); } }
  }
}
function dragonRoar(g) {   // rugido distante sintetizado
  const c = SND.ctx, w = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain(), o = c.createOscillator(), og = c.createGain();
  s.buffer = SND.noise; s.loop = true; f.type = 'lowpass'; f.frequency.setValueAtTime(300, w); f.frequency.linearRampToValueAtTime(900, w + .4); f.frequency.linearRampToValueAtTime(200, w + 1.8);
  v.gain.setValueAtTime(0, w); v.gain.linearRampToValueAtTime(g, w + .25); v.gain.exponentialRampToValueAtTime(.001, w + 2);
  o.frequency.value = 22; og.gain.value = g * .6; o.connect(og); og.connect(v.gain);
  s.connect(f); f.connect(v); v.connect(SND.sfx); s.start(w); s.stop(w + 2.1); o.start(w); o.stop(w + 2.1);
}
