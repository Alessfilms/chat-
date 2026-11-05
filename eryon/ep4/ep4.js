// =====================================================================
// ERYON — EPISÓDIO 04: A BATALHA DOS TRÊS MONSTROS
// Roteiro cinematográfico rodando DENTRO do motor do jogo (modo ?cine=1).
// Mapa, construções, sprites e os três monstros são os do jogo; aqui só
// controlamos câmera, relógio, personagens, legendas e telas. Nada é salvo.
// =====================================================================
(function () {
const SEG = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const EASE = k => k * k * (3 - 2 * k);
const L2 = (a, b, k) => a + (b - a) * k;
let seed = 1; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
window.__VT = 0;
// castelo pronto (o rei construiu) e mundo sem conexão
CSTATE = { pedra: 2100, lenha: 250, top: [], stages: (() => { let p = 0, l = 0; return [['fundacao', 'Fundação', 150, 0], ['muralha', 'Muralha da frente', 300, 0], ['laterais', 'Muralhas laterais', 300, 0], ['torres', 'Torres dos cantos', 400, 0], ['portao', 'Portão', 200, 100], ['torre', 'Torre do Rei', 500, 0], ['telhados', 'Telhados e bandeiras', 250, 150]].map(([id, name, pedra, lenha]) => { const o = { id, name, pedra, lenha, p0: p, l0: l }; p += pedra; l += lenha; return o; }); })() };
cam.mode = 'free'; myId = -1; nextFlight = Infinity; KING = 'emanuel01.f'; RGS.clear(); RGS.add('kennidymessias1');
CUT.clear(); DECOR = []; window.drizzleLevel = () => 0; guardLabels = () => {};   // no vídeo: sem garoa aleatória e sem os rótulos dos guardas NPC

// ---------- personagens
const NPC = [];
const SH = h => shadeHex(h, .62), skin = s => ({ skin: s, skinD: SH(s) });
function mk(o) { const q = { id: 1000 + NPC.length, room: '', face: 1, moving: false, ph: NPC.length * 7 % 97, ...o };
  q.ch = o.sp ? charBuilder(o.sp) : charFor(o.username || ('npc' + q.id), o.look || null); if (!q.look) q.look = o.look || {}; NPC.push(q); return q; }
// o rei (coroa e capa real vêm do próprio jogo: ele é o Rei de Eryon)
const REI = mk({ username: 'emanuel01.f', look: { cls: 'guerreiro' }, sp: { hair: '#5a3a26', beard: '#5a3a26', crown: true, armor: '#c9a46a', rust: '#8b5e3c', shirt: '#a83a32', shirtD: '#5a2418', pants: '#2b3138', boots: '#1a1208', cape: '#a83a32', ...skin('#c08060') } });
// novos moradores (usernames exatos dos comentários)
const HIGOR = mk({ username: 'higorasc', roleText: 'Finnian Ironshield · Paladino', look: { cls: 'guerreiro' }, sp: { hair: '#ffd84a', armor: '#c3cad6', rust: '#939cae', pants: '#4a535c', boots: '#2b3138', cape: '#f4f0d8', hat: 'elmo', ...skin('#f2c9a4') } });
const FRED = mk({ username: 'frederico_neumann', roleText: 'Senhor feudal dos cristais', sp: { hair: '#1a1208', beard: '#1a1208', shirt: '#6e4a8a', shirtD: '#3a2650', pants: '#1d3550', cape: '#ffd84a', ...skin('#e8b48c') } });
const MEDICO = mk({ username: 'lucasp_braga', roleText: 'Médico da peste', sp: { hair: '#1a1208', shirt: '#2b3138', shirtD: '#1a1d24', pants: '#1a1d24', boots: '#1a1208', cape: '#1a1208', hat: 'mago', ...skin('#e4d0c8') } });
const BARDO = mk({ username: 'paladini.jr', roleText: 'Bardo viajante', look: { cls: 'bardo' }, sp: { hair: '#d0622a', shirt: '#d0622a', shirtD: '#8a3a1a', pants: '#1d3550', hat: 'palha', cape: '#6e4a8a', ...skin('#f2c9a4') } });
const LEVI = mk({ username: 'levi.fvarias', roleText: 'Guerreiro', look: { cls: 'guerreiro' }, sp: { hair: '#1a1208', armor: '#4a535c', rust: '#8b5e3c', pants: '#2b3138', boots: '#1a1208', cape: '#a83a32', ...skin('#8b5e3c') } });
const GABO = mk({ username: 'rodrigues_gabo', roleText: 'Mago', look: { cls: 'mago' }, sp: { hair: '#c4ccd0', beard: '#c4ccd0', longHair: true, shirt: '#3f7ab0', shirtD: '#1d3550', pants: '#1d3550', cape: '#1d3550', hat: 'mago', ...skin('#e8b48c') } });
const JUJU = mk({ username: 'juju_feh3', roleText: 'Coletora de alimentos', sp: { hair: '#8b5e3c', longHair: true, shirt: '#84c65a', shirtD: '#3c5d4a', pants: '#6b4630', hat: 'palha', ...skin('#f2c9a4') } });
const RAKE = mk({ username: 'rake092008', roleText: 'Bibliotecária', sp: { hair: '#1a1208', longHair: true, shirt: '#e4d0a0', shirtD: '#c9a46a', pants: '#3a2650', ...skin('#c08060') } });
const RONIN = mk({ username: 'leo_maad1.8', roleText: 'Ronin', look: { cls: 'guerreiro' }, sp: { hair: '#1a1208', shirt: '#2b3138', shirtD: '#1a1d24', pants: '#1a1d24', boots: '#1a1208', cape: '#a83a32', hat: 'palha', ...skin('#e8b48c') } });
const GEO = mk({ username: 'geo_miriely', roleText: 'Criatura misteriosa do portal', sp: { hair: '#d0a0ff', longHair: true, elfEars: true, shirt: '#3a2650', shirtD: '#1e0f30', pants: '#1e0f30', cape: '#6e4a8a', ...skin('#b8a4d8') } });
const ALLICE = mk({ username: 'allicegomes_', roleText: 'Moradora com duas casas', sp: { hair: '#ffd84a', longHair: true, shirt: '#b06a9a', shirtD: '#6e3a5a', pants: '#3c5f9a', ...skin('#f2c9a4') } });
const NICK = mk({ username: 'nickenj_', roleText: 'Novo morador', sp: { hair: '#5a3a26', shirt: '#3f7ab0', shirtD: '#2c4f7a', pants: '#4a2f22', ...skin('#e8b48c') } });
const XAMA = mk({ username: 'mano.icee', roleText: 'Xamã', look: { equipTool: 'staff' }, sp: { hair: '#1a1208', longHair: true, beard: '#1a1208', shirt: '#3c5d4a', shirtD: '#1c3831', pants: '#4a2f22', cape: '#8b5e3c', ...skin('#8b5e3c') } });
const GUARDA = mk({ username: 'kennidymessias1', roleText: 'Guarda', look: { cls: 'guarda' }, sp: { hair: '#5a3a26', armor: '#6e7a84', rust: '#4a535c', pants: '#2b3138', boots: '#1a1208', cape: '#1d3550', hat: 'elmo', ...skin('#c08060') } });
const YOU = mk({ username: 'você', roleText: 'Novo morador', look: { cls: 'lenhador' }, sp: { hair: '#d0622a', shirt: '#a83a32', shirtD: '#5a2418', pants: '#3c5f9a', ...skin('#f2c9a4') } });
// moradores dos episódios anteriores (continuidade, sem rótulo)
const OLD = ['heitor_morrone', 'lorhan_cristian', 'maicon.sg2010', 'pablopaesrocha', '_ray_hpl', 'paocombiscoito', 'altanat19', 'eo_preto.031', 'bio_leocordeiro', 'kaguya.xs', 'eucaduu_', 'yassermalala175', 'ivan_tomas794', 'grazzy_solive07', 'theuxvs_'].map(u => mk({ username: u, noLabel: true }));
// multidão sem @ (não inventamos usernames)
const R0 = rng(404); const pick = a => a[Math.floor(R0() * a.length)];
const HAIRS2 = ['#d0622a', '#ffd84a', '#1a1208', '#5a3a26', '#8b5e3c', '#c4ccd0', '#a83a32'], SHIRTS2 = ['#a83a32', '#3f7ab0', '#6e4a8a', '#3c5d4a', '#d0622a', '#e4d0a0', '#4a535c', '#b06a9a'], PANTS2 = ['#3c5f9a', '#4a2f22', '#2b3138', '#3c5d4a', '#6b4630', '#1d3550'], SKINS2 = ['#e8b48c', '#f2c9a4', '#c08060', '#8b5e3c', '#5a3a26'];
const crowdLook = () => { const sh = pick(SHIRTS2), sk = pick(SKINS2); return { hair: pick(HAIRS2), shirt: sh, shirtD: SH(sh), pants: pick(PANTS2), longHair: R0() < .4, beard: R0() < .25 ? pick(HAIRS2) : undefined, hat: R0() < .2 ? pick(['palha', 'bone']) : undefined, cape: R0() < .2 ? pick(['#4e6c4a', '#1d3550', '#a83a32']) : undefined, elfEars: R0() < .12, ...skin(sk) }; };
const ROADS = [[[360, 622], [400, 566], [440, 520], [482, 475]], [[340, 642], [270, 640], [208, 624], [170, 630]], [[380, 644], [440, 664], [480, 690], [530, 712]], [[362, 664], [362, 720], [pathS(780), 780], [pathS(860), 860]], [[352, 650], [310, 700], [300, 790]], [[372, 652], [420, 700], [420, 786]], [[350, 628], [306, 560], [306, 522]], [[530, 712], [620, 742], [640, 700], [640, 670]]];
function along(pts, d) { let tot = 0; const L = []; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(l); tot += l; }
  let k = ((d % (tot * 2)) + tot * 2) % (tot * 2), back = false; if (k > tot) { k = tot * 2 - k; back = true; }
  for (let i = 0; i < L.length; i++) { if (k <= L[i] || i === L.length - 1) { const f = Math.min(1, k / L[i]), a = pts[i], b = pts[i + 1], dx = b[0] - a[0]; return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, face: (back ? -dx : dx) < 0 ? -1 : 1 }; } k -= L[i]; } return { x: pts[0][0], y: pts[0][1], face: 1 }; }
const CROWD = []; for (let i = 0; i < 70; i++) { const q = mk({ username: '_c' + i, noLabel: true, sp: crowdLook() }); q.road = ROADS[i % ROADS.length]; q.off = R0() * 400; q.sp2 = 14 + R0() * 12; CROWD.push(q); }
// defensores sem @: guerreiros, arqueiros e magos
const WAR = [0, 1, 2, 3, 4, 5].map(i => mk({ username: '_w' + i, noLabel: true, look: { cls: 'guerreiro' }, sp: { hair: pick(HAIRS2), armor: ['#4a535c', '#6e7a84', '#565e70'][i % 3], rust: '#8b5e3c', pants: '#2b3138', boots: '#1a1208', cape: ['#a83a32', '#1d3550', '#4e6c4a'][i % 3], ...skin(pick(SKINS2)) } }));
const ARQ = [0, 1, 2, 3].map(i => mk({ username: '_a' + i, noLabel: true, look: { cls: 'arqueira' }, sp: { ...crowdLook(), shirt: '#3c5d4a', shirtD: '#1c3831', cape: '#4e6c4a', elfEars: i % 2 === 0 } }));
const MAG = [0, 1].map(i => mk({ username: '_m' + i, noLabel: true, look: { cls: 'maga' }, sp: { ...crowdLook(), shirt: '#6e4a8a', shirtD: '#3a2650', cape: '#1d3550', longHair: true } }));
const FERIDOS = [0, 1, 2].map(i => mk({ username: '_f' + i, noLabel: true, sp: crowdLook() }));
const WORK = [[176, 690, 'chop', -1], [552, 560, 'chop', 1], [250, 470, 'chop', -1]].map(([x, y, k, f]) => { const q = mk({ username: '_t' + x, noLabel: true, sp: crowdLook(), look: { cls: 'lenhador' } }); q.x = x; q.y = y; q.face = f; return q; });

// ---------- monstros (sprites do próprio jogo: Gigante de Pedra, Fera de Fogo e Dragão Negro)
const MON = { g: { x: 0, y: 0, face: -1, on: false, a: 1, hit: -9, sink: 0 }, f: { x: 0, y: 0, face: 1, on: false, a: 1, hit: -9 }, d: { x: 0, y: 0, alt: 90, on: false, a: 1, ang: 0, hit: -9, fall: 0, breath: null } };
const BATTLE = { g: [560, 618], f: [262, 772], d: [430, 545] };   // onde cada monstro luta (perto da vila, sem destruir nada)
function monsters(T) {
  const g = MON.g, f = MON.f, d = MON.d; g.on = f.on = d.on = false; d.breath = null;
  // Gigante de Pedra sai das montanhas (24–27 s) e luta a leste da vila (45–53 s)
  if (T >= 23.9 && T < 27.1) { g.on = true; const k = SEG(T, 23.9, 27.1); g.x = L2(1660, 1560, k); g.y = L2(650, 610, k); g.face = -1; g.walk = true; g.a = 1; g.sink = 0; }
  if (T >= 33 && T < 57) { g.on = T >= 45.8; g.x = BATTLE.g[0] + Math.sin(T * .7) * 6; g.y = BATTLE.g[1]; g.face = -1; g.walk = false; g.a = 1 - SEG(T, 52.6, 54.0); g.sink = SEG(T, 52.4, 54.0) * 30; g.on = g.on && T < 54.2; }
  // Monstro de Fogo invade a floresta (27–30 s) e luta a oeste (45–53 s)
  if (T >= 26.9 && T < 30) { f.on = true; const k = SEG(T, 26.9, 30); f.x = L2(150, 230, k); f.y = L2(800, 776, k); f.face = 1; f.walk = true; f.a = 1; }
  if (T >= 45.8 && T < 54) { f.on = true; f.x = BATTLE.f[0] + Math.sin(T * .9) * 8; f.y = BATTLE.f[1]; f.face = 1; f.walk = false; f.a = 1 - SEG(T, 53.0, 53.9); }
  // Dragão de Fogo: aparece sobre o castelo (29,8–33 s) e voa sobre a vila na batalha
  if (T >= 29.7 && T < 33.1) { d.on = true; const k = SEG(T, 29.7, 32.9); d.x = L2(760, 548, EASE(Math.min(1, k * 1.4))) + Math.sin(k * 6) * 10; d.y = L2(1060, 1300, EASE(Math.min(1, k * 1.4))); d.alt = 90; d.fall = 0; d.ang = Math.atan2(-240 * 0 + (548 - 760), -(1300 - 1060)); if (T >= 31.4 && T < 32.8) { d.breath = { t0: 31.4, tx: 540, ty: 1270 }; d.ang = Math.PI; } }
  if (T >= 45.8 && T < 55) { d.on = true; const a = T * .9; d.x = BATTLE.d[0] + Math.cos(a) * 60; d.y = BATTLE.d[1] + Math.sin(a) * 26; d.ang = a + Math.PI; d.alt = 95; d.fall = SEG(T, 53.4, 54.6);
    if (d.fall > 0) { d.alt = 95 * (1 - EASE(d.fall)); d.ang += d.fall * 9; } if (T >= 47.0 && T < 48.0) d.breath = { t0: 47.0, tx: d.x - 40, ty: d.y + 30 }; }
}
const HITS = [46.1, 46.5, 47.0, 47.6, 48.1, 48.4, 48.7, 49.2, 50.2, 50.9, 51.5, 52.0, 52.3];
function drawMonsters(x, t) {
  const T = window.__VT, g = MON.g, f = MON.f, d = MON.d, hitNow = HITS.some(h => T >= h && T < h + .12);
  if (g.on) { x.globalAlpha = g.a; const fr = g.walk ? Math.floor(t * 2.2) % 2 : (Math.floor(T * 1.2) % 3 === 0 ? 3 : Math.floor(t * 2) % 2); drawGiantAt(x, Math.round(g.x), Math.round(g.y + g.sink), fr, g.face, t, hitNow); x.globalAlpha = 1;
    if (g.walk && Math.floor(t * 2.2) % 2 !== Math.floor((t - .05) * 2.2) % 2) burst(x, t, t - .05, g.x, g.y, 14, ['#8b5e3c', '#c9a46a', '#6e7789'], 22, .8, 30, 4);
    if (g.sink > 0) { burst(x, t, 52.4, g.x, g.y - 40, 40, ['#78818f', '#a0a9b6', '#3a404e'], 60, 1.6, 50, 7); smoke(x, g.x, g.y - 30, t, 8, '#8a8476'); } }
  if (g.sink >= 29 || (T >= 54 && T < 57)) for (let i = 0; i < 9; i++) { const X = BATTLE.g[0] - 26 + (i * 13) % 52, Y = BATTLE.g[1] - (i % 3) * 5; disc(x, X, Y, 5 - (i % 3), '#121419'); disc(x, X, Y, 4 - (i % 3), '#78818f'); px(x, '#a0a9b6', X - 1, Y - 2, 2, 1); }
  if (f.on) { x.globalAlpha = f.a; GFX.lastSmashT = (T >= 46.84 && T < 48.4) || (T >= 28.0 && T < 29.3) ? performance.now() - ((T * 1000) % 900) : -1e9; drawFireAt(x, Math.round(f.x), Math.round(f.y), f.walk ? Math.floor(t * 3) % 2 : Math.floor(t * 2) % 2, f.face, t, hitNow); x.globalAlpha = 1;
    if (f.walk) for (let i = 0; i < 5; i++) flame(x, Math.round(f.x - 30 - i * 14), Math.round(f.y + (i % 2) * 6), 8 + (i % 3) * 3, t, i * 7); }
  if (T >= 53.0 && T < 56.5) { const k = SEG(T, 53.0, 56.5); smoke(x, BATTLE.f[0], BATTLE.f[1] - 20, t, 10, '#6e6a68'); x.globalAlpha = 1 - k; disc(x, BATTLE.f[0], BATTLE.f[1] - 6, 10, '#2a2022'); x.globalAlpha = 1; }
  if (d.on) { const N = 80 * 2.4, di = Math.round(((d.ang / 6.283) * DIRS % DIRS + DIRS)) % DIRS, s = dragonTop(4, Math.floor(t * 7) % 3, di);
    x.globalAlpha = .22; x.drawImage(s.s, Math.round(d.x - N / 2 + 6), Math.round(d.y - N / 2 + 4), N, N); x.globalAlpha = 1;
    const X = d.x, Y = d.y - d.alt; x.drawImage(s.c, Math.round(X - N / 2), Math.round(Y - N / 2), N, N);
    if (hitNow && T > 45) { x.globalAlpha = .4; x.globalCompositeOperation = 'lighter'; x.drawImage(s.c, Math.round(X - N / 2), Math.round(Y - N / 2), N, N); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
    const a = di / DIRS * 6.283, hx = X + Math.sin(a) * 23 * 2.4, hy = Y - Math.cos(a) * 23 * 2.4; glow(x, hx, hy, 8, P.fire2, .25);
    if (d.breath) { const k2 = T - d.breath.t0; x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 70; i++) { const u = ((i / 70) + t * 1.6) % 1, ex = hx + (d.breath.tx - hx) * u + Math.sin(t * 17 + i) * (3 + u * 9), ey = hy + (d.breath.ty - 8 - hy) * u + Math.cos(t * 13 + i) * u * 6; x.globalAlpha = Math.min(1, k2 * 4) * (.85 - u * .35); disc(x, Math.round(ex), Math.round(ey), Math.round(2 + u * 6), u < .25 ? '#fff3b0' : u < .55 ? P.fire3 : u < .8 ? P.fire2 : P.fire1); } x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; glow(x, d.breath.tx, d.breath.ty - 8, 26, P.fire2, .3); }
    if (d.fall > 0) { smoke(x, X, Y, t, 8, '#3a3434'); if (d.fall > .95) burst(x, t, 54.6, d.x, d.y, 40, ['#ffd84a', '#ff7a1a', '#3a3434'], 50, 1.4, 30, 9); } }
  if (T >= 54.6 && T < 57) smoke(x, BATTLE.d[0], BATTLE.d[1], t, 9, '#4a4444');
}

// ---------- câmera: chaves [tempo, x, y, escala S, fase do dia, sala?]
const K = [
  [0, 330, 610, 1.7, .2], [4.9, 392, 660, 2.0, .2], [9.95, 452, 700, 2.3, .2],                 // 01 · sobrevoo: 800 → 900
  [10.0, 560, 1010, 1.0, .2], [11.7, 590, 1040, 1.06, .2],                                     // Eryon cresceu (castelo, vila, terras novas)
  [11.75, 540, 1330, 3.0, .2], [13.2, 546, 1338, 3.3, .2],                                     // castelo
  [13.25, 262, 606, 7.0, .2], [13.88, 280, 608, 7.0, .2],                                      // casas
  [13.92, 0, 0, 0, 0, 'taverna'], [14.78, 0, 0, 0, 0, 'taverna'],                              // tavernas
  [14.82, 626, 666, 7.0, .2], [15.65, 646, 666, 7.0, .2],                                      // comércios (feira e mercador)
  [15.7, 290, 614, 7.0, .2], [17.35, 300, 616, 7.0, .2],                                       // novos moradores (grupo 1)
  [17.4, 418, 650, 7.2, .2], [19.4, 430, 652, 7.2, .2],                                        // novos moradores (grupo 2)
  [19.44, 372, 646, 3.2, .22], [24.0, 400, 640, 2.6, .44],                                     // 03 · o ataque: o céu escurece
  [24.02, 1640, 560, 4.6, .45], [26.95, 1566, 556, 5.0, .45],                                  // gigante sai das montanhas
  [27.0, 190, 760, 4.0, .46], [29.8, 236, 760, 4.4, .46],                                      // monstro de fogo na floresta
  [29.85, 600, 1250, 2.2, .48], [33.1, 548, 1290, 2.5, .48],                                   // dragão sobre o castelo
  [33.16, 540, 1448, 9.0, .42], [36.9, 540, 1452, 10.0, .42],                                   // 04 · o rei diante do castelo
  [37.0, 540, 1462, 6.0, .42], [39.9, 540, 1462, 5.6, .42],                                    // reúne os guerreiros
  [40.1, 520, 1380, 4.4, .42], [45.6, 470, 900, 4.4, .42],                                     // lidera a cavalgada até a vila
  [45.9, 560, 640, 7.0, .42], [46.8, 570, 640, 7.0, .42],                                      // paladino
  [46.84, 262, 752, 6.5, .42], [47.38, 266, 752, 6.5, .42],                                    // magos x fogo
  [47.4, 408, 540, 4.0, .42], [47.95, 412, 540, 4.0, .42],                                     // arqueiros x dragão
  [48.0, 548, 630, 6.5, .42], [48.95, 556, 630, 6.5, .42],                                     // guerreiros e ronin x gigante
  [49.0, 420, 660, 2.7, .42], [49.75, 420, 664, 2.7, .42],                                     // lado a lado (geral)
  [49.8, 430, 734, 7.2, .42], [51.2, 432, 734, 7.2, .42],                                      // médico atende os feridos
  [51.25, 540, 1452, 6.0, .42], [52.25, 540, 1452, 6.4, .42],                                  // guarda defende o castelo
  [52.3, 420, 660, 2.6, .43], [54.4, 420, 662, 2.75, .44],                                     // vitória: os três caem
  [54.5, 412, 660, 3.0, .46], [56.9, 392, 656, 3.6, .5],                                       // derrotados
  [57.05, 360, 644, 4.6, .5], [59.45, 366, 646, 5.0, .5],                                    // 07 · festa na praça
  [59.5, 0, 0, 0, 0, 'taverna'], [61.28, 0, 0, 0, 0, 'taverna'],                               // tavernas lotadas
  [61.32, 540, 1320, 3.0, .6], [62.65, 540, 1310, 3.3, .6],                                    // castelo iluminado
  [62.7, 360, 656, 7.0, .5], [65.6, 360, 658, 7.6, .5],                                      // todos comemoram com o rei
  [65.8, 1220, 1506, 6.5, .62], [68.9, 1220, 1508, 7.4, .64],                                  // novos mistérios: o portal
  [69.0, 560, 1040, 1.0, .25], [72.3, 600, 1060, 1.06, .25],                                   // 08 · faltam 100
  [72.42, 372, 652, 5.0, .2], [77.2, 390, 650, 5.6, .2],                                       // comente quem você quer ser
  [77.26, 392, 664, 7.0, .2], [81.5, 470, 610, 6.0, .2],                                       // o jogo online
  [81.6, 420, 760, 1.8, .2], [83.2, 430, 800, 1.7, .2],                                        // link na bio
];
function camAt(T) { let i = 0; while (i < K.length - 1 && K[i + 1][0] <= T) i++; const a = K[i], b = K[i + 1] || a;
  if (a[5] || (b[5] && T >= b[0])) return { room: a[5] || b[5] };
  const cut = b[0] - a[0] < .2; const k = b === a || cut ? 0 : EASE(SEG(T, a[0], b[0])); return { x: L2(a[1], b[1], k), y: L2(a[2], b[2], k), s: L2(a[3], b[3], k), ph: L2(a[4], b[4], k) }; }

// ---------- cada personagem em cada instante
function place(q, x, y, face, moving) { q.x = x; q.y = y; q.tx = x; q.ty = y; if (face) q.face = face; q.moving = !!moving; }
function walk(q, pts, T, t0, speed) { const d = Math.max(0, T - t0) * speed; let tot = 0; for (let i = 0; i < pts.length - 1; i++) tot += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  if (d >= tot) { const e = pts[pts.length - 1]; place(q, e[0], e[1], null, false); return true; } const p2 = along(pts, d); place(q, p2.x, p2.y, p2.face, T > t0); return false; }
const act = (q, kind, T, every, dur, off = 0) => { const n = Math.floor((T + off) / every), t0 = n * every - off; q.act = T - t0 < dur ? { kind, t0, end: t0 + dur } : null; };
const say = (q, text, a, b, T) => { if (T >= a && T < b) { q.say = text; q.sayT = (performance.now() - (T - a) * 1000); } else q.say = null; };
const BATTLE_T = [45.8, 54.4];
function stage(T) {
  for (const q of NPC) { q.hidden = true; q.act = null; q.say = null; q.room = ''; q.horse = false; q.carry = false; }
  const show = (q, room = '') => { q.hidden = false; q.room = room; };
  const inRoom = camAt(T).room, battle = T >= BATTLE_T[0] && T < BATTLE_T[1], attack = T >= 19.4 && T < 57, festa = T >= 57;
  // multidão: rotina nas ruas; no ataque corre para casa; na festa dança na praça
  CROWD.forEach((q, i) => { if (attack && T >= 21.0 && T < 56.8 && i > 12) return; show(q);
    if (festa && T < 66) { const a = i / CROWD.length * 6.283 + T * .15, r = 40 + (i % 4) * 12; place(q, 360 + Math.cos(a) * r * 1.2, 652 + Math.sin(a) * r * .55, Math.cos(a) > 0 ? -1 : 1, (i + Math.floor(T * 2)) % 3 === 0); if ((i + Math.floor(T * 1.6)) % 5 === 0) q.act = { kind: 'magic', t0: Math.floor(T * 1.6) / 1.6, end: Math.floor(T * 1.6) / 1.6 + .5 }; return; }
    if (attack && T >= 19.4) { const p2 = along(q.road, q.off + (19.4 * q.sp2) + (T - 19.4) * q.sp2 * 3.2); place(q, p2.x, p2.y, p2.face, true); return; }
    const p2 = along(q.road, q.off + T * q.sp2); place(q, p2.x, p2.y, p2.face, Math.sin(T * .3 + q.id) > -.6); if (!q.moving) q.face = q.id % 2 ? 1 : -1; });
  if (!attack) for (const q of WORK) { show(q); place(q, q.x, q.y, q.face, false); act(q, 'chop', T + q.id * .7, 3.2, 2.4); }
  // moradores antigos (continuidade): trabalhando pela vila; na festa, na praça
  OLD.forEach((q, i) => { if (attack && T >= 21 && T < 56.8) return; show(q); const spots = [[470, 684], [300, 730], [208, 632], [254, 596], [236, 668], [428, 740], [380, 600], [560, 640], [330, 610], [470, 500], [340, 680], [390, 690], [320, 660], [400, 620], [450, 660]];
    if (festa && T < 66) { const a = i / OLD.length * 6.283 - T * .2, r = 26 + (i % 2) * 6; place(q, 360 + Math.cos(a) * r * 1.3, 650 + Math.sin(a) * r * .6, Math.cos(a) > 0 ? -1 : 1, false); act(q, i % 3 ? 'drink' : 'magic', T, 2.4, 1.2, i * .4); }
    else { place(q, spots[i][0], spots[i][1], i % 2 ? 1 : -1, false); act(q, ['hammer', 'cook', 'split', 'build', 'build', 'chop', 'serve', 'sword', 'heal', 'magic', 'lute', 'drink', 'build', 'sword', 'arrow'][i], T, 2.6, 1.6, i * .3); } });
  // novos moradores na apresentação (15,7–19,4 s)
  if (T >= 15.6 && T < 19.45) {
    show(FRED); place(FRED, 256, 648, 1, false); act(FRED, 'magic', T, 2.2, 1.4);
    show(JUJU); place(JUJU, 330, 652, -1, false); act(JUJU, 'gather', T, 2.6, 1.6, .5);
    show(ALLICE); place(ALLICE, 262, 604, 1, false); if (T > 16.2 && T < 17.3) say(ALLICE, 'Já tenho duas casas!', 16.2, 17.3, T);
    show(RAKE); place(RAKE, 334, 606, -1, false);
    show(NICK); walk(NICK, [[470, 700], [432, 662], [414, 654]], T, 17.0, 22); if (!NICK.moving) NICK.face = 1; if (T > 18.2) say(NICK, 'Cheguei!', 18.2, 19.4, T);
    show(BARDO); place(BARDO, 440, 648, -1, false); act(BARDO, 'lute', T, 3.0, 2.8);
  }
  // o rei
  if (T >= 33 && T < 45.8) { show(REI); if (T < 40.1) { place(REI, 540, 1470, 1, false); if (T >= 34.4 && T < 39) act(REI, 'sword', T, 1.6, 1.2); if (T >= 37.2 && T < 39.6) say(REI, 'Guerreiros, comigo!', 37.2, 39.6, T); }
    else { REI.horse = true; walk(REI, [[540, 1480], [520, 1300], [500, 1100], [480, 920]], T, 40.1, 112); } }
  // guerreiros chegando ao rei e cavalgando com ele
  if (T >= 36.8 && T < 45.8) [HIGOR, LEVI, RONIN, GABO, ...WAR.slice(0, 4), ARQ[0], ARQ[1]].forEach((q, i) => { show(q); const dst = [[512 + (i % 5) * 14, 1490 + Math.floor(i / 5) * 12]][0];
    if (T < 40.1) { walk(q, [[[420, 1500], [660, 1500], [460, 1440], [620, 1440]][i % 4], dst], T, 37.0 + i * .12, 40); if (!q.moving) q.face = dst[0] < 540 ? 1 : -1; }
    else { if (i < 6) q.horse = true; walk(q, [[dst[0], dst[1]], [dst[0] - 20, 1300], [dst[0] - 40, 1100], [dst[0] - 60, 930]], T, 40.5 + i * .15, i < 6 ? 108 : 70); } });
  // a batalha (45,8–54,4 s)
  if (battle) {
    show(REI); place(REI, 520, 640, 1, false); act(REI, 'sword', T, 1.2, .9);
    show(HIGOR); place(HIGOR, 532, 626, 1, false); act(HIGOR, 'sword', T, 2.0, 1.0, .4); for (let i = 0; i < 3; i++) { const q = CROWD[i]; show(q); place(q, 506 - i * 8, 630 + i * 6, 1, false); }
    show(LEVI); place(LEVI, 540, 650, 1, false); act(LEVI, 'sword', T, 1.0, .8, .2);
    show(RONIN); { const k = (T * 1.3) % 2, xx = k < 1 ? L2(520, 548, k) : L2(548, 520, k - 1); place(RONIN, xx, 608, k < 1 ? 1 : -1, true); act(RONIN, 'sword', T, .7, .5); }
    show(GABO); place(GABO, 302, 766, -1, false); act(GABO, 'zap', T, 1.5, 1.4);
    show(XAMA); place(XAMA, 318, 800, -1, false); act(XAMA, 'magic', T, 1.6, 1.4, .5);
    MAG.forEach((q, i) => { show(q); place(q, 296, 784 + i * 10, -1, false); act(q, 'magic', T, 1.6, 1.4, i * .3); });
    WAR.forEach((q, i) => { show(q); place(q, [500, 512, 530, 228, 212, 520][i], [600, 660, 672, 760, 790, 590][i], i < 3 || i === 5 ? 1 : 1, false); act(q, 'sword', T, 1.1 + i * .1, .8, i * .2); });
    ARQ.forEach((q, i) => { show(q); place(q, 392 + i * 12, 600 + (i % 2) * 8, i % 2 ? 1 : -1, false); q.act = { kind: 'arrow', t0: T - (T % .9), end: T - (T % .9) + .9 }; });
    show(MEDICO); place(MEDICO, 430, 742, -1, false); act(MEDICO, 'heal', T, 2.2, 2.0);
    FERIDOS.forEach((q, i) => { show(q); place(q, 410 - i * 12, 744 + (i % 2) * 6, 1, false); q.act = { kind: 'gather', t0: 0, end: 1e9 }; });
    show(JUJU); { const p2 = along([[300, 716], [350, 700], [376, 690]], (T - 45.8) * 26); place(JUJU, p2.x, p2.y, p2.face, true); JUJU.carry = true; }
    show(GUARDA); place(GUARDA, 532, 1474, 1, false); act(GUARDA, 'sword', T, 1.3, 1.0); for (let i = 0; i < 2; i++) { const q = WAR[3 + i]; }
  }
  if (T >= 54.4 && T < 57) { [REI, HIGOR, LEVI, RONIN, GABO, XAMA].forEach((q, i) => { show(q); place(q, 392 + i * 14, 646 + (i % 2) * 6, i < 3 ? 1 : -1, false); act(q, 'magic', T, 1.2, .6, i * .2); }); }
  // festa
  if (festa && T < 66) {
    show(REI); place(REI, 360, 676, 1, false); if (T >= 62.7 && T < 65.6) { act(REI, 'sword', T, 1.4, .7); say(REI, 'Viva Eryon!', 63.0, 65.4, T); }
    show(BARDO); place(BARDO, 384, 662, -1, false); act(BARDO, 'lute', T, 3.0, 2.8);
    show(HIGOR); place(HIGOR, 336, 664, 1, false); show(LEVI); place(LEVI, 324, 676, 1, false); show(RONIN); place(RONIN, 398, 682, -1, false);
    show(JUJU); place(JUJU, 300, 718, 1, false); act(JUJU, 'cook', T, 2.4, 2.2); show(GABO); place(GABO, 410, 664, -1, false); act(GABO, 'magic', T, 1.8, 1.4);
    show(ALLICE); place(ALLICE, 344, 690, 1, false); show(FRED); place(FRED, 376, 694, -1, false); show(RAKE); place(RAKE, 316, 650, 1, false); show(NICK); place(NICK, 404, 646, -1, false); act(NICK, 'drink', T, 2.6, 2.2);
    show(MEDICO); place(MEDICO, 420, 700, -1, false); show(XAMA); place(XAMA, 300, 690, 1, false); act(XAMA, 'magic', T, 2, 1.4); show(GUARDA); place(GUARDA, 440, 690, -1, false);
  }
  if (inRoom === 'taverna') { CROWD.slice(30, 40).forEach((q, i) => { show(q, 'taverna'); place(q, [56, 146, 56, 146, 44, 68, 158, 134, 96, 110][i], [82, 82, 116, 116, 70, 96, 104, 70, 92, 108][i], i % 2 ? -1 : 1, false); act(q, 'drink', T + i * .6, 3.4, 2.2); });
    if (festa) { show(BARDO, 'taverna'); place(BARDO, 100, 60, 1, false); act(BARDO, 'lute', T, 3, 2.8); show(LEVI, 'taverna'); place(LEVI, 120, 90, -1, false); act(LEVI, 'drink', T, 2.6, 2.2); } }
  // mistérios: @geo_miriely surge no portal (sem maldade: só curiosidade)
  if (T >= 65.7 && T < 69) { show(GEO); const k = SEG(T, 66.3, 67.6); place(GEO, 1220, 1530, -1, false); GEO.alpha = k; act(GEO, 'magic', T, 2.4, 1.6); }
  // novos moradores acenando para quem vai chegar
  if (T >= 72.4 && T < 77.3) { [REI, BARDO, HIGOR, JUJU, ALLICE, NICK, GABO, RAKE].forEach((q, i) => { show(q); place(q, 338 + (i % 4) * 22, 640 + Math.floor(i / 4) * 22, i % 2 ? -1 : 1, false); act(q, i % 2 ? 'magic' : 'sword', T, 1.6, .8, i * .2); }); }
  // você jogando (o jogo online)
  if (T >= 77.2 && T < 81.6) { show(YOU); if (T < 78.9) walk(YOU, [[350, 672], [392, 664]], T, 77.3, 24); else if (T < 80.2) { place(YOU, 392, 664, 1, false); YOU.act = { kind: 'chop', t0: 78.9, end: 81.3 }; } else walk(YOU, [[392, 664], [430, 640], [470, 610]], T, 80.2, 30); }
  return inRoom;
}
// ---------- rótulos: aparecem na apresentação e somem nos planos abertos
const FEAT = new Map([[REI, [[33.2, 39.9], [40.1, 45.7], [62.7, 65.6], [72.4, 77.2]]], [FRED, [[15.7, 17.35]]], [JUJU, [[15.7, 17.35]]], [ALLICE, [[15.7, 17.35]]], [RAKE, [[15.7, 17.35]]],
  [NICK, [[17.4, 19.4]]], [BARDO, [[17.4, 19.4], [57.1, 59.4]]], [HIGOR, [[45.9, 46.8]]], [GABO, [[46.84, 47.38]]], [XAMA, [[46.84, 47.38]]], [LEVI, [[48.0, 48.95]]], [RONIN, [[48.0, 48.95]]],
  [MEDICO, [[49.8, 51.2]]], [GUARDA, [[51.25, 52.25]]], [GEO, [[66.4, 68.9]]], [YOU, [[77.3, 81.5]]]]);
window.CINE_LABEL = q => { const T = window.__VT, z = SEG(S, 3.1, 4.2); const w = FEAT.get(q); if (!w) return 0; for (const [a, b] of w) if (T >= a && T < b) return z * SEG(T, a, a + .3) * (1 - SEG(T, b - .25, b)); return 0; };

// ---------- efeitos no mundo (desenhados pelo motor, por cima dos objetos)
let MASK_SPR = null;
window.CINE_DRAW = function (x, t, room) {
  if (room) return; const T = window.__VT;
  drawMonsters(x, t);
  // floresta queimando onde o monstro de fogo passou (passa depois da batalha)
  if (T >= 27.2 && T < 56) for (let i = 0; i < 7; i++) { const X = 150 + i * 16, Y = 790 + (i % 3) * 8 - i * 3; if (T < 27.2 + i * .35) continue; flame(x, X, Y, 10 + (i % 3) * 3, t, i * 5); glow(x, X, Y - 6, 12, P.fire2, .15); smoke(x, X, Y - 16, t + i, 4, '#4a4444'); }
  // máscara de bico do médico da peste
  if (!MEDICO.hidden && !MEDICO.room) { const f = MEDICO.face || 1, hx = Math.round(MEDICO.x + f * 4), hy = Math.round(MEDICO.y - 12); px(x, '#140e06', hx - (f < 0 ? 4 : 0), hy - 1, 5, 3); px(x, '#e4d0a0', hx - (f < 0 ? 3 : 0), hy, 3, 1); px(x, '#c9a46a', hx + (f < 0 ? -4 : 3), hy + 1, 1, 1); }
  // escudo do paladino
  if (!HIGOR.hidden && !HIGOR.room && T >= 45.8 && T < 54.4) { const f = HIGOR.face || 1, X = Math.round(HIGOR.x + f * 5), Y = Math.round(HIGOR.y - 10); px(x, '#140e06', X - 3, Y - 4, 7, 9); px(x, '#c3cad6', X - 2, Y - 3, 5, 7); px(x, '#a83a32', X, Y - 3, 1, 7); px(x, '#a83a32', X - 2, Y - 1, 5, 1); glow(x, X, Y, 9, '#9ff3ff', .12 + .08 * Math.sin(t * 6)); }
  // livro da bibliotecária e cristais do senhor feudal
  if (!RAKE.hidden && !RAKE.room) { const f = RAKE.face || 1, X = Math.round(RAKE.x + f * 4), Y = Math.round(RAKE.y - 9); px(x, '#140e06', X - 2, Y - 1, 5, 4); px(x, '#6e4a8a', X - 1, Y, 3, 2); px(x, '#f4f0d8', X, Y, 1, 2); }
  if (!FRED.hidden && !FRED.room) for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.09, X = Math.round(FRED.x + Math.cos(a) * 9), Y = Math.round(FRED.y - 14 + Math.sin(a) * 3); px(x, '#140e06', X - 1, Y - 2, 3, 5); px(x, ['#d0a0ff', '#9ff3ff', '#f6b6d8'][i], X, Y - 1, 1, 3); glow(x, X, Y, 5, '#d0a0ff', .15); }
  // portal: a criatura misteriosa aparece com luz roxa
  if (T >= 65.7 && T < 69.2) { const k = SEG(T, 65.8, 67.2); glow(x, 1220, 1512, 30, '#9a5ad0', .25 * k + .1 * Math.sin(t * 3) * k); burst(x, t, 66.0, 1220, 1515, 20, ['#d0a0ff', '#9a5ad0', '#ffffff'], 18, 2.5, -8, 33); }
  // projéteis: flechas no dragão, raios do mago no monstro de fogo
  if (T >= 45.8 && T < 53.4) {
    for (const q of ARQ) for (let k = 0; k < 2; k++) { const u = ((T * 1.4 + k * .5 + q.id * .13) % 1), X = L2(q.x, MON.d.x, u), Y = L2(q.y - 8, MON.d.y - MON.d.alt, u) - Math.sin(u * Math.PI) * 18; px(x, '#140e06', Math.round(X) - 2, Math.round(Y), 5, 1); px(x, '#c9a46a', Math.round(X) - 1, Math.round(Y), 3, 1); px(x, '#efe2bf', Math.round(X) + 2, Math.round(Y), 1, 1); }
    if (GABO.act && GABO.act.kind === 'zap' && T - GABO.act.t0 < .5) { let X = MON.f.x + 4, Y = MON.f.y - 110; x.globalCompositeOperation = 'lighter'; for (let s = 0; s < 10; s++) { const nx = MON.f.x + 4 + (h2(s, Math.floor(T * 10)) - .5) * 16, ny = Y + 10; for (let k = 0; k <= 10; k++) px(x, s % 2 ? '#9ff3ff' : '#ffffff', Math.round(L2(X, nx, k / 10)), Math.round(L2(Y, ny, k / 10)), 2, 1); X = nx; Y = ny; } x.globalCompositeOperation = 'source-over'; glow(x, MON.f.x, MON.f.y - 20, 24, '#9ff3ff', .3); }
    if (Math.floor(T * 3) % 2 === 0) for (let k = 0; k < 6; k++) { const u = (T * 1.7 + k / 6) % 1; px(x, '#84c65a', Math.round(L2(XAMA.x, MON.f.x, u)), Math.round(L2(XAMA.y - 10, MON.f.y - 30, u) + Math.sin(u * 12) * 4), 2, 2); }
    // faíscas nos golpes
    for (const h of HITS) if (T >= h && T < h + .35) { burst(x, t, h, MON.g.x - 18, MON.g.y - 40, 16, ['#fff3b0', '#ffd84a', '#c3cad6'], 26, .4, 10, Math.round(h * 10)); }
  }
  // festa: lanternas entre as casas e fogueiras extras
  if (T >= 57 && T < 66) { const L = [[300, 600], [362, 578], [418, 604], [452, 606], [484, 676], [428, 722], [300, 716], [236, 652]];
    for (let i = 0; i < L.length; i++) { const [a, b] = L[i], [c, d] = L[(i + 1) % L.length]; for (let k = 1; k < 8; k++) { const u = k / 8, X = Math.round(L2(a, c, u)), Y = Math.round(L2(b - 22, d - 22, u) + Math.sin(u * Math.PI) * 8); px(x, ['#ffd84a', '#e04a3a', '#9ff3ff', '#84c65a'][(k + i) % 4], X, Y, 2, 2); } }
    for (const [X, Y] of [[330, 640], [394, 640], [362, 696]]) { drawFire(x, X, Y, t, .6); } }
};
// ---------- efeitos de tela depois do motor: fogos de artifício, céu do ataque e janelas do castelo acesas
function postFx(T) {
  const W = cv.width, H = cv.height, toS = (wx, wy) => [(wx - cam.L) * S, (wy - cam.T) * S];
  if (T >= 19.6 && T < 56.5) { const k = Math.min(SEG(T, 19.6, 24), 1 - SEG(T, 54.4, 56.5)); ctx.fillStyle = `rgba(120,30,10,${(.18 * k).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  if (T >= 57 && T < 66) { ctx.globalCompositeOperation = 'source-over';
    for (let n = 0; n < 6; n++) { const per = 1.6, i = Math.floor((T + n * .53) / per), k = ((T + n * .53) % per) / per, rx = h2(i, n + 1), ry = h2(n + 1, i), cx2 = W * (.15 + rx * .7), cy2 = H * (.12 + ry * .3), col = ['255,216,74', '159,243,255', '246,182,216', '132,198,90', '255,122,26'][(i + n) % 5];
      if (k < .25) { ctx.fillStyle = `rgba(${col},.95)`; ctx.fillRect(cx2 - 5, cy2 + (1 - k / .25) * H * .4, 10, 22); continue; }
      const r = (k - .25) / .75; for (let j = 0; j < 36; j++) { const a = j / 36 * 6.283, d = r * W * .2, X = cx2 + Math.cos(a) * d, Y = cy2 + Math.sin(a) * d + r * r * 80; ctx.fillStyle = `rgba(${col},${(1 - r).toFixed(2)})`; ctx.fillRect(X - 6, Y - 6, 12, 12); for (let tr = 1; tr < 4; tr++) { const d2 = d * (1 - tr * .12); ctx.fillStyle = `rgba(${col},${((1 - r) * (.5 - tr * .12)).toFixed(2)})`; ctx.fillRect(cx2 + Math.cos(a) * d2 - 4, cy2 + Math.sin(a) * d2 + r * r * 80 - tr * 6 - 4, 8, 8); } } }
    if (T >= 61.3 && T < 62.7) { for (const [wx, wy] of [[CASTLE.ox + 104, CASTLE.oy + 36], [CASTLE.ox + 129, CASTLE.oy + 36], [CASTLE.ox + 154, CASTLE.oy + 36], [CASTLE.ox + 104, CASTLE.oy + 66], [CASTLE.ox + 154, CASTLE.oy + 66], [CASTLE.ox + 30, CASTLE.oy + 152], [CASTLE.ox + 230, CASTLE.oy + 152], [CASTLE.ox + 130, CASTLE.oy + 190]]) { const [sx, sy] = toS(wx, wy), g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 16 * S); g.addColorStop(0, 'rgba(255,200,90,.55)'); g.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = g; ctx.fillRect(sx - 16 * S, sy - 16 * S, 32 * S, 32 * S); } }
    ctx.globalCompositeOperation = 'source-over'; }
  if (T >= 65.7 && T < 69.2) { const k = SEG(T, 65.8, 67.2), [sx, sy] = toS(1220, 1512), g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 60 * S); g.addColorStop(0, `rgba(154,90,208,${(.35 * k).toFixed(2)})`); g.addColorStop(1, 'rgba(154,90,208,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
}

// ---------- camadas de texto e telas
const ov = document.createElement('div'); ov.id = 'ep4'; document.body.appendChild(ov);
ov.innerHTML = `<style>
#ep4{position:fixed;inset:0;z-index:20;pointer-events:none;font-family:Pix,monospace}
#ep4 .cap{position:absolute;left:18px;right:18px;top:476px;text-align:center;font:700 17px/1.18 Pix,monospace;color:#ffd84a;text-transform:uppercase;letter-spacing:.6px;
  text-shadow:-1.5px -1.5px 0 #140e06,0 -1.5px 0 #140e06,1.5px -1.5px 0 #140e06,-1.5px 0 0 #140e06,1.5px 0 0 #140e06,-1.5px 1.5px 0 #140e06,0 1.5px 0 #140e06,1.5px 1.5px 0 #140e06,0 3px 0 #140e06}
#ep4 .cap .u{text-transform:none;color:#fff}
#ep4 .cnt{position:absolute;left:50%;top:60px;transform:translateX(-50%);padding:7px 12px 6px;background:#1c2a22;border:2px solid #060b0a;box-shadow:inset 0 0 0 2px #c9a46a,0 3px 0 rgba(0,0,0,.4);text-align:center;white-space:nowrap}
#ep4 .cnt b{display:block;font:400 22px/1 P2P,monospace;color:#ffd84a;text-shadow:2px 2px 0 #140e06}
#ep4 .cnt span{display:block;margin-top:4px;font:700 11px Pix,monospace;color:#fff3b0;letter-spacing:2px}
#ep4 .meta{position:absolute;left:50%;top:132px;transform:translateX(-50%);padding:6px 12px 5px;background:#24120c;border:2px solid #060b0a;box-shadow:inset 0 0 0 2px #ffd84a;font:400 11px P2P,monospace;color:#ffd84a;white-space:nowrap;text-shadow:2px 2px 0 #140e06}
#ep4 .ttl{position:absolute;left:0;right:0;top:120px;text-align:center;font:400 19px/1.3 P2P,monospace;color:#ffd84a;text-shadow:2px 2px 0 #140e06,-2px -2px 0 #140e06,2px -2px 0 #140e06,-2px 2px 0 #140e06,0 4px 0 #140e06}
#ep4 .ttl.low{top:250px}#ep4 .ttl.nm{font:700 30px/1.2 Pix,monospace;letter-spacing:1px}#ep4 .ttl.red{color:#ff7a5a}#ep4 .ttl.blue{color:#9ff3ff}
#ep4 .ttl small{display:block;margin-top:8px;font:700 12px Pix,monospace;color:#fff3b0;letter-spacing:2px}
#ep4 .fade{position:absolute;inset:0;background:#000}
#ep4 .end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:radial-gradient(ellipse at center,rgba(12,20,16,.55),rgba(4,6,8,.92));text-align:center}
#ep4 .end h1{margin:0;font:400 44px/1 P2P,monospace;color:#ffd84a;text-shadow:3px 3px 0 #140e06,-3px -3px 0 #140e06,3px -3px 0 #140e06,-3px 3px 0 #140e06,0 6px 0 #140e06}
#ep4 .end p{margin:0;font:700 16px Pix,monospace;color:#fff3b0;letter-spacing:2px;text-shadow:2px 2px 0 #140e06}
#ep4 .end .btn{margin-top:10px;padding:10px 18px 8px;background:#ffd84a;color:#140e06;font:400 13px P2P,monospace;border:3px solid #140e06;box-shadow:0 4px 0 #140e06}
#ep4 .end .bio{font:700 22px Pix,monospace;color:#9ff3ff;letter-spacing:3px}
</style><div class="fade"></div><div class="cnt"><b>800</b><span>MORADORES</span></div><div class="meta">META: 1.000 MORADORES</div><div class="ttl"></div><div class="cap"></div>
<div class="end"><h1>ERYON</h1><p>CADA SEGUIDOR, UMA HISTÓRIA.</p><div class="btn">JOGUE ONLINE</div><div class="bio">▼ LINK NA BIO ▼</div></div>`;
const $o = s => ov.querySelector(s), capEl = $o('.cap'), cntEl = $o('.cnt'), metaEl = $o('.meta'), ttlEl = $o('.ttl'), fadeEl = $o('.fade'), endEl = $o('.end');
let CAPS = []; window.loadCaps = c => { CAPS = c; };
const TITLES = [[10.1, 11.7, 'ERYON CRESCEU', ''], [21.4, 23.95, 'ERYON FOI ATACADA!', '', 'red'], [24.6, 26.9, 'GIGANTE DE PEDRA', 'surgiu das montanhas', 'red'], [27.25, 29.75, 'MONSTRO DE FOGO', 'invadiu a floresta', 'red'], [30.4, 33.0, 'DRAGÃO DE FOGO', 'apareceu nos céus', 'red'],
  [34.2, 39.6, '@emanuel01.f', 'REI DE ERYON', 'nm'], [42.4, 45.6, 'A BATALHA DOS', 'TRÊS MONSTROS'], [53.4, 54.45, 'VITÓRIA!', ''], [54.6, 56.9, 'OS TRÊS MONSTROS', 'FORAM DERROTADOS'], [57.3, 59.4, 'ERYON EM FESTA', ''],
  [66.3, 68.9, 'NOVOS MISTÉRIOS...', '', 'blue'], [73.5, 77.2, 'COMENTE QUEM', 'VOCÊ QUER SER EM ERYON'], [78.0, 80.8, 'ERYON ONLINE', 'explore no seu celular', 'low']];
function overlays(T) {
  const c = CAPS.find(q => T >= q.s && T < q.e); capEl.innerHTML = c ? c.html : ''; capEl.style.opacity = c ? Math.min(1, (T - c.s) / .12) : 0;
  const a1 = T >= 1.4 && T < 10.0, a2 = T >= 69.0 && T < 72.4; cntEl.style.opacity = a1 ? Math.min(SEG(T, 1.4, 1.7), 1 - SEG(T, 9.7, 10.0)) : a2 ? Math.min(SEG(T, 69.0, 69.3), 1 - SEG(T, 72.1, 72.4)) : 0;
  if (a1) { cntEl.querySelector('b').textContent = T < 5.0 ? '800' : T < 6.2 ? String(Math.round(800 + 100 * EASE(SEG(T, 5.0, 6.2)))) : '900'; cntEl.querySelector('span').textContent = T < 5.0 ? 'MORADORES' : 'HABITANTES'; }
  if (a2) { cntEl.querySelector('b').textContent = '900 / 1.000'; cntEl.querySelector('span').textContent = 'ERYON · MORADORES'; }
  metaEl.textContent = a2 ? 'FALTAM APENAS 100!' : 'META: 1.000 MORADORES'; metaEl.style.opacity = T >= 8.1 && T < 10.0 ? Math.min(SEG(T, 8.1, 8.4), 1 - SEG(T, 9.7, 10.0)) : T >= 69.7 && T < 72.4 ? Math.min(SEG(T, 69.7, 70.0), 1 - SEG(T, 72.1, 72.4)) : 0;
  const ti = TITLES.find(q => T >= q[0] && T < q[1]); ttlEl.className = 'ttl' + (ti && ti[4] ? ' ' + ti[4] : ''); ttlEl.innerHTML = ti ? `${ti[2]}${ti[3] ? `<small>${ti[3]}</small>` : ''}` : ''; ttlEl.style.opacity = ti ? Math.min(SEG(T, ti[0], ti[0] + .3), 1 - SEG(T, ti[1] - .3, ti[1])) : 0;
  let f = 0; for (const [a, b] of [[65.55, 66.05], [68.8, 69.2]]) { const m = (a + b) / 2; if (T > a && T < b) f = Math.max(f, 1 - Math.abs(T - m) / ((b - a) / 2)); }
  if (T < .5) f = 1 - SEG(T, 0, .5);
  fadeEl.style.opacity = f;
  endEl.style.opacity = T >= 81.55 ? SEG(T, 81.55, 81.95) : 0;
  document.body.classList.toggle('cine-ui', T >= 77.26 && T < 81.55);
}
// ---------- quadro
const dummy = { x: 0, y: 0, room: '' }; let shakeX = 0, shakeY = 0;
window.render = function (T) {
  window.__VT = T; seed = 1 + Math.floor(T * 30);
  const room = stage(T); monsters(T);
  players.clear(); for (const q of NPC) if (!q.hidden) players.set(q.id, q);
  GIANT.damaged = new Set(T >= 31.6 && T < 56.5 ? ['casa_7', 'armazem'] : []); GIANT.lastKind = 'fogo';
  const c = camAt(T); let p = null;
  // tremor nos passos do gigante e nos golpes
  const stompT = (T >= 24.0 && T < 27.0 && (T * 2.2) % 1 < .12) || (T >= 52.4 && T < 53.2) || HITS.some(h => T >= h && T < h + .1);
  shakeX = stompT ? (h2(Math.floor(T * 60), 1) - .5) * 4 : 0; shakeY = stompT ? (h2(1, Math.floor(T * 60)) - .5) * 3 : 0;
  if (room) { const r = roomOf(room); dummy.room = room; dummy.x = L2(r.w * .4, r.w * .58, SEG(T % 10, 0, 2)); dummy.y = r.h * .62; p = dummy; S = 7; window.dayPhase = () => .2; }
  else { cam.mode = 'free'; cam.x = c.x + shakeX; cam.y = c.y + shakeY; if (T >= 40.1 && T < 45.8) { cam.x = REI.x + 10; cam.y = REI.y - 30; } S = Math.max(sMin(), c.s); const ph = c.ph; window.dayPhase = () => ph; }
  overlays(T);
  if (T >= 77.26 && T < 81.55) { $('magicBtn').textContent = 'Machadada'; $('actBtn').hidden = T >= 80.2; $('actBtn').textContent = 'Derrubar árvore'; $('onlineBtn').style.display = 'none'; $('msg').placeholder = 'Fale com Eryon...'; }
  draw(T, p); if (!room) postFx(T);
};
window.EP4_READY = true;
})();
