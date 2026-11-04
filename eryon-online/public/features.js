// =====================================================================
// RECURSOS DA COMUNIDADE: missões do dia, nível, conquistas, eventos do Criador,
// apoiadores com bichinho, placas patrocinadas, denúncia e tutorial
// =====================================================================
function readPerk() { try { return JSON.parse(localStorage.getItem('eryon_perk') || 'null'); } catch { return null; } }
let PROG = null, SIGNS = [], SUPPORT = { url: '', pix: '' };
fetch('/api/config').then(r => r.json()).then(c => { if (c.support) SUPPORT = c.support; }).catch(() => {});

// ---------- avisos na tela (fila)
const toastQ = []; let toastOn = false;
function fxToast(title, sub, color = '#ffd84a', icon = '★') {
  toastQ.push({ title, sub, color, icon }); if (!toastOn) nextToast();
}
function nextToast() {
  const t = toastQ.shift(); if (!t) { toastOn = false; return; } toastOn = true;
  const el = $('fxToast'); el.querySelector('i').textContent = t.icon; el.querySelector('b').textContent = t.title; el.querySelector('span').textContent = t.sub || ''; el.style.setProperty('--c', t.color);
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  setTimeout(() => { el.hidden = true; nextToast(); }, 3400);
}
function fanfare(big) { if (!SND.ctx) return; const w = SND.ctx.currentTime, n = big ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [659.25, 880, 1046.5]; n.forEach((f, i) => pluck(f, w + i * .09, .3, 1.6)); if (big) drum(w, .5); }

// ---------- mensagens do servidor
function onFeatureMsg(m) {
  if (m.t === 'prog') { PROG = m; if ($('achN')) $('achN').textContent = `${m.ach.length}/${m.achAll.length}`; if (!$('questPanel').hidden) renderQuests(); const me2 = players.get(myId); if (me2) me2.lv = m.lv; updBalloonBtn(); return true; }
  if (m.t === 'mission') { const r = Object.entries(m.rew || {}).map(([k, v]) => `+${v} ${k}`).join(' '); fxToast('Missão completa!', `${m.text} · +${m.xp} XP ${r}`, '#84c65a', '✔'); fanfare(); return true; }
  if (m.t === 'ach') { fxToast('Conquista: ' + m.name, m.desc + (m.coins ? ` · +${m.coins} moedas` : ''), '#ffd84a', '🏆'); fanfare(true); return true; }
  if (m.t === 'levelup') { fxToast('Nível ' + m.lv + '!', `Você ganhou ${m.coins || 0} moedas`, '#9ff3ff', '▲'); fanfare(true); if (m.balloon) { fxToast('VOCÊ GANHOU UM BALÃO!', 'Toque no botão do balão (no alto) para voar por Eryon', '#f2a04a', '◓'); updBalloonBtn(); } return true; }
  if (m.t === 'lv') { const p = players.get(m.id); if (p) p.lv = m.lv; return true; }
  if (m.t === 'badge') { const p = players.get(m.id); if (p) p.badge = m.badge; return true; }
  if (m.t === 'supporter') { fxToast('Obrigado por apoiar Eryon!', 'Escolha seu bichinho em Menu → Apoiar', '#ffd84a', '♥'); fanfare(true); return true; }
  if (m.t === 'announce') { showAnnounce(m.text, m.from); return true; }
  if (m.t === 'rain') { startRain(m.gift || {}); return true; }
  if (m.t === 'signs') { SIGNS = m.list || []; return true; }
  if (m.t === 'castle') { onCastleMsg(m); return true; }
  if (onEconMsg(m)) return true;
  if (onGiantMsg(m)) return true;
  if (m.t === 'builders') { const L = m.list.map(u => u === me ? 'você' : '@' + u), txt = L.length === 1 ? L[0] : L.slice(0, -1).join(', ') + ' e ' + L[L.length - 1];
    fxToast(`${txt}${m.more ? ' e mais ' + m.more : ''} ${L.length + m.more > 1 ? 'estão' : 'está'} construindo o castelo!`, 'Venha ajudar: pedreira ao sul da vila', '#ffd84a', '♜'); return true; }
  if (m.t === 'thanks') { showThanks(m.username, m.look); return true; }
  if (m.t === 'notice') { NOTICE.cfg = m.notice || null; if (m.now) showNotice(true); return true; }
  if (m.t === 'supnudge') { showNudge(m.supporters || []); return true; }
  if (m.t === 'tp') { const p = players.get(myId); if (p) { p.x = m.x; p.y = m.y; p.room = ''; target = null; follow(); fxToast('Whoosh!', 'O portal te levou de volta para a vila', '#d0a0ff', '✦'); } return true; }
  if (m.t === 'perk') { try { localStorage.setItem('eryon_perk', JSON.stringify(m.perk)); } catch { }
    // devolve o bichinho guardado no aparelho se o servidor tiver esquecido
    const me2 = players.get(myId), saved = (() => { try { return localStorage.getItem('eryon_pet') || ''; } catch { return ''; } })();
    if (me2 && (m.perk.sup || m.perk.staff) && saved && !(me2.look && me2.look.pet)) send({ t: 'pet', pet: saved }); return true; }
  return false;
}

// ---------- painel de missões, nível e conquistas
function renderQuests() {
  const P2 = PROG; if (!P2) { $('questBody').innerHTML = '<p class="hint">Carregando…</p>'; return; }
  const pct = Math.round(100 * (P2.xp - P2.cur) / Math.max(1, P2.next - P2.cur));
  let h = `<div class="lvbox"><b>Nível ${P2.lv}</b><div class="xpbar"><i style="width:${pct}%"></i></div><span>${P2.xp - P2.cur} / ${P2.next - P2.cur} XP para o nível ${P2.lv + 1}</span></div>`;
  h += P2.lv >= P2.balloonLv ? '<div class="item"><b>◓ Você tem um balão!</b><span>Toque no botão do balão no alto da tela para voar por Eryon.</span></div>' : `<div class="item"><b>◓ Meta: nível ${P2.balloonLv}</b><span>Quem chega no nível ${P2.balloonLv} ganha um BALÃO para sobrevoar Eryon. Faltam ${Math.max(0, P2.balloonLv - P2.lv)} níveis.</span></div>`;
  h += '<h3>Missões de hoje</h3>';
  for (const q of P2.missions) { const r = Object.entries(q.rew).map(([k, v]) => `${v} ${k}`).join(' + ');
    h += `<div class="item quest${q.done ? ' done' : ''}"><b>${q.done ? '✔ ' : ''}${esc(q.text)}</b><div class="qbar"><i style="width:${Math.round(100 * q.have / q.n)}%"></i></div><span>${q.have}/${q.n} · Prêmio: ${q.xp} XP + ${Math.round(q.xp / 5)} moedas + ${r}</span></div>`; }
  h += '<p class="hint">Complete as 3 e ganhe +60 XP de bônus. Novas missões todo dia.</p>';
  if (CSTATE.stages.length) { const tot = CSTATE.stages.reduce((a, st) => a + st.pedra + st.lenha, 0), pc = Math.floor(100 * Math.min(tot, CSTATE.pedra + CSTATE.lenha) / tot), cur = curStage();
    h += `<h3>Castelo de Eryon</h3><div class="item"><b>${pc}% construído${cur < CSTATE.stages.length ? ' · Etapa ' + (cur + 1) + ': ' + esc(CSTATE.stages[cur].name) : ' · PRONTO!'}</b><div class="xpbar"><i style="width:${pc}%"></i></div><span>Quebre pedras e leve até a obra, ao sul da vila (Vale das Flores).</span>`;
    if (CSTATE.top.length) h += '<span>Mestres de obra: ' + CSTATE.top.map(([u, n], i) => `${i + 1}º @${esc(u)} (${n})`).join(' · ') + '</span>'; h += '</div>'; }
  h += `<h3 id="achTop">Conquistas (${P2.ach.length}/${P2.achAll.length})</h3><div class="achgrid">`;
  for (const a of P2.achAll) { const got = P2.ach.includes(a.id); h += `<div class="ach${got ? ' got' : ''}" title="${esc(a.desc)}"><i>${got ? '🏆' : '🔒'}</i><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></div>`; }
  $('questBody').innerHTML = h + '</div>';
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- apoiar
const PET_LIST = [['gato', 'Gatinho'], ['raposa', 'Raposa'], ['dragao', 'Dragãozinho'], ['coruja', 'Coruja']];
function renderSupport() {
  const me2 = players.get(myId), sup = me2 && (me2.badge === 'apoiador' || me2.badge === 'criador');
  let h = `<p>Eryon é feito por uma pessoa só e roda num servidor. Se você curte, pode apoiar com qualquer valor. <b>É totalmente opcional</b>, e o jogo continua grátis para todo mundo.</p>
    <div class="item"><b>Quem apoia ganha</b><span>★ Nome dourado com estrela · selo de Apoiador · um bichinho que te segue pelo mapa (gatinho, raposa, dragãozinho ou coruja)</span><em>Nada de vantagem no jogo: é só estilo.</em></div>`;
  if (SUPPORT.pix) h += `<div class="item"><b>Pix</b><span class="pix">${esc(SUPPORT.pix)}</span><button type="button" id="copyPix">Copiar chave Pix</button></div>`;
  if (SUPPORT.url) h += `<a class="supbtn" href="${esc(SUPPORT.url)}" target="_blank" rel="noopener">Apoiar pelo link ♥</a>`;
  if (!SUPPORT.pix && !SUPPORT.url) h += '<p class="hint">O criador ainda vai colocar a forma de apoio aqui.</p>';
  h += '<p class="hint">Depois de apoiar, mande uma mensagem para o criador no Instagram com o seu @ do jogo para liberar o selo. Menor de idade: só com autorização dos pais.</p>';
  if (!sup) h += '<div class="item"><b>Bichinho</b><span>O bichinho aparece aqui depois que o criador te der o selo de Apoiador. (Criador: marque seu @ em /admin → "Marcar como Criador".)</span></div>';
  if (sup) { const cur = me2.look && me2.look.pet; h += '<h3>Seu bichinho</h3><div class="row2 petrow">' + PET_LIST.map(([id, n]) => `<button type="button" class="petb${cur === id ? ' on' : ''}" data-pet="${id}">${n}</button>`).join('') + `<button type="button" class="petb${!cur ? ' on' : ''}" data-pet="">Nenhum</button></div>`; }
  $('supBody').innerHTML = h;
  if ($('copyPix')) $('copyPix').onclick = async () => { try { await navigator.clipboard.writeText(SUPPORT.pix); $('copyPix').textContent = 'Copiado!'; } catch { } };
  for (const b of $('supBody').querySelectorAll('.petb')) b.onclick = () => { send({ t: 'pet', pet: b.dataset.pet }); try { localStorage.setItem('eryon_pet', b.dataset.pet); } catch { } setTimeout(renderSupport, 300); };
}

// ---------- denúncia
let reportTarget = null;
function openReport(q) { reportTarget = q; $('repWho').textContent = '@' + q.username; $('repPanel').hidden = false; }
addEventListener('DOMContentLoaded', () => { for (const b of document.querySelectorAll('#repPanel .rep')) b.onclick = () => { if (reportTarget) send({ t: 'report', id: reportTarget.id, reason: b.dataset.r }); $('repPanel').hidden = true; }; });

// ---------- anúncio do criador
function showAnnounce(text, from) { const el = $('announce'); el.querySelector('small').textContent = from || 'CRIADOR DE ERYON'; el.querySelector('span').textContent = text; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); fanfare(true); clearTimeout(showAnnounce.t); showAnnounce.t = setTimeout(() => el.hidden = true, 9000); }

// ---------- chuva de recursos (evento)
let RAIN = null;
function startRain(g) { RAIN = { t0: performance.now(), drops: [] }; const r = Object.entries(g).filter(([, v]) => v > 0).map(([k, v]) => `+${v} ${k}`).join(' '); fxToast('Chuva de recursos!', r ? 'Todo mundo online ganhou ' + r : 'Presente do Criador', '#9ff3ff', '☔'); fanfare(true); }
function drawRain(x, li, ti, cw, ch, t) {
  if (!RAIN) return; const age = (performance.now() - RAIN.t0) / 1000; if (age > 8) { RAIN = null; return; }
  if (age < 6 && Math.random() < .3) RAIN.drops.push({ x: li + Math.random() * cw, y: ti - 10, v: 50 + Math.random() * 40, k: Math.floor(Math.random() * 3), s: Math.random() * 6 });
  for (let i = RAIN.drops.length - 1; i >= 0; i--) { const d = RAIN.drops[i]; d.y += d.v / 60; if (d.y > ti + ch + 10) { RAIN.drops.splice(i, 1); continue; }
    const X = Math.round(d.x + Math.sin(d.y * .05 + d.s) * 3), Y = Math.round(d.y);
    if (d.k === 0) { px(x, P.ink, X - 1, Y - 1, 6, 4); px(x, P.wood, X, Y, 4, 2); px(x, P.woodL, X, Y, 4, 1); }
    else if (d.k === 1) { px(x, P.ink, X - 1, Y - 1, 5, 5); px(x, P.st2, X, Y, 3, 3); px(x, P.st3, X, Y, 2, 1); }
    else { px(x, '#47994a', X, Y, 2, 3); px(x, '#84c65a', X + 1, Y - 1, 2, 2); }
    if ((Math.floor(t * 8) + i) % 9 === 0) px(x, '#fff3b0', X + 1, Y - 2, 1, 1); }
}

// ---------- placas patrocinadas
const SIGN_SPR = {};
function signSprite(col) { if (SIGN_SPR[col]) return SIGN_SPR[col]; const [c, x] = canvas(26, 22);
  x.fillStyle = 'rgba(10,30,20,.35)'; x.fillRect(3, 19, 22, 3);
  for (const X of [5, 19]) { px(x, P.ink, X - 1, 8, 4, 13); px(x, P.wood, X, 9, 2, 11); px(x, P.woodL, X, 9, 1, 11); }
  px(x, P.ink, 0, 0, 26, 12); px(x, col, 1, 1, 24, 10); px(x, P.woodL, 2, 2, 22, 8); px(x, '#e8c890', 2, 2, 22, 1); for (let X = 4; X < 22; X += 3) px(x, P.woodD, X, 5, 2, 1); for (let X = 5; X < 20; X += 4) px(x, P.woodD, X, 7, 3, 1);
  px(x, col, 1, 1, 2, 2); px(x, col, 23, 1, 2, 2); return SIGN_SPR[col] = c; }
function drawSign(x, s) { x.drawImage(signSprite(s.color || '#ffd84a'), s.x - 13, s.y - 20); }
function drawSignLabels(ctx2, L, T, S, fs, p) {
  if (!p || p.room) return;
  for (const s of allSigns()) { const d = Math.hypot(p.x - s.x, p.y - s.y); if (d > 70) continue;
    const sx = Math.round((s.x - L) * S), sy = Math.round((s.y - 24 - T) * S); ctx2.globalAlpha = Math.min(1, (70 - d) / 20);
    ctx2.font = `700 ${Math.round(fs * .95)}px Pix, monospace`; const w = Math.min(cv.width * .8, ctx2.measureText(s.text).width + fs * 1.2), h = fs * 1.8;
    ctx2.fillStyle = 'rgba(12,20,16,.92)'; ctx2.fillRect(sx - w / 2, sy - h, w, h); ctx2.strokeStyle = s.color || '#ffd84a'; ctx2.lineWidth = Math.max(2, fs / 7); ctx2.strokeRect(sx - w / 2, sy - h, w, h);
    ctx2.fillStyle = '#fff8e0'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle'; ctx2.fillText(s.text, sx, sy - h / 2, w - fs * .6); ctx2.textBaseline = 'bottom'; ctx2.globalAlpha = 1; }
}

// ---------- bichinhos que seguem o personagem
const PET_SPR = {};
function petSprite(kind, f) {
  const key = kind + f; if (PET_SPR[key]) return PET_SPR[key]; const [c, x] = canvas(14, 14), O = P.ink, up = f ? 1 : 0;
  if (kind === 'gato' || kind === 'raposa') { const a = kind === 'gato' ? ['#d0622a', '#f2a33a', '#fff3d6'] : ['#c0442a', '#e8704a', '#fff8f0'];
    px(x, O, 1, 6 - up, 11, 6); px(x, a[0], 2, 7 - up, 9, 4); px(x, a[1], 2, 7 - up, 9, 1); px(x, a[2], 3, 10 - up, 5, 1);          // corpo
    px(x, O, 8, 3 - up, 6, 6); px(x, a[0], 9, 4 - up, 4, 4); px(x, a[1], 9, 4 - up, 4, 1); px(x, O, 8, 2 - up, 2, 2); px(x, O, 12, 2 - up, 2, 2); px(x, a[1], 9, 3 - up, 1, 1); px(x, a[1], 12, 3 - up, 1, 1);   // cabeça e orelhas
    px(x, O, 10, 5 - up, 1, 1); px(x, O, 12, 5 - up, 1, 1); if (kind === 'raposa') px(x, a[2], 10, 6 - up, 3, 2);
    px(x, O, 0, 3 - up + (f ? 1 : 0), 2, 5); px(x, a[1], 0, 3 - up + (f ? 1 : 0), 1, 3); if (kind === 'raposa') px(x, a[2], 0, 3 - up, 1, 1);   // cauda
    px(x, O, 3, 11 - up, 2, 2 + up); px(x, O, 8, 11 - up, 2, 2 + up); }
  if (kind === 'dragao') { const g = ['#1d5a4a', '#2f8a6a', '#5ac08e'];
    px(x, O, 2, 7, 9, 5); px(x, g[1], 3, 8, 7, 3); px(x, g[2], 3, 8, 7, 1); px(x, '#d8e8a0', 4, 10, 4, 1);
    px(x, O, 8, 4, 6, 5); px(x, g[1], 9, 5, 4, 3); px(x, '#ffd84a', 11, 5, 1, 1); px(x, '#efe2bf', 9, 3, 1, 2);
    px(x, O, 0, 9, 3, 2); px(x, g[0], 0, 9, 2, 1);
    if (f) { px(x, O, 3, 1, 6, 6); px(x, g[0], 4, 2, 4, 4); px(x, g[2], 4, 2, 4, 1); } else { px(x, O, 2, 5, 7, 3); px(x, g[0], 3, 6, 5, 1); } }
  if (kind === 'coruja') { const o = ['#6b4630', '#8b5e3c', '#e4d0a0'];
    px(x, O, 3, 2 + up, 8, 10); px(x, o[1], 4, 3 + up, 6, 8); px(x, o[2], 5, 7 + up, 4, 3); px(x, O, 3, 1 + up, 2, 2); px(x, O, 9, 1 + up, 2, 2);
    px(x, '#fff3b0', 4, 4 + up, 2, 2); px(x, '#fff3b0', 8, 4 + up, 2, 2); px(x, O, 5, 5 + up, 1, 1); px(x, O, 8, 5 + up, 1, 1); px(x, '#f2a33a', 6, 6 + up, 2, 1);
    if (f) { px(x, O, 0, 4, 3, 5); px(x, o[0], 1, 5, 2, 3); px(x, O, 11, 4, 3, 5); px(x, o[0], 11, 5, 2, 3); } else { px(x, o[0], 3, 6 + up, 1, 4); px(x, o[0], 10, 6 + up, 1, 4); } }
  const fl = flipped(c); return PET_SPR[key] = { r: c, l: fl };
}
function drawPet(x, q, t) {
  const kind = q.look && q.look.pet; if (!kind) return;
  const tx = q.x - (q.face || 1) * 10, ty = q.y + 2; if (q.petX === undefined || Math.hypot(q.petX - tx, q.petY - ty) > 80) { q.petX = tx; q.petY = ty; }
  q.petX += (tx - q.petX) * .08; q.petY += (ty - q.petY) * .08; const moving = Math.hypot(tx - q.petX, ty - q.petY) > 1.5;
  const fly = kind === 'coruja' || kind === 'dragao', f = (moving || fly) ? Math.floor(t * (fly ? 6 : 8)) % 2 : 0, s = petSprite(kind, f), right = (q.face || 1) > 0;
  const Y = Math.round(q.petY - (fly ? 12 + Math.sin(t * 3 + q.ph) * 2 : 0));
  if (fly) { x.fillStyle = 'rgba(10,30,20,.25)'; x.fillRect(Math.round(q.petX) - 4, Math.round(q.petY) - 1, 8, 2); } else { x.fillStyle = 'rgba(10,30,20,.3)'; x.fillRect(Math.round(q.petX) - 5, Math.round(q.petY) - 1, 10, 2); }
  x.drawImage(right ? s.r : s.l, Math.round(q.petX) - 7, Y - 13);
}

// ---------- visitas a lugares do mapa (para as missões)
const VISITED = new Set();
function checkVisit(p) { if (p.room) return; for (const l of LANDMARKS) if (!VISITED.has(l.id) && Math.hypot(p.x - l.x, p.y - l.y) < 60) { VISITED.add(l.id); send({ t: 'visit', id: l.id }); } }

// ---------- tutorial (só na primeira vez)
const TUT = [
  ['Bem-vindo a Eryon!', 'Toque no chão para andar (no computador: setas ou WASD). Arraste para olhar o mapa.'],
  ['Trabalhe', 'Chegue perto de uma árvore, pedra ou erva e toque no botão amarelo para derrubar ou colher.'],
  ['Construa sua casa', 'Com 10 lenhas, ache um lugar livre na vila e toque em "Construir aqui…".'],
  ['Missões do dia', 'Abra o menu ☰ → Missões. Todo dia tem 3 missões novas com prêmios e XP.'],
  ['Explore!', 'Existem 8 lugares secretos no mapa. E fique de olho no céu… dragões passam por aqui.'],
];
function startTutorial(force) {
  try { if (!force && localStorage.getItem('eryon_tut') === '1') return; } catch { }
  let i = 0; const el = $('tut'), show = () => { el.querySelector('b').textContent = TUT[i][0]; el.querySelector('p').textContent = TUT[i][1]; el.querySelector('small').textContent = `${i + 1}/${TUT.length}`; $('tutNext').textContent = i === TUT.length - 1 ? 'Jogar!' : 'Próximo'; };
  const done = () => { el.hidden = true; try { localStorage.setItem('eryon_tut', '1'); } catch { } };
  $('tutNext').onclick = () => { i++; if (i >= TUT.length) done(); else show(); }; $('tutSkip').onclick = done; show(); el.hidden = false;
}

// ---------- botões (liga depois que a página carregou, quando $ já existe)
addEventListener('DOMContentLoaded', () => {
$('questBtn').onclick = () => { closePanels(); $('questPanel').hidden = false; renderQuests(); };
$('achBtn').onclick = () => { closePanels(); $('questPanel').hidden = false; renderQuests(); const a = document.getElementById('achTop'); if (a) a.scrollIntoView({ block: 'start' }); };
$('questClose').onclick = () => $('questPanel').hidden = true;
$('supportBtn').onclick = () => { closePanels(); $('supPanel').hidden = false; renderSupport(); };
$('supClose').onclick = () => $('supPanel').hidden = true;
$('supPill').onclick = () => { closePanels(); $('supPanel').hidden = false; renderSupport(); };
$('repClose').onclick = () => $('repPanel').hidden = true;
$('tutAgain').onclick = () => { closePanels(); startTutorial(true); };
});

// ---------- animação de agradecimento a um apoiador (real): personagem + bichinho + @ com luz atrás
let thanksAnim = null;
function showThanks(username, look) {
  let cv2 = document.getElementById('thanksFx');
  if (!cv2) { cv2 = document.createElement('canvas'); cv2.id = 'thanksFx'; cv2.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9;cursor:pointer;touch-action:none'; cv2.addEventListener('pointerdown', e => { e.preventDefault(); if (thanksAnim && performance.now() - thanksAnim.t0 > 900) thanksAnim.t0 = performance.now() - 6.1 * 1000; }); document.body.appendChild(cv2); }
  const D = Math.min(devicePixelRatio || 1, 2); cv2.width = Math.round(innerWidth * D); cv2.height = Math.round(innerHeight * D); cv2.hidden = false;
  thanksAnim = { username, look: look || {}, ch: charFor(username, look), t0: performance.now(), D, parts: [], last: 0 }; fanfare(true); requestAnimationFrame(thanksFrame);
}
function thanksFrame(now) {
  const A0 = thanksAnim, cv2 = document.getElementById('thanksFx'); if (!A0 || !cv2) return;
  const t = (now - A0.t0) / 1000, T = 6.5, dt = Math.min(.05, (now - (A0.last || now)) / 1000); A0.last = now; if (t > T) { cv2.hidden = true; thanksAnim = null; return; }
  const x = cv2.getContext('2d'), W = cv2.width, H = cv2.height, D = A0.D, A = Math.min(1, t / .35) * Math.min(1, (T - t) / .6), cx = W / 2, cy = H * .47;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.imageSmoothingEnabled = false; x.globalAlpha = A;
  const g = x.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H) * .7); g.addColorStop(0, 'rgba(40,20,10,.55)'); g.addColorStop(1, 'rgba(6,4,10,.92)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  // luz dourada atrás: raios girando + halo pulsando
  x.globalCompositeOperation = 'lighter'; const R = Math.max(W, H);
  for (let i = 0; i < 18; i++) { const a = -t * .3 + i / 18 * 6.283, w2 = .06 + .02 * Math.sin(t * 2 + i); x.globalAlpha = A * .11; x.fillStyle = i % 2 ? '#ffd84a' : '#ff9a3a'; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a - w2) * R, cy + Math.sin(a - w2) * R); x.lineTo(cx + Math.cos(a + w2) * R, cy + Math.sin(a + w2) * R); x.fill(); }
  const hal = x.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * .38); hal.addColorStop(0, 'rgba(255,230,140,.9)'); hal.addColorStop(.45, 'rgba(255,170,60,.35)'); hal.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalAlpha = A * (.55 + .15 * Math.sin(t * 3)); x.fillStyle = hal; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
  // personagem grande acenando + bichinho pulando do lado
  const fr = A0.ch.frame({ legs: 'stand', arm: 'wave', eyes: 0, br: Math.floor(t * 4) % 2 }), k = Math.max(4, Math.floor(Math.min(W * .62 / 16, H * .34 / 22))), pop = Math.max(.02, t < .8 ? eOutBack(clamp(t / .8)) : 1), kk = k * pop, bob = Math.sin(t * 2.4) * k * .6;
  x.globalAlpha = A; x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(cx, cy + 4 * k, Math.max(.5, 9 * kk), Math.max(.5, 2 * kk), 0, 0, 6.283); x.fill();
  x.drawImage(fr.c, Math.round(cx - fr.ax * kk), Math.round(cy - fr.ay * kk + bob), Math.round(fr.c.width * kk), Math.round(fr.c.height * kk));
  const pet = A0.look.pet; if (pet && t > .5) { const ps = petSprite(pet, Math.floor(t * 6) % 2).l, pk = kk * .55, hop = Math.abs(Math.sin(t * 5)) * k * 1.2, fly = pet === 'coruja' || pet === 'dragao';
    x.drawImage(ps, Math.round(cx + 5 * k), Math.round(cy + 4 * k - 13 * pk - hop - (fly ? 8 * k : 0)), Math.round(14 * pk), Math.round(14 * pk)); }
  // corações e brilhos
  if (t < T - 1 && Math.random() < .45) A0.parts.push({ x: cx + (Math.random() - .5) * W * .7, y: cy + H * .16, vy: -(40 + Math.random() * 60) * D, life: 0, max: 1.6 + Math.random(), heart: Math.random() < .4, a: Math.random() * 6 });
  const u = Math.max(2, Math.round(k * .28));
  for (let i = A0.parts.length - 1; i >= 0; i--) { const q = A0.parts[i]; q.life += dt; if (q.life > q.max) { A0.parts.splice(i, 1); continue; } q.y += q.vy * dt; const X = Math.round(q.x + Math.sin(q.life * 3 + q.a) * 14 * D), Y = Math.round(q.y);
    x.globalAlpha = A * Math.sin(q.life / q.max * Math.PI);
    if (q.heart) { x.fillStyle = '#e04a5a'; x.fillRect(X, Y, u, u); x.fillRect(X + 2 * u, Y, u, u); x.fillRect(X - u, Y + u, 5 * u, u); x.fillRect(X, Y + 2 * u, 3 * u, u); x.fillRect(X + u, Y + 3 * u, u, u); x.fillStyle = '#ff9aa8'; x.fillRect(X, Y, u, u); }
    else { x.fillStyle = '#fff3b0'; const tw = .5 + .5 * Math.sin(q.life * 10 + q.a); x.fillRect(X - u * 1.5 * tw, Y, u * 3 * tw, u / 2 + 1); x.fillRect(X, Y - u * 1.5 * tw, u / 2 + 1, u * 3 * tw); } }
  // textos
  x.globalAlpha = A; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const txt = (s2, X, Y, font, col, lw) => { x.font = font; x.lineWidth = lw; x.strokeStyle = '#140e06'; x.strokeText(s2, X, Y, W * .92); x.fillStyle = col; x.fillText(s2, X, Y, W * .92); };
  const f1 = Math.round(Math.min(W * .06, 26 * D)), tp = t < .5 ? eOutBack(clamp(t / .5)) : 1;
  x.save(); x.translate(cx, H * .15); x.scale(tp, tp); txt('NOVO APOIADOR!', 0, 0, `400 ${f1}px P2P, monospace`, '#ffd84a', f1 * .35); x.restore();
  const name = '★ @' + A0.username, n = clamp(Math.floor((t - .4) * 26), 0, name.length), f2 = Math.round(Math.min(W * .08, 36 * D));
  if (n) txt(name.slice(0, n), cx, H * .23, `700 ${f2}px Pix, monospace`, '#fff3b0', f2 * .3);
  if (t > 1.2) { x.globalAlpha = A * clamp((t - 1.2) / .5); const f3 = Math.round(Math.min(W * .045, 18 * D)); txt('Obrigado por ajudar a manter Eryon vivo ♥', cx, H * .74, `700 ${f3}px Pix, monospace`, '#ffffff', f3 * .3); txt('Toque em "Apoiar PIX" para apoiar também', cx, H * .74 + f3 * 1.6, `700 ${Math.round(f3 * .8)}px Pix, monospace`, '#c3cad6', f3 * .25); }
  x.globalAlpha = 1; requestAnimationFrame(thanksFrame);
}
// ---------- lembrete de apoio (só com apoiadores reais)
function showNudge(sup) {
  const el = $('nudge'); if (!el || !me) return;
  el.querySelector('span').textContent = sup.length ? `${sup.map(u => '@' + u).join(', ')} já ${sup.length > 1 ? 'apoiaram' : 'apoiou'} Eryon ♥ Apoie também!` : 'Eryon é mantido pela comunidade. Apoie com um Pix ♥';
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); clearTimeout(showNudge.t); showNudge.t = setTimeout(() => el.hidden = true, 8000);
}
addEventListener('DOMContentLoaded', () => { const el = $('nudge'); if (el) el.onclick = () => { el.hidden = true; closePanels(); $('supPanel').hidden = false; renderSupport(); }; });

// ---------- BALÃO: prêmio de quem chega no nível 8 — voa por cima de tudo
const BALLOON_COLS = [['#c0302a', '#ffd84a'], ['#3f6fc0', '#f4f0d8'], ['#7a4ac0', '#ffd84a'], ['#2f8a6a', '#f2a04a'], ['#e04a5a', '#9ff3ff']];
const BSPR = {};
function balloonSprite(ci) { if (BSPR[ci]) return BSPR[ci]; const [c, x] = canvas(34, 40), O = '#140e06', [A, B2] = BALLOON_COLS[ci];
  for (let Y = 0; Y < 30; Y++) { const v = (Y - 13) / 14, half = Y < 24 ? Math.round(15 * Math.sqrt(Math.max(0, 1 - v * v * (v > 0 ? .55 : 1)))) : Math.max(3, Math.round(7 - (Y - 24) * .9));
    for (let X = -half; X <= half; X++) { const stripe = Math.floor((X + 16) / 4.5) % 2, u = X / Math.max(1, half); let col = stripe ? A : B2; if (u > .45) col = shadeHex(col, .72); else if (u < -.5 && Y < 18) col = shadeHex(col, 1.18);
      px(x, Math.abs(X) === half || Y === 0 ? O : col, 17 + X, Y); } }
  px(x, '#ffffff', 9, 6, 2, 4); px(x, '#ffffff', 8, 10, 1, 3);
  for (const X of [11, 14, 20, 23]) for (let Y = 30; Y < 34; Y++) px(x, '#5a3420', X + Math.round((Y - 30) * (X < 17 ? .5 : -.5)), Y, 1, 1);
  return BSPR[ci] = c; }
function drawBalloonShadows(x) { for (const q of players.values()) if (q.fly && !(q.room)) { const f = isFairy(q); x.fillStyle = 'rgba(8,20,16,.28)'; x.beginPath(); x.ellipse(Math.round(q.x), Math.round(q.y), f ? 5 : 11, f ? 2 : 4, 0, 0, 6.283); x.fill(); } }
function drawBalloon(x, q, t) {
  if (isFairy(q)) { // fada voando: flutua, asas batendo e rastro de brilhos
    const Y = Math.round(q.y - 14 + Math.sin(t * 3 + (q.ph || 0)) * 2), X = Math.round(q.x), fl = Math.sin(t * 22 + (q.ph || 0));
    x.globalAlpha = .7; for (const dir of [-1, 1]) { const w = 6 + Math.round(fl * 2), h = 7 + Math.round(-fl * 2); for (let k = 0; k < w; k++) { const hh = Math.max(1, Math.round(h * (1 - Math.abs(k - w * .35) / w))); px(x, k % 2 ? '#f6b6d8' : '#c8f0ff', X + dir * (3 + k), Y - 5 - hh, 1, hh + 1); } } x.globalAlpha = 1;
    drawCharAt(x, q.ch, X, Y, { legs: 'stand', arm: q.moving ? 'fwd' : 'down', tool: 'wand', eyes: 0, br: Math.floor(t * 4) % 2 }, q.face || 1);
    q.trail ||= []; if (q.moving || Math.random() < .2) q.trail.push({ x: q.x + (Math.random() - .5) * 6, y: Y - 6 + (Math.random() - .5) * 6, t }); q.trail = q.trail.filter(s2 => t - s2.t < 1.2);
    for (const s2 of q.trail) { const k = (t - s2.t) / 1.2; x.globalAlpha = 1 - k; px(x, k < .3 ? '#ffffff' : '#fff3b0', Math.round(s2.x), Math.round(s2.y + k * 6), 1, 1); } x.globalAlpha = 1; return; }
  const ci = (q.username || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % BALLOON_COLS.length, s = balloonSprite(ci), sway = Math.sin(t * 1.3 + (q.ph || 0)) * 1.5, X = Math.round(q.x + sway), Y = Math.round(q.y - 46 + Math.sin(t * .9 + (q.ph || 0)) * 2);
  drawCharAt(x, q.ch, X, Y + 1, { legs: 'stand', arm: q.moving ? 'wave' : 'down', eyes: 0, br: Math.floor(t * 3) % 2 }, q.face || 1);
  px(x, '#140e06', X - 6, Y - 6, 13, 9); px(x, '#8a5530', X - 5, Y - 5, 11, 7); px(x, '#b8814a', X - 5, Y - 5, 11, 1); for (let k = -4; k <= 4; k += 3) px(x, '#5a3420', X + k, Y - 4, 1, 6);
  x.drawImage(s, X - 17, Y - 46);
  const fl = Math.floor(t * 10 + (q.ph || 0)) % 4; if (q.moving || fl === 0) { px(x, '#ffd84a', X - 1, Y - 13, 3, 3); px(x, '#fff3b0', X, Y - 12, 1, 2); px(x, '#f2a33a', X - 1, Y - 11, 3, 1); }
}
function updBalloonBtn() { const b = $('balloonBtn'); if (!b) return; const ok = PROG && PROG.lv >= PROG.balloonLv; b.hidden = !ok; const p = players.get(myId); b.classList.toggle('on', !!(p && p.fly)); b.querySelector('span').textContent = p && p.fly ? 'Pousar' : 'Balão'; }
const isFairy = q => !!(q && classOf(q) && classOf(q).id === 'fada');
function toggleBalloon() { const p = players.get(myId); if (!p) return; const fairy = isFairy(p); if (!fairy && (!PROG || PROG.lv < PROG.balloonLv)) return sys(`O balão é o prêmio do nível ${PROG ? PROG.balloonLv : 8}.`);
  if (p.room) return sys('Saia para o lado de fora para subir no balão.');
  if (p.fly) { if (blocked(p.x, p.y)) return sys('Procure um lugar livre para pousar (fora da água e longe das árvores).'); p.fly = false; if (!fairy) setZoom(zoomTarget / .72); play('whoosh', .3, 1.4); }
  else { p.fly = true; target = null; follow(); if (!fairy) setZoom(zoomTarget * .72); fxToast(fairy ? 'Voando com as asas!' : 'Voando por Eryon!', fairy ? 'Passe por cima de árvores, rio e lago' : 'Ande para qualquer lado: o balão passa por cima de tudo', fairy ? '#f6b6d8' : '#f2a04a', fairy ? '✦' : '◓'); play('whoosh', .5, fairy ? 1.6 : .6); }
  updBalloonBtn(); skillLabel(); }
addEventListener('DOMContentLoaded', () => { const b = $('balloonBtn'); if (b) b.onclick = () => { sndStart(); toggleBalloon(); }; });

// ---------- AVISO EM POPUP (com X): aparece ao entrar e de vez em quando
// Usa o aviso escrito no painel do admin; sem ele, avisa sozinho do ataque do Gigante agendado.
const NOTICE = { cfg: null, last: 0 };
try { NOTICE.last = Number(localStorage.getItem('eryon_notice_t')) || 0; } catch (e) {}
function noticeContent() {
  const c = NOTICE.cfg;
  if (c && c.on && c.text) return { key: 'adm:' + c.title + c.text, ico: '📢', title: c.title || 'AVISO DE ERYON', text: c.text, every: c.every || 10 };
  if (typeof GIANT !== 'undefined' && !GIANT.live && GIANT.state === 'scheduled' && GIANT.at > Date.now() && GIANT.at - Date.now() < 36 * 3600e3) {
    const hh = new Date(GIANT.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }), hoje = new Date(GIANT.at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) === new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return { key: 'giant:' + GIANT.at, ico: '⚠', title: `O GIGANTE ATACA ${hoje ? 'HOJE' : 'AMANHÃ'} ÀS ${hh}!`, text: `Faltam ${fmtLeft(GIANT.at - Date.now())}.\nCrie lanças e catapultas, vire Guarda do Reino e defenda Eryon!\nSe ninguém lutar, ele destrói a cidade e vai embora.`, every: 10, go: 'Preparar armas', fn: () => { closePanels(); openPanel('craft'); } };
  }
  return null;
}
function showNotice(force) {
  const el = $('notice'), n = noticeContent(); if (!el || !n || !me) return;
  if (!force && Date.now() - NOTICE.last < n.every * 60000) return;
  const at = $('atCard'), av = $('avatar'); if (!force && ((at && !at.hidden) || (av && !av.hidden) || (GIANT && GIANT.live))) return;
  $('noticeIco').textContent = n.ico; $('noticeT').textContent = n.title; $('noticeB').textContent = n.text;
  const go = $('noticeGo'); go.hidden = !n.go; if (n.go) { go.textContent = n.go; go.onclick = () => { hideNotice(); n.fn(); }; }
  NOTICE.last = Date.now(); try { localStorage.setItem('eryon_notice_t', NOTICE.last); } catch (e) {}
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); if (typeof play === 'function') try { play('pop', .5); } catch (e) {}
}
function hideNotice() { const el = $('notice'); if (el) el.hidden = true; }
addEventListener('DOMContentLoaded', () => { const x = $('noticeX'); if (x) x.onclick = hideNotice; addEventListener('keydown', e => { if (e.key === 'Escape') hideNotice(); }); });
setTimeout(() => showNotice(), 6000); setInterval(() => showNotice(), 20000);
