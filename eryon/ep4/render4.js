// Renderiza o Episódio 4 filmando o próprio jogo (eryon-online/public, modo ?cine=1).
// Uso: node render4.js frames t1,t2,...   |   node render3.js range <ini> <fim> <fps> <dir>
const { chromium } = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs');
const GAME = path.join(__dirname, '../../eryon-online/public'), EP = __dirname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.png': 'image/png' };
function serve() { return new Promise(r => { const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = u.startsWith('/ep4/') ? path.join(EP, u.slice(5)) : path.join(GAME, u); if (u.startsWith('/api/')) { s.writeHead(404); return s.end('{}'); }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); s.end(d); }); }).listen(0, () => r(srv)); }); }
(async () => {
  const [mode, a1, a2, a3, a4] = process.argv.slice(2); const srv = await serve();
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => { window.__VT = 0; performance.now = () => window.__VT * 1000; Date.now = () => 1.8e12 + window.__VT * 1000; try { localStorage.setItem('eryon_mute', '1'); localStorage.setItem('eryon_tut', '1'); } catch { } });
  const page = await ctx.newPage(); page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto(`http://localhost:${srv.address().port}/?cine=1`); await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  await page.addScriptTag({ url: '/ep4/ep4.js' }); await page.waitForFunction(() => window.EP4_READY === true);
  await page.evaluate(c => loadCaps(c), JSON.parse(fs.readFileSync(path.join(EP, 'captions.json'), 'utf8')));
  if (mode === 'frames') { for (const T of a1.split(',').map(Number)) { const t0 = Date.now(); await page.evaluate(T => render(T), T); await page.screenshot({ path: `${process.env.OUT || '.'}/f_${T.toFixed(2)}.png` }); console.log('frame', T, Date.now() - t0, 'ms'); } }
  else { const [ini, fim, fps, dir] = [Number(a1), Number(a2), Number(a3), a4];
    for (let i = ini; i < fim; i++) { await page.evaluate(T => render(T), i / fps); await page.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 }); if (i % 60 === 0) console.log(`[${ini}-${fim}] ${i}`); } }
  await browser.close(); srv.close();
})();
