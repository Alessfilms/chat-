// =====================================================================
// ERYON ONLINE — exploração: mundo desconhecido, monumentos e buracos
// (carregado depois de craft.js e antes de game.js)
// =====================================================================
const LANDMARKS = [
  { id: 'costela', name: 'Costela de Dragão', x: 170, y: 1060, clear: 46, r: 52 },
  { id: 'ruinas', name: 'Ruínas da Inscrição', x: 520, y: 400, clear: 34, r: 44 },
  { id: 'torre', name: 'Torre Antiga', x: 290, y: 118, clear: 30, r: 44 },
  { id: 'caverna', name: 'Caverna Escondida', x: 92, y: 812, clear: 40, r: 50, hole: 'gruta', holeLabel: 'Entrar na caverna' },
  { id: 'buraco', name: 'Buraco Misterioso', x: 575, y: 1110, clear: 34, r: 46, hole: 'abismo', holeLabel: 'Descer no buraco' },
  { id: 'circulo', name: 'Círculo de Pedras', x: 610, y: 880, clear: 38, r: 48 },
  { id: 'arvore', name: 'Árvore Ancestral', x: 110, y: 340, clear: 40, r: 50 },
  { id: 'poco', name: 'Poço da Lua', x: 630, y: 120, clear: 32, r: 44 },
  { id: 'lago', name: 'Lago Espelhado', x: 1090, y: 668, clear: 34, r: 56 },
  { id: 'gigante', name: 'Estátua do Gigante', x: 1260, y: 372, clear: 50, r: 60 },
  { id: 'acampamento', name: 'Acampamento Abandonado', x: 232, y: 1560, clear: 46, r: 54 },
  { id: 'cristais', name: 'Jardim de Cristais', x: 468, y: 1930, clear: 40, r: 52 },
  { id: 'cemiterio', name: 'Cemitério Antigo', x: 636, y: 2232, clear: 50, r: 56 },
  { id: 'portal', name: 'Portal Esquecido', x: 1220, y: 1522, clear: 40, r: 50 },
  { id: 'ninho', name: 'Ninho do Dragão', x: 1124, y: 2080, clear: 46, r: 56 },
];
const LM = Object.fromEntries(LANDMARKS.map(l => [l.id, l]));
const nearLandmark = (x, y, pad = 0) => LANDMARKS.some(l => Math.hypot(x - l.x, y - l.y) < l.clear + pad);
let FOUND = new Set(), FIRSTS = {};

// ---------------------------------------------------------------- desenho dos monumentos (sprites estáticos + partes animadas)
const LM_SPR = {};
const BONE = ['#a8875a', '#d6c094', '#efe2bf', '#fffaf0'], BONE_O = '#3a2818';
const STONE = ['#4d5566', '#6e7789', '#939cae', '#c3cad6'], STONE_O = '#22262f';
const MOSS = ['#2f7a40', '#47994a', '#66b350', '#90d064'];
const EARTH = ['#6a3c22', '#8a5430', '#b0703f', '#cf8d50'];
function grassRim(x, cx, cy, rx, ry, seed) {   // tufos de grama e florzinhas em volta da base
  for (let i = 0; i < rx * 1.4; i++) { const a = h2(i, seed) * 6.283, k = .85 + h2(seed, i) * .3, X = Math.round(cx + Math.cos(a) * rx * k), Y = Math.round(cy + Math.sin(a) * ry * k);
    if (h2(i * 3, seed) > .75) { px(x, '#f4f0d8', X, Y, 1, 1); px(x, '#ffd84a', X, Y + 1, 1, 1); } else { px(x, MOSS[1], X, Y, 1, 2); px(x, MOSS[3], X + 1, Y - 1, 1, 2); } }
}
function lmSprite(id) {
  if (LM_SPR[id]) return LM_SPR[id];
  let c, x, ax, ay;
  if (id === 'costela') { [c, x] = canvas(96, 52); ax = 48; ay = 44;
    // cratera de terra onde o dragão caiu
    softShadow(x, 48, 42, 46, 8, .25);
    painter(x).ell(48, 40, 45, 9, EARTH, '#3a2216', -.1).done();
    for (let i = 0; i < 40; i++) { const X = 6 + Math.floor(h2(i, 2) * 84), Y = 34 + Math.floor(h2(i, 3) * 12); if (((X - 48) / 44) ** 2 + ((Y - 40) / 8) ** 2 < .8) px(x, h2(i, 4) > .5 ? EARTH[3] : EARTH[0], X, Y, 2, 1); }
    const pt = painter(x);
    // costelas de trás (mais escuras)
    const spine = k => [10 + k * 66, 32 - Math.sin(k * Math.PI * .9) * 10 - k * 2];
    for (let i = 0; i < 6; i++) { const [sx, sy] = spine(.28 + i * .085), pts = []; for (let t = 0; t <= 1.001; t += .125) pts.push([sx - Math.sin(t * 2.6) * 9 - t * 2, sy + t * (39 - sy) - Math.sin(t * 3) * 2, 1.4 - t * .5]); pt.tube(pts, 1.2, ['#7a6040', '#a8875a', '#c8b080', '#e0d0a8'], BONE_O); }
    pt.done();
    // asa ossuda aberta com membrana rasgada
    const sh = spine(.7), tips = [[24, 4], [34, 1], [45, 1], [55, 5]];
    x.globalAlpha = .5; x.fillStyle = '#6a2a2a';
    for (let i = 0; i < tips.length - 1; i++) { x.beginPath(); x.moveTo(sh[0], sh[1] - 2); x.lineTo(tips[i][0] + 1, tips[i][1] + 3); x.lineTo((tips[i][0] + tips[i + 1][0]) / 2, tips[i][1] + 9 + (i % 2) * 3); x.lineTo(tips[i + 1][0] - 1, tips[i + 1][1] + 3); x.closePath(); x.fill(); }
    x.globalAlpha = 1;
    for (const [ex, ey] of tips) pt.tube([[sh[0], sh[1] - 2, 1.6], [(sh[0] + ex) / 2, Math.min(sh[1], ey) - 1, 1.1], [ex, ey, .5]], 1, BONE, BONE_O);
    pt.tube([[sh[0] - 2, sh[1], 2], [sh[0] - 6, sh[1] - 8, 1.6]], 1.5, BONE, BONE_O);
    pt.done();
    // coluna (vértebras com espinhos)
    const sp = []; for (let k = 0; k <= 1.001; k += .05) { const [X, Y] = spine(k); sp.push([X, Y, 1 + Math.sin(k * Math.PI) * 1.6]); }
    pt.tube(sp, 2, BONE, BONE_O).done();
    for (let k = .08; k < .95; k += .06) { const [X, Y] = spine(k), hgt = 2 + Math.round(Math.sin(k * Math.PI) * 3); px(x, BONE_O, X - 1, Y - hgt - 2, 3, hgt); px(x, BONE[2], X, Y - hgt - 1, 1, hgt - 1); px(x, BONE[0], X, Y - 1, 1, 1); }
    // cauda enrolada
    pt.tube([[10, 32, 1.6], [5, 36, 1.3], [5, 41, 1.1], [10, 43, .9], [15, 41, .7]], 1, BONE, BONE_O).done();
    // costelas da frente
    for (let i = 0; i < 6; i++) { const [sx, sy] = spine(.28 + i * .085), pts = []; for (let t = 0; t <= 1.001; t += .125) pts.push([sx + Math.sin(t * 2.6) * 8 + t * 3, sy + t * (42 - sy) - Math.sin(t * 3) * 2, 1.6 - t * .6]); pt.tube(pts, 1.3, BONE, BONE_O); }
    pt.done();
    // garras no chão
    for (const gx2 of [30, 58]) { pt.tube([[gx2, 40, 1.3], [gx2 + 3, 44, 1]], 1, BONE, BONE_O); for (let f = -1; f <= 1; f++) pt.tube([[gx2 + 3, 44, .9], [gx2 + 3 + f * 3, 46, .5]], .7, BONE, BONE_O); }
    pt.done();
    // crânio de dragão: focinho longo, chifres para trás, crista
    pt.tube([[72, 14, 1.6], [65, 9, 1.2], [58, 9, .9], [55, 12, .5]], 1, BONE, BONE_O).tube([[74, 12, 1.5], [69, 5, 1.1], [62, 2, .5]], 1, BONE, BONE_O).done();
    pt.poly([[76, 29], [93, 28], [95, 30], [86, 33], [76, 32]], BONE, BONE_O, -.25).done();                                     // mandíbula
    pt.poly([[68, 19], [72, 13], [80, 12], [86, 16], [95, 22], [95, 26], [85, 28], [72, 27]], BONE, BONE_O, .05).done();          // crânio
    px(x, BONE[0], 74, 13, 9, 1); px(x, BONE[3], 75, 14, 6, 1);                                                                  // crista
    px(x, '#2a1a10', 75, 16, 5, 4); px(x, '#140c08', 76, 17, 3, 2); px(x, '#9ff3ff', 77, 17, 1, 1);                              // órbita com brilho
    px(x, '#2a1a10', 92, 22, 2, 1); px(x, BONE[0], 80, 21, 10, 1); px(x, BONE[0], 71, 24, 6, 1);
    for (let i = 0; i < 7; i++) { px(x, BONE[3], 79 + i * 2, 28, 1, 2); px(x, BONE_O, 80 + i * 2, 28, 1, 1); }                  // dentes
    px(x, BONE[3], 93, 27, 1, 2);
    // musgo e flores sobre os ossos, ossinhos soltos
    for (let i = 0; i < 26; i++) { const k = h2(i, 9), [X, Y] = spine(k); if (h2(i, 1) > .45) px(x, MOSS[h2(i, 7) > .5 ? 2 : 1], Math.round(X + (h2(i, 5) - .5) * 4), Math.round(Y - 2), 2, 1); }
    px(x, MOSS[2], 80, 12, 4, 1); px(x, MOSS[3], 81, 11, 2, 1);
    for (const [X, Y] of [[20, 46], [70, 45], [86, 41], [40, 47]]) { px(x, BONE_O, X - 1, Y - 1, 5, 3); px(x, BONE[2], X, Y, 3, 1); }
    grassRim(x, 48, 40, 46, 9, 7);
  }
  if (id === 'ruinas') { [c, x] = canvas(70, 48); ax = 35; ay = 40;
    softShadow(x, 35, 40, 32, 6, .25);
    // piso de lajes
    for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) { const X = 6 + k * 8 + (r % 2) * 4, Y = 33 + r * 4; if (h2(k, r) < .2) continue; px(x, STONE_O, X - 1, Y - 1, 8, 5); px(x, h2(r, k) > .5 ? STONE[1] : STONE[2], X, Y, 6, 3); px(x, STONE[3], X, Y, 6, 1); if (h2(k + 9, r) > .7) px(x, MOSS[1], X + 1, Y + 2, 3, 1); }
    const pt = painter(x);
    // tambor de coluna caído
    pt.ell(58, 39, 6, 4, STONE, STONE_O).done(); px(x, STONE[3], 56, 37, 3, 1); px(x, STONE[0], 55, 41, 7, 1);
    // pilar esquerdo inteiro + capitel, pilar do meio quebrado, arco partido
    pt.poly([[11, 6], [18, 6], [18, 38], [11, 38]], STONE, STONE_O).poly([[8, 2], [21, 2], [21, 7], [8, 7]], STONE, STONE_O, .2).done();
    pt.poly([[21, 2], [34, 2], [36, 5], [30, 7], [21, 7]], STONE, STONE_O, .1).done();
    pt.poly([[26, 20], [33, 18], [33, 38], [26, 38]], STONE, STONE_O).done();
    for (let Y = 10; Y < 38; Y += 6) { px(x, STONE[0], 12, Y, 6, 1); } for (let Y = 23; Y < 38; Y += 6) px(x, STONE[0], 27, Y, 6, 1);
    // estela da inscrição (as runas brilham por cima)
    pt.poly([[40, 20], [47, 17], [54, 20], [54, 38], [40, 38]], STONE, STONE_O, -.15).done();
    px(x, '#2b3240', 42, 21, 11, 14); px(x, '#3a4354', 42, 21, 11, 1);
    // hera
    for (const [X, Y0, L] of [[11, 3, 22], [18, 4, 14], [26, 21, 10], [33, 2, 5], [53, 21, 9]]) for (let k = 0; k < L; k++) if (h2(X, k) > .25) px(x, k % 3 ? MOSS[1] : MOSS[3], X + (h2(k, X) > .5 ? 1 : 0), Y0 + k, 1, 1);
    px(x, MOSS[2], 8, 1, 6, 1); px(x, MOSS[3], 9, 0, 3, 1); px(x, MOSS[2], 26, 17, 5, 1);
    grassRim(x, 35, 38, 32, 6, 3);
  }
  if (id === 'torre') { [c, x] = canvas(40, 70); ax = 20; ay = 64;
    softShadow(x, 21, 64, 16, 4, .3);
    // corpo cilíndrico de pedra
    for (let Y = 24; Y < 64; Y++) for (let X = 8; X < 32; X++) { const u = (X - 19.5) / 12, row = Math.floor((Y - 24) / 4), joint = ((X + (row % 2) * 3) % 6 === 0) || (Y - 24) % 4 === 0;
      let col = shade4(STONE, -u * 1.1 + .15 + ((X + Y) & 1 ? .06 : -.06)); if (joint) col = u > .3 ? STONE_O : STONE[0]; px(x, col, X, Y); }
    px(x, STONE_O, 7, 24, 1, 40); px(x, STONE_O, 32, 24, 1, 40); px(x, STONE_O, 7, 63, 26, 1);
    // base mais larga
    const pt = painter(x); pt.poly([[5, 58], [35, 58], [35, 64], [5, 64]], STONE, STONE_O, -.1).done(); for (let X = 6; X < 35; X += 5) px(x, STONE[0], X, 59, 1, 5);
    // porta em arco e janela iluminada
    px(x, STONE_O, 15, 49, 10, 15); px(x, '#5a3a22', 16, 51, 8, 12); px(x, '#3a2414', 16, 51, 8, 1); px(x, STONE_O, 16, 49, 8, 2); px(x, '#8a5530', 17, 53, 2, 9); px(x, '#ffd84a', 22, 57, 1, 1);
    px(x, STONE_O, 16, 31, 8, 10); px(x, '#ffd84a', 17, 33, 6, 7); px(x, '#fff3b0', 18, 34, 2, 3); px(x, STONE_O, 19, 33, 1, 7); px(x, STONE_O, 17, 36, 6, 1); px(x, STONE_O, 17, 32, 6, 1);
    // ameias + telhado cônico de telhas
    for (let i = 0; i < 6; i++) { px(x, STONE_O, 6 + i * 5, 18, 4, 7); px(x, i < 2 ? STONE[3] : STONE[2], 7 + i * 5, 19, 2, 5); }
    px(x, STONE_O, 5, 23, 30, 3); px(x, STONE[2], 6, 24, 28, 1);
    const ROOF = ['#1d3550', '#2c4f8a', '#3f6fc0', '#6f9be0'];
    for (let Y = 2; Y < 21; Y++) { const w = Math.round(1 + (Y - 2) * .78); for (let X = 20 - w; X <= 20 + w; X++) { const u = (X - 20) / Math.max(1, w), band = (Y + (X & 1)) % 3 === 0; px(x, X === 20 - w || X === 20 + w ? '#101a2a' : band ? ROOF[0] : shade4(ROOF, -u * .9 + .1), X, Y); } }
    px(x, '#101a2a', 5, 21, 31, 1);
    px(x, '#55321c', 20, 0, 1, 4); px(x, '#a83a32', 21, 0, 4, 2); px(x, '#d0622a', 21, 0, 3, 1);   // bandeira
    for (let k = 0; k < 26; k++) if (h2(k, 4) > .3) px(x, k % 3 ? MOSS[1] : MOSS[3], 9 + (k % 3), 62 - k, 1, 1);
    for (let k = 0; k < 14; k++) if (h2(k, 6) > .3) px(x, k % 2 ? MOSS[1] : MOSS[2], 30 - (k % 2), 62 - k, 1, 1);
    grassRim(x, 20, 63, 17, 3, 11);
  }
  if (id === 'caverna') { [c, x] = canvas(80, 54); ax = 40; ay = 48;
    softShadow(x, 40, 47, 38, 6, .3);
    const pt = painter(x);
    pt.ell(62, 34, 15, 13, STONE, STONE_O).ell(18, 34, 15, 12, STONE, STONE_O).done();
    pt.ell(40, 28, 27, 21, STONE, STONE_O, .05).done();
    pt.ell(30, 40, 9, 7, STONE, STONE_O).ell(52, 41, 8, 6, STONE, STONE_O, -.1).done();
    // musgo no topo
    for (let X = 16; X < 66; X++) { const top = Math.round(28 - 21 * Math.sqrt(Math.max(0, 1 - ((X - 40) / 27) ** 2))); if (top > 26) continue; const L = 2 + Math.floor(h2(X, 3) * 4); for (let k = 0; k < L; k++) px(x, k === 0 ? MOSS[3] : k < 2 ? MOSS[2] : MOSS[1], X, top + 1 + k, 1, 1); }
    // rachaduras
    for (const [X, Y] of [[24, 22], [56, 18], [66, 30]]) { px(x, STONE[0], X, Y, 1, 3); px(x, STONE[0], X + 1, Y + 3, 1, 2); }
    // entrada escura em arco com vigas de madeira
    for (let Y = 27; Y < 48; Y++) { const w = Y < 32 ? Math.round(7 * Math.sqrt(1 - ((32 - Y) / 6) ** 2)) : 7; px(x, '#05070a', 40 - w, Y, w * 2, 1); if (Y > 32) px(x, '#0c1016', 40 - w, Y, 2, 1); }
    px(x, '#3a2216', 31, 27, 3, 21); px(x, '#8a5530', 32, 28, 1, 20); px(x, '#3a2216', 46, 27, 3, 21); px(x, '#8a5530', 47, 28, 1, 20);
    px(x, '#3a2216', 30, 25, 20, 3); px(x, '#b8814a', 31, 26, 18, 1);
    // cristais na rocha
    for (const [X, Y, h] of [[24, 30, 6], [55, 31, 5], [36, 18, 4], [45, 19, 5], [60, 40, 4]]) { px(x, '#1a3a4a', X - 1, Y - h - 1, 4, h + 2); px(x, '#3fd0e0', X, Y - h, 2, h); px(x, '#9ff3ff', X, Y - h, 1, Math.ceil(h / 2)); }
    grassRim(x, 40, 46, 37, 5, 13);
  }
  if (id === 'buraco') { [c, x] = canvas(56, 34); ax = 28; ay = 26;
    // terra em volta, paredes em camadas descendo para o escuro
    painter(x).ell(28, 19, 26, 13, EARTH, '#3a2216', .2).done();
    const layers = ['#5a3420', '#3e2416', '#26160e', '#140c08', '#07040a'];
    layers.forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.ellipse(28, 19 + i * .8, 20 - i * 2.2, 9.5 - i * 1.3, 0, 0, 6.283); x.fill(); });
    x.fillStyle = '#000'; x.beginPath(); x.ellipse(28, 23, 8, 3, 0, 0, 6.283); x.fill();
    // anel de pedras
    const pt = painter(x);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + .2, X = 28 + Math.cos(a) * 22, Y = 19 + Math.sin(a) * 10.5; if (Math.sin(a) < 0) pt.ell(X, Y, 3 + (i % 2), 2.4, STONE, STONE_O); }
    pt.done();
    // escada descendo
    for (let k = 0; k < 6; k++) { px(x, '#55321c', 24, 10 + k * 3, 1, 3); px(x, '#55321c', 31, 10 + k * 3, 1, 3); px(x, k > 3 ? '#5a3a22' : '#b8814a', 24, 11 + k * 3, 8, 1); }
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + .2, X = 28 + Math.cos(a) * 22, Y = 19 + Math.sin(a) * 10.5; if (Math.sin(a) >= 0) pt.ell(X, Y, 3 + (i % 2), 2.4, STONE, STONE_O); }
    pt.done();
    for (let i = 0; i < 6; i++) px(x, MOSS[2], 8 + i * 8, 10 + (i % 2) * 18, 2, 1);
    grassRim(x, 28, 19, 27, 14, 17);
  }
  if (id === 'circulo') { [c, x] = canvas(76, 50); ax = 38; ay = 40;
    painter(x).ell(38, 33, 34, 12, ['#3f8f45', '#4f9f4a', '#66b350', '#84c65a'], null).done();
    for (let i = 0; i < 30; i++) { const a = i / 30 * 6.283; px(x, '#a6da6a', Math.round(38 + Math.cos(a) * 18), Math.round(33 + Math.sin(a) * 6), 1, 1); }   // círculo de grama clara
    const stones = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + .35; stones.push({ X: 38 + Math.cos(a) * 30, Y: 34 + Math.sin(a) * 11, h: 13 + (i * 5) % 8, w: 3 + (i % 3 === 0 ? 1 : 0), i }); }
    stones.sort((a, b) => a.Y - b.Y);
    const pt = painter(x); let altarDone = false;
    for (const s2 of stones) {
      if (!altarDone && s2.Y > 33) { softShadow(x, 39, 35, 9, 2, .3); pt.poly([[30, 27], [46, 27], [48, 33], [28, 33]], STONE, STONE_O, .25).done(); px(x, STONE[0], 29, 33, 19, 2); px(x, STONE_O, 28, 35, 21, 1); px(x, '#3fd0e0', 36, 29, 4, 1); px(x, '#3fd0e0', 37, 28, 2, 3); altarDone = true; }
      softShadow(x, s2.X + 2, s2.Y, s2.w + 2, 2, .3);
      pt.poly([[s2.X - s2.w, s2.Y], [s2.X - s2.w + 1, s2.Y - s2.h + 2], [s2.X - 1, s2.Y - s2.h], [s2.X + s2.w - 1, s2.Y - s2.h + 1], [s2.X + s2.w, s2.Y]], STONE, STONE_O).done();
      const X = Math.round(s2.X), Y = Math.round(s2.Y);
      px(x, MOSS[2], X - s2.w + 1, Y - s2.h + 1, s2.w + 1, 1); px(x, MOSS[1], X - s2.w + 1, Y - 2, s2.w * 2 - 1, 1);
      px(x, '#2a5a6a', X - 1, Y - s2.h + 5, 1, 4); px(x, '#3fd0e0', X - 1, Y - s2.h + 5, 1, 3); px(x, '#3fd0e0', X, Y - s2.h + 6, 1, 1);   // runa
    }
    grassRim(x, 38, 34, 35, 12, 23);
  }
  if (id === 'arvore') { [c, x] = canvas(72, 80); ax = 36; ay = 74;
    softShadow(x, 38, 73, 30, 5, .3);
    const pt = painter(x), BARK = ['#3a2216', '#5a3420', '#7a4a2a', '#9a6538'];
    // raízes e tronco retorcido
    for (const [ex, ey] of [[18, 75], [26, 77], [48, 77], [56, 74], [36, 78]]) pt.tube([[36, 66, 3], [(36 + ex) / 2, 72, 2], [ex, ey, .8]], 1, BARK, '#1e120a');
    pt.tube([[36, 70, 6], [34, 58, 5], [38, 46, 4.5], [35, 36, 4]], 4, BARK, '#1e120a').tube([[36, 46, 2.5], [24, 36, 1.6]], 2, BARK, '#1e120a').tube([[37, 50, 2.5], [50, 40, 1.6]], 2, BARK, '#1e120a').done();
    for (let k = 0; k < 8; k++) px(x, '#2a160c', 33 + (k % 3), 50 + k * 2, 1, 2);   // veios da casca
    // copa em camadas de tufos
    const LEAVES = ['#1d5a3a', '#2f7a40', '#4f9f4a', '#84c65a'];
    const clumps = [[36, 22, 17, 13], [20, 30, 12, 10], [52, 30, 12, 10], [28, 14, 11, 9], [46, 14, 11, 9], [36, 8, 10, 7], [14, 40, 8, 6], [58, 40, 8, 6], [36, 34, 14, 8]];
    for (const [X, Y, rx, ry] of clumps) pt.ell(X, Y, rx, ry, LEAVES, '#0f2a1a', .05);
    pt.done();
    for (const [X, Y, rx, ry] of clumps) for (let k = 0; k < rx; k++) { const a = h2(k, X) * 3 + 3.6, R2 = .55 + h2(X, k) * .3; px(x, LEAVES[3], Math.round(X + Math.cos(a) * rx * R2), Math.round(Y + Math.sin(a) * ry * R2), 2, 1); }
    // frutos de luz
    for (const [X, Y] of [[22, 30], [48, 22], [30, 12], [56, 36], [16, 40], [40, 34], [44, 6]]) { px(x, '#1a3a4a', X - 1, Y - 1, 3, 3); px(x, '#9ff3ff', X, Y, 1, 1); }
    grassRim(x, 36, 74, 28, 4, 29);
  }
  if (id === 'poco') { [c, x] = canvas(56, 46); ax = 28; ay = 38;
    softShadow(x, 29, 37, 22, 5, .3);
    const pt = painter(x), MARBLE = ['#9aa4b8', '#c8cfdc', '#e8ecf2', '#ffffff'];
    // colunas de trás
    pt.poly([[9, 10], [14, 10], [14, 30], [9, 30]], MARBLE, STONE_O).poly([[42, 10], [47, 10], [47, 30], [42, 30]], MARBLE, STONE_O).done();
    // borda do poço em blocos de pedra
    pt.ell(28, 30, 17, 8, STONE, STONE_O, .15).done();
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, X = Math.round(28 + Math.cos(a) * 15.5), Y = Math.round(30 + Math.sin(a) * 6.8); px(x, STONE[0], X, Y, 1, 1); }
    x.fillStyle = STONE_O; x.beginPath(); x.ellipse(28, 29.5, 12, 5, 0, 0, 6.283); x.fill();
    x.fillStyle = '#16305e'; x.beginPath(); x.ellipse(28, 30, 11, 4.3, 0, 0, 6.283); x.fill();
    x.fillStyle = '#2a4f9a'; x.beginPath(); x.ellipse(27, 29.5, 8, 2.8, 0, 0, 6.283); x.fill();
    px(x, '#fff8d8', 29, 28, 3, 1); px(x, '#fff8d8', 31, 29, 1, 2); px(x, '#fff8d8', 29, 31, 3, 1);   // lua refletida
    // frente da borda (parede)
    for (let X = 11; X <= 45; X++) { const Y = Math.round(30 + 8 * Math.sqrt(Math.max(0, 1 - ((X - 28) / 17) ** 2))); px(x, STONE_O, X, Y, 1, 5); px(x, shade4(STONE, -(X - 28) / 17 * .9 - .1), X, Y, 1, 4); if ((X + 1) % 5 === 0) px(x, STONE[0], X, Y, 1, 4); }
    // colunas da frente com arco e lua crescente
    pt.poly([[5, 16], [10, 16], [10, 38], [5, 38]], MARBLE, STONE_O).poly([[46, 16], [51, 16], [51, 38], [46, 38]], MARBLE, STONE_O).done();
    pt.tube([[7, 15, 2], [14, 7, 2], [28, 3, 2], [42, 7, 2], [49, 15, 2]], 2, MARBLE, STONE_O).done();
    disc(x, 28, 3, 4, STONE_O); disc(x, 28, 3, 3, '#fff3b0'); disc(x, 30, 2, 3, STONE_O); disc(x, 30, 2, 2, '#e8ecf2');
    px(x, '#c8cfdc', 30, 2, 2, 2);
    for (const X of [5, 46]) { px(x, STONE_O, X - 1, 37, 7, 2); for (let k = 0; k < 10; k++) if (h2(X, k) > .35) px(x, k % 3 ? MOSS[1] : MOSS[3], X + (k % 2) * 4, 36 - k, 1, 1); }
    grassRim(x, 28, 36, 24, 5, 31);
  }
  if (id === 'lago') { [c, x] = canvas(48, 44); ax = 24; ay = 34;
    // píer de madeira entrando na água + santuário com orbe
    for (let Y = 30; Y < 44; Y++) { px(x, P.ink, 15, Y, 18, 1); px(x, Y % 3 ? P.wood : P.woodD, 16, Y, 16, 1); } px(x, P.woodL, 16, 30, 16, 1); for (const X of [15, 31]) px(x, '#3a2216', X, 34, 2, 10);
    softShadow(x, 25, 33, 9, 2, .3); const pt = painter(x);
    pt.poly([[17, 33], [31, 33], [29, 27], [19, 27]], STONE, STONE_O, .2).poly([[20, 27], [28, 27], [27, 14], [21, 14]], STONE, STONE_O).poly([[17, 14], [31, 14], [28, 9], [20, 9]], STONE, STONE_O, .3).done();
    disc(x, 24, 6, 4, STONE_O); disc(x, 24, 6, 3, '#4f86e6'); disc(x, 23, 5, 1, '#e8f8ff');
    for (const X of [6, 42]) { px(x, STONE_O, X - 2, 18, 5, 15); px(x, STONE[2], X - 1, 19, 3, 13); px(x, STONE_O, X - 3, 15, 7, 4); px(x, '#ffd84a', X - 1, 16, 3, 2); }
    grassRim(x, 24, 31, 22, 4, 41); }
  if (id === 'gigante') { [c, x] = canvas(96, 60); ax = 48; ay = 50;
    softShadow(x, 48, 50, 44, 6, .3); const pt = painter(x);
    painter(x).ell(48, 48, 44, 9, EARTH, '#3a2216', -.1).done();
    // cabeça de pedra caída, com rachaduras e musgo
    pt.ell(36, 32, 22, 18, STONE, STONE_O, .05).done();
    pt.poly([[18, 26], [30, 20], [34, 24], [22, 30]], STONE, STONE_O, .2).poly([[40, 20], [52, 24], [50, 30], [38, 26]], STONE, STONE_O, .2).done();       // sobrancelhas
    px(x, '#2b3240', 24, 28, 7, 4); px(x, '#2b3240', 40, 28, 7, 4); px(x, '#9ff3ff', 27, 29, 2, 2); px(x, '#9ff3ff', 43, 29, 2, 2);                   // olhos
    pt.poly([[33, 30], [38, 30], [40, 40], [31, 40]], STONE, STONE_O, .1).done(); px(x, STONE_O, 26, 44, 20, 2); px(x, STONE[0], 28, 44, 16, 1);       // nariz e boca
    for (const [X, Y] of [[20, 18], [50, 40], [44, 16]]) { px(x, STONE_O, X, Y, 1, 4); px(x, STONE_O, X + 1, Y + 4, 1, 3); }
    for (let i = 0; i < 40; i++) { const a = 3.4 + h2(i, 2) * 2.6, X = Math.round(36 + Math.cos(a) * 21), Y = Math.round(32 + Math.sin(a) * 17); px(x, MOSS[h2(i, 4) > .5 ? 2 : 1], X, Y, 2, 1); }
    // mão gigante saindo da terra
    pt.poly([[66, 50], [84, 50], [82, 30], [68, 30]], STONE, STONE_O).done();
    for (let f = 0; f < 4; f++) pt.tube([[69 + f * 4, 31, 2], [68 + f * 4.4, 20 - (f === 1 || f === 2 ? 5 : 0), 1.8]], 2, STONE, STONE_O); pt.tube([[83, 40, 2.2], [90, 32, 1.8]], 2, STONE, STONE_O); pt.done();
    for (let k = 0; k < 14; k++) if (h2(k, 9) > .3) px(x, k % 3 ? MOSS[1] : MOSS[3], 67 + (k % 4) * 4, 48 - k, 1, 1);
    grassRim(x, 48, 48, 44, 9, 43); }
  if (id === 'acampamento') { [c, x] = canvas(84, 46); ax = 42; ay = 38;
    softShadow(x, 42, 38, 40, 6, .25); const pt = painter(x), CLOTH = ['#6a4a2a', '#8a6a3c', '#b8945a', '#d8b878'], CLOTH2 = ['#3a4a5a', '#4e627a', '#6a82a0', '#8aa2c0'];
    for (const [X, P2, torn] of [[18, CLOTH, true], [66, CLOTH2, false]]) { pt.poly([[X - 14, 36], [X, 12], [X + 14, 36]], P2, P.ink, .1).done(); px(x, '#140c08', X - 4, 26, 8, 10); px(x, P.ink, X - 1, 10, 2, 4); px(x, P.woodD, X, 8, 1, 4);
      if (torn) { px(x, '#140c08', X + 4, 20, 3, 4); px(x, '#140c08', X - 8, 30, 3, 2); } }
    // fogueira apagada com pedras e toras, caixotes
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; px(x, i % 2 ? P.st2 : P.st3, Math.round(42 + Math.cos(a) * 6) - 1, Math.round(36 + Math.sin(a) * 3), 2, 2); }
    px(x, '#2a1a10', 39, 35, 7, 2); px(x, '#5a3a22', 38, 34, 9, 1); px(x, '#d0622a', 41, 35, 1, 1);
    pt.poly([[28, 40], [36, 40], [36, 44], [28, 44]], ['#5a3420', '#7a4a2a', '#9a6538', '#b8814a'], P.ink).poly([[48, 42], [58, 42], [58, 46], [48, 46]], ['#5a3420', '#7a4a2a', '#9a6538', '#b8814a'], P.ink).done();
    px(x, P.ink, 74, 36, 8, 8); px(x, P.woodL, 75, 37, 6, 6); px(x, P.woodD, 75, 39, 6, 1); px(x, P.woodD, 77, 37, 1, 6);
    grassRim(x, 42, 38, 40, 6, 47); }
  if (id === 'cristais') { [c, x] = canvas(66, 54); ax = 33; ay = 46;
    softShadow(x, 33, 46, 30, 5, .3); painter(x).ell(33, 44, 28, 7, ['#4d5566', '#6e7789', '#939cae', '#c3cad6'], STONE_O).done();
    const pt = painter(x), CR = [['#2a3a7a', '#3f6fc0', '#7fb0f5', '#e8f8ff'], ['#4a2a7a', '#7a4ac0', '#b08af0', '#f4e8ff'], ['#7a2a5a', '#c04a8a', '#f08ac0', '#ffe8f4'], ['#1a5a6a', '#2a9ab0', '#7fe0f0', '#e8ffff']];
    for (const [X, Y, h, w, ci, lean] of [[18, 44, 18, 4, 0, -4], [44, 44, 22, 5, 1, 3], [32, 46, 34, 6, 3, 0], [24, 46, 12, 3, 2, -2], [52, 45, 12, 3, 0, 5], [12, 45, 9, 3, 1, -3], [38, 46, 14, 3, 2, 2]].sort((a, b) => b[2] - a[2]))
      pt.poly([[X - w, Y], [X - w + 1 + lean * .3, Y - h * .75], [X + lean, Y - h], [X + w - 1 + lean * .5, Y - h * .7], [X + w, Y]], CR[ci], '#140c20').done();
    grassRim(x, 33, 45, 30, 7, 53); }
  if (id === 'cemiterio') { [c, x] = canvas(88, 54); ax = 44; ay = 46;
    softShadow(x, 44, 46, 42, 6, .25); const pt = painter(x);
    // árvore morta
    pt.tube([[76, 44, 3], [74, 32, 2.4], [78, 20, 1.6], [84, 14, .8]], 2, ['#2a1a10', '#3a2618', '#4a3220', '#5a4030'], '#140a06').tube([[75, 30, 1.4], [68, 22, .7]], 1, ['#2a1a10', '#3a2618', '#4a3220', '#5a4030'], '#140a06').tube([[77, 24, 1.2], [70, 14, .5]], 1, ['#2a1a10', '#3a2618', '#4a3220', '#5a4030'], '#140a06').done();
    // lápides em fileiras
    const graves = [[14, 28], [30, 27], [46, 28], [62, 27], [8, 42], [24, 43], [40, 42], [56, 43]];
    for (const [X, Y] of graves) { px(x, 'rgba(10,30,20,.3)', X - 3, Y, 9, 2); const cross = (X + Y) % 3 === 0;
      if (cross) { pt.poly([[X - 1, Y], [X - 1, Y - 12], [X + 2, Y - 12], [X + 2, Y]], STONE, STONE_O).poly([[X - 4, Y - 9], [X + 5, Y - 9], [X + 5, Y - 7], [X - 4, Y - 7]], STONE, STONE_O).done(); }
      else { pt.poly([[X - 4, Y], [X - 4, Y - 8], [X - 2, Y - 11], [X + 3, Y - 11], [X + 5, Y - 8], [X + 5, Y]], STONE, STONE_O).done(); px(x, STONE[0], X - 1, Y - 7, 4, 1); px(x, STONE[0], X - 1, Y - 5, 3, 1); }
      px(x, '#4a3a24', X - 3, Y + 1, 8, 3); px(x, MOSS[1], X - 4, Y - 1, 2, 1); }
    // cerca de ferro
    for (let X = 2; X < 70; X += 4) { px(x, '#1a1c22', X, 46, 1, 6); px(x, '#3a3e48', X, 45, 1, 1); } px(x, '#1a1c22', 2, 48, 68, 1);
    grassRim(x, 44, 46, 42, 6, 59); }
  if (id === 'portal') { [c, x] = canvas(62, 66); ax = 31; ay = 58;
    softShadow(x, 31, 58, 28, 4, .3); const pt = painter(x), DS = ['#2a2e3a', '#454b5e', '#626a80', '#868ea4'];
    pt.poly([[6, 58], [6, 18], [16, 18], [16, 58]], DS, '#101218').poly([[46, 58], [46, 18], [56, 18], [56, 58]], DS, '#101218').done();
    pt.tube([[11, 20, 6], [18, 8, 5], [31, 3, 5], [44, 8, 5], [51, 20, 6]], 5, DS, '#101218').done();
    for (const [X, Y] of [[11, 30], [11, 42], [51, 30], [51, 42], [31, 4]]) { px(x, '#2a1040', X - 1, Y - 2, 3, 5); px(x, '#d0a0ff', X, Y - 1, 1, 3); }
    px(x, '#101218', 2, 56, 58, 4); px(x, DS[2], 3, 56, 56, 1);
    for (let k = 0; k < 20; k++) if (h2(k, 3) > .35) px(x, k % 3 ? MOSS[0] : MOSS[2], 7 + (k % 3), 56 - k * 2, 1, 1);
    grassRim(x, 31, 58, 28, 4, 61); }
  if (id === 'ninho') { [c, x] = canvas(84, 50); ax = 42; ay = 42;
    softShadow(x, 42, 42, 40, 6, .3); const TW = ['#3a2216', '#5a3420', '#7a4a2a', '#9a6538'], pt = painter(x);
    pt.ell(42, 36, 38, 11, TW, '#1e120a').done();
    x.fillStyle = '#2a1a10'; x.beginPath(); x.ellipse(42, 33, 28, 7, 0, 0, 6.283); x.fill();
    // galhos trançados na borda
    for (let i = 0; i < 70; i++) { const a = h2(i, 1) * 6.283, rr2 = .8 + h2(i, 2) * .25, X = Math.round(42 + Math.cos(a) * 36 * rr2), Y = Math.round(36 + Math.sin(a) * 10 * rr2), L2 = 3 + Math.floor(h2(i, 3) * 6); for (let k = 0; k < L2; k++) px(x, TW[(i + k) % 4], X + k - 2, Y + Math.round((k - 2) * (h2(i, 4) - .5)), 1, 1); }
    // três ovos
    for (const [X, Y, P3] of [[32, 30, ['#7a1a10', '#c0442a', '#f08a5a', '#ffd0a8']], [44, 26, ['#1a4a40', '#2f8a6a', '#7ad0a8', '#e0fff0']], [54, 31, ['#3a2a6a', '#6e4a9a', '#b08ad0', '#f0e0ff']]]) { pt.ell(X, Y, 5, 7, P3, '#140a08').done(); px(x, P3[0], X - 2, Y + 1, 1, 1); px(x, P3[0], X + 2, Y - 2, 1, 1); }
    // ossos e escamas espalhadas, neve
    for (const [X, Y] of [[8, 44], [74, 44], [20, 46]]) { px(x, '#3a2818', X - 1, Y - 1, 6, 3); px(x, '#efe2bf', X, Y, 4, 1); }
    for (let i = 0; i < 14; i++) px(x, ['#c0442a', '#2f8a6a', '#6e4a9a'][i % 3], 6 + Math.floor(h2(i, 7) * 72), 42 + Math.floor(h2(i, 8) * 6), 2, 1);
    for (let i = 0; i < 30; i++) px(x, '#ffffff', Math.floor(h2(i, 9) * 84), 22 + Math.floor(h2(i, 10) * 26), 1, 1); }
  return LM_SPR[id] = { c, ax, ay };
}
function drawLandmark(x, l, t) {
  const s = lmSprite(l.id); x.drawImage(s.c, l.x - s.ax, l.y - s.ay);
  const pul = .6 + .4 * Math.sin(t * 2.2 + l.x);
  if (l.id === 'ruinas') { x.globalAlpha = pul; for (const [a, b] of [[0, 0], [3, 0], [6, 1], [1, 4], [4, 5], [7, 6], [2, 9], [5, 10], [8, 12]]) px(x, P.cy2, l.x + 7 + a, l.y - 19 + b, 1, 2); x.globalAlpha = 1; glow(x, l.x + 12, l.y - 12, 9, P.cy, .1 * pul); }
  if (l.id === 'caverna') { x.globalAlpha = pul; [[-11, -14], [-11, -8], [10, -14], [10, -8], [-3, -23], [3, -23]].forEach(([a, b]) => px(x, P.cy2, l.x + a, l.y + b - 6, 2, 3)); x.globalAlpha = 1; }
  if (l.id === 'buraco') glow(x, l.x, l.y - 8, 12, '#6e4a8a', .12 * pul);
  if (l.id === 'circulo') { glow(x, l.x, l.y - 10, 10, P.fire3, .1 * pul); px(x, P.fire4, l.x - 1, l.y - 12, 2, 2); }
  if (l.id === 'arvore') { x.globalAlpha = pul; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; px(x, P.cy2, Math.round(l.x + Math.cos(a) * (10 + (i % 3) * 4)), Math.round(l.y + Math.sin(a) * 4), 2, 1); } x.globalAlpha = 1; for (let i = 0; i < 5; i++) { const ph = (t * .3 + i / 5) % 1; x.globalAlpha = 1 - ph; px(x, P.cy2, Math.round(l.x + Math.sin(i * 2.3 + t) * 16), Math.round(l.y - 20 - ph * 30), 1, 1); } x.globalAlpha = 1; }
  if (l.id === 'poco') { glow(x, l.x, l.y - 6, 12, P.cy2, .14 * pul); px(x, '#bfe6f5', l.x - 4 + Math.round(Math.sin(t) * 3), l.y - 8, 3, 1); }
  if (l.id === 'torre') glow(x, l.x, l.y - 30, 6, P.fire3, .12);
  if (l.id === 'lago') { glow(x, l.x, l.y - 28, 9, '#9fd8ff', .16 * pul); for (const X of [-18, 18]) glow(x, l.x + X, l.y - 17, 5, P.fire3, .12); }
  if (l.id === 'gigante') { x.globalAlpha = pul; px(x, '#9ff3ff', l.x - 21, l.y - 21, 2, 2); px(x, '#9ff3ff', l.x - 5, l.y - 21, 2, 2); x.globalAlpha = 1; }
  if (l.id === 'acampamento') smoke(x, l.x + 1, l.y - 4, t, 4, '#98a4ac');
  if (l.id === 'cristais') { glow(x, l.x, l.y - 16, 22, '#b08af0', .12 * pul); for (let i = 0; i < 5; i++) { const ph = (t * .4 + i / 5) % 1; x.globalAlpha = Math.sin(ph * Math.PI); px(x, i % 2 ? '#e8f8ff' : '#f4e8ff', Math.round(l.x - 20 + i * 10 + Math.sin(t + i) * 3), Math.round(l.y - 10 - ph * 30), 1, 1); } x.globalAlpha = 1; }
  if (l.id === 'cemiterio') { for (let i = 0; i < 4; i++) { const ph = (t * .15 + i / 4) % 1, X = l.x - 30 + i * 18 + Math.sin(t * .8 + i * 2) * 6, Y = l.y - 14 - ph * 24; x.globalAlpha = Math.sin(ph * Math.PI) * .8; glow(x, X, Y, 4, '#a8ffd8', .2); px(x, '#e8fff4', Math.round(X), Math.round(Y), 2, 2); } x.globalAlpha = 1; }
  if (l.id === 'portal') { const cx2 = l.x, cy2 = l.y - 30; x.fillStyle = '#12061e'; x.beginPath(); x.ellipse(cx2, cy2 + 4, 14, 22, 0, 0, 6.283); x.fill();
    for (let i = 0; i < 40; i++) { const a = i * .5 + t * 2.2, rr2 = (i / 40) * 13; x.globalAlpha = .8 * (1 - i / 40) + .2; px(x, i % 3 ? '#9a5ad0' : '#d0a0ff', Math.round(cx2 + Math.cos(a) * rr2), Math.round(cy2 + 4 + Math.sin(a) * rr2 * 1.6), 2, 2); }
    x.globalAlpha = 1; glow(x, cx2, cy2 + 4, 16, '#9a5ad0', .18 * pul); }
  if (l.id === 'ninho') { for (const [X, Y, col] of [[-10, -12, '#ff9a3a'], [2, -16, '#5ac08e'], [12, -11, '#b08ad0']]) glow(x, l.x + X, l.y + Y, 6, col, .1 + .08 * Math.sin(t * 3 + X)); }
}
const LM_LIGHT = { ruinas: 22, caverna: 18, buraco: 20, circulo: 22, arvore: 30, poco: 24, torre: 18, costela: 0, lago: 26, gigante: 16, acampamento: 14, cristais: 30, cemiterio: 20, portal: 30, ninho: 22 };

// ---------------------------------------------------------------- mundo desconhecido (névoa que some onde você passa)
const FOG_S = 4, [fogC, fogX] = canvas(Math.ceil(WW / FOG_S), Math.ceil(WH / FOG_S));
let fogKey = '', fogDirty = false;
function fogInit(user) {
  fogKey = 'eryon_fog_' + user;
  fogX.globalCompositeOperation = 'source-over'; fogX.fillStyle = '#05090a'; fogX.fillRect(0, 0, fogC.width, fogC.height);
  revealAt(C.x, C.y, 245);
  try { const s = localStorage.getItem(fogKey); if (s) { const img = new Image(); img.onload = () => { fogX.globalCompositeOperation = 'destination-in'; fogX.drawImage(img, 0, 0); fogX.globalCompositeOperation = 'source-over'; revealAt(C.x, C.y, 245); }; img.src = s; } } catch { }
}
function revealAt(wx, wy, r) {
  fogX.globalCompositeOperation = 'destination-out';
  const cx = wx / FOG_S, cy = wy / FOG_S, rr2 = r / FOG_S;
  for (let k = 0; k < 3; k++) { fogX.globalAlpha = k === 2 ? 1 : .35; disc(fogX, cx, cy, Math.round(rr2 * (1 - k * .12) + 2), '#000'); }
  fogX.globalAlpha = 1; fogX.globalCompositeOperation = 'source-over'; fogDirty = true;
}
setInterval(() => { if (!fogDirty || !fogKey) return; fogDirty = false; try { localStorage.setItem(fogKey, fogC.toDataURL()); } catch { } }, 8000);
function drawFog(x, li, ti, cw, ch) { x.imageSmoothingEnabled = false; x.drawImage(fogC, li / FOG_S, ti / FOG_S, cw / FOG_S, ch / FOG_S, 0, 0, cw, ch); }

// ---------------------------------------------------------------- descobertas
function checkDiscover(p) {
  if (p.room) return;
  for (const l of LANDMARKS) if (!FOUND.has(l.id) && Math.hypot(p.x - l.x, p.y - l.y) < l.r) { FOUND.add(l.id); send({ t: 'discover', id: l.id }); showDiscovery(l); updFound(); }
}
// ---------------------------------------------------------------- animação de descoberta (tela cheia, estilo jogo)
const LM_FX = {
  costela: { aura: '#ff7a3a', cols: ['#ffd84a', '#ff9a3a', '#ff5a2a'], kind: 'ember', lore: 'Os ossos do dragão que caiu antes de Eryon existir.' },
  ruinas: { aura: '#3fd0e0', cols: ['#9ff3ff', '#3fd0e0', '#e8ffff'], kind: 'rune', lore: 'Uma inscrição antiga brilha… ninguém sabe ler.' },
  torre: { aura: '#ffd84a', cols: ['#fff3b0', '#ffd84a', '#f2a33a'], kind: 'gold', lore: 'A luz da janela nunca se apaga.' },
  caverna: { aura: '#3fd0e0', cols: ['#9ff3ff', '#3fd0e0', '#6f9be0'], kind: 'crystal', lore: 'Cristais azuis iluminam o caminho para baixo.' },
  buraco: { aura: '#9a5ad0', cols: ['#d0a0ff', '#9a5ad0', '#6e4a8a'], kind: 'swirl', lore: 'Dizem que não tem fundo.' },
  circulo: { aura: '#3fd0e0', cols: ['#9ff3ff', '#3fd0e0', '#fff3b0'], kind: 'rune', lore: 'As runas acordam quando alguém chega perto.' },
  arvore: { aura: '#84c65a', cols: ['#84c65a', '#47994a', '#9ff3ff'], kind: 'leaf', lore: 'A árvore mais velha da floresta. Ela respira.' },
  poco: { aura: '#c8d8ff', cols: ['#ffffff', '#c8d8ff', '#fff3b0'], kind: 'star', lore: 'Na água, a lua aparece mesmo de dia.' },
  lago: { aura: '#9fd8ff', cols: ['#ffffff', '#9fd8ff', '#4f86e6'], kind: 'star', lore: 'Quem olha a água vê o próprio reflexo… e mais alguém.' },
  gigante: { aura: '#c3cad6', cols: ['#e8ecf2', '#9ff3ff', '#84c65a'], kind: 'rune', lore: 'Um gigante de pedra dorme aqui desde antes dos dragões.' },
  acampamento: { aura: '#ff9a3a', cols: ['#ffd84a', '#ff9a3a', '#c0442a'], kind: 'ember', lore: 'Alguém saiu às pressas. O fogo ainda está morno.' },
  cristais: { aura: '#d0a0ff', cols: ['#ffffff', '#d0a0ff', '#9ff3ff'], kind: 'crystal', lore: 'Os cristais cantam baixinho quando o vento passa.' },
  cemiterio: { aura: '#a8ffd8', cols: ['#e8fff4', '#a8ffd8', '#6ad0a0'], kind: 'rune', lore: 'Os nomes nas lápides são de gente que ainda não nasceu.' },
  portal: { aura: '#9a5ad0', cols: ['#d0a0ff', '#9a5ad0', '#6e4a8a'], kind: 'swirl', lore: 'Atravesse e volte para a vila num piscar de olhos.' },
  ninho: { aura: '#ff7a3a', cols: ['#ffd84a', '#ff9a3a', '#ff5a2a'], kind: 'ember', lore: 'Três ovos quentes. Os dragões do céu sempre voltam aqui.' },
};
let discAnim = null;
function showDiscovery(l) {
  if (SND.ctx) { const w = SND.ctx.currentTime; [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => pluck(f, w + i * .12, .35, 2.2)); drum(w, .6); [1046.5, 1318.5, 1568].forEach((f, i) => pluck(f, w + .9 + i * .09, .18, 2.6)); }
  let cv = document.getElementById('discFx');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'discFx'; cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9;cursor:pointer;touch-action:none';
    cv.addEventListener('pointerdown', e => { e.preventDefault(); if (discAnim && performance.now() - discAnim.t0 > 900) discAnim.t0 = performance.now() - discAnim.T * 1000 + 450; }); document.body.appendChild(cv); }
  const D = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(innerWidth * D); cv.height = Math.round(innerHeight * D); cv.hidden = false;
  discAnim = { l, fx: LM_FX[l.id] || LM_FX.torre, t0: performance.now(), T: 5.6, parts: [], D, last: 0 };
  requestAnimationFrame(discFrame);
}
function discFrame(now) {
  const A0 = discAnim, cv = document.getElementById('discFx'); if (!A0 || !cv) return;
  const t = (now - A0.t0) / 1000, dt = Math.min(.05, (now - (A0.last || now)) / 1000); A0.last = now;
  if (t > A0.T) { cv.hidden = true; discAnim = null; return; }
  const x = cv.getContext('2d'), W = cv.width, H = cv.height, D = A0.D, fx = A0.fx, A = Math.min(1, t / .35) * Math.min(1, (A0.T - t) / .6);
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.imageSmoothingEnabled = false; x.globalAlpha = A;
  // fundo escuro com vinheta
  const g = x.createRadialGradient(W / 2, H * .44, 10, W / 2, H * .44, Math.max(W, H) * .7); g.addColorStop(0, 'rgba(10,16,40,.55)'); g.addColorStop(1, 'rgba(2,4,12,.92)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  // raios de luz girando
  const cx = W / 2, cy = H * .44, R = Math.max(W, H);
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) { const a = t * .25 + i / 14 * 6.283; x.globalAlpha = A * (.07 + .04 * Math.sin(t * 2 + i)); x.fillStyle = fx.aura; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a - .07) * R, cy + Math.sin(a - .07) * R); x.lineTo(cx + Math.cos(a + .07) * R, cy + Math.sin(a + .07) * R); x.fill(); }
  const ag = x.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * .42); ag.addColorStop(0, fx.aura); ag.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = A * (.35 + .1 * Math.sin(t * 3)); x.fillStyle = ag; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';
  // monumento ampliado (pula para a tela)
  const s = lmSprite(A0.l.id), k = Math.max(2, Math.floor(Math.min(W * .62 / s.c.width, H * .3 / s.c.height))), pop = Math.max(.02, t < .7 ? eOutBack(clamp(t / .7)) : 1), sc = k * pop, bob = Math.sin(t * 2) * k * .8;
  const sw = s.c.width * sc, sh = s.c.height * sc;
  x.globalAlpha = A; x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(cx, cy + sh * .45 + k * 2, Math.max(.5, sw * .42), k * 4, 0, 0, 6.283); x.fill();
  x.drawImage(s.c, Math.round(cx - sw / 2), Math.round(cy - sh / 2 + bob), Math.round(sw), Math.round(sh));
  // partículas de cada lugar
  const P0 = A0.parts, spawn = n => { for (let i = 0; i < n; i++) P0.push({ x: cx + (Math.random() - .5) * sw * .9, y: cy + (Math.random() - .3) * sh * .6, vx: 0, vy: 0, life: 0, max: 1.4 + Math.random() * 1.6, c: fx.cols[Math.floor(Math.random() * fx.cols.length)], a: Math.random() * 6.283, r: Math.random() }); };
  if (t < A0.T - .8) spawn(fx.kind === 'swirl' ? 3 : 2);
  const u = Math.max(2, Math.round(k * .6));
  for (let i = P0.length - 1; i >= 0; i--) { const q = P0[i]; q.life += dt; if (q.life > q.max) { P0.splice(i, 1); continue; }
    const f = q.life / q.max;
    if (fx.kind === 'ember') { q.vy -= 40 * D * dt; q.vx = Math.sin(q.life * 4 + q.a) * 20 * D; }
    else if (fx.kind === 'rune' || fx.kind === 'gold' || fx.kind === 'crystal') { q.vy = -30 * D; q.vx = Math.sin(q.life * 2 + q.a) * 12 * D; }
    else if (fx.kind === 'leaf') { if (!q.init) { q.init = 1; q.y = cy - sh * .6 + Math.random() * sh * .3; } q.vy = 28 * D; q.vx = Math.sin(q.life * 3 + q.a) * 30 * D; }
    else if (fx.kind === 'star') { q.vx = 0; q.vy = -8 * D; }
    else if (fx.kind === 'swirl') { if (!q.init) { q.init = 1; q.rad = Math.min(W, H) * (.3 + q.r * .2); } q.a += dt * 2.2; q.rad *= 1 - dt * .9; q.x = cx + Math.cos(q.a) * q.rad; q.y = cy + Math.sin(q.a) * q.rad * .45; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    const al = Math.sin(f * Math.PI) * A; x.globalAlpha = al; x.fillStyle = q.c; const X = Math.round(q.x), Y = Math.round(q.y);
    if (fx.kind === 'star' || fx.kind === 'crystal') { const tw = .5 + .5 * Math.sin(q.life * 9 + q.a); x.fillRect(X - u * 1.5 * tw, Y - u / 4, u * 3 * tw, u / 2); x.fillRect(X - u / 4, Y - u * 1.5 * tw, u / 2, u * 3 * tw); }
    else if (fx.kind === 'rune') { x.fillRect(X, Y, u, u * 2); x.fillRect(X, Y, u * 2, u / 2 + 1); if (q.r > .5) x.fillRect(X + u, Y + u, u, u); }
    else if (fx.kind === 'leaf') { x.fillRect(X, Y, u * 2, u); x.fillRect(X + u / 2, Y - u / 2, u, u * 2); }
    else x.fillRect(X, Y, u, u);
  }
  // textos
  x.globalAlpha = A; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const shadowText = (txt, X, Y, font, col, lw) => { x.font = font; x.lineWidth = lw; x.strokeStyle = '#140e06'; x.strokeText(txt, X, Y); x.fillStyle = col; x.fillText(txt, X, Y); };
  const fs1 = Math.round(Math.min(W * .07, 30 * D)), tp = t < .5 ? eOutBack(clamp(t / .5)) : 1;
  x.save(); x.translate(cx, H * .14); x.scale(tp, tp); shadowText('DESCOBERTA!', 0, 0, `400 ${fs1}px P2P, monospace`, '#ffd84a', fs1 * .35); x.restore();
  const name = A0.l.name, n = clamp(Math.floor((t - .45) * 24), 0, name.length), fs2 = Math.round(Math.min(W * .075, 34 * D));
  if (n > 0) shadowText(name.slice(0, n), cx, H * .22, `700 ${fs2}px Pix, monospace`, '#fff8e0', fs2 * .3);
  if (t > 1.1) { x.globalAlpha = A * clamp((t - 1.1) / .5); const fs3 = Math.round(Math.min(W * .045, 18 * D)); x.font = `700 ${fs3}px Pix, monospace`;
    const words = fx.lore.split(' '), lines = []; let ln = ''; for (const w2 of words) { if (x.measureText(ln + ' ' + w2).width > W * .8 && ln) { lines.push(ln); ln = w2; } else ln = ln ? ln + ' ' + w2 : w2; } lines.push(ln);
    lines.forEach((L2, i) => shadowText(L2, cx, H * .72 + i * fs3 * 1.35, `700 ${fs3}px Pix, monospace`, '#e8f4ff', fs3 * .3));
    const fs4 = Math.round(Math.min(W * .035, 13 * D)); shadowText(`${FOUND.size}/${LANDMARKS.length} lugares descobertos`, cx, H * .72 + lines.length * fs3 * 1.35 + fs4 * 1.4, `400 ${fs4}px P2P, monospace`, '#9ff3ff', fs4 * .35); }
  if (t > 2.2) { x.globalAlpha = A * (.5 + .5 * Math.sin(t * 5)); const fs5 = Math.round(Math.min(W * .035, 13 * D)); shadowText('toque para continuar', cx, H * .92, `700 ${fs5}px Pix, monospace`, '#c3cad6', fs5 * .3); }
  x.globalAlpha = 1;
  requestAnimationFrame(discFrame);
}
function updFound() { $('foundN').textContent = `${FOUND.size}/${LANDMARKS.length}`; }

// ---------------------------------------------------------------- cavernas (salas embaixo da terra)
function caveRoom(id) {
  const deep = id === 'abismo', w = 170, h = 130, [c, x] = canvas(w, h);
  for (let y = 0; y < h; y += 2) for (let X = 0; X < w; X += 2) { const n = vn(X * .08 + (deep ? 9 : 0), y * .08); px(x, n > .62 ? '#2b3138' : n > .4 ? '#1f2428' : '#171b1e', X, y, 2, 2); }
  px(x, '#0c0f11', 0, 0, w, 20); for (let X = 0; X < w; X += 6) px(x, '#2b3138', X, 14 + Math.floor(h2(X, 1) * 6), 6, 8);
  for (const [X, Y] of [[14, 40], [150, 46], [20, 104], [146, 100], [84, 30]]) { disc(x, X, Y, 7, P.ink); disc(x, X, Y, 6, P.st1); disc(x, X - 2, Y - 2, 3, P.st2); }
  const crystals = deep ? [[40, 60], [126, 70], [86, 92]] : [[46, 52], [118, 62]], shrooms = deep ? [[66, 110], [110, 108]] : [[30, 84], [92, 106], [136, 84]];
  for (const [X, Y] of crystals) { px(x, P.ink, X - 3, Y - 9, 7, 10); px(x, deep ? '#b06a9a' : P.cy, X - 2, Y - 8, 5, 8); px(x, deep ? '#f6b6d8' : P.cy2, X - 1, Y - 8, 1, 6); }
  for (const [X, Y] of shrooms) for (let k = 0; k < 3; k++) { px(x, '#f0ead6', X + k * 4, Y - 2, 1, 3); px(x, k % 2 ? P.cy2 : P.cy, X + k * 4 - 1, Y - 3, 3, 1); }
  if (deep) for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; px(x, '#9ff3ff', Math.round(85 + Math.cos(a) * 18), Math.round(66 + Math.sin(a) * 9), 2, 1); }
  px(x, P.ink, 75, 122, 20, 8); px(x, '#3a2618', 77, 123, 16, 7); for (let k = 0; k < 3; k++) px(x, P.wood, 78, 124 + k * 2, 14, 1);
  const spots = [...crystals.map(([X, Y], i) => ({ x: X, y: Y + 6, rx: 12, ry: 10, kind: 'cmine', label: 'Minerar cristal', node: (deep ? 'a' : 'g') + i })),
    ...shrooms.map(([X, Y], i) => ({ x: X + 4, y: Y + 4, rx: 12, ry: 9, kind: 'cherb', label: 'Colher cogumelos', node: (deep ? 'm' : 'n') + i }))];
  const block = [[0, 0, w, 24], [0, 0, 4, h], [w - 4, 0, w, h], ...crystals.map(([X, Y]) => [X - 4, Y - 6, X + 4, Y + 1])];
  const l = LM[deep ? 'buraco' : 'caverna'];
  return { id, name: deep ? 'Abismo das Runas' : 'Gruta dos Cristais', w, h, img: c, spawn: { x: 85, y: 112 }, door: { x: 85, y: 122 }, fire: null, block, spots, outside: { x: l.x, y: l.y + 10 }, dark: true, glows: crystals.map(([X, Y]) => [X, Y - 4, deep ? '#b06a9a' : P.cy]) };
}
