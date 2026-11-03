// Render final: node render.js <worker> <nWorkers> [fps]  -> frames/f_00000.jpg (pula quadros já prontos)
const { chromium } = require('playwright'); const serve = require('./serve.js'); const fs = require('fs');
(async () => {
  const [w = 0, nw = 1, fps = 30] = process.argv.slice(2).map(Number);
  const scale = process.env.SCALE || 1;
  const srv = await serve(9100 + w);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${9100 + w}/index.html?scale=${scale}&msaa=${process.env.MSAA || 4}`);
  await p.waitForFunction(() => window.ready, null, { timeout: 600000 }); await p.evaluate(() => document.fonts.ready);
  const dur = await p.evaluate(() => window.DURATION), n = Math.round(dur * fps);
  fs.mkdirSync('frames', { recursive: true });
  const t0 = Date.now(); let done = 0;
  for (let i = w; i < n; i += nw) {
    const f = `frames/f_${String(i).padStart(5, '0')}.jpg`; if (fs.existsSync(f)) continue;
    await p.evaluate(t => window.render(t), i / fps);
    await p.screenshot({ path: f + '.tmp', type: 'jpeg', quality: 94 }); fs.renameSync(f + '.tmp', f);
    if (++done % 20 === 0) console.log(`w${w} ${i}/${n} ${((Date.now() - t0) / done / 1000).toFixed(2)}s/f`);
  }
  console.log(`w${w} done`); await b.close(); srv.close();
})();
