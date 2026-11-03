// node dev.js 1.5,10,20  -> shots/t_<t>.png  (preview em resolução reduzida: SCALE=0.5)
const { chromium } = require('playwright'); const serve = require('./serve.js'); const fs = require('fs');
(async () => {
  const port = 8800 + Math.floor(Math.random() * 100);
  const srv = await serve(port);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('console', m => { if (!/GPU stall/.test(m.text())) console.log('[page]', m.text()); }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${port}/index.html?scale=${process.env.SCALE || 0.5}&msaa=${process.env.MSAA || 0}`);
  await p.waitForFunction(() => window.ready, null, { timeout: 600000 });
  await p.evaluate(() => document.fonts.ready);
  fs.mkdirSync('shots', { recursive: true });
  for (const t of process.argv[2].split(',').map(Number)) {
    const t0 = Date.now(); await p.evaluate(t => window.render(t), t);
    await p.screenshot({ path: `shots/t_${t.toFixed(2)}.png`, type: 'png' }); console.log('t', t, Date.now() - t0, 'ms');
  }
  await b.close(); srv.close();
})();
