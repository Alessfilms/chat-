const { chromium } = require('playwright'); const serve = require('./serve.js');
(async () => {
  const port = 8900 + Math.floor(Math.random() * 90); const srv = await serve(port);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 540, height: 960 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${port}/index.html?scale=0.25&msaa=0`); await p.waitForFunction(() => window.ready, null, { timeout: 600000 });
  console.log((await p.evaluate(() => window.validate())).join('\n') || 'all clear'); await b.close(); srv.close();
})();
