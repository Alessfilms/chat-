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
let dirty = false;
function save() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(() => { fs.writeFile(DBF + '.tmp', JSON.stringify(db), e => { if (!e) fs.rename(DBF + '.tmp', DBF, () => {}); }); }, 400); }
function initDb() {
  db.users ||= {}; db.sessions ||= {}; db.houses ||= []; db.nextHouse ||= 1; db.bridges ||= []; db.nextBridge ||= 1;
  db.decor ||= []; db.nextDecor ||= 1; db.firsts ||= {};
  db.notice ||= { on: false, title: '', text: '', every: 10 };
  db.mutes ||= {}; db.reports ||= []; db.signs ||= []; db.nextSign ||= 1; db.staff ||= {};
  db.castle ||= { pedra: 0, lenha: 0, by: {} }; db.castle.by ||= {}; db.animals ||= []; db.nextAnimal ||= 1;
  db.giant ||= { at: Date.UTC(2026, 10, 4, 22, 0, 0), state: Date.now() < Date.UTC(2026, 10, 4, 22, 0, 0) ? 'scheduled' : 'none', damaged: [] }; db.giant.damaged ||= []; db.cut ||= []; if (db.king === undefined) db.king = 'emanuel01.f'; db.rguards ||= {}; db.treasury ||= { moedas: 0, taxAt: 0, log: [] }; db.giant.burned ||= []; db.giant.rebuild ||= {};
  if (db.giant.state === 'battle') db.giant.state = 'scheduled', db.giant.at = Date.now() + 60000;   // reiniciou no meio da batalha: recomeça em 1 min
  for (const r of Object.values(db.users)) if (r && typeof r === 'object') { if (r.tot && typeof r.tot !== 'object') r.tot = {}; }
}
initDb();

// ---------------------------------------------------------------- memória permanente (Upstash Redis, grátis)
// No Render grátis o disco é apagado a cada reinício. Com UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN
// o mundo inteiro (casas, construções, decoração, mochilas, avatares) fica guardado fora do servidor.
const zlib = require('zlib');
// aceita o valor colado com aspas/parênteses/espaços ou até com "NOME=valor"
const envClean = v => String(v || '').trim().replace(/^[A-Z_]+\s*=\s*/, '').replace(/^[\s"'`(\[{<]+|[\s"'`)\]}>;,]+$/g, '');
const UP_URL = envClean(process.env.UPSTASH_REDIS_REST_URL).replace(/\/+$/, ''), UP_TOKEN = envClean(process.env.UPSTASH_REDIS_REST_TOKEN);
const DB_KEY = process.env.DB_KEY || 'eryon_db';
const remoteOn = () => !!(UP_URL && UP_TOKEN);
const remote = { ok: false, lastSave: 0, error: '' };
async function upstash(cmd) {
  const r = await fetch(UP_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + UP_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status));
  return j.result;
}
function pruneSessions() {
  const s = Object.entries(db.sessions); if (s.length <= 5000) return;
  db.sessions = Object.fromEntries(s.slice(-5000)); // mantém as 5000 sessões mais recentes
}
async function remoteLoad() {
  if (!remoteOn()) return;
  for (let i = 0; i < 3; i++) {
    try {
      const v = await upstash(['GET', DB_KEY]);
      if (v) { db = JSON.parse(zlib.gunzipSync(Buffer.from(v, 'base64')).toString('utf8')); initDb(); console.log('[memória] mundo carregado do Upstash:', Object.keys(db.users).length, 'jogadores,', db.houses.length, 'construções,', db.decor.length, 'decorações'); }
      else { console.log('[memória] Upstash vazio: começando com o mundo local e salvando lá.'); dirty = true; }
      remote.ok = true; return;
    } catch (e) { remote.error = String(e.message || e); console.warn('[memória] falha ao carregar do Upstash:', remote.error); await new Promise(r => setTimeout(r, 1500 * (i + 1))); }
  }
}
let saving = null;
async function remoteSave(force) {
  if (!remoteOn() || !remote.ok || (!dirty && !force)) return;
  if (saving) return saving;
  dirty = false; pruneSessions();
  const data = zlib.gzipSync(JSON.stringify(db)).toString('base64');
  saving = upstash(['SET', DB_KEY, data]).then(() => { remote.lastSave = Date.now(); remote.error = ''; })
    .catch(e => { dirty = true; remote.error = String(e.message || e); console.warn('[memória] falha ao salvar:', remote.error); })
    .finally(() => { saving = null; });
  return saving;
}
setInterval(() => remoteSave(), 8000).unref();

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
const HATS = ['', 'palha', 'bone', 'chef', 'mago', 'elmo'];
const CAPES = ['', '#4e6c4a', '#1d3550', '#a83a32', '#6e4a8a'];
const CLS = ['', 'lenhador', 'guerreiro', 'maga', 'arqueira', 'ferreiro', 'construtor', 'cozinheiro', 'curandeira', 'bardo', 'taverneiro', 'mago', 'fada', 'guarda'];
function cleanLook(l) {
  if (!l || typeof l !== 'object') return null;
  const pick = (v, list) => list.includes(v) ? v : list[0];
  return { hair: pick(l.hair, HAIRS), shirt: pick(l.shirt, SHIRTS), pants: pick(l.pants, PANTS), skin: pick(l.skin, SKINS), longHair: !!l.longHair, beard: !!l.beard, elfEars: !!l.elfEars, hat: pick(l.hat || '', HATS), cape: pick(l.cape || '', CAPES), cls: pick(l.cls || '', CLS) };
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

// ---------------------------------------------------------------- diagnóstico (aparece no /admin)
const DIAG = { since: Date.now(), peak: 0, peakAt: 0, joinOk: 0, join429: 0, joinFail: {}, ws429: 0, wsOpen: 0, closed: {}, loaded: 0, connected: 0, devices: {}, errors: [] };
const devOf = ua => { ua = String(ua || ''); const ig = /Instagram/i.test(ua) ? 'Instagram ' : /FBAN|FBAV/i.test(ua) ? 'Facebook ' : ''; return ig + (/iPhone|iPad/i.test(ua) ? 'iPhone' : /Android/i.test(ua) ? 'Android' : 'Computador'); };
// ---------------------------------------------------------------- HTTP
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.css': 'text/css; charset=utf-8', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp' };
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
    if (p === '/api/config') return send(res, 200, { open: OPEN, verify: igOn(), postUrl: IG_POST_URL, support: { url: (db.supportCfg && db.supportCfg.url) || SUPPORT_URL, pix: (db.supportCfg && db.supportCfg.pix) || PIX_KEY } });
    if (p === '/api/join' && req.method === 'POST') {
      if (!OPEN) return send(res, 403, { error: 'A entrada livre está desligada.' });
      if (limited('join:' + ipOf(req), 400, 10 * 60000)) { DIAG.join429++; return send(res, 429, { error: 'Muitas tentativas. Espere alguns minutos.' }); }
      const b = await body(req), u = norm(b.username);
      if (!validUser(u)) return send(res, 400, { error: 'Use só letras, números, ponto e _ (até 30).' });
      if ([...clients].some(c => c.user === u)) DIAG.joinFail['@ já está online'] = (DIAG.joinFail['@ já está online'] || 0) + 1;
      if (db.users[u] && db.users[u].removed) return send(res, 403, { error: 'Esse @ não pode entrar em Eryon.' });
      if (RESERVED.has(u)) return send(res, 403, { reserved: true, error: 'Esse @ é de um morador dos episódios. Entre com o código que você recebeu.' });
      if ([...clients].some(c => c.user === u)) return send(res, 409, { error: 'Esse @ já está em Eryon agora. Escolha outro.' });
      let rec = db.users[u]; if (!rec) rec = db.users[u] = { v: 0, createdAt: Date.now(), open: true };
      rec.lastLogin = Date.now(); const tok = newToken(); db.sessions[tok] = u; save(); DIAG.joinOk++;
      return send(res, 200, { token: tok, username: u, look: rec.look || null });
    }
    if (p === '/api/diag' && req.method === 'POST') {
      if (limited('diag:' + ipOf(req), 20, 60000)) return send(res, 429, {});
      const b = await body(req), dev = devOf(req.headers['user-agent']);
      if (b.k === 'loaded') { DIAG.loaded++; DIAG.devices[dev] = (DIAG.devices[dev] || 0) + 1; }
      else if (b.k === 'connected') DIAG.connected++;
      else if (b.k === 'error' || b.k === 'joinfail') { DIAG.errors.push({ t: Date.now(), k: b.k, dev, msg: String(b.msg || '').slice(0, 200), ms: Math.round(Number(b.ms) || 0) }); if (DIAG.errors.length > 40) DIAG.errors.shift(); }
      return send(res, 200, { ok: true });
    }
    if (p === '/api/start' && req.method === 'POST') {
      if (limited('start:' + ipOf(req), 60, 10 * 60000)) return send(res, 429, { error: 'Muitas tentativas. Espere alguns minutos.' });
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
      const old = db.users[u].look || {}; db.users[u].look = { ...cleanLook(b.look), ...(old.equip ? { equip: old.equip, equipTool: old.equipTool } : {}), ...(old.pet ? { pet: old.pet } : {}) }; save();
      for (const c of clients) if (c.user === u) all({ t: 'look', id: c.id, look: db.users[u].look });
      return send(res, 200, { ok: true, look: db.users[u].look });
    }
    if (p === '/api/logout' && req.method === 'POST') { const b = await body(req); if (b.token) delete db.sessions[b.token]; save(); return send(res, 200, { ok: true }); }
    // ------- API do admin
    if (p.startsWith('/api/admin/')) {
      if (!ADMIN_KEY) return send(res, 503, { error: 'Defina a variável ADMIN_KEY no servidor.' });
      if (limited('admin:' + ipOf(req), 60, 60000)) return send(res, 429, { error: 'Muitas requisições.' });
      if (!isAdmin(req)) return send(res, 401, { error: 'Chave de admin incorreta.' });
      if (p === '/api/admin/list') return send(res, 200, { diag: { ...DIAG, online: clients.size }, users: listUsers(), instagram: { on: igOn(), error: igCache.err, comments: igCache.comments.length, postUrl: IG_POST_URL }, storage: { permanent: remoteOn() && remote.ok, configured: remoteOn(), lastSave: remote.lastSave, error: remote.error, houses: db.houses.length, decor: db.decor.length } });
      if (p === '/api/admin/add' && req.method === 'POST') {
        const b = await body(req), raw = Array.isArray(b.usernames) ? b.usernames : String(b.usernames || '').split(/[\s,;]+/);
        const added = [], invalid = [];
        for (const r of raw) { const u = norm(r); if (!u) continue; if (!validUser(u)) { invalid.push(r); continue; } const ex = db.users[u]; if (!ex) { db.users[u] = { v: 0, createdAt: Date.now() }; added.push(u); } else if (ex.removed) { ex.removed = false; ex.v = (ex.v || 0) + 1; added.push(u); } }
        save(); return send(res, 200, { added, invalid, users: listUsers() });
      }
      if (p === '/api/admin/remove' && req.method === 'POST') {
        const b = await body(req), u = norm(b.username);
        db.users[u] = { removed: true, v: ((db.users[u] && db.users[u].v) || 0) + 1 }; db.houses = (db.houses || []).filter(h => h.owner !== u); all({ t: 'houses', list: db.houses }); db.decor = (db.decor || []).filter(d => d.owner !== u); all({ t: 'decor', list: db.decor }); for (const t in db.sessions) if (db.sessions[t] === u) delete db.sessions[t];
        for (const c of clients) if (c.user === u) c.ws.close(4001, 'removido'); save(); return send(res, 200, { users: listUsers() });
      }
      if (p === '/api/admin/give' && req.method === 'POST') {
        const b = await body(req), u = norm(b.username), r = db.users[u]; if (!r || r.removed) return send(res, 404, { error: 'Esse @ ainda não entrou em Eryon.' });
        const inv = invOf(r); for (const k of ['lenha', 'pedra', 'ervas', 'moedas', 'frutas']) { const n = Math.max(0, Math.min(999, Math.floor(Number(b[k]) || 0))); inv[k] = (inv[k] || 0) + n; } save();
        for (const c of clients) if (c.user === u) { sendInv(c); note(c, 'Você recebeu recursos do criador de Eryon!'); }
        return send(res, 200, { ok: true, inv });
      }
      if (p === '/api/admin/reports') { const by = {}; for (const r of db.reports) (by[r.target] ||= []).push(r);
        return send(res, 200, { notice: db.notice, reports: db.reports.slice(-100).reverse(), muted: Object.entries(db.mutes).filter(([, t]) => t > Date.now()).map(([u, t]) => ({ username: u, until: t })), supporters: Object.entries(db.users).filter(([, r]) => r.sup).map(([u]) => u), staff: [...new Set([...Object.keys(db.staff), ...CREATORS])], signs: db.signs, supportCfg: db.supportCfg || { url: SUPPORT_URL, pix: PIX_KEY }, giant: giantPub(), castle: { pedra: db.castle.pedra, lenha: db.castle.lenha, stage: stageIdx(), stages: STAGES.length, name: (STAGES[stageIdx()] || { name: 'Pronto' }).name, top: Object.entries(db.castle.by).sort((a, b) => b[1] - a[1]).slice(0, 10) }, online: [...clients].map(c => ({ username: c.user, x: Math.round(c.x), y: Math.round(c.y) })) }); }
      if (p === '/api/admin/mute' && req.method === 'POST') { const b = await body(req), u = norm(b.username), min = Math.max(0, Math.min(10080, Number(b.minutes) || 0)); if (!db.users[u]) return send(res, 404, { error: 'Esse @ não existe.' }); if (min) mute(u, min, 'pelo criador'); else { delete db.mutes[u]; save(); } return send(res, 200, { ok: true }); }
      if (p === '/api/admin/kick' && req.method === 'POST') { const b = await body(req), u = norm(b.username); let n = 0; for (const c of clients) if (c.user === u) { c.ws.close(4003, 'expulso'); n++; } return send(res, 200, { ok: true, kicked: n }); }
      if (p === '/api/admin/ban' && req.method === 'POST') { const b = await body(req), u = norm(b.username); if (!db.users[u]) return send(res, 404, { error: 'Esse @ não existe.' }); db.users[u].removed = true; db.users[u].v = (db.users[u].v || 0) + 1; for (const t in db.sessions) if (db.sessions[t] === u) delete db.sessions[t]; for (const c of clients) if (c.user === u) c.ws.close(4001, 'banido'); save(); return send(res, 200, { ok: true }); }
      if (p === '/api/admin/unban' && req.method === 'POST') { const b = await body(req), u = norm(b.username); if (db.users[u]) { db.users[u].removed = false; save(); } return send(res, 200, { ok: true }); }
      if (p === '/api/admin/dismiss' && req.method === 'POST') { const b = await body(req); db.reports = db.reports.filter(r => b.all ? r.target !== b.target : r.id !== b.id); save(); return send(res, 200, { ok: true }); }
      if (p === '/api/admin/announce' && req.method === 'POST') { const b = await body(req), text = String(b.text || '').trim().slice(0, 140); if (!text) return send(res, 400, { error: 'Escreva o anúncio.' }); all({ t: 'announce', text }); const msg = { t: 'chat', id: 0, username: 'Criador de Eryon', text, ts: Date.now(), badge: 'criador' }; chatLog.push(msg); all(msg); return send(res, 200, { ok: true, online: clients.size }); }
      if (p === '/api/admin/rain' && req.method === 'POST') { const b = await body(req), g = {}; for (const k of ['lenha', 'pedra', 'ervas']) g[k] = Math.max(0, Math.min(200, Math.floor(Number(b[k]) || 0)));
        for (const c of clients) { const r = db.users[c.user]; if (!r) continue; const inv = invOf(r); for (const k in g) inv[k] = (inv[k] || 0) + g[k]; sendInv(c); } save();
        all({ t: 'rain', gift: g }); return send(res, 200, { ok: true, online: clients.size }); }
      if (p === '/api/admin/supporter' && req.method === 'POST') { const b = await body(req), u = norm(b.username), r = db.users[u]; if (!r) return send(res, 404, { error: 'Esse @ ainda não entrou em Eryon.' });
        r.sup = !!b.on; if (r.sup) delete r.supOff; else { r.supOff = true; if (r.look && !isStaff(u)) delete r.look.pet; } save();
        if (r.sup) { db.supList = [u, ...(db.supList || []).filter(x => x !== u)].slice(0, 20); all({ t: 'thanks', username: u, look: r.look || null }); }
        for (const c of clients) if (c.user === u) { c.dirty = true; out(c.ws, { t: 'perk', perk: perkFor(u) }); all({ t: 'badge', id: c.id, badge: badgeOf(u) }); if (r.sup) out(c.ws, { t: 'supporter' }); if (r.look) all({ t: 'look', id: c.id, look: r.look }); }
        return send(res, 200, { ok: true }); }
      if (p === '/api/admin/castle' && req.method === 'POST') { const b = await body(req);
        if (b.reset) { if (b.confirm !== 'RECOMECAR') return send(res, 400, { error: 'Confirme digitando RECOMECAR.' }); db.castle = { pedra: 0, lenha: 0, by: {} }; }
        else { const tp = STAGES.reduce((a, st) => a + st.pedra, 0), tl = STAGES.reduce((a, st) => a + st.lenha, 0), before = stageIdx();
          db.castle.pedra = Math.min(tp, db.castle.pedra + Math.max(0, Math.min(5000, Math.floor(Number(b.pedra) || 0)))); db.castle.lenha = Math.min(tl, db.castle.lenha + Math.max(0, Math.min(5000, Math.floor(Number(b.lenha) || 0))));
          const after = stageIdx(); if (after > before) { const txt = after >= STAGES.length ? 'O CASTELO DE ERYON ESTÁ PRONTO!' : `O Criador começou a obra! O castelo ganhou: ${STAGES[after - 1].name}.`; all({ t: 'announce', text: txt }); } }
        save(); all(castleState({ n: 1 })); return send(res, 200, { ok: true, giant: giantPub(), castle: { pedra: db.castle.pedra, lenha: db.castle.lenha, stage: stageIdx(), stages: STAGES.length } }); }
      if (p === '/api/admin/giant' && req.method === 'POST') { const b = await body(req);
        if (b.action === 'schedule') { const at = Number(b.at); if (!Number.isFinite(at) || at < Date.now() - 60000) return send(res, 400, { error: 'Escolha um horário no futuro.' }); if (G) return send(res, 400, { error: 'A batalha já está acontecendo.' }); db.giant.at = at; db.giant.state = 'scheduled'; }
        else if (b.action === 'start') { if (!G) startGiant(['fogo', 'dragao'].includes(b.kind) ? b.kind : 'pedra'); else return send(res, 400, { error: 'Já tem uma batalha acontecendo.' }); }
        else if (b.action === 'cancel') { const resume = G && G.resume > Date.now() ? G.resume : 0, fogo = G && G.kind === 'fogo', drg = G && G.kind === 'dragao'; G = null; if (resume) { db.giant.state = 'scheduled'; db.giant.at = resume; } else db.giant.state = 'none'; all({ t: 'announce', from: 'ALERTA DE ERYON', text: drg ? 'O Dragão voou para longe... por enquanto.' : fogo ? 'A Fera de Fogo voltou para o vulcão... por enquanto.' : 'O gigante voltou a dormir... por enquanto.' }); }
        else if (b.action === 'repair') { db.giant.damaged = []; if (b.all) { db.giant.burned = []; db.giant.rebuild = {}; } }
        save(); all({ t: 'giant', ...giantPub() }); return send(res, 200, { ok: true, giant: giantPub() }); }
      if (p === '/api/admin/king' && req.method === 'POST') { const b = await body(req), u = norm(b.username); if (u && !validUser(u)) return send(res, 400, { error: '@ inválido' });
        db.king = u; save(); all({ t: 'king', username: u, crowned: !!u }); return send(res, 200, { ok: true }); }
      if (p === '/api/admin/notice' && req.method === 'POST') { const b = await body(req);   // aviso em popup que aparece de vez em quando
        db.notice = { on: !!b.on, title: String(b.title || '').trim().slice(0, 60), text: String(b.text || '').trim().slice(0, 400), every: Math.max(2, Math.min(120, Number(b.every) || 10)) };
        if (db.notice.on && !db.notice.text) return send(res, 400, { error: 'Escreva o texto do aviso.' }); save(); all({ t: 'notice', notice: db.notice, now: !!b.now }); return send(res, 200, { ok: true }); }
      if (p === '/api/admin/supportcfg' && req.method === 'POST') { const b = await body(req), url = String(b.url || '').trim().slice(0, 200), pix = String(b.pix || '').trim().slice(0, 120);
        if (url && !/^https:\/\/[^\s<>"']+$/.test(url)) return send(res, 400, { error: 'O link precisa começar com https://' }); db.supportCfg = { url, pix }; save(); return send(res, 200, { ok: true }); }
      if (p === '/api/admin/thanks' && req.method === 'POST') { const b = await body(req), u = norm(b.username), r = db.users[u]; if (!r || !r.sup) return send(res, 400, { error: 'Esse @ ainda não tem o selo de apoiador.' }); all({ t: 'thanks', username: u, look: r.look || null }); return send(res, 200, { ok: true }); }
      if (p === '/api/admin/staff' && req.method === 'POST') { const b = await body(req), u = norm(b.username); if (!validUser(u)) return send(res, 400, { error: '@ inválido' }); if (b.on) db.staff[u] = true; else delete db.staff[u]; save();
        for (const c of clients) if (c.user === u) { out(c.ws, { t: 'perk', perk: perkFor(u) }); all({ t: 'badge', id: c.id, badge: badgeOf(u) }); } return send(res, 200, { ok: true }); }
      if (p === '/api/admin/sign' && req.method === 'POST') { const b = await body(req), text = String(b.text || '').trim().slice(0, 80), u = norm(b.username); const at = [...clients].find(c => c.user === u);
        if (!text) return send(res, 400, { error: 'Escreva o texto da placa.' }); if (!at) return send(res, 404, { error: 'Esse @ precisa estar online: a placa aparece do lado dele.' }); if (at.room) return send(res, 400, { error: 'A pessoa precisa estar do lado de fora.' });
        db.signs.push({ id: db.nextSign++, text, x: Math.round(at.x + 14), y: Math.round(at.y), color: /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : '#ffd84a' }); save(); all({ t: 'signs', list: db.signs }); return send(res, 200, { ok: true, signs: db.signs }); }
      if (p === '/api/admin/signdel' && req.method === 'POST') { const b = await body(req); db.signs = db.signs.filter(s => s.id !== Number(b.id)); save(); all({ t: 'signs', list: db.signs }); return send(res, 200, { ok: true, signs: db.signs }); }
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
    // áudio: suporte a Range (o Safari do iPhone exige para tocar) e cache longo
    if (/\.(mp3|ogg)$/.test(full)) return fs.stat(full, (e, st) => {
      if (e || !st.isFile()) { res.writeHead(404, SEC); return res.end('não encontrado'); }
      const h = { 'Content-Type': TYPES[path.extname(full)], 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=604800', ...SEC };
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (m && (m[1] || m[2])) {
        let a = m[1] ? +m[1] : st.size - +m[2], b = m[1] && m[2] ? +m[2] : st.size - 1; b = Math.min(b, st.size - 1);
        if (a < 0 || a > b) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size, ...SEC }); return res.end(); }
        res.writeHead(206, { ...h, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
        return req.method === 'HEAD' ? res.end() : fs.createReadStream(full, { start: a, end: b }).pipe(res);
      }
      res.writeHead(200, { ...h, 'Content-Length': st.size }); return req.method === 'HEAD' ? res.end() : fs.createReadStream(full).pipe(res);
    });
    fs.readFile(full, (e, d) => {
      if (e) { res.writeHead(404, SEC); return res.end('não encontrado'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream', 'Cache-Control': full.endsWith('.woff2') ? 'public, max-age=86400' : 'no-cache', ...SEC });
      res.end(d);
    });
  } catch (e) { send(res, 400, { error: e.message }); }
});
function listUsers() { const online = new Set([...clients].map(c => c.user)); return Object.entries(db.users).filter(([, r]) => !r.removed).map(([u, r]) => ({ username: u, code: codeFor(u, r.v || 0), online: online.has(u), lastLogin: r.lastLogin || null })).sort((a, b) => a.username.localeCompare(b.username)); }

// ---------------------------------------------------------------- tempo real
const WORLD = { w: 2280, h: 2400 }, SPAWN = { x: 360, y: 668 };
const clients = new Set();
const chatLog = [];
let nextId = 1;
const wss = new WebSocketServer({ server, maxPayload: 4096 });
const out = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const all = (m, except) => { const s = JSON.stringify(m); for (const c of clients) if (c !== except && c.ws.readyState === 1) c.ws.send(s); };
let kingSeenT = 0;
const pub = c => ({ id: c.id, username: c.user, look: db.users[c.user]?.look || null, x: c.x, y: c.y, face: c.face, moving: c.moving, room: c.room || '', carry: !!c.carry, lv: levelOf(db.users[c.user]?.xp || 0), badge: badgeOf(c.user), king: !!db.king && c.user === db.king, rg: !!db.rguards[c.user], horse: !!c.horse, fly: !!c.fly });
const BT = { casa: { name: 'Casa', cost: { lenha: 10 } }, bar: { name: 'Bar', cost: { lenha: 14, pedra: 4 } }, mercado: { name: 'Mercado', cost: { lenha: 12, pedra: 4, ervas: 2 } }, hospital: { name: 'Hospital', cost: { lenha: 12, pedra: 8, ervas: 4 } },
  escola: { name: 'Escola', cost: { lenha: 14, pedra: 6 } }, banco: { name: 'Banco', cost: { lenha: 10, pedra: 14 } }, prefeitura: { name: 'Prefeitura', cost: { lenha: 20, pedra: 16 }, limit: 1 },
  cabana: { name: 'Cabana', cost: { lenha: 8 } }, casarao: { name: 'Casarão', cost: { lenha: 18, pedra: 8 } }, celeiro: { name: 'Celeiro', cost: { lenha: 14, pedra: 2 } }, torre_vigia: { name: 'Torre de vigia', cost: { lenha: 6, pedra: 14 } }, moinho: { name: 'Moinho', cost: { lenha: 12, pedra: 10 } } };
const ROOM_OK = /^(|taverna|gruta|abismo|castelo|castelo_torre|casa_[1-9](_up)?|h_[0-9]{1,6}(_up)?)$/;
const LANDMARK_NAMES = { mao: 'a Mão do Gigante', vulcao: 'o Vulcão de Eryon', arco: 'o Arco do Cânion', costela: 'a Costela de Dragão', ruinas: 'as Ruínas da Inscrição', torre: 'a Torre Antiga', caverna: 'a Caverna Escondida', buraco: 'o Buraco Misterioso', circulo: 'o Círculo de Pedras', arvore: 'a Árvore Ancestral', poco: 'o Poço da Lua', lago: 'o Lago Espelhado', gigante: 'a Estátua do Gigante', acampamento: 'o Acampamento Abandonado', cristais: 'o Jardim de Cristais', cemiterio: 'o Cemitério Antigo', portal: 'o Portal Esquecido', ninho: 'o Ninho do Dragão' };
const ACTS = new Set(['zap', 'mine', 'gather', 'eat', 'chop', 'split', 'drink', 'magic', 'sword', 'arrow', 'hammer', 'build', 'cook', 'heal', 'lute', 'serve']);
db.houses ||= []; db.nextHouse ||= 1; db.bridges ||= []; db.nextBridge ||= 1;
let lunchState = null;
const riverY = x => 212 + 16 * Math.sin(x * .021) + 7 * Math.sin(x * .057 + 1);
const note = (c, text) => out(c.ws, { t: 'note', text });
// árvores derrubadas: id -> hora em que voltam a crescer (5 min)
// árvores cortadas NÃO nascem de novo: ficam guardadas para sempre em db.cut
const cutTrees = { has: i => cutSet().has(i), set: i => { if (!cutSet().has(i)) { db.cut.push(i); cutSet().add(i); save(); } } };
function cutSet() { if (!cutSet.s || cutSet.ref !== db.cut) { db.cut ||= []; cutSet.ref = db.cut; cutSet.s = new Set(db.cut); } return cutSet.s; }
const cutList = () => db.cut || [];
// ---- mochila: recursos e itens
const RECIPES = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'recipes.json'), 'utf8')), RBY = Object.fromEntries(RECIPES.map(r => [r.id, r]));
const WB = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(PUBLIC, 'world.json'), 'utf8')).construcoes.map(b => [b.id, b]));
function invOf(r) { if (!r.inv) { r.inv = { lenha: r.wood || 0, pedra: 0, ervas: 0 }; delete r.wood; } return r.inv; }
const sendInv = c => { const r = db.users[c.user]; if (r) out(c.ws, { t: 'inv', inv: invOf(r) }); };
function addRes(c, k, n) { const r = db.users[c.user]; if (!r) return; const inv = invOf(r); inv[k] = Math.max(0, Math.min(99999, (inv[k] || 0) + n)); save(); sendInv(c); }
function addWood(c, n) { const r = db.users[c.user]; if (!r) return; if (n > 0 && r.look && r.look.cls === 'lenhador') n *= 2; if (n > 0 && invOf(r).machado) n += 2; addRes(c, 'lenha', n); }
function pay(r, cost) { const inv = invOf(r); for (const [k, v] of Object.entries(cost)) if ((inv[k] || 0) < v) return false; for (const [k, v] of Object.entries(cost)) inv[k] -= v; return true; }
const depleted = new Map();      // id do recurso (r12 / h3) -> volta a nascer em
db.decor ||= []; db.nextDecor ||= 1;
setInterval(() => { const n = Date.now(); let ch = false; for (const [i, t] of depleted) if (t < n) { depleted.delete(i); ch = true; } if (ch) all({ t: 'nodes', dep: [...depleted.keys()] }); }, 5000).unref();

// =====================================================================
// MODERAÇÃO: filtro de palavrões, bloqueio de telefone/links, silenciar, denúncias
// =====================================================================
db.mutes ||= {}; db.reports ||= []; db.signs ||= []; db.nextSign ||= 1; db.staff ||= {}; db.castle ||= { pedra: 0, lenha: 0, by: {} };
db.giant ||= { at: Date.UTC(2026, 10, 4, 22, 0, 0), state: Date.now() < Date.UTC(2026, 10, 4, 22, 0, 0) ? 'scheduled' : 'none', damaged: [] };
const BAD = ['porra', 'caralho', 'krl', 'crl', 'merda', 'puta', 'puto', 'putaria', 'putinha', 'buceta', 'boceta', 'bct', 'foder', 'foda', 'fodase', 'fudido', 'fdp', 'pqp', 'vsf', 'vtnc', 'tnc', 'arrombado', 'arrombada',
  'viado', 'viadinho', 'traveco', 'sapatao', 'corno', 'cuzao', 'cuzinho', 'desgracado', 'desgracada', 'piroca', 'xoxota', 'xereca', 'xota', 'punheta', 'siririca', 'gozar', 'gozei', 'porno', 'nude', 'nudes',
  'otario', 'otaria', 'retardado', 'retardada', 'mongol', 'babaca', 'escroto', 'escrota', 'vagabundo', 'vagabunda', 'piranha', 'vadia', 'estupro', 'estuprar', 'nazista', 'hitler', 'suicidio', 'penis', 'vagina', 'sexo', 'transar', 'safada', 'safado', 'cacete', 'kct', 'bosta'];
const BAD_EXACT = new Set(['cu', 'cus', 'fds', 'vtc', 'cuu', 'krlh', 'pnc', 'bicha', 'bichas', 'rola', 'pinto', 'macaca', 'pau no cu', 'gozo']);
const normWord = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4@]/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't').replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
const BAD_N = [...new Set(BAD.map(normWord))], BAD_EXACT_N = new Set([...BAD_EXACT].map(normWord));
function censor(text) {
  let t = text
    .replace(/(?:\+?\d[\s.\-()]*){8,}/g, m => '*'.repeat(Math.min(10, m.trim().length)) + (/\s$/.test(m) ? ' ' : ''))                                   // telefones
    .replace(/\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:com|net|org|br|io|gg|me|xyz|ly)(?:\.br)?(?=$|[\s\/?!,;:)])(?:\/\S*)?/gi, '[link]')             // links
    .replace(/\S+@\S+\.\S+/g, '[email]');
  let bad = false;
  t = t.split(/(\s+)/).map(w => { if (/^\s+$/.test(w)) return w; const n = normWord(w); if (!n) return w;
    if (BAD_EXACT_N.has(n) || BAD_N.some(b => n === b || (b.length >= 4 && n.startsWith(b)) || (b.length >= 6 && n.includes(b)))) { bad = true; return '*'.repeat(Math.max(3, Math.min(8, w.length))); } return w; }).join('');
  return { text: t, bad };
}
const mutedFor = u => { const until = db.mutes[u] || 0; if (until && until < Date.now()) { delete db.mutes[u]; return 0; } return until; };
function mute(u, minutes, why) { db.mutes[u] = Date.now() + minutes * 60000; save(); for (const c of clients) if (c.user === u) note(c, `Você foi silenciado por ${minutes} min${why ? ' (' + why + ')' : ''}. Seja gentil em Eryon!`); }

// =====================================================================
// PROGRESSO: XP, nível, missões do dia e conquistas
// =====================================================================
const BALLOON_LV = 8;
const MISSIONS = [
  { id: 'cut', text: 'Derrube 5 árvores', n: 5, xp: 40, rew: { lenha: 6 } },
  { id: 'mine', text: 'Quebre 4 pedras', n: 4, xp: 40, rew: { pedra: 4 } },
  { id: 'herb', text: 'Colha ervas 4 vezes', n: 4, xp: 35, rew: { ervas: 4 } },
  { id: 'craft', text: 'Crie 2 itens', n: 2, xp: 50, rew: { lenha: 4, pedra: 2 } },
  { id: 'chat', text: 'Mande 3 mensagens no chat', n: 3, xp: 20, rew: { ervas: 2 } },
  { id: 'split', text: 'Rache lenha 5 vezes', n: 5, xp: 30, rew: { lenha: 5 } },
  { id: 'place', text: 'Construa ou coloque 1 coisa', n: 1, xp: 45, rew: { pedra: 3 } },
  { id: 'give', text: 'Dê um item para alguém', n: 1, xp: 40, rew: { ervas: 3 } },
  { id: 'visit', text: 'Visite 2 lugares do mapa', n: 2, xp: 45, rew: { lenha: 3, pedra: 3 } },
  { id: 'eat', text: 'Coma ou beba algo', n: 1, xp: 20, rew: { ervas: 2 } },
  { id: 'castle', text: 'Leve 10 pedras para o castelo', n: 10, xp: 50, rew: { lenha: 5 } },
  { id: 'fruit', text: 'Colha frutas 4 vezes', n: 4, xp: 30, rew: { moedas: 5 } },
  { id: 'sell', text: 'Venda 5 coisas (mercador ou barraca)', n: 5, xp: 45, rew: { moedas: 8 } },
  { id: 'farm', text: 'Recolha 2 produtos dos seus animais', n: 2, xp: 45, rew: { moedas: 6 } },
];
const ACH = {
  primeira_arvore: { name: 'Primeiro tronco', desc: 'Derrube sua primeira árvore', test: r => (r.tot.cut || 0) >= 1 },
  lenhador: { coins: 60, name: 'Lenhador de verdade', desc: 'Derrube 100 árvores', test: r => (r.tot.cut || 0) >= 100 },
  minerador: { coins: 50, name: 'Mão de pedra', desc: 'Quebre 50 pedras', test: r => (r.tot.mine || 0) >= 50 },
  artesao: { name: 'Artesão', desc: 'Crie 20 itens', test: r => (r.tot.craft || 0) >= 20 },
  construtor: { name: 'Primeiro teto', desc: 'Faça sua primeira construção', test: r => (r.tot.build || 0) >= 1 },
  arquiteto: { coins: 60, name: 'Arquiteto', desc: 'Faça 5 construções', test: r => (r.tot.build || 0) >= 5 },
  explorador: { coins: 40, name: 'Explorador', desc: 'Descubra 8 lugares secretos', test: r => (r.found || []).length >= 8 },
  desbravador: { coins: 100, name: 'Desbravador', desc: 'Descubra todos os 15 lugares', test: r => (r.found || []).length >= 15 },
  social: { name: 'Boa prosa', desc: 'Mande 50 mensagens', test: r => (r.tot.chat || 0) >= 50 },
  generoso: { coins: 40, name: 'Coração de ouro', desc: 'Dê 10 itens', test: r => (r.tot.give || 0) >= 10 },
  pedreiro: { coins: 40, name: 'Pedreiro do Rei', desc: 'Leve 100 blocos para o castelo', test: r => (r.tot.castle || 0) >= 100 },
  mestre_obras: { coins: 100, name: 'Mestre de Obras', desc: 'Leve 500 blocos para o castelo', test: r => (r.tot.castle || 0) >= 500 },
  fazendeiro: { coins: 50, name: 'Fazendeiro', desc: 'Recolha 30 produtos dos animais', test: r => (r.tot.farm || 0) >= 30 },
  comerciante: { coins: 50, name: 'Comerciante', desc: 'Ganhe 200 moedas vendendo', test: r => (r.tot.earn || 0) >= 200 },
  feirante: { coins: 50, name: 'Feirante', desc: 'Venda 20 coisas na sua barraca', test: r => (r.tot.stall || 0) >= 20 },
  matador: { coins: 100, name: 'Matador de Gigantes', desc: 'Ajude Eryon a derrotar o Gigante de Pedra', test: r => (r.tot.giant || 0) >= 1 },
  dedicado: { coins: 60, name: 'Dedicado', desc: 'Complete 10 missões', test: r => (r.tot.missions || 0) >= 10 },
  nivel5: { coins: 50, name: 'Veterano', desc: 'Chegue ao nível 5', test: r => levelOf(r.xp || 0) >= 5 },
  balonista: { coins: 80, name: 'Balonista', desc: `Chegue ao nível ${BALLOON_LV} e ganhe um balão`, test: r => levelOf(r.xp || 0) >= BALLOON_LV },
  nivel10: { coins: 150, name: 'Lenda de Eryon', desc: 'Chegue ao nível 10', test: r => levelOf(r.xp || 0) >= 10 },
};
const levelOf = xp => Math.floor(Math.sqrt(xp / 40)) + 1, xpFor = lv => (lv - 1) * (lv - 1) * 40;
const today = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);   // dia no horário de Brasília
function missionsFor(u, d) { const h = crypto.createHash('sha256').update(u + ':' + d).digest(), idx = [], pool = MISSIONS.map((_, i) => i); for (let i = 0; idx.length < 3; i++) idx.push(pool.splice(h[i] % pool.length, 1)[0]); return idx.map(i => MISSIONS[i]); }
function dailyOf(r, u) { const d = today(); if (!r.daily || r.daily.d !== d) r.daily = { d, c: {}, done: [] }; return r.daily; }
function progOf(r, u) { const dl = dailyOf(r, u), xp = r.xp || 0, lv = levelOf(xp);
  return { xp, lv, balloonLv: BALLOON_LV, cur: xpFor(lv), next: xpFor(lv + 1), missions: missionsFor(u, dl.d).map(m => ({ id: m.id, text: m.text, n: m.n, have: Math.min(m.n, dl.c[m.id] || 0), done: dl.done.includes(m.id), xp: m.xp, rew: m.rew })), ach: r.ach || [], achAll: Object.entries(ACH).map(([id, a]) => ({ id, name: a.name, desc: a.desc })) }; }
const sendProg = c => { const r = db.users[c.user]; if (r) out(c.ws, { t: 'prog', ...progOf(r, c.user) }); };
function addXp(c, n) { const r = db.users[c.user]; if (!r) return; const before = levelOf(r.xp || 0); r.xp = (r.xp || 0) + n; const after = levelOf(r.xp);
  if (after > before) { const coins = after * 10, iv = invOf(r); iv.moedas = (iv.moedas || 0) + coins; sendInv(c); all({ t: 'chat', id: c.id, username: c.user, text: `subiu para o nível ${after}!` + (after >= BALLOON_LV && before < BALLOON_LV ? ' Ganhou um BALÃO!' : ''), ts: Date.now() }); out(c.ws, { t: 'levelup', lv: after, coins, balloon: after >= BALLOON_LV && before < BALLOON_LV }); all({ t: 'lv', id: c.id, lv: after }); } }
function track(c, kind, n = 1) {
  const r = db.users[c.user]; if (!r) return; r.tot ||= {}; r.tot[kind] = (r.tot[kind] || 0) + n;
  const dl = dailyOf(r, c.user); dl.c[kind] = (dl.c[kind] || 0) + n;
  const xpBase = { cut: 3, mine: 3, herb: 2, craft: 6, build: 25, place: 4, split: 1, give: 5, chat: 0, visit: 5, eat: 1, castle: 1, fruit: 2, sell: 2, farm: 4 }[kind] || 0; if (xpBase) addXp(c, xpBase * n);
  for (const m of missionsFor(c.user, dl.d)) if (m.id === kind && !dl.done.includes(m.id) && dl.c[kind] >= m.n) {
    dl.done.push(m.id); r.tot.missions = (r.tot.missions || 0) + 1; const inv = invOf(r), rew = { ...m.rew, moedas: (m.rew.moedas || 0) + Math.round(m.xp / 5) }; for (const [k, v] of Object.entries(rew)) inv[k] = (inv[k] || 0) + v; addXp(c, m.xp);
    out(c.ws, { t: 'mission', text: m.text, xp: m.xp, rew }); sendInv(c);
    if (dl.done.length === 3) { addXp(c, 60); inv.moedas = (inv.moedas || 0) + 15; out(c.ws, { t: 'mission', text: 'Todas as missões do dia!', xp: 60, rew: { moedas: 15 } }); sendInv(c); }
  }
  r.ach ||= []; for (const [id, a] of Object.entries(ACH)) if (!r.ach.includes(id) && a.test(r)) { r.ach.push(id); const coins = a.coins || 20, iv = invOf(r); iv.moedas = (iv.moedas || 0) + coins; sendInv(c); out(c.ws, { t: 'ach', id, name: a.name, desc: a.desc, coins }); all({ t: 'chat', id: c.id, username: c.user, text: `ganhou a conquista "${a.name}"!`, ts: Date.now() }, c); }
  save(); sendProg(c);
}
const LM_POS = { mao: [1604, 672], vulcao: [1900, 1300], arco: [1880, 2030], costela: [170, 1060], ruinas: [520, 400], torre: [290, 118], caverna: [92, 812], buraco: [575, 1110], circulo: [610, 880], arvore: [110, 340], poco: [630, 120], lago: [1090, 668], gigante: [1260, 372], acampamento: [232, 1560], cristais: [468, 1930], cemiterio: [636, 2232], portal: [1220, 1522], ninho: [1124, 2080] };

// =====================================================================
// CASTELO DE ERYON: obra da comunidade inteira, em 7 etapas
// =====================================================================
const CASTLE_SPOT = [540, 1458];
const STAGES = (() => { let p = 0, l = 0; return [
  { id: 'fundacao', name: 'Fundação', pedra: 150, lenha: 0 }, { id: 'muralha', name: 'Muralha da frente', pedra: 300, lenha: 0 }, { id: 'laterais', name: 'Muralhas laterais', pedra: 300, lenha: 0 },
  { id: 'torres', name: 'Torres dos cantos', pedra: 400, lenha: 0 }, { id: 'portao', name: 'Portão', pedra: 200, lenha: 100 }, { id: 'torre', name: 'Torre do Rei', pedra: 500, lenha: 0 },
  { id: 'telhados', name: 'Telhados e bandeiras', pedra: 250, lenha: 150 }].map(st => { const o = { ...st, p0: p, l0: l }; p += st.pedra; l += st.lenha; return o; }); })();
const stageIdx = () => { for (let i = 0; i < STAGES.length; i++) { const st = STAGES[i]; if (db.castle.pedra < st.p0 + st.pedra || db.castle.lenha < st.l0 + st.lenha) return i; } return STAGES.length; };
const castleActive = new Map();   // @ -> último trabalho na obra
const markBuilder = u => castleActive.set(u, Date.now());
let lastBuildersMsg = '';
setInterval(() => { if (!clients.size) return; const sup = (db.supList || []).filter(u => db.users[u] && db.users[u].sup).slice(0, 3); all({ t: 'supnudge', supporters: sup }); }, 14 * 60000).unref();
setInterval(() => { const now = Date.now(), online = new Set([...clients].map(c => c.user)), list = [...castleActive].filter(([u, t]) => now - t < 4 * 60000 && online.has(u)).sort((a, b) => b[1] - a[1]).map(([u]) => u);
  for (const [u, t] of castleActive) if (now - t > 10 * 60000) castleActive.delete(u);
  if (!list.length || stageIdx() >= STAGES.length) return; const key = list.join(','); if (key === lastBuildersMsg && Math.random() < .5) return; lastBuildersMsg = key;
  all({ t: 'builders', list: list.slice(0, 6), more: Math.max(0, list.length - 6) }); }, 90000).unref();
const castleState = (extra = {}) => ({ t: 'castle', pedra: db.castle.pedra, lenha: db.castle.lenha, stages: STAGES, top: Object.entries(db.castle.by).sort((a, b) => b[1] - a[1]).slice(0, 5), ...extra });

// =====================================================================
// ECONOMIA: moedas, Mercador da Praça da Feira, barracas dos jogadores e animais com dono
// =====================================================================
const GOODS = { frutas: { name: 'Frutas', buy: 1 }, leite: { name: 'Leite', buy: 3 }, ovos: { name: 'Ovos', buy: 2 }, trufas: { name: 'Trufas', buy: 6 }, lenha: { name: 'Lenha' }, pedra: { name: 'Pedra' }, ervas: { name: 'Ervas' } };
const ANIMALS = { vaca: { name: 'Vaca', price: 30, prod: 'leite', n: 2, every: 5 * 60000 }, porco: { name: 'Porco', price: 18, prod: 'trufas', n: 1, every: 6 * 60000 }, galinha: { name: 'Galinha', price: 8, prod: 'ovos', n: 2, every: 4 * 60000 } };
const MERCHANT = [640, 650];
const MERCH_SHOP = { frutas: 2, faca: 12, facao: 20, machado: 30, picareta: 30 };
const nearPt = (c, X, Y, d) => !c.room && Math.hypot(c.x - X, c.y - Y) <= d;
const sellable = k => !!(GOODS[k] || ANIMALS[k] || (RBY[k] && RBY[k].type !== 'tool'));
const goodName = k => (GOODS[k] || ANIMALS[k] || RBY[k] || { name: k }).name;
db.animals ||= []; db.nextAnimal ||= 1;
const pubAnimals = () => db.animals.map(a => ({ id: a.id, kind: a.kind, x: a.x, y: a.y, owner: a.owner, ready: Date.now() - (a.lastProd || 0) >= ANIMALS[a.kind].every, left: Math.max(0, ANIMALS[a.kind].every - (Date.now() - (a.lastProd || 0))) }));
function earn(u, n) { const r = db.users[u]; if (!r) return; const inv = invOf(r); inv.moedas = (inv.moedas || 0) + n; r.tot ||= {}; r.tot.earn = (r.tot.earn || 0) + n; for (const c of clients) if (c.user === u) { sendInv(c); } }

// =====================================================================
// EVENTO: O GIGANTE DE PEDRA ataca Eryon. Danifica a cidade (temporário: nada é apagado);
// a comunidade luta com armas, raios e catapultas.
// =====================================================================
const GIANT_PATH = [[1250, 392], [1150, 470], [1000, 540], [860, 580], [720, 606], [600, 628], [480, 640]];
const GIANT_SPEED = Number(process.env.GIANT_SPEED) || 9, GIANT_CITY_R = 235, G_DAMAGE_TOTAL = 100;
const BASE_BUILDINGS = ['casa_1', 'casa_2', 'casa_3', 'casa_4', 'casa_5', 'casa_6', 'casa_7', 'casa_8', 'casa_9', 'taverna', 'forja', 'cozinha', 'enfermaria', 'armazem'];
let G = null;
function giantBuildings() { const L = BASE_BUILDINGS.filter(id => WB[id]).map(id => ({ id, x: WB[id].x, y: WB[id].y })); for (const h of db.houses) L.push({ id: 'h_' + h.id, x: h.x, y: h.y }); return L; }
const giantPub = () => ({ at: db.giant.at, state: db.giant.state, result: db.giant.result || '', damaged: db.giant.damaged || [], burned: db.giant.burned || [], rebuild: db.giant.rebuild || {}, live: G ? { kind: G.kind || 'pedra', alt: G.alt || 0, x: Math.round(G.x), y: Math.round(G.y), hp: Math.ceil(G.hp), max: G.max, city: G.city, phase: G.phase, face: G.face, engaged: G.engaged } : null });
const DRAGAO_ONCE = 'dragao-2026-11-04', FERA_ONCE = 'fera-2026-11-04', FERA_UNTIL = Date.UTC(2026, 10, 5, 2, 59, 0), BOOT_T = Date.now();
const GSPD = () => GIANT_SPEED * (G && G.kind === 'fogo' ? 1.4 : G && G.kind === 'dragao' ? 3 : 1);
const REBUILD_NEED = 3;   // contribuições (3 lenhas + 2 pedras cada) para reconstruir uma casa queimada
const GNAME = k => k === 'fogo' ? 'a Fera de Fogo' : k === 'dragao' ? 'o Dragão' : 'o gigante';
function startGiant(kind = 'pedra') {
  const online = clients.size, fogo = kind === 'fogo', n1 = Math.max(1, online), max = Number(process.env.GIANT_HP) || Math.min(60000, kind === 'dragao' ? 8000 + 1800 * n1 : fogo ? 4000 + 1100 * n1 : 4500 + 1200 * n1);
  // se já havia um ataque do gigante agendado, guarda o horário para voltar depois desta batalha
  const resume = db.giant.state === 'scheduled' && db.giant.at > Date.now() ? db.giant.at : 0;
  G = { kind, alt: kind === 'dragao' ? 1 : 0, resume, t0: Date.now(), x: GIANT_PATH[0][0], y: GIANT_PATH[0][1], seg: 0, hp: max, max, city: G_DAMAGE_TOTAL, phase: 'walk', face: -1, dmg: {}, lastStomp: 0, target: null, catCd: {}, engaged: false, lastGuard: 0 };
  db.giant.state = 'battle'; db.giant.damaged = []; save();
  all({ t: 'announce', from: 'ALERTA DE ERYON', text: kind === 'dragao' ? 'O DRAGÃO NEGRO APARECEU NO CÉU! Ele cospe fogo e queima as casas. Defendam Eryon!' : fogo ? 'UMA FERA DE FOGO APARECEU! Ela vem do leste queimando tudo. Defendam Eryon!' : 'O GIGANTE DE PEDRA ACORDOU! Ele está vindo do leste. Defendam Eryon!' });
  const msg = { t: 'chat', id: 0, username: 'Eryon', text: kind === 'dragao' ? 'O Dragão Negro voa para a vila! Arcos, raios e catapultas acertam ele no ar; espadas só quando ele descer para cuspir fogo!' : fogo ? 'A Fera de Fogo saiu do vulcão e corre para a vila! Peguem armas, usem as catapultas!' : 'O Gigante de Pedra acordou e marcha para a vila! Peguem armas, usem as catapultas!', ts: Date.now(), badge: 'criador' }; chatLog.push(msg); all(msg);
  all({ t: 'giant', ...giantPub(), start: true });
}
function endGiant(won) {
  if (!G) return; const top = Object.entries(G.dmg).sort((a, b) => b[1] - a[1]);
  for (const [u, d] of top) { const r = db.users[u]; if (!r) continue; const coins = won ? 20 + Math.min(100, Math.round(d / 2)) : 5 + Math.min(30, Math.round(d / 5)); const inv = invOf(r); inv.moedas = (inv.moedas || 0) + coins;
    r.tot ||= {}; if (won) r.tot.giant = (r.tot.giant || 0) + 1; for (const c of clients) if (c.user === u) { sendInv(c); note(c, `Você ganhou ${coins} moedas pela batalha contra ${GNAME(G.kind)}!`); addXp(c, won ? 60 : 20); track(c, 'giantfight'); } }
  db.giant.state = 'done'; db.giant.result = won ? 'won' : 'lost'; db.giant.endedAt = Date.now(); if (won) db.giant.damaged = [];
  if (G.resume && G.resume > Date.now()) { db.giant.state = 'scheduled'; db.giant.at = G.resume; } save();
  const best = top.slice(0, 3).map(([u, d], i) => `${i + 1}º @${u} (${Math.round(d)})`).join(', ');
  const fogo = G.kind === 'fogo', drg = G.kind === 'dragao', txt = won ? `ERYON VENCEU ${drg ? 'O DRAGÃO NEGRO' : fogo ? 'A FERA DE FOGO' : 'O GIGANTE'}! A cidade foi salva!${best ? ' Heróis: ' + best : ''}` : drg ? 'O Dragão queimou a cidade e voou para longe... As casas queimadas precisam ser reconstruídas!' : fogo ? 'A Fera de Fogo queimou a cidade e voltou para o vulcão... As casas queimadas precisam ser reconstruídas!' : 'O gigante danificou a cidade e voltou para as montanhas... Vamos reconstruir juntos!';
  all({ t: 'announce', from: 'ALERTA DE ERYON', text: txt }); const msg = { t: 'chat', id: 0, username: 'Eryon', text: txt, ts: Date.now(), badge: 'criador' }; chatLog.push(msg); all(msg);
  G = null; all({ t: 'giant', ...giantPub(), end: won ? 'won' : 'lost' });
}
// DRAGÃO NEGRO: voa direto (passa por cima de tudo), mergulha em cada casa, cospe fogo e ela fica queimada até reconstruírem
function dragonTick(now) {
  const sp = GSPD() * .5, fly = (tx, ty, k = 1) => { const dx = tx - G.x, dy = ty - G.y, d = Math.hypot(dx, dy); if (d > 2) { const st = Math.min(d, sp * k); G.x += dx / d * st; G.y += dy / d * st; if (Math.abs(dx) > 1) G.face = dx < 0 ? -1 : 1; } return d; };
  if (G.phase === 'walk') { G.alt = 1; if (fly(360, 640) < GIANT_CITY_R) G.phase = 'stomp'; return; }
  const gone = new Set([...db.giant.damaged, ...db.giant.burned]), B2 = giantBuildings().filter(b => !gone.has(b.id));
  if (!G.target || gone.has(G.target.id)) { G.target = B2.sort((a, b) => Math.hypot(a.x - G.x, a.y - G.y) - Math.hypot(b.x - G.x, b.y - G.y))[0] || null; G.breathAt = 0; if (G.target) G.side = G.x >= G.target.x ? 1 : -1; }
  if (!G.target) { G.alt = 1; G.city = Math.max(0, G.city - 4); fly(360 + Math.cos(now / 4000) * 120, 640 + Math.sin(now / 4000) * 90); return; }
  // chega por cima, desce, cospe fogo por ~2,5 s e a casa queima
  const d = fly(G.target.x + (G.side || 1) * 34, G.target.y + 6, .9); if (d < 10) G.face = G.side > 0 ? -1 : 1;
  if (d < 10) { G.alt = Math.max(.25, G.alt - .3); if (!G.breathAt) { G.breathAt = now; all({ t: 'dragonFire', x: Math.round(G.x), y: Math.round(G.y), tx: G.target.x, ty: G.target.y, face: G.face }); }
    for (const c of clients) if (!c.room && !c.fly && Math.hypot(c.x - G.target.x, c.y - G.target.y) < 46 && now - (c.lastBurn || 0) > 2500) { c.lastBurn = now; out(c.ws, { t: 'stunned', ms: 1600 }); }
    if (now - G.breathAt > 2600) { db.giant.burned.push(G.target.id); G.city = Math.max(0, G.city - 8); save(); all({ t: 'giantSmash', id: G.target.id, x: G.target.x, y: G.target.y, fire: 1 }); G.target = null; G.alt = .6; } }
  else G.alt = Math.min(1, G.alt + .15);
}
function catAuto(now) { if (!G || G.phase === 'leave') return; for (const d of db.decor) if (d.kind === 'catapulta' && Math.hypot(d.x - G.x, d.y - G.y) < 280 && now - (G.catCd[d.id] || 0) > 7000) { G.catCd[d.id] = now; all({ t: 'catShot', id: d.id, x: d.x, y: d.y, tx: Math.round(G.x), ty: Math.round(G.y) }); setTimeout(() => hurtGiant(null, 18, 'cat'), 800); } }
function guardsHit(now) { if (!G || G.phase === 'leave' || now - G.lastGuard < 2000) return; { const n = db.decor.filter(d => d.kind === 'posto_guarda' && Math.hypot(d.x - G.x, d.y - G.y) < 300).length; if (n) { G.lastGuard = now; return hurtGiant(null, Math.min(60, 3 + 2 * n), 'guard'); } } const nearVila = Math.hypot(G.x - 360, G.y - 640) < 330, nearCastelo = Math.hypot(G.x - 540, G.y - 1420) < 260; if (!nearVila && !nearCastelo) return; G.lastGuard = now; hurtGiant(null, 3, 'guard'); }
function hurtGiant(c, d, kind) { if (!G || d <= 0 || G.phase === 'leave') return;
  if (c && !G.engaged) { G.engaged = true; all({ t: 'announce', from: 'ALERTA DE ERYON', text: `@${c.user} atacou ${GNAME(G.kind)}! Agora ${G.kind === 'fogo' ? 'ela' : 'ele'} vai lutar até o fim!` }); }
  G.hp -= d; if (c) G.dmg[c.user] = (G.dmg[c.user] || 0) + d; all({ t: 'giantHit', id: c ? c.id : 0, d: Math.round(d), kind }); if (G.hp <= 0) endGiant(true); }
setInterval(() => {
  const now = Date.now();
  if (db.giant && db.giant.state === 'scheduled' && db.giant.at && now >= db.giant.at) startGiant();
  if (db.king && db.kingAnnounced !== db.king && now - BOOT_T > 20000 && clients.size) { db.kingAnnounced = db.king; save(); all({ t: 'king', username: db.king, crowned: true }); all({ t: 'announce', from: '👑 REINO DE ERYON', text: `@${db.king} foi coroado REI DO CASTELO DE ERYON! Vida longa ao Rei!` }); const km = { t: 'chat', id: 0, username: 'Eryon', text: `👑 @${db.king} agora é o Rei do Castelo de Eryon!`, ts: Date.now(), badge: 'criador' }; chatLog.push(km); all(km); }
  // lançamento único da Fera de Fogo pedido para hoje: entra 90 s depois do servidor ligar (só uma vez, até 23:59 de Brasília)
  if (!G && db.fireOnce !== DRAGAO_ONCE && now < FERA_UNTIL && now - BOOT_T > (Number(process.env.FERA_DELAY) || 90000) && db.giant.state !== 'battle') { db.fireOnce = DRAGAO_ONCE; save(); startGiant('dragao'); }
  if (db.giant && db.giant.state === 'done' && db.giant.result === 'lost' && db.giant.damaged.length && now - (db.giant.endedAt || 0) > 12 * 3600e3) { db.giant.damaged = []; save(); all({ t: 'giant', ...giantPub() }); }
  if (!G) return;
  // ninguém lutou: depois de destruir, ele vai embora andando para o leste
  if (G.phase === 'leave') { G.alt = 1; const dx = 1400 - G.x, dy = 300 - G.y, d = Math.hypot(dx, dy); G.x += dx / d * GSPD() * 1.2; G.y += dy / d * GSPD() * 1.2; G.face = 1; if (G.x > 980 || now - G.leaveT > 40000) return endGiant(false); all({ t: 'giant', ...giantPub() }); return; }
  // cidade destruída: se houve batalha ele parte para cima dos jogadores (luta até morrer); senão vai embora
  if (G.city <= 0 && G.phase !== 'fight') { if (G.engaged) { G.phase = 'fight'; all({ t: 'announce', from: 'ALERTA DE ERYON', text: G.kind === 'dragao' ? 'O Dragão está furioso e vai lutar até o fim! Não desistam!' : G.kind === 'fogo' ? 'A Fera de Fogo está furiosa e vai lutar até o fim! Não desistam!' : 'O gigante está furioso e vai lutar até o fim! Não desistam!' }); } else { G.phase = 'leave'; G.leaveT = now; all({ t: 'announce', from: 'ALERTA DE ERYON', text: G.kind === 'dragao' ? 'Ninguém enfrentou o Dragão... ele queimou a cidade e está voando para longe.' : G.kind === 'fogo' ? 'Ninguém enfrentou a Fera de Fogo... ela queimou a cidade e está indo embora.' : 'Ninguém enfrentou o gigante... ele destruiu a cidade e está indo embora.' }); return; } }
  if (G.phase === 'fight') { let best = null, bd = 420; for (const c of clients) { if (c.room || c.fly) continue; const d = Math.hypot(c.x - G.x, c.y - G.y); if (d < bd) { bd = d; best = c; } }
    if (best) { const dx = best.x - G.x, dy = best.y - G.y; if (bd > 30) { G.x += dx / bd * GSPD() * .7; G.y += dy / bd * GSPD() * .7; G.face = dx < 0 ? -1 : 1; }
      if (G.kind === 'dragao') G.alt = bd < 60 ? .3 : .8; if (now - G.lastStomp > 2600) { G.lastStomp = now; if (G.kind === 'dragao') all({ t: 'dragonFire', x: Math.round(G.x), y: Math.round(G.y), tx: Math.round(best.x), ty: Math.round(best.y), face: G.face }); all({ t: 'giantSmash', id: '', x: Math.round(G.x), y: Math.round(G.y), fire: G.kind !== 'pedra' ? 1 : 0 }); for (const c of clients) if (!c.room && !c.fly && Math.hypot(c.x - G.x, c.y - G.y) < 48) out(c.ws, { t: 'stunned', ms: 2200 }); } }
    guardsHit(now); catAuto(now); if (G) all({ t: 'giant', ...giantPub() }); return; }
  if (G.kind === 'dragao') { dragonTick(now); guardsHit(now); catAuto(now); if (G && !G.engaged && now - G.t0 > 25 * 60000) { G.phase = 'leave'; G.leaveT = now; } if (G) all({ t: 'giant', ...giantPub() }); return; }
  // anda pelo caminho até a cidade; lá dentro, pisa nas construções
  const dc = Math.hypot(G.x - 360, (G.y - 640) / .95);
  if (G.phase === 'walk') { const tgt = GIANT_PATH[Math.min(G.seg + 1, GIANT_PATH.length - 1)], dx = tgt[0] - G.x, dy = tgt[1] - G.y, d = Math.hypot(dx, dy);
    if (d < 3) { if (G.seg < GIANT_PATH.length - 2) G.seg++; } else { const st = Math.min(d, GSPD() * .5); G.x += dx / d * st; G.y += dy / d * st; G.face = dx < 0 ? -1 : 1; }
    if (dc < GIANT_CITY_R) G.phase = 'stomp'; }
  else { const dmg = new Set([...db.giant.damaged, ...db.giant.burned]), B2 = giantBuildings().filter(b => !dmg.has(b.id));
    if (!G.target || dmg.has(G.target.id)) G.target = B2.sort((a, b) => Math.hypot(a.x - G.x, a.y - G.y) - Math.hypot(b.x - G.x, b.y - G.y))[0] || null;
    if (G.target) { const dx = G.target.x - G.x, dy = G.target.y + 4 - G.y, d = Math.hypot(dx, dy);
      if (d > 22) { const st = Math.min(d - 20, GSPD() * .5); G.x += dx / d * st; G.y += dy / d * st; G.face = dx < 0 ? -1 : 1; }
      else if (now - G.lastStomp > 2400) { G.lastStomp = now; (G.kind === 'fogo' ? db.giant.burned : db.giant.damaged).push(G.target.id); G.city = Math.max(0, G.city - 6); save(); all({ t: 'giantSmash', id: G.target.id, x: G.target.x, y: G.target.y }); for (const c of clients) if (!c.room && !c.fly && Math.hypot(c.x - G.x, c.y - G.y) < 40) out(c.ws, { t: 'stunned', ms: 1800 }); G.target = null; } }
    else if (now - G.lastStomp > 2400) { G.lastStomp = now; G.city = Math.max(0, G.city - 8); all({ t: 'giantSmash', id: '', x: Math.round(G.x), y: Math.round(G.y) }); } }
  guardsHit(now);
  // catapultas atiram sozinhas quando o gigante está no alcance
  catAuto(now);
  if (G && !G.engaged && now - G.t0 > 25 * 60000) { G.phase = 'leave'; G.leaveT = now; }
  if (G) all({ t: 'giant', ...giantPub() });
}, 500).unref();

// =====================================================================
// APOIADORES, BICHINHOS, CRIADOR e PLACAS PATROCINADAS
// =====================================================================
const PETS = new Set(['gato', 'raposa', 'dragao', 'coruja']);
const SUPPORT_URL = process.env.SUPPORT_URL || '', PIX_KEY = process.env.PIX_KEY || '992b99c7-65ad-426d-88bc-811003a069c2';   // chave Pix do criador (pode trocar no /admin)
const CREATORS = new Set((process.env.CREATOR || '').split(/[\s,;]+/).map(norm).filter(Boolean));
const isStaff = u => !!db.staff[u] || CREATORS.has(u);
// selo assinado: fica guardado no aparelho e volta mesmo se o servidor perder a memória
const perkSig = (u, k) => crypto.createHmac('sha256', SECRET || 'eryon').update('perk:' + k + ':' + u).digest('hex').slice(0, 24);
const perkFor = u => { const r = db.users[u] || {}; return { u, sup: r.sup ? perkSig(u, 'sup') : '', staff: isStaff(u) ? perkSig(u, 'staff') : '' }; };
function applyPerk(u, pk) { if (!pk || typeof pk !== 'object' || pk.u !== u) return; const r = db.users[u]; if (!r) return;
  if (!r.sup && !r.supOff && typeof pk.sup === 'string' && pk.sup && same(pk.sup, perkSig(u, 'sup'))) { r.sup = true; save(); }
  if (!db.staff[u] && typeof pk.staff === 'string' && pk.staff && same(pk.staff, perkSig(u, 'staff'))) { db.staff[u] = true; save(); } }
const badgeOf = u => { const r = db.users[u] || {}; return isStaff(u) ? 'criador' : r.sup ? 'apoiador' : ''; };

wss.on('connection', (ws, req) => {
  if (limited('ws:' + ipOf(req), 400, 60000)) { DIAG.ws429++; return ws.close(4029, 'muitas conexões'); }
  DIAG.wsOpen++; ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  let c = null;
  const timer = setTimeout(() => { if (!c) ws.close(4000, 'sem login'); }, 8000);
  ws.on('message', raw => { try { onMsg(raw); } catch (e) { console.error('[erro em mensagem]', e && e.stack || e); } });
  const onMsg = raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!c) {
      if (m.t !== 'hello') return;
      const u = userBySession(m.token); if (!u || !db.users[u] || db.users[u].removed) return ws.close(4001, 'sessão inválida');
      clearTimeout(timer);
      for (const o of clients) if (o.user === u) o.ws.close(4002, 'conectado em outro lugar');
      applyPerk(u, m.perk);
      { const r0 = db.users[u]; if (r0 && !r0.coinStart) { r0.coinStart = 1; const i0 = invOf(r0); i0.moedas = (i0.moedas || 0) + 10; save(); } }
      const rec = db.users[u];
      c = { ws, id: nextId++, user: u, x: rec.x ?? SPAWN.x + (Math.random() * 30 - 15), y: rec.y ?? SPAWN.y + (Math.random() * 10), face: 1, moving: false, lastMove: Date.now(), lastChat: 0, dirty: true };
      clients.add(c); if (clients.size > DIAG.peak) { DIAG.peak = clients.size; DIAG.peakAt = Date.now(); }
      out(ws, { t: 'welcome', id: c.id, me: pub(c), players: [...clients].filter(o => o !== c).map(pub), chat: chatLog.slice(-25), cut: cutList(), found: rec.found || [], inv: invOf(rec), dep: [...depleted.keys()], decor: db.decor, houses: db.houses, bridges: db.bridges, signs: db.signs, castle: castleState(), animals: pubAnimals(), giant: giantPub(), notice: db.notice, king: db.king || '', rgs: Object.keys(db.rguards), lunch: lunchState && lunchState.until > Date.now() ? { username: lunchState.username, left: lunchState.until - Date.now() } : null });
      all({ t: 'join', p: pub(c) }, c); sendProg(c); out(ws, { t: 'perk', perk: perkFor(u) });
      if (db.king && u === db.king && Date.now() - (kingSeenT || 0) > 10 * 60000) { kingSeenT = Date.now(); setTimeout(() => all({ t: 'announce', from: '👑 REINO DE ERYON', text: `O Rei @${u} chegou! Todos saúdem o Rei do Castelo de Eryon!` }), 1500); }
      return;
    }
    if (m.t === 'move') {
      const now = Date.now(), dt = Math.min(1, (now - c.lastMove) / 1000); c.lastMove = now;
      let nx = Number(m.x), ny = Number(m.y); if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
      if (now - (c.lastTp || 0) < 1500 && Math.hypot(nx - c.x, ny - c.y) > 60) return;   // ignora posição antiga logo depois do portal
      const room = typeof m.room === 'string' && ROOM_OK.test(m.room) ? m.room : '';
      const changed = room !== (c.room || '') && now - (c.lastRoom || 0) > 400;
      if (changed) { c.room = room; c.lastRoom = now; }
      const canHorse = c.user === db.king || !!db.rguards[c.user] || (db.users[c.user]?.look?.cls === 'guarda'); c.horse = !!m.horse && canHorse && !c.room && !m.fly;
      const max = (m.fly ? 110 : c.horse ? 115 : 70) * dt + 6, dx = nx - c.x, dy = ny - c.y, d = Math.hypot(dx, dy);
      if (!changed && d > max) { nx = c.x + dx / d * max; ny = c.y + dy / d * max; }
      c.x = Math.max(4, Math.min(WORLD.w - 4, nx)); c.y = Math.max(8, Math.min(WORLD.h - 4, ny));
      c.face = m.face < 0 ? -1 : 1; c.moving = !!m.moving; c.carry = !!m.carry; { const ru = db.users[c.user] || {}; c.fly = !!m.fly && !c.room && (levelOf(ru.xp || 0) >= BALLOON_LV || (ru.look && ru.look.cls === 'fada')); } c.dirty = true;
    } else if (m.t === 'act') {
      const now = Date.now(); if (!ACTS.has(m.kind) || now - (c.lastAct || 0) < 1500) return; c.lastAct = now;
      all({ t: 'act', id: c.id, kind: m.kind }, c);
      if (m.kind === 'eat' && lunchState && lunchState.until > now && !c.ateLunch) { c.ateLunch = lunchState.until; track(c, 'eat'); }
      if (m.kind === 'split') { addWood(c, 1); track(c, 'split'); }
    } else if (m.t === 'cut') {
      const i = Number(m.tree), now = Date.now();
      if (!Number.isInteger(i) || i < 0 || i > 20000 || cutTrees.has(i) || now - (c.lastCut || 0) < 2000) return; c.lastCut = now;
      cutTrees.set(i); all({ t: 'trees', cut: cutList() }); addWood(c, 3); track(c, 'cut');
    } else if (m.t === 'gather') {
      const now = Date.now(), id = String(m.id || ''), r = db.users[c.user];
      if (!r || !/^([rhf][0-9]{1,3}|[gamn][0-9])$/.test(id) || depleted.has(id) || now - (c.lastGather || 0) < 1500) return; c.lastGather = now;
      const stone = id[0] === 'r' || id[0] === 'g' || id[0] === 'a';
      if (id[0] === 'f') { depleted.set(id, now + 4 * 60000); all({ t: 'nodes', dep: [...depleted.keys()] }); addRes(c, 'frutas', 2 + (Math.random() < .3 ? 1 : 0) + (invOf(r).facao ? 1 : 0)); track(c, 'fruit'); return; }
      const quarry = /^r1(6\d|7[01])$/.test(id) && !c.room && c.x > 410 && c.x < 700 && c.y > 1470 && c.y < 1610;
      depleted.set(id, now + (stone ? (quarry ? 1 : 6) : 3) * 60000); all({ t: 'nodes', dep: [...depleted.keys()] });
      // pedreira do castelo: a pedra vira bloco direto na obra
      const cur = stageIdx(), st = STAGES[cur], room = st ? st.p0 + st.pedra - db.castle.pedra : 0;
      if (quarry && room > 0) { const n = Math.min(room, 3 + (invOf(r).picareta ? 1 : 0)); db.castle.pedra += n; db.castle.by[c.user] = (db.castle.by[c.user] || 0) + n; save();
        track(c, 'mine'); track(c, 'castle', n); markBuilder(c.user); all(castleState({ n, by: c.user, fx: { x: c.x, y: c.y } }));
        const after = stageIdx(); if (after > cur) { const txt = after >= STAGES.length ? 'O CASTELO DE ERYON ESTÁ PRONTO! Obrigado, comunidade!' : `O castelo ganhou: ${st.name}! Próxima etapa: ${STAGES[after].name}.`; all({ t: 'announce', text: txt }); const msg = { t: 'chat', id: 0, username: 'Castelo de Eryon', text: txt, ts: now, badge: 'criador' }; chatLog.push(msg); all(msg); }
        else if (st.l0 + st.lenha > db.castle.lenha && st.p0 + st.pedra <= db.castle.pedra) note(c, `Pedras da etapa "${st.name}" completas! Agora falta lenha: leve lenha até a obra.`);
      } else {
        if (quarry && st) note(c, `A etapa "${st.name}" precisa de lenha antes de mais pedras. A pedra foi para a sua mochila.`);
        if (stone) addRes(c, 'pedra', (id[0] === 'r' ? 2 : 3) + (invOf(r).picareta ? 1 : 0)); else addRes(c, 'ervas', (id[0] === 'h' ? 2 : 3) + (invOf(r).facao ? 1 : 0)); track(c, stone ? 'mine' : 'herb'); }
    } else if (m.t === 'discover') {
      const r = db.users[c.user], id = String(m.id || ''); if (!r || !LANDMARK_NAMES[id]) return;
      r.found ||= []; if (r.found.includes(id)) return; r.found.push(id); db.firsts ||= {};
      const first = !db.firsts[id]; if (first) db.firsts[id] = c.user; save();
      all({ t: 'chat', id: c.id, username: c.user, text: `descobriu ${LANDMARK_NAMES[id]}!` + (first ? ' (primeira pessoa de Eryon!)' : ''), ts: Date.now() });
      addXp(c, 30); track(c, 'visit');
    } else if (m.t === 'craft') {
      const rc = RBY[m.id], r = db.users[c.user], now = Date.now(); if (!rc || !r || now - (c.lastCraft || 0) < 1200) return; c.lastCraft = now;
      if (rc.cls === 'rei') { if (c.user !== db.king) return note(c, 'Só o Rei pode construir isso.'); }
      else if (rc.cls !== 'todos' && (!r.look || r.look.cls !== rc.cls)) return note(c, 'Só o ' + rc.cls + ' sabe criar isso.');
      if (rc.where) { const b = WB[rc.where === 'forja' ? 'forja' : 'cozinha']; if (c.room || !b || Math.hypot(c.x - b.x, c.y - b.y) > (rc.where === 'forja' ? 55 : 46)) return note(c, rc.where === 'forja' ? 'Vá até a forja para forjar.' : 'Vá até a cozinha para cozinhar.'); }
      if (!pay(r, rc.cost)) { sendInv(c); return note(c, 'Faltam recursos.'); }
      const inv = invOf(r); inv[rc.id] = Math.min(999, (inv[rc.id] || 0) + (rc.make || 1)); save(); sendInv(c);
      note(c, `Você criou: ${rc.name}${rc.make ? ' ×' + rc.make : ''}`); track(c, 'craft');
    } else if (m.t === 'use') {
      const rc = RBY[m.id], r = db.users[c.user]; if (!rc || !r || rc.type !== 'food' || !(invOf(r)[rc.id] > 0)) return;
      invOf(r)[rc.id]--; save(); sendInv(c); all({ t: 'act', id: c.id, kind: rc.id === 'pocao' ? 'heal' : 'drink' }, c); track(c, 'eat');
    } else if (m.t === 'equip') {
      const r = db.users[c.user]; if (!r) return; const look = r.look || (r.look = {});
      if (m.id === null) { delete look.equip; delete look.equipTool; }
      else { const rc = RBY[m.id]; if (!rc || rc.type !== 'equip' || !(invOf(r)[rc.id] > 0)) return; look.equip = rc.id; look.equipTool = rc.tool; }
      save(); all({ t: 'look', id: c.id, look });
    } else if (m.t === 'give') {
      const rc = RBY[m.id], r = db.users[c.user], to = [...clients].find(o => o.id === Number(m.to)); if (!rc || !r || !to || to === c || !(invOf(r)[rc.id] > 0)) return;
      if ((to.room || '') !== (c.room || '') || Math.hypot(to.x - c.x, to.y - c.y) > 60) return note(c, 'Chegue mais perto da pessoa.');
      const r2 = db.users[to.user]; if (!r2) return; invOf(r)[rc.id]--; const inv2 = invOf(r2); inv2[rc.id] = (inv2[rc.id] || 0) + 1;
      if (r.look && r.look.equip === rc.id && !invOf(r)[rc.id]) { delete r.look.equip; delete r.look.equipTool; all({ t: 'look', id: c.id, look: r.look }); }
      save(); sendInv(c); sendInv(to); note(to, `@${c.user} te deu: ${rc.name}`); note(c, `Você deu ${rc.name} para @${to.user}`); track(c, 'give');
    } else if (m.t === 'place') {
      const rc = RBY[m.id], r = db.users[c.user], X = Math.round(Number(m.x)), Y = Math.round(Number(m.y)); if (!rc || !r || rc.type !== 'decor' || c.room || !(invOf(r)[rc.id] > 0)) return;
      if (!Number.isFinite(X) || !Number.isFinite(Y) || X < 8 || X > WORLD.w - 8 || Y < 20 || Y > WORLD.h - 6 || Math.hypot(X - c.x, Y - c.y) > 40) return;
      { const lim = c.user === db.king ? 800 : 60; if (db.decor.filter(d => d.owner === c.user).length >= lim) return note(c, `Você já colocou ${lim} objetos. Recolha algum antes.`); }
      track(c, 'place'); invOf(r)[rc.id]--; db.decor.push({ id: db.nextDecor++, kind: rc.id, x: X, y: Y, owner: c.user, ...(m.rot ? { rot: 1 } : {}), ...(rc.id === 'pomar' ? { lastH: Date.now() } : {}) }); save(); sendInv(c); all({ t: 'decor', list: db.decor });
    } else if (m.t === 'moveDecor') {      // mudar um objeto seu de lugar (ex.: cercas, macieira)
      const d = db.decor.find(d => d.id === Number(m.id)), X = Math.round(Number(m.x)), Y = Math.round(Number(m.y)); if (!d || d.owner !== c.user || c.room) return;
      if (!Number.isFinite(X) || !Number.isFinite(Y) || X < 8 || X > WORLD.w - 8 || Y < 20 || Y > WORLD.h - 6 || Math.hypot(X - c.x, Y - c.y) > 40) return;
      d.x = X; d.y = Y; if (m.rot) d.rot = 1; else delete d.rot; save(); all({ t: 'decor', list: db.decor });
    } else if (m.t === 'pickup') {
      const i = db.decor.findIndex(d => d.id === Number(m.id)); if (i < 0) return; const d = db.decor[i], r = db.users[c.user];
      if (!r || d.owner !== c.user || Math.hypot(d.x - c.x, d.y - c.y) > 40) return;
      db.decor.splice(i, 1); const inv = invOf(r); inv[d.kind] = (inv[d.kind] || 0) + 1; for (const it of d.shop || []) inv[it.k] = (inv[it.k] || 0) + it.n; save(); sendInv(c); all({ t: 'decor', list: db.decor });
    } else if (m.t === 'bridge') {
      const now = Date.now(), r = db.users[c.user], X = Math.round(Number(m.x));
      if (!r || now - (c.lastBuild || 0) < 3000 || !Number.isFinite(X) || c.room) return; c.lastBuild = now;
      const bcost = r.look && r.look.cls === 'construtor' ? 10 : 15; if ((invOf(r).lenha || 0) < bcost) return note(c, `Você precisa de ${bcost} lenhas para construir uma ponte.`);
      if (X < 12 || X > WORLD.w - 12 || Math.abs(X - 430) < 30 || db.bridges.some(b => Math.abs(b.x - X) < 30)) return note(c, 'Já existe uma ponte perto daqui.');
      if (Math.abs(c.y - riverY(X)) > 45 || Math.abs(c.x - X) > 45) return note(c, 'Chegue mais perto do rio.');
      invOf(r).lenha -= bcost; sendInv(c);
      db.bridges.push({ id: db.nextBridge++, x: X, owner: c.user, t: now }); save();
      all({ t: 'bridges', list: db.bridges }); all({ t: 'chat', id: c.id, username: c.user, text: 'construiu uma ponte sobre o rio!', ts: now }); track(c, 'place');
    } else if (m.t === 'lunch') {
      const now = Date.now(); if (now - (c.lastLunch || 0) < 60000 || c.room) return; c.lastLunch = now;
      lunchState = { username: c.user, until: now + 120000 };
      all({ t: 'lunch', username: c.user, left: 120000 });
    } else if (m.t === 'build') {
      const now = Date.now(), r = db.users[c.user], X = Math.round(Number(m.x)), Y = Math.round(Number(m.y)), type = BT[m.type] ? m.type : 'casa';
      if (!r || now - (c.lastBuild || 0) < 3000 || !Number.isFinite(X) || !Number.isFinite(Y) || c.room) return; c.lastBuild = now;
      const cost = { ...BT[type].cost }; if (r.look && r.look.cls === 'construtor') for (const k in cost) cost[k] = Math.ceil(cost[k] * .6);
      if (BT[type].limit && db.houses.some(h => h.type === type)) return note(c, `Eryon já tem ${BT[type].name.toLowerCase()}.`);
      if (db.houses.filter(h => h.owner === c.user).length >= 5) return note(c, 'Cada morador pode ter até 5 construções.');
      if (X < 20 || X > WORLD.w - 20 || Y < 30 || Y > WORLD.h - 10 || Math.hypot(X - 360, Y - 640) < 40) return note(c, 'Não dá para construir aqui.');
      if (Math.hypot(X - c.x, Y - c.y) > 60) return note(c, 'Chegue mais perto do lugar.');
      if (db.houses.some(h => Math.abs(h.x - X) < 36 && Math.abs(h.y - Y) < 30)) return note(c, 'Muito perto de outra construção.');
      if (!pay(r, cost)) { sendInv(c); return note(c, 'Faltam recursos para ' + BT[type].name + '.'); } sendInv(c);
      db.houses.push({ id: db.nextHouse++, type, x: X, y: Y, owner: c.user, roof: crypto.randomInt(6), t: now }); save(); track(c, 'build'); track(c, 'place');
      all({ t: 'houses', list: db.houses }); all({ t: 'chat', id: c.id, username: c.user, text: type === 'casa' ? 'construiu uma casa nova em Eryon!' : `construiu ${type === 'prefeitura' ? 'a Prefeitura' : 'um(a) ' + BT[type].name} em Eryon!`, ts: now });
    } else if (m.t === 'chat') {
      const now = Date.now(); if (now - c.lastChat < 1200) return; c.lastChat = now;
      const until = mutedFor(c.user); if (until) return note(c, `Você está silenciado por mais ${Math.ceil((until - now) / 60000)} min.`);
      const raw = String(m.text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!raw) return;
      if (raw.toLowerCase() === c.lastText && now - (c.lastTextAt || 0) < 15000) return note(c, 'Mensagem repetida.'); c.lastText = raw.toLowerCase(); c.lastTextAt = now;
      const { text, bad } = censor(raw);
      if (bad) { c.strikes = (c.strikes || 0) + 1; if (c.strikes >= 3) { c.strikes = 0; mute(c.user, 10, 'palavrões'); } else note(c, 'Ops! Palavras feias viram ***. Na 3ª vez você fica 10 min sem chat.'); }
      const msg = { t: 'chat', id: c.id, username: c.user, text, ts: now, badge: badgeOf(c.user), king: !!db.king && c.user === db.king };
      chatLog.push(msg); if (chatLog.length > 60) chatLog.shift();
      (c.said ||= []).push(text); if (c.said.length > 10) c.said.shift();
      all(msg); if (!bad) track(c, 'chat');
    } else if (m.t === 'report') {
      const now = Date.now(), to = [...clients].find(o => o.id === Number(m.id)); if (!to || to === c || now - (c.lastReport || 0) < 30000) return; c.lastReport = now;
      const reason = String(m.reason || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 140);
      db.reports.push({ id: crypto.randomBytes(5).toString('hex'), by: c.user, target: to.user, reason, ts: now, said: (to.said || []).slice(-8) }); if (db.reports.length > 300) db.reports.shift();
      const recent = new Set(db.reports.filter(r => r.target === to.user && now - r.ts < 30 * 60000).map(r => r.by));
      if (recent.size >= 3 && !mutedFor(to.user)) mute(to.user, 15, 'várias denúncias');
      save(); note(c, `Obrigado! A denúncia de @${to.user} foi enviada para o criador.`);
    } else if (m.t === 'visit') {
      const id = String(m.id || ''), lp = LM_POS[id], r = db.users[c.user]; if (!lp || !r || c.room || Math.hypot(c.x - lp[0], c.y - lp[1]) > 70) return;
      const dl = dailyOf(r, c.user); dl.v ||= []; if (dl.v.includes(id)) return; dl.v.push(id); track(c, 'visit');
    } else if (m.t === 'castle') {
      const now = Date.now(), r = db.users[c.user]; if (!r || c.room || now - (c.lastCastle || 0) < 800 || Math.hypot(c.x - CASTLE_SPOT[0], c.y - CASTLE_SPOT[1]) > 60) return; c.lastCastle = now;
      const cur = stageIdx(); if (cur >= STAGES.length) return note(c, 'O castelo já está pronto!');
      const st = STAGES[cur], inv = invOf(r), int = v => Math.max(0, Math.floor(Number(v) || 0));
      const p = Math.min(int(m.pedra), 50, inv.pedra || 0, st.p0 + st.pedra - db.castle.pedra), l = Math.min(int(m.lenha), 50, inv.lenha || 0, st.l0 + st.lenha - db.castle.lenha);
      if (p + l <= 0) return note(c, st.l0 + st.lenha > db.castle.lenha && !(inv.lenha > 0) ? `A etapa "${st.name}" precisa de lenha!` : 'Traga pedras para o castelo (quebre pedras na pedreira em frente).');
      inv.pedra -= p; inv.lenha -= l; db.castle.pedra += p; db.castle.lenha += l; db.castle.by[c.user] = (db.castle.by[c.user] || 0) + p + l; save(); sendInv(c); track(c, 'castle', p + l); markBuilder(c.user);
      const after = stageIdx(); all(castleState({ n: p + l, by: c.user }));
      if (p + l >= 10) all({ t: 'chat', id: c.id, username: c.user, text: `colocou ${p + l} blocos no castelo!`, ts: now });
      if (after > cur) { const txt = after >= STAGES.length ? 'O CASTELO DE ERYON ESTÁ PRONTO! Obrigado, comunidade!' : `O castelo ganhou: ${st.name}! Próxima etapa: ${STAGES[after].name}.`; all({ t: 'announce', text: txt }); const msg = { t: 'chat', id: 0, username: 'Castelo de Eryon', text: txt, ts: now, badge: 'criador' }; chatLog.push(msg); all(msg); }
    } else if (m.t === 'harvest') {          // colher o pomar (só o dono)
      const d = db.decor.find(q => q.id === Number(m.id)), r = db.users[c.user], now = Date.now(); if (!d || !r || d.kind !== 'pomar' || d.owner !== c.user || !nearPt(c, d.x, d.y, 30)) return;
      if (now - (d.lastH || 0) < 4 * 60000) return note(c, 'As maçãs ainda estão crescendo.'); d.lastH = now; addRes(c, 'frutas', 3 + (invOf(r).faca ? 1 : 0)); track(c, 'fruit'); all({ t: 'decor', list: db.decor });
    } else if (m.t === 'merchSell') {        // vender para o Mercador
      const r = db.users[c.user], k = String(m.k || ''), inv = r && invOf(r); if (!r || !nearPt(c, MERCHANT[0], MERCHANT[1], 50)) return;
      const n = Math.max(1, Math.min(99, Math.floor(Number(m.n) || 1), inv[k] || 0)), price = GOODS[k] && GOODS[k].buy ? GOODS[k].buy : ANIMALS[k] ? Math.floor(ANIMALS[k].price / 2) : 0; if (!price || !(inv[k] >= n)) return;
      inv[k] -= n; earn(c.user, price * n); track(c, 'sell', n); note(c, `Você vendeu ${n} ${goodName(k).toLowerCase()} por ${price * n} moedas.`); sendInv(c);
    } else if (m.t === 'merchBuy') {         // comprar animal do Mercador
      const r = db.users[c.user], k = String(m.k || ''), A = ANIMALS[k], inv = r && invOf(r); if (!r || !(A || MERCH_SHOP[k]) || !nearPt(c, MERCHANT[0], MERCHANT[1], 50)) return;
      if (!A) { const n = k === 'frutas' ? Math.max(1, Math.min(50, Math.floor(Number(m.n) || 1))) : 1, cost = MERCH_SHOP[k] * n; if ((inv.moedas || 0) < cost) return note(c, `Faltam moedas (custa ${cost}).`);
        if (k !== 'frutas' && inv[k] > 0) return note(c, 'Você já tem esse item.'); inv.moedas -= cost; inv[k] = (inv[k] || 0) + n; save(); sendInv(c); note(c, `Você comprou ${n > 1 ? n + ' ' : ''}${goodName(k)}${RBY[k] && RBY[k].type === 'equip' ? '! Equipe pela Mochila.' : '!'}`); return; }
      if ((inv.moedas || 0) < A.price) return note(c, `Faltam moedas: ${A.name} custa ${A.price}.`); inv.moedas -= A.price; inv[k] = (inv[k] || 0) + 1; save(); sendInv(c); note(c, `Você comprou: ${A.name}! Abra a Mochila e toque em "Soltar" onde quiser criar.`);
    } else if (m.t === 'placeAnimal' || m.t === 'moveAnimal') {
      const r = db.users[c.user], X = Math.round(Number(m.x)), Y = Math.round(Number(m.y)); if (!r || c.room || !Number.isFinite(X) || !Number.isFinite(Y) || X < 10 || Y < 30 || X > WORLD.w - 10 || Y > WORLD.h - 10 || Math.hypot(X - c.x, Y - c.y) > 45) return;
      if (m.t === 'placeAnimal') { const k = String(m.kind || ''); if (!ANIMALS[k] || !(invOf(r)[k] > 0)) return; if (db.animals.filter(a => a.owner === c.user).length >= 12) return note(c, 'Cada morador pode ter até 12 animais.');
        invOf(r)[k]--; db.animals.push({ id: db.nextAnimal++, kind: k, x: X, y: Y, owner: c.user, lastProd: Date.now() }); sendInv(c); }
      else { const a = db.animals.find(q => q.id === Number(m.id)); if (!a || a.owner !== c.user) return; a.x = X; a.y = Y; }
      save(); all({ t: 'animals', list: pubAnimals() });
    } else if (m.t === 'animalAct') {        // recolher produto / guardar o animal (só o dono)
      const a = db.animals.find(q => q.id === Number(m.id)), r = db.users[c.user], now = Date.now(); if (!a || !r || a.owner !== c.user || !nearPt(c, a.x, a.y, 70)) return; const A = ANIMALS[a.kind];
      if (m.what === 'collect') { if (now - (a.lastProd || 0) < A.every) return note(c, `Ainda não: volte em ${Math.ceil((A.every - (now - a.lastProd)) / 60000)} min.`); a.lastProd = now; addRes(c, A.prod, A.n + (invOf(r).faca ? 1 : 0)); track(c, 'farm'); }
      else if (m.what === 'pickup') { db.animals = db.animals.filter(q => q !== a); const inv = invOf(r); inv[a.kind] = (inv[a.kind] || 0) + 1; sendInv(c); }
      save(); all({ t: 'animals', list: pubAnimals() });
    } else if (m.t === 'shopPut') {          // dono coloca à venda na barraca
      const d = db.decor.find(q => q.id === Number(m.id)), r = db.users[c.user], k = String(m.k || ''), inv = r && invOf(r); if (!d || !r || d.kind !== 'barraca' || d.owner !== c.user || !nearPt(c, d.x, d.y, 45) || !sellable(k)) return;
      const n = Math.max(1, Math.min(999, Math.floor(Number(m.n) || 1))), price = Math.max(1, Math.min(999, Math.floor(Number(m.price) || 1))); if (!(inv[k] >= n)) return note(c, 'Você não tem tudo isso na mochila.');
      d.shop ||= []; let it = d.shop.find(q => q.k === k); if (!it) { if (d.shop.length >= 6) return note(c, 'A barraca tem espaço para 6 tipos de coisa.'); it = { k, n: 0, price }; d.shop.push(it); }
      inv[k] -= n; it.n += n; it.price = price; if (r.look && r.look.equip === k && !inv[k]) { delete r.look.equip; delete r.look.equipTool; all({ t: 'look', id: c.id, look: r.look }); } save(); sendInv(c); all({ t: 'decor', list: db.decor });
    } else if (m.t === 'shopTake') {
      const d = db.decor.find(q => q.id === Number(m.id)), r = db.users[c.user]; if (!d || !r || d.kind !== 'barraca' || d.owner !== c.user || !nearPt(c, d.x, d.y, 45)) return;
      const i = (d.shop || []).findIndex(q => q.k === m.k); if (i < 0) return; const it = d.shop.splice(i, 1)[0], inv = invOf(r); inv[it.k] = (inv[it.k] || 0) + it.n; save(); sendInv(c); all({ t: 'decor', list: db.decor });
    } else if (m.t === 'shopBuy') {          // outro jogador compra
      const d = db.decor.find(q => q.id === Number(m.id)), r = db.users[c.user], now = Date.now(); if (!d || !r || d.kind !== 'barraca' || d.owner === c.user || !nearPt(c, d.x, d.y, 45) || now - (c.lastBuy || 0) < 500) return; c.lastBuy = now;
      const it = (d.shop || []).find(q => q.k === m.k); if (!it) return; const n = Math.max(1, Math.min(it.n, Math.floor(Number(m.n) || 1))), cost = n * it.price, inv = invOf(r);
      if ((inv.moedas || 0) < cost) return note(c, `Faltam moedas (custa ${cost}).`); inv.moedas -= cost; inv[it.k] = (inv[it.k] || 0) + n; it.n -= n; if (!it.n) d.shop = d.shop.filter(q => q !== it);
      earn(d.owner, cost); const ro = db.users[d.owner]; if (ro) { ro.tot ||= {}; ro.tot.stall = (ro.tot.stall || 0) + n; } save(); sendInv(c); all({ t: 'decor', list: db.decor });
      note(c, `Você comprou ${n} ${goodName(it.k).toLowerCase()} de @${d.owner} por ${cost} moedas.`); track(c, 'buy', n);
      for (const o of clients) if (o.user === d.owner) { note(o, `@${c.user} comprou ${n} ${goodName(it.k).toLowerCase()} na sua barraca: +${cost} moedas!`); track(o, 'sell', n); }
    } else if (m.t === 'zap') {          // raio do Mago: derruba várias árvores de uma vez
      const now = Date.now(), r = db.users[c.user]; if (!r || !r.look || r.look.cls !== 'mago' || c.room || now - (c.lastZap || 0) < 10000) return; c.lastZap = now;
      const list = (Array.isArray(m.trees) ? m.trees : []).map(Number).filter(i => Number.isInteger(i) && i >= 0 && i <= 20000 && !cutTrees.has(i)).slice(0, 8);
      const X = Math.round(Number(m.x)), Y = Math.round(Number(m.y)); if (!Number.isFinite(X) || !Number.isFinite(Y) || Math.hypot(X - c.x, Y - c.y) > (G && Math.hypot(X - G.x, Y - G.y) < 20 ? 125 : 70)) return;
      for (const i of list) cutTrees.set(i); all({ t: 'zap', id: c.id, x: X, y: Y, pts: (Array.isArray(m.pts) ? m.pts : []).slice(0, 8).map(q => [Math.round(Number(q[0]) || X), Math.round(Number(q[1]) || Y)]) }, c);
      if (list.length) { all({ t: 'trees', cut: cutList() }); addRes(c, 'lenha', list.length * 2); track(c, 'cut', list.length); }
      if (G && Math.hypot(X - G.x, Y - G.y) < 40) hurtGiant(c, 25, 'zap');
    } else if (m.t === 'hitGiant') {      // atacar o gigante com a arma na mão
      const now = Date.now(), r = db.users[c.user]; if (!G || !r || c.room || now - (c.lastHitG || 0) < 1400) return; c.lastHitG = now;
      const eq = (r.look && r.look.equip) || '', cls = r.look && r.look.cls, ranged = eq === 'arco' || cls === 'arqueira', reach = ranged ? 150 : 62;
      if (G.kind === 'dragao' && G.alt > .5 && !ranged) return note(c, 'O Dragão está voando alto! Use arco, catapulta ou o raio do Mago — ou espere ele descer para cuspir fogo.');
      if (Math.hypot(c.x - G.x, c.y - G.y) > reach) return note(c, G.kind === 'fogo' ? 'Chegue mais perto da fera!' : G.kind === 'dragao' ? 'Chegue mais perto do Dragão!' : 'Chegue mais perto do gigante!');
      const d = db.rguards[c.user] || c.user === db.king ? (c.horse ? 7 : 6) : cls === 'guarda' ? 5 : eq === 'espada' || eq === 'lanca' ? 4 : ranged ? 3 : invOf(r).machado || cls === 'lenhador' || cls === 'guerreiro' ? 3 : 1;
      hurtGiant(c, d, ranged ? 'arrow' : 'melee');
    } else if (m.t === 'fireCat') {       // disparar uma catapulta (1 pedra)
      const now = Date.now(), r = db.users[c.user], d = db.decor.find(q => q.id === Number(m.id)); if (!G || !r || !d || d.kind !== 'catapulta' || c.room || Math.hypot(c.x - d.x, c.y - d.y) > 30) return;
      if (now - (G.catCd[d.id] || 0) < 4000) return note(c, 'A catapulta está recarregando...'); if (Math.hypot(d.x - G.x, d.y - G.y) > 300) return note(c, 'O gigante está longe demais para esta catapulta.');
      const inv = invOf(r); if (!(inv.pedra > 0)) return note(c, 'Precisa de 1 pedra para disparar.'); inv.pedra--; sendInv(c); G.catCd[d.id] = now;
      all({ t: 'catShot', id: d.id, x: d.x, y: d.y, tx: Math.round(G.x), ty: Math.round(G.y), by: c.id }); setTimeout(() => hurtGiant(c, 45, 'cat'), 800);
    } else if (m.t === 'royal') {        // PAINEL DO REI: tesouro, impostos, decretos e recompensas
      if (!db.king || c.user !== db.king) return note(c, 'Só o Rei pode usar o painel do Rei.');
      const T = db.treasury, now = Date.now(), r = db.users[c.user], logT = txt => { T.log.unshift({ t: now, txt }); T.log = T.log.slice(0, 12); };
      const reply = () => out(c.ws, { t: 'royal', moedas: T.moedas, taxAt: T.taxAt || 0, log: T.log, online: [...clients].filter(o => o.user !== db.king).map(o => ({ u: o.user, rg: !!db.rguards[o.user], m: invOf(db.users[o.user] || {}).moedas || 0 })) });
      if (m.a === 'tax') { const pct = [5, 10, 20].includes(Number(m.pct)) ? Number(m.pct) : 10; if (now - (T.taxAt || 0) < 30 * 60000) return note(c, `Você só pode cobrar imposto de novo em ${Math.ceil((30 * 60000 - (now - T.taxAt)) / 60000)} min.`);
        let total = 0, n = 0; for (const o of clients) { if (o.user === db.king || db.rguards[o.user]) continue; const ro = db.users[o.user]; if (!ro) continue; const inv = invOf(ro), have = inv.moedas || 0; if (have < 5) continue;
          const v = Math.max(1, Math.min(100, Math.floor(have * pct / 100))); inv.moedas = have - v; total += v; n++; sendInv(o); out(o.ws, { t: 'taxed', n: v, pct }); }
        T.moedas += total; T.taxAt = now; logT(`Imposto de ${pct}%: +${total} moedas de ${n} pessoa(s)`); save();
        all({ t: 'announce', from: '👑 DECRETO DO REI', text: `O Rei @${db.king} cobrou ${pct}% de imposto. ${total} moedas foram para o Tesouro do Reino. (Guardas Reais não pagam.)` }); return reply(); }
      if (m.a === 'decree') { if (now - (c.lastDecree || 0) < 30000) return note(c, 'Espere um pouco para dar outra ordem.'); const text = censor(String(m.text || '').trim().slice(0, 160)).text; if (!text) return; c.lastDecree = now;
        const go = ['castelo', 'praca', 'vila'].includes(m.go) ? m.go : ''; logT(`Ordem: ${text}`); save(); all({ t: 'decree', text, go, king: db.king });
        const km = { t: 'chat', id: 0, username: 'Rei', text: `📜 ${text}`, ts: now, badge: 'criador' }; chatLog.push(km); all(km); return reply(); }
      if (m.a === 'give') { const u = norm(m.username), v = Math.floor(Number(m.n)); if (!validUser(u) || !db.users[u] || !(v > 0)) return note(c, 'Escolha um @ e a quantidade.'); if (v > T.moedas) return note(c, 'O Tesouro não tem moedas suficientes.');
        T.moedas -= v; const inv = invOf(db.users[u]); inv.moedas = (inv.moedas || 0) + v; logT(`Recompensa: ${v} moedas para @${u}`); save();
        for (const o of clients) if (o.user === u) { sendInv(o); out(o.ws, { t: 'reward', n: v, king: db.king }); } all({ t: 'announce', from: '👑 REINO DE ERYON', text: `O Rei @${db.king} recompensou @${u} com ${v} moedas do Tesouro!` }); return reply(); }
      if (m.a === 'share') { const v = Math.floor(Number(m.n)), list = [...clients].filter(o => o.user !== db.king && db.users[o.user]); if (!(v > 0) || !list.length) return note(c, 'Ninguém online para receber.'); if (v > T.moedas) return note(c, 'O Tesouro não tem moedas suficientes.');
        const each = Math.floor(v / list.length); if (each < 1) return note(c, `Precisa de pelo menos ${list.length} moedas para dar 1 a cada um.`); T.moedas -= each * list.length;
        for (const o of list) { const inv = invOf(db.users[o.user]); inv.moedas = (inv.moedas || 0) + each; sendInv(o); out(o.ws, { t: 'reward', n: each, king: db.king }); }
        logT(`Presente: ${each} moedas para ${list.length} pessoa(s)`); save(); all({ t: 'announce', from: '👑 REINO DE ERYON', text: `O Rei @${db.king} deu ${each} moedas para cada pessoa online! Viva o Rei!` }); return reply(); }
      if (m.a === 'withdraw') { const v = Math.floor(Number(m.n)); if (!(v > 0) || v > T.moedas) return note(c, 'Quantidade inválida.'); T.moedas -= v; const inv = invOf(r); inv.moedas = (inv.moedas || 0) + v; sendInv(c); logT(`O Rei pegou ${v} moedas do Tesouro`); save(); return reply(); }
      if (m.a === 'deposit') { const v = Math.floor(Number(m.n)), inv = invOf(r); if (!(v > 0) || v > (inv.moedas || 0)) return note(c, 'Você não tem essas moedas.'); inv.moedas -= v; T.moedas += v; sendInv(c); logT(`O Rei guardou ${v} moedas no Tesouro`); save(); return reply(); }
      return reply();
    } else if (m.t === 'appoint') {       // o Rei nomeia (ou dispensa) um Guarda Real
      if (!db.king || c.user !== db.king) return note(c, 'Só o Rei pode nomear guardas.'); const u = norm(m.username); if (!validUser(u) || !db.users[u] || u === db.king) return;
      if (m.on) { db.rguards[u] = Date.now(); all({ t: 'announce', from: '👑 REINO DE ERYON', text: `O Rei @${db.king} nomeou @${u} GUARDA REAL! Agora protege a cidade e anda a cavalo.` }); }
      else { delete db.rguards[u]; note(c, `@${u} não é mais Guarda Real.`); }
      setTimeout(() => { if (c.ws.readyState === 1) onMsg(JSON.stringify({ t: 'royal', a: 'state' })); }, 50);
      save(); for (const o of clients) if (o.user === u) { o.dirty = true; if (!m.on) o.horse = false; all({ t: 'rg', id: o.id, rg: !!m.on }); out(o.ws, { t: 'rgMe', rg: !!m.on }); }
    } else if (m.t === 'rebuild') {       // reconstruir casa queimada: várias pessoas ajudam (3 lenhas + 2 pedras cada vez)
      const r = db.users[c.user], id = String(m.id || ''); if (!r || G || !db.giant.burned.includes(id)) return; const b = giantBuildings().find(q => q.id === id); if (!b || c.room || Math.hypot(c.x - b.x, c.y - b.y) > 50) return;
      const now = Date.now(); if (now - (c.lastRebuild || 0) < 1500) return; c.lastRebuild = now;
      const inv = invOf(r); if ((inv.lenha || 0) < 3 || (inv.pedra || 0) < 2) return note(c, 'Para reconstruir precisa de 3 lenhas e 2 pedras.'); inv.lenha -= 3; inv.pedra -= 2; sendInv(c); track(c, 'place'); addXp(c, 15);
      const n = (db.giant.rebuild[id] || 0) + 1;
      if (n >= REBUILD_NEED) { delete db.giant.rebuild[id]; db.giant.burned = db.giant.burned.filter(q => q !== id); all({ t: 'announce', from: 'ERYON', text: `@${c.user} terminou de reconstruir uma casa queimada! Faltam ${db.giant.burned.length}.` }); }
      else { db.giant.rebuild[id] = n; note(c, `Reconstrução: ${n}/${REBUILD_NEED}. Mais ${REBUILD_NEED - n} ajuda(s) para terminar.`); }
      save(); all({ t: 'giant', ...giantPub() }); all({ t: 'act', id: c.id, kind: 'build' }, c);
    } else if (m.t === 'repair') {        // consertar construção danificada (2 lenhas)
      const r = db.users[c.user], id = String(m.id || ''); if (!r || G || !db.giant.damaged.includes(id)) return; const b = giantBuildings().find(q => q.id === id); if (!b || c.room || Math.hypot(c.x - b.x, c.y - b.y) > 50) return;
      const inv = invOf(r); if ((inv.lenha || 0) < 2) return note(c, 'Precisa de 2 lenhas para consertar.'); inv.lenha -= 2; sendInv(c); db.giant.damaged = db.giant.damaged.filter(q => q !== id); save(); track(c, 'place');
      all({ t: 'giant', ...giantPub() }); all({ t: 'act', id: c.id, kind: 'build' }, c);
    } else if (m.t === 'tp') {       // Portal Esquecido -> volta para a vila
      const pp = LM_POS.portal, now = Date.now(); if (c.room || Math.hypot(c.x - pp[0], c.y - pp[1]) > 40 || now - (c.lastTp || 0) < 3000) return; c.lastTp = now;
      c.x = SPAWN.x + (Math.random() * 30 - 15); c.y = SPAWN.y + Math.random() * 10; c.lastRoom = now; c.dirty = true; out(c.ws, { t: 'tp', x: c.x, y: c.y }); all({ t: 'act', id: c.id, kind: 'magic' }, c);
    } else if (m.t === 'pet') {
      const r = db.users[c.user]; if (!r) return; const look = r.look || (r.look = {}); const pet = String(m.pet || '');
      if (!pet) delete look.pet; else { if (!PETS.has(pet)) return; if (!r.sup && !isStaff(c.user)) return note(c, 'Bichinhos são um presente para apoiadores de Eryon ♥'); look.pet = pet; }
      save(); all({ t: 'look', id: c.id, look });
    }
  };
  ws.on('close', code => { DIAG.closed[code] = (DIAG.closed[code] || 0) + 1; clearTimeout(timer); if (!c) return; clients.delete(c); const rec = db.users[c.user]; if (rec) { rec.x = Math.round(c.x); rec.y = Math.round(c.y); save(); } all({ t: 'leave', id: c.id }); });
  ws.on('error', () => {});
});
// mantém a conexão viva (o Render derruba conexões paradas); encerra quem sumiu de vez
setInterval(() => { for (const w of wss.clients) { if (w.isAlive === false) { w.terminate(); continue; } w.isAlive = false; try { w.ping(); } catch { } } }, 25000).unref();
// estado 10x por segundo (só quem mudou)
setInterval(() => {
  const ch = []; for (const c of clients) if (c.dirty) { ch.push({ id: c.id, x: Math.round(c.x * 10) / 10, y: Math.round(c.y * 10) / 10, face: c.face, moving: c.moving, room: c.room || '', carry: !!c.carry, fly: !!c.fly, horse: !!c.horse }); c.dirty = false; }
  if (ch.length) all({ t: 'state', p: ch, online: clients.size });
}, 100);
// mantém conexões vivas e salva posições
setInterval(() => { for (const c of clients) { const rec = db.users[c.user]; if (rec) { rec.x = Math.round(c.x); rec.y = Math.round(c.y); } } save(); }, 30000);

let stopping = false;
async function shutdown(sig) {
  if (stopping) return; stopping = true;
  for (const c of clients) { const rec = db.users[c.user]; if (rec) { rec.x = Math.round(c.x); rec.y = Math.round(c.y); } }
  try { fs.writeFileSync(DBF, JSON.stringify(db)); } catch {}
  try { if (saving) await saving; await remoteSave(true); } catch {}
  console.log('[memória] mundo salvo antes de desligar (' + sig + ').'); process.exit(0);
}
process.on('uncaughtException', e => console.error('[erro inesperado]', e && e.stack || e)); process.on('unhandledRejection', e => console.error('[promessa rejeitada]', e && e.stack || e));
process.on('SIGTERM', () => shutdown('SIGTERM')); process.on('SIGINT', () => shutdown('SIGINT'));

remoteLoad().finally(() => {
  if (!remoteOn()) console.warn('[memória] UPSTASH não configurado: no Render grátis as construções somem quando o servidor reinicia. Veja o README.');
  server.listen(PORT, () => console.log(`Eryon Online rodando em http://localhost:${PORT}  (admin: /admin)`));
});
