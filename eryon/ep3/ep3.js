// =====================================================================
// ERYON — EPISÓDIO 03: A PRIMEIRA GUILDA
// Roteiro cinematográfico rodando DENTRO do motor do jogo (modo ?cine=1).
// O mapa, as construções e os sprites são os do jogo; aqui só controlamos
// câmera, relógio, personagens, legendas e telas. Nada é salvo no mundo.
// =====================================================================
(function () {
const SEG = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const EASE = k => k * k * (3 - 2 * k);
const L2 = (a, b, k) => a + (b - a) * k;
let seed = 1; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
// ---------- relógio virtual (o render controla o tempo de cada quadro)
window.__VT = 0;
// ---------- castelo pronto (como a narração conta) e mundo sem conexão
CSTATE = { pedra: 2100, lenha: 250, top: [], stages: (() => { let p = 0, l = 0; return [['fundacao', 'Fundação', 150, 0], ['muralha', 'Muralha da frente', 300, 0], ['laterais', 'Muralhas laterais', 300, 0], ['torres', 'Torres dos cantos', 400, 0], ['portao', 'Portão', 200, 100], ['torre', 'Torre do Rei', 500, 0], ['telhados', 'Telhados e bandeiras', 250, 150]].map(([id, name, pedra, lenha]) => { const o = { id, name, pedra, lenha, p0: p, l0: l }; p += pedra; l += lenha; return o; }); })() };
cam.mode = 'free'; myId = -1; nextFlight = Infinity;

// ---------- personagens
const NPC = [];
const SH = h => shadeHex(h, .62);
function mk(o) { const q = { id: 1000 + NPC.length, room: '', face: 1, moving: false, ph: NPC.length * 7 % 97, ...o };
  q.ch = o.sp ? charBuilder(o.sp) : charFor(o.username || ('npc' + q.id), o.look || null); if (!q.look) q.look = o.cls ? { cls: o.cls } : (o.look || {}); NPC.push(q); return q; }
const skin = s => ({ skin: s, skinD: SH(s) });
// moradores em destaque (usernames dos comentários)
const CADU = mk({ username: 'eucaduu_', roleText: 'Candidato à liderança', sp: { hair: '#5a3a26', shirt: '#3f7ab0', shirtD: '#2c4f7a', pants: '#1d3550', cape: '#a83a32', ...skin('#e8b48c') } });
const YAS = mk({ username: 'yassermalala175', roleText: 'Yásser · Guerreiro espadachim', look: { cls: 'guerreiro' }, sp: { hair: '#1a1208', beard: '#1a1208', armor: '#4a535c', rust: '#8b5e3c', pants: '#2b3138', boots: '#1a1208', cape: '#a83a32', ...skin('#c08060') } });
const KING = mk({ username: 'ivan_tomas794', roleText: 'King · Aventureiro', look: { cls: 'arqueira' }, sp: { hair: '#ffd84a', crown: true, shirt: '#3c5d4a', shirtD: '#1c3831', pants: '#4a2f22', cape: '#4e6c4a', ...skin('#f2c9a4') } });
const AYKA = mk({ username: 'grazzy_solive07', roleText: 'Ayka · Espiã', look: { equipTool: 'daggers' }, sp: { hair: '#1a1208', longHair: true, shirt: '#2b3138', shirtD: '#1a1d24', pants: '#1a1d24', cape: '#1d3550', ...skin('#e8b48c') } });
const BLU = mk({ username: 'theuxvs_', roleText: 'Blü · Necromante', look: { equipTool: 'staff' }, sp: { hair: '#c4ccd0', shirt: '#3a2650', shirtD: '#1e0f30', pants: '#1d3550', cape: '#1a1208', hat: 'mago', ...skin('#e4d0c8') } });
const XAMA = mk({ username: 'mano.icee', roleText: 'Xamã', look: { equipTool: 'staff' }, sp: { hair: '#1a1208', longHair: true, beard: '#1a1208', shirt: '#3c5d4a', shirtD: '#1c3831', pants: '#4a2f22', cape: '#8b5e3c', ...skin('#8b5e3c') } });
const GUARD = mk({ username: 'kennidymessias1', roleText: 'Guarda', look: { cls: 'guerreiro' }, sp: { hair: '#5a3a26', armor: '#6e7a84', rust: '#4a535c', pants: '#2b3138', boots: '#1a1208', cape: '#1d3550', ...skin('#c08060') } });
const YOU = mk({ username: 'você', roleText: 'Novo morador', look: { cls: 'lenhador' }, sp: { hair: '#d0622a', shirt: '#a83a32', shirtD: '#5a2418', pants: '#3c5f9a', ...skin('#f2c9a4') } });
// moradores dos episódios anteriores (continuidade)
const OLD = ['heitor_morrone', 'lorhan_cristian', 'maicon.sg2010', 'pablopaesrocha', '_ray_hpl', 'paocombiscoito', 'altanat19', 'eo_preto.031', 'bio_leocordeiro', 'kaguya.xs'].map(u => mk({ username: u }));
const [HEITOR, LORHAN, MAICON, PABLO, RAY, PAO, VALIS, GERALD, FENRIR, NYX] = OLD;
// multidão (sem @ — não inventamos usernames)
const R0 = rng(303); const pick = a => a[Math.floor(R0() * a.length)];
const HAIRS2 = ['#d0622a', '#ffd84a', '#1a1208', '#5a3a26', '#8b5e3c', '#c4ccd0', '#a83a32'], SHIRTS2 = ['#a83a32', '#3f7ab0', '#6e4a8a', '#3c5d4a', '#d0622a', '#e4d0a0', '#4a535c', '#b06a9a'], PANTS2 = ['#3c5f9a', '#4a2f22', '#2b3138', '#3c5d4a', '#6b4630', '#1d3550'], SKINS2 = ['#e8b48c', '#f2c9a4', '#c08060', '#8b5e3c', '#5a3a26'];
const crowdLook = () => { const sh = pick(SHIRTS2), sk = pick(SKINS2); return { hair: pick(HAIRS2), shirt: sh, shirtD: SH(sh), pants: pick(PANTS2), longHair: R0() < .4, beard: R0() < .25 ? pick(HAIRS2) : undefined, hat: R0() < .2 ? pick(['palha', 'bone']) : undefined, cape: R0() < .2 ? pick(['#4e6c4a', '#1d3550', '#a83a32']) : undefined, elfEars: R0() < .12, ...skin(sk) }; };
const ROADS = [[[360, 622], [400, 566], [440, 520], [482, 475]], [[340, 642], [270, 640], [208, 624], [170, 630]], [[380, 644], [440, 664], [480, 690], [530, 712]], [[362, 664], [362, 720], [pathS(780), 780], [pathS(860), 860]], [[352, 650], [310, 700], [300, 790]], [[372, 652], [420, 700], [420, 786]], [[350, 628], [306, 560], [306, 522]], [[530, 712], [620, 742], [640, 700], [640, 670]]];
function along(pts, d) { let tot = 0; const L = []; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(l); tot += l; }
  let k = ((d % (tot * 2)) + tot * 2) % (tot * 2), back = false; if (k > tot) { k = tot * 2 - k; back = true; }
  for (let i = 0; i < L.length; i++) { if (k <= L[i] || i === L.length - 1) { const f = Math.min(1, k / L[i]), a = pts[i], b = pts[i + 1], dx = b[0] - a[0]; return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, face: (back ? -dx : dx) < 0 ? -1 : 1 }; } k -= L[i]; } return { x: pts[0][0], y: pts[0][1], face: 1 }; }
const CROWD = []; for (let i = 0; i < 64; i++) { const q = mk({ username: '_c' + i, noLabel: true, sp: crowdLook() }); q.road = ROADS[i % ROADS.length]; q.off = R0() * 400; q.sp2 = 14 + R0() * 12; q.arrive = i >= 40 ? 5 + (i - 40) * .12 : 0; CROWD.push(q); }
// trabalhadores (sem @): lenhadores na borda da floresta, ferreiro na forja
const WORK = [[176, 690, 'chop', -1], [552, 560, 'chop', 1], [250, 470, 'chop', -1], [470, 820, 'chop', 1]].map(([x, y, k, f]) => { const q = mk({ username: '_w' + x, noLabel: true, sp: crowdLook(), look: { cls: 'lenhador' } }); q.x = x; q.y = y; q.face = f; q.work = k; return q; });
// aventureiros que se juntam à guilda (sem @)
const ADV = [0, 1, 2, 3, 4].map(i => { const q = mk({ username: '_a' + i, noLabel: true, sp: { ...crowdLook(), cape: ['#a83a32', '#4e6c4a', '#1d3550', '#6e4a8a', '#a83a32'][i] }, look: { cls: ['guerreiro', 'arqueira', 'maga', 'guerreiro', 'arqueira'][i] } }); return q; });
const GUARDS2 = [0, 1].map(i => mk({ username: '_g' + i, noLabel: true, look: { cls: 'guerreiro' }, sp: { hair: '#1a1208', armor: '#6e7a84', rust: '#4a535c', pants: '#2b3138', boots: '#1a1208', cape: '#1d3550', ...skin(['#e8b48c', '#8b5e3c'][i]) } }));

// ---------- câmera: chaves (tempo, x, y, escala S, fase do dia)
const K = [
  [0, 340, 610, 2.4, .2], [4.6, 372, 650, 2.7, .2],                 // 01 · ontem 576
  [5.0, 372, 660, 2.7, .2], [8.4, 380, 712, 3.0, .2],                // 02 · hoje 800: chegadas
  [8.6, 380, 700, 3.0, .2], [11.2, 420, 760, 1.7, .2],               // cresceu: plano aberto
  [11.6, 420, 780, 1.7, .2], [14.8, 540, 1340, 3.0, .2],             // 03 · da clareira até o castelo
  [15.9, 546, 1336, 3.2, .2],
  [15.98, 266, 614, 8.0, .2], [16.8, 280, 616, 8.0, .2],             // casas
  [16.86, 362, 584, 9.0, .2], [17.45, 362, 588, 9.0, .2],            // bares (Taverna do Valis por fora)
  [17.5, 0, 0, 0, 0, 'taverna'], [18.4, 0, 0, 0, 0, 'taverna'],       // tavernas (por dentro)
  [18.46, 628, 660, 8.0, .2], [19.4, 640, 662, 8.0, .2],             // comércios: Praça da Feira e o Mercador
  [19.46, 470, 650, 4.0, .2], [21.3, 430, 662, 4.0, .2],             // ruas cheias de vida
  [21.4, 300, 600, 2.0, .2], [25.9, 420, 690, 2.2, .2],              // graças a vocês
  [26.4, 360, 640, 4.0, .2], [30.9, 360, 660, 5.0, .2],              // organização: praça cheia
  [31.4, 360, 664, 10.0, .2], [37.6, 360, 666, 12.0, .2],              // 04 · @eucaduu_
  [38.2, 366, 600, 10.0, .22], [44.9, 366, 604, 11.0, .22],            // 05 · Yásser funda a guilda
  [45.4, 378, 606, 10.0, .24], [49.9, 378, 606, 10.0, .26],            // King chega
  [50.4, 430, 540, 3.0, .42], [54.2, 505, 440, 4.0, .44],            // novos moradores misteriosos
  [54.8, 518, 400, 11.0, .45], [58.6, 532, 400, 11.0, .45],            // 06 · Ayka nas ruínas
  [59.25, 640, 2240, 11.0, .5], [63.0, 640, 2240, 12.0, .5],           // Blü no cemitério
  [63.45, 614, 882, 11.0, .47], [67.6, 614, 882, 12.0, .47],           // Xamã no Círculo de Pedras
  [68.3, 540, 1404, 6.0, .25], [70.6, 540, 1426, 8.0, .25],          // guardas no castelo
  [71.0, 488, 484, 9.0, .5], [76.0, 512, 430, 9.0, .52],             // 07 · exploradores na floresta
  [78.8, 540, 410, 10.0, .54], [83.4, 552, 406, 13.0, .55],           // a passagem secreta
  [88.2, 552, 404, 20.0, .55],                                        // o outro lado: escuridão
  [88.8, 352, 670, 6.0, .2], [96.6, 390, 664, 7.0, .2],              // 08 · novidade: o jogo
  [97.1, 392, 664, 7.0, .2], [104.5, 480, 590, 6.0, .2],             // explorar, conhecer, viver
  [105.0, 400, 640, 2.4, .2], [107.4, 400, 650, 2.2, .2],            // link na bio
  [107.9, 420, 800, 1.9, .2], [116.6, 440, 900, 1.6, .2],            // visão geral final
];
function camAt(T) { let i = 0; while (i < K.length - 1 && K[i + 1][0] <= T) i++; const a = K[i], b = K[i + 1] || a;
  if (a[5] || (b[5] && T >= b[0])) return { room: a[5] || b[5] };
  const cut = b[0] - a[0] < .2 || (i + 1 < K.length && Math.hypot(b[1] - a[1], b[2] - a[2]) > 900 && b[0] - a[0] < .6);
  const k = b === a || cut ? 0 : EASE(SEG(T, a[0], b[0])); return { x: L2(a[1], b[1], k), y: L2(a[2], b[2], k), s: L2(a[3], b[3], k), ph: L2(a[4], b[4], k) }; }

// ---------- cada personagem em cada instante
function place(q, x, y, face, moving) { q.x = x; q.y = y; q.tx = x; q.ty = y; if (face) q.face = face; q.moving = !!moving; }
function walk(q, pts, T, t0, speed) { const d = Math.max(0, T - t0) * speed; let tot = 0; for (let i = 0; i < pts.length - 1; i++) tot += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  if (d >= tot) { const e = pts[pts.length - 1]; place(q, e[0], e[1], null, false); return true; } const p2 = along(pts, d); place(q, p2.x, p2.y, p2.face, T > t0); return false; }
const act = (q, kind, T, every, dur) => { const n = Math.floor(T / every), t0 = n * every; q.act = T - t0 < dur ? { kind, t0, end: t0 + dur } : null; };
const say = (q, text, a, b, T) => { if (T >= a && T < b) { q.say = text; q.sayT = (performance.now() - (T - a) * 1000); } else q.say = null; };
function stage(T) {
  for (const q of NPC) { q.hidden = true; q.act = null; q.say = null; q.room = ''; }
  const show = (q, room = '') => { q.hidden = false; q.room = room; };
  const inRoom = camAt(T).room;
  // multidão nas ruas (todo o tempo na vila, exceto dentro da taverna)
  for (const q of CROWD) { if (T < q.arrive) continue; show(q); if (q.arrive) { const from = [[362, 900], [720, 760], [482, 470], [170, 630]][q.id % 4]; walk(q, [from, [from[0] * .25 + 270 + (q.id % 7 - 3) * 12, from[1] * .25 + 500 + (q.id % 5) * 7]], T, q.arrive, 30); if (!q.moving) q.face = q.id % 2 ? 1 : -1; continue; }
    const p2 = along(q.road, q.off + T * q.sp2); place(q, p2.x, p2.y, p2.face, Math.sin(T * .3 + q.id) > -.6); if (!q.moving) q.face = q.id % 2 ? 1 : -1; }
  for (const q of WORK) { show(q); place(q, q.x, q.y, q.face, false); act(q, 'chop', T + q.id * .7, 3.2, 2.4); }
  // praça: público ouvindo o @eucaduu_ (26–38 s)
  if (T >= 26 && T < 38.2) CROWD.slice(0, 24).forEach((q, i) => { const a = Math.PI * .15 + i / 24 * Math.PI * .7, r = 34 + (i % 3) * 8; place(q, 360 + Math.cos(a) * r * 1.2, 672 + Math.sin(a) * r * .5 + 6, q.x > 360 ? -1 : 1, false); });
  // moradores antigos nos seus lugares (continuidade dos episódios)
  show(PABLO); place(PABLO, 470, 684, 1, false); act(PABLO, 'hammer', T, 2.4, 2.0);
  show(RAY); place(RAY, 300, 730, 1, false); act(RAY, 'cook', T, 3.0, 2.4);
  show(HEITOR); place(HEITOR, 208, 632, -1, false); act(HEITOR, 'split', T + 1, 2.6, 1.8);
  show(LORHAN); place(LORHAN, 254, 596, 1, false); act(LORHAN, 'build', T + .5, 2.5, 2.0);
  show(MAICON); place(MAICON, 236, 668, -1, false); act(MAICON, 'build', T, 2.5, 2.0);
  show(PAO); place(PAO, 428, 740, 1, false); show(GERALD); { const p2 = along([[470, 500], [500, 470], [520, 450]], T * 10); place(GERALD, p2.x, p2.y, p2.face, true); }
  show(FENRIR); place(FENRIR, 560, 640, -1, false); show(NYX); place(NYX, 330, 610, 1, false);
  if (inRoom === 'taverna') { show(VALIS, 'taverna'); place(VALIS, 60, 40, 1, false); act(VALIS, 'serve', T, 2.2, 2.0);
    CROWD.slice(30, 38).forEach((q, i) => { show(q, 'taverna'); place(q, [56, 146, 56, 146, 44, 68, 158, 134][i], [82, 82, 116, 116, 70, 96, 104, 70][i], i % 2 ? -1 : 1, false); act(q, 'drink', T + i * .6, 3.4, 2.2); }); }
  else { show(VALIS); place(VALIS, 380, 600, -1, false); }
  // 04 · @eucaduu_ na praça
  if (T >= 26) { show(CADU); if (T < 31.4) walk(CADU, [[300, 700], [360, 672]], T, 27.5, 30); else place(CADU, 360, 672, 1, false); if (T >= 33 && T < 37.4) say(CADU, 'Eu cuido de Eryon com vocês!', 33, 37.4, T); }
  // 05 · Yásser e a primeira guilda (em frente à Taverna do Valis)
  if (T >= 36) { show(YAS); place(YAS, 362, 600, 1, false); if (T >= 39 && T < 50) act(YAS, 'sword', T, 2.8, 1.2); if (T >= 43 && T < 45.2) say(YAS, 'Quem vem comigo?', 43, 45.2, T);
    ADV.forEach((q, i) => { show(q); const dst = [[340, 612], [384, 612], [330, 600], [394, 600], [350, 622]][i]; walk(q, [[[250, 620], [470, 640], [300, 560], [440, 560], [362, 700]][i], dst], T, 39.6 + i * .5, 34); if (!q.moving) q.face = dst[0] > 362 ? -1 : 1; }); }
  if (T >= 45) { show(KING); walk(KING, [[470, 640], [430, 626], [392, 612]], T, 45.4, 30); if (!KING.moving) KING.face = -1; }
  // exploradores rumo às ruínas (71–90 s)
  if (T >= 70.9 && T < 90) { for (const [q, dx] of [[YAS, 0], [KING, -10], [AYKA, 10]]) { show(q); const done = walk(q, [[482 + dx, 492], [496 + dx, 452], [508 + dx, 425], [534 + dx * .6, 412]], T, 71 + (dx ? .4 : 0), 13); if (done) q.face = 1; } }
  // 06 · Ayka investigando as ruínas
  if (T >= 54.5 && T < 59.2) { show(AYKA); const p2 = along([[492, 412], [508, 404], [530, 410], [548, 400]], (T - 54.5) * 9); place(AYKA, p2.x, p2.y, p2.face, Math.sin(T * 1.7) > -.2); }
  // Blü no cemitério
  if (T >= 59 && T < 63.4) { show(BLU); place(BLU, 640, 2250, -1, false); BLU.act = { kind: 'magic', t0: Math.floor(T / 1.6) * 1.6, end: Math.floor(T / 1.6) * 1.6 + 1.6 }; }
  // Xamã no Círculo de Pedras
  if (T >= 63.2 && T < 68.2) { show(XAMA); place(XAMA, 614, 892, -1, false); XAMA.act = { kind: 'magic', t0: Math.floor(T / 1.6) * 1.6, end: Math.floor(T / 1.6) * 1.6 + 1.6 }; }
  // guarda patrulhando o castelo
  if (T >= 68 && T < 71) { show(GUARD); const p2 = along([[500, 1450], [580, 1450]], (T - 68) * 16); place(GUARD, p2.x, p2.y, p2.face, true); GUARDS2.forEach((q, i) => { show(q); place(q, [432, 648][i], 1446, i ? -1 : 1, false); }); }
  // 08 · você jogando
  if (T >= 88.8 && T < 105) { show(YOU); if (T < 92.4) walk(YOU, [[330, 676], [370, 668], [392, 664]], T, 88.9, 18); else if (T < 96.6) { place(YOU, 392, 664, 1, false); }
    else walk(YOU, [[392, 664], [430, 640], [470, 610], [500, 560]], T, 97.1, 16);
    if (T >= 92.6 && T < 96.4) { YOU.face = 1; YOU.act = { kind: 'chop', t0: 92.6 + Math.floor((T - 92.6) / 2.4) * 2.4, end: 92.6 + Math.floor((T - 92.6) / 2.4) * 2.4 + 2.4 }; }
    if (T >= 97.2 && T < 101) say(YOU, 'Cheguei em Eryon!', 97.2, 101, T); }
  return inRoom;
}

// ---------- a passagem secreta (cena narrativa: desenhada só no vídeo, não altera o mapa)
const PASS = { x: 554, y: 408 };
let PASS_SPR = null;
function passSprite() { if (PASS_SPR) return PASS_SPR; const [c, x] = canvas(44, 34), pt = painter(x), ST = ['#3e4554', '#59616f', '#79818f', '#9aa2b0'], O = '#14161c';
  pt.ell(22, 20, 21, 13, ST, O, .1).done(); pt.ell(8, 24, 8, 7, ST, O).ell(36, 25, 8, 7, ST, O, -.1).done();
  for (let i = 0; i < 40; i++) { const X = Math.round(22 + (h2(i, 3) - .5) * 38), Y = Math.round(10 + h2(i, 5) * 8); px(x, i % 3 ? '#2f7a40' : '#66b350', X, Y, 2, 1); }
  // arco de pedras lavradas
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (1 - k / 10), X = Math.round(22 + Math.cos(a) * 9), Y = Math.round(23 - Math.sin(a) * 9); px(x, O, X - 2, Y - 2, 5, 5); px(x, k === 5 ? '#c3cad6' : '#939cae', X - 1, Y - 1, 3, 3); }
  px(x, O, 12, 22, 4, 12); px(x, '#939cae', 13, 23, 2, 10); px(x, O, 28, 22, 4, 12); px(x, '#939cae', 29, 23, 2, 10);
  return PASS_SPR = c; }
window.CINE_DRAW = function (x, t, room) {
  if (room) return; const T = window.__VT; if (T < 72 || T > 90) return;
  const open = EASE(SEG(T, 79.6, 81.8)), X = PASS.x, Y = PASS.y, s2 = passSprite();
  x.drawImage(s2, X - 22, Y - 31);
  // interior: escuridão e degraus descendo
  for (let yy = 0; yy < 12; yy++) { const w = yy < 3 ? Math.round(5 * Math.sqrt(yy / 3)) + 3 : 8; px(x, '#030406', X - w, Y - 19 + yy, w * 2, 1); }
  for (let k = 0; k < 4; k++) px(x, ['#2e3440', '#22262f', '#181b22', '#101217'][k], X - 6 + k, Y - 10 + k * 2, 12 - k * 2, 1);
  const gl = (.25 + .2 * Math.sin(t * 2.4)) * open; if (gl > 0) { glow(x, X, Y - 12, 7, '#3fd0e0', gl * .5); px(x, '#9ff3ff', X, Y - 30, 1, 3); px(x, '#9ff3ff', X - 1, Y - 29, 3, 1); }
  // cortina de trepadeiras: fechada até a descoberta, depois se abre para os lados
  for (let k = 0; k < 16; k++) { const side = k < 8 ? -1 : 1, base = X - 8 + (k % 8) * 2 + (k >= 8 ? 1 : 0), shift = Math.round(open * 7 * side * (1 - Math.abs(base - X) / 10) + open * 4 * side), L = 9 + (k * 5) % 5;
    for (let j = 0; j < L; j++) px(x, (j + k) % 3 ? '#2f7a40' : '#66b350', base + shift + (j % 2 ? side * 0 : 0), Y - 21 + j, 1, 1);
    if ((k % 3) === 0) px(x, '#84c65a', base + shift, Y - 21 + L, 1, 1); }
  // folhas e poeira caindo ao abrir
  if (T > 79.6 && T < 83) { burst(x, t, 79.7, X, Y - 14, 18, ['#2f7a40', '#66b350', '#84c65a'], 16, 1.3, 12, 51); burst(x, t, 80.2, X, Y - 4, 14, ['#c3cad6', '#939cae'], 10, 1.2, -6, 77); }
};
// ---------- rótulos aparecem perto e somem quando a câmera se afasta
const FEAT = new Map([[CADU, [31.4, 38.2]], [YAS, [38.2, 50.2]], [KING, [45.4, 50.2]], [AYKA, [54.6, 59.2]], [BLU, [59.2, 63.4]], [XAMA, [63.4, 68.2]], [GUARD, [68.3, 71]], [YOU, [88.8, 105]]]);
window.CINE_LABEL = q => { const T = window.__VT, z = SEG(S, 3.1, 4.2); if (FEAT.has(q)) { const [a, b] = FEAT.get(q); return z * SEG(T, a, a + .5) * (1 - SEG(T, b - .4, b)); } return z * .9 * (T > 96.8 && T < 104.6 ? 1 : 0); };

// ---------- camadas de texto e telas (DOM por cima do canvas)
const ov = document.createElement('div'); ov.id = 'ep3'; document.body.appendChild(ov);
ov.innerHTML = `<style>
#ep3{position:fixed;inset:0;z-index:20;pointer-events:none;font-family:Pix,monospace}
#ep3 .cap{position:absolute;left:18px;right:18px;top:472px;text-align:center;font:700 17px/1.18 Pix,monospace;color:#ffd84a;text-transform:uppercase;letter-spacing:.6px;
  text-shadow:-1.5px -1.5px 0 #140e06,0 -1.5px 0 #140e06,1.5px -1.5px 0 #140e06,-1.5px 0 0 #140e06,1.5px 0 0 #140e06,-1.5px 1.5px 0 #140e06,0 1.5px 0 #140e06,1.5px 1.5px 0 #140e06,0 3px 0 #140e06}
#ep3 .cap .u{text-transform:none;color:#fff}
#ep3 .cnt{position:absolute;left:50%;top:64px;transform:translateX(-50%);padding:6px 10px 5px;background:#1c2a22;border:2px solid #060b0a;box-shadow:inset 0 0 0 2px #c9a46a,0 3px 0 rgba(0,0,0,.4);text-align:center;white-space:nowrap}
#ep3 .cnt b{display:block;font:400 22px/1 P2P,monospace;color:#ffd84a;text-shadow:2px 2px 0 #140e06}
#ep3 .cnt span{display:block;margin-top:4px;font:700 11px Pix,monospace;color:#fff3b0;letter-spacing:2px}
#ep3 .ttl{position:absolute;left:0;right:0;top:118px;text-align:center;font:400 19px/1.25 P2P,monospace;color:#ffd84a;text-shadow:2px 2px 0 #140e06,-2px -2px 0 #140e06,2px -2px 0 #140e06,-2px 2px 0 #140e06,0 4px 0 #140e06}
#ep3 .ttl small{display:block;margin-top:8px;font:700 12px Pix,monospace;color:#fff3b0;letter-spacing:2px}
#ep3 .fade{position:absolute;inset:0;background:#000}
#ep3 .end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:radial-gradient(ellipse at center,rgba(12,20,16,.55),rgba(4,6,8,.9));text-align:center}
#ep3 .end h1{margin:0;font:400 44px/1 P2P,monospace;color:#ffd84a;text-shadow:3px 3px 0 #140e06,-3px -3px 0 #140e06,3px -3px 0 #140e06,-3px 3px 0 #140e06,0 6px 0 #140e06}
#ep3 .end p{margin:0;font:700 17px Pix,monospace;color:#fff3b0;letter-spacing:3px;text-shadow:2px 2px 0 #140e06}
#ep3 .end .btn{margin-top:10px;padding:10px 18px 8px;background:#ffd84a;color:#140e06;font:400 13px P2P,monospace;border:3px solid #140e06;box-shadow:0 4px 0 #140e06}
#ep3 .end .bio{font:700 22px Pix,monospace;color:#9ff3ff;letter-spacing:3px}
</style><div class="fade"></div><div class="cnt"><b>576</b><span>MORADORES</span></div><div class="ttl"></div><div class="cap"></div>
<div class="end"><h1>ERYON</h1><p>ENTRE NESTE MUNDO</p><div class="btn">JOGUE ONLINE</div><div class="bio">▼ LINK NA BIO ▼</div></div>`;
const $o = s => ov.querySelector(s), capEl = $o('.cap'), cntEl = $o('.cnt'), ttlEl = $o('.ttl'), fadeEl = $o('.fade'), endEl = $o('.end');
let CAPS = [];
window.loadCaps = c => { CAPS = c; };
const TITLES = [[43.0, 49.9, 'A PRIMEIRA GUILDA', 'DE ERYON'], [79.5, 85.6, 'UMA PASSAGEM', 'SECRETA'], [86.0, 88.6, 'EM BREVE...', ''], [88.9, 92.6, 'NOVIDADE!', 'ERYON ONLINE']];
function overlays(T) {
  const c = CAPS.find(q => T >= q.s && T < q.e); capEl.innerHTML = c ? c.html : ''; capEl.style.opacity = c ? Math.min(1, (T - c.s) / .12) : 0;
  // contador 576 → 800
  const showC = (T >= 1.7 && T < 11.2) || T >= 107.9; cntEl.style.opacity = showC ? Math.min(SEG(T, 1.7, 2.0) + (T >= 107.9 ? 1 : 0), 1) * (T < 11.2 ? 1 - SEG(T, 10.8, 11.2) : SEG(T, 107.9, 108.4)) : 0;
  const n = T < 5 ? 576 : T < 7.9 ? Math.round(576 + (800 - 576) * EASE(SEG(T, 5.0, 7.9))) : 800; cntEl.querySelector('b').textContent = n; cntEl.querySelector('span').textContent = T >= 107.9 ? 'HABITANTES' : 'MORADORES';
  const ti = TITLES.find(q => T >= q[0] && T < q[1]); ttlEl.innerHTML = ti ? `${ti[2]}${ti[3] ? `<small>${ti[3]}</small>` : ''}` : ''; ttlEl.style.opacity = ti ? Math.min(SEG(T, ti[0], ti[0] + .3), 1 - SEG(T, ti[1] - .3, ti[1])) : 0;
  // escurecimentos: entre cenas distantes e na passagem
  let f = 0; for (const [a, b] of [[58.9, 59.6], [63.1, 63.7], [67.9, 68.5], [70.7, 71.3]]) { const m = (a + b) / 2; if (T > a && T < b) f = Math.max(f, 1 - Math.abs(T - m) / ((b - a) / 2)); }
  if (T > 83.5 && T < 89.2) f = Math.max(f, T < 88.2 ? SEG(T, 84.2, 87.8) * .96 : 1 - SEG(T, 88.4, 89.2));
  if (T > 116) f = Math.max(f, SEG(T, 116, 116.5) * .6);
  fadeEl.style.opacity = f;
  endEl.style.opacity = T >= 104.9 && T < 107.9 ? Math.min(SEG(T, 104.9, 105.3), 1 - SEG(T, 107.5, 107.9)) : 0;
  // interface real do jogo durante "o jogo online"
  document.body.classList.toggle('cine-ui', T >= 90.9 && T < 104.8);
}
// ---------- dragões: um voo em 101,5 s (recurso real do jogo)
function dragons(T) { FLIGHTS.length = 0; if (T >= 101.2 && T < 106) { const born = 101.2 * 1000; FLIGHTS.push({ x: 380, y: 790, dx: .6, dy: -.8, di: 2, speed: 95, alt: 100, pal: 0, ph: 1, born, life: 9000 }); FLIGHTS.push({ x: 350, y: 820, dx: .6, dy: -.8, di: 2, speed: 95, alt: 112, pal: 2, ph: 2.2, born, life: 9000 }); } }

// ---------- quadro
const dummy = { x: 0, y: 0, room: '' };
window.render = function (T) {
  window.__VT = T; seed = 1 + Math.floor(T * 30);
  const room = stage(T);
  players.clear(); for (const q of NPC) if (!q.hidden) players.set(q.id, q);
  const c = camAt(T); let p = null;
  if (room) { const r = roomOf(room); dummy.room = room; dummy.x = L2(r.w * .42, r.w * .55, SEG(T, 17.5, 18.4)); dummy.y = r.h * .62; p = dummy; S = 7; window.dayPhase = () => .2; }
  else { cam.mode = 'free'; cam.x = c.x; cam.y = c.y; S = Math.max(sMin(), c.s); const ph = c.ph; window.dayPhase = () => ph; }
  dragons(T); overlays(T);
  if (T >= 90.9 && T < 104.8) { $('magicBtn').textContent = 'Machadada'; $('actBtn').hidden = T >= 96.6; $('actBtn').textContent = 'Derrubar árvore'; $('onlineBtn').style.display = 'none'; $('achN').textContent = '1/19'; $('msg').placeholder = 'Fale com Eryon...'; }
  draw(T, p);
};
window.EP3_READY = true;
})();
