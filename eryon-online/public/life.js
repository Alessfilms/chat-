// =====================================================================
// ERYON ONLINE — vida na vila: interiores, ações e som
// (carregado depois de engine.js e antes de game.js)
// =====================================================================

// ---------------------------------------------------------------- interiores
const ROOM_CACHE = {};
function rectsBlock(list, x, y) { for (const [x0, y0, x1, y1] of list) if (x > x0 && x < x1 && y > y0 && y < y1) return true; return false; }
function planks(x, w, h, y0, a, b) {
  for (let y = y0; y < h; y += 6) { px(x, ((y - y0) / 6) % 2 ? a : b, 0, y, w, 6); px(x, '#2e1d16', 0, y, w, 1);
    for (let k = 0; k < w; k += 34) px(x, '#2e1d16', (k + (y * 7) % 34), y, 1, 6); }
  for (let i = 0; i < w * h / 400; i++) px(x, '#5a3a26', Math.floor(h2(i, 3) * w), y0 + Math.floor(h2(i, 9) * (h - y0)), 2, 1);
}
function tavernRoom() {
  const w = 200, h = 140, [c, x] = canvas(w, h);
  planks(x, w, h, 26, '#7a4f2e', '#6b4630');
  px(x, '#3a2618', 0, 0, w, 26); for (let k = 0; k < w; k += 28) px(x, '#2e1d16', k, 0, 4, 26); px(x, '#6e7a84', 0, 0, w, 3); px(x, P.ink, 0, 25, w, 2);
  for (const wx of [128, 152]) { px(x, P.ink, wx, 5, 14, 12); px(x, '#ffd84a', wx + 1, 6, 12, 10); px(x, '#fff3b0', wx + 2, 7, 4, 3); px(x, P.ink, wx + 7, 6, 1, 10); }
  // prateleiras com garrafas atrás do balcão
  for (const sy of [7, 15]) { px(x, '#2e1d16', 12, sy + 6, 96, 2); for (let k = 0; k < 22; k++) { const bx = 14 + k * 4, col = ['#3c5d4a', '#a83a32', '#f2a33a', '#6e4a8a', '#3f7ab0'][(k + sy) % 5]; px(x, col, bx, sy, 2, 6); px(x, '#fff3b0', bx, sy, 1, 1); } }
  // balcão
  px(x, P.ink, 8, 28, 104, 16); px(x, '#6b4630', 9, 33, 102, 10); px(x, '#a3794b', 9, 29, 102, 4); px(x, '#c9a46a', 9, 29, 102, 1);
  for (let k = 0; k < 6; k++) { const mx = 20 + k * 15; px(x, P.ink, mx - 1, 25, 5, 5); px(x, '#c9a46a', mx, 26, 3, 3); px(x, '#fff3b0', mx, 26, 3, 1); }
  // barris
  for (const by of [52, 70]) { disc(x, 8, by, 7, P.ink); disc(x, 8, by, 6, '#7a4f2e'); px(x, '#2b3138', 2, by - 3, 13, 1); px(x, '#2b3138', 2, by + 3, 13, 1); disc(x, 8, by, 2, '#4a2f22'); }
  // lareira
  px(x, P.ink, 166, 22, 34, 40); px(x, '#6e7a84', 167, 23, 32, 38); for (let y = 24; y < 60; y += 5) px(x, '#4a535c', 167 + (y % 10), y, 30, 1);
  px(x, P.ink, 174, 36, 18, 22); px(x, '#140808', 175, 37, 16, 21);
  // tapete
  px(x, '#5a2418', 66, 76, 68, 38); px(x, '#a83a32', 68, 78, 64, 34); for (let k = 0; k < 64; k += 6) px(x, '#d0622a', 68 + k, 80, 3, 30);
  // mesas e banquinhos
  const tables = [[56, 82], [146, 82], [56, 116], [146, 116]];
  for (const [tx, ty] of tables) { for (const [sx, sy] of [[-12, 0], [12, 0], [0, 10]]) { disc(x, tx + sx, ty + sy, 3, P.ink); disc(x, tx + sx, ty + sy, 2, '#8b5e3c'); }
    disc(x, tx, ty, 9, P.ink); disc(x, tx, ty, 8, '#8b5e3c'); disc(x, tx - 2, ty - 2, 5, '#a3794b'); px(x, '#fff3b0', tx - 3, ty - 3, 2, 2); px(x, '#a83a32', tx + 2, ty, 2, 2); }
  // porta
  px(x, P.ink, 90, 132, 20, 8); px(x, '#1a1208', 92, 133, 16, 7); px(x, '#c9a46a', 88, 130, 24, 2);
  const block = [[0, 0, w, 30], [6, 26, 114, 46], [0, 44, 16, 78], [164, 20, 200, 64], [0, 0, 3, h], [197, 0, w, h], ...tables.map(([tx, ty]) => [tx - 10, ty - 7, tx + 10, ty + 6])];
  return { id: 'taverna', name: 'Taverna do Valis', w, h, img: c, spawn: { x: 100, y: 124 }, door: { x: 100, y: 133 }, fire: { x: 183, y: 56 }, block,
    spots: [{ x: 60, y: 50, rx: 52, ry: 9, kind: 'drink', label: 'Beber vinho' }], outside: B.taverna ? { x: B.taverna.x, y: B.taverna.y + 6 } : { x: 362, y: 584 } };
}
function houseRoom(id) {
  const b = B[id] || { x: 360, y: 640, telhado: 0 }, roof = ROOFS[b.telhado || 0];
  const w = 130, h = 100, [c, x] = canvas(w, h);
  planks(x, w, h, 22, '#8b5e3c', '#7a4f2e');
  px(x, '#e4d0a0', 0, 0, w, 22); px(x, '#c9a46a', 0, 18, w, 4); px(x, P.ink, 0, 21, w, 2); for (let k = 0; k < w; k += 32) px(x, '#7a4f2e', k, 0, 3, 22);
  px(x, P.ink, 54, 4, 20, 12); px(x, '#9ff3ff', 55, 5, 18, 10); px(x, '#3f7ab0', 55, 11, 18, 4); px(x, P.ink, 63, 5, 1, 10);
  // cama
  px(x, P.ink, 5, 24, 28, 30); px(x, '#7a4f2e', 6, 25, 26, 28); px(x, '#eef0ea', 8, 26, 22, 7); px(x, roof[0], 7, 34, 24, 18); px(x, roof[1], 7, 46, 24, 1);
  // mesa e cadeiras
  for (const [sx, sy] of [[-12, 0], [12, 0]]) { px(x, P.ink, 64 + sx - 3, 62 + sy - 3, 7, 7); px(x, '#a3794b', 64 + sx - 2, 62 + sy - 2, 5, 5); }
  px(x, P.ink, 54, 54, 21, 14); px(x, '#8b5e3c', 55, 55, 19, 12); px(x, '#a3794b', 55, 55, 19, 3); px(x, '#fff3b0', 60, 57, 3, 3); px(x, '#a83a32', 66, 58, 3, 2);
  // baú e planta
  px(x, P.ink, 98, 24, 24, 14); px(x, '#6b4630', 99, 25, 22, 12); px(x, '#ffd84a', 109, 29, 2, 3); px(x, '#3a2618', 99, 30, 22, 1);
  disc(x, 116, 80, 5, P.ink); disc(x, 116, 80, 4, '#6b4630'); disc(x, 116, 75, 6, '#3c5d4a'); disc(x, 114, 73, 3, '#7c9b5b');
  // tapete e porta
  px(x, roof[1], 44, 74, 42, 16); px(x, roof[0], 46, 76, 38, 12);
  px(x, P.ink, 56, 92, 18, 8); px(x, '#1a1208', 58, 93, 14, 7);
  const block = [[0, 0, w, 26], [3, 22, 35, 56], [52, 52, 77, 70], [96, 22, 124, 40], [109, 72, 123, 86], [0, 0, 3, h], [127, 0, w, h]];
  return { id, name: 'Casa', w, h, img: c, spawn: { x: 65, y: 86 }, door: { x: 65, y: 93 }, fire: null, block, spots: [], outside: { x: b.x - 1, y: b.y + 6 } };
}
function roomOf(id) { if (!ROOM_CACHE[id]) ROOM_CACHE[id] = id === 'taverna' ? tavernRoom() : houseRoom(id); return ROOM_CACHE[id]; }
function roomBlocked(id, x, y) { const r = roomOf(id); if (x < 4 || x > r.w - 4 || y < 10 || y > r.h - 3) return true; return rectsBlock(r.block, x, y); }
// portas no mapa de fora
function doorsOutside() {
  const d = [];
  if (B.taverna) d.push({ room: 'taverna', x: B.taverna.x, y: B.taverna.y + 3, label: 'Entrar na taverna' });
  for (let i = 1; i <= 9; i++) { const b = B['casa_' + i]; if (b) d.push({ room: 'casa_' + i, x: b.x - 1, y: b.y + 3, label: 'Entrar na casa' }); }
  return d;
}

// ---------------------------------------------------------------- ações
const ACT_DUR = { chop: 2.4, split: 1.8, drink: 2.2, magic: 1.6 };
function poseFor(q, t) {
  const a = q.act;
  if (a && t < a.end) {
    const u = t - a.t0;
    if (a.kind === 'chop' || a.kind === 'split') return { legs: 'stand', arm: (u % .56) < .32 ? 'up' : 'low', tool: 'axe', eyes: 0, br: 0 };
    if (a.kind === 'drink') return { legs: 'stand', arm: (u % 1.1) < .55 ? 'up' : 'fwd', tool: 'mug', eyes: 0, br: 0 };
    if (a.kind === 'magic') return { legs: 'stand', arm: 'up', tool: null, eyes: 0, br: Math.floor(u * 8) % 2 };
  }
  const f = Math.floor(t * 6 + (q.ph || 0)) % 2;
  return q.moving ? { legs: f ? 'w1' : 'w2', arm: 'down', eyes: 0, br: 0 } : { legs: 'stand', arm: 'down', eyes: 0, br: Math.floor(t * 1.3 + (q.ph || 0)) % 2 };
}
const MAGIC_COLS = [[P.cy2, '#ffffff', P.cy], ['#f6b6d8', '#ffffff', '#b06a9a'], [P.fire3, P.fire4, P.fire2], ['#9cbf62', '#e6efa0', '#ffffff']];
function drawActFx(x, q, t) {
  const a = q.act; if (!a || t > a.end + 1.2) return;
  const u = t - a.t0, fx = q.x + (q.face || 1) * 7, fy = q.y - 4;
  if (a.kind === 'chop' || a.kind === 'split') { const hit = Math.floor(u / .56); for (let k = 0; k <= hit && k < 5; k++) burst(x, t, a.t0 + k * .56 + .32, fx, fy, 8, [P.woodL, P.sand, a.kind === 'chop' ? P.f8 : P.wood], 10, .5, 18, q.ph * 31 + k); }
  if (a.kind === 'magic') { const cols = MAGIC_COLS[(q.ph || 0) % MAGIC_COLS.length]; const k = clamp(u / 1.2);
    if (u < 1.6) { x.globalAlpha = 1 - k; ring(x, q.x, q.y - 3, 4 + k * 22, cols[0]); ring(x, q.x, q.y - 3, 3 + k * 16, cols[2]); x.globalAlpha = 1; }
    burst(x, t, a.t0 + .1, q.x, q.y - 16, 40, cols, 24, 1.4, -6, q.ph * 7 + Math.floor(a.t0)); glow(x, q.x, q.y - 14, 10, cols[0], .18 * (1 - k)); }
  if (a.kind === 'drink' && u > 1.2 && u < 2.6) { const y = Math.round(q.y - 24 - (u - 1.2) * 6); x.globalAlpha = clamp(2.6 - u); px(x, P.ink, q.x + 3, y - 1, 13, 7); px(x, '#fff3b0', q.x + 4, y, 11, 5); px(x, '#a83a32', q.x + 6, y + 1, 2, 3); px(x, '#a83a32', q.x + 9, y + 1, 1, 3); px(x, '#a83a32', q.x + 11, y + 1, 2, 3); x.globalAlpha = 1; }
}

// ---------------------------------------------------------------- som (gerado no navegador, sem arquivos)
const SND = { ctx: null, master: null, music: null, sfx: null, fire: null, muted: false, noise: null, nextBeat: 0, beat: 0, note: 4 };
try { SND.muted = localStorage.getItem('eryon_mute') === '1'; } catch { }
function sndStart() {
  if (SND.ctx) { if (SND.ctx.state === 'suspended') SND.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const c = SND.ctx = new AC();
  SND.master = c.createGain(); SND.master.gain.value = SND.muted ? 0 : 1; SND.master.connect(c.destination);
  SND.music = c.createGain(); SND.music.gain.value = .05; SND.music.connect(SND.master);
  SND.sfx = c.createGain(); SND.sfx.gain.value = .35; SND.sfx.connect(SND.master);
  SND.fire = c.createGain(); SND.fire.gain.value = 0; SND.fire.connect(SND.master);
  const n = c.createBuffer(1, c.sampleRate, c.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; SND.noise = n;
  // eco para a música (sensação de salão de madeira)
  SND.echo = c.createDelay(1); SND.echo.delayTime.value = .43; const fb = c.createGain(); fb.gain.value = .35; const ef = c.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 1800;
  SND.echo.connect(ef); ef.connect(fb); fb.connect(SND.echo); ef.connect(SND.music);
  // bordão grave (D e A) com respiração lenta
  const dr = c.createGain(); dr.gain.value = .22; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.connect(dr); dr.connect(SND.music);
  for (const f of [73.42, 110, 146.83]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (Math.random() - .5) * 8; const g = c.createGain(); g.gain.value = f > 140 ? .25 : .5; o.connect(g); g.connect(lp); o.start(); }
  const lfo = c.createOscillator(); lfo.frequency.value = .07; const lg = c.createGain(); lg.gain.value = .08; lfo.connect(lg); lg.connect(dr.gain); lfo.start();
  SND.nextBeat = c.currentTime + .2; setInterval(musicTick, 100);
  crackleLoop();
}
const SCALE = [146.83, 164.81, 174.61, 196, 220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440];   // ré dórico
function pluck(f, when, gain = .3, dur = 1.8) { const c = SND.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2.01;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(gain, when + .008); g.gain.exponentialRampToValueAtTime(.0008, when + dur);
  o.connect(g); o2.connect(g); g.connect(SND.music); g.connect(SND.echo); o.start(when); o2.start(when); o.stop(when + dur + .1); o2.stop(when + dur + .1); }
function drum(when, gain) { const c = SND.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(95, when); o.frequency.exponentialRampToValueAtTime(48, when + .35);
  g.gain.setValueAtTime(gain, when); g.gain.exponentialRampToValueAtTime(.001, when + .5); o.connect(g); g.connect(SND.music); o.start(when); o.stop(when + .55); }
function musicTick() {
  const c = SND.ctx, beatLen = 60 / 66;
  while (SND.nextBeat < c.currentTime + .4) {
    const w = SND.nextBeat, b = SND.beat % 8;
    if (b === 0) drum(w, .55); if (b === 4) drum(w, .3); if (b === 6 && Math.random() < .5) drum(w + beatLen / 2, .2);
    if (Math.random() < (b % 2 ? .45 : .8)) { SND.note = clamp(SND.note + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)], 2, SCALE.length - 1); pluck(SCALE[SND.note], w, .28); if (b === 0) pluck(SCALE[Math.max(0, SND.note - 4)] / 2, w, .18, 2.6); }
    SND.nextBeat += beatLen; SND.beat++;
  }
}
function noiseHit(when, dur, freq, gain, type = 'bandpass', bus = SND.sfx) { const c = SND.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = SND.noise; s.playbackRate.value = .8 + Math.random() * .4;
  f.type = type; f.frequency.value = freq; f.Q.value = 1.2; g.gain.setValueAtTime(gain, when); g.gain.exponentialRampToValueAtTime(.001, when + dur); s.connect(f); f.connect(g); g.connect(bus); s.start(when, Math.random() * .5); s.stop(when + dur + .02); }
function crackleLoop() { if (SND.ctx && SND.fire.gain.value > .01) { const w = SND.ctx.currentTime; noiseHit(w, .015 + Math.random() * .03, 1800 + Math.random() * 2500, .5 + Math.random() * .5, 'highpass', SND.fire); if (Math.random() < .25) noiseHit(w, .2, 300, .25, 'lowpass', SND.fire); }
  setTimeout(crackleLoop, 40 + Math.random() * 220); }
const sfx = {
  step(indoor) { if (!SND.ctx) return; noiseHit(SND.ctx.currentTime, .07, indoor ? 1100 : 420, indoor ? .35 : .45, indoor ? 'bandpass' : 'lowpass'); },
  chop() { if (!SND.ctx) return; const w = SND.ctx.currentTime, o = SND.ctx.createOscillator(), g = SND.ctx.createGain(); o.frequency.setValueAtTime(180, w); o.frequency.exponentialRampToValueAtTime(70, w + .12);
    g.gain.setValueAtTime(.7, w); g.gain.exponentialRampToValueAtTime(.001, w + .18); o.connect(g); g.connect(SND.sfx); o.start(w); o.stop(w + .2); noiseHit(w, .06, 2200, .5); },
  fall() { if (!SND.ctx) return; const w = SND.ctx.currentTime; noiseHit(w, .9, 160, .9, 'lowpass'); const o = SND.ctx.createOscillator(), g = SND.ctx.createGain(); o.frequency.setValueAtTime(70, w + .5); o.frequency.exponentialRampToValueAtTime(35, w + 1.1); g.gain.setValueAtTime(.001, w); g.gain.linearRampToValueAtTime(.8, w + .55); g.gain.exponentialRampToValueAtTime(.001, w + 1.3); o.connect(g); g.connect(SND.sfx); o.start(w); o.stop(w + 1.4); },
  magic() { if (!SND.ctx) return; const w = SND.ctx.currentTime; [587.33, 739.99, 880, 1174.66, 1479.98].forEach((f, i) => { const o = SND.ctx.createOscillator(), g = SND.ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, w + i * .07); g.gain.linearRampToValueAtTime(.18, w + i * .07 + .01); g.gain.exponentialRampToValueAtTime(.001, w + i * .07 + .9); o.connect(g); g.connect(SND.sfx); g.connect(SND.echo); o.start(w + i * .07); o.stop(w + i * .07 + 1); }); },
  drink() { if (!SND.ctx) return; const w = SND.ctx.currentTime; for (const k of [0, .55, 1.1]) { const o = SND.ctx.createOscillator(), g = SND.ctx.createGain(); o.frequency.setValueAtTime(320, w + k); o.frequency.exponentialRampToValueAtTime(140, w + k + .14); g.gain.setValueAtTime(.3, w + k); g.gain.exponentialRampToValueAtTime(.001, w + k + .16); o.connect(g); g.connect(SND.sfx); o.start(w + k); o.stop(w + k + .18); } },
  door() { if (!SND.ctx) return; const w = SND.ctx.currentTime, o = SND.ctx.createOscillator(), g = SND.ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(160, w); o.frequency.linearRampToValueAtTime(260, w + .4); g.gain.setValueAtTime(.12, w); g.gain.exponentialRampToValueAtTime(.001, w + .5); o.connect(g); g.connect(SND.sfx); o.start(w); o.stop(w + .55); noiseHit(w + .45, .12, 200, .5, 'lowpass'); },
};
function setFireLevel(v) { if (SND.ctx) SND.fire.gain.setTargetAtTime(clamp(v) * .35, SND.ctx.currentTime, .3); }
function toggleMute() { SND.muted = !SND.muted; try { localStorage.setItem('eryon_mute', SND.muted ? '1' : '0'); } catch { } if (SND.master) SND.master.gain.setTargetAtTime(SND.muted ? 0 : 1, SND.ctx.currentTime, .05); return SND.muted; }
