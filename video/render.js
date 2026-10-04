// Uso: node render.js frames <t1,t2,...>  -> PNGs de conferência
//      node render.js video [fps] [saida.mp4] -> renderiza e codifica o MP4
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [mode = 'video', a1, a2] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto('file://' + path.resolve(__dirname, 'scene.html'));
  await page.evaluate(() => window.ready);
  if (mode === 'frames') {
    for (const t of a1.split(',').map(Number)) {
      await page.evaluate(t => render(t), t);
      await page.screenshot({ path: `${process.env.OUT || '.'}/f_${t}.png` });
    }
  } else {
    const fps = Number(a1 || 120), out = a2 || 'nexa-chat.mp4';
    const dur = await page.evaluate(() => DURATION), n = Math.round(dur * fps);
    // captura a 120 qps e mistura pares de quadros: motion blur com obturador de 180° a 60 qps
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-vf', `tmix=frames=2,fps=${fps / 2},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
      '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < n; i++) {
      await page.evaluate(t => render(t), i / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 120 === 0) console.log(`${i}/${n}`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
