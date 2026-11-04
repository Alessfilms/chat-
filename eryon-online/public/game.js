// =====================================================================
// ERYON ONLINE — cliente do jogo (mapa aberto multiplayer)
// Usa engine.js (o mesmo mapa dos episódios) e o estado da vila do Ep. 2.
// =====================================================================
const $ = id => document.getElementById(id);
const API = (p, o) => fetch(p, o).then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { } }, del: k => { try { localStorage.removeItem(k); } catch { } } };

// ---------------------------------------------------------------- personagens dos episódios (pelo @)
const NAMED = {
  heitor_morrone: { hair: '#3a2618', beard: '#3a2618', shirt: '#a83a32', shirtD: '#5a2418', plaid: true, pants: '#2c4f7a', role: 'Lenhador' },
  lorhan_cristian: { hair: '#5a3a26', shirt: '#d0622a', shirtD: '#8a3a1c', pants: '#4a535c', hat: 'palha', role: 'Construtor' },
  'maicon.sg2010': { hair: '#1a1208', shirt: '#3f7ab0', shirtD: '#2c4f7a', pants: '#4a2f22', hat: 'bone', capColor: '#ffd84a', role: 'Construtor' },
  pablopaesrocha: { hair: '#1a1208', beard: '#1a1208', shirt: '#8b5e3c', shirtD: '#4a2f22', pants: '#2b3138', apron: '#3a2618', role: 'Mestre ferreiro' },
  _ray_hpl: { hair: '#5a3a26', shirt: '#eef0ea', shirtD: '#98a4ac', pants: '#2c4f7a', hat: 'chef', apron: '#c4ccd0', role: 'Cozinheiro' },
  paocombiscoito: { hair: '#8b5e3c', shirt: '#eef0ea', shirtD: '#98a4ac', pants: '#3c5d4a', belt: '#4e6c4a', role: 'Médico' },
  altanat19: { hair: '#1a1208', shirt: '#6e4a8a', shirtD: '#3a2650', pants: '#4a2f22', apron: '#e4d0a0', role: 'Valis · Taverneiro' },
  'eo_preto.031': { big: true, hair: '#1a1208', armor: '#4a535c', rust: '#8b5e3c', pants: '#2b3138', boots: '#1a1208', skin: '#c08060', skinD: '#8b5e3c', role: 'Gerald D. Black' },
  bio_leocordeiro: { hair: '#98a4ac', wolfEars: true, elfEars: true, cape: '#4e6c4a', shirt: '#4a535c', shirtD: '#2b3138', pants: '#2e1d16', role: 'Fenrir' },
  'kaguya.xs': { hair: '#e6efa0', longHair: true, elfEars: true, crown: true, shirt: '#3fd0e0', shirtD: '#2c4f7a', pants: '#1d3550', cape: '#1d3550', role: 'Nyx' },
};
const HAIRS = ['#d0622a', '#ffd84a', '#1a1208', '#5a3a26', '#8b5e3c', '#c4ccd0', '#a83a32', '#e6efa0'];
const SHIRTS = ['#a83a32', '#3f7ab0', '#6e4a8a', '#3c5d4a', '#d0622a', '#e4d0a0', '#4a535c', '#b06a9a'];
const PANTS = ['#3c5f9a', '#4a2f22', '#2b3138', '#3c5d4a', '#6b4630', '#1d3550'];
const shade = h => { const [r, g, b] = hex(h); return '#' + [r, g, b].map(v => Math.round(v * .6).toString(16).padStart(2, '0')).join(''); };
const builders = new Map();
function charFor(username, look) {
  const key = username + JSON.stringify(look || {});
  if (!builders.has(key)) {
    const sp = NAMED[username] || { hair: look?.hair || HAIRS[0], shirt: look?.shirt || SHIRTS[1], shirtD: shade(look?.shirt || SHIRTS[1]), pants: look?.pants || PANTS[0], longHair: !!look?.longHair };
    builders.set(key, charBuilder(sp));
  }
  return builders.get(key);
}

// ---------------------------------------------------------------- vila (estado do fim do Ep. 2)
let B = {}, villageLayer = null, OBJ = [], blockers = [];
const VR = 214, PAL_R = 212, GATE = { x: 482, y: 475 };
const GATE_A = Math.atan2((GATE.y - C.y) / .95, GATE.x - C.x), SOUTH_A = Math.PI / 2;
function buildWorld(world) {
  for (const b of world.construcoes) B[b.id] = b;
  const [v, x] = canvas(WW, WH); villageLayer = v;
  x.drawImage(ground, 0, 0);
  x.save(); x.beginPath(); x.ellipse(C.x, C.y, VR, VR * .95, 0, 0, 6.283); x.clip(); x.drawImage(clearTex, 0, 0); x.restore();
  const pts = [];
  const road = p => { for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s < d; s += 2) pts.push([a[0] + (b[0] - a[0]) * s / d, a[1] + (b[1] - a[1]) * s / d]); } };
  road([[360, 622], [400, 566], [440, 520], [GATE.x, GATE.y], [496, 452], [508, 425], [520, 404]]);
  road([[340, 642], [270, 640], [208, 624], [170, 630]]); road([[380, 644], [440, 664], [480, 690], [530, 712]]);
  road([[362, 664], [362, 720], [pathS(780), 780], [pathS(860), 860]]); road([[352, 650], [310, 700], [300, 790]]); road([[372, 652], [420, 700], [420, 786]]); road([[350, 628], [306, 560], [306, 522]]);
  for (const [X, Y] of pts) px(x, P.dirt2, Math.round(X) - 3, Math.round(Y) - 2, 7, 5);
  for (const [X, Y] of pts) if (h2(Math.round(X), Math.round(Y)) > .8) px(x, P.sand, Math.round(X) - 1, Math.round(Y), 2, 1);
  disc(x, C.x, C.y, 24, P.dirt2); disc(x, C.x, C.y, 18, P.dirt1);
  for (const f of [B.plantacao_1, B.plantacao_2]) { px(x, P.dirt1, f.x - f.w / 2, f.y - f.h / 2, f.w, f.h);
    for (let r = 0; r < Math.floor(f.h / 4); r++) for (let c = 0; c < f.w - 2; c += 3) px(x, (r + c) % 7 === 0 ? P.fire3 : P.f8, f.x - f.w / 2 + 1 + c, f.y - f.h / 2 + r * 4, 1, 3);
    for (let c = 0; c <= f.w; c += 4) px(x, P.woodL, f.x - f.w / 2 + c, f.y - f.h / 2 - 2, 1, 3); }
  // ruínas a nordeste (desenho estático)
  { const X = RUINS.x, Y = RUINS.y; for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + .3, p0 = Math.round(X + Math.cos(a) * 20), q0 = Math.round(Y + Math.sin(a) * 13), hg = 5 + (i * 5) % 11;
      px(x, P.ink, p0 - 3, q0 - hg - 1, 7, hg + 3); px(x, P.st2, p0 - 2, q0 - hg, 5, hg + 1); px(x, P.st3, p0 - 2, q0 - hg, 5, 2); }
    px(x, P.ink, 522, 383, 13, 16); px(x, P.st1, 523, 384, 11, 14); [[0, 0, 1, 3], [4, 0, 1, 3], [7, 0, 1, 1], [1, 5, 3, 1], [6, 5, 2, 2], [2, 9, 3, 1]].forEach(([a, b, w, h]) => px(x, P.cy2, 524 + a, 385 + b, w, h)); }
  // árvores (as da área da vila foram derrubadas e viraram casas)
  const pathNear = (X, Y) => { const L = [[474, 498], [482, 476], [492, 456], [502, 438], [508, 425], [514, 414], [522, 404]]; for (let i = 0; i < L.length - 1; i++) { const [ax, ay] = L[i], [bx, by] = L[i + 1], dx = bx - ax, dy = by - ay, k = clamp(((X - ax) * dx + (Y - ay) * dy) / (dx * dx + dy * dy)); if (Math.hypot(X - ax - dx * k, Y - ay - dy * k) < 15) return true; } return false; };
  for (const t of trees) { if (t.dc < VR + 4 || pathNear(t.x, t.y + 6)) continue; const sp = treeSprites[t.s]; OBJ.push({ y: t.y, x: t.x, img: sp.c, dx: t.x - sp.ax, dy: t.y - sp.ay }); blockers.push({ k: 'c', x: t.x, y: t.y - 1, r: 3.5 }); }
  const bld = (b, spr, ox, oy, w, h) => { if (!b) return; OBJ.push({ y: b.y, x: b.x, img: spr, dx: b.x + ox, dy: b.y + oy }); blockers.push({ k: 'r', x0: b.x - w / 2, x1: b.x + w / 2, y0: b.y - h, y1: b.y }); };
  ['casa_1', 'casa_2', 'casa_3', 'casa_4', 'casa_5', 'casa_6', 'casa_7', 'casa_8', 'casa_9'].forEach(id => B[id] && bld(B[id], HOUSE_SPR[B[id].telhado || 0], -15, -26, 26, 10));
  bld(B.forja, FORGE_SPR, -18, -28, 34, 12); bld(B.taverna, TAVERN_SPR[1], -24, -36, 46, 14); bld(B.enfermaria, TENT_SPR, -17, -24, 30, 10); bld(B.armazem, SHED_SPR, -13, -22, 26, 10);
  OBJ.push({ y: B.cozinha.y, x: B.cozinha.x, img: KITCHEN_SPR, dx: B.cozinha.x - 20, dy: B.cozinha.y - 26 });
  OBJ.push({ y: 628, x: 360, img: (() => { const [c, q] = canvas(23, 6); px(q, P.ink, 0, 0, 23, 6); px(q, P.woodD, 1, 1, 21, 4); px(q, P.wood, 1, 1, 21, 1); return c; })(), dx: 349, dy: 622 });
  blockers.push({ k: 'r', x0: 349, x1: 372, y0: 622, y1: 628 }, { k: 'c', x: C.x, y: C.y, r: 7 });
  // paliçada com portões
  const [pc, pq] = canvas(4, 10); px(pq, P.ink, 0, 0, 4, 9); px(pq, P.wood, 1, 1, 2, 7); px(pq, P.woodL, 1, 0, 1, 1);
  for (let i = 0; i < 150; i++) { const a = -Math.PI + i / 150 * 6.283; if (Math.abs(Math.atan2(Math.sin(a - GATE_A), Math.cos(a - GATE_A))) < .07 || Math.abs(Math.atan2(Math.sin(a - SOUTH_A), Math.cos(a - SOUTH_A))) < .05) continue;
    const X = Math.round(C.x + Math.cos(a) * PAL_R), Y = Math.round(C.y + Math.sin(a) * PAL_R * .95); OBJ.push({ y: Y, x: X, img: pc, dx: X - 1, dy: Y - 8 }); }
  OBJ.sort((a, b) => a.y - b.y);
}
// colisão
const treeGrid = new Map();
function indexBlockers() { for (const b of blockers) { const key = b.k === 'c' ? Math.floor(b.x / 32) + ',' + Math.floor(b.y / 32) : 'r'; if (!treeGrid.has(key)) treeGrid.set(key, []); treeGrid.get(key).push(b); } }
function blocked(x, y) {
  if (x < 4 || y < 10 || x > WW - 4 || y > WH - 4) return true;
  if (Math.abs(y - riverY(x)) < 9 && Math.abs(x - BRIDGE.x) > 6) return true;
  const dx = x - C.x, dy = (y - C.y) / .95, r = Math.hypot(dx, dy);
  if (r > PAL_R - 3 && r < PAL_R + 3) { const a = Math.atan2(dy, dx); if (Math.abs(Math.atan2(Math.sin(a - GATE_A), Math.cos(a - GATE_A))) > .07 && Math.abs(Math.atan2(Math.sin(a - SOUTH_A), Math.cos(a - SOUTH_A))) > .05) return true; }
  for (const b of treeGrid.get('r') || []) if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return true;
  const gx0 = Math.floor(x / 32), gy0 = Math.floor(y / 32);
  for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (const b of treeGrid.get((gx0 + a) + ',' + (gy0 + c)) || []) if (Math.hypot(x - b.x, (y - b.y) * 1.4) < b.r) return true;
  return false;
}

// ---------------------------------------------------------------- estado do jogo
let token = store.get('eryon_token'), me = null, myLook = null, ws = null, myId = 0;
const players = new Map();           // id -> {username, look, x, y, tx, ty, face, moving, say, sayT}
const keys = new Set(); let target = null;
const cv = $('game'), ctx = cv.getContext('2d');
let DPR = 1, S = 4;
function resize() { DPR = Math.min(window.devicePixelRatio || 1, 3); cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR); ctx.imageSmoothingEnabled = false; S = Math.max(2, Math.round(Math.min(cv.width / 150, cv.height / 250))); }
addEventListener('resize', resize); resize();
const [view, vx] = canvas(Math.ceil(4000 / 2) + 4, Math.ceil(4000 / 2) + 4);
const [light, lx] = canvas(view.width, view.height);

// ---------------------------------------------------------------- login e aparência
function showErr(m) { $('err').textContent = m || ''; }
let verifyOn = false, openOn = false, postUrl = '', pollT = null;
fetch('/api/config').then(r => r.json()).then(c => { openOn = !!c.open; verifyOn = !!c.verify; postUrl = c.postUrl || ''; if (openOn) { $('enter').textContent = 'Entrar em Eryon'; $('haveCode').hidden = false; $('sub').innerHTML = 'A cidade dos seguidores.<br>Digite o seu @ do Instagram e entre.'; } else if (!verifyOn) showCode(true); }).catch(() => showCode(true));
function showCode(on) { $('codeRow').hidden = !on; $('haveCode').hidden = on || !(verifyOn || openOn); $('enter').textContent = on ? 'Entrar em Eryon' : 'Continuar';
  $('sub').innerHTML = on ? 'A cidade dos seguidores.<br>Entre com o seu @ e o código que você recebeu.' : 'A cidade dos seguidores.<br>Digite o seu @ do Instagram para entrar.'; }
$('haveCode').onclick = () => showCode(true);
const post = (p, b) => API(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
$('enter').onclick = async () => {
  const username = $('user').value.trim(); if (!username) return showErr('Digite o seu @.');
  showErr(''); $('enter').disabled = true;
  if (!$('codeRow').hidden) {                       // entrada com código (reserva)
    const code = $('code').value; if (!code) { $('enter').disabled = false; return showErr('Digite o código.'); }
    const r = await post('/api/login', { username, code }); $('enter').disabled = false;
    if (!r.ok) return showErr(r.data.error || 'Não foi possível entrar.');
    token = r.data.token; store.set('eryon_token', token); return afterLogin(r.data);
  }
  if (openOn) {                                      // entrada livre
    const j = await post('/api/join', { username }); $('enter').disabled = false;
    if (j.ok) { token = j.data.token; store.set('eryon_token', token); return afterLogin(j.data); }
    if (j.data.reserved) showCode(true);
    return showErr(j.data.error || 'Não foi possível entrar.');
  }
  const r = await post('/api/start', { username }); $('enter').disabled = false;   // verificação pelo comentário
  if (!r.ok) return showErr(r.data.error || 'Não foi possível começar.');
  $('loginCard').hidden = true; $('verifyCard').hidden = false; $('word').textContent = r.data.word;
  const link = r.data.postUrl || postUrl; $('openPost').hidden = !link; if (link) $('openPost').href = link;
  $('vstatus').textContent = 'Esperando o seu comentário…'; $('vstatus').className = 'sub wait';
  clearInterval(pollT);
  pollT = setInterval(async () => {
    const c = await post('/api/check', { id: r.data.id });
    if (c.ok && c.data.token) { clearInterval(pollT); token = c.data.token; store.set('eryon_token', token); $('verifyCard').hidden = true; $('loginCard').hidden = false; return afterLogin(c.data); }
    if (!c.ok) { clearInterval(pollT); $('vstatus').className = 'sub'; $('vstatus').textContent = c.data.error || 'Algo deu errado. Volte e tente de novo.'; return; }
    if (c.data.problem) $('vstatus').textContent = 'Ainda procurando… (o Instagram pode levar até 1 minuto para mostrar o comentário)';
  }, 5000);
};
$('copyWord').onclick = async () => { try { await navigator.clipboard.writeText($('word').textContent); $('copyWord').textContent = 'Copiado!'; } catch { } setTimeout(() => $('copyWord').textContent = 'Copiar', 1500); };
$('back').onclick = () => { clearInterval(pollT); $('verifyCard').hidden = true; $('loginCard').hidden = false; };
$('code').addEventListener('keydown', e => { if (e.key === 'Enter') $('enter').click(); });
$('user').addEventListener('keydown', e => { if (e.key === 'Enter') $('enter').click(); });
function afterLogin(d) {
  me = d.username; myLook = d.look;
  if (!myLook && !NAMED[me]) return pickLook();
  start();
}
function pickLook() {
  $('loginCard').hidden = true; $('verifyCard').hidden = true; $('lookCard').hidden = false;
  myLook = { hair: HAIRS[Math.floor(Math.random() * HAIRS.length)], shirt: SHIRTS[Math.floor(Math.random() * SHIRTS.length)], pants: PANTS[0] };
  const mk = (el, list, key) => { el.innerHTML = ''; list.forEach(c => { const b = document.createElement('div'); b.className = 'sw' + (myLook[key] === c ? ' on' : ''); b.style.background = c; b.onclick = () => { myLook[key] = c; mk(el, list, key); preview(); }; el.appendChild(b); }); };
  mk($('swHair'), HAIRS, 'hair'); mk($('swShirt'), SHIRTS, 'shirt'); mk($('swPants'), PANTS, 'pants'); preview();
  $('lookOk').onclick = async () => { const r = await API('/api/look', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, look: myLook }) }); if (r.ok) myLook = r.data.look; start(); };
}
function preview() { const c = $('preview'), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 14, 17); builders.clear(); const fr = charFor('_preview', myLook).frame({ legs: 'stand', arm: 'down', eyes: 0, br: 0 }); x.drawImage(fr.c, -8, -16); }

// ---------------------------------------------------------------- conexão
function connect() {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', token }));
  ws.onmessage = ev => { const m = JSON.parse(ev.data);
    if (m.t === 'welcome') { myId = m.id; players.clear(); addPlayer(m.me, true); m.players.forEach(p => addPlayer(p)); $('chatlog').innerHTML = ''; m.chat.forEach(logChat); $('online').textContent = m.players.length + 1; }
    else if (m.t === 'join') { addPlayer(m.p); sys(`@${m.p.username} chegou em Eryon`); }
    else if (m.t === 'leave') { const p = players.get(m.id); if (p) sys(`@${p.username} saiu`); players.delete(m.id); }
    else if (m.t === 'state') { $('online').textContent = m.online; for (const s of m.p) { if (s.id === myId) continue; const p = players.get(s.id); if (p) { p.tx = s.x; p.ty = s.y; p.face = s.face; p.moving = s.moving; } } }
    else if (m.t === 'chat') { const p = players.get(m.id); if (p) { p.say = m.text; p.sayT = performance.now(); } logChat(m); } };
  ws.onclose = ev => { if (ev.code === 4001) { store.del('eryon_token'); location.reload(); return; } if (ev.code === 4002) { sys('Você entrou em outro aparelho.'); return; } setTimeout(connect, 2000); };
}
function addPlayer(p, mine) { players.set(p.id, { ...p, tx: p.x, ty: p.y, mine: !!mine, ch: charFor(p.username, p.look) }); }
function logChat(m) { const d = document.createElement('div'); const b = document.createElement('b'); b.textContent = '@' + m.username + ': '; d.appendChild(b); d.appendChild(document.createTextNode(m.text)); pushLog(d); }
function sys(t) { const d = document.createElement('div'); d.style.color = '#9ff3ff'; d.textContent = t; pushLog(d); }
function pushLog(d) { const l = $('chatlog'); l.appendChild(d); while (l.children.length > 6) l.firstChild.remove(); setTimeout(() => { d.style.transition = 'opacity 1s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 1000); }, 15000); }
function sendChat() { const t = $('msg').value.trim(); if (!t || !ws || ws.readyState !== 1) return; ws.send(JSON.stringify({ t: 'chat', text: t })); $('msg').value = ''; $('msg').blur(); }
$('sendBtn').onclick = sendChat; $('msg').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); e.stopPropagation(); });

// ---------------------------------------------------------------- controles
addEventListener('keydown', e => { if (document.activeElement === $('msg')) return; if (e.key === 'Enter') { $('msg').focus(); e.preventDefault(); return; } keys.add(e.key.toLowerCase()); target = null; });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
cv.addEventListener('pointerdown', e => { if (!me) return; $('msg').blur(); const wx = cam.L + (e.clientX * DPR) / S, wy = cam.T + (e.clientY * DPR) / S; target = { x: wx, y: wy }; });
const cam = { L: 0, T: 0 };

// ---------------------------------------------------------------- loop
let last = performance.now(), sendT = 0, lastSent = '';
function start() {
  $('login').style.display = 'none'; $('hud').style.display = 'flex'; $('chatlog').style.display = 'flex'; $('chatbar').style.display = 'flex';
  connect(); requestAnimationFrame(loop);
}
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  const p = players.get(myId);
  if (p) {
    let ix = 0, iy = 0;
    if (keys.has('arrowleft') || keys.has('a')) ix--; if (keys.has('arrowright') || keys.has('d')) ix++;
    if (keys.has('arrowup') || keys.has('w')) iy--; if (keys.has('arrowdown') || keys.has('s')) iy++;
    if (!ix && !iy && target) { const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy); if (d < 2) target = null; else { ix = dx / d; iy = dy / d; } }
    const len = Math.hypot(ix, iy) || 1, sp = 44 * dt, mx = ix / len * sp, my = iy / len * sp;
    let moved = false;
    if (mx && !blocked(p.x + mx, p.y)) { p.x += mx; moved = true; }
    if (my && !blocked(p.x, p.y + my)) { p.y += my; moved = true; }
    if ((ix || iy) && !moved) target = null;
    p.moving = moved; if (ix) p.face = ix < 0 ? -1 : 1;
    sendT += dt; const sig = `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.face},${p.moving}`;
    if (sendT > .1 && sig !== lastSent && ws && ws.readyState === 1) { ws.send(JSON.stringify({ t: 'move', x: p.x, y: p.y, face: p.face, moving: p.moving })); lastSent = sig; sendT = 0; }
  }
  for (const q of players.values()) if (!q.mine) { q.x += (q.tx - q.x) * Math.min(1, dt * 12); q.y += (q.ty - q.y) * Math.min(1, dt * 12); }
  draw(t, p);
  requestAnimationFrame(loop);
}
function draw(t, p) {
  const vw = cv.width / S, vh = cv.height / S;
  let cx = p ? p.x : C.x, cy = p ? p.y - 8 : C.y;
  cx = clamp(cx, vw / 2, WW - vw / 2); cy = clamp(cy, vh / 2, WH - vh / 2);
  const L = cx - vw / 2, T = cy - vh / 2, li = Math.floor(L), ti = Math.floor(T), cw = Math.ceil(vw) + 2, ch = Math.ceil(vh) + 2;
  cam.L = L; cam.T = T;
  const x = vx; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cw, ch);
  x.drawImage(villageLayer, li, ti, cw, ch, 0, 0, cw, ch); x.translate(-li, -ti);
  // objetos ordenados por y (cenário + jogadores)
  const list = [];
  for (const o of OBJ) if (o.x > li - 40 && o.x < li + cw + 40 && o.y > ti - 10 && o.y < ti + ch + 50) list.push(o);
  for (const q of players.values()) list.push({ y: q.y, pl: q });
  list.push({ y: C.y + 1, fire: true });
  list.sort((a, b) => a.y - b.y);
  for (const o of list) {
    if (o.fire) { drawFire(x, C.x, C.y + 1, t); continue; }
    if (o.pl) { const q = o.pl; const f = Math.floor(t * 6 + q.id) % 2; drawCharAt(x, q.ch, q.x, q.y, q.moving ? { legs: f ? 'w1' : 'w2', arm: 'down', eyes: 0, br: 0 } : { legs: 'stand', arm: 'down', eyes: 0, br: Math.floor(t * 1.3 + q.id) % 2 }, q.face || 1); continue; }
    x.drawImage(o.img, o.dx, o.dy);
  }
  if (B.forja) { x.globalAlpha = .6 + .4 * h2(Math.floor(t * 10), 2); px(x, P.fire1, B.forja.x - 7, B.forja.y - 10, 12, 8); px(x, P.fire3, B.forja.x - 5, B.forja.y - 8, 8, 5); x.globalAlpha = 1; smoke(x, B.forja.x + 11, B.forja.y - 30, t, 6); }
  if (target) { x.globalAlpha = .7; ring(x, target.x, target.y, 3 + (Math.floor(t * 4) % 2), P.fire3); x.globalAlpha = 1; }
  // luz de entardecer
  const l = lx; l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, cw, ch);
  l.fillStyle = 'rgba(6,14,22,.32)'; l.fillRect(0, 0, cw, ch); l.translate(-li, -ti); l.globalCompositeOperation = 'destination-out';
  lightHole(l, C.x, C.y, 46 + Math.round(Math.sin(t * 9))); if (B.forja) lightHole(l, B.forja.x, B.forja.y - 8, 24); if (B.taverna) lightHole(l, B.taverna.x, B.taverna.y - 10, 28);
  for (const id of ['casa_1', 'casa_2', 'casa_3', 'casa_4', 'casa_5', 'casa_6', 'casa_7', 'casa_8', 'casa_9']) if (B[id]) lightHole(l, B[id].x, B[id].y - 8, 14);
  if (p) lightHole(l, p.x, p.y - 6, 22);
  l.globalCompositeOperation = 'source-over';
  x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(light, 0, 0, cw, ch, 0, 0, cw, ch);
  // saída ampliada
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#060b0a'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(view, 0, 0, cw, ch, Math.round(-(L - li) * S), Math.round(-(T - ti) * S), cw * S, ch * S);
  // nomes e balões
  const fs = Math.round(15 * DPR), now = performance.now();
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineJoin = 'round';
  for (const q of players.values()) {
    const sx = Math.round((q.x - L) * S), sy = Math.round((q.y - T - (q.ch.sp.big ? 22 : 17)) * S);
    if (sx < -200 || sx > cv.width + 200 || sy < -100 || sy > cv.height + 100) continue;
    ctx.font = `700 ${fs}px Pix, monospace`; ctx.lineWidth = Math.max(3, fs / 4); ctx.strokeStyle = '#140e06';
    const nm = '@' + q.username; ctx.strokeText(nm, sx, sy); ctx.fillStyle = q.mine ? '#ffd84a' : '#ffffff'; ctx.fillText(nm, sx, sy);
    const role = NAMED[q.username]?.role; if (role) { ctx.font = `700 ${Math.round(fs * .72)}px Pix, monospace`; ctx.strokeText(role.toUpperCase(), sx, sy + fs * .8); ctx.fillStyle = '#ffd84a'; ctx.fillText(role.toUpperCase(), sx, sy + fs * .8); }
    if (q.say && now - q.sayT < 6000) bubble(q.say, sx, sy - fs * 1.2, fs);
  }
}
function bubble(text, sx, sy, fs) {
  ctx.font = `700 ${fs}px Pix, monospace`; const maxW = Math.min(cv.width * .6, fs * 16);
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; } if (cur) lines.push(cur);
  const lh = fs * 1.15, w = Math.max(...lines.map(l => ctx.measureText(l).width)) + fs, h = lines.length * lh + fs * .6, bx = Math.round(sx - w / 2), by = Math.round(sy - h), u = Math.max(2, Math.round(fs / 6));
  ctx.fillStyle = '#140e06'; ctx.fillRect(bx - u, by - u, w + u * 2, h + u * 2); ctx.fillRect(sx - u * 2, by + h, u * 4, u * 3);
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(bx, by, w, h); ctx.fillRect(sx - u, by + h, u * 2, u * 2);
  ctx.fillStyle = '#140e06'; ctx.textBaseline = 'top'; lines.forEach((l, i) => ctx.fillText(l, sx, by + fs * .3 + i * lh)); ctx.textBaseline = 'bottom';
}

// ---------------------------------------------------------------- início
fetch('world.json').then(r => r.json()).then(async w => {
  buildWorld(w); indexBlockers(); await document.fonts.load('700 20px Pix');
  // tela de fundo atrás do login: a fogueira de Eryon
  (function idle(n) { if (me) return; draw(n / 1000, null); requestAnimationFrame(idle); })(performance.now());
  if (token) { const r = await API('/api/me?token=' + encodeURIComponent(token)); if (r.ok) return afterLogin(r.data); store.del('eryon_token'); token = null; }
});
