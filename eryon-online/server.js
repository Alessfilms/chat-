// =====================================================================
// ERYON ONLINE — servidor (Node.js + WebSocket)
// - Serve o site (pasta public/)
// - Login com @usuario + código de acesso (só quem está na lista entra)
// - Painel de admin para colar os @ de quem comentou e gerar os códigos
// - Sincroniza posições e o chat entre todos os jogadores
// Variáveis de ambiente: PORT, ADMIN_KEY (obrigatória para o painel), DATA_DIR
// =====================================================================
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC = path.join(__dirname, 'public');
fs.mkdirSync(DATA, { recursive: true });
if (!ADMIN_KEY) console.warn('[aviso] ADMIN_KEY não definida: o painel de admin e o login ficam desativados.');

// ---------------------------------------------------------------- banco de dados (arquivo JSON)
const DBF = path.join(DATA, 'db.json');
let db = { users: {}, sessions: {} };
try { db = JSON.parse(fs.readFileSync(DBF, 'utf8')); } catch { /* primeiro uso */ }
db.users ||= {}; db.sessions ||= {};
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { fs.writeFile(DBF + '.tmp', JSON.stringify(db), e => { if (!e) fs.rename(DBF + '.tmp', DBF, () => {}); }); }, 400); }

const norm = u => String(u || '').trim().toLowerCase().replace(/^@+/, '');
const validUser = u => /^[a-z0-9._]{1,30}$/.test(u);
const CODE_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Código derivado do @ + segredo (HMAC): continua válido mesmo se o disco do servidor for apagado.
const SECRET = process.env.CODE_SECRET || ADMIN_KEY;
const codeFor = (u, v = 0) => { const h = crypto.createHmac('sha256', SECRET).update(u + ':' + v).digest(); return Array.from({ length: 6 }, (_, i) => CODE_ALPHA[h[i] % CODE_ALPHA.length]).join(''); };
const newToken = () => crypto.randomBytes(24).toString('hex');
const same = (a, b) => { const A = Buffer.from(String(a)), B = Buffer.from(String(b)); return A.length === B.length && crypto.timingSafeEqual(A, B); };

// aparência: só cores da paleta são aceitas
const HAIRS = ['#d0622a', '#ffd84a', '#1a1208', '#5a3a26', '#8b5e3c', '#c4ccd0', '#a83a32', '#e6efa0'];
const SHIRTS = ['#a83a32', '#3f7ab0', '#6e4a8a', '#3c5d4a', '#d0622a', '#e4d0a0', '#4a535c', '#b06a9a'];
const PANTS = ['#3c5f9a', '#4a2f22', '#2b3138', '#3c5d4a', '#6b4630', '#1d3550'];
const SKINS = ['#e8b48c', '#f2c9a4', '#c08060', '#8b5e3c', '#5a3a26'];
const HATS = ['', 'palha', 'bone', 'chef'];
const CAPES = ['', '#4e6c4a', '#1d3550', '#a83a32', '#6e4a8a'];
function cleanLook(l) {
  if (!l || typeof l !== 'object') return null;
  const pick = (v, list) => list.includes(v) ? v : list[0];
  return { hair: pick(l.hair, HAIRS), shirt: pick(l.shirt, SHIRTS), pants: pick(l.pants, PANTS), skin: pick(l.skin, SKINS), longHair: !!l.longHair, beard: !!l.beard, elfEars: !!l.elfEars, hat: pick(l.hat || '', HATS), cape: pick(l.cape || '', CAPES) };
}

// ---------------------------------------------------------------- verificação pelo comentário no Instagram
// O seguidor recebe uma palavra única (ex.: "ERYON 7KQ2") e comenta no post. O servidor lê os comentários
// pela API oficial do Instagram e libera quem comentou a palavra com o próprio @ (prova que é ele mesmo).
const IG_HOST = (process.env.IG_GRAPH_HOST || 'https://graph.instagram.com/v21.0').replace(/\/$/, '');
const IG_USER_ID = process.env.IG_USER_ID || 'me';
const IG_MEDIA_IDS = (process.env.IG_MEDIA_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
const IG_POST_URL = process.env.IG_POST_URL || '';
const igToken = () => db.igToken || process.env.IG_ACCESS_TOKEN || '';
const igOn = () => !!igToken();
let igCache = { at: 0, comments: [], err: null }, igBusy = null;
async function igGet(u) { const r = await fetch(u); const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status)); return j; }
function igComments() {
  if (Date.now() - igCache.at < 12000) return Promise.resolve(igCache.comments);
  if (igBusy) return igBusy;
  igBusy = (async () => {
    try {
      const tk = encodeURIComponent(igToken());
      let media = IG_MEDIA_IDS;
      if (!media.length) { const j = await igGet(`${IG_HOST}/${IG_USER_ID}/media?fields=id&limit=3&access_token=${tk}`); media = (j.data || []).map(m => m.id); }
      const all = [];
      for (const id of media) {
        let next = `${IG_HOST}/${id}/comments?fields=id,text,username,from,timestamp&limit=50&access_token=${tk}`, pages = 0;
        while (next && pages < 8) { const j = await igGet(next); for (const c of j.data || []) all.push({ u: norm(c.username || (c.from && c.from.username)), text: String(c.text || '') }); next = j.paging && j.paging.next; pages++; }
      }
      igCache = { at: Date.now(), comments: all, err: null };
    } catch (e) { igCache = { ...igCache, at: Date.now(), err: e.message }; console.warn('[instagram]', e.message); }
    finally { igBusy = null; }
    return igCache.comments;
  })();
  return igBusy;
}
// renova o token do Instagram (vale 60 dias) uma vez por dia
async function igRefresh() {
  if (!igOn() || !IG_HOST.includes('graph.instagram.com')) return;
  try { const j = await igGet(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(igToken())}`); if (j.access_token) { db.igToken = j.access_token; save(); } }
  catch (e) { console.warn('[instagram] renovação do token:', e.message); }
}
setInterval(igRefresh, 24 * 3600e3).unref(); setTimeout(igRefresh, 60e3).unref();
// Acesso livre (padrão): qualquer pessoa entra só com o @. ACCESS_MODE=restrito volta a exigir código/comentário.
const OPEN = (process.env.ACCESS_MODE || 'livre').toLowerCase() !== 'restrito';
// os moradores dos episódios só entram com código (ninguém se passa por eles)
const RESERVED = new Set(['heitor_morrone', 'lorhan_cristian', 'maicon.sg2010', 'pablopaesrocha', '_ray_hpl', 'paocombiscoito', 'altanat19', 'eo_preto.031', 'bio_leocordeiro', 'kaguya.xs']);
const pending = new Map();      // id -> { u, word, exp }
const WORD_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newWord = () => 'ERYON ' + Array.from({ length: 4 }, () => WORD_ALPHA[crypto.randomInt(WORD_ALPHA.length)]).join('');
setInterval(() => { const n = Date.now(); for (const [k, v] of pending) if (v.exp < n) pending.delete(k); }, 60e3).unref();
const squash = t => String(t).toUpperCase().replace(/[^A-Z0-9]+/g, '');

// ---------------------------------------------------------------- limites de tentativas
const hits = new Map();
function limited(key, max, ms) { const now = Date.now(); let h = hits.get(key); if (!h || h.reset < now) { h = { n: 0, reset: now + ms }; hits.set(key, h); } h.n++; return h.n > max; }
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (h.reset < now) hits.delete(k); }, 60000).unref();

// ---------------------------------------------------------------- HTTP
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.css': 'text/css; charset=utf-8', '.ico': 'image/x-icon' };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC }); res.end(JSON.stringify(obj)); }
function body(req) { return new Promise((ok, bad) => { let s = ''; req.on('data', d => { s += d; if (s.length > 20000) { bad(new Error('grande demais')); req.destroy(); } }); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch { bad(new Error('json inválido')); } }); }); }
const ipOf = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
const userBySession = tok => (tok && typeof tok === 'string' && db.sessions[tok]) ? db.sessions[tok] : null;
const isAdmin = req => ADMIN_KEY && same(req.headers['x-admin-key'] || '', ADMIN_KEY);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    // ------- API pública
    if (p === '/api/login' && req.method === 'POST') {
      if (limited('login:' + ipOf(req), 12, 10 * 60000)) return send(res, 429, { error: 'Muitas tentativas. Espere alguns minutos.' });
      const b = await body(req), u = norm(b.username), code = String(b.code || '').trim().toUpperCase();
      let rec = validUser(u) ? db.users[u] : null;
      if (!SECRET || !validUser(u) || rec?.removed || !same(code, codeFor(u, rec?.v || 0))) return send(res, 401, { error: 'Usuário ou código inválido. Só quem comentou recebe um código.' });
      if (!rec) rec = db.users[u] = { v: 0, createdAt: Date.now() };
      const tok = newToken(); db.sessions[tok] = u; rec.lastLogin = Date.now(); save();
      return send(res, 200, { token: tok, username: u, look: rec.look || null });
    }
    if (p === '/api/config') return send(res, 200, { open: OPEN, verify: igOn(), postUrl: IG_POST_URL });
    if (p === '/api/join' && req.method === 'POST') {
      if (!OPEN) return send(res, 403, { error: 'A entrada livre está desligada.' });
      if (limited('join:' + ipOf(req), 20, 10 * 60000)) return send(res, 429, { error: 'Muitas tentativas. Espere alguns minutos.' });
      const b = await body(req), u = norm(b.username);
      if (!validUser(u)) return send(res, 400, { error: 'Use só letras, números, ponto e _ (até 30).' });
      if (db.users[u] && db.users[u].removed) return send(res, 403, { error: 'Esse @ não pode entrar em Eryon.' });
      if (RESERVED.has(u)) return send(res, 403, { reserved: true, error: 'Esse @ é de um morador dos episódios. Entre com o código que você recebeu.' });
      if ([...clients].some(c => c.user === u)) return send(res, 409, { error: 'Esse @ já está em Eryon agora. Escolha outro.' });
      let rec = db.users[u]; if (!rec) rec = db.users[u] = { v: 0, createdAt: Date.now(), open: true };
      rec.lastLogin = Date.now(); const tok = newToken(); db.sessions[tok] = u; save();
      return send(res, 200, { token: tok, username: u, look: rec.look || null });
    }
    if (p === '/api/start' && req.method === 'POST') {
      if (limited('start:' + ipOf(req), 15, 10 * 60000)) return send(res, 429, { error: 'Muitas tentativas. Espere alguns minutos.' });
      if (!igOn()) return send(res, 503, { error: 'A verificação pelo Instagram ainda não foi configurada. Use um código de acesso.' });
      const b = await body(req), u = norm(b.username);
      if (!validUser(u)) return send(res, 400, { error: 'Esse @ não parece válido.' });
      if (db.users[u] && db.users[u].removed) return send(res, 403, { error: 'Esse @ não tem acesso a Eryon.' });
      const id = crypto.randomBytes(12).toString('hex'), word = newWord();
      pending.set(id, { u, word, exp: Date.now() + 40 * 60000 });
      return send(res, 200, { id, word, postUrl: IG_POST_URL });
    }
    if (p === '/api/check' && req.method === 'POST') {
      if (limited('check:' + ipOf(req), 200, 10 * 60000)) return send(res, 429, { error: 'Muitas tentativas.' });
      const b = await body(req), pd = pending.get(String(b.id || ''));
      if (!pd) return send(res, 404, { error: 'Essa verificação expirou. Comece de novo.' });
      const list = await igComments(), want = squash(pd.word);
      const ok = list.some(c => c.u === pd.u && squash(c.text).includes(want));
      if (!ok) return send(res, 200, { waiting: true, problem: igCache.err ? 'instagram' : null });
      pending.delete(String(b.id));
      let rec = db.users[pd.u]; if (!rec) rec = db.users[pd.u] = { v: 0, createdAt: Date.now() };
      rec.verified = true; rec.lastLogin = Date.now();
      const tok = newToken(); db.sessions[tok] = pd.u; save();
      return send(res, 200, { token: tok, username: pd.u, look: rec.look || null });
    }
    if (p === '/api/me' && req.method === 'GET') {
      const u = userBySession(url.searchParams.get('token'));
      if (!u || !db.users[u] || db.users[u].removed) return send(res, 401, { error: 'sessão expirada' });
      return send(res, 200, { username: u, look: db.users[u].look || null });
    }
    if (p === '/api/look' && req.method === 'POST') {
      const b = await body(req), u = userBySession(b.token);
      if (!u || !db.users[u]) return send(res, 401, { error: 'sessão expirada' });
      db.users[u].look = cleanLook(b.look); save();
      for (const c of clients) if (c.user === u) all({ t: 'look', id: c.id, look: db.users[u].look });
      return send(res, 200, { ok: true, look: db.users[u].look });
    }
    if (p === '/api/logout' && req.method === 'POST') { const b = await body(req); if (b.token) delete db.sessions[b.token]; save(); return send(res, 200, { ok: true }); }
    // ------- API do admin
    if (p.startsWith('/api/admin/')) {
      if (!ADMIN_KEY) return send(res, 503, { error: 'Defina a variável ADMIN_KEY no servidor.' });
      if (limited('admin:' + ipOf(req), 60, 60000)) return send(res, 429, { error: 'Muitas requisições.' });
      if (!isAdmin(req)) return send(res, 401, { error: 'Chave de admin incorreta.' });
      if (p === '/api/admin/list') return send(res, 200, { users: listUsers(), instagram: { on: igOn(), error: igCache.err, comments: igCache.comments.length, postUrl: IG_POST_URL } });
      if (p === '/api/admin/add' && req.method === 'POST') {
        const b = await body(req), raw = Array.isArray(b.usernames) ? b.usernames : String(b.usernames || '').split(/[\s,;]+/);
        const added = [], invalid = [];
        for (const r of raw) { const u = norm(r); if (!u) continue; if (!validUser(u)) { invalid.push(r); continue; } const ex = db.users[u]; if (!ex) { db.users[u] = { v: 0, createdAt: Date.now() }; added.push(u); } else if (ex.removed) { ex.removed = false; ex.v = (ex.v || 0) + 1; added.push(u); } }
        save(); return send(res, 200, { added, invalid, users: listUsers() });
      }
      if (p === '/api/admin/remove' && req.method === 'POST') {
        const b = await body(req), u = norm(b.username);
        db.users[u] = { removed: true, v: ((db.users[u] && db.users[u].v) || 0) + 1 }; for (const t in db.sessions) if (db.sessions[t] === u) delete db.sessions[t];
        for (const c of clients) if (c.user === u) c.ws.close(4001, 'removido'); save(); return send(res, 200, { users: listUsers() });
      }
      if (p === '/api/admin/newcode' && req.method === 'POST') {
        const b = await body(req), u = norm(b.username); if (!db.users[u]) return send(res, 404, { error: 'não encontrado' });
        db.users[u].v = (db.users[u].v || 0) + 1; for (const t in db.sessions) if (db.sessions[t] === u) delete db.sessions[t]; save(); return send(res, 200, { users: listUsers() });
      }
      return send(res, 404, { error: 'rota desconhecida' });
    }
    // ------- arquivos estáticos
    let file = p === '/' ? '/index.html' : p === '/admin' ? '/admin.html' : p;
    const full = path.normalize(path.join(PUBLIC, decodeURIComponent(file)));
    if (!full.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(full, (e, d) => {
      if (e) { res.writeHead(404, SEC); return res.end('não encontrado'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream', 'Cache-Control': full.endsWith('.woff2') ? 'public, max-age=86400' : 'no-cache', ...SEC });
      res.end(d);
    });
  } catch (e) { send(res, 400, { error: e.message }); }
});
function listUsers() { const online = new Set([...clients].map(c => c.user)); return Object.entries(db.users).filter(([, r]) => !r.removed).map(([u, r]) => ({ username: u, code: codeFor(u, r.v || 0), online: online.has(u), lastLogin: r.lastLogin || null })).sort((a, b) => a.username.localeCompare(b.username)); }

// ---------------------------------------------------------------- tempo real
const WORLD = { w: 720, h: 1280 }, SPAWN = { x: 360, y: 668 };
const clients = new Set();
const chatLog = [];
let nextId = 1;
const wss = new WebSocketServer({ server, maxPayload: 4096 });
const out = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const all = (m, except) => { const s = JSON.stringify(m); for (const c of clients) if (c !== except && c.ws.readyState === 1) c.ws.send(s); };
const pub = c => ({ id: c.id, username: c.user, look: db.users[c.user]?.look || null, x: c.x, y: c.y, face: c.face, moving: c.moving });

wss.on('connection', (ws, req) => {
  if (limited('ws:' + ipOf(req), 30, 60000)) return ws.close(4029, 'muitas conexões');
  let c = null;
  const timer = setTimeout(() => { if (!c) ws.close(4000, 'sem login'); }, 8000);
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!c) {
      if (m.t !== 'hello') return;
      const u = userBySession(m.token); if (!u || !db.users[u] || db.users[u].removed) return ws.close(4001, 'sessão inválida');
      clearTimeout(timer);
      for (const o of clients) if (o.user === u) o.ws.close(4002, 'conectado em outro lugar');
      const rec = db.users[u];
      c = { ws, id: nextId++, user: u, x: rec.x ?? SPAWN.x + (Math.random() * 30 - 15), y: rec.y ?? SPAWN.y + (Math.random() * 10), face: 1, moving: false, lastMove: Date.now(), lastChat: 0, dirty: true };
      clients.add(c);
      out(ws, { t: 'welcome', id: c.id, me: pub(c), players: [...clients].filter(o => o !== c).map(pub), chat: chatLog.slice(-25) });
      all({ t: 'join', p: pub(c) }, c);
      return;
    }
    if (m.t === 'move') {
      const now = Date.now(), dt = Math.min(1, (now - c.lastMove) / 1000); c.lastMove = now;
      let nx = Number(m.x), ny = Number(m.y); if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
      const max = 70 * dt + 6, dx = nx - c.x, dy = ny - c.y, d = Math.hypot(dx, dy);
      if (d > max) { nx = c.x + dx / d * max; ny = c.y + dy / d * max; }
      c.x = Math.max(4, Math.min(WORLD.w - 4, nx)); c.y = Math.max(8, Math.min(WORLD.h - 4, ny));
      c.face = m.face < 0 ? -1 : 1; c.moving = !!m.moving; c.dirty = true;
    } else if (m.t === 'chat') {
      const now = Date.now(); if (now - c.lastChat < 1200) return; c.lastChat = now;
      const text = String(m.text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!text) return;
      const msg = { t: 'chat', id: c.id, username: c.user, text, ts: now };
      chatLog.push(msg); if (chatLog.length > 60) chatLog.shift();
      all(msg);
    }
  });
  ws.on('close', () => { clearTimeout(timer); if (!c) return; clients.delete(c); const rec = db.users[c.user]; if (rec) { rec.x = Math.round(c.x); rec.y = Math.round(c.y); save(); } all({ t: 'leave', id: c.id }); });
  ws.on('error', () => {});
});
// estado 10x por segundo (só quem mudou)
setInterval(() => {
  const ch = []; for (const c of clients) if (c.dirty) { ch.push({ id: c.id, x: Math.round(c.x * 10) / 10, y: Math.round(c.y * 10) / 10, face: c.face, moving: c.moving }); c.dirty = false; }
  if (ch.length) all({ t: 'state', p: ch, online: clients.size });
}, 100);
// mantém conexões vivas e salva posições
setInterval(() => { for (const c of clients) { const rec = db.users[c.user]; if (rec) { rec.x = Math.round(c.x); rec.y = Math.round(c.y); } } save(); }, 30000);

server.listen(PORT, () => console.log(`Eryon Online rodando em http://localhost:${PORT}  (admin: /admin)`));
