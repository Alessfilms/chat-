// =====================================================================
// ERYON — EPISÓDIO 02: OS PRIMEIROS 576
// A narração (117,47 s) é a linha do tempo. Tempos vêm da transcrição
// palavra a palavra (faster-whisper) — ver ep2/timeline.md.
// =====================================================================
const END = 119.0; window.DURATION = END; window.OFFSET = 0;
const CUT = 99.6;                 // corte para preto depois das ruínas
let WORLD = null, CAPS = [];

// ---------------------------------------------------------------- personagens com nome
const SPECS = {
  fundador_1: { hair: '#d0622a', shirt: '#a83a32', shirtD: '#5a2418', pants: '#3c5f9a' },
  fundador_2: { hair: '#ffd84a', shirt: '#3f7ab0', shirtD: '#2c4f7a', pants: '#4a2f22' },
  heitor: { hair: '#3a2618', beard: '#3a2618', shirt: '#a83a32', shirtD: '#5a2418', plaid: true, pants: '#2c4f7a' },
  lorhan: { hair: '#5a3a26', shirt: '#d0622a', shirtD: '#8a3a1c', pants: '#4a535c', hat: 'palha' },
  maicon: { hair: '#1a1208', shirt: '#3f7ab0', shirtD: '#2c4f7a', pants: '#4a2f22', hat: 'bone', capColor: '#ffd84a' },
  pablo: { hair: '#1a1208', beard: '#1a1208', shirt: '#8b5e3c', shirtD: '#4a2f22', pants: '#2b3138', apron: '#3a2618' },
  ray: { hair: '#5a3a26', shirt: '#eef0ea', shirtD: '#98a4ac', pants: '#2c4f7a', hat: 'chef', apron: '#c4ccd0' },
  paocombiscoito: { hair: '#8b5e3c', shirt: '#eef0ea', shirtD: '#98a4ac', pants: '#3c5d4a', belt: '#4e6c4a' },
  valis: { hair: '#1a1208', shirt: '#6e4a8a', shirtD: '#3a2650', pants: '#4a2f22', apron: '#e4d0a0' },
  gerald: { big: true, hair: '#1a1208', armor: '#4a535c', rust: '#8b5e3c', pants: '#2b3138', boots: '#1a1208', skin: '#c08060', skinD: '#8b5e3c' },
  fenrir: { hair: '#98a4ac', wolfEars: true, elfEars: true, cape: '#4e6c4a', shirt: '#4a535c', shirtD: '#2b3138', pants: '#2e1d16' },
  nyx: { hair: '#e6efa0', longHair: true, elfEars: true, crown: true, shirt: '#3fd0e0', shirtD: '#2c4f7a', pants: '#1d3550', cape: '#1d3550' },
};
const CH = {}; for (const k in SPECS) CH[k] = charBuilder(SPECS[k]);
const EXTRA_PAL = [
  { hair: '#4a2f22', shirt: '#6e4a8a', shirtD: '#3a2650', pants: '#2b3138' }, { hair: '#e4d0a0', shirt: '#3c5d4a', shirtD: '#1c3831', pants: '#4a2f22' },
  { hair: '#1a1208', shirt: '#d0622a', shirtD: '#8a3a1c', pants: '#2c4f7a' }, { hair: '#8b5e3c', shirt: '#e4d0a0', shirtD: '#a3794b', pants: '#4a535c' },
  { hair: '#c4ccd0', shirt: '#2c4f7a', shirtD: '#1d3550', pants: '#4a2f22' }, { hair: '#a83a32', shirt: '#9cbf62', shirtD: '#4e6c4a', pants: '#2e1d16' },
  { hair: '#5a3a26', shirt: '#a3794b', shirtD: '#6b4630', pants: '#3c5d4a' }, { hair: '#1a1208', shirt: '#b06a9a', shirtD: '#6e4a8a', pants: '#2b3138', longHair: true },
  { hair: '#d0622a', shirt: '#4a535c', shirtD: '#2b3138', pants: '#6b4630' }, { hair: '#ffd84a', shirt: '#a83a32', shirtD: '#5a2418', pants: '#1d3550', longHair: true },
];
const EXTRA_CH = EXTRA_PAL.map(charBuilder);

// ---------------------------------------------------------------- mapa da vila
const VR = 214;                                  // raio da área da vila
const PAL = { r: 212, gate: { x: 482, y: 475 } };
const GATE_A = Math.atan2((PAL.gate.y - C.y) / .95, PAL.gate.x - C.x), SOUTH_A = Math.atan2(1, 0);
const B = {};                                    // construções (lidas do mundo)
const HOUSES = [];
const [village, vgx] = canvas(WW, WH);           // chão da vila pré-desenhado
const roadPts = [];
function road(pts) { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], d = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s < d; s += 2) roadPts.push([a[0] + (b[0] - a[0]) * s / d, a[1] + (b[1] - a[1]) * s / d]); } }
function buildVillageGround() {
  vgx.drawImage(ground, 0, 0);
  vgx.save(); vgx.beginPath(); vgx.ellipse(C.x, C.y, VR, VR * .95, 0, 0, 6.283); vgx.clip(); vgx.drawImage(clearTex, 0, 0); vgx.restore();
  road([[360, 622], [400, 566], [440, 520], [PAL.gate.x, PAL.gate.y], [496, 452]]);              // nordeste até o portão
  road([[340, 642], [270, 640], [208, 624], [170, 630]]);                                         // oeste: serraria
  road([[380, 644], [440, 664], [480, 690], [530, 712]]);                                         // leste: forja e armazém
  road([[362, 664], [362, 720], [pathS(780), 780], [pathS(860), 860]]);                          // sul
  road([[352, 650], [310, 700], [300, 790]]); road([[372, 652], [420, 700], [420, 786]]);
  road([[350, 628], [306, 560], [306, 522]]);
  for (const [X, Y] of roadPts) px(vgx, P.dirt2, Math.round(X) - 3, Math.round(Y) - 2, 7, 5);
  for (const [X, Y] of roadPts) if (h2(Math.round(X), Math.round(Y)) > .8) px(vgx, P.sand, Math.round(X) - 1, Math.round(Y), 2, 1);
  // praça de terra ao redor da fogueira
  disc(vgx, C.x, C.y, 24, P.dirt2); disc(vgx, C.x, C.y, 18, P.dirt1);
  for (let i = 0; i < 160; i++) { const a = h2(i, 3) * 6.283, r = h2(i, 7) * 22; px(vgx, h2(i, 9) > .5 ? P.dirt3 : P.dirt0, Math.round(C.x + Math.cos(a) * r), Math.round(C.y + Math.sin(a) * r * .9)); }
}
// tocos das árvores derrubadas
const CUT_TREES = dynTrees.filter(t => t.dc < VR + 4).map(t => ({ ...t, gone: 8.9 + (t.dc - 74) / (VR - 74) * 1.4 + h2(t.x, t.y) * .2 }));
const EXP_LINE = [[474, 498], [482, 476], [492, 456], [502, 438], [508, 425], [514, 414], [522, 404]];
function nearPath(X, Y, r) { for (let i = 0; i < EXP_LINE.length - 1; i++) { const [ax, ay] = EXP_LINE[i], [bx, by] = EXP_LINE[i + 1], dx = bx - ax, dy = by - ay, k = clamp(((X - ax) * dx + (Y - ay) * dy) / (dx * dx + dy * dy)); if (Math.hypot(X - ax - dx * k, Y - ay - dy * k) < r) return true; } return false; }
const KEEP_TREES = dynTrees.filter(t => t.dc >= VR + 4 && !nearPath(t.x, t.y + 6, 15));
const [ep2Static, esx] = canvas(WW, WH);
for (const t of trees) if (!t.dyn && !nearPath(t.x, t.y + 6, 15)) { const sp = treeSprites[t.s]; esx.drawImage(sp.c, t.x - sp.ax, t.y - sp.ay); }

// ---------------------------------------------------------------- figurantes (sem @ inventado)
const EXTRAS = [];
{
  const r2 = rng(77), entries = [[[410, 330], [400, 470], [380, 540]], [[pathS(980), 980], [pathS(860), 860], [362, 740]], [[120, 640], [208, 624], [270, 640]], [[600, 700], [530, 712], [460, 680]], [[540, 380], [PAL.gate.x, PAL.gate.y], [440, 520]]];
  const blocked = [[300, 600, 22], [418, 604, 22], [362, 572, 30], [484, 670, 24], [300, 712, 22], [428, 718, 22], [236, 652, 18], [252, 580, 18], [306, 522, 18], [452, 606, 18], [522, 642, 18], [420, 786, 18], [300, 792, 18], [230, 750, 34], [500, 752, 30], [532, 704, 20], [360, 640, 30], [190, 612, 22], [252, 500, 16]];
  for (let i = 0; i < 40; i++) {
    let hx, hy, tries = 0;
    do { const a = r2() * 6.283, rad = 40 + r2() * 150; hx = Math.round(C.x + Math.cos(a) * rad); hy = Math.round(C.y + Math.sin(a) * rad * .9); tries++; }
    while (tries < 80 && blocked.some(([bx, by, br]) => Math.hypot(hx - bx, hy - by) < br));
    const ent = entries[i % entries.length], t0 = 10.7 + (i * .37) % 3.2, sp = 22 + r2() * 8;
    const pts = [...ent, [hx, hy]]; const keys = [[t0, pts[0][0], pts[0][1]]]; let tt = t0;
    for (let k = 1; k < pts.length; k++) { tt += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]) / sp; keys.push([tt, pts[k][0], pts[k][1]]); }
    EXTRAS.push({ ch: EXTRA_CH[i % EXTRA_CH.length], keys, arrive: tt, hx, hy, kind: ['chat', 'carry', 'idle', 'wander', 'farm'][i % 5], ph: r2() * 6, i });
  }
}
// trabalhadores que entram na taverna
const TAVERN_GOERS = [0, 1, 2].map(i => ({ ch: EXTRA_CH[(i * 3 + 2) % EXTRA_CH.length], keys: [[50.6 + i * .35, 330 + i * 30, 610], [51.9 + i * .35, 362, 584]] }));

// ---------------------------------------------------------------- câmera [t, x, y, zoom]
const SHOT_A = [
  [0, 360, 646, 2.4], [6.6, 360, 646, 2.9], [7.3, 360, 646, 2.8], [9.8, 360, 640, 1.5], [10.9, 360, 640, 1.12], [13.6, 360, 632, 1.05],
  [14.8, 360, 640, 1.3], [20.9, 360, 640, 1.6],
  [21.9, 205, 614, 2.6], [22.6, 192, 608, 3.7], [24.9, 190, 608, 3.6],
  [25.9, 302, 600, 3.2], [31.0, 302, 598, 3.4],
  [31.9, 468, 672, 2.6], [32.6, 474, 678, 3.6], [37.5, 476, 678, 3.7],
  [38.4, 302, 716, 2.8], [39.0, 300, 722, 3.7], [40.9, 300, 722, 3.8],
  [41.4, 422, 724, 2.8], [42.0, 426, 730, 3.7], [44.8, 426, 730, 3.7],
  [45.8, 365, 586, 2.4], [46.7, 364, 580, 3.0], [52.1, 366, 584, 3.3],
  [52.9, 410, 570, 1.6], [55.0, 440, 534, 1.7],
  [56.2, 468, 504, 2.4], [57.2, 470, 496, 3.6], [63.8, 470, 492, 3.9],
  [64.9, 548, 568, 2.6], [65.7, 550, 566, 3.7], [70.3, 550, 566, 3.9],
  [71.6, 266, 512, 2.7], [72.4, 264, 506, 3.7], [77.0, 268, 504, 3.9],
  [78.3, 474, 500, 2.4], [83.0, 496, 452, 2.6], [87.1, 512, 422, 2.8],
  [88.7, 520, 404, 2.3], [90.4, 522, 400, 2.5], [92.0, 526, 398, 2.8], [95.4, 528, 396, 3.6], [99.6, 528, 396, 3.8],
];
const SHOT_B = [
  [99.6, 360, 640, 1.25], [102.7, 362, 630, 1.35], [103.6, 360, 646, 2.9], [104.9, 360, 646, 3.1], [105.9, 360, 646, 2.6],
  [108.5, 360, 630, 1.05], [112.6, 360, 630, 1.08], [113.5, 360, 650, 1.6], [117.2, 360, 658, 2.9], [119, 360, 658, 3.0],
];
const keyN = (keys, t) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) if (t < keys[i + 1][0]) return lerp(keys[i][1], keys[i + 1][1], sstep(keys[i][0], keys[i + 1][0], t)); return keys[keys.length - 1][1]; };
const DARK = [[0, .42], [7.3, .42], [8.3, .72], [9.3, .72], [10.4, .07], [78, .07], [80, .2], [84, .44], [88, .55], [99.6, .58], [99.61, .08], [102.7, .14], [103.6, .36], [119, .42]];

// ---------------------------------------------------------------- utilidades de cena
const built = (t0, t1, t) => seg(t, t0, t1);
function revealSprite(x, spr, X, Y, k) { if (k <= 0) return; const hh = Math.max(1, Math.round(spr.height * k / 2) * 2); x.drawImage(spr, 0, spr.height - hh, spr.width, hh, X, Y + spr.height - hh, spr.width, hh); }
// casa em 3 fases: estrutura de madeira -> paredes -> telhado
function stagedHouse(x, spr, X, Y, t0, t1, t) {
  const k = seg(t, t0, t1); if (k <= 0) return;
  if (k < .35) { revealSprite(x, FRAME_SPR, X, Y, k / .35); return; }
  const w = Math.min(1, (k - .35) / .45);              // paredes sobem
  const hh = Math.round((spr.height - 13) * w);
  x.drawImage(FRAME_SPR, X, Y);
  if (hh > 0) x.drawImage(spr, 0, spr.height - hh, spr.width, hh, X, Y + spr.height - hh, spr.width, hh);
  if (k > .8) { const r = Math.round(13 * (k - .8) / .2); x.drawImage(spr, 0, 13 - r, spr.width, r, X, Y + 13 - r, spr.width, r); }
}
function talkDots(x, X, Y, t, ph) { if (Math.sin(t * 2.2 + ph) < 0) return; const n = 1 + Math.floor((t * 3 + ph) % 3); px(x, P.ink, X - 5, Y - 6, 11, 5); px(x, '#eef0ea', X - 4, Y - 5, 9, 3); for (let i = 0; i < n; i++) px(x, P.ink, X - 3 + i * 3, Y - 4); }
const idlePose = (t, ph) => ({ legs: 'stand', arm: 'down', eyes: Math.sin(t * .7 + ph) > .6 ? 1 : Math.sin(t * .7 + ph) < -.6 ? -1 : 0, br: Math.floor(t * 1.4 + ph) % 2 });
const walkPose = (t, ph, run) => ({ legs: Math.floor(t * (run ? 10 : 6) + ph) % 2 ? (run ? 'r1' : 'w1') : (run ? 'r2' : 'w2'), arm: 'down', eyes: 0, br: 0 });

// ---------------------------------------------------------------- render
const out = document.getElementById('c'), octx = out.getContext('2d'); octx.imageSmoothingEnabled = false;
const [view, vx] = canvas(VW + 4, VH + 4), [light, lx] = canvas(VW + 4, VH + 4), [fog, fx] = canvas(VW + 4, VH + 4);
const checker = (() => { const [c, x] = canvas(2, 2); px(x, '#000', 0, 0); px(x, '#000', 1, 1); return c; })();
const fogPat = (() => { const [c, x] = canvas(4, 4); [[0, 0], [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [1, 3], [3, 3]].forEach(([a, b]) => px(x, '#8fa0b0', a, b)); return c; })();
const LBL = [];       // etiquetas visíveis neste quadro

function render(t) {
  const inB = t >= CUT;
  const shot = inB ? SHOT_B : SHOT_A;
  const z = Math.max(1.02, hermite(shot, t, 3));
  let cxw = hermite(shot, t, 1) + Math.sin(t * .6) * .5, cyw = hermite(shot, t, 2) + Math.sin(t * .45 + 1) * .4;
  const w = VW / z, h = VH / z;
  cxw = clamp(cxw, w / 2, WW - w / 2); cyw = clamp(cyw, h / 2, WH - h / 2);
  const L = cxw - w / 2, Tp = cyw - h / 2, li = Math.floor(L), ti = Math.floor(Tp), cw = Math.ceil(w) + 2, ch = Math.ceil(h) + 2;
  const vis = (X, Y, m = 40) => X > li - m && X < li + cw + m && Y > ti - m && Y < ti + ch + m * 1.5;
  LBL.length = 0;
  const x = vx; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, view.width, view.height);
  // ---- chão: clareira original -> vila
  const grow = sstep(8.8, 10.4, t);
  x.drawImage(ground, li, ti, cw, ch, 0, 0, cw, ch);
  x.translate(-li, -ti);
  if (grow > 0) { x.save(); x.beginPath(); x.ellipse(C.x, C.y, 64 + grow * (VR - 64), (64 + grow * (VR - 64)) * .95, 0, 0, 6.283); x.clip(); x.drawImage(village, 0, 0); x.restore(); }
  // estradas aparecem 10.6–12.5 (o chão da vila já as contém; antes disso cobre com grama)
  if (grow > 0 && t < 12.6) { const k = sstep(10.4, 12.5, t); x.save(); x.beginPath(); x.ellipse(C.x, C.y, 30 + k * 220, (30 + k * 220) * .95, 0, 0, 6.283); x.rect(WW, 0, -WW, WH); x.clip('evenodd');
    x.beginPath(); x.ellipse(C.x, C.y, 64 + grow * (VR - 64), (64 + grow * (VR - 64)) * .95, 0, 0, 6.283); x.clip(); x.drawImage(clearTex, 0, 0); x.restore(); }
  // plantações
  for (const f of [B.plantacao_1, B.plantacao_2]) { if (!f) continue; const k = sstep(36.2, 37.6, t) + (inB ? 1 : 0); if (k <= 0) continue;
    const rows = Math.floor(f.h / 4); px(x, P.dirt1, f.x - f.w / 2, f.y - f.h / 2, f.w, f.h);
    for (let r = 0; r < rows; r++) { const yy = f.y - f.h / 2 + 2 + r * 4; for (let c = 0; c < f.w - 2; c += 3) { const hgt = Math.min(1, k * 1.4 - c / f.w * .4); if (hgt <= 0) continue; px(x, (r + c) % 7 === 0 ? P.fire3 : P.f8, f.x - f.w / 2 + 1 + c, yy - Math.round(hgt * 2), 1, 1 + Math.round(hgt * 2)); } }
    for (let c = 0; c <= f.w; c += 4) px(x, P.woodL, f.x - f.w / 2 + c, f.y - f.h / 2 - 2, 1, 3); }
  drawRuins(x, t);
  // ---- objetos ordenados por profundidade
  const objs = [], O = (y, d) => objs.push({ y, d });
  const treeOn = tr => vis(tr.x, tr.y);
  for (const tr of KEEP_TREES) if (treeOn(tr)) O(tr.y, () => { const sp = treeSprites[tr.s]; x.drawImage(sp.c, tr.x - sp.ax, tr.y - sp.ay); });
  for (const tr of CUT_TREES) { if (!treeOn(tr)) continue;
    if (t < tr.gone + .25) O(tr.y, () => { const sp = treeSprites[tr.s], k = t > tr.gone ? 1 - seg(t, tr.gone, tr.gone + .25) : 1, hh = Math.max(1, Math.round(sp.c.height * k)); x.drawImage(sp.c, 0, sp.c.height - hh, sp.c.width, hh, tr.x - sp.ax, tr.y - sp.ay + sp.c.height - hh, sp.c.width, hh); });
    else if (h2(tr.x, tr.y) > .86 && tr.dc > 120) O(tr.y - 4, () => { px(x, P.ink, tr.x - 2, tr.y - 3, 5, 4); px(x, P.woodD, tr.x - 1, tr.y - 2, 3, 2); px(x, P.wood, tr.x - 1, tr.y - 2, 3, 1); }); }
  // fogueira, banco e caixotes do Ep. 1
  O(628, () => { px(x, P.ink, 349, 622, 23, 6); px(x, P.woodD, 350, 623, 21, 4); px(x, P.wood, 350, 623, 21, 1); px(x, P.sand, 351, 624, 2, 2); });
  O(652, () => { px(x, P.ink, 322, 643, 8, 8); px(x, P.sand, 323, 644, 6, 6); px(x, P.dirt3, 323, 647, 6, 1); });
  O(646, () => { px(x, P.ink, 392, 639, 8, 8); px(x, P.sand, 393, 640, 6, 6); px(x, P.dirt3, 396, 640, 1, 6); });
  O(640, () => drawFire(x, C.x, C.y + 1, t, 1 + .25 * pulse(t, 6.0, 6.3, 7.2)));
  // fundadores
  O(FOUNDER_A.y, () => drawCharAt(x, CH.fundador_1, FOUNDER_A.x, FOUNDER_A.y, { legs: 'sit', arm: 'down', eyes: Math.sin(t * .5) > .5 ? 1 : 0, br: Math.floor(t * 1.2) % 2 }, 1));
  O(FOUNDER_B.y, () => drawCharAt(x, CH.fundador_2, FOUNDER_B.x, FOUNDER_B.y, { ...idlePose(t, 1.3), arm: (inB && t > 104.0 && t < 105.6) ? 'wave' : 'down' }, -1));
  if (inB || t > 103) label(FOUNDER_A.x, FOUNDER_A.y - 15, 'fundador_1', 'Morador 1', 'fundador', t, [[103.6, 105.6]], [], z);
  label(FOUNDER_A.x, FOUNDER_A.y - 15, 'fundador_1b', 'Morador 1', 'fundador', t, [[4.8, 7.2]], [], z);
  label(FOUNDER_B.x, FOUNDER_B.y - 15, 'fundador_2', 'Morador 2', 'fundador', t, [[4.8, 7.2], [103.6, 105.6]], [], z);
  // construções
  if (t > 28.2) O(B.casa_1.y, () => stagedHouse(x, HOUSE_SPR[0], B.casa_1.x - 15, B.casa_1.y - 26, 28.2, 31.0, t));
  if (t > 29.0) O(B.casa_2.y, () => stagedHouse(x, HOUSE_SPR[1], B.casa_2.x - 15, B.casa_2.y - 26, 29.0, 31.6, t));
  const genT = { casa_3: 33.2, casa_4: 36.0, casa_5: 39.6, casa_6: 42.4, casa_7: 45.0, casa_8: 47.5, casa_9: 49.5 };
  for (const id in genT) { const b = B[id]; if (b && t > genT[id] && vis(b.x, b.y)) O(b.y, () => stagedHouse(x, HOUSE_SPR[b.telhado], b.x - 15, b.y - 26, genT[id], genT[id] + 1.6, t)); }
  if (t > 32.4) O(B.forja.y, () => { revealSprite(x, FORGE_SPR, B.forja.x - 18, B.forja.y - 28, built(32.4, 33.3, t));
    if (t > 33.3) { const fl = .6 + .4 * h2(Math.floor(t * 10), 2); x.globalAlpha = fl; px(x, P.fire1, B.forja.x - 7, B.forja.y - 10, 12, 8); px(x, P.fire3, B.forja.x - 5, B.forja.y - 8, 8, 5); px(x, P.fire4, B.forja.x - 3, B.forja.y - 6, 4, 2); x.globalAlpha = 1; smoke(x, B.forja.x + 11, B.forja.y - 30, t, 6); } });
  if (t > 32.6) O(B.forja.y + 8, () => { const X = B.forja.x - 18, Y = B.forja.y + 8; px(x, P.ink, X - 4, Y - 6, 9, 4); px(x, P.st2, X - 3, Y - 5, 7, 2); px(x, P.ink, X - 1, Y - 3, 3, 4); px(x, P.st1, X, Y - 3, 1, 3);
    if (t > 33.0) { const hot = .5 + .5 * Math.sin(t * 6); px(x, hot > .5 ? P.fire3 : P.fire2, X - 1, Y - 6, 3, 1); } });
  if (t > 35.7) O(B.forja.y + 4, () => { const X = B.forja.x + 20, Y = B.forja.y + 6; px(x, P.ink, X - 1, Y - 12, 14, 13); px(x, P.wood, X, Y - 11, 12, 11); px(x, P.woodD, X, Y - 7, 12, 1);
    [['axe', 0], ['hammer', 4], ['sword', 8]].forEach(([n, o], i) => { if (t < 35.8 + i * .3) return; px(x, '#c4ccd0', X + 1 + o, Y - 10, 2, 2); px(x, P.wood, X + 2 + o, Y - 8, 1, 7); }); });
  if (t > 38.5) O(B.cozinha.y, () => { revealSprite(x, KITCHEN_SPR, B.cozinha.x - 20, B.cozinha.y - 26, built(38.5, 39.2, t)); });
  if (t > 38.9) O(B.cozinha.y + 8, () => { const X = B.cozinha.x + 6, Y = B.cozinha.y + 8; smallFire(x, X, Y + 1, t); px(x, P.ink, X - 5, Y - 7, 11, 7); px(x, P.st1, X - 4, Y - 6, 9, 5); px(x, '#a83a32', X - 4, Y - 6, 9, 2); px(x, P.fire2, X - 3, Y - 6, 2, 1); smoke(x, X, Y - 9, t * 1.6, 4, '#eef0ea'); });
  if (t > 41.4) O(B.enfermaria.y, () => revealSprite(x, TENT_SPR, B.enfermaria.x - 17, B.enfermaria.y - 24, built(41.4, 42.2, t)));
  if (t > 41.9) O(B.enfermaria.y + 16, () => { const X = B.enfermaria.x + 12, Y = B.enfermaria.y + 16; px(x, P.ink, X - 7, Y - 4, 15, 5); px(x, P.woodL, X - 6, Y - 3, 13, 2); px(x, '#eef0ea', X - 6, Y - 4, 13, 1);
    if (t < 44.6) { px(x, P.ink, X - 6, Y - 7, 5, 4); px(x, P.skin, X - 5, Y - 6, 3, 2); px(x, '#3c5f9a', X - 1, Y - 6, 7, 3); } });
  if (t > 44.6) O(B.enfermaria.y + 14, () => drawCharAt(x, EXTRA_CH[4], B.enfermaria.x + 8, B.enfermaria.y + 14, { legs: 'sit', arm: t > 45 && t < 46 ? 'wave' : 'down', eyes: -1, br: Math.floor(t * 2) % 2 }, -1));
  if (t > 44.0) O(B.armazem.y, () => revealSprite(x, SHED_SPR, B.armazem.x - 13, B.armazem.y - 22, built(44.0, 44.8, t)));
  if (t > 46.4) O(B.taverna.y, () => revealSprite(x, TAVERN_SPR[t > 50.36 ? 1 : 0], B.taverna.x - 24, B.taverna.y - 36, built(46.4, 48.0, t)));
  if (t > 46.4 && !inB) O(B.taverna.y + 2, () => burst(x, t, 48.0, B.taverna.x, B.taverna.y - 4, 30, [P.st3, P.st4, P.wallD], 26, 1, 8, 5));
  // paliçada e portão
  const palK = inB ? 1 : sstep(52.9, 55.6, t);
  if (palK > 0) {
    const n = 150;
    for (let i = 0; i < n; i++) { const a = -Math.PI + i / n * 6.283, da = Math.atan2(Math.sin(a - GATE_A), Math.cos(a - GATE_A)), ds = Math.atan2(Math.sin(a - SOUTH_A), Math.cos(a - SOUTH_A));
      if (Math.abs(da) < .07 || Math.abs(ds) < .05) continue; const ord = (i / n + .25) % 1; if (ord > palK) continue;
      const X = Math.round(C.x + Math.cos(a) * PAL.r), Y = Math.round(C.y + Math.sin(a) * PAL.r * .95); if (!vis(X, Y)) continue;
      O(Y, () => { px(x, P.ink, X - 1, Y - 8, 4, 9); px(x, P.wood, X, Y - 7, 2, 7); px(x, P.woodL, X, Y - 8, 1, 1); }); }
    if (palK > .6) for (const s of [-1, 1]) { const a = GATE_A + s * .085, X = Math.round(C.x + Math.cos(a) * PAL.r), Y = Math.round(C.y + Math.sin(a) * PAL.r * .95);
      O(Y + 1, () => { px(x, P.ink, X - 4, Y - 18, 9, 19); px(x, P.wood, X - 3, Y - 17, 7, 17); px(x, P.woodD, X - 3, Y - 12, 7, 1); px(x, P.ink, X - 5, Y - 20, 11, 3); px(x, '#a83a32', X - 4, Y - 19, 9, 1); px(x, P.fire3, X, Y - 15, 1, 2); }); }
  }
  // pedra estelar de Nyx
  if (B.pedra_estelar) O(B.pedra_estelar.y, () => { const X = B.pedra_estelar.x, Y = B.pedra_estelar.y; px(x, P.ink, X - 4, Y - 16, 9, 17); px(x, P.st2, X - 3, Y - 15, 7, 15); px(x, P.st3, X - 3, Y - 15, 2, 15);
    const on = t > 71.6 && t < 78.5 ? .6 + .4 * Math.sin(t * 3) : .25; x.globalAlpha = on; px(x, P.cy2, X - 1, Y - 12, 3, 1); px(x, P.cy2, X, Y - 13, 1, 3); px(x, P.cy2, X - 1, Y - 6, 3, 1); x.globalAlpha = 1; });

  // ---- figurantes
  for (const e of EXTRAS) {
    if (t < e.keys[0][0] || (t >= 78 && t < CUT && !vis(e.hx, e.hy))) continue;
    const tr = track(e.keys, t); if (!tr || !vis(tr.x, tr.y)) continue;
    O(tr.y, () => {
      if (tr.moving) return drawCharAt(x, e.ch, tr.x, tr.y, walkPose(t, e.ph), tr.face || 1);
      const k = e.kind, ph = e.ph;
      if (k === 'chat') { const face = e.i % 2 ? -1 : 1; drawCharAt(x, e.ch, e.hx, e.hy, { ...idlePose(t, ph), eyes: 0 }, face); if (e.i % 4 < 2) talkDots(x, e.hx, e.hy - 16, t, ph); return; }
      if (k === 'carry') { const per = 6, u = ((t - e.arrive + ph) % per) / per, go = u < .5, kk = go ? u * 2 : (1 - u) * 2, X = e.hx + Math.round(kk * 36), mv = Math.abs(Math.sin(u * 6.283)) > .05;
        return drawCharAt(x, e.ch, X, e.hy, { ...walkPose(t, ph), arm: go ? 'carry' : 'down', tool: go ? 'box' : null }, go ? 1 : -1); }
      if (k === 'wander') { const a = (t - e.arrive) * .6 + ph, X = e.hx + Math.cos(a) * 10, Y = e.hy + Math.sin(a) * 6; return drawCharAt(x, e.ch, X, Y, walkPose(t, ph), Math.sin(a) > 0 ? -1 : 1); }
      if (k === 'farm' && t > 36.4) { const f = e.i % 2 ? B.plantacao_1 : B.plantacao_2; const X = f.x - f.w / 2 + 8 + (e.i * 7) % (f.w - 12), Y = f.y + f.h / 2 + 2; const up = Math.floor(t * 2.2 + ph) % 2;
        return drawCharAt(x, e.ch, X, Y, { legs: 'stand', arm: up ? 'up' : 'low', tool: 'hoe', eyes: 0, br: 0 }, 1); }
      drawCharAt(x, e.ch, e.hx, e.hy, idlePose(t, ph), Math.sin(t * .3 + ph) > 0 ? 1 : -1);
    });
  }
  for (const g of TAVERN_GOERS) if (t > g.keys[0][0] && t < g.keys[1][0] + .1 && !inB) { const tr = track(g.keys, t); O(tr.y, () => drawCharAt(x, g.ch, tr.x, tr.y, walkPose(t, 1), tr.face || 1)); }

  // ---- personagens com @
  if (!inB) storyChars(x, t, O, vis, z);
  else epilogueChars(x, t, O, vis, z);
  objs.sort((a, b) => a.y - b.y).forEach(o => o.d());
  x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(ep2Static, li, ti, cw, ch, 0, 0, cw, ch); x.translate(-li, -ti);

  // ---- efeitos por cima
  if (t > 8.9 && t < 11) for (const tr of CUT_TREES) if (treeOn(tr)) burst(x, t, tr.gone, tr.x, tr.y - 12, 8, [P.f6, P.f8, P.f9], 14, .7, 18, tr.x * 13 + tr.y);
  for (const id in genT) { const b = B[id]; if (b) burst(x, t, genT[id] + 1.6, b.x, b.y - 2, 22, [P.st3, P.st4, P.wallD], 22, .9, 10, b.x * 7); }
  burst(x, t, 32.4, B.forja.x, B.forja.y - 6, 26, [P.st3, P.st4], 24, .9, 10, 31);
  if (t > 18.4 && t < 21.4 && !inB) storyIcons(x, t);

  // ---- luz
  const dark = keyN(DARK, t), l = lx; l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, light.width, light.height);
  const forest = inB ? 0 : sstep(80, 86, t);
  l.fillStyle = `rgba(${6 - forest * 2},${14 + forest * 4},${22 + forest * 10},${dark})`; l.fillRect(0, 0, light.width, light.height);
  l.translate(-li, -ti); l.globalCompositeOperation = 'destination-out';
  const fr = Math.round(46 + Math.sin(t * 9) + h2(Math.floor(t * 8), 1) * 2);
  lightHole(l, C.x, C.y, fr);
  if (t > 33.3) lightHole(l, B.forja.x - 2, B.forja.y - 8, 26);
  if (t > 51.2) lightHole(l, B.taverna.x, B.taverna.y - 10, 30);
  for (const id of ['casa_1', 'casa_2', 'casa_3', 'casa_4', 'casa_5', 'casa_6', 'casa_7', 'casa_8', 'casa_9']) if (B[id] && t > 40) lightHole(l, B[id].x, B[id].y - 8, 14);
  if (!inB && t > 78.3) { const g = explorerCenter(t); lightHole(l, g.x, g.y - 6, 30); }
  if (!inB && t > 92) lightHole(l, 528, 394, Math.round(14 + 10 * sstep(94, 95, t)));
  if (inB && t > 113.8) lightHole(l, SEAT.x, SEAT.y - 4, Math.round(16 * sstep(113.8, 114.6, t)));
  l.globalCompositeOperation = 'source-over';
  x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(light, 0, 0); x.translate(-li, -ti);
  glow(x, C.x, C.y - 3, Math.round(fr * .55), P.fire2, .07 * (dark / .42));
  if (t > 33.3) glow(x, B.forja.x - 2, B.forja.y - 8, 12, P.fire2, .12);
  if (!inB) storyGlows(x, t);
  if (inB && t > 113.8) { const k = sstep(113.8, 114.6, t); glow(x, SEAT.x, SEAT.y - 2, 8, P.fire3, .12 * k); if (k > .5) ring(x, SEAT.x, SEAT.y, 7 + Math.round(Math.sin(t * 3)), P.fire3); }
  // névoa na floresta durante a expedição
  if (!inB && t > 80) { const k = sstep(80, 87, t) * .22; x.fillStyle = x.createPattern(fogPat, 'repeat');
    for (let i = 0; i < 16; i++) { const fy = 370 + (i * 37) % 170 + Math.sin(t * .3 + i) * 3, fxp = 430 + ((t * 5 + i * 53) % 190), r = 8 + (i * 7) % 14; x.globalAlpha = k * (.6 + .4 * Math.sin(i * 2.3 + t * .4)); x.beginPath(); x.ellipse(fxp, fy, r * 1.8, r * .45, 0, 0, 6.283); x.fill(); } x.globalAlpha = 1; }

  // ---- território inexplorado
  const f = fx; f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, fog.width, fog.height);
  f.fillStyle = '#060b0a'; f.fillRect(0, 0, fog.width, fog.height); f.translate(-li, -ti); f.globalCompositeOperation = 'destination-out';
  const holes = [[C.x, C.y, 245 + grow * 55]];
  if (t > 78.3 || inB) holes.push([528, 400, 70 * (inB ? 1 : sstep(83.5, 89, t))]);
  if (!inB && t > 78.3) { const g = explorerCenter(t); holes.push([g.x, g.y, 46]); }
  const pat = f.createPattern(checker, 'repeat');
  for (const [hx, hy, hr] of holes) if (hr > 1) { f.fillStyle = pat; f.beginPath(); f.arc(hx, hy, hr + 10, 0, 6.283); f.fill(); f.fillStyle = '#000'; f.beginPath(); f.arc(hx, hy, hr, 0, 6.283); f.fill(); }
  f.globalCompositeOperation = 'source-over';
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = .96; x.drawImage(fog, 0, 0); x.globalAlpha = 1;

  // ---- saída
  const s = OUT * z;
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.fillStyle = '#000'; octx.fillRect(0, 0, 1080, 1920);
  octx.drawImage(view, 0, 0, cw, ch, Math.round(-(L - li) * s), Math.round(-(Tp - ti) * s), Math.round(cw * s), Math.round(ch * s));
  const tl = sstep(7.4, 8.2, t) * (1 - sstep(9.6, 10.6, t));          // lapso de tempo: sol cruzando
  if (tl > 0) { octx.globalAlpha = tl * .35; octx.fillStyle = '#ffd84a'; const sx = ((t - 7.4) / 3.2) * 1400 - 200; octx.fillRect(Math.round(sx / 12) * 12, 0, 240, 1920); octx.globalAlpha = 1; }
  const dip = Math.max(sstep(99.0, 99.55, t) * (1 - sstep(CUT, 100.4, t)), sstep(118.0, 118.9, t));
  if (dip > 0) { octx.fillStyle = `rgba(0,0,0,${dip})`; octx.fillRect(0, 0, 1080, 1920); }
  overlay(t, inB, L, Tp, s, z);
}
const pulse = (t, a, b, c) => sstep(a, b, t) * (1 - sstep(b, c, t));

// ---------------------------------------------------------------- personagens da história
function chop(t, t0) { const u = ((t - t0) % .56) / .56; return u < .55 ? 'up' : 'low'; }
function storyChars(x, t, O, vis, z) {
  // Heitor — lenhador
  const H = { x: 190, y: 612 };
  const treeFall = 24.35;
  O(606, () => { const sp = treeSprites[3]; if (t < treeFall) x.drawImage(sp.c, 176 - sp.ax, 604 - sp.ay);
    else { const k = seg(t, treeFall, treeFall + .35); if (k < 1) { const hh = Math.round(sp.c.height * (1 - k)); x.drawImage(sp.c, 0, 0, sp.c.width, Math.max(1, hh), 176 - sp.ax, 604 - sp.ay + (sp.c.height - hh), sp.c.width, Math.max(1, hh)); }
      if (t < 25.6) { px(x, P.ink, 156, 600, 22, 6); px(x, P.wood, 157, 601, 20, 4); px(x, P.woodL, 157, 601, 2, 4); } px(x, P.ink, 174, 600, 5, 5); px(x, P.woodL, 175, 601, 3, 3); } });
  O(622, () => { const X = 208, Y = 620, n = t < 22 ? 2 : t < 26 ? 4 : 6; for (let i = 0; i < n; i++) { const r = i % 3, c = Math.floor(i / 3); px(x, P.ink, X - 6 + r * 4 - c * 2, Y - 6 - c * 3, 5, 5); px(x, P.wood, X - 5 + r * 4 - c * 2, Y - 5 - c * 3, 3, 3); px(x, P.woodL, X - 5 + r * 4 - c * 2, Y - 5 - c * 3, 1, 1); } });
  let hp, hpose, hface = -1;
  if (t < 21.0) { const tr = track([[11.2, 110, 640], [14.4, 196, 618], [15.2, H.x, H.y]], t); hp = tr; hpose = tr.moving ? walkPose(t, 2) : idlePose(t, 2); hface = tr.moving ? tr.face : -1; }
  else if (t < treeFall + .1) { hp = H; hpose = { legs: 'stand', arm: chop(t, 21.0), tool: 'axe', eyes: 0, br: 0 }; }
  else if (t < 25.6) { hp = H; hpose = { ...idlePose(t, 2), arm: 'down', tool: 'axe' }; }
  else { const per = 6.4, u = ((t - 25.6) % per) / per, go = u < .5; const kk = go ? u * 2 : 2 - u * 2; hp = { x: lerp(212, 286, eInOut(kk)), y: lerp(624, 616, kk) }; const mv = !(u > .45 && u < .55) && !(u < .03 || u > .97);
    hpose = mv ? { ...walkPose(t, 2), arm: go ? 'carry' : 'down', tool: go ? 'plank' : null } : idlePose(t, 2); hface = go ? 1 : -1; }
  O(hp.y, () => drawCharAt(x, CH.heitor, hp.x, hp.y, hpose, hface));
  if (t > 21.0 && t < treeFall) { const u = ((t - 21.0) % .56) / .56; if (u > .55 && u < .62) burst(x, t, t - (u - .55) * .56, 180, 598, 10, [P.woodL, P.sand, P.f8], 12, .5, 20, Math.floor(t * 10)); }
  if (t > treeFall && t < treeFall + 1.2) burst(x, t, treeFall, 170, 600, 40, [P.f6, P.f8, P.woodL, P.st3], 26, 1.1, 20, 81);
  label(hp.x, hp.y - 17, 'heitor', '@heitor_morrone', 'Lenhador', t, [[21.9, 25.6], [109.5, 113.3]], [22.14], z);

  // Lorhan e Maicon — construtores (casa 1, depois casa 2)
  const lp = { x: 282, y: 608 }, mp = { x: 320, y: 606 };
  const lorPose = t > 26.0 ? { legs: 'stand', arm: Math.floor(t * 3.4) % 2 ? 'up' : 'fwd', tool: 'hammer', eyes: 0, br: 0 } : idlePose(t, 3);
  if (t > 12.5) { const tr = track([[12.5, 380, 540], [15.4, lp.x, lp.y]], t); O(tr.y, () => drawCharAt(x, CH.lorhan, tr.moving ? tr.x : lp.x, tr.moving ? tr.y : lp.y, tr.moving ? walkPose(t, 3) : lorPose, 1)); label(tr.moving ? tr.x : lp.x, (tr.moving ? tr.y : lp.y) - 17, 'lorhan', '@lorhan_cristian', 'Construtor', t, [[25.4, 31.2]], [25.86], z); }
  let mpos = mp, mpose;
  if (t < 27.7) { const tr = track([[13.0, 600, 700], [16.5, 336, 618]], t); mpos = tr.moving ? tr : { x: 336, y: 618 }; mpose = tr.moving ? walkPose(t, 4) : idlePose(t, 4); }
  else if (t < 28.5) { const tr = track([[27.7, 336, 618], [28.5, mp.x, mp.y]], t); mpos = tr; mpose = { ...walkPose(t, 4), arm: 'carry', tool: 'plank' }; }
  else mpose = { legs: 'stand', arm: Math.floor(t * 3.4 + 1) % 2 ? 'up' : 'fwd', tool: 'hammer', eyes: 0, br: 0 };
  if (t > 13.0) { O(mpos.y, () => drawCharAt(x, CH.maicon, mpos.x, mpos.y, mpose, t < 27.7 ? 1 : -1)); label(mpos.x, mpos.y - 17, 'maicon', '@maicon.sg2010', 'Construtor', t, [[27.3, 31.2]], [27.46], z); }
  if (t > 28.2 && t < 31.2) { const u = (t * 3.4) % 1; if (u < .08) burst(x, t, t - u / 3.4, 300, 590, 6, [P.woodL, P.fire4], 8, .3, 10, Math.floor(t * 7)); }

  // Pablo — mestre ferreiro
  const pp = { x: B.forja.x - 26, y: B.forja.y + 10 };
  if (t > 12.0) { const tr = track([[12.0, 600, 690], [15.0, pp.x, pp.y]], t);
    const pose = tr.moving ? walkPose(t, 5) : t > 32.6 ? { legs: 'stand', arm: ((t - 32.6) % .6) < .36 ? 'up' : 'low', tool: 'bighammer', eyes: 0, br: 0 } : idlePose(t, 5);
    const P0 = tr.moving ? tr : pp; O(P0.y, () => drawCharAt(x, CH.pablo, P0.x, P0.y, pose, tr.moving ? tr.face : 1));
    if (t > 32.6) { const u = (t - 32.6) % .6; if (u > .36 && u < .42) burst(x, t, t - (u - .36), B.forja.x - 18, B.forja.y + 2, 14, [P.fire3, P.fire4, P.fire2], 14, .45, 14, Math.floor(t * 5)); }
    label(P0.x, P0.y - 17, 'pablo', '@pablopaesrocha', 'Mestre ferreiro', t, [[31.9, 37.6], [109.5, 113.3]], [32.22], z); }

  // Ray — cozinheiro
  const rp = { x: B.cozinha.x - 6, y: B.cozinha.y + 10 };
  if (t > 13.4) { const tr = track([[13.4, 362, 760], [15.6, rp.x, rp.y]], t); const P0 = tr.moving ? tr : rp;
    const pose = tr.moving ? walkPose(t, 6) : t > 38.9 ? { legs: 'stand', arm: Math.floor(t * 2.6) % 2 ? 'fwd' : 'low', tool: 'ladle', eyes: 0, br: Math.floor(t * 1.3) % 2 } : idlePose(t, 6);
    O(P0.y, () => drawCharAt(x, CH.ray, P0.x, P0.y, pose, 1)); label(P0.x, P0.y - 20, 'ray', '@_ray_hpl', 'Cozinheiro', t, [[38.4, 41.0], [109.5, 113.3]], [38.58], z); }

  // Pão com Biscoito — médico
  const dp = { x: B.enfermaria.x - 6, y: B.enfermaria.y + 16 };
  if (t > 12.8) { const tr = track([[12.8, 560, 760], [15.8, dp.x, dp.y]], t); const P0 = tr.moving ? tr : dp;
    const pose = tr.moving ? walkPose(t, 7) : t > 41.9 ? { legs: 'stand', arm: 'fwd', tool: 'flask', eyes: 0, br: Math.floor(t * 1.5) % 2 } : idlePose(t, 7);
    O(P0.y, () => drawCharAt(x, CH.paocombiscoito, P0.x, P0.y, pose, 1)); label(P0.x, P0.y - 17, 'pao', '@paocombiscoito', 'Médico', t, [[41.3, 45.0], [109.5, 113.3]], [41.46], z);
    for (const tt of [42.8, 44.0]) burst(x, t, tt, B.enfermaria.x + 6, B.enfermaria.y + 8, 22, ['#9cbf62', '#e6efa0', '#ffffff'], 12, 1.0, -10, tt * 10); }

  // Valis — taverneiro
  const vp = { x: B.taverna.x + 12, y: B.taverna.y + 8 };
  if (t > 11.6) { const tr = track([[11.6, 410, 360], [14.8, vp.x, vp.y]], t); const P0 = tr.moving ? tr : vp;
    const pose = tr.moving ? walkPose(t, 8) : t > 50.36 && t < 51.4 ? { ...idlePose(t, 8), arm: 'wave', br: Math.floor(t * 5) % 2 } : t > 51.4 ? { ...idlePose(t, 8), arm: 'fwd', tool: 'mug' } : idlePose(t, 8);
    O(P0.y, () => drawCharAt(x, CH.valis, P0.x, P0.y, pose, -1)); label(P0.x, P0.y - 17, 'valis', '@altanat19', 'Valis · Taverneiro', t, [[46.1, 52.3], [109.5, 113.3]], [46.38, 49.0], z); }

  // Gerald D. Black — guerreiro gigante
  const gp = { x: 468, y: 500 };
  if (t > 55.6) { const tr = track([[55.6, 420, 560], [57.4, gp.x, gp.y]], t); const P0 = tr.moving ? tr : gp;
    const raised = t > 63.0 && t < 79;
    const pose = tr.moving ? walkPose(t * .8, 9) : { legs: 'stand', arm: raised ? 'up' : 'down', tool: 'sword', eyes: 0, br: Math.floor(t * 1.1) % 2 };
    if (t < 78.3) { O(P0.y, () => drawCharAt(x, CH.gerald, P0.x, P0.y, pose, 1)); label(P0.x, P0.y - 23, 'gerald', '@eo_preto.031', 'Gerald D. Black · Guerreiro', t, [[56.2, 64.2]], [56.44, 59.54], z); }
    if (t > 63.0 && t < 64.2) burst(x, t, 63.05, gp.x + 6, gp.y - 26, 18, ['#ffffff', P.cy2, P.fire4], 10, .6, 0, 63); }

  // Fenrir — caçador
  if (t > 64.6 && t < 78.3) {
    const tr = track([[64.6, 612, 580], [65.7, 552, 572]], t), jump = pulse(t, 65.0, 65.35, 65.7) * 7;
    const pose = tr.moving ? walkPose(t, 10, true) : { legs: 'stand', arm: 'both', tool: 'daggers', eyes: Math.sin(t * .8) > .3 ? 1 : 0, br: Math.floor(t * 1.6) % 2 };
    O(tr.y, () => drawCharAt(x, CH.fenrir, tr.x, tr.y - jump, pose, tr.moving ? -1 : -1));
    if (t > 69.6) { const k = sstep(69.6, 70.2, t) * (1 - sstep(76, 78, t)); x.globalAlpha = k * .8; ring(x, tr.x, tr.y - 3, 9 + Math.round(Math.sin(t * 4)), '#9cbf62'); x.globalAlpha = 1;
      for (let i = 0; i < 8; i++) { const ph = (t * .6 + i / 8) % 1; x.globalAlpha = k * (1 - ph); px(x, i % 2 ? '#9cbf62' : '#e6efa0', Math.round(tr.x + Math.cos(i * 2.4 + t) * 9), Math.round(tr.y - 4 - ph * 18)); } x.globalAlpha = 1; }
    label(tr.x, tr.y - 19 - jump, 'fenrir', '@bio_leocordeiro', 'Fenrir · Caçador', t, [[64.9, 70.6]], [65.06, 67.08], z);
  }

  // Nyx — princesa élfica
  if (t > 71.0 && t < 78.3) { const np = { x: 266, y: 510 }, turned = t > 75.9;
    O(np.y, () => drawCharAt(x, CH.nyx, np.x, np.y, { legs: 'stand', arm: t > 73.3 && t < 75.9 ? 'bow' : 'down', tool: t > 73.3 && t < 75.9 ? 'bow' : null, eyes: turned ? 1 : 0, br: Math.floor(t * 1.2) % 2 }, turned ? 1 : -1));
    for (let i = 0; i < 12; i++) { const ph = (t * .35 + i / 12) % 1, sx = np.x + Math.cos(i * 2.1) * 14 + (turned ? ph * 40 : 0), sy = np.y - 6 - ph * 34 - (turned ? ph * 20 : 0);
      x.globalAlpha = (1 - ph) * sstep(71.4, 72.4, t); px(x, i % 3 ? P.fire4 : P.cy2, Math.round(sx), Math.round(sy)); if (i % 4 === 0) { px(x, P.fire4, Math.round(sx) - 1, Math.round(sy)); px(x, P.fire4, Math.round(sx) + 1, Math.round(sy)); } } x.globalAlpha = 1;
    burst(x, t, 73.38, np.x, np.y - 10, 40, [P.fire4, P.cy2, '#ffffff'], 24, 1.2, 4, 73);
    label(np.x, np.y - 19, 'nyx', '@kaguya.xs', 'Nyx · Princesa élfica', t, [[71.6, 77.3]], [71.82, 73.38], z); }

  // Exploradores (78.3 →)
  if (t > 78.3) { const ex = explorers(t);
    for (const e of ex) { O(e.y, () => drawCharAt(x, e.ch, e.x, e.y, e.pose, e.face));
      if (e.lab) label(e.x, e.y - (e.ch.sp.big ? 23 : 19), e.id + 'x', e.lab, e.role, t, [[78.6, 86.5]], [], z); } }
}
// grupo de exploração: Fenrir, Nyx, Gerald e um batedor com tocha
const EXP_PATH = [[78.3, 474, 498], [79.6, 482, 476], [81.2, 492, 456], [82.8, 502, 438], [84.4, 508, 425], [86.84, 513, 416], [92.0, 514, 414], [96.4, 514, 414], [99.6, 500, 444]];
const EXP_MEMBERS = [[CH.fenrir, 0, 0, 'fenrir', 'Fenrir', 'Caçador'], [CH.nyx, -9, 7, 'nyx', 'Nyx', 'Arqueira'], [CH.gerald, 10, 9, 'gerald', 'Gerald D. Black', 'Guerreiro'], [EXTRA_CH[8], -2, 15, 'batedor', null, null]];
function explorerCenter(t) { const tr = track(EXP_PATH, t); return { x: tr.x, y: tr.y + 6 }; }
function explorers(t) {
  return EXP_MEMBERS.map(([ch, ox, oy, id, lab, role], i) => { const tr = track(EXP_PATH, t - i * .25), mv = tr.moving;
    const back = t > 96.4; let pose = mv ? walkPose(t, i) : idlePose(t, i);
    if (id === 'batedor') pose = { ...pose, arm: 'fwd', tool: 'torch', br: Math.floor(t * 8) % 2 };
    if (id === 'gerald' && !mv) pose = { ...pose, tool: 'sword' };
    if (id === 'fenrir' && t > 86.8 && t < 96.4) pose = { legs: 'stand', arm: 'both', tool: 'daggers', eyes: 1, br: Math.floor(t * 2) % 2 };
    if (id === 'nyx' && t > 88.6 && t < 96.4) pose = { legs: 'stand', arm: 'bow', tool: 'bow', eyes: 1, br: 0 };
    return { ch, x: tr.x + ox, y: tr.y + oy, pose, face: back ? -1 : 1, id, lab, role }; });
}
// ruínas cobertas de vegetação + pedra com inscrição desconhecida
function drawRuins(x, t) {
  const X = RUINS.x, Y = RUINS.y;
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + .3, p0 = Math.round(X + Math.cos(a) * 20), q0 = Math.round(Y + Math.sin(a) * 13), hg = 5 + (i * 5) % 11;
    px(x, P.ink, p0 - 3, q0 - hg - 1, 7, hg + 3); px(x, P.st2, p0 - 2, q0 - hg, 5, hg + 1); px(x, P.st3, p0 - 2, q0 - hg, 5, 2); px(x, P.st1, p0 + 1, q0 - hg + 2, 2, hg - 1);
    for (let v = 0; v < hg; v += 2) if (h2(i, v) > .4) px(x, h2(v, i) > .5 ? P.f6 : P.f8, p0 - 2 + Math.floor(h2(i * 3, v) * 5), q0 - hg + v); }
  // arco partido
  px(x, P.ink, X - 14, Y - 30, 6, 22); px(x, P.st2, X - 13, Y - 29, 4, 20); px(x, P.ink, X - 14, Y - 32, 16, 5); px(x, P.st3, X - 13, Y - 31, 13, 3); px(x, P.f8, X - 12, Y - 32, 6, 1); px(x, P.f6, X - 13, Y - 26, 1, 8);
  // pedra da inscrição
  const sx = 528, sy = 398; px(x, P.ink, sx - 6, sy - 15, 13, 16); px(x, P.st1, sx - 5, sy - 14, 11, 14); px(x, P.st2, sx - 5, sy - 14, 11, 2); px(x, P.f6, sx - 5, sy - 3, 4, 2); px(x, P.f8, sx + 3, sy - 14, 2, 3);
  const glyphs = [[0, 0, 1, 3], [0, 0, 3, 1], [4, 0, 1, 3], [4, 1, 2, 1], [7, 0, 1, 1], [7, 2, 1, 1], [1, 5, 3, 1], [2, 4, 1, 3], [6, 5, 2, 2], [0, 9, 1, 1], [2, 9, 3, 1], [7, 8, 1, 3]];
  const on = sstep(91.8, 93.5, t) * .5 + sstep(94.0, 94.6, t) * .5, fade = 1 - sstep(96.5, 99.4, t), g = on * fade;
  for (const [a, b, w, h] of glyphs) px(x, g > .05 ? P.cy2 : P.st0, sx - 4 + a, sy - 13 + b, w, h);
  if (g > .05) { x.globalAlpha = g * (.6 + .4 * Math.sin(t * 3)); glow(x, sx, sy - 8, 10, P.cy, .14); x.globalAlpha = 1; }
}
function storyGlows(x, t) {
  if (t > 63.0 && t < 64.4) glow(x, 474, 474, 8, '#ffffff', .2 * (1 - seg(t, 63.0, 64.4)));
  if (t > 71.6 && t < 78.3) glow(x, 266, 496, 14, P.cy2, .06);
  if (t > 78.3) { const g = explorers(t)[3]; glow(x, g.x + 4, g.y - 12, 10, P.fire2, .14); }
}
// ícones: profissão (18.58), habilidade (19.62), história (20.84)
function storyIcons(x, t) {
  const sets = [[18.58, ['axe', 'hammer', 'pot', 'herb', 'mug']], [19.62, ['star']], [20.84, ['scroll']]];
  EXTRAS.slice(0, 18).forEach((e, i) => { if (t < e.arrive) return; let name = null;
    for (const [t0, list] of sets) if (t > t0 + (i % 6) * .05) name = list[i % list.length];
    if (!name) return; const tr = track(e.keys, t), k = seg(t, 18.58 + (i % 6) * .05, 18.8 + (i % 6) * .05);
    drawIcon(x, name, Math.round(tr.x) - 3, Math.round(tr.y) - 26 - Math.round((1 - eOutBack(k)) * 4)); });
}
function epilogueChars(x, t, O, vis, z) {
  // vila trabalhando (100.2–103): construtores, ferreiro, cozinheiro, taverneiro e guardião nos seus postos
  const posts = [[CH.lorhan, 282, 608, 'hammer', 1], [CH.maicon, 320, 606, 'hammer', -1], [CH.pablo, B.forja.x - 26, B.forja.y + 10, 'bighammer', 1], [CH.ray, B.cozinha.x - 6, B.cozinha.y + 10, 'ladle', 1],
    [CH.paocombiscoito, B.enfermaria.x - 6, B.enfermaria.y + 16, 'flask', 1], [CH.valis, B.taverna.x + 12, B.taverna.y + 8, 'mug', -1], [CH.gerald, 468, 500, 'sword', 1], [CH.heitor, 186, 640, 'axe', -1], [CH.fenrir, 548, 568, 'daggers', -1], [CH.nyx, 266, 510, null, 1]];
  const ids = ['heitor', 'lorhan', 'maicon', 'pablo', 'ray', 'pao', 'valis', 'gerald', 'fenrir', 'nyx'];
  const order = { lorhan: 1, maicon: 2, pablo: 3, ray: 4, pao: 5, valis: 6, gerald: 7, heitor: 0, fenrir: 8, nyx: 9 };
  const names = { heitor: '@heitor_morrone', lorhan: '@lorhan_cristian', maicon: '@maicon.sg2010', pablo: '@pablopaesrocha', ray: '@_ray_hpl', pao: '@paocombiscoito', valis: '@altanat19', gerald: '@eo_preto.031', fenrir: '@bio_leocordeiro', nyx: '@kaguya.xs' };
  posts.forEach(([ch, X, Y, tool, face], i) => { const id = ['lorhan', 'maicon', 'pablo', 'ray', 'pao', 'valis', 'gerald', 'heitor', 'fenrir', 'nyx'][i];
    let arm = 'down'; if (tool === 'hammer' || tool === 'bighammer') arm = Math.floor(t * 3 + i) % 2 ? 'up' : 'fwd'; else if (tool === 'axe') arm = chop(t, i); else if (tool === 'ladle') arm = Math.floor(t * 2.6) % 2 ? 'fwd' : 'low'; else if (tool === 'flask' || tool === 'mug') arm = 'fwd'; else if (tool === 'daggers') arm = 'both';
    O(Y, () => drawCharAt(x, ch, X, Y, { legs: 'stand', arm, tool, eyes: 0, br: Math.floor(t * 1.3 + i) % 2 }, face));
    const k = order[id]; label(X, Y - (ch.sp.big ? 23 : 18), id + 'e', names[id], null, t, [[109.5 + k * .3, 113.4]], [109.5 + k * .3], z, true); });
  if (t > 114.0) O(SEAT.y, () => { const k = seg(t, 114.0, 115.0), g = CH.fundador_1.frame({ legs: 'stand', arm: 'down', eyes: 0, br: 0 });
    const [c2, x2] = canvas(g.c.width, g.c.height); x2.drawImage(g.c, 0, 0); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = P.fire4; x2.fillRect(0, 0, c2.width, c2.height);
    const hh = Math.max(1, Math.round(c2.height * k)); x.globalAlpha = .7 + .2 * Math.sin(t * 4); x.drawImage(c2, 0, c2.height - hh, c2.width, hh, SEAT.x - g.ax, SEAT.y - g.ay + c2.height - hh, c2.width, hh); x.globalAlpha = 1; });
  burst(x, t, 114.05, SEAT.x, SEAT.y - 4, 50, [P.fire3, P.fire4, '#ffffff'], 26, 1.5, -8, 99);
}

// ---------------------------------------------------------------- etiquetas (@) que seguem os personagens
const tagsEl = document.getElementById('tags'), TAGS = {};
function label(wx, wy, id, name, role, t, wins, hls, z, small) {
  let on = false, a = 0; for (const [a0, a1] of wins) if (t > a0 && t < a1) { on = true; a = Math.min(seg(t, a0, a0 + .25), 1 - seg(t, a1 - .25, a1)); }
  if (!on) return; const hl = hls.some(h => t > h - .05 && t < h + 1.3);
  LBL.push({ wx, wy, id, name, role: small ? null : role, a, hl, pop: hls.some(h => t > h - .05 && t < h + .12), z });
}
function placeTags(L, Tp, s) {
  const used = new Set();
  for (const lb of LBL) {
    let el = TAGS[lb.id]; if (!el) { el = document.createElement('div'); el.className = 'ov tag'; el.innerHTML = '<span class="n"></span><span class="r"></span>'; tagsEl.appendChild(el); TAGS[lb.id] = el; }
    el.querySelector('.n').textContent = lb.name; const r = el.querySelector('.r'); r.textContent = lb.role || ''; r.style.display = lb.role ? 'block' : 'none';
    el.style.left = Math.round((lb.wx - L) * s) + 'px'; el.style.top = Math.round((lb.wy - Tp) * s) + 'px';
    const sc = clamp(lb.z / 2.8, .72, 1.1) * (lb.pop ? 1.15 : 1);
    el.style.transform = `translate(-50%,-100%) scale(${sc.toFixed(2)})`; el.style.transformOrigin = '50% 100%';
    el.style.opacity = (Math.round(lb.a * 4) / 4).toFixed(2); el.classList.toggle('hl', lb.hl); el.style.display = 'block'; used.add(lb.id);
  }
  for (const id in TAGS) if (!used.has(id)) TAGS[id].style.display = 'none';
}

// ---------------------------------------------------------------- textos sobrepostos
const capEl = document.getElementById('caption'), titleEl = document.getElementById('title'), counterEl = document.getElementById('counter'), qEl = document.getElementById('q');
const numEl = counterEl.querySelector('.num');
titleEl.innerHTML = 'ERYON'.split('').map(c => `<b>${c}</b>`).join('') + '<small>EPISÓDIO 2 · OS PRIMEIROS 576</small>';
const letters = [...titleEl.querySelectorAll('b')], titleSmall = titleEl.querySelector('small');
let capKey = null;
function overlay(t, inB, L, Tp, s, z) {
  let g = null; for (const c of CAPS) if (t >= c[0] - .03 && t < c[1]) g = c;
  const key = g ? g[2] : ''; if (key !== capKey) { capKey = key; capEl.innerHTML = key.split(' ').map(w => w.startsWith('@') ? `<span class="u">${w}</span>` : w).join(' '); }
  if (g) capEl.style.transform = `translateY(${t - g[0] < .07 ? 6 : 0}px)`;
  // contador de população
  const on = (t < 7.2) || (t > 10.8 && t < 21.0) || (t > 105.8 && t < 109.4);
  counterEl.style.display = on ? 'flex' : 'none';
  let n = 2; if (t > 11.0) n = Math.round(2 + 574 * eOut(seg(t, 11.0, 13.6)));
  numEl.textContent = n;
  // título final
  const tOn = inB && t > 115.0; titleEl.style.display = tOn ? 'block' : 'none';
  letters.forEach((el, i) => { const k = seg(t, 115.0 + i * .1, 115.25 + i * .1); el.style.visibility = k > 0 ? 'visible' : 'hidden'; el.style.transform = `translateY(${Math.round((1 - eOutBack(k)) * -10) * 8}px)`; });
  titleSmall.style.visibility = t > 115.7 ? 'visible' : 'hidden';
  const qOn = inB && t > 114.4 && t < 118.2; qEl.style.display = qOn ? 'block' : 'none';
  if (qOn) { qEl.style.left = Math.round((SEAT.x - L) * s) + 'px'; qEl.style.top = Math.round((SEAT.y - 18 - Tp) * s + Math.sin(t * 3) * 6) + 'px'; }
  placeTags(L, Tp, s);
}

// ---------------------------------------------------------------- inicialização
window.render = render;
Promise.all([fetch('../eryon_world.json').then(r => r.json()), fetch('captions.json').then(r => r.json()), document.fonts.load('700 40px Pix'), document.fonts.load('400 40px P2P')])
  .then(([w, caps]) => { WORLD = w; CAPS = caps; for (const b of w.construcoes) B[b.id] = b; buildVillageGround(); render(1); window.ready = true; })
  .catch(e => { console.error('init', e.message); });
