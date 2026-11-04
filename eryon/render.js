// Uso: node render.js frames t1,t2,...      -> PNGs de teste (tempo de vídeo)
//      node render.js range <ini> <fim> <fps> <dir> -> JPGs numerados
const { chromium } = require('playwright');
const path = require('path');
const http = require('http'), fs = require('fs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json' };
function serve() { return new Promise(r => { const srv = http.createServer((q, s) => { const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); s.end(d); }); }).listen(0, () => r(srv)); }); }
(async () => {
  const [mode, a1, a2, a3, a4] = process.argv.slice(2);
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('pageerror', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console', m.text().slice(0, 300)); });
  await page.goto(`http://localhost:${srv.address().port}/${process.env.SCENE || 'scene.html'}`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  if (mode === 'frames') {
    for (const T of a1.split(',').map(Number)) {
      const t0 = Date.now();
      await page.evaluate(T => render(T), T);
      await page.screenshot({ path: `${process.env.OUT || '.'}/f_${T.toFixed(2)}.png` });
      console.log('frame', T, Date.now() - t0, 'ms');
    }
  } else {
    const [ini, fim, fps, dir] = [Number(a1), Number(a2), Number(a3), a4];
    for (let i = ini; i < fim; i++) {
      await page.evaluate(T => render(T), i / fps);
      await page.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
      if (i % 50 === 0) console.log(`[${ini}-${fim}] ${i}`);
    }
  }
  await browser.close(); srv.close();
})();
